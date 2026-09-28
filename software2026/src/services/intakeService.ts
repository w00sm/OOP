// 섭취량 추천
// 복용 중인 영양제(이름·하루 복용 개수)에서 성분별 현재 섭취량을 추정하고,
// 추천 성분을 얼마나 더 먹으면 되는지 계산합니다.
// 예) 종합비타민(비타민D 400IU) + 비타민D3 1000IU → "이미 약 1,400IU 드시고 있어 추가 섭취는 필요 없어요"

import type { Supplement } from "../components/Home";
import { NUTRIENT_DOSES, type NutrientDose } from "../data/nutrients";
import { josa } from "../utils/josa";

const clean = (text: string) =>
  text.toLowerCase().replace(/\(.*?\)/g, "").replace(/[\s\-·_]/g, "");

const MULTI = NUTRIENT_DOSES.find((item) => item.name === "종합비타민")!;

const matches = (nutrient: NutrientDose, text: string) =>
  nutrient.keywords.some((keyword) => clean(text).includes(keyword));

// 추천 성분 이름(AI가 준 "비타민 D3", "마그네슘 (Magnesium)" 등) → 성분 정보
export function findNutrient(name: string): NutrientDose | undefined {
  return NUTRIENT_DOSES.find((item) => matches(item, name));
}

// 이름에 적힌 함량 읽기: "비타민D3 5000IU" → 5000 (단위를 성분 기준 단위로 변환)
function amountInName(name: string, nutrient: NutrientDose): number | null {
  const amount = nutrient.amount;
  if (!amount) return null;
  const found = name.match(/(\d[\d,.]*)\s*(iu|mg|mcg|µg|ug|억)/i);
  if (!found) return null;
  const value = Number(found[1].replace(/,/g, ""));
  const unit = found[2].toLowerCase() === "iu" ? "IU" : found[2].toLowerCase();
  if (unit === amount.unit.toLowerCase() || (unit === "IU" && amount.unit === "IU")) return value;
  const rate = amount.convert?.[unit];
  return rate ? value * rate : null;
}

export type IntakeSource = { name: string; amount: number | null };

export type IntakeAdvice = {
  nutrient: string;
  status: "none" | "partial" | "enough" | "over" | "info";
  doseLabel: string; // 짧은 표시: "1,000~2,000IU", "+600~1,600IU", "추가 불필요"
  message: string; // 이유를 설명하는 문장
  sources: IntakeSource[]; // 이미 이 성분을 먹고 있는 영양제
};

// 보기 좋게 반올림: 1,000 이상은 100 단위, 100 이상은 10 단위
const nice = (value: number) => {
  const step = value >= 1000 ? 100 : value >= 100 ? 10 : 1;
  return Math.round(value / step) * step;
};

const fmt = (value: number, unit: string) => `${nice(value).toLocaleString("ko-KR")}${unit}`;

// 단위 뒤 목적격 조사 (밀리그램·마이크로그램은 받침 있음)
const obj = (unit: string) => (unit === "mg" || unit === "µg" ? "을" : "를");

const range = ([min, max]: [number, number], unit: string) =>
  min === max ? fmt(min, unit) : `${nice(min).toLocaleString("ko-KR")}~${fmt(max, unit)}`;

// 복용 중인 영양제에서 이 성분이 얼마나 들어오는지
function currentIntake(nutrient: NutrientDose, supplements: Supplement[]) {
  const sources: IntakeSource[] = [];
  for (const item of supplements) {
    const perDay = item.dailyDose && item.dailyDose > 0 ? item.dailyDose : 1;
    if (matches(nutrient, item.name)) {
      // 여러 성분이 섞인 제품(예: 칼슘 마그네슘 비타민D)은 이름의 숫자가 어느 성분 것인지 모르고
      // 성분마다 함량도 적게 들어가므로, 일반 함량을 성분 수로 나눠 추정합니다.
      const directCount = NUTRIENT_DOSES.filter((n) => n !== MULTI && matches(n, item.name)).length;
      const typical = nutrient.amount ? nutrient.amount.typicalPerUnit / Math.max(1, directCount) : null;
      const perUnit = (directCount === 1 ? amountInName(item.name, nutrient) : null) ?? typical;
      sources.push({ name: item.name, amount: perUnit === null ? null : perUnit * perDay });
    } else if (matches(MULTI, item.name) && nutrient.amount?.multiPerUnit) {
      sources.push({ name: item.name, amount: nutrient.amount.multiPerUnit * perDay });
    } else if (matches(MULTI, item.name) && nutrient.inMulti) {
      sources.push({ name: item.name, amount: null });
    }
  }
  const total = sources.reduce((sum, source) => sum + (source.amount ?? 0), 0);
  return { sources, total };
}

export function adviseIntake(
  nutrientName: string,
  supplements: Supplement[]
): IntakeAdvice | null {
  const nutrient = findNutrient(nutrientName);
  if (!nutrient) return null;
  const { sources, total } = currentIntake(nutrient, supplements);
  const names = sources.map((source) => source.name).join(", ");
  const amount = nutrient.amount;

  // 수치 기준이 없는 성분 (종합비타민, 비타민B, 홍삼): 중복 여부만 안내
  if (!amount) {
    return {
      nutrient: nutrient.name,
      status: sources.length > 0 ? "enough" : "info",
      doseLabel: sources.length > 0 ? "이미 복용 중" : "하루 1회분",
      message:
        sources.length > 0
          ? `이미 ${josa(names, "으로/로")} 드시고 있어요. ${nutrient.note}`
          : nutrient.note,
      sources,
    };
  }

  const [min, max] = amount.recommended;
  const unit = amount.unit;
  const upper = amount.upper;

  if (total <= 0) {
    return {
      nutrient: nutrient.name,
      status: "none",
      doseLabel: range([min, max], unit),
      message: `하루 ${range([min, max], unit)}${obj(unit)} 권장해요. ${nutrient.note}`,
      sources,
    };
  }

  const already = `${josa(names, "으로/로")} 하루 약 ${fmt(total, unit)}${obj(unit)} 드시고 있어요.`;

  if (upper !== undefined && total > upper) {
    return {
      nutrient: nutrient.name,
      status: "over",
      doseLabel: "줄이기 권장",
      message: `${already} 상한(${fmt(upper, unit)})을 넘었으니 추가로 드시지 말고 복용량을 줄이세요.`,
      sources,
    };
  }

  if (total >= min) {
    return {
      nutrient: nutrient.name,
      status: "enough",
      doseLabel: "추가 불필요",
      message: `${already} 권장량(${range([min, max], unit)})을 이미 채우고 있어 추가로 드시지 않아도 돼요.`,
      sources,
    };
  }

  // 모자란 만큼만 추가 (상한을 넘지 않도록)
  const addMin = min - total;
  const addMax = Math.min(max, upper ?? max) - total;
  return {
    nutrient: nutrient.name,
    status: "partial",
    doseLabel: `+${range([addMin, addMax], unit)}`,
    message: `${already} 그래서 ${range([addMin, addMax], unit)}만 추가로 드시면 권장량(${range([min, max], unit)})을 채울 수 있어요.`,
    sources,
  };
}

// AI에게 알려줄 "현재 복용 중" 요약
export function describeCurrentSupplements(supplements: Supplement[]) {
  if (supplements.length === 0) return "현재 복용 중인 영양제 없음";
  return supplements
    .map((item) => `${item.name} (하루 ${item.dailyDose ?? 1}개)`)
    .join(", ");
}

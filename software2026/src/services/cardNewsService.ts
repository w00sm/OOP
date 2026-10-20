// 홈 → 오늘의 영양 카드 (카드뉴스)
// 앱에 이미 있는 데이터(기능성 문구·고민·복용 시간·궁합·권장량·복용 중인 약)로 성분마다 카드를 자동으로 만듭니다.
// 문구는 식약처 인정 기능성 표현을 따르고, 질병을 고친다는 표현은 쓰지 않습니다.

import type { Supplement } from "../components/Home";
import { CONCERNS, INGREDIENT_REASONS } from "../data/concerns";
import { INGREDIENT_RULES, INTERACTION_RULES } from "../data/interactions";
import { NUTRIENT_DOSES } from "../data/nutrients";
import { INGREDIENT_VIDEOS, type IngredientVideo } from "../data/videos";
import { gapOf, isActiveMed, shortMedName, todayKey, type Medication } from "./medicationService";
import { detectIngredients } from "./scheduleService";
import { josa } from "../utils/josa";

// 표지에 쓰는 한 줄 소개
const HOOKS: Record<string, string> = {
  종합비타민: "바쁜 하루, 기본 영양을 한 번에",
  비타민B: "에너지를 만드는 비타민",
  비타민C: "매일 채워야 하는 수용성 비타민",
  비타민D: "햇빛 비타민, 부족하기 쉬워요",
  칼슘: "뼈와 치아를 만드는 미네랄",
  마그네슘: "근육과 신경을 돕는 미네랄",
  철분: "몸 구석구석 산소를 나르는 미네랄",
  아연: "면역과 세포 분열에 필요한 미네랄",
  오메가3: "혈행과 눈 건강을 챙기는 지방산",
  루테인: "눈의 황반 색소를 지켜요",
  유산균: "장 속 유익균을 늘려요",
  밀크씨슬: "간 건강을 챙기는 실리마린",
  홍삼: "피로할 때 찾는 대표 원료",
  엽산: "혈액 생성에 꼭 필요한 비타민",
  비오틴: "모발과 손톱 건강을 챙겨요",
  코엔자임Q10: "몸속 항산화를 돕는 성분",
  테아닌: "긴장될 때 마음을 편하게",
  콜라겐: "피부 보습과 탄력을 지켜요",
  MSM: "관절과 연골 건강을 챙겨요",
  글루코사민: "관절과 연골 건강을 챙겨요",
};

// 성분별 카드 색 (표지 배경)
const COLORS: Record<string, [string, string]> = {
  종합비타민: ["#8bcf3f", "#3f9b4f"],
  비타민B: ["#f5b301", "#e0702b"],
  비타민C: ["#ffb347", "#f0761f"],
  비타민D: ["#ffd25e", "#f5a400"],
  칼슘: ["#7fb3ff", "#2f6fdb"],
  마그네슘: ["#a78bfa", "#6d43c8"],
  철분: ["#f48a8a", "#c8384f"],
  아연: ["#7dd3c0", "#1f9a87"],
  오메가3: ["#6ec3f4", "#1f7fc4"],
  루테인: ["#ffcf5c", "#e38b00"],
  유산균: ["#9be27a", "#3f9b4f"],
  밀크씨슬: ["#c4a8f5", "#7a4cc2"],
  홍삼: ["#e98a6b", "#a8402a"],
};
const DEFAULT_COLOR: [string, string] = ["#8bcf3f", "#3f9b4f"];

export type CardSlide =
  | { kind: "cover"; hook: string; mine: boolean }
  | { kind: "concerns"; items: string[] }
  | { kind: "benefit"; text: string }
  | { kind: "howto"; when: string; tip: string; together: string[]; apart: string[] }
  | { kind: "amount"; range: string | null; upper: string | null; note: string }
  | { kind: "caution"; lines: string[] }
  | { kind: "video"; videos: IngredientVideo[]; searchUrl: string };

export type CardNews = {
  ingredient: string;
  colors: [string, string];
  slides: CardSlide[];
};

const CARD_INGREDIENTS = Object.keys(INGREDIENT_REASONS);

// 오늘 보여줄 성분: 내가 먹는 영양제의 성분을 날마다 돌아가며 (없으면 전체 성분 중에서)
export function pickTodayIngredient(supplements: Supplement[], date = new Date()) {
  const mine = [
    ...new Set(supplements.flatMap((item) => detectIngredients(item.name))),
  ].filter((name) => CARD_INGREDIENTS.includes(name));
  const pool = mine.length > 0 ? mine : CARD_INGREDIENTS;
  const day = Math.floor(
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() / 86400000
  );
  return pool[day % pool.length];
}

const fmt = (value: number) => value.toLocaleString("ko-KR");

export function buildCardNews(
  ingredient: string,
  supplements: Supplement[],
  medications: Medication[]
): CardNews {
  const mine = supplements.some((item) => detectIngredients(item.name).includes(ingredient));
  const rule = INGREDIENT_RULES.find((item) => item.name === ingredient);
  const dose = NUTRIENT_DOSES.find((item) => item.name === ingredient);
  const concerns = CONCERNS.filter((concern) => concern.ingredients.includes(ingredient)).map(
    (concern) => concern.label
  );
  const pairs = INTERACTION_RULES.filter((item) => item.a === ingredient || item.b === ingredient);
  const other = (pair: (typeof pairs)[number]) => (pair.a === ingredient ? pair.b : pair.a);

  const slides: CardSlide[] = [
    { kind: "cover", hook: HOOKS[ingredient] ?? "알고 먹으면 더 좋아요", mine },
  ];
  if (concerns.length > 0) slides.push({ kind: "concerns", items: concerns });
  slides.push({ kind: "benefit", text: INGREDIENT_REASONS[ingredient] });

  if (rule) {
    slides.push({
      kind: "howto",
      when: `${rule.preferred[0]} ${rule.timing}`,
      tip: rule.tip,
      together: pairs.filter((pair) => pair.type === "together").map((pair) => `${other(pair)} · ${pair.reason}`),
      apart: pairs.filter((pair) => pair.type === "separate").map((pair) => `${other(pair)} · ${pair.reason}`),
    });
  }

  if (dose) {
    const amount = dose.amount;
    slides.push({
      kind: "amount",
      range: amount
        ? amount.recommended[0] === amount.recommended[1]
          ? `${fmt(amount.recommended[0])}${amount.unit}`
          : `${fmt(amount.recommended[0])}~${fmt(amount.recommended[1])}${amount.unit}`
        : null,
      upper: amount?.upper ? `${fmt(amount.upper)}${amount.unit}` : null,
      note: dose.note,
    });
  }

  // 복용 중인 약 설명서에 이 성분 주의가 있으면
  const medLines = medications
    .filter((med) => isActiveMed(med))
    .flatMap((med) =>
      med.hits
        .filter((hit) => hit.i === ingredient)
        .map(
          (hit) =>
            `${josa(shortMedName(med.name), "은/는")} 설명서에 ${ingredient} 주의가 있어요. ${gapOf(hit)}시간 이상 간격을 두세요.`
        )
    );
  if (medLines.length > 0) slides.push({ kind: "caution", lines: medLines });

  slides.push({
    kind: "video",
    videos: INGREDIENT_VIDEOS[ingredient] ?? [],
    searchUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${ingredient} 영양제 효능 약사`)}`,
  });

  return { ingredient, colors: COLORS[ingredient] ?? DEFAULT_COLOR, slides };
}

/* ---------- 숨기기 ---------- */

const HIDDEN_KEY = "nutritionCardHiddenDate"; // X를 누른 날 (그날만 숨김)
const OFF_KEY = "nutritionCardOff"; // 마이페이지에서 끈 경우 (계속 숨김)

const read = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key: string, value: string | null) => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // 저장이 안 돼도 화면에서는 숨겨집니다.
  }
};

export const isCardHiddenToday = () => read(HIDDEN_KEY) === todayKey();
export const hideCardToday = () => write(HIDDEN_KEY, todayKey());
export const isCardOff = () => read(OFF_KEY) === "1";
export const setCardOff = (off: boolean) => {
  write(OFF_KEY, off ? "1" : null);
  if (!off) write(HIDDEN_KEY, null);
};

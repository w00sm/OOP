// 다 먹은 영양제(복용 내역)에 대한 설문
// 답변(효과·변화·불편함·다음 계획)으로 재구매가 필요한지 판단하고 재구매 / 다른 제품 / 다른 성분을 추천합니다.
// 저장한 결과는 복용 내역에 배지로 보이고, 다음 AI 추천 때 참고 자료로도 쓰입니다.

import type { Supplement } from "../components/Home";
import { CONCERNS } from "../data/concerns";
import { adviseIntake, findNutrient } from "./intakeService";
import { josa } from "../utils/josa";

export type SurveyAnswers = {
  effect: "great" | "some" | "unsure" | "none";
  changes: string[];
  discomfort: "none" | "stomach" | "swallow" | "smell" | "other";
  next: "repurchase" | "other-product" | "stop";
};

export const EFFECT_OPTIONS: { value: SurveyAnswers["effect"]; label: string }[] = [
  { value: "great", label: "확실히 좋아졌어요" },
  { value: "some", label: "조금 느꼈어요" },
  { value: "unsure", label: "잘 모르겠어요" },
  { value: "none", label: "변화가 없었어요" },
];

export const CHANGE_OPTIONS = [
  "피로가 줄었어요",
  "잠을 잘 자요",
  "소화가 편해졌어요",
  "피부·모발이 좋아졌어요",
  "감기에 덜 걸려요",
  "눈이 덜 피로해요",
  "특별한 변화 없음",
];

export const DISCOMFORT_OPTIONS: { value: SurveyAnswers["discomfort"]; label: string }[] = [
  { value: "none", label: "불편한 점 없었어요" },
  { value: "stomach", label: "속이 쓰리거나 더부룩했어요" },
  { value: "swallow", label: "알약이 커서 먹기 힘들었어요" },
  { value: "smell", label: "냄새나 맛이 싫었어요" },
  { value: "other", label: "기타" },
];

export const NEXT_OPTIONS: { value: SurveyAnswers["next"]; label: string }[] = [
  { value: "repurchase", label: "같은 걸 또 먹을래요" },
  { value: "other-product", label: "다른 제품으로 바꿔볼래요" },
  { value: "stop", label: "이제 그만 먹을래요" },
];

// 설문 대상 (복용 내역 항목)
export type SurveySubject = {
  key: string; // 복용 내역 id
  id: number; // 영양제 id
  name: string;
};

// 재구매 판단
export type SurveyVerdict = "repurchase" | "other-product" | "other-ingredient" | "stop";

export const VERDICT_LABELS: Record<SurveyVerdict, string> = {
  repurchase: "재구매 추천",
  "other-product": "다른 제품 추천",
  "other-ingredient": "다른 성분 추천",
  stop: "복용 종료",
};

export type SurveyAction =
  | { kind: "search"; label: string; keyword: string }
  | { kind: "recommend"; label: string; ingredients: string[] }
  | { kind: "readd"; label: string };

export type SurveyResult = {
  verdict: SurveyVerdict;
  title: string;
  message: string;
  actions: SurveyAction[];
};

export type SurveyRecord = {
  key: string;
  supplementId: number;
  name: string;
  ingredient: string | null;
  answers: SurveyAnswers;
  result: SurveyResult;
  createdAt: string;
};

const STORAGE_KEY = "supplementSurveys";

export function getSurveys(): SurveyRecord[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export const getSurveyFor = (key: string) =>
  getSurveys().find((record) => record.key === key && record.result);

export function saveSurvey(subject: SurveySubject, answers: SurveyAnswers, result: SurveyResult) {
  const record: SurveyRecord = {
    key: subject.key,
    supplementId: subject.id,
    name: subject.name,
    ingredient: mainIngredientOf(subject.name),
    answers,
    result,
    createdAt: new Date().toISOString(),
  };
  try {
    // 같은 내역을 다시 설문하면 새 결과로 바꿈
    const others = getSurveys().filter((item) => item.key !== subject.key);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([record, ...others].slice(0, 100)));
  } catch {
    // 저장에 실패해도 추천 결과는 보여줍니다.
  }
}

export function mainIngredientOf(name: string) {
  return findNutrient(name)?.name ?? null;
}

// 같은 고민에 도움이 되는 다른 성분 (예: 마그네슘 → 테아닌)
// 복용 중인 영양제로 이미 충분히 먹고 있는 성분은 제외합니다.
function alternativesFor(ingredient: string, supplements: Supplement[]) {
  const alternatives = new Set<string>();
  for (const concern of CONCERNS) {
    if (!concern.ingredients.includes(ingredient)) continue;
    concern.ingredients
      .filter((item) => item !== ingredient)
      .filter((item) => {
        const status = adviseIntake(item, supplements)?.status;
        return status !== "enough" && status !== "over";
      })
      .forEach((item) => alternatives.add(item));
  }
  return [...alternatives].slice(0, 3);
}

export function recommendAfterSurvey(
  item: SurveySubject,
  answers: SurveyAnswers,
  supplements: Supplement[] // 지금 복용 관리 중인 영양제 (이미 충분히 먹는 성분은 추천에서 제외)
): SurveyResult {
  const ingredient = mainIngredientOf(item.name) ?? item.name;
  const alternatives = alternativesFor(ingredient, supplements);
  const felt = answers.effect === "great" || answers.effect === "some";
  const changes = answers.changes.filter((change) => change !== "특별한 변화 없음");
  const readd: SurveyAction = { kind: "readd", label: "다시 복용 관리에 추가" };
  const searchSame: SurveyAction = {
    kind: "search",
    label: `${ingredient} 제품 보기`,
    keyword: ingredient,
  };
  const recommendOthers: SurveyAction | null =
    alternatives.length > 0
      ? { kind: "recommend", label: `${alternatives.join(", ")} 추천 보기`, ingredients: alternatives }
      : null;

  if (answers.next === "stop") {
    return {
      verdict: "stop",
      title: "복용을 마무리할게요",
      message: felt
        ? "효과를 보셨다니 다행이에요. 다시 필요해지면 언제든 추천해 드릴게요."
        : "설문 결과를 참고해서 다음에는 더 잘 맞는 영양제를 추천해 드릴게요.",
      actions: recommendOthers ? [recommendOthers] : [],
    };
  }

  if (answers.discomfort === "swallow") {
    return {
      verdict: "other-product",
      title: "먹기 편한 형태를 추천해요",
      message: `알약이 부담스러우셨다면 같은 ${josa(ingredient, "이/가")} 든 가루(포)·액상·작은 알약 제품을 찾아보세요.`,
      actions: [searchSame, readd],
    };
  }

  if (answers.discomfort === "stomach" || answers.discomfort === "smell") {
    return {
      verdict: "other-product",
      title: "다른 제품으로 바꿔보세요",
      message:
        answers.discomfort === "stomach"
          ? `속이 불편하셨다면 식사 직후에 드시거나, 함량이 낮은 다른 ${ingredient} 제품으로 바꿔보세요.`
          : `냄새·맛이 불편하셨다면 코팅된 알약이나 다른 브랜드의 ${ingredient} 제품을 비교해 보세요.`,
      actions: [searchSame, readd],
    };
  }

  if (!felt) {
    return {
      verdict: "other-ingredient",
      title: "다른 성분도 함께 고려해 보세요",
      message: `${josa(ingredient, "으로/로")} 변화를 느끼지 못하셨다면 ${
        alternatives.length > 0 ? `${josa(alternatives.join(", "), "을/를")} 추천해요. ` : ""
      }영양제는 보통 2~3개월 꾸준히 드셔야 효과를 느끼는 경우가 많아요.`,
      actions: [...(recommendOthers ? [recommendOthers] : []), searchSame],
    };
  }

  if (answers.next === "other-product") {
    return {
      verdict: "other-product",
      title: "다른 제품을 비교해 보세요",
      message: `효과는 보셨으니 같은 ${ingredient} 성분으로 가격이나 함량이 더 맞는 제품을 골라보세요.`,
      actions: [searchSame, readd],
    };
  }

  return {
    verdict: "repurchase",
    title: "같은 영양제 재구매를 추천해요",
    message: `${
      changes.length > 0 ? `${changes.join(", ")} 같은 ` : ""
    }효과를 느끼셨군요! 복용이 끊기지 않게 다시 구매해 보세요.`,
    actions: [searchSame, readd],
  };
}

// AI 상담에 알려줄 지난 설문 요약
export function describeSurveys() {
  const labels = Object.fromEntries(EFFECT_OPTIONS.map((option) => [option.value, option.label]));
  return getSurveys()
    .slice(0, 5)
    .map((record) => `${record.name}: ${labels[record.answers.effect]}`)
    .join(", ");
}

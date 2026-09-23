// 맞춤 추천 창구
// 지금은 concerns.ts의 키워드 규칙으로 추천합니다.
// AI API를 붙일 때는 recommend 내부에서 AI 응답을 받아 같은 Recommendation 형태로 돌려주면 됩니다.

import { CONCERNS, INGREDIENT_REASONS, type Concern } from "../data/concerns";

export type Gender = "남성" | "여성";

export type RecommendInput = {
  birthYear?: number;
  gender?: Gender;
  messages: string[]; // 사용자가 AI 상담에 입력한 문장들
};

export type Recommendation = {
  ingredient: string;
  reasons: string[];
  concerns: string[]; // 이 성분을 추천한 고민 이름
};

export function findConcerns(text: string): Concern[] {
  return CONCERNS.filter((concern) =>
    concern.keywords.some((keyword) => text.includes(keyword))
  );
}

// 나이·성별에 따라 기본으로 더해지는 추천
function demographicConcerns(birthYear?: number, gender?: Gender) {
  const extra: { ingredient: string; reason: string; label: string }[] = [];
  const age = birthYear ? new Date().getFullYear() - birthYear : undefined;

  if (age !== undefined && age >= 50) {
    extra.push({
      ingredient: "칼슘",
      reason: "50대 이후에는 골밀도가 줄어들기 쉬워 칼슘 섭취가 중요해요.",
      label: "연령",
    });
    extra.push({
      ingredient: "비타민D",
      reason: "나이가 들수록 피부에서 비타민D를 만드는 능력이 떨어져요.",
      label: "연령",
    });
  }
  if (gender === "여성" && (age === undefined || age < 50)) {
    extra.push({
      ingredient: "철분",
      reason: "가임기 여성은 철분 필요량이 남성보다 높아요.",
      label: "성별",
    });
  }
  return extra;
}

export async function recommend({
  birthYear,
  gender,
  messages,
}: RecommendInput): Promise<Recommendation[]> {
  const byIngredient = new Map<string, Recommendation>();

  const add = (ingredient: string, reason: string, label: string) => {
    const current = byIngredient.get(ingredient) ?? {
      ingredient,
      reasons: [],
      concerns: [],
    };
    if (reason && !current.reasons.includes(reason)) current.reasons.push(reason);
    if (!current.concerns.includes(label)) current.concerns.push(label);
    byIngredient.set(ingredient, current);
  };

  findConcerns(messages.join(" ")).forEach((concern) => {
    concern.ingredients.forEach((ingredient) =>
      add(ingredient, INGREDIENT_REASONS[ingredient] ?? "", concern.label)
    );
  });

  demographicConcerns(birthYear, gender).forEach(({ ingredient, reason, label }) =>
    add(ingredient, reason, label)
  );

  // 입력한 고민이 없으면 기본 추천
  if (byIngredient.size === 0) {
    add(
      "종합비타민",
      "특별한 고민이 없다면 기본 영양소를 고르게 채워주는 종합비타민부터 시작해 보세요.",
      "기본"
    );
  }

  // 여러 고민에 공통으로 걸리는 성분을 먼저 보여줍니다.
  return [...byIngredient.values()].sort(
    (a, b) => b.concerns.length - a.concerns.length
  );
}

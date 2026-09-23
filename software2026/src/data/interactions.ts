// 영양제 복용 시간·상호작용 임시 DB
// 일반적으로 알려진 복용 가이드를 정리한 시연용 데이터입니다. (의학적 조언이 아님)

import type { TimeCategory } from "../components/Home";

export type IngredientRule = {
  name: string;
  keywords: string[]; // 영양제 이름에 이 단어가 있으면 해당 성분으로 인식 (소문자·공백 제거 기준)
  preferred: TimeCategory[]; // 권장 시간대 (앞일수록 우선)
  tip: string;
  contains?: string[]; // 함께 들어 있는 성분 (예: 종합비타민 → 철분, 아연)
};

export type InteractionRule = {
  a: string;
  b: string;
  type: "separate" | "together";
  reason: string;
};

export const INGREDIENT_RULES: IngredientRule[] = [
  {
    name: "종합비타민",
    keywords: ["종합비타민", "멀티비타민"],
    preferred: ["아침", "점심"],
    tip: "지용성 비타민이 들어 있어 식후에 먹는 게 좋아요.",
    contains: ["철분", "아연"],
  },
  {
    name: "비타민B",
    keywords: ["비타민b", "비타민비", "b군", "b컴플렉스"],
    preferred: ["아침", "점심"],
    tip: "에너지 대사를 돕기 때문에 아침에 먹는 게 좋고, 밤에는 잠을 방해할 수 있어요.",
  },
  {
    name: "비타민C",
    keywords: ["비타민c", "비타민씨"],
    preferred: ["아침", "점심"],
    tip: "수용성이라 식후에 나눠 먹으면 흡수에 좋아요.",
  },
  {
    name: "비타민D",
    keywords: ["비타민d", "비타민디"],
    preferred: ["점심", "아침"],
    tip: "지용성이라 기름기 있는 식사 후에 먹으면 흡수가 잘 돼요.",
  },
  {
    name: "오메가3",
    keywords: ["오메가"],
    preferred: ["점심", "아침"],
    tip: "지용성이라 식후에 먹어야 흡수가 잘 되고 비린 트림도 줄어요.",
  },
  {
    name: "루테인",
    keywords: ["루테인"],
    preferred: ["점심", "아침"],
    tip: "지용성이라 식후에 먹는 게 좋아요.",
  },
  {
    name: "철분",
    keywords: ["철분"],
    preferred: ["아침", "점심"],
    tip: "공복에 흡수가 잘 되지만 속이 불편하면 식후에 드세요.",
  },
  {
    name: "칼슘",
    keywords: ["칼슘"],
    preferred: ["저녁", "점심"],
    tip: "저녁에 먹으면 밤사이 뼈 대사에 도움이 될 수 있어요.",
  },
  {
    name: "아연",
    keywords: ["아연"],
    preferred: ["점심", "저녁"],
    tip: "공복에 먹으면 속이 불편할 수 있어 식후가 좋아요.",
  },
  {
    name: "마그네슘",
    keywords: ["마그네슘"],
    preferred: ["저녁"],
    tip: "근육 이완을 도와 저녁·취침 전에 먹는 게 좋아요.",
  },
  {
    name: "유산균",
    keywords: ["유산균", "프로바이오틱스", "락토"],
    preferred: ["아침"],
    tip: "위산이 적은 아침 공복에 먹으면 장까지 잘 도달해요.",
  },
  {
    name: "밀크씨슬",
    keywords: ["밀크씨슬", "밀크시슬", "실리마린"],
    preferred: ["아침", "점심"],
    tip: "식전·식후 상관없이 꾸준히 먹는 게 중요해요.",
  },
  {
    name: "홍삼",
    keywords: ["홍삼"],
    preferred: ["아침"],
    tip: "활력을 주는 성분이라 저녁보다 아침이 좋아요.",
  },
];

export const INTERACTION_RULES: InteractionRule[] = [
  {
    a: "칼슘",
    b: "철분",
    type: "separate",
    reason: "칼슘이 철분 흡수를 방해해요.",
  },
  {
    a: "칼슘",
    b: "아연",
    type: "separate",
    reason: "칼슘과 아연은 흡수 경로가 겹쳐 서로 흡수를 방해해요.",
  },
  {
    a: "철분",
    b: "아연",
    type: "separate",
    reason: "철분과 아연은 함께 먹으면 서로 흡수가 줄어요.",
  },
  {
    a: "철분",
    b: "비타민C",
    type: "together",
    reason: "비타민C가 철분 흡수를 높여줘요.",
  },
  {
    a: "칼슘",
    b: "비타민D",
    type: "together",
    reason: "비타민D가 칼슘 흡수를 도와줘요.",
  },
];

// 시간대별 기본 알림 시간
export const DEFAULT_TIMES: Record<TimeCategory, string> = {
  아침: "08:00",
  점심: "13:00",
  저녁: "22:00",
};

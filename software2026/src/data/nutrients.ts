// 성분별 권장 섭취량 임시 DB (섭취량 추천에 사용)
// 한국인 영양소 섭취기준과 건강기능식품 일반 함량을 참고해 단순화한 시연용 값입니다. (의학적 조언이 아님)
// - recommended: 영양제로 먹기를 권하는 하루 범위
// - upper: 영양제로 먹는 양 기준 하루 상한 (넘으면 줄이기 권장)
// - typicalPerUnit: 이 성분 단일 영양제 1정(1캡슐·1포)에 흔히 든 양 (이름에 함량이 없을 때 사용)
// - multiPerUnit: 종합비타민 1정에 흔히 든 양
// - amount가 없는 성분은 수치 대신 안내 문구(note)만 보여줍니다.

export type NutrientDose = {
  name: string;
  keywords: string[]; // 영양제 이름에 있으면 이 성분이 든 제품으로 인식 (소문자·공백 제거 기준)
  note: string;
  inMulti?: boolean; // 수치는 없지만 종합비타민에 보통 들어 있음
  amount?: {
    unit: string;
    recommended: [number, number];
    upper?: number;
    typicalPerUnit: number;
    multiPerUnit?: number;
    // 이름에 적힌 다른 단위를 이 단위로 바꾸는 배율 (예: 비타민D 1µg = 40IU)
    convert?: Record<string, number>;
  };
};

export const NUTRIENT_DOSES: NutrientDose[] = [
  {
    name: "비타민D",
    keywords: ["비타민d", "비타민디"],
    note: "지용성이라 식후에 드세요.",
    amount: {
      unit: "IU",
      recommended: [1000, 2000],
      upper: 4000,
      typicalPerUnit: 1000,
      multiPerUnit: 400,
      convert: { µg: 40, ug: 40, mcg: 40 },
    },
  },
  {
    name: "비타민C",
    keywords: ["비타민c", "비타민씨"],
    note: "수용성이라 나눠 먹으면 흡수에 좋아요.",
    amount: { unit: "mg", recommended: [100, 500], upper: 2000, typicalPerUnit: 500, multiPerUnit: 100 },
  },
  {
    name: "칼슘",
    keywords: ["칼슘"],
    note: "식사로도 섭취하므로 영양제는 하루 1,000mg을 넘기지 않는 게 좋아요.",
    amount: { unit: "mg", recommended: [300, 600], upper: 1000, typicalPerUnit: 300, multiPerUnit: 100 },
  },
  {
    name: "마그네슘",
    keywords: ["마그네슘"],
    note: "영양제로는 하루 350mg이 상한이에요.",
    amount: { unit: "mg", recommended: [200, 350], upper: 350, typicalPerUnit: 250, multiPerUnit: 50 },
  },
  {
    name: "철분",
    keywords: ["철분"],
    note: "과다 섭취 시 위장 장애가 생길 수 있어요.",
    amount: { unit: "mg", recommended: [8, 15], upper: 45, typicalPerUnit: 20, multiPerUnit: 10 },
  },
  {
    name: "아연",
    keywords: ["아연"],
    note: "장기간 과다 섭취하면 구리 흡수를 방해해요.",
    amount: { unit: "mg", recommended: [8, 10], upper: 35, typicalPerUnit: 15, multiPerUnit: 8 },
  },
  {
    name: "오메가3",
    keywords: ["오메가"],
    note: "EPA+DHA 합계 기준이에요.",
    amount: { unit: "mg", recommended: [500, 2000], upper: 3000, typicalPerUnit: 600 },
  },
  {
    name: "루테인",
    keywords: ["루테인"],
    note: "지용성이라 식후에 드세요.",
    amount: { unit: "mg", recommended: [10, 20], upper: 20, typicalPerUnit: 20 },
  },
  {
    name: "엽산",
    keywords: ["엽산"],
    note: "임신 준비 중이라면 꾸준히 드세요.",
    amount: {
      unit: "µg",
      recommended: [400, 600],
      upper: 1000,
      typicalPerUnit: 400,
      multiPerUnit: 200,
      convert: { ug: 1, mcg: 1, mg: 1000 },
    },
  },
  {
    name: "비오틴",
    keywords: ["비오틴"],
    note: "고함량 제품이 많아 한 가지만 드시면 충분해요.",
    amount: {
      unit: "µg",
      recommended: [30, 5000],
      typicalPerUnit: 5000,
      multiPerUnit: 30,
      convert: { ug: 1, mcg: 1, mg: 1000 },
    },
  },
  {
    name: "유산균",
    keywords: ["유산균", "프로바이오틱스", "락토"],
    note: "아침 공복에 드시면 좋아요.",
    amount: { unit: "억 CFU", recommended: [1, 100], typicalPerUnit: 100, convert: { 억: 1 } },
  },
  {
    name: "밀크씨슬",
    keywords: ["밀크씨슬", "밀크시슬", "실리마린"],
    note: "실리마린 기준이에요.",
    amount: { unit: "mg", recommended: [130, 130], upper: 260, typicalPerUnit: 130 },
  },
  {
    name: "코엔자임Q10",
    keywords: ["코엔자임", "코큐텐", "coq10"],
    note: "지용성이라 식후에 드세요.",
    amount: { unit: "mg", recommended: [90, 100], upper: 200, typicalPerUnit: 100 },
  },
  {
    name: "테아닌",
    keywords: ["테아닌"],
    note: "잠들기 전이나 긴장될 때 드세요.",
    amount: { unit: "mg", recommended: [200, 250], upper: 400, typicalPerUnit: 200 },
  },
  {
    name: "MSM",
    keywords: ["msm"],
    note: "관절 영양제는 꾸준히 드셔야 효과를 느낄 수 있어요.",
    amount: { unit: "mg", recommended: [1500, 2000], upper: 4000, typicalPerUnit: 500 },
  },
  {
    name: "글루코사민",
    keywords: ["글루코사민"],
    note: "갑각류 알레르기가 있다면 주의하세요.",
    amount: { unit: "mg", recommended: [1500, 1500], upper: 2000, typicalPerUnit: 500 },
  },
  {
    name: "콜라겐",
    keywords: ["콜라겐"],
    note: "저분자 제품이 흡수가 잘 돼요.",
    amount: { unit: "mg", recommended: [1000, 3000], typicalPerUnit: 1000 },
  },
  {
    name: "비타민B",
    keywords: ["비타민b", "비타민비", "b군", "b컴플렉스"],
    inMulti: true,
    note: "종합비타민에도 비타민B군이 들어 있어 중복되지 않게 챙기세요. 하루 1정이면 충분해요.",
  },
  {
    name: "홍삼",
    keywords: ["홍삼"],
    note: "하루 1포(1회분)면 충분해요.",
  },
  {
    name: "종합비타민",
    keywords: ["종합비타민", "멀티비타민"],
    note: "하루 1정이면 충분해요. 종합비타민은 한 가지만 드세요.",
  },
];

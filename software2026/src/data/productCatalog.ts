// 임시 상품 DB 확장: 영양제 종류마다 상품이 20개쯤 되도록 시연용 상품을 만듭니다.
// 브랜드·상품명·가격은 모두 가상입니다. (실제 브랜드·상품과 관계없음)
// 상품 ID와 내용은 항상 같게 만들어져서 찜·알림이 새로고침 뒤에도 그대로 유지됩니다.

import type { ProductForm, ProductSeed } from "./products";

type Variant = {
  name: string; // 상품명 앞부분 (뒤에 개수가 붙음)
  form: ProductForm;
  ingredients?: string[]; // 기본 성분에 더할 성분
  tags?: string[];
  price?: number; // 하루 가격 배율 (고함량·특수 원료는 비싸게)
  dose?: number; // 하루 섭취량 (기본은 종류별 값)
};

type CategorySpec = {
  category: string;
  ingredients: string[];
  tags: string[];
  pricePerDay: [number, number]; // 하루 가격 범위 (원)
  dailyDose?: number;
  variants: Variant[];
};

// 가상 브랜드 (공식몰 이름)
export const CATALOG_BRANDS = [
  "퓨어포뮬라",
  "루틴랩",
  "하루한알",
  "그린스텝",
  "모닝웰",
  "에버핏",
  "내추럴코드",
  "메디베이스",
  "바이오데이",
  "리브온",
  "뉴트리랩",
  "그린웰",
  "바이탈원",
  "헬시코어",
  "데일리핏",
];

const MALL_SUFFIX = ["공식몰", "스토어", "몰"];

const SPECS: CategorySpec[] = [
  {
    category: "종합비타민",
    ingredients: ["종합비타민", "비타민B", "비타민C", "아연"],
    tags: ["피로", "면역", "활력"],
    pricePerDay: [300, 650],
    variants: [
      { name: "데일리 멀티비타민", form: "tablet" },
      { name: "올인원 멀티비타민 미네랄", form: "tablet", price: 1.2 },
      { name: "우먼 멀티비타민 플러스", form: "tablet", ingredients: ["철분", "엽산"], tags: ["여성건강"] },
      { name: "맨즈 멀티비타민 액티브", form: "tablet", tags: ["남성건강"] },
      { name: "시니어 멀티비타민 50+", form: "tablet", ingredients: ["비타민D"], price: 1.1 },
      { name: "키즈 멀티비타민 츄어블", form: "tablet", tags: ["성장"] },
      { name: "멀티비타민 구미", form: "gummy", price: 1.3 },
      { name: "활성형 멀티비타민", form: "tablet", price: 1.3 },
      { name: "원데이 멀티비타민", form: "softgel" },
      { name: "멀티비타민 미네랄 스틱", form: "stick", price: 1.4 },
    ],
  },
  {
    category: "오메가3",
    ingredients: ["오메가3", "EPA", "DHA"],
    tags: ["혈행", "눈건강", "두뇌"],
    pricePerDay: [400, 850],
    variants: [
      { name: "알티지 오메가3 1200mg", form: "softgel", price: 1.1 },
      { name: "rTG 오메가3 듀얼", form: "softgel", price: 1.2 },
      { name: "식물성 미세조류 오메가3", form: "softgel", price: 1.4 },
      { name: "초임계 알티지 오메가3", form: "softgel", price: 1.3 },
      { name: "고함량 EPA 오메가3", form: "softgel" },
      { name: "미니 오메가3 소프트젤", form: "softgel", price: 0.9 },
      { name: "키즈 오메가3 DHA", form: "softgel", tags: ["성장"] },
      { name: "크릴오일 오메가3", form: "softgel", price: 1.5 },
      { name: "오메가3 비타민E", form: "softgel", ingredients: ["비타민E"] },
      { name: "액상 오메가3 오일", form: "liquid", price: 1.3 },
    ],
  },
  {
    category: "비타민D",
    ingredients: ["비타민D"],
    tags: ["뼈건강", "면역"],
    pricePerDay: [110, 320],
    variants: [
      { name: "비타민D3 1000IU", form: "tablet" },
      { name: "비타민D3 2000IU", form: "softgel" },
      { name: "비타민D3 4000IU", form: "tablet", price: 1.2 },
      { name: "비타민D K2 듀오", form: "softgel", ingredients: ["비타민K"], price: 1.4 },
      { name: "액상 비타민D 드롭", form: "liquid", price: 1.5 },
      { name: "비타민D 구미", form: "gummy", price: 1.4 },
      { name: "키즈 비타민D 츄어블", form: "tablet", tags: ["성장"] },
      { name: "비타민D 칼슘 플러스", form: "tablet", ingredients: ["칼슘"], price: 1.3 },
      { name: "고함량 비타민D3 5000IU", form: "softgel", price: 1.2 },
    ],
  },
  {
    category: "비타민C",
    ingredients: ["비타민C"],
    tags: ["면역", "피로", "피부"],
    pricePerDay: [100, 280],
    variants: [
      { name: "비타민C 1000mg", form: "tablet" },
      { name: "비타민C 500mg", form: "tablet", price: 0.8 },
      { name: "리포좀 비타민C", form: "softgel", price: 2.2 },
      { name: "비타민C 아연 이뮨", form: "tablet", ingredients: ["아연"], price: 1.2 },
      { name: "비타민C 분말 스틱", form: "stick", price: 1.6 },
      { name: "비타민C 구미", form: "gummy", price: 1.5 },
      { name: "버퍼드 비타민C", form: "tablet", price: 1.3 },
      { name: "비타민C 츄어블", form: "tablet" },
      { name: "고함량 비타민C 2000mg", form: "tablet", price: 1.4 },
    ],
  },
  {
    category: "비타민B",
    ingredients: ["비타민B"],
    tags: ["피로", "활력", "스트레스"],
    pricePerDay: [230, 480],
    variants: [
      { name: "비타민B 컴플렉스", form: "tablet" },
      { name: "활성형 비타민B 고함량", form: "tablet", price: 1.3 },
      { name: "비타민B12 메틸코발라민", form: "tablet" },
      { name: "비타민B 올인원", form: "tablet" },
      { name: "비타민B 피로 케어", form: "tablet", price: 1.1 },
      { name: "비타민B 구미", form: "gummy", price: 1.4 },
      { name: "벤포티아민 비타민B", form: "tablet", price: 1.2 },
      { name: "비타민B 액상 앰플", form: "liquid", price: 1.8 },
    ],
  },
  {
    category: "마그네슘",
    ingredients: ["마그네슘"],
    tags: ["수면", "근육경련", "스트레스", "눈떨림"],
    pricePerDay: [140, 330],
    variants: [
      { name: "마그네슘 300mg", form: "tablet" },
      { name: "산화 마그네슘", form: "tablet", price: 0.8 },
      { name: "킬레이트 마그네슘", form: "tablet", price: 1.3 },
      { name: "마그네슘 비타민B6", form: "tablet", ingredients: ["비타민B"] },
      { name: "마그네슘 비스글리시네이트", form: "capsule", price: 1.5 },
      { name: "마그네슘 구미", form: "gummy", price: 1.4 },
      { name: "마그네슘 분말 스틱", form: "stick", price: 1.5 },
      { name: "트리플 마그네슘", form: "capsule", price: 1.2 },
    ],
  },
  {
    category: "칼슘",
    ingredients: ["칼슘", "비타민D"],
    tags: ["뼈건강", "근육경련"],
    pricePerDay: [150, 330],
    dailyDose: 2,
    variants: [
      { name: "칼슘 마그네슘 비타민D 아연", form: "tablet", ingredients: ["마그네슘", "아연"] },
      { name: "해조칼슘", form: "tablet", price: 1.2 },
      { name: "구연산 칼슘", form: "tablet" },
      { name: "칼슘 비타민D 츄어블", form: "tablet", dose: 1 },
      { name: "액상 칼슘 소프트젤", form: "softgel", price: 1.3 },
      { name: "키즈 칼슘 구미", form: "gummy", tags: ["성장"], price: 1.4, dose: 1 },
      { name: "칼슘 1000 플러스", form: "tablet" },
    ],
  },
  {
    category: "철분",
    ingredients: ["철분"],
    tags: ["빈혈", "피로", "어지러움", "여성건강"],
    pricePerDay: [140, 330],
    variants: [
      { name: "철분 20mg", form: "tablet" },
      { name: "헴철 철분", form: "capsule", price: 1.5 },
      { name: "철분 엽산", form: "tablet", ingredients: ["엽산"] },
      { name: "액상 철분 앰플", form: "liquid", price: 1.8 },
      { name: "킬레이트 철분", form: "capsule", price: 1.2 },
      { name: "철분 비타민C", form: "tablet", ingredients: ["비타민C"] },
      { name: "임산부 철분", form: "tablet", tags: ["임신준비"], price: 1.1 },
      { name: "철분 구미", form: "gummy", price: 1.4 },
    ],
  },
  {
    category: "아연",
    ingredients: ["아연"],
    tags: ["면역", "피부", "남성건강"],
    pricePerDay: [110, 280],
    variants: [
      { name: "아연 15mg", form: "tablet" },
      { name: "킬레이트 아연", form: "tablet", price: 1.2 },
      { name: "아연 비타민C", form: "tablet", ingredients: ["비타민C"] },
      { name: "아연 구미", form: "gummy", price: 1.4 },
      { name: "아연 구리 밸런스", form: "tablet" },
      { name: "맨즈 아연 맥스", form: "capsule", price: 1.2 },
      { name: "아연 셀레늄 플러스", form: "tablet", ingredients: ["셀레늄"] },
    ],
  },
  {
    category: "루테인",
    ingredients: ["루테인"],
    tags: ["눈건강", "눈피로"],
    pricePerDay: [550, 1050],
    variants: [
      { name: "루테인 지아잔틴 20mg", form: "softgel", ingredients: ["지아잔틴"] },
      { name: "마리골드 루테인", form: "softgel" },
      { name: "루테인 오메가3", form: "softgel", ingredients: ["오메가3"], price: 1.3 },
      { name: "아스타잔틴 루테인", form: "softgel", price: 1.3 },
      { name: "루테인 빌베리", form: "capsule" },
      { name: "키즈 루테인 츄어블", form: "tablet", tags: ["성장"] },
      { name: "눈 건강 루테인 맥스", form: "softgel", price: 1.1 },
    ],
  },
  {
    category: "유산균",
    ingredients: ["유산균", "프로바이오틱스"],
    tags: ["장건강", "변비", "소화", "면역"],
    pricePerDay: [550, 1250],
    variants: [
      { name: "생유산균 100억", form: "stick" },
      { name: "프로바이오틱스 300억", form: "capsule", price: 1.3 },
      { name: "프리바이오틱스 유산균", form: "stick" },
      { name: "모유유래 유산균", form: "capsule", price: 1.2 },
      { name: "키즈 유산균", form: "stick", tags: ["성장"] },
      { name: "장용성 캡슐 유산균", form: "capsule" },
      { name: "유산균 아연", form: "capsule", ingredients: ["아연"] },
      { name: "신바이오틱스", form: "stick", price: 1.1 },
      { name: "여성 유산균 크랜베리", form: "capsule", ingredients: ["크랜베리"], tags: ["여성건강"] },
    ],
  },
  {
    category: "밀크씨슬",
    ingredients: ["밀크씨슬"],
    tags: ["간건강", "피로", "음주"],
    pricePerDay: [230, 480],
    variants: [
      { name: "밀크씨슬 실리마린 130mg", form: "tablet" },
      { name: "간 건강 밀크씨슬", form: "tablet" },
      { name: "밀크씨슬 비타민B", form: "tablet", ingredients: ["비타민B"], price: 1.1 },
      { name: "밀크씨슬 아티초크", form: "tablet", price: 1.2 },
      { name: "고함량 밀크씨슬", form: "capsule", price: 1.2 },
      { name: "밀크씨슬 헛개", form: "tablet" },
    ],
  },
  {
    category: "코엔자임Q10",
    ingredients: ["코엔자임Q10"],
    tags: ["혈압", "활력", "항산화"],
    pricePerDay: [420, 880],
    variants: [
      { name: "코엔자임Q10 100mg", form: "softgel" },
      { name: "유비퀴놀 코큐텐", form: "softgel", price: 1.6 },
      { name: "코엔자임Q10 오메가3", form: "softgel", ingredients: ["오메가3"], price: 1.2 },
      { name: "코큐텐 비타민E", form: "softgel", ingredients: ["비타민E"] },
      { name: "고함량 코엔자임Q10 200mg", form: "softgel", price: 1.4 },
    ],
  },
  {
    category: "홍삼",
    ingredients: ["홍삼"],
    tags: ["피로", "면역", "활력"],
    pricePerDay: [1100, 2100],
    variants: [
      { name: "6년근 홍삼 스틱", form: "stick", price: 1.1 },
      { name: "홍삼정 농축액", form: "liquid", price: 1.3 },
      { name: "홍삼 캡슐", form: "capsule", price: 0.7 },
      { name: "홍삼 젤리 스틱", form: "stick", price: 0.9 },
      { name: "키즈 홍삼 스틱", form: "stick", tags: ["성장"], price: 0.8 },
      { name: "홍삼정 골드", form: "liquid", price: 1.5 },
      { name: "홍삼 타블렛", form: "tablet", price: 0.7 },
    ],
  },
  {
    category: "콜라겐",
    ingredients: ["콜라겐"],
    tags: ["피부", "관절"],
    pricePerDay: [850, 1550],
    variants: [
      { name: "피쉬 콜라겐 펩타이드", form: "stick" },
      { name: "콜라겐 비타민C 정", form: "tablet", ingredients: ["비타민C"], price: 0.7 },
      { name: "콜라겐 젤리 스틱", form: "stick", price: 1.1 },
      { name: "엘라스틴 콜라겐", form: "tablet", price: 0.9 },
      { name: "히알루론산 콜라겐", form: "stick", ingredients: ["히알루론산"], price: 1.2 },
      { name: "콜라겐 구미", form: "gummy" },
      { name: "저분자 콜라겐 1000", form: "stick" },
    ],
  },
  {
    category: "관절",
    ingredients: ["MSM", "글루코사민"],
    tags: ["관절"],
    pricePerDay: [230, 580],
    dailyDose: 2,
    variants: [
      { name: "관절 MSM 1500", form: "tablet", ingredients: ["MSM"] },
      { name: "글루코사민 콘드로이친", form: "tablet", price: 1.2 },
      { name: "보스웰리아 MSM", form: "tablet", price: 1.3 },
      { name: "초록입홍합 관절", form: "softgel", price: 1.4 },
      { name: "관절 연골 케어", form: "tablet" },
      { name: "MSM 비타민D", form: "tablet", ingredients: ["비타민D"] },
      { name: "시니어 관절 플러스", form: "tablet", price: 1.1 },
    ],
  },
  {
    category: "엽산",
    ingredients: ["엽산"],
    tags: ["임신준비", "여성건강", "빈혈"],
    pricePerDay: [90, 230],
    variants: [
      { name: "엽산 400", form: "tablet" },
      { name: "활성 엽산", form: "tablet", price: 1.3 },
      { name: "임산부 엽산 철분", form: "tablet", ingredients: ["철분"], price: 1.4 },
      { name: "엽산 비타민D", form: "tablet", ingredients: ["비타민D"] },
      { name: "메틸 엽산 800", form: "capsule", price: 1.5 },
      { name: "엽산 오메가3", form: "softgel", ingredients: ["오메가3"], price: 2 },
    ],
  },
  {
    category: "수면",
    ingredients: ["테아닌", "마그네슘"],
    tags: ["수면", "스트레스", "긴장"],
    pricePerDay: [580, 980],
    variants: [
      { name: "L-테아닌 200mg", form: "capsule" },
      { name: "테아닌 마그네슘 릴렉스", form: "tablet" },
      { name: "스트레스 케어 테아닌", form: "tablet", price: 0.9 },
      { name: "테아닌 구미", form: "gummy", price: 1.2 },
      { name: "나이트 케어 테아닌", form: "capsule", price: 1.1 },
      { name: "테아닌 캐모마일", form: "tablet" },
    ],
  },
  {
    category: "비오틴",
    ingredients: ["비오틴", "비타민B"],
    tags: ["탈모", "모발", "손톱", "피부"],
    pricePerDay: [90, 240],
    variants: [
      { name: "비오틴 10000mcg", form: "tablet", price: 1.2 },
      { name: "비오틴 아연", form: "tablet", ingredients: ["아연"] },
      { name: "모발 케어 비오틴", form: "tablet", price: 1.3 },
      { name: "비오틴 판토텐산", form: "tablet" },
      { name: "비오틴 구미", form: "gummy", price: 1.5 },
      { name: "맥주효모 비오틴", form: "tablet", price: 1.4 },
    ],
  },
];

const COUNTS: Record<ProductForm, number[]> = {
  tablet: [30, 60, 90, 120, 180],
  softgel: [30, 60, 90, 120],
  capsule: [30, 60, 90],
  stick: [14, 30, 60],
  gummy: [30, 60],
  liquid: [30, 60],
};

export const FORM_UNITS: Record<ProductForm, string> = {
  tablet: "정",
  softgel: "캡슐",
  capsule: "캡슐",
  stick: "포",
  gummy: "구미",
  liquid: "ml",
};

const TARGET_PER_CATEGORY = 20;

// 상품마다 항상 같은 값이 나오는 난수
function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

const unique = (list: string[]) => [...new Set(list)];

// existing: 직접 적어 둔 상품 (종류별로 모자란 만큼만 만듦)
export function buildCatalog(existing: ProductSeed[]): ProductSeed[] {
  const products: ProductSeed[] = [];
  SPECS.forEach((spec, specIndex) => {
    const have = existing.filter((item) => item.category === spec.category);
    const titles = new Set(have.map((item) => `${item.brand} ${item.title}`));
    const need = Math.max(0, TARGET_PER_CATEGORY - have.length);
    const random = seeded(`catalog-${spec.category}`);

    for (let i = 0; products.filter((p) => p.category === spec.category).length < need && i < need * 4; i++) {
      const variant = spec.variants[i % spec.variants.length];
      const brand = CATALOG_BRANDS[Math.floor(random() * CATALOG_BRANDS.length)];
      const counts = COUNTS[variant.form];
      const count = counts[Math.floor(random() * counts.length)];
      const title = `${variant.name} ${count}${FORM_UNITS[variant.form]}`;
      if (titles.has(`${brand} ${title}`)) continue;
      titles.add(`${brand} ${title}`);

      const dailyDose = variant.dose ?? (variant.form === "stick" || variant.form === "liquid" ? 1 : spec.dailyDose ?? 1);
      const [min, max] = spec.pricePerDay;
      const perDay = (min + random() * (max - min)) * (variant.price ?? 1);
      const days = count / dailyDose;
      // 큰 용량은 하루 가격이 조금 싸게
      const bulk = days >= 120 ? 0.85 : days >= 90 ? 0.92 : 1;
      const basePrice = Math.max(6900, Math.round((perDay * days * bulk) / 100) * 100 - 100);

      products.push({
        productId: `c${String(specIndex + 1).padStart(2, "0")}${String(i + 1).padStart(2, "0")}`,
        title,
        brand,
        mallName: `${brand} ${MALL_SUFFIX[Math.floor(random() * MALL_SUFFIX.length)]}`,
        category: spec.category,
        ingredients: unique([...spec.ingredients, ...(variant.ingredients ?? [])]),
        tags: unique([...spec.tags, ...(variant.tags ?? [])]),
        basePrice,
        count,
        dailyDose,
        image: "",
        form: variant.form,
      });
    }
  });
  return products;
}

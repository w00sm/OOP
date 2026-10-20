// 상품 데이터 창구
// 화면(탭)은 반드시 이 파일의 함수로만 상품 데이터를 가져옵니다.
// 지금은 임시 DB(src/data/products.ts)를 읽지만, 실제 쇼핑 API나 서버 DB로 바꿀 때는
// 이 파일의 searchProducts / getProductsByIds 내부만 바꾸면 됩니다.

import { PRODUCT_SEEDS, type ProductSeed } from "../data/products";
import { closestWord } from "./fuzzy";

export type PricePoint = {
  date: string; // YYYY-MM-DD
  price: number;
};

// 판매처별 가격 (가격비교)
export type Offer = {
  mall: string;
  price: number;
  shipping: number; // 배송비 (0이면 무료배송)
  delivery: string; // "내일 도착" 같은 배송 안내
  official: boolean; // 브랜드 공식몰인지
};

export type Product = Omit<ProductSeed, "basePrice"> & {
  lprice: number; // 현재 최저가 (네이버쇼핑 API 필드명과 동일)
  link: string;
  priceHistory: PricePoint[]; // 오래된 날짜 → 오늘 순서
  rating: number; // 평점 (5점 만점)
  reviewCount: number;
  wishCount: number; // 다른 사람들이 찜한 수
  offers: Offer[]; // 판매처별 가격 (싼 순서, 첫 번째가 최저가)
};

export type SortOption = "sim" | "asc" | "dsc" | "discount";

export const SORT_LABELS: Record<SortOption, string> = {
  sim: "추천순",
  asc: "낮은 가격순",
  dsc: "높은 가격순",
  discount: "할인율순",
};

export type PriceStats = {
  current: number;
  changeRate: number; // 7일 전 대비 변동률 (%)
  lowest: number; // 기간 내 최저가
  highest: number;
  discountRate: number; // 기간 평균가 대비 현재 할인율 (%)
  isLowest: boolean; // 현재가가 기간 내 최저가인지
};

const HISTORY_DAYS = 90;

// 새로고침해도 같은 가격 이력이 나오도록 상품 ID로 고정된 난수를 만듭니다.
function seededRandom(seed: string) {
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

function toDateString(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// 기준가 주변에서 움직이고, 가끔 할인 행사가 있는 가격 이력을 만듭니다.
function buildPriceHistory(seed: ProductSeed): PricePoint[] {
  const today = new Date();
  const history: PricePoint[] = [];

  for (let i = HISTORY_DAYS - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateString = toDateString(date);

    // 주 단위로 가격이 바뀌도록 날짜를 주차로 묶어서 난수를 뽑습니다.
    const week = Math.floor(date.getTime() / (7 * 24 * 60 * 60 * 1000));
    const random = seededRandom(`${seed.productId}-${week}`);
    const drift = (random() - 0.5) * 0.12; // ±6%
    const sale = random() < 0.15 ? 0.12 + random() * 0.1 : 0; // 15% 확률로 12~22% 할인

    const price = seed.basePrice * (1 + drift - sale);
    history.push({ date: dateString, price: Math.round(price / 100) * 100 });
  }

  return history;
}

// 가격비교에 나오는 판매처 (시연용 가상 쇼핑몰)
const MALLS = ["핏마켓", "헬스플러스", "웰니스몰", "데일리마트", "바이오샵", "건강창고"];
const DELIVERIES = ["내일 도착", "오늘출발", "내일 도착", "2일 내 도착"];

// 판매처별 가격: 가장 싼 곳이 현재 최저가(lprice), 나머지는 조금씩 비쌈
function buildOffers(seed: ProductSeed, lowest: number): Offer[] {
  const random = seededRandom(`${seed.productId}-offers`);
  const malls = [...MALLS].sort(() => random() - 0.5).slice(0, 2 + Math.floor(random() * 3));
  const offers = [seed.mallName, ...malls].map((mall, index) => {
    const official = index === 0;
    const markup = official ? 0.03 + random() * 0.06 : random() * 0.1;
    const price = Math.round((lowest * (1 + markup)) / 100) * 100;
    return {
      mall,
      price,
      shipping: price >= 20000 || random() < 0.3 ? 0 : random() < 0.5 ? 2500 : 3000,
      delivery: DELIVERIES[Math.floor(random() * DELIVERIES.length)],
      official,
    };
  });
  // 공식몰이 아닌 한 곳을 최저가로
  const cheapest = 1 + Math.floor(random() * (offers.length - 1));
  offers[cheapest] = { ...offers[cheapest], price: lowest };
  return offers.sort((a, b) => a.price - b.price || a.shipping - b.shipping);
}

function toProduct(seed: ProductSeed): Product {
  const { basePrice, ...rest } = seed;
  const priceHistory = buildPriceHistory(seed);
  const lprice = priceHistory[priceHistory.length - 1]?.price ?? basePrice;
  const random = seededRandom(`${seed.productId}-reviews`);
  return {
    ...rest,
    lprice,
    link: `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(
      seed.title
    )}`,
    priceHistory,
    rating: Math.round((4.5 + random() * 0.45) * 10) / 10,
    reviewCount: Math.round(200 + random() ** 2 * 18000),
    wishCount: Math.round(50 + random() ** 2 * 4000),
    offers: buildOffers(seed, lprice),
  };
}

// 하루 가격: 한 통 가격 ÷ (한 통 개수 ÷ 하루 섭취량)
export const pricePerDay = (product: Product) =>
  Math.round(product.lprice / Math.max(1, product.count / Math.max(1, product.dailyDose)) / 10) * 10;

export const formatCount = (count: number) => count.toLocaleString("ko-KR");

const PRODUCTS: Product[] = PRODUCT_SEEDS.map(toProduct);

// AI가 "비타민 B군", "오메가-3 지방산"처럼 다르게 쓴 성분명도 DB와 맞도록 이름을 정리합니다.
const ALIASES: Record<string, string> = {
  비타민b군: "비타민b",
  비타민b복합체: "비타민b",
  오메가3지방산: "오메가3",
  프로바이오틱스: "유산균",
  코큐텐: "코엔자임q10",
  엘테아닌: "테아닌",
  실리마린: "밀크씨슬",
  멀티비타민: "종합비타민",
};

// "비타민디", "비타민씨"처럼 알파벳을 한글 발음으로 쓴 경우
const VITAMIN_LETTERS: Record<string, string> = {
  에이: "a",
  비: "b",
  씨: "c",
  디: "d",
  케이: "k",
};

const normalize = (text: string) => {
  const cleaned = text
    .toLowerCase()
    .replace(/\(.*?\)/g, "") // 괄호 안 설명 제거: "마그네슘 (Magnesium)"
    .replace(/[\s\-·_]/g, "")
    .replace(
      /비타민(에이|비|씨|디|케이)(?![가-힣])/g,
      (_, letter: string) => `비타민${VITAMIN_LETTERS[letter]}`
    );
  return ALIASES[cleaned] ?? cleaned;
};

// 한쪽이 다른 쪽을 포함하면 같은 성분으로 봅니다. 예: "비타민d3" ↔ "비타민d"
const sameIngredient = (a: string, b: string) => {
  const x = normalize(a);
  const y = normalize(b);
  return x !== "" && y !== "" && (x.includes(y) || y.includes(x));
};

function matchScore(product: Product, query: string) {
  const q = normalize(query);
  if (!q) return 0;

  let score = 0;
  if (normalize(product.title).includes(q)) score += 5;
  if (product.ingredients.some((item) => sameIngredient(item, query))) score += 4;
  if (normalize(product.category).includes(q)) score += 3;
  if (product.tags.some((tag) => normalize(tag).includes(q))) score += 2;
  if (normalize(product.brand).includes(q)) score += 1;
  return score;
}

// 추천 성분 목록과 얼마나 잘 맞는지 점수를 매깁니다.
// 앞에 있는 성분(더 중요한 추천)일수록, 주성분일수록, 여러 성분을 함께 담을수록 점수가 높습니다.
function recommendScore(product: Product, ingredients: string[]) {
  return ingredients.reduce((score, ingredient, index) => {
    const position = product.ingredients.findIndex((item) =>
      sameIngredient(item, ingredient)
    );
    if (position === -1) return score;
    const priority = ingredients.length - index;
    const mainBonus = position === 0 ? 2 : 0;
    return score + priority * 2 + mainBonus;
  }, 0);
}

function sortResults(
  results: { product: Product; score: number }[],
  sort: SortOption
) {
  const byPrice = (a: Product, b: Product) => a.lprice - b.lprice;
  if (sort === "asc") results.sort((a, b) => byPrice(a.product, b.product));
  else if (sort === "dsc") results.sort((a, b) => byPrice(b.product, a.product));
  else if (sort === "discount")
    results.sort(
      (a, b) =>
        getPriceStats(b.product).discountRate -
        getPriceStats(a.product).discountRate
    );
  else results.sort((a, b) => b.score - a.score);
  return results.map((item) => item.product);
}

export async function searchProducts(
  query: string,
  sort: SortOption = "sim"
): Promise<Product[]> {
  const results = PRODUCTS.map((product) => ({
    product,
    score: matchScore(product, query),
  })).filter((item) => item.score > 0);

  return sortResults(results, sort);
}

// 오타 교정 후보 단어: 성분, 카테고리, 고민, 브랜드, 제품명에 들어간 한글 단어
// 성분·카테고리를 앞에 두어 비슷한 점수일 때 우선 추천되게 합니다.
const SEARCH_WORDS = [
  ...new Set([
    ...PRODUCTS.flatMap((product) => [...product.ingredients, product.category]),
    ...PRODUCTS.flatMap((product) => product.tags),
    ...PRODUCTS.map((product) => product.brand),
    ...PRODUCTS.flatMap((product) =>
      product.title.split(/\s+/).filter((word) => /[가-힣]{2,}/.test(word))
    ),
  ]),
];

export type SearchResult = {
  products: Product[];
  suggestion: string | null; // 결과가 없어서 대신 검색한 단어 ("철부" → "철분")
};

// 검색 결과가 없으면 가장 비슷한 단어로 다시 검색합니다.
export async function searchWithSuggestion(
  query: string,
  sort: SortOption = "sim"
): Promise<SearchResult> {
  const products = await searchProducts(query, sort);
  if (products.length > 0 || query.trim() === "") {
    return { products, suggestion: null };
  }

  const suggestion = closestWord(query.replace(/\s+/g, ""), SEARCH_WORDS);
  if (!suggestion) return { products: [], suggestion: null };

  return { products: await searchProducts(suggestion, sort), suggestion };
}

// 추천탭에서 받은 성분 목록에 맞는 상품을 찾습니다.
export async function recommendProducts(
  ingredients: string[],
  sort: SortOption = "sim"
): Promise<Product[]> {
  const results = PRODUCTS.map((product) => ({
    product,
    score: recommendScore(product, ingredients),
  })).filter((item) => item.score > 0);

  return sortResults(results, sort);
}

// 상품이 추천 성분 중 어떤 것을 담고 있는지 (카드에 표시용)
export function matchedIngredients(product: Product, ingredients: string[]) {
  return ingredients.filter((ingredient) =>
    product.ingredients.some((item) => sameIngredient(item, ingredient))
  );
}

export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  return ids
    .map((id) => PRODUCTS.find((product) => product.productId === id))
    .filter((product): product is Product => product !== undefined);
}

export function getPriceStats(product: Product, days = HISTORY_DAYS): PriceStats {
  const history = product.priceHistory.slice(-days);
  const prices = history.map((point) => point.price);
  const current = product.lprice;
  const weekAgo = history[history.length - 8]?.price ?? current;
  const lowest = Math.min(...prices);
  const average = prices.reduce((sum, price) => sum + price, 0) / prices.length;

  return {
    current,
    changeRate: Math.round(((current - weekAgo) / weekAgo) * 100),
    lowest,
    highest: Math.max(...prices),
    discountRate: Math.max(0, Math.round(((average - current) / average) * 100)),
    isLowest: current <= lowest,
  };
}

export const formatPrice = (price: number) => `${price.toLocaleString("ko-KR")}원`;

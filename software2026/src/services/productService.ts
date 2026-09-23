// 상품 데이터 창구
// 화면(탭)은 반드시 이 파일의 함수로만 상품 데이터를 가져옵니다.
// 지금은 임시 DB(src/data/products.ts)를 읽지만, 실제 쇼핑 API나 서버 DB로 바꿀 때는
// 이 파일의 searchProducts / getProductsByIds 내부만 바꾸면 됩니다.

import { PRODUCT_SEEDS, type ProductSeed } from "../data/products";

export type PricePoint = {
  date: string; // YYYY-MM-DD
  price: number;
};

export type Product = Omit<ProductSeed, "basePrice"> & {
  lprice: number; // 현재가 (네이버쇼핑 API 필드명과 동일)
  link: string;
  priceHistory: PricePoint[]; // 오래된 날짜 → 오늘 순서
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

function toProduct(seed: ProductSeed): Product {
  const { basePrice, ...rest } = seed;
  const priceHistory = buildPriceHistory(seed);
  return {
    ...rest,
    lprice: priceHistory[priceHistory.length - 1]?.price ?? basePrice,
    link: `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(
      seed.title
    )}`,
    priceHistory,
  };
}

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

const normalize = (text: string) => {
  const cleaned = text
    .toLowerCase()
    .replace(/\(.*?\)/g, "") // 괄호 안 설명 제거: "마그네슘 (Magnesium)"
    .replace(/[\s\-·_]/g, "");
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

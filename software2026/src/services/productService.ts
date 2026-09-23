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

export type SortOption = "sim" | "asc" | "dsc";

export type PriceStats = {
  current: number;
  changeRate: number; // 7일 전 대비 변동률 (%)
  lowest: number; // 기간 내 최저가
  highest: number;
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

const normalize = (text: string) => text.toLowerCase().replace(/\s+/g, "");

function matchScore(product: Product, query: string) {
  const q = normalize(query);
  if (!q) return 0;

  let score = 0;
  if (normalize(product.title).includes(q)) score += 5;
  if (product.ingredients.some((item) => normalize(item).includes(q))) score += 4;
  if (normalize(product.category).includes(q)) score += 3;
  if (product.tags.some((tag) => normalize(tag).includes(q))) score += 2;
  if (normalize(product.brand).includes(q)) score += 1;
  return score;
}

export async function searchProducts(
  query: string,
  sort: SortOption = "sim"
): Promise<Product[]> {
  const results = PRODUCTS.map((product) => ({
    product,
    score: matchScore(product, query),
  })).filter((item) => item.score > 0);

  if (sort === "asc") results.sort((a, b) => a.product.lprice - b.product.lprice);
  else if (sort === "dsc") results.sort((a, b) => b.product.lprice - a.product.lprice);
  else results.sort((a, b) => b.score - a.score);

  return results.map((item) => item.product);
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

  return {
    current,
    changeRate: Math.round(((current - weekAgo) / weekAgo) * 100),
    lowest,
    highest: Math.max(...prices),
    isLowest: current <= lowest,
  };
}

export const formatPrice = (price: number) => `${price.toLocaleString("ko-KR")}원`;

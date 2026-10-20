// 의약품 검색 (배포할 때 공공데이터에서 받아 둔 public/data/drugs.json 사용)

import type { DrugHit } from "./drugWarnings";

export type DrugEntry = {
  s: string;
  n: string;
  c: string;
  k: "otc" | "rx";
  e: string;
  h: DrugHit[];
};

let cache: Promise<DrugEntry[]> | null = null;

// 처음 검색할 때 한 번만 받아 옵니다. (약 정보가 없으면 빈 목록 → 직접 입력만 가능)
export function loadDrugs(): Promise<DrugEntry[]> {
  cache ??= fetch("/data/drugs.json")
    .then((response) => (response.ok ? response.json() : { drugs: [] }))
    .then((data) => (Array.isArray(data.drugs) ? data.drugs : []))
    .catch(() => {
      cache = null; // 다음에 다시 시도
      return [];
    });
  return cache;
}

const normalize = (text: string) => text.toLowerCase().replace(/[\s()\-·.,]/g, "");

export async function searchDrugs(query: string, kind: "all" | "otc" | "rx" = "all") {
  const q = normalize(query);
  if (q.length === 0) return [];
  const drugs = await loadDrugs();
  return drugs
    .filter((drug) => kind === "all" || drug.k === kind)
    .map((drug) => {
      const name = normalize(drug.n);
      const score = name.startsWith(q) ? 3 : name.includes(q) ? 2 : normalize(drug.c).includes(q) ? 1 : 0;
      return { drug, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.drug.n.length - b.drug.n.length)
    .slice(0, 30)
    .map((item) => item.drug);
}

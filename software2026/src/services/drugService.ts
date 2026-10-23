// 의약품 검색
// - 일반약: 배포할 때 e약은요에서 받아 둔 public/data/drugs.json
// - 처방약: AI 중계 서버(ai-proxy)가 의약품 제품 허가정보를 실시간으로 조회 (인증키는 서버에만)

import type { DrugHit } from "./drugWarnings";

export type DrugEntry = {
  s: string; // 품목기준코드
  n: string; // 제품명
  c: string; // 회사
  k: "otc" | "rx";
  e: string; // 효능 요약 (처방약 검색 결과는 약 분류)
  h: DrugHit[]; // 영양제 주의 성분
  remote?: boolean; // 처방약 검색 결과 (고르면 설명서를 따로 불러옴)
};

const PROXY_URL = (import.meta.env.VITE_AI_PROXY_URL ?? "").replace(/\/+$/, "");

// 처방약 검색을 쓸 수 있는지 (중계 서버 주소가 있을 때)
export const hasRxSearch = Boolean(PROXY_URL);

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

const score = (drug: DrugEntry, q: string) => {
  const name = normalize(drug.n);
  return name.startsWith(q) ? 3 : name.includes(q) ? 2 : normalize(drug.c).includes(q) ? 1 : 0;
};

async function searchRx(query: string): Promise<DrugEntry[]> {
  const response = await fetch(`${PROXY_URL}/drugs/search?q=${encodeURIComponent(query.trim())}`);
  if (!response.ok) throw new Error(`처방약 검색 ${response.status}`);
  const data = await response.json();
  return Array.isArray(data.drugs) ? data.drugs : [];
}

export type DrugSearchResult = { drugs: DrugEntry[]; rxError: boolean };

export async function searchDrugs(query: string, kind: "all" | "otc" | "rx" = "all"): Promise<DrugSearchResult> {
  const q = normalize(query);
  if (q.length === 0) return { drugs: [], rxError: false };

  const all = await loadDrugs();
  const local = kind === "rx" ? [] : all.filter((drug) => kind === "all" || drug.k === kind);
  // 일반약 목록을 받지 못했으면(배포 중 공공데이터 오류 등) 일반약도 서버 검색으로 대신
  const localMissing = all.length === 0;
  let rx: DrugEntry[] = [];
  let rxError = false;
  if ((kind !== "otc" || localMissing) && hasRxSearch && query.trim().length >= 2) {
    try {
      const remote = await searchRx(query);
      // 평소에는 일반약은 설명이 쉬운 e약은요 목록을 쓰고, 서버 검색에서는 처방약만
      rx = remote.filter((drug) =>
        localMissing ? kind === "all" || drug.k === kind : drug.k === "rx"
      );
    } catch {
      rxError = true;
    }
  }

  const drugs = [...local, ...rx]
    .map((drug) => ({ drug, score: score(drug, q) || (drug.remote ? 1 : 0) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.drug.n.length - b.drug.n.length)
    .slice(0, 40)
    .map((item) => item.drug);
  return { drugs, rxError };
}

// 처방약을 고르면: 설명서(사용상의 주의사항)에서 찾은 영양제 주의 성분과 효능
// noLeaflet: 공공데이터가 지금 설명서를 주지 않음 (주의 성분을 확인하지 못한 것이지, 없는 게 아님)
export async function loadDrugDetail(
  seq: string
): Promise<Pick<DrugEntry, "e" | "h"> & { noLeaflet: boolean }> {
  const response = await fetch(`${PROXY_URL}/drugs/detail?seq=${encodeURIComponent(seq)}`);
  if (!response.ok) throw new Error(`처방약 상세 ${response.status}`);
  const data = await response.json();
  return {
    e: String(data.e ?? ""),
    h: Array.isArray(data.h) ? data.h : [],
    noLeaflet: Boolean(data.noLeaflet),
  };
}

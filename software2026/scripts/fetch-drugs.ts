// 의약품 공공데이터 수집 (배포할 때 GitHub Actions에서 실행)
// e약은요(식품의약품안전처_의약품개요정보) 전체 목록을 받아, 앱 검색에 필요한 항목과
// 영양제 성분이 언급된 문장만 골라 public/data/drugs.json으로 저장합니다.
// 인증키는 앱에 들어가지 않습니다.
//
// 실행: DATA_GO_KR_KEY=인증키 npm run drugs:fetch

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { findDrugHits, type DrugHit } from "../src/services/drugWarnings";

export type DrugEntry = {
  s: string; // 품목기준코드
  n: string; // 제품명
  c: string; // 업체명
  k: "otc" | "rx"; // 일반의약품 / 전문의약품(처방약)
  e: string; // 효능 요약
  h: DrugHit[]; // 영양제 성분 언급
};

const OUT = "public/data/drugs.json";
const EASY_DRUG_URL = "https://apis.data.go.kr/1471000/DrbEasyDrugInfoService/getDrbEasyDrugList";
const ROWS = 100;

const key = (process.env.DATA_GO_KR_KEY ?? "").replace(/\s+/g, "");

const short = (text: string | null | undefined, max: number) => {
  const clean = (text ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
};

type EasyDrugItem = {
  itemSeq: string;
  itemName: string;
  entpName: string;
  efcyQesitm?: string | null;
  atpnWarnQesitm?: string | null;
  atpnQesitm?: string | null;
  intrcQesitm?: string | null;
};

async function fetchPage(pageNo: number) {
  const url = new URL(EASY_DRUG_URL);
  url.searchParams.set("serviceKey", key);
  url.searchParams.set("type", "json");
  url.searchParams.set("numOfRows", String(ROWS));
  url.searchParams.set("pageNo", String(pageNo));

  for (let attempt = 1; attempt <= 3; attempt++) {
    const response = await fetch(url);
    const text = await response.text();
    if (response.ok) {
      const data = JSON.parse(text);
      const body = data.body ?? data.response?.body;
      if (!body) throw new Error(`응답 형식이 다릅니다: ${text.slice(0, 200)}`);
      return { total: Number(body.totalCount), items: (body.items ?? []) as EasyDrugItem[] };
    }
    if (attempt === 3) throw new Error(`HTTP ${response.status}: ${text.slice(0, 200)}`);
    await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
  }
  throw new Error("unreachable");
}

export function toEntry(item: EasyDrugItem): DrugEntry {
  return {
    s: item.itemSeq,
    n: item.itemName.trim(),
    c: item.entpName.trim(),
    k: "otc",
    e: short(item.efcyQesitm, 90),
    h: findDrugHits([item.intrcQesitm, item.atpnQesitm, item.atpnWarnQesitm]),
  };
}

async function main() {
  if (!key) throw new Error("DATA_GO_KR_KEY 환경 변수(공공데이터 인증키)가 없습니다.");

  const first = await fetchPage(1);
  const pages = Math.ceil(first.total / ROWS);
  const items = [...first.items];
  for (let page = 2; page <= pages; page++) {
    items.push(...(await fetchPage(page)).items);
  }

  const entries = items.map(toEntry);
  const withHits = entries.filter((entry) => entry.h.length > 0).length;
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(
    OUT,
    JSON.stringify({ updatedAt: new Date().toISOString(), count: entries.length, drugs: entries })
  );
  console.log(`e약은요 ${entries.length}개 저장 (영양제 성분 언급 ${withHits}개) → ${OUT}`);
}

if (process.argv[1]?.endsWith("fetch-drugs.ts")) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

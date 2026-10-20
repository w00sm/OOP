// 의약품 설명서(주의사항·상호작용) 문장에서 영양제 성분 언급 찾기
// 공공데이터 수집 스크립트(scripts/fetch-drugs.ts)와 앱이 함께 사용합니다.
// 문장에서 단어를 찾는 방식이라 완벽하지 않으므로, 앱에서는 '안내 + 의사·약사 상담 권고'로 보여줍니다.

export type DrugHit = {
  i: string; // 영양제 성분 (앱의 성분 이름과 같게: 칼슘, 철분, 마그네슘 …)
  t: string; // 근거 문장
  g: number | null; // 문장에 적힌 간격 시간 (예: 2시간). 없으면 null
};

// 성분별로 찾을 표현 (제산제에는 보통 마그네슘·칼슘이 들어 있음)
const PATTERNS: { ingredient: string; pattern: RegExp }[] = [
  { ingredient: "칼슘", pattern: /칼슘|우유|유제품|제산제/ },
  { ingredient: "마그네슘", pattern: /마그네슘|제산제/ },
  { ingredient: "철분", pattern: /철분|철제|철\s?이온|철염|황산철|철\s?함유|철\(/ },
  { ingredient: "아연", pattern: /아연/ },
  { ingredient: "비타민K", pattern: /비타민\s?K/i },
  { ingredient: "비타민C", pattern: /비타민\s?C|아스코르브산/i },
  { ingredient: "비타민D", pattern: /비타민\s?D/i },
  { ingredient: "오메가3", pattern: /오메가|어유|EPA|DHA/ },
  { ingredient: "홍삼", pattern: /인삼|홍삼/ },
  { ingredient: "유산균", pattern: /유산균|생균제|프로바이오틱스/ },
];

const stripTags = (text: string) =>
  text
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// 문장마다 성분 언급을 찾아, 성분당 가장 먼저 나온 문장 하나만 남깁니다.
export function findDrugHits(...texts: (string | null | undefined)[]): DrugHit[] {
  const sentences = texts
    .filter((text): text is string => Boolean(text))
    .map(stripTags)
    .join(" ")
    .split(/(?<=[.다])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  const hits = new Map<string, DrugHit>();
  for (const sentence of sentences) {
    for (const { ingredient, pattern } of PATTERNS) {
      if (hits.has(ingredient) || !pattern.test(sentence)) continue;
      const gap = sentence.match(/(\d+)\s*시간/);
      hits.set(ingredient, {
        i: ingredient,
        t: sentence.length > 160 ? `${sentence.slice(0, 157)}…` : sentence,
        g: gap ? Number(gap[1]) : null,
      });
    }
  }
  return [...hits.values()];
}

export const DEFAULT_GAP_HOURS = 2; // 설명서에 간격이 없을 때 안내하는 기본 간격

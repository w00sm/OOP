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

// 성분 이름이 들어 있어도 영양제 얘기가 아닌 의학 용어 (예: 고칼슘혈증, 칼슘채널차단제, 비타민K의존성 응고인자)
const NOT_SUPPLEMENT: Partial<Record<string, RegExp>> = {
  칼슘: /(고|저)\s?칼슘|칼슘\s?(혈증|뇨|채널|통로|길항|차단|이온\s?농도|수치)/g,
  마그네슘: /(고|저)\s?마그네슘|마그네슘\s?(혈증|수치)/g,
  철분: /철\s?(결핍|과부하)/g,
  비타민K: /비타민\s?K\s?(의존|길항)/gi,
  비타민D: /비타민\s?D\s?(결핍|수치|유사체)/gi,
};

// 함께 먹는 것에 관한 문장인지 (부작용·검사 수치 문장과 구분)
const TOGETHER_WORDS = /병용|함께|같이|동시|간격|흡수|투여하지|복용하지|드시지|섭취/;

type FindOptions = {
  onlyTogether?: boolean; // 긴 설명서(처방약)는 함께 먹는 것에 관한 문장만 사용
};

// 문장마다 성분 언급을 찾아, 성분마다 가장 알맞은 문장 하나를 남깁니다.
// (함께 먹는 것에 관한 문장 > 간격 시간이 적힌 문장 > 먼저 나온 문장)
export function findDrugHits(texts: (string | null | undefined)[] | string, options: FindOptions = {}): DrugHit[] {
  const sentences = (Array.isArray(texts) ? texts : [texts])
    .filter((text): text is string => Boolean(text))
    .map(stripTags)
    .join(" ")
    .split(/(?<=[.다])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  const best = new Map<string, { hit: DrugHit; score: number }>();
  for (const sentence of sentences) {
    const together = TOGETHER_WORDS.test(sentence);
    if (options.onlyTogether && !together) continue;
    for (const { ingredient, pattern } of PATTERNS) {
      const exclude = NOT_SUPPLEMENT[ingredient];
      const checked = exclude ? sentence.replace(exclude, " ") : sentence;
      if (!pattern.test(checked)) continue;
      const gap = sentence.match(/(\d+)\s*시간/);
      const score = (together ? 2 : 0) + (gap ? 1 : 0);
      if ((best.get(ingredient)?.score ?? -1) >= score) continue;
      best.set(ingredient, {
        score,
        hit: {
          i: ingredient,
          t: sentence.length > 160 ? `${sentence.slice(0, 157)}…` : sentence,
          g: gap ? Number(gap[1]) : null,
        },
      });
    }
  }
  // 성분 순서는 PATTERNS 순서대로
  return PATTERNS.flatMap(({ ingredient }) => {
    const found = best.get(ingredient);
    return found ? [found.hit] : [];
  });
}

export const DEFAULT_GAP_HOURS = 2; // 설명서에 간격이 없을 때 안내하는 기본 간격

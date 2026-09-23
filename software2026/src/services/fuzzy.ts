// 오타 교정용 유사도 계산
// 한글은 음절 그대로 비교하면 "철부"와 "철분"이 완전히 다른 글자가 되므로,
// 자음·모음(자모) 단위로 풀어서 비교합니다.  철부 → ㅊㅓㄹㅂㅜ, 철분 → ㅊㅓㄹㅂㅜㄴ (1글자 차이)

const CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
const JUNG = "ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ";
const JONG = " ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ";

export function toJamo(text: string) {
  let result = "";
  for (const char of text) {
    const code = char.charCodeAt(0) - 0xac00;
    if (code < 0 || code > 11171) {
      result += char;
      continue;
    }
    result += CHO[Math.floor(code / 588)] + JUNG[Math.floor((code % 588) / 28)];
    if (code % 28 !== 0) result += JONG[code % 28];
  }
  return result;
}

// 한 문자열을 다른 문자열로 바꾸는 데 필요한 최소 편집 횟수 (추가·삭제·교체)
export function editDistance(a: string, b: string) {
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(prev[j] + 1, current[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = current;
  }
  return prev[b.length];
}

// words 중 query와 가장 비슷한 단어를 찾습니다. 충분히 비슷한 단어가 없으면 null.
// - 전체 비교: "철부" ↔ "철분"
// - 앞부분 비교: 입력 중인 "마그내" ↔ "마그네슘"의 앞부분 "마그네"
export function closestWord(query: string, words: string[]) {
  const q = toJamo(query);
  if (q.length < 2) return null;

  // 자모 4개당 1개 오타까지 허용 (최소 1개)
  const maxDistance = Math.max(1, Math.floor(q.length / 4));

  let best: { word: string; score: number } | null = null;
  for (const word of words) {
    const w = toJamo(word);
    const full = editDistance(q, w);
    const prefix = w.length > q.length ? editDistance(q, w.slice(0, q.length)) + 0.5 : Infinity;
    const score = Math.min(full, prefix);
    if (score <= maxDistance && (!best || score < best.score)) {
      best = { word, score };
    }
  }
  return best?.word ?? null;
}

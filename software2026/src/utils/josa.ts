// 단어 끝 받침에 맞는 조사를 붙입니다.  josa("철분", "을/를") → "철분을", josa("비타민C", "과/와") → "비타민C와" (받침 있을 때 / 없을 때 순서)

// 받침이 있는지: 한글은 종성으로, 숫자·영문은 읽는 소리로 판단 (영·일·삼·육·칠·팔, 엘·엠·엔)
function hasBatchim(word: string): boolean | null {
  const last = word.trim().slice(-1).toUpperCase();
  const code = last.charCodeAt(0) - 0xac00;
  if (code >= 0 && code <= 11171) return code % 28 !== 0;
  if ("013678LMN".includes(last)) return true;
  if (/[0-9A-Z]/.test(last)) return false;
  return null;
}

export function josa(word: string, pair: "을/를" | "이/가" | "은/는" | "과/와" | "으로/로") {
  const [withBatchim, withoutBatchim] = pair.split("/");
  const batchim = hasBatchim(word);
  if (batchim === null) return `${word}${withBatchim}(${withoutBatchim})`;
  // 'ㄹ' 받침 뒤에는 '으로'가 아니라 '로' (예: 오메가3일 → 일로)
  if (pair === "으로/로" && batchim) {
    const code = word.trim().slice(-1).charCodeAt(0) - 0xac00;
    if (code % 28 === 8 || word.trim().endsWith("1")) return `${word}로`;
  }
  return `${word}${batchim ? withBatchim : withoutBatchim}`;
}

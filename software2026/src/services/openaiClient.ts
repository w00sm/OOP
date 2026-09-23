// OpenAI 클라이언트
// .env에 VITE_OPENAI_API_KEY가 없으면 앱 전체가 멈추지 않도록, 실제로 호출할 때 만들어서 씁니다.
// ⚠ VITE_로 시작하는 키는 브라우저 코드에 그대로 포함되어 누구나 볼 수 있습니다.
//   배포 전에는 서버(예: Firebase Functions)를 거쳐 호출하도록 옮겨야 합니다.

import OpenAI from "openai";

let client: OpenAI | null = null;

export const hasOpenAIKey = Boolean(import.meta.env.VITE_OPENAI_API_KEY);

export function getOpenAI(): OpenAI {
  if (!hasOpenAIKey) {
    throw new Error("VITE_OPENAI_API_KEY가 설정되지 않았습니다.");
  }
  client ??= new OpenAI({
    apiKey: import.meta.env.VITE_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true,
  });
  return client;
}

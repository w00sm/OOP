// OpenAI 클라이언트
// 배포된 앱은 OpenAI를 직접 부르지 않고 AI 중계 서버(ai-proxy, Cloudflare Workers)를 거칩니다.
// 그래서 OpenAI 키는 앱 코드에 들어가지 않고 중계 서버의 비밀값에만 있습니다.
// - VITE_AI_PROXY_URL: 중계 서버 주소 (.env.production에 적어 둠, 비밀 아님)
// - VITE_OPENAI_API_KEY: PC에서 개발할 때만 쓰는 키 (.env, 커밋하지 않음)

import OpenAI from "openai";

const PROXY_URL = (import.meta.env.VITE_AI_PROXY_URL ?? "").replace(/\/+$/, "");
const DEV_KEY = import.meta.env.VITE_OPENAI_API_KEY;

let client: OpenAI | null = null;

// AI를 쓸 수 있는지 (중계 서버 주소나 개발용 키가 있으면)
export const hasOpenAIKey = Boolean(PROXY_URL || DEV_KEY);

export function getOpenAI(): OpenAI {
  if (!hasOpenAIKey) {
    throw new Error("AI 중계 서버 주소(VITE_AI_PROXY_URL)나 개발용 키가 설정되지 않았습니다.");
  }
  client ??= PROXY_URL
    ? new OpenAI({
        apiKey: "via-proxy", // 진짜 키는 중계 서버에만 있음
        baseURL: `${PROXY_URL}/v1`,
        dangerouslyAllowBrowser: true,
      })
    : new OpenAI({ apiKey: DEV_KEY, dangerouslyAllowBrowser: true });
  return client;
}

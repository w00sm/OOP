// Fit Vita AI 중계 서버
// 앱 → (이 서버) → OpenAI. OpenAI 키는 Cloudflare 비밀값(OPENAI_API_KEY)에만 있습니다.
// 남용을 막기 위해: 허용한 앱 주소만, 채팅 API만, gpt-4o-mini만, 답변 길이·요청 크기·횟수 제한.

type Env = {
  OPENAI_API_KEY: string;
  ALLOWED_ORIGINS: string;
};

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const ALLOWED_MODELS = new Set(["gpt-4o-mini"]);
const MAX_BODY_BYTES = 3_000_000; // 라벨 사진(줄인 JPEG) 포함
const MAX_TOKENS = 1500;
const RATE_LIMIT = { requests: 30, windowMs: 10 * 60 * 1000 }; // 같은 기기(IP)에서 10분에 30번

// 같은 서버 인스턴스 안에서만 세는 간단한 횟수 제한 (완벽하지 않아 OpenAI 사용 한도도 함께 걸어 두세요)
const hits = new Map<string, number[]>();

function isRateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((time) => now - time < RATE_LIMIT.windowMs);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear(); // 메모리 정리
  return recent.length > RATE_LIMIT.requests;
}

function json(status: number, message: string, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify({ error: { message } }), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin") ?? "";
    const allowed = env.ALLOWED_ORIGINS.split(",").map((item) => item.trim());
    if (!allowed.includes(origin)) return json(403, "허용되지 않은 주소입니다.");

    const cors = {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers":
        request.headers.get("Access-Control-Request-Headers") ?? "content-type, authorization",
      "Access-Control-Max-Age": "86400",
      Vary: "Origin",
    };
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

    const { pathname } = new URL(request.url);
    if (request.method !== "POST" || pathname !== "/v1/chat/completions") {
      return json(404, "지원하지 않는 요청입니다.", cors);
    }
    if (!env.OPENAI_API_KEY) return json(500, "서버에 OpenAI 키가 설정되지 않았습니다.", cors);

    const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
    if (isRateLimited(ip)) return json(429, "요청이 너무 많아요. 잠시 후 다시 시도해 주세요.", cors);

    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) return json(413, "요청이 너무 커요.", cors);

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(text);
    } catch {
      return json(400, "잘못된 요청입니다.", cors);
    }
    if (!ALLOWED_MODELS.has(String(body.model))) return json(400, "허용되지 않은 모델입니다.", cors);

    // 비용을 넘기지 않도록 답변 길이 제한, 스트리밍·여러 답변 끄기
    const requested = Number(body.max_tokens ?? body.max_completion_tokens ?? MAX_TOKENS);
    body.max_tokens = Math.min(Number.isFinite(requested) ? requested : MAX_TOKENS, MAX_TOKENS);
    delete body.max_completion_tokens;
    body.stream = false;
    body.n = 1;

    const upstream = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    return new Response(upstream.body, {
      status: upstream.status,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  },
};

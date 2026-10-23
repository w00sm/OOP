// Fit Vita AI 중계 서버
// 앱 → (이 서버) → OpenAI / 공공데이터포털. 키는 Cloudflare 비밀값(OPENAI_API_KEY, DATA_GO_KR_KEY)에만 있습니다.
// 남용을 막기 위해: 허용한 앱 주소만, 정해진 기능만, gpt-4o-mini만, 답변 길이·요청 크기·횟수 제한.
//
// POST /v1/chat/completions      → OpenAI (AI 상담·보관법·라벨 사진)
// GET  /drugs/search?q=약이름     → 의약품 제품 허가 목록 (처방약 검색)
// GET  /drugs/detail?seq=품목코드 → 허가 상세 (사용상의 주의사항에서 영양제 주의 성분 찾기)

import { findDrugHits } from "../../src/services/drugWarnings";

type Env = {
  OPENAI_API_KEY: string;
  DATA_GO_KR_KEY?: string;
  ALLOWED_ORIGINS: string;
};

const DRUG_API = "https://apis.data.go.kr/1471000/DrugPrdtPrmsnInfoService08";
const DRUG_CACHE_SECONDS = 60 * 60 * 24; // 같은 검색·상세는 하루 동안 저장해 둔 결과 사용
// 주의 성분 찾는 방식을 바꾸면 이 숫자를 올려서 예전에 저장한 결과를 쓰지 않게 합니다
const DRUG_CACHE_VERSION = "2";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const ALLOWED_MODELS = new Set(["gpt-4o-mini"]);
const MAX_BODY_BYTES = 3_000_000; // 라벨 사진(줄인 JPEG) 포함
const MAX_TOKENS = 1500;
const RATE_LIMIT = { requests: 30, windowMs: 10 * 60 * 1000 }; // 같은 기기(IP)에서 10분에 30번

// 같은 서버 인스턴스 안에서만 세는 간단한 횟수 제한 (완벽하지 않아 OpenAI 사용 한도도 함께 걸어 두세요)
const hits = new Map<string, number[]>();

const DRUG_RATE_LIMIT = { requests: 120, windowMs: 10 * 60 * 1000 }; // 검색은 글자를 칠 때마다 불러서 넉넉하게

function isRateLimited(ip: string, limit = RATE_LIMIT) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((time) => now - time < limit.windowMs);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear(); // 메모리 정리
  return recent.length > limit.requests;
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
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers":
        request.headers.get("Access-Control-Request-Headers") ?? "content-type, authorization",
      "Access-Control-Max-Age": "86400",
      Vary: "Origin",
    };
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

    const url = new URL(request.url);
    const { pathname } = url;
    if (request.method === "GET" && pathname.startsWith("/drugs/")) {
      const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
      if (isRateLimited(`drug-${ip}`, DRUG_RATE_LIMIT)) {
        return json(429, "요청이 너무 많아요. 잠시 후 다시 시도해 주세요.", cors);
      }
      return handleDrugs(url, env, cors);
    }
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

/* ---------- 처방약 (의약품 제품 허가정보) ---------- */

type DrugItem = Record<string, string | null | undefined>;

// XML 문서(CDATA·태그)를 글자만 남기기
const plainText = (xml?: string | null) =>
  (xml ?? "")
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

// "[02430]갑상선, 부갑상선호르몬제" → "갑상선, 부갑상선호르몬제"
const productType = (text?: string | null) => (text ?? "").replace(/^\[\w+\]/, "").trim();

const short = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

async function callDrugApi(env: Env, operation: string, params: Record<string, string>) {
  const query = new URLSearchParams({
    serviceKey: (env.DATA_GO_KR_KEY ?? "").replace(/\s/g, ""),
    type: "json",
    ...params,
  });
  // 공공데이터가 느릴 때 오래 붙잡지 않도록 8초 제한, 한 번 더 시도
  let response: Response | null = null;
  for (let attempt = 1; attempt <= 2 && !response?.ok; attempt++) {
    try {
      response = await fetch(`${DRUG_API}/${operation}?${query}`, { signal: AbortSignal.timeout(8000) });
    } catch (error) {
      if (attempt === 2) throw error;
    }
  }
  if (!response?.ok) throw new Error(`공공데이터 ${response?.status}`);
  const data = (await response.json()) as { body?: { items?: DrugItem[] | { item?: DrugItem[] } } };
  const items = data.body?.items;
  if (!items) return [];
  return Array.isArray(items) ? items : (items.item ?? []);
}

async function handleDrugs(url: URL, env: Env, cors: Record<string, string>) {
  if (!env.DATA_GO_KR_KEY) return json(500, "서버에 공공데이터 인증키가 설정되지 않았습니다.", cors);

  // 같은 요청은 Cloudflare 캐시에 하루 저장 (공공데이터 호출 횟수·속도 절약)
  const cache = (caches as unknown as { default: Cache }).default;
  const cacheKey = new Request(`https://drug-cache/v${DRUG_CACHE_VERSION}${url.pathname}?${url.searchParams}`);
  const cached = await cache.match(cacheKey);
  if (cached) return withCors(cached, cors);

  let payload: unknown;
  try {
    if (url.pathname === "/drugs/search") {
      const q = (url.searchParams.get("q") ?? "").trim();
      if (q.length < 2) return json(400, "두 글자 이상 입력해 주세요.", cors);
      const items = await callDrugApi(env, "getDrugPrdtPrmsnInq08", { item_name: q, numOfRows: "40" });
      payload = {
        drugs: items
          .filter((item) => (item.CANCEL_NAME ?? "정상") === "정상")
          .map((item) => ({
            s: item.ITEM_SEQ,
            n: item.ITEM_NAME,
            c: item.ENTP_NAME,
            k: item.SPCLTY_PBLC === "전문의약품" ? "rx" : "otc",
            e: productType(item.PRDUCT_TYPE),
            h: [],
            remote: true,
          })),
      };
    } else if (url.pathname === "/drugs/detail") {
      const seq = (url.searchParams.get("seq") ?? "").trim();
      if (!/^\d{6,12}$/.test(seq)) return json(400, "잘못된 품목코드입니다.", cors);
      const [item] = await callDrugApi(env, "getDrugPrdtPrmsnDtlInq08", { item_seq: seq, numOfRows: "1" });
      if (!item) return json(404, "의약품을 찾지 못했어요.", cors);
      const caution = plainText(item.NB_DOC_DATA);
      payload = {
        s: item.ITEM_SEQ,
        n: item.ITEM_NAME,
        c: item.ENTP_NAME,
        k: item.ETC_OTC_CODE === "전문의약품" ? "rx" : "otc",
        e: short(plainText(item.EE_DOC_DATA), 90),
        // 긴 설명서라 함께 먹는 것(병용·간격·흡수)에 관한 문장만 사용
        h: findDrugHits(caution, { onlyTogether: true }),
      };
    } else {
      return json(404, "지원하지 않는 요청입니다.", cors);
    }
  } catch (error) {
    console.error(error);
    return json(502, "의약품 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.", cors);
  }

  const response = new Response(JSON.stringify(payload), {
    headers: { "Content-Type": "application/json", "Cache-Control": `public, max-age=${DRUG_CACHE_SECONDS}` },
  });
  await cache.put(cacheKey, response.clone());
  return withCors(response, cors);
}

function withCors(response: Response, cors: Record<string, string>) {
  const headers = new Headers(response.headers);
  Object.entries(cors).forEach(([key, value]) => headers.set(key, value));
  return new Response(response.body, { status: response.status, headers });
}

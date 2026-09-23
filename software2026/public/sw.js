// Fit Vita 서비스워커
// - 앱 화면(HTML)은 항상 네트워크에서 먼저 받고, 오프라인이면 저장해 둔 화면을 보여줍니다.
// - 빌드된 JS·CSS·아이콘은 한 번 받으면 저장해 두고 재사용합니다. (파일명에 해시가 붙어 바뀌면 새로 받음)
// - 4단계에서 푸시 알림(FCM) 처리도 이 파일 또는 별도 서비스워커에 추가합니다.

const CACHE_NAME = "fitvita-v1";
const APP_SHELL = ["/", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // 버전(CACHE_NAME)이 바뀌면 예전 캐시를 지웁니다.
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 다른 사이트(구글 로그인, OpenAI 등)와 GET이 아닌 요청은 건드리지 않습니다.
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // 화면 이동: 네트워크 우선, 실패하면 저장된 화면
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("/", copy));
          return response;
        })
        .catch(() => caches.match("/"))
    );
    return;
  }

  // 정적 파일: 저장된 것 우선, 없으면 받아서 저장
  if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            return response;
          })
      )
    );
  }
});

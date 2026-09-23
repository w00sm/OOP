// Fit Vita 서비스워커
// - 앱 화면(HTML)은 항상 네트워크에서 먼저 받고, 오프라인이면 저장해 둔 화면을 보여줍니다.
// - 빌드된 JS·CSS·아이콘은 한 번 받으면 저장해 두고 재사용합니다. (파일명에 해시가 붙어 바뀌면 새로 받음)
// - 알림을 누르면 열려 있는 앱 창으로 이동하거나 새로 엽니다.
// - 서버 푸시(FCM)를 붙일 때 push 이벤트 처리도 이 파일에 추가합니다.

const CACHE_NAME = "fitvita-v4";
const APP_SHELL = [
  "/",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/loading/character-sheet.png",
];

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
  if (
    url.pathname.startsWith("/assets/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/loading/")
  ) {
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

// 서버 푸시(FCM) 수신: GitHub Actions의 scripts/send-push.ts가 보낸 data 메시지를 알림으로 표시
// tag가 같으면 앱이 이미 띄운 알림과 합쳐져서 두 번 울리지 않습니다.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data?.json()?.data ?? {};
  } catch {
    data = { title: "Fit Vita", body: event.data?.text() ?? "" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Fit Vita", {
      body: data.body || "",
      tag: data.tag || undefined,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: "/" },
    })
  );
});

// 알림을 누르면 앱으로 이동
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const client = clients.find((item) => item.url.startsWith(self.location.origin));
      if (client) return client.focus();
      return self.clients.openWindow("/");
    })
  );
});

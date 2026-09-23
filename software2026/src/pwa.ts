// PWA 서비스워커 등록
// 개발 중(npm run dev)에는 캐시 때문에 수정 사항이 안 보이는 일이 없도록 등록하지 않습니다.
// 설치·오프라인 동작은 npm run build → npm run preview 로 확인하세요.

export function registerServiceWorker() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("서비스워커 등록 실패:", error);
    });
  });
}

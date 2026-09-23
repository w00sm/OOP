import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import "./InstallBanner.css";

// 크롬(안드로이드·PC)이 "설치 가능"을 알려줄 때 받는 이벤트 (표준 타입에 아직 없음)
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "installBannerDismissed";

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  // 아이패드 OS는 PC처럼 보이므로 터치 지원 여부로 구분
  (navigator.userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1);

function wasDismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === "true";
  } catch {
    return false;
  }
}

export default function InstallBanner() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(() => isStandalone() || wasDismissed());
  const showIOSGuide = isIOS() && !isStandalone();

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault(); // 브라우저 기본 안내 대신 우리 배너로 보여줍니다.
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setHidden(true);

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(DISMISS_KEY, "true");
    } catch {
      // 저장 실패해도 이번 화면에서는 닫힙니다.
    }
  };

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === "accepted") setHidden(true);
    setInstallEvent(null);
  };

  if (hidden || (!installEvent && !showIOSGuide)) return null;

  return (
    <div className="install-banner">
      <img src="/icons/icon-192.png" alt="" className="install-banner-icon" />
      <div className="install-banner-text">
        <strong>Fit Vita 앱으로 쓰기</strong>
        {installEvent ? (
          <span>홈 화면에 추가하고 알림을 받아보세요</span>
        ) : (
          <span>
            하단 <Share size={13} className="inline-icon" /> 공유 → '홈 화면에 추가'
          </span>
        )}
      </div>
      {installEvent && (
        <button type="button" className="install-banner-button" onClick={install}>
          <Download size={16} />
          설치
        </button>
      )}
      <button
        type="button"
        className="install-banner-close"
        aria-label="닫기"
        onClick={dismiss}
      >
        <X size={16} />
      </button>
    </div>
  );
}

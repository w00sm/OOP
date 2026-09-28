// 날짜가 바뀌면(00:00이 지나면) 복용 체크를 모두 해제합니다.
// 홈탭은 처음 열릴 때만 날짜를 확인하므로, 앱을 켜 둔 채 자정을 넘겨도 초기화되도록 여기서 계속 확인합니다.

import { useEffect, type Dispatch, type SetStateAction } from "react";
import type { Supplement } from "../components/Home";

const CHECK_INTERVAL_MS = 30 * 1000;
const LAST_ACTIVE_KEY = "lastActiveDate"; // 홈탭·로딩 화면과 같은 키

function todayKey() {
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${m}-${d}`;
}

export function useDailyReset(setSupplements: Dispatch<SetStateAction<Supplement[]>>) {
  useEffect(() => {
    const check = () => {
      let last: string | null;
      try {
        last = localStorage.getItem(LAST_ACTIVE_KEY);
      } catch {
        return;
      }
      const today = todayKey();
      if (last === today) return;

      if (last) {
        setSupplements((prev) =>
          prev.some((item) => item.checked)
            ? prev.map((item) => ({ ...item, checked: false }))
            : prev
        );
      }
      try {
        localStorage.setItem(LAST_ACTIVE_KEY, today);
      } catch {
        // 저장 실패해도 다음 확인 때 다시 시도합니다.
      }
    };

    check();
    const timer = window.setInterval(check, CHECK_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [setSupplements]);
}

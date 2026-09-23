// 앱이 열려 있는 동안 1분마다 알림 조건을 검사합니다.

import { useEffect, useRef } from "react";
import type { Supplement } from "../components/Home";
import type { WishItem } from "./useWishlist";
import { checkDoseReminders, checkPriceAlerts, checkRestock } from "../services/alertChecks";

const CHECK_INTERVAL_MS = 60 * 1000;

export function useAlertScheduler(supplements: Supplement[], wishlist: WishItem[]) {
  // 타이머는 한 번만 만들고, 최신 데이터는 ref로 읽습니다.
  const latest = useRef({ supplements, wishlist });

  useEffect(() => {
    latest.current = { supplements, wishlist };
  }, [supplements, wishlist]);

  useEffect(() => {
    const runChecks = async () => {
      const { supplements, wishlist } = latest.current;
      await checkDoseReminders(supplements);
      await checkRestock(supplements);
      await checkPriceAlerts(wishlist);
    };

    runChecks();
    const timer = window.setInterval(runChecks, CHECK_INTERVAL_MS);
    // 다른 앱을 보다 돌아왔을 때 바로 확인
    const onVisible = () => {
      if (document.visibilityState === "visible") runChecks();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
}

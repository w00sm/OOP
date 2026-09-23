// 서버 푸시를 켠 기기에서만, 영양제·찜·알림 설정이 바뀌면 Firestore에 올립니다.

import { useEffect } from "react";
import type { Supplement } from "../components/Home";
import type { WishItem } from "./useWishlist";
import { useNotifications } from "./useNotifications";
import { isServerPushEnabled, syncForServerPush } from "../services/pushService";

const SYNC_DELAY_MS = 2000; // 연속으로 바뀔 때 한 번만 올리도록 잠깐 기다립니다.

export function useCloudSync(supplements: Supplement[], wishlist: WishItem[]) {
  const { settings, history } = useNotifications();
  const latestNotificationId = history[0]?.id;

  useEffect(() => {
    if (!isServerPushEnabled()) return;
    const timer = window.setTimeout(() => {
      syncForServerPush(supplements, wishlist).catch((error) =>
        console.error("서버 동기화 실패:", error)
      );
    }, SYNC_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [supplements, wishlist, settings, latestNotificationId]);
}

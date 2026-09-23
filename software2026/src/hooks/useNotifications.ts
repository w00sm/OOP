// 알림 목록·설정·권한을 화면에서 쓰기 위한 훅 (다른 곳에서 바뀌면 자동으로 다시 그림)

import { useEffect, useState } from "react";
import {
  getHistory,
  getPermission,
  getSettings,
  subscribe,
} from "../services/notificationService";

export function useNotifications() {
  const [snapshot, setSnapshot] = useState(() => ({
    history: getHistory(),
    settings: getSettings(),
    permission: getPermission(),
  }));

  useEffect(
    () =>
      subscribe(() =>
        setSnapshot({
          history: getHistory(),
          settings: getSettings(),
          permission: getPermission(),
        })
      ),
    []
  );

  return {
    ...snapshot,
    unreadCount: snapshot.history.filter((item) => !item.read).length,
  };
}

// 알림 엔진
// 모든 알림은 notify()를 거칩니다: 설정 확인 → 중복 방지 → 알림 목록 저장 → 시스템 알림 표시
// 지금은 앱이 열려 있을 때(백그라운드 탭 포함) 브라우저 Notification API로 알림을 띄웁니다.
// 앱이 완전히 꺼져 있을 때의 알림은 FCM(서버 푸시)으로 보내야 합니다.

export type NotificationType = "dose" | "lowest" | "target" | "restock" | "test";

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  createdAt: string; // ISO 시간
  read: boolean;
};

export type NotificationSettings = {
  schedule: boolean; // 복용 스케줄 알림
  price: boolean; // 최저가·목표가 알림
  restock: boolean; // 재구매(잔여량) 알림
  push: boolean; // 휴대폰·PC 시스템 알림으로도 띄울지 (꺼도 앱 안 알림 목록에는 쌓임)
  night: boolean; // 밤 10시~아침 8시에도 가격·재구매 알림 받기 (복용 알림은 항상)
};

const SETTINGS_KEY = "notificationSettings";
const HISTORY_KEY = "notificationHistory";
const SENT_KEY = "notificationSentKeys";
const CHANGE_EVENT = "fitvita:notifications";
const MAX_HISTORY = 50;

export const DEFAULT_SETTINGS: NotificationSettings = {
  schedule: true,
  price: true,
  restock: true,
  push: true,
  night: false,
};

const TYPE_TO_SETTING: Record<NotificationType, keyof NotificationSettings | null> = {
  dose: "schedule",
  lowest: "price",
  target: "price",
  restock: "restock",
  test: null,
};

function read<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    return saved ? { ...fallback, ...JSON.parse(saved) } : fallback;
  } catch {
    return fallback;
  }
}

function readArray<T>(key: string): T[] {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 저장 공간이 없어도 알림 자체는 계속 동작합니다.
  }
}

// 화면(알림 목록, 설정)이 바뀐 내용을 다시 읽도록 알립니다.
export function emitChange() {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribe(listener: () => void) {
  window.addEventListener(CHANGE_EVENT, listener);
  return () => window.removeEventListener(CHANGE_EVENT, listener);
}

/* ---------- 설정 ---------- */

export function getSettings(): NotificationSettings {
  return read(SETTINGS_KEY, DEFAULT_SETTINGS);
}

export function updateSettings(changes: Partial<NotificationSettings>) {
  write(SETTINGS_KEY, { ...getSettings(), ...changes });
  emitChange();
}

/* ---------- 권한 ---------- */

export type PermissionState = NotificationPermission | "unsupported";

export function getPermission(): PermissionState {
  return "Notification" in window ? Notification.permission : "unsupported";
}

export async function requestPermission(): Promise<PermissionState> {
  if (!("Notification" in window)) return "unsupported";
  const result = await Notification.requestPermission();
  emitChange();
  return result;
}

/* ---------- 알림 목록 ---------- */

export function getHistory(): AppNotification[] {
  return readArray<AppNotification>(HISTORY_KEY);
}

export function markAllRead() {
  const history = getHistory();
  if (history.every((item) => item.read)) return;
  write(
    HISTORY_KEY,
    history.map((item) => ({ ...item, read: true }))
  );
  emitChange();
}

export function clearHistory() {
  write(HISTORY_KEY, []);
  emitChange();
}

/* ---------- 알림 보내기 ---------- */

// 기기 시간 기준 날짜 (toISOString은 UTC라 한국에서는 새벽에 날짜가 하루 밀립니다)
const todayKey = () => {
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${m}-${d}`;
};

// 같은 알림(dedupeKey)은 하루에 한 번만 보냅니다.
function alreadySent(dedupeKey: string) {
  const sent = read<Record<string, string[]>>(SENT_KEY, {});
  return sent[todayKey()]?.includes(dedupeKey) ?? false;
}

export function getSentKeysToday(): string[] {
  const sent = read<Record<string, string[]>>(SENT_KEY, {});
  return sent[todayKey()] ?? [];
}

function markSent(dedupeKey: string) {
  const sent = read<Record<string, string[]>>(SENT_KEY, {});
  // 오늘 기록만 남기고 지난 날짜는 정리
  write(SENT_KEY, { [todayKey()]: [...(sent[todayKey()] ?? []), dedupeKey] });
}

const isNight = (date: Date) => date.getHours() >= 22 || date.getHours() < 8;

async function showSystemNotification(title: string, body: string, tag: string) {
  if (getPermission() !== "granted") return;
  const options: NotificationOptions = {
    body,
    tag,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
  };
  try {
    // 서비스워커가 있으면(배포 모드) 그쪽으로 띄워야 모바일에서도 표시됩니다.
    const registration = await navigator.serviceWorker?.getRegistration();
    if (registration) {
      await registration.showNotification(title, options);
      return;
    }
    new Notification(title, options);
  } catch (error) {
    console.error("알림 표시 실패:", error);
  }
}

export type NotifyInput = {
  type: NotificationType;
  title: string;
  body: string;
  dedupeKey?: string; // 없으면 중복 검사 없이 항상 보냄
};

export async function notify({ type, title, body, dedupeKey }: NotifyInput) {
  const settings = getSettings();
  const settingKey = TYPE_TO_SETTING[type];
  if (settingKey && !settings[settingKey]) return false;
  if (dedupeKey && alreadySent(dedupeKey)) return false;

  const now = new Date();
  const quiet = !settings.night && isNight(now) && (type === "lowest" || type === "target" || type === "restock");
  // 조용한 시간에는 시스템 알림 없이 목록에만 쌓았다가, 다음 확인 때 다시 보내지 않도록 기록합니다.
  if (dedupeKey) markSent(dedupeKey);

  const item: AppNotification = {
    id: `${now.getTime()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    title,
    body,
    createdAt: now.toISOString(),
    read: false,
  };
  write(HISTORY_KEY, [item, ...getHistory()].slice(0, MAX_HISTORY));
  emitChange();

  if (settings.push && !quiet) {
    await showSystemNotification(title, body, dedupeKey ?? item.id);
  }
  return true;
}

// "3시간 전"처럼 보여주기
export function timeAgo(iso: string) {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "방금";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "어제" : `${days}일 전`;
}

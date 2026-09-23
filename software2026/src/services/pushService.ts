// 서버 푸시(FCM) 연결
// 앱이 완전히 꺼져 있어도 알림을 받으려면, 이 기기의 푸시 토큰과 영양제 스케줄을 Firestore에 저장해 두고
// GitHub Actions(scripts/send-push.ts)가 5분마다 확인해서 FCM으로 푸시를 보냅니다.

import type { Supplement } from "../components/Home";
import type { WishItem } from "../hooks/useWishlist";
import { VAPID_KEY, firebaseConfig, isFirebaseConfigured } from "../firebase/config";
import { emitChange, getSentKeysToday, getSettings } from "./notificationService";

const ENABLED_KEY = "serverPushEnabled";
const TOKEN_KEY = "serverPushToken";

export type PushStatus =
  | "not-configured" // firebaseConfig·VAPID 키가 아직 없음
  | "dev-mode" // npm run dev (서비스워커 없음) — 배포 주소나 preview에서만 가능
  | "unsupported" // 브라우저가 푸시를 지원하지 않음 (아이폰은 홈 화면에 추가해야 함)
  | "denied" // 알림 권한 차단
  | "off"
  | "on";

// Firebase SDK는 필요할 때만 불러와서 첫 화면 로딩을 가볍게 유지합니다.
async function loadFirebase() {
  const [{ initializeApp, getApps }, auth, firestore, messaging] = await Promise.all([
    import("firebase/app"),
    import("firebase/auth"),
    import("firebase/firestore"),
    import("firebase/messaging"),
  ]);
  const app = getApps()[0] ?? initializeApp(firebaseConfig);
  return { app, auth, firestore, messaging };
}

// 익명 로그인: 계정 없이도 이 기기 데이터를 본인만 읽고 쓸 수 있게 해줍니다.
async function getUserDoc() {
  const { app, auth, firestore } = await loadFirebase();
  const authInstance = auth.getAuth(app);
  const user = authInstance.currentUser ?? (await auth.signInAnonymously(authInstance)).user;
  const db = firestore.getFirestore(app);
  return { ref: firestore.doc(db, "users", user.uid), firestore };
}

const readFlag = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeFlag = (key: string, value: string | null) => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // 저장 실패해도 다음 실행 때 다시 설정하면 됩니다.
  }
};

export const isServerPushEnabled = () => readFlag(ENABLED_KEY) === "true";

export async function getPushStatus(): Promise<PushStatus> {
  if (!isFirebaseConfigured) return "not-configured";
  if (!("serviceWorker" in navigator) || !("Notification" in window)) return "unsupported";
  if (!import.meta.env.PROD) return "dev-mode";
  const { messaging } = await loadFirebase();
  if (!(await messaging.isSupported())) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  return isServerPushEnabled() ? "on" : "off";
}

export async function enableServerPush(): Promise<PushStatus> {
  const status = await getPushStatus();
  if (status !== "off" && status !== "on") return status;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "denied" : "off";

  const { app, messaging } = await loadFirebase();
  const registration = await navigator.serviceWorker.ready;
  const token = await messaging.getToken(messaging.getMessaging(app), {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: registration,
  });

  const { ref, firestore } = await getUserDoc();
  await firestore.setDoc(
    ref,
    { tokens: firestore.arrayUnion(token), updatedAt: firestore.serverTimestamp() },
    { merge: true }
  );

  writeFlag(TOKEN_KEY, token);
  writeFlag(ENABLED_KEY, "true");
  emitChange(); // useCloudSync가 곧바로 영양제·찜 정보를 올리도록
  return "on";
}

export async function disableServerPush(): Promise<PushStatus> {
  const token = readFlag(TOKEN_KEY);
  try {
    const { app, messaging } = await loadFirebase();
    await messaging.deleteToken(messaging.getMessaging(app));
    if (token) {
      const { ref, firestore } = await getUserDoc();
      await firestore.setDoc(ref, { tokens: firestore.arrayRemove(token) }, { merge: true });
    }
  } catch (error) {
    console.error("푸시 해제 중 오류:", error);
  }
  writeFlag(TOKEN_KEY, null);
  writeFlag(ENABLED_KEY, null);
  return "off";
}

// 서버가 알림 시점을 판단할 수 있도록 영양제·찜·설정을 올립니다.
export async function syncForServerPush(supplements: Supplement[], wishlist: WishItem[]) {
  if (!isFirebaseConfigured || !isServerPushEnabled()) return;
  const { ref, firestore } = await getUserDoc();
  const today = new Date();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");

  await firestore.setDoc(
    ref,
    {
      supplements: supplements.map(({ id, name, desc, time, checked, stock, dailyDose }) => ({
        id,
        name,
        desc,
        time,
        checked,
        stock: stock ?? null,
        dailyDose: dailyDose ?? 1,
      })),
      wishlist,
      settings: getSettings(),
      // 앱에서 이미 보낸 알림은 서버가 다시 보내지 않도록
      clientSent: { date: `${today.getFullYear()}-${m}-${d}`, keys: getSentKeysToday() },
      // 체크 표시는 이 날짜에만 유효 (다음 날 앱을 안 열어도 서버가 어제 체크로 착각하지 않게)
      syncedDate: `${today.getFullYear()}-${m}-${d}`,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      updatedAt: firestore.serverTimestamp(),
    },
    { merge: true }
  );
}

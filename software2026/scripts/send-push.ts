// 서버 푸시 발송 스크립트 (GitHub Actions에서 5분마다 실행)
// Firestore의 users 문서(앱이 동기화한 영양제·찜·설정)를 읽고, 알림 조건에 맞으면 FCM으로 푸시를 보냅니다.
// 알림 조건과 문구는 앱과 같은 src/services/alertRules.ts를 사용합니다.
//
// 실행: FIREBASE_SERVICE_ACCOUNT='{...서비스 계정 JSON...}' npm run push:send
//       DRY_RUN=1 을 붙이면 실제로 보내지 않고 보낼 내용만 출력합니다.

import { cert, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import {
  doseAlerts,
  priceAlerts,
  restockAlerts,
  type AlertMessage,
  type AlertSupplement,
} from "../src/services/alertRules";
import { DEFAULT_SETTINGS, type NotificationSettings } from "../src/services/notificationService";
import { getProductsByIds } from "../src/services/productService";
import type { WishItem } from "../src/hooks/useWishlist";

export type UserDoc = {
  tokens?: string[];
  supplements?: AlertSupplement[];
  wishlist?: WishItem[];
  settings?: Partial<NotificationSettings>;
  timeZone?: string;
  syncedDate?: string;
  clientSent?: { date: string; keys: string[] };
  pushSent?: { date: string; keys: string[] };
};

const DRY_RUN = process.env.DRY_RUN === "1";
const INVALID_TOKEN_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
]);

// 사용자 시간대 기준 오늘 날짜와 현재 시각(분)
function localNow(timeZone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date())
      .map((part) => [part.type, part.value])
  );
  const hour = Number(parts.hour);
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour,
    minutes: hour * 60 + Number(parts.minute),
  };
}

export async function alertsFor(user: UserDoc) {
  const settings = { ...DEFAULT_SETTINGS, ...user.settings };
  if (!settings.push) return { alerts: [], date: "" };

  const now = localNow(user.timeZone ?? "Asia/Seoul");
  const isNight = now.hour >= 22 || now.hour < 8;
  // 체크 표시는 동기화한 날짜에만 유효 (다음 날 앱을 안 열었으면 모두 미복용으로 봄)
  const supplements = (user.supplements ?? []).map((item) => ({
    ...item,
    checked: user.syncedDate === now.date && item.checked,
  }));

  const alerts: AlertMessage[] = [];
  if (settings.schedule) alerts.push(...doseAlerts(supplements, now.minutes));
  // 조용한 시간에는 가격·재구매 알림을 보내지 않고 아침에 보냅니다.
  if (!isNight || settings.night) {
    if (settings.restock) alerts.push(...restockAlerts(supplements));
    if (settings.price && user.wishlist?.length) {
      const products = await getProductsByIds(user.wishlist.map((item) => item.productId));
      alerts.push(...priceAlerts(user.wishlist, products));
    }
  }

  // 앱이나 이전 실행에서 오늘 이미 보낸 알림은 제외
  const sent = new Set([
    ...(user.pushSent?.date === now.date ? user.pushSent.keys : []),
    ...(user.clientSent?.date === now.date ? user.clientSent.keys : []),
  ]);
  return { alerts: alerts.filter((alert) => !sent.has(alert.dedupeKey)), date: now.date };
}

async function main() {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT 환경 변수(서비스 계정 JSON)가 없습니다.");
  }
  initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
  const db = getFirestore();
  const messaging = getMessaging();

  const snapshot = await db.collection("users").get();
  let sentCount = 0;

  for (const doc of snapshot.docs) {
    const user = doc.data() as UserDoc;
    const tokens = user.tokens ?? [];
    if (tokens.length === 0) continue;

    const { alerts, date } = await alertsFor(user);
    if (alerts.length === 0) continue;

    const invalidTokens = new Set<string>();
    for (const alert of alerts) {
      console.log(`[${doc.id}] ${alert.title}: ${alert.body}`);
      if (DRY_RUN) continue;

      const result = await messaging.sendEachForMulticast({
        tokens,
        webpush: {
          headers: { Urgency: "high", TTL: "3600" },
          // data 메시지로 보내고, 앱의 sw.js가 받아서 알림으로 표시합니다.
          data: { title: alert.title, body: alert.body, tag: alert.dedupeKey, type: alert.type },
        },
      });
      sentCount += result.successCount;
      result.responses.forEach((response, index) => {
        if (response.error && INVALID_TOKEN_CODES.has(response.error.code)) {
          invalidTokens.add(tokens[index]);
        }
      });
    }

    if (DRY_RUN) continue;
    const previous = user.pushSent?.date === date ? user.pushSent.keys : [];
    await doc.ref.set(
      {
        pushSent: { date, keys: [...previous, ...alerts.map((alert) => alert.dedupeKey)] },
        // 앱을 지웠거나 알림을 끈 기기의 토큰은 정리
        ...(invalidTokens.size > 0 && { tokens: FieldValue.arrayRemove(...invalidTokens) }),
      },
      { merge: true }
    );
  }

  console.log(`확인한 사용자 ${snapshot.size}명, 보낸 푸시 ${sentCount}건${DRY_RUN ? " (DRY_RUN)" : ""}`);
}

// 직접 실행했을 때만 발송 (테스트에서 alertsFor만 불러 쓸 수 있게)
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("send-push.ts")) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

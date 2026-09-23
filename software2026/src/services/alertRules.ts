// 알림 조건과 문구 (앱과 서버가 함께 사용)
// 브라우저 기능을 쓰지 않는 순수 함수라 GitHub Actions의 scripts/send-push.ts에서도 그대로 불러 씁니다.
// dedupeKey는 앱·서버 공통이라, 같은 알림이 두 번 가지 않고 휴대폰에서도 하나로 합쳐집니다.

import type { WishItem } from "../hooks/useWishlist";
import type { NotificationType } from "./notificationService";
import { formatPrice, getPriceStats, type Product } from "./productService";
import { josa } from "../utils/josa";

export type AlertMessage = {
  type: NotificationType;
  title: string;
  body: string;
  dedupeKey: string;
};

// 알림 판단에 필요한 영양제 정보 (앱 Supplement와 Firestore 저장 형태 모두 맞음)
export type AlertSupplement = {
  id: number;
  name: string;
  desc: string;
  time: string;
  checked: boolean;
  stock?: number | null;
  dailyDose?: number;
};

export const RESTOCK_DAYS = 7; // 이 날짜 이하로 남으면 재구매 알림
export const DOSE_WINDOW_MINUTES = 60; // 복용 시간이 지나고 이 시간 안에만 알림 (늦게 열었을 때 옛날 알림 방지)

const toMinutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

// 복용 시간 알림: 체크하지 않은 영양제의 복용 시간이 되면
export function doseAlerts(supplements: AlertSupplement[], nowMinutes: number): AlertMessage[] {
  return supplements
    .filter((item) => {
      if (item.checked) return false;
      const diff = nowMinutes - toMinutes(item.time);
      return diff >= 0 && diff <= DOSE_WINDOW_MINUTES;
    })
    .map((item) => ({
      type: "dose",
      title: "복용 시간 알림",
      body: `${item.name} 복용 시간이에요 (${item.time}) · ${item.desc}`,
      dedupeKey: `dose-${item.id}-${item.time}`,
    }));
}

export function daysLeftOf(item: AlertSupplement) {
  if (item.stock === undefined || item.stock === null) return null;
  const perDay = item.dailyDose && item.dailyDose > 0 ? item.dailyDose : 1;
  return Math.floor(item.stock / perDay);
}

// 재구매 알림: 남은 양이 7일분 이하
export function restockAlerts(supplements: AlertSupplement[]): AlertMessage[] {
  return supplements.flatMap((item) => {
    const days = daysLeftOf(item);
    if (days === null || days > RESTOCK_DAYS) return [];
    return [
      {
        type: "restock" as const,
        title: "재구매 알림",
        body:
          days <= 0
            ? `${josa(item.name, "이/가")} 다 떨어졌어요. 재구매가 필요해요.`
            : `${josa(item.name, "이/가")} 약 ${days}일분 남았어요. 지금 주문하면 끊기지 않고 드실 수 있어요.`,
        dedupeKey: `restock-${item.id}`,
      },
    ];
  });
}

// 최저가·목표가 알림: 찜 목록 상품 가격 확인
export function priceAlerts(wishlist: WishItem[], products: Product[]): AlertMessage[] {
  return wishlist.flatMap((wish) => {
    const product = products.find((p) => p.productId === wish.productId);
    if (!product) return [];
    const stats = getPriceStats(product);
    const alerts: AlertMessage[] = [];

    if (wish.targetPrice !== null && stats.current <= wish.targetPrice) {
      alerts.push({
        type: "target",
        title: "목표가 도달",
        body: `${product.title} ${formatPrice(stats.current)} (목표 ${formatPrice(wish.targetPrice)} 이하)`,
        dedupeKey: `target-${product.productId}-${stats.current}`,
      });
    }
    if (wish.lowestPriceAlarm && stats.isLowest) {
      alerts.push({
        type: "lowest",
        title: "최저가 알림",
        body: `${josa(product.title, "이/가")} 90일 최저가 ${formatPrice(stats.current)}예요`,
        dedupeKey: `lowest-${product.productId}-${stats.current}`,
      });
    }
    return alerts;
  });
}

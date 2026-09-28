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
  once?: boolean; // 날짜가 바뀌어도 한 번만 (재구매·설문은 한 통당 한 번)
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
  stockUpdatedAt?: string | null; // 잔여량을 새로 채운 시각 (한 통 = 한 주기, 알림을 주기마다 한 번씩 보내는 기준)
};

export const RESTOCK_DAYS = 7; // 이 날짜 이하로 남으면 재구매 알림 (1차)
export const RESTOCK_URGENT_DAYS = 3; // 이 날짜 이하로 남으면 한 번 더 (2차)
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

const cycleOf = (item: AlertSupplement) => item.stockUpdatedAt ?? "0";

// 재구매 알림: 7일 안에 떨어질 때 한 번, 3일 안에 떨어질 때 한 번 더 (한 통당 각각 한 번)
export function restockAlerts(supplements: AlertSupplement[]): AlertMessage[] {
  return supplements.flatMap((item): AlertMessage[] => {
    const days = daysLeftOf(item);
    if (days === null || days <= 0 || days > RESTOCK_DAYS) return [];
    const name = josa(item.name, "이/가");
    if (days <= RESTOCK_URGENT_DAYS) {
      return [
        {
          type: "restock",
          title: "재구매 알림 (3일 전)",
          body: `${name} ${days}일분밖에 안 남았어요! 지금 주문하지 않으면 복용이 끊길 수 있어요.`,
          dedupeKey: `restock3-${item.id}-${cycleOf(item)}`,
          once: true,
        },
      ];
    }
    return [
      {
        type: "restock",
        title: "재구매 알림",
        body: `${name} 약 ${days}일 뒤에 떨어져요. 미리 주문해 두세요.`,
        dedupeKey: `restock7-${item.id}-${cycleOf(item)}`,
        once: true,
      },
    ];
  });
}

// 설문 알림: 한 통을 다 비우면 (잔여량 0) 효과·변화를 묻는 설문 요청 (한 통당 한 번)
export function surveyAlerts(supplements: AlertSupplement[]): AlertMessage[] {
  return supplements
    .filter((item) => item.stock === 0)
    .map((item) => ({
      type: "survey",
      title: "한 통 다 드셨어요!",
      body: `${josa(item.name, "은/는")} 어떠셨나요? 간단한 설문에 답하면 다음 영양제를 맞춤 추천해 드려요.`,
      dedupeKey: `survey-${item.id}-${cycleOf(item)}`,
      once: true,
    }));
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

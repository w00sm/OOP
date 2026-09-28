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

const daysFor = (stock: number, item: AlertSupplement) =>
  Math.floor(stock / (item.dailyDose && item.dailyDose > 0 ? item.dailyDose : 1));

// 복용 체크로 잔여량이 줄었을 때 보내는 알림 (체크하는 순간 기준을 넘으면 한 번)
// - 7일분 이하가 되면: 재구매 알림
// - 3일분 이하가 되면: 한 번 더 (3일 전)
// - 0이 되면: 한 통 다 먹었어요 → 설문 요청
// 같은 통(잔여량을 새로 채우기 전까지)에서는 각각 한 번만 보냅니다.
export function stockAlertsOnCheck(item: AlertSupplement, previousStock: number): AlertMessage[] {
  if (item.stock === undefined || item.stock === null || item.stock >= previousStock) return [];
  const before = daysFor(previousStock, item);
  const after = daysFor(item.stock, item);
  const name = josa(item.name, "이/가");

  if (item.stock === 0) {
    return [
      {
        type: "survey",
        title: "한 통 다 드셨어요!",
        body: `${josa(item.name, "을/를")} 다 드셔서 복용 내역에 기록했어요. 마이페이지 → 복용 내역에서 설문하고 재구매가 필요한지 확인해 보세요.`,
        dedupeKey: `survey-${item.id}-${cycleOf(item)}`,
        once: true,
      },
    ];
  }
  if (after <= RESTOCK_URGENT_DAYS && before > RESTOCK_URGENT_DAYS) {
    return [
      {
        type: "restock",
        title: "재구매 알림 (3일 전)",
        body: `${name} ${after}일분밖에 안 남았어요! 지금 주문하지 않으면 복용이 끊길 수 있어요.`,
        dedupeKey: `restock3-${item.id}-${cycleOf(item)}`,
        once: true,
      },
    ];
  }
  if (after <= RESTOCK_DAYS && before > RESTOCK_DAYS) {
    return [
      {
        type: "restock",
        title: "재구매 알림",
        body: `${name} 약 ${after}일 뒤에 떨어져요. 미리 주문해 두세요.`,
        dedupeKey: `restock7-${item.id}-${cycleOf(item)}`,
        once: true,
      },
    ];
  }
  return [];
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

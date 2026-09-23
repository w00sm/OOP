// 알림 조건 검사
// 앱이 열려 있는 동안 1분마다 실행되어, 조건에 맞는 알림을 notify()로 보냅니다.
// (같은 알림은 notificationService가 하루 한 번만 보내도록 걸러줍니다)

import type { Supplement } from "../components/Home";
import type { WishItem } from "../hooks/useWishlist";
import { notify } from "./notificationService";
import { formatPrice, getPriceStats, getProductsByIds } from "./productService";
import { daysLeft } from "./scheduleService";
import { josa } from "../utils/josa";

const RESTOCK_DAYS = 7; // 이 날짜 이하로 남으면 재구매 알림
const DOSE_WINDOW_MINUTES = 60; // 복용 시간이 지나고 이 시간 안에만 알림 (앱을 늦게 열었을 때 옛날 알림 방지)

const toMinutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

// 복용 시간 알림: 체크하지 않은 영양제의 복용 시간이 되면
export async function checkDoseReminders(supplements: Supplement[], now = new Date()) {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  for (const item of supplements) {
    if (item.checked) continue;
    const diff = nowMinutes - toMinutes(item.time);
    if (diff < 0 || diff > DOSE_WINDOW_MINUTES) continue;
    await notify({
      type: "dose",
      title: "복용 시간 알림",
      body: `${item.name} 복용 시간이에요 (${item.time}) · ${item.desc}`,
      dedupeKey: `dose-${item.id}-${item.time}`,
    });
  }
}

// 재구매 알림: 남은 양이 7일분 이하
export async function checkRestock(supplements: Supplement[]) {
  for (const item of supplements) {
    const days = daysLeft(item);
    if (days === null || days > RESTOCK_DAYS) continue;
    await notify({
      type: "restock",
      title: "재구매 알림",
      body:
        days <= 0
          ? `${josa(item.name, "이/가")} 다 떨어졌어요. 재구매가 필요해요.`
          : `${josa(item.name, "이/가")} 약 ${days}일분 남았어요. 지금 주문하면 끊기지 않고 드실 수 있어요.`,
      dedupeKey: `restock-${item.id}`,
    });
  }
}

// 최저가·목표가 알림: 찜 목록 상품 가격 확인
export async function checkPriceAlerts(wishlist: WishItem[]) {
  const products = await getProductsByIds(wishlist.map((item) => item.productId));
  for (const wish of wishlist) {
    const product = products.find((p) => p.productId === wish.productId);
    if (!product) continue;
    const stats = getPriceStats(product);

    if (wish.targetPrice !== null && stats.current <= wish.targetPrice) {
      await notify({
        type: "target",
        title: "목표가 도달",
        body: `${product.title} ${formatPrice(stats.current)} (목표 ${formatPrice(wish.targetPrice)} 이하)`,
        dedupeKey: `target-${product.productId}-${stats.current}`,
      });
    }

    if (wish.lowestPriceAlarm && stats.isLowest) {
      await notify({
        type: "lowest",
        title: "최저가 알림",
        body: `${josa(product.title, "이/가")} 90일 최저가 ${formatPrice(stats.current)}예요`,
        dedupeKey: `lowest-${product.productId}-${stats.current}`,
      });
    }
  }
}

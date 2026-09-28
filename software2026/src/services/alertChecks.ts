// 앱 안에서의 알림 검사
// 앱이 열려 있는 동안 1분마다 실행되어, alertRules의 조건에 맞는 알림을 notify()로 보냅니다.
// (같은 알림은 notificationService가 하루 한 번만 보내도록 걸러줍니다)

import type { Supplement } from "../components/Home";
import type { WishItem } from "../hooks/useWishlist";
import {
  doseAlerts,
  priceAlerts,
  stockAlertKeysToForget,
  stockAlertsOnCheck,
  type AlertMessage,
} from "./alertRules";
import { forgetSentOnce, notify } from "./notificationService";
import { getProductsByIds } from "./productService";

async function send(alerts: AlertMessage[]) {
  for (const alert of alerts) await notify(alert);
}

export async function checkDoseReminders(supplements: Supplement[], now = new Date()) {
  await send(doseAlerts(supplements, now.getHours() * 60 + now.getMinutes()));
}

// 체크를 풀어 잔여량이 돌아왔을 때: 그 기준의 알림 기록을 지워 다시 체크하면 또 알림
export function forgetStockAlerts(item: Supplement) {
  forgetSentOnce(stockAlertKeysToForget(item));
}

// 복용 체크로 잔여량이 줄었을 때 (재구매 7일·3일 전, 다 먹으면 설문)
export async function notifyStockChange(item: Supplement, previousStock: number) {
  await send(stockAlertsOnCheck(item, previousStock));
}

export async function checkPriceAlerts(wishlist: WishItem[]) {
  const products = await getProductsByIds(wishlist.map((item) => item.productId));
  await send(priceAlerts(wishlist, products));
}

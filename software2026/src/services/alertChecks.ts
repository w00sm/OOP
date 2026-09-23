// 앱 안에서의 알림 검사
// 앱이 열려 있는 동안 1분마다 실행되어, alertRules의 조건에 맞는 알림을 notify()로 보냅니다.
// (같은 알림은 notificationService가 하루 한 번만 보내도록 걸러줍니다)

import type { Supplement } from "../components/Home";
import type { WishItem } from "../hooks/useWishlist";
import { doseAlerts, priceAlerts, restockAlerts, type AlertMessage } from "./alertRules";
import { notify } from "./notificationService";
import { getProductsByIds } from "./productService";

async function send(alerts: AlertMessage[]) {
  for (const alert of alerts) await notify(alert);
}

export async function checkDoseReminders(supplements: Supplement[], now = new Date()) {
  await send(doseAlerts(supplements, now.getHours() * 60 + now.getMinutes()));
}

export async function checkRestock(supplements: Supplement[]) {
  await send(restockAlerts(supplements));
}

export async function checkPriceAlerts(wishlist: WishItem[]) {
  const products = await getProductsByIds(wishlist.map((item) => item.productId));
  await send(priceAlerts(wishlist, products));
}

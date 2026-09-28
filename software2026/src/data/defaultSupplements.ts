// 처음 실행할 때 보여주는 예시 영양제
// 잔여량은 알림을 시연할 수 있게 넣었습니다.
// - 종합비타민: 넉넉함 (알림 없음)
// - 비타민B: 8정 → 체크하면 7일분 → '7일 전' 알림
// - 오메가3: 4캡슐 → 체크하면 3일분 → '3일 전' 알림
// - 마그네슘: 잔여량 없음 (직접 입력)

import type { Supplement } from "../components/Home";

const DEMO_STOCK: Record<number, number> = { 1: 60, 2: 8, 3: 4 };
const DEMO_NAMES: Record<number, string> = { 1: "종합비타민", 2: "비타민B", 3: "오메가3" };

const BASE_SUPPLEMENTS: Supplement[] = [
  { id: 1, name: "종합비타민", desc: "1정 · 식후", time: "08:00", timeCategory: "아침", checked: true },
  { id: 2, name: "비타민B", desc: "1정 · 식후", time: "09:00", timeCategory: "아침", checked: false },
  { id: 3, name: "오메가3", desc: "1캡슐 · 식후", time: "13:00", timeCategory: "점심", checked: false },
  { id: 4, name: "마그네슘", desc: "1정 · 취침 전", time: "22:00", timeCategory: "저녁", checked: false },
];

export const DEFAULT_SUPPLEMENTS: Supplement[] = BASE_SUPPLEMENTS.map((item) => withDemoStock(item));

function withDemoStock(item: Supplement): Supplement {
  const stock = DEMO_STOCK[item.id];
  if (stock === undefined || DEMO_NAMES[item.id] !== item.name || item.stock !== undefined) {
    return item;
  }
  return { ...item, stock, dailyDose: 1, stockUpdatedAt: new Date().toISOString() };
}

// 이미 앱을 쓰던 기기에도 예시 영양제 잔여량을 한 번만 채워 줍니다. (직접 입력한 잔여량은 그대로)
const SEED_FLAG = "demoStockSeeded_v1";

// 초기값 함수는 개발 모드에서 두 번 실행될 수 있어 여기서는 읽기만 하고,
// '적용 완료' 표시는 화면이 뜬 뒤 markDemoStockSeeded()로 저장합니다.
export function seedDemoStockOnce(list: Supplement[]): Supplement[] {
  try {
    if (localStorage.getItem(SEED_FLAG)) return list;
  } catch {
    return list;
  }
  return list.map(withDemoStock);
}

export function markDemoStockSeeded() {
  try {
    localStorage.setItem(SEED_FLAG, "true");
  } catch {
    // 저장하지 못하면 다음 실행 때 다시 확인합니다. (이미 채운 잔여량은 덮어쓰지 않음)
  }
}

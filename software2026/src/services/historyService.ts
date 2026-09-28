// 복용 내역
// 잔여량이 0이 되어 복용 관리에서 빠진 영양제를 기록합니다. (마이페이지 → 복용 내역)
// 내역을 누르면 설문으로 재구매가 필요한지 판단하고, 결과를 내역에 함께 보여줍니다.

import type { Supplement, TimeCategory } from "../components/Home";
import { mainIngredientOf } from "./surveyService";
import { parseDose } from "./scheduleService";

export type HistoryEntry = {
  id: string; // 설문 결과와 연결하는 키
  supplementId: number;
  name: string; // 제품명 (사용자가 등록한 이름)
  ingredient: string | null; // 주성분 (예: 비타민D)
  desc: string; // 복용 방법 (예: 1정 · 식후)
  time: string;
  timeCategory: TimeCategory;
  unit: string; // 정·캡슐·포
  totalTaken: number | null; // 한 통에서 먹은 총량 (처음 잔여량을 알 때)
  startedAt: string | null; // 이 통을 채운 날
  finishedAt: string; // 다 먹은 날
};

const STORAGE_KEY = "intakeHistory";
const CHANGE_EVENT = "fitvita:history";

export function getHistoryEntries(): HistoryEntry[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveEntries(entries: HistoryEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, 200)));
  } catch {
    // 저장 공간이 없으면 기록을 건너뜁니다.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeHistory(listener: () => void) {
  window.addEventListener(CHANGE_EVENT, listener);
  return () => window.removeEventListener(CHANGE_EVENT, listener);
}

// 다 먹은 영양제를 내역에 기록 (같은 통은 한 번만)
export function recordFinished(item: Supplement): HistoryEntry {
  const id = `${item.id}-${item.stockUpdatedAt ?? "0"}`;
  const existing = getHistoryEntries().find((entry) => entry.id === id);
  if (existing) return existing;

  const entry: HistoryEntry = {
    id,
    supplementId: item.id,
    name: item.name,
    ingredient: mainIngredientOf(item.name),
    desc: item.desc,
    time: item.time,
    timeCategory: item.timeCategory,
    unit: parseDose(item.desc)?.unit ?? "개",
    totalTaken: item.stockInitial ?? null,
    startedAt: item.stockUpdatedAt ?? null,
    finishedAt: new Date().toISOString(),
  };
  saveEntries([entry, ...getHistoryEntries()]);
  return entry;
}

// 되돌리기 (실수로 체크했을 때)
export function removeHistoryEntry(id: string) {
  saveEntries(getHistoryEntries().filter((entry) => entry.id !== id));
}

// 복용 내역의 영양제를 다시 복용 관리에 추가 (잔여량은 새 통을 산 뒤 입력)
export function supplementFromHistory(entry: HistoryEntry): Supplement {
  return {
    id: Date.now(),
    name: entry.name,
    desc: entry.desc,
    time: entry.time,
    timeCategory: entry.timeCategory,
    checked: false,
    dailyDose: parseDose(entry.desc)?.amount ?? 1,
  };
}

export const formatDate = (iso: string | null) => {
  if (!iso) return "";
  const date = new Date(iso);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(
    date.getDate()
  ).padStart(2, "0")}`;
};

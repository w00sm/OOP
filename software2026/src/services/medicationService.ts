// 복용 중인 약
// 공공데이터(e약은요 등)에서 찾은 약을 등록하고, 설명서에 언급된 영양제 성분과 겹치는
// 영양제를 경고하거나 다른 시간으로 옮깁니다. (안내용이며, 정확한 복용법은 의사·약사 상담)

import type { Supplement, TimeCategory } from "../components/Home";
import { DEFAULT_GAP_HOURS, type DrugHit } from "./drugWarnings";

export type MedTiming = "공복" | "식전" | "식후" | "필요시";

export type Medication = {
  id: number;
  itemSeq?: string; // 공공데이터 품목기준코드 (직접 입력한 약은 없음)
  name: string;
  company?: string;
  kind: "otc" | "rx" | "custom"; // 일반약 / 처방약 / 직접 입력
  efficacy?: string; // 효능 요약
  slots: TimeCategory[]; // 먹는 시간대 (필요시 약은 비어 있음)
  timing: MedTiming;
  dose: string; // 1회 복용량 (예: 1정)
  until?: string; // 복용 마지막 날 (YYYY-MM-DD, 없으면 계속)
  hits: DrugHit[]; // 설명서에 언급된 영양제 성분
  checkedOn?: { date: string; slots: TimeCategory[] }; // 오늘 먹었다고 체크한 시간대 (날짜가 바뀌면 자동으로 미복용)
  takenOn?: { date: string; times: string[] }; // 필요시 약: 오늘 먹은 시각 (예: ["14:20"])
};

export const MED_TIMINGS: MedTiming[] = ["공복", "식전", "식후", "필요시"];
export const MED_KIND_LABELS: Record<Medication["kind"], string> = {
  rx: "처방약",
  otc: "일반약",
  custom: "직접 입력",
};

const TIME_ORDER: TimeCategory[] = ["아침", "점심", "저녁"];

export const todayKey = (date = new Date()) => {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
};

export const toMinutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

export const fromMinutes = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

// 설명서 이름에서 끝의 괄호 속 성분명을 뺀 짧은 이름 (예: "타이레놀정500밀리그램(아세트아미노펜)" → "타이레놀정500밀리그램")
export const shortMedName = (name: string) => name.replace(/\s*\([^)]*\)\s*$/, "").trim() || name;

// 시간대·복용 방법별 복용 시간 (공복·식전은 식사 전, 식후는 식사 후)
export function defaultMedTime(timeCategory: TimeCategory, timing: MedTiming) {
  const before = timing === "공복" || timing === "식전";
  if (timeCategory === "아침") return before ? "07:00" : "08:30";
  if (timeCategory === "점심") return before ? "12:00" : "13:30";
  return before ? "18:00" : "19:30";
}

export const medTime = (med: Medication, slot: TimeCategory) => defaultMedTime(slot, med.timing);

// 복용 기간이 남은 약 (until이 지났으면 목록에만 '복용 끝'으로 보이고 경고·일정에서는 빠짐)
export const isActiveMed = (med: Medication, today = todayKey()) => !med.until || med.until >= today;

export const isMedChecked = (med: Medication, slot: TimeCategory, today = todayKey()) =>
  med.checkedOn?.date === today && med.checkedOn.slots.includes(slot);

export function toggleMedCheck(med: Medication, slot: TimeCategory, today = todayKey()): Medication {
  const slots = med.checkedOn?.date === today ? med.checkedOn.slots : [];
  return {
    ...med,
    checkedOn: {
      date: today,
      slots: slots.includes(slot) ? slots.filter((item) => item !== slot) : [...slots, slot],
    },
  };
}

// 필요시 약: 오늘 먹은 시각 (없으면 빈 목록)
export const takenTimes = (med: Medication, today = todayKey()) =>
  med.takenOn?.date === today ? med.takenOn.times : [];

// 필요시 약 체크: 안 먹었으면 지금 시각을 기록, 먹었으면 오늘 기록을 지움
export function toggleMedTaken(med: Medication, now = new Date()): Medication {
  const today = todayKey(now);
  if (takenTimes(med, today).length > 0) return { ...med, takenOn: undefined };
  return { ...med, takenOn: { date: today, times: [fromMinutes(now.getHours() * 60 + now.getMinutes())] } };
}

// 필요시 약 중 복용 기간이 남은 것
export const asNeededMeds = (medications: Medication[], today = todayKey()) =>
  medications.filter((med) => med.timing === "필요시" && isActiveMed(med, today));

// 일정에 표시할 약 복용 (약 × 시간대)
export type MedDose = { med: Medication; slot: TimeCategory; time: string };

export function medDoses(medications: Medication[], today = todayKey()): MedDose[] {
  return medications
    .filter((med) => med.timing !== "필요시" && isActiveMed(med, today))
    .flatMap((med) =>
      TIME_ORDER.filter((slot) => med.slots.includes(slot)).map((slot) => ({
        med,
        slot,
        time: medTime(med, slot),
      }))
    );
}

// 설명서에 적힌 간격 (너무 길거나 없으면 기본 2시간)
export const gapOf = (hit: DrugHit) => (hit.g && hit.g >= 1 && hit.g <= 6 ? hit.g : DEFAULT_GAP_HOURS);

// taken: 필요시 약을 오늘 실제로 먹은 시각 기준인지 (정해진 복용 시간이 아니라)
export type MedConflict = { med: Medication; hit: DrugHit; gap: number; time: string; taken: boolean };

// 이 시간에 이 성분을 먹으면 간격이 부족한 약
// includeTaken: 필요시 약을 오늘 먹은 시각도 따짐 (홈 카드 경고용. 시간 배정에는 쓰지 않음)
export function medConflictsAt(
  ingredients: string[],
  time: string,
  medications: Medication[],
  includeTaken = false
): MedConflict[] {
  const at = toMinutes(time);
  const doses = [
    ...medDoses(medications).map(({ med, time: doseTime }) => ({ med, time: doseTime, taken: false })),
    ...(includeTaken
      ? asNeededMeds(medications).flatMap((med) =>
          takenTimes(med).map((takenTime) => ({ med, time: takenTime, taken: true }))
        )
      : []),
  ];
  return doses.flatMap(({ med, time: doseTime, taken }) =>
    med.hits
      .filter((hit) => ingredients.includes(hit.i))
      .filter((hit) => Math.abs(toMinutes(doseTime) - at) < gapOf(hit) * 60)
      .map((hit) => ({ med, hit, gap: gapOf(hit), time: doseTime, taken }))
  );
}

// 필요시 약을 먹은 시각 + 간격 → 영양제를 먹어도 되는 시각 (자정을 넘기면 23:59)
export const safeAfter = (time: string, gap: number) =>
  fromMinutes(Math.min(toMinutes(time) + gap * 60, 23 * 60 + 59));

// 성분 이름으로 겹치는 약 찾기 (추천탭: "비타민 D 1000IU"처럼 적힌 추천 성분과 겹치는 약 안내)
export function medsMentioning(ingredient: string, medications: Medication[]) {
  const clean = (text: string) => text.toLowerCase().replace(/\s+/g, "");
  const target = clean(ingredient);
  return medications
    .filter((med) => isActiveMed(med))
    .map((med) => ({ med, hit: med.hits.find((hit) => target.includes(clean(hit.i))) }))
    .filter((item): item is { med: Medication; hit: DrugHit } => Boolean(item.hit));
}

// "아침·저녁 식후", "필요할 때"
export function describeWhen(med: Pick<Medication, "slots" | "timing">) {
  if (med.timing === "필요시" || med.slots.length === 0) return "필요할 때";
  return `${TIME_ORDER.filter((slot) => med.slots.includes(slot)).join("·")} ${med.timing}`;
}

// 경고 문구에 쓸 성분·간격 요약: { names: "칼슘·철분", gap: 4 }
export function hitSummary(hits: DrugHit[]) {
  return {
    names: hits.map((hit) => hit.i).join("·"),
    gap: hits.length > 0 ? Math.max(...hits.map(gapOf)) : DEFAULT_GAP_HOURS,
  };
}

// 같은 문장에서 찾은 성분끼리 묶기 (근거 문장이 반복되지 않게): [{ names: "칼슘·마그네슘", gap: 4, text: "…" }]
export function groupHits(hits: DrugHit[]) {
  const groups: { names: string[]; gap: number; text: string }[] = [];
  for (const hit of hits) {
    const same = groups.find((group) => group.text === hit.t);
    if (same) {
      same.names.push(hit.i);
      same.gap = Math.max(same.gap, gapOf(hit));
    } else {
      groups.push({ names: [hit.i], gap: gapOf(hit), text: hit.t });
    }
  }
  return groups.map((group) => ({ ...group, names: group.names.join("·") }));
}

// AI 상담에 알려줄 "복용 중인 약" 요약
export function describeMedications(medications: Medication[]) {
  return medications
    .filter((med) => isActiveMed(med))
    .map((med) => {
      const warn =
        med.hits.length > 0 ? ` / 설명서 주의 성분: ${med.hits.map((hit) => hit.i).join("·")}` : "";
      return `${shortMedName(med.name)}(${MED_KIND_LABELS[med.kind]}, ${describeWhen(med)}${
        med.efficacy ? `, ${med.efficacy}` : ""
      }${warn})`;
    })
    .join("; ");
}

/* ---------- 저장 ---------- */

const STORAGE_KEY = "medications";

export function loadMedications(): Medication[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const list = saved ? JSON.parse(saved) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveMedications(medications: Medication[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(medications));
  } catch {
    // 저장 공간이 없어도 화면은 계속 동작합니다.
  }
}

// 효능 문장을 칩에 맞게 줄이기: "이 약은 두통, 치통, 생리통의 진통에 사용합니다." → "두통, 치통, 생리통의 진통"
export function efficacyLabel(text?: string) {
  if (!text) return "";
  const core = text
    .replace(/^이\s*약은\s*/, "")
    .split(/에\s*(사용|복용|쓰)|\./)[0]
    .trim();
  if (core.length <= 18) return core;
  // 길면 쉼표 단위로 앞쪽만: "두통, 치통, 생리통 등"
  const parts = core.split(/,\s*/);
  let label = parts[0];
  for (const part of parts.slice(1)) {
    if (`${label}, ${part}`.length > 14) break;
    label = `${label}, ${part}`;
  }
  return label.length > 18 ? `${label.slice(0, 17)}…` : `${label} 등`;
}

// "2026-10-27" → "10.27"
export const shortDate = (date: string) => date.slice(5).replace("-", ".");

// 알림·서버 동기화용: 약 복용을 영양제와 같은 모양으로 (복용 시간 알림에 함께 사용)
export function medsAsDoseItems(medications: Medication[], today = todayKey()): Supplement[] {
  return medDoses(medications, today).map(({ med, slot, time }) => ({
    id: med.id + TIME_ORDER.indexOf(slot) + 1,
    name: shortMedName(med.name),
    desc: `${med.dose} · ${med.timing}`,
    time,
    timeCategory: slot,
    checked: isMedChecked(med, slot, today),
  }));
}

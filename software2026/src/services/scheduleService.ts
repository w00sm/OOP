// 복약 스케줄 자동 설정
// 영양제 이름에서 성분을 알아내고, 이미 등록된 영양제와의 상호작용을 따져
// 함께 먹으면 좋은 것은 같은 시간대로, 떨어뜨려야 하는 것은 다른 시간대로 배정합니다.

import type { Supplement, TimeCategory } from "../components/Home";
import { josa } from "../utils/josa";
import { daysLeftOf } from "./alertRules";
import {
  fromMinutes,
  medConflictsAt,
  shortMedName,
  toMinutes,
  type Medication,
} from "./medicationService";
import {
  DEFAULT_TIMES,
  INGREDIENT_RULES,
  INTERACTION_RULES,
  type InteractionRule,
} from "../data/interactions";

const TIME_ORDER: TimeCategory[] = ["아침", "점심", "저녁"];

const clean = (text: string) => text.toLowerCase().replace(/\s+/g, "");

// 이름에 들어 있는 성분 (종합비타민처럼 여러 성분이 든 제품은 포함 성분까지)
export function detectIngredients(name: string): string[] {
  const text = clean(name);
  const found = new Set<string>();
  for (const rule of INGREDIENT_RULES) {
    if (rule.keywords.some((keyword) => text.includes(keyword))) {
      found.add(rule.name);
      rule.contains?.forEach((item) => found.add(item));
    }
  }
  return [...found];
}

function interactionsBetween(a: string[], b: string[]) {
  return INTERACTION_RULES.filter(
    (rule) =>
      (a.includes(rule.a) && b.includes(rule.b)) ||
      (a.includes(rule.b) && b.includes(rule.a))
  );
}

export function timeToCategory(time: string): TimeCategory {
  const hour = Number(time.split(":")[0]);
  if (hour < 11) return "아침";
  if (hour < 17) return "점심";
  return "저녁";
}

export type ScheduleSuggestion = {
  timeCategory: TimeCategory;
  time: string;
  reasons: string[]; // 사용자에게 보여줄 배정 이유
};

export function suggestSchedule(
  name: string,
  existing: Supplement[],
  medications: Medication[] = [] // 복용 중인 약 (설명서에 이 성분 주의가 있으면 간격을 두고 배정)
): ScheduleSuggestion {
  const ingredients = detectIngredients(name);
  const mainRule = INGREDIENT_RULES.find((rule) => ingredients.includes(rule.name));
  const preferred = mainRule?.preferred ?? ["아침"];

  // 시간 후보: 권장 시간대 기본 시간 먼저, 나머지 시간대는 뒤에
  const candidates = [
    ...preferred,
    ...TIME_ORDER.filter((time) => !preferred.includes(time)),
  ].map((category) => DEFAULT_TIMES[category]);

  // 그 시간에 함께 먹으면 안 되는 영양제(2시간 안)·약(설명서 간격 안)
  const conflictsAt = (time: string): { name: string; reason: string; gap: number }[] => [
    ...existing
      .filter((item) => tooClose(item.time, time))
      .flatMap((item) =>
        interactionsBetween(ingredients, detectIngredients(item.name))
          .filter((rule) => rule.type === "separate")
          .map((rule) => ({ name: item.name, reason: rule.reason, gap: 2 }))
      ),
    ...medConflictsAt(ingredients, time, medications).map(({ med, hit, gap }) => ({
      name: shortMedName(med.name),
      reason: `설명서에 ${hit.i} 주의가 있어요.`,
      gap,
    })),
  ];

  // 함께 먹으면 좋은 영양제가 이미 있으면 그 시간으로 (단, 그 시간에 충돌이 없을 때)
  for (const item of existing) {
    const together = interactionsBetween(ingredients, detectIngredients(item.name)).find(
      (rule) => rule.type === "together"
    );
    if (together && conflictsAt(item.time).length === 0) {
      return {
        timeCategory: item.timeCategory,
        time: item.time,
        reasons: [`${josa(item.name, "과/와")} 같은 시간에 드세요. ${together.reason}`],
      };
    }
  }

  // 기본 시간이 모두 막히면 약 복용 시간에서 간격만큼 떨어진 시간도 찾아봄 (06:00~23:00)
  const medShifted = medConflictsAt(ingredients, candidates[0], medications).flatMap(({ time, gap }) =>
    [toMinutes(time) + gap * 60, toMinutes(time) - gap * 60]
      .filter((minutes) => minutes >= 6 * 60 && minutes <= 23 * 60)
      .map(fromMinutes)
  );

  const reasons: string[] = [];
  const firstChoice = candidates[0];
  const firstConflicts = conflictsAt(firstChoice);
  const chosen =
    [...candidates, ...medShifted].find((time) => conflictsAt(time).length === 0) ?? firstChoice;
  const category = timeToCategory(chosen);

  if (firstConflicts.length > 0 && chosen !== firstChoice) {
    const { name: other, reason, gap } = firstConflicts[0];
    reasons.push(
      `${josa(other, "과/와")} ${gap}시간 이상 떨어뜨려 ${category} ${josa(chosen, "으로/로")} 설정했어요. ${reason}`
    );
  } else if (conflictsAt(chosen).length > 0) {
    const { name: other, reason, gap } = conflictsAt(chosen)[0];
    reasons.push(`${josa(other, "과/와")} ${gap}시간 이상 간격을 두세요. ${reason}`);
  } else if (mainRule) {
    reasons.push(mainRule.tip);
  }

  return { timeCategory: category, time: chosen, reasons };
}

// 이 영양제와 간격이 부족한 약 (홈 카드 경고)
// includeTaken: 필요시 약을 오늘 먹은 시각도 따짐
export const medConflictsFor = (
  supplement: Supplement,
  medications: Medication[],
  includeTaken = false
) => medConflictsAt(detectIngredients(supplement.name), supplement.time, medications, includeTaken);

export type MovedSupplement = {
  id: number;
  name: string;
  from: string;
  to: string;
  medName: string;
  gap: number;
  because: string;
};

// 약을 등록한 뒤, 약과 간격이 부족한 영양제를 다른 시간으로 옮깁니다. (옮길 곳이 없으면 그대로 두고 카드에 경고)
export function separateFromMedications(
  supplements: Supplement[],
  medications: Medication[]
): { next: Supplement[]; moved: MovedSupplement[] } {
  const moved: MovedSupplement[] = [];
  let next = supplements;
  for (const item of supplements) {
    const conflict = medConflictsFor(item, medications)[0];
    if (!conflict) continue;
    const others = next.filter((other) => other.id !== item.id);
    const plan = suggestSchedule(item.name, others, medications);
    if (plan.time === item.time || medConflictsAt(detectIngredients(item.name), plan.time, medications).length > 0) {
      continue;
    }
    next = next.map((other) =>
      other.id === item.id ? { ...other, timeCategory: plan.timeCategory, time: plan.time } : other
    );
    moved.push({
      id: item.id,
      name: item.name,
      from: item.time,
      to: plan.time,
      medName: shortMedName(conflict.med.name),
      gap: conflict.gap,
      because: `${shortMedName(conflict.med.name)} 설명서에 ${conflict.hit.i} 주의가 있어 ${conflict.gap}시간 이상 간격이 필요해요.`,
    });
  }
  return { next, moved };
}

const SUPPLEMENT_GAP_MINUTES = 120; // 떨어뜨려야 하는 영양제끼리 둘 간격
const tooClose = (a: string, b: string) =>
  Math.abs(toMinutes(a) - toMinutes(b)) < SUPPLEMENT_GAP_MINUTES;

// 2시간 안에 함께 먹으면 안 되는 조합 찾기 (카드 경고 표시용)
export function findScheduleConflicts(
  supplements: Supplement[]
): Map<number, { with: Supplement; rule: InteractionRule }> {
  const conflicts = new Map<number, { with: Supplement; rule: InteractionRule }>();
  for (const a of supplements) {
    for (const b of supplements) {
      if (a.id >= b.id || !tooClose(a.time, b.time)) continue;
      const rule = interactionsBetween(
        detectIngredients(a.name),
        detectIngredients(b.name)
      ).find((item) => item.type === "separate");
      if (rule) {
        if (!conflicts.has(a.id)) conflicts.set(a.id, { with: b, rule });
        if (!conflicts.has(b.id)) conflicts.set(b.id, { with: a, rule });
      }
    }
  }
  return conflicts;
}

// 남은 양으로 며칠 더 먹을 수 있는지 (정보가 없으면 null)
export const daysLeft = (supplement: Supplement) => daysLeftOf(supplement);

// 복용 방법에서 1회 복용량과 단위 읽기: "2정" → { amount: 2, unit: "정" }, "1캡슐" → { amount: 1, unit: "캡슐" }
export function parseDose(text: string): { amount: number; unit: string } | null {
  const found = text.match(/(\d+(?:\.\d+)?)\s*(정|캡슐|포|알|개|스틱|방울|ml|mL|g)?/);
  if (!found) return null;
  const amount = Number(found[1]);
  if (!(amount > 0)) return null;
  return { amount, unit: found[2] ?? "개" };
}

const TIMING_WORDS = ["식전", "식후", "취침", "공복", "자기 전", "잠들기"];

// 성분에 맞는 복용 타이밍(식전·식후·취침 전·공복)을 복용 방법 뒤에 붙입니다.
// 사용자가 이미 타이밍을 적었으면 그대로 둡니다.
export function withTiming(name: string, dose: string) {
  const text = dose.trim();
  if (TIMING_WORDS.some((word) => text.includes(word))) return text;
  const ingredients = detectIngredients(name);
  const rule = INGREDIENT_RULES.find((item) => ingredients.includes(item.name));
  return `${text} · ${rule?.timing ?? "식후"}`;
}

// 이 시간에 이 영양제를 먹으면 생기는 충돌 (영양제끼리 2시간 안 · 약 설명서 간격 안)
function conflictsOf(name: string, time: string, others: Supplement[], medications: Medication[]) {
  const ingredients = detectIngredients(name);
  const withSupplements = others.flatMap((item) =>
    tooClose(item.time, time)
      ? interactionsBetween(ingredients, detectIngredients(item.name))
          .filter((rule) => rule.type === "separate")
          .map((rule) => ({ item, reason: rule.reason }))
      : []
  );
  return { withSupplements, withMeds: medConflictsAt(ingredients, time, medications) };
}

export type SupplementMovePlan = {
  preferred: ScheduleSuggestion; // 새 영양제를 원래 좋은 시간에 둘 때
  fallback: ScheduleSuggestion; // 기존 영양제를 옮기지 않을 때 (새 영양제가 피해서 배정)
  moves: MovedSupplement[]; // 옮길 기존 영양제 (없으면 물어볼 필요 없음)
};

// 영양제를 추가할 때: 새 영양제를 좋은 시간에 두려면 겹치는 기존 영양제를 어디로 옮겨야 하는지
// (처방약은 옮기지 않으므로, 새 영양제의 좋은 시간도 약과 겹치지 않는 시간 중에서 고름)
export function planMovesForNewSupplement(
  name: string,
  existing: Supplement[],
  medications: Medication[]
): SupplementMovePlan {
  const fallback = suggestSchedule(name, existing, medications);
  const preferred = suggestSchedule(name, [], medications);
  const none = { preferred, fallback, moves: [] };
  if (preferred.time === fallback.time) return none;

  const clashing = conflictsOf(name, preferred.time, existing, medications).withSupplements;
  if (clashing.length === 0) return none; // 함께 먹으면 좋은 영양제 쪽에 맞춘 경우

  const newItem: Supplement = {
    id: -1,
    name,
    desc: "",
    time: preferred.time,
    timeCategory: preferred.timeCategory,
    checked: false,
  };
  let placed = [...existing, newItem];
  const moves: MovedSupplement[] = [];
  for (const { item, reason } of clashing) {
    if (moves.some((move) => move.id === item.id)) continue;
    const others = placed.filter((other) => other.id !== item.id);
    const plan = suggestSchedule(item.name, others, medications);
    const after = conflictsOf(item.name, plan.time, others, medications);
    // 옮길 곳이 없으면 이 방법은 쓰지 않음 (새 영양제가 피해서 배정)
    if (plan.time === item.time || after.withSupplements.length > 0 || after.withMeds.length > 0) return none;
    placed = placed.map((other) =>
      other.id === item.id ? { ...other, time: plan.time, timeCategory: plan.timeCategory } : other
    );
    moves.push({
      id: item.id,
      name: item.name,
      from: item.time,
      to: plan.time,
      medName: "",
      gap: 2,
      because: reason,
    });
  }
  return { preferred, fallback, moves };
}

// 복약 스케줄 자동 설정
// 영양제 이름에서 성분을 알아내고, 이미 등록된 영양제와의 상호작용을 따져
// 함께 먹으면 좋은 것은 같은 시간대로, 떨어뜨려야 하는 것은 다른 시간대로 배정합니다.

import type { Supplement, TimeCategory } from "../components/Home";
import { josa } from "../utils/josa";
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
  existing: Supplement[]
): ScheduleSuggestion {
  const ingredients = detectIngredients(name);
  const mainRule = INGREDIENT_RULES.find((rule) => ingredients.includes(rule.name));
  const preferred = mainRule?.preferred ?? ["아침"];

  // 시간대 후보: 권장 시간대 먼저, 나머지는 뒤에
  const candidates = [
    ...preferred,
    ...TIME_ORDER.filter((time) => !preferred.includes(time)),
  ];

  const conflictsAt = (time: TimeCategory) =>
    existing
      .filter((item) => item.timeCategory === time)
      .flatMap((item) =>
        interactionsBetween(ingredients, detectIngredients(item.name))
          .filter((rule) => rule.type === "separate")
          .map((rule) => ({ item, rule }))
      );

  // 함께 먹으면 좋은 영양제가 이미 있으면 그 시간대로 (단, 그 시간대에 충돌이 없을 때)
  for (const item of existing) {
    const together = interactionsBetween(ingredients, detectIngredients(item.name)).find(
      (rule) => rule.type === "together"
    );
    if (together && conflictsAt(item.timeCategory).length === 0) {
      return {
        timeCategory: item.timeCategory,
        time: item.time,
        reasons: [`${josa(item.name, "과/와")} 같은 시간에 드세요. ${together.reason}`],
      };
    }
  }

  const reasons: string[] = [];
  const firstChoice = candidates[0];
  const firstConflicts = conflictsAt(firstChoice);

  const chosen = candidates.find((time) => conflictsAt(time).length === 0) ?? firstChoice;

  if (firstConflicts.length > 0 && chosen !== firstChoice) {
    const { item, rule } = firstConflicts[0];
    reasons.push(
      `${josa(item.name, "과/와")} 떨어뜨려 ${josa(chosen, "으로/로")} 설정했어요. ${rule.reason}`
    );
  } else if (conflictsAt(chosen).length > 0) {
    const { item, rule } = conflictsAt(chosen)[0];
    reasons.push(`${josa(item.name, "과/와")} 2시간 이상 간격을 두세요. ${rule.reason}`);
  } else if (mainRule) {
    reasons.push(mainRule.tip);
  }

  return { timeCategory: chosen, time: DEFAULT_TIMES[chosen], reasons };
}

// 같은 시간대에 함께 먹으면 안 되는 조합 찾기 (카드 경고 표시용)
export function findScheduleConflicts(
  supplements: Supplement[]
): Map<number, { with: Supplement; rule: InteractionRule }> {
  const conflicts = new Map<number, { with: Supplement; rule: InteractionRule }>();
  for (const a of supplements) {
    for (const b of supplements) {
      if (a.id >= b.id || a.timeCategory !== b.timeCategory) continue;
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
export function daysLeft(supplement: Supplement) {
  if (supplement.stock === undefined || supplement.stock === null) return null;
  const perDay = supplement.dailyDose && supplement.dailyDose > 0 ? supplement.dailyDose : 1;
  return Math.floor(supplement.stock / perDay);
}

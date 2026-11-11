"use client";

import { useMemo, useSyncExternalStore } from "react";

import { sportOrder, type Sport } from "@/domain/sports";
import { recordStreakActivity } from "@/features/streaks/activity";

import { parseDayKey } from "../../daily/day";
import { dailyQuizLength } from "../constants";

/**
 * Every Daily Quiz this browser has played, answer by answer.
 *
 * Answers are saved as they land rather than when the run ends, so leaving
 * halfway resumes at the next question instead of offering a free re-roll of
 * questions already seen. Same versioned-key, cached-parse shape as the other
 * game stores: `useSyncExternalStore` compares snapshots by reference.
 */

const storageKey = "statoz.next.sports-web.daily-quiz.v1";

export type DailyQuizAnswer = {
  /** Option index, or null when the clock ran out. */
  picked: number | null;
  correct: boolean;
  /** Whole seconds taken, for the speed bonus and the share line. */
  seconds: number;
  xp: number;
};

export type DailyQuizDay = {
  dayKey: string;
  /** The ids dealt, so a later change to the pools cannot re-deal the day. */
  questionIds: string[];
  answers: DailyQuizAnswer[];
  completed: boolean;
};

export type DailyQuizRecord = {
  bySport: Partial<Record<Sport, Record<string, DailyQuizDay>>>;
  /** `daily-quiz:<sport>:<day>` for every finished day already credited. */
  settled: string[];
};

const empty: DailyQuizRecord = Object.freeze({
  bySport: Object.freeze({}) as DailyQuizRecord["bySport"],
  settled: Object.freeze([]) as unknown as string[],
});

let cachedRaw: string | null = null;
let cachedValue: DailyQuizRecord = empty;
/** Holds the record for this session when the browser refuses storage. */
let memoryRaw: string | null = null;

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(storageKey) ?? memoryRaw;
  } catch {
    return memoryRaw;
  }
}

function coerceAnswer(value: unknown): DailyQuizAnswer | null {
  if (typeof value !== "object" || value === null) return null;
  const raw = value as Record<string, unknown>;
  const picked =
    typeof raw.picked === "number" && Number.isInteger(raw.picked) && raw.picked >= 0
      ? raw.picked
      : null;
  const seconds =
    typeof raw.seconds === "number" && Number.isFinite(raw.seconds)
      ? Math.max(0, Math.round(raw.seconds))
      : 0;
  const xp =
    typeof raw.xp === "number" && Number.isFinite(raw.xp) ? Math.max(0, Math.floor(raw.xp)) : 0;
  return { picked, correct: raw.correct === true, seconds, xp };
}

function coerce(value: unknown): DailyQuizRecord {
  if (typeof value !== "object" || value === null) return empty;
  const raw = value as { bySport?: unknown; settled?: unknown };
  const bySport: DailyQuizRecord["bySport"] = {};
  if (typeof raw.bySport === "object" && raw.bySport !== null) {
    for (const sport of sportOrder) {
      const days = (raw.bySport as Record<string, unknown>)[sport];
      if (typeof days !== "object" || days === null) continue;
      const out: Record<string, DailyQuizDay> = {};
      for (const [dayKey, rawDay] of Object.entries(days as Record<string, unknown>)) {
        if (!parseDayKey(dayKey) || typeof rawDay !== "object" || rawDay === null) continue;
        const day = rawDay as Record<string, unknown>;
        const questionIds = Array.isArray(day.questionIds)
          ? day.questionIds.filter((id): id is string => typeof id === "string")
          : [];
        const answers = Array.isArray(day.answers)
          ? day.answers
              .map(coerceAnswer)
              .filter((answer): answer is DailyQuizAnswer => answer !== null)
              .slice(0, dailyQuizLength)
          : [];
        out[dayKey] = {
          dayKey,
          questionIds,
          answers,
          completed: day.completed === true && answers.length >= questionIds.length,
        };
      }
      if (Object.keys(out).length > 0) bySport[sport] = out;
    }
  }
  const settled = Array.isArray(raw.settled)
    ? raw.settled.filter((id): id is string => typeof id === "string")
    : [];
  return { bySport, settled };
}

function getSnapshot(): DailyQuizRecord {
  const raw = readRaw();
  if (raw === cachedRaw) return cachedValue;
  cachedRaw = raw;
  if (raw === null) {
    cachedValue = empty;
    return cachedValue;
  }
  try {
    cachedValue = coerce(JSON.parse(raw));
  } catch {
    cachedValue = empty;
  }
  return cachedValue;
}

const listeners = new Set<() => void>();

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  const onStorage = (event: StorageEvent) => {
    if (event.key === storageKey || event.key === null) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function write(next: DailyQuizRecord): void {
  const text = JSON.stringify(next);
  try {
    window.localStorage.setItem(storageKey, text);
    memoryRaw = null;
  } catch {
    // Storage refused (private window, quota): keep it for this session.
    memoryRaw = text;
  }
  for (const listener of listeners) listener();
}

/* ---- Reading -------------------------------------------------------------- */

export function useDailyQuizRecord(): DailyQuizRecord {
  return useSyncExternalStore(subscribe, getSnapshot, () => empty);
}

export function dailyQuizDayFor(
  record: DailyQuizRecord,
  sport: Sport,
  dayKey: string,
): DailyQuizDay | null {
  return record.bySport[sport]?.[dayKey] ?? null;
}

/* ---- Writing -------------------------------------------------------------- */

/** Opens the day with the questions dealt, if it is not open already. */
export function beginDailyQuiz(sport: Sport, dayKey: string, questionIds: string[]): DailyQuizDay {
  const current = getSnapshot();
  const existing = dailyQuizDayFor(current, sport, dayKey);
  if (existing) return existing;
  const day: DailyQuizDay = { dayKey, questionIds, answers: [], completed: false };
  write({
    ...current,
    bySport: { ...current.bySport, [sport]: { ...(current.bySport[sport] ?? {}), [dayKey]: day } },
  });
  return day;
}

/**
 * Saves the next answer. Ignored once the day is complete or every question is
 * answered, so a double tap can never record two answers for one question.
 */
export function recordDailyAnswer(sport: Sport, dayKey: string, answer: DailyQuizAnswer): DailyQuizDay | null {
  const current = getSnapshot();
  const day = dailyQuizDayFor(current, sport, dayKey);
  if (!day || day.completed || day.answers.length >= day.questionIds.length) return day;
  const answers = [...day.answers, answer];
  const completed = answers.length >= day.questionIds.length;
  const next: DailyQuizDay = { ...day, answers, completed };
  write({
    ...current,
    bySport: { ...current.bySport, [sport]: { ...(current.bySport[sport] ?? {}), [dayKey]: next } },
  });
  if (completed) settle(sport, dayKey);
  return next;
}

/** Credits the streak once per finished day. */
function settle(sport: Sport, dayKey: string): void {
  const current = getSnapshot();
  const id = `daily-quiz:${sport}:${dayKey}`;
  if (current.settled.includes(id)) return;
  write({ ...current, settled: [...current.settled, id].slice(-400) });
  const date = parseDayKey(dayKey);
  if (date) recordStreakActivity("dailyQuiz", new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12));
}

export function resetDailyQuiz(): void {
  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // Nothing to do.
  }
  memoryRaw = null;
  for (const listener of listeners) listener();
}

/* ---- What the rest of the app reads --------------------------------------- */

export type DailyQuizStats = {
  daysPlayed: number;
  /** XP banked by every answer, finished day or not. */
  xp: number;
  perfectDays: number;
};

export function dailyQuizStatsFrom(record: DailyQuizRecord): DailyQuizStats {
  let daysPlayed = 0;
  let xp = 0;
  let perfectDays = 0;
  for (const days of Object.values(record.bySport)) {
    for (const day of Object.values(days ?? {})) {
      xp += day.answers.reduce((sum, answer) => sum + answer.xp, 0);
      if (!day.completed) continue;
      daysPlayed += 1;
      if (day.answers.every((answer) => answer.correct)) perfectDays += 1;
    }
  }
  return { daysPlayed, xp, perfectDays };
}

export function useDailyQuizStats(): DailyQuizStats {
  const record = useDailyQuizRecord();
  return useMemo(() => dailyQuizStatsFrom(record), [record]);
}

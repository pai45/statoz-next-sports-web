"use client";

import { useMemo, useSyncExternalStore } from "react";

import { sportOrder, type Sport } from "@/domain/sports";
import { recordStreakActivity } from "@/features/streaks/activity";

import { parseDayKey } from "../../daily/day";
import { dailyRounds, higherLowerXp } from "../constants";

/**
 * Higher or Lower: each daily chain's calls, and the best endless streak per
 * sport. Calls are saved as they are made, so a day resumes where it stopped.
 */

const storageKey = "statoz.next.sports-web.higher-lower.v1";

export type HigherLowerDay = { dayKey: string; calls: boolean[] };

export type HigherLowerRecord = {
  bySport: Partial<Record<Sport, Record<string, HigherLowerDay>>>;
  bestEndless: Partial<Record<Sport, number>>;
  settled: string[];
};

const empty: HigherLowerRecord = Object.freeze({
  bySport: Object.freeze({}) as HigherLowerRecord["bySport"],
  bestEndless: Object.freeze({}) as HigherLowerRecord["bestEndless"],
  settled: Object.freeze([]) as unknown as string[],
});

let cachedRaw: string | null = null;
let cachedValue: HigherLowerRecord = empty;
let memoryRaw: string | null = null;

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(storageKey) ?? memoryRaw;
  } catch {
    return memoryRaw;
  }
}

function coerce(value: unknown): HigherLowerRecord {
  if (typeof value !== "object" || value === null) return empty;
  const raw = value as Record<string, unknown>;
  const bySport: HigherLowerRecord["bySport"] = {};
  const bestEndless: HigherLowerRecord["bestEndless"] = {};
  for (const sport of sportOrder) {
    const days = (raw.bySport as Record<string, unknown> | undefined)?.[sport];
    if (typeof days === "object" && days !== null) {
      const out: Record<string, HigherLowerDay> = {};
      for (const [dayKey, rawDay] of Object.entries(days as Record<string, unknown>)) {
        if (!parseDayKey(dayKey) || typeof rawDay !== "object" || rawDay === null) continue;
        const calls = (rawDay as { calls?: unknown }).calls;
        out[dayKey] = {
          dayKey,
          calls: Array.isArray(calls) ? calls.filter((call): call is boolean => typeof call === "boolean").slice(0, dailyRounds) : [],
        };
      }
      if (Object.keys(out).length > 0) bySport[sport] = out;
    }
    const best = (raw.bestEndless as Record<string, unknown> | undefined)?.[sport];
    if (typeof best === "number" && Number.isFinite(best) && best > 0) bestEndless[sport] = Math.floor(best);
  }
  const settled = Array.isArray(raw.settled) ? raw.settled.filter((id): id is string => typeof id === "string") : [];
  return { bySport, bestEndless, settled };
}

function getSnapshot(): HigherLowerRecord {
  const raw = readRaw();
  if (raw === cachedRaw) return cachedValue;
  cachedRaw = raw;
  try {
    cachedValue = raw === null ? empty : coerce(JSON.parse(raw));
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

function write(next: HigherLowerRecord): void {
  const text = JSON.stringify(next);
  try {
    window.localStorage.setItem(storageKey, text);
    memoryRaw = null;
  } catch {
    memoryRaw = text;
  }
  for (const listener of listeners) listener();
}

export function useHigherLowerRecord(): HigherLowerRecord {
  return useSyncExternalStore(subscribe, getSnapshot, () => empty);
}

export function higherLowerDayFor(record: HigherLowerRecord, sport: Sport, dayKey: string): HigherLowerDay | null {
  return record.bySport[sport]?.[dayKey] ?? null;
}

/** Saves the next daily call; ignored once the chain is finished. */
export function recordHigherLowerCall(sport: Sport, dayKey: string, right: boolean): void {
  const current = getSnapshot();
  const day = higherLowerDayFor(current, sport, dayKey) ?? { dayKey, calls: [] };
  if (day.calls.length >= dailyRounds) return;
  const calls = [...day.calls, right];
  const settleId = `higher-lower:${sport}:${dayKey}`;
  const finished = calls.length >= dailyRounds && !current.settled.includes(settleId);
  write({
    ...current,
    bySport: { ...current.bySport, [sport]: { ...(current.bySport[sport] ?? {}), [dayKey]: { dayKey, calls } } },
    settled: finished ? [...current.settled, settleId].slice(-400) : current.settled,
  });
  if (finished) {
    const date = parseDayKey(dayKey);
    if (date) recordStreakActivity("higherLower", new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12));
  }
}

/** Keeps the best endless streak for a sport. */
export function recordEndlessStreak(sport: Sport, streak: number): void {
  const current = getSnapshot();
  if ((current.bestEndless[sport] ?? 0) >= streak) return;
  write({ ...current, bestEndless: { ...current.bestEndless, [sport]: streak } });
}

export type HigherLowerStats = { daysPlayed: number; xp: number };

export function higherLowerStatsFrom(record: HigherLowerRecord): HigherLowerStats {
  let daysPlayed = 0;
  let xp = 0;
  for (const days of Object.values(record.bySport)) {
    for (const day of Object.values(days ?? {})) {
      const right = day.calls.filter(Boolean).length;
      if (day.calls.length >= dailyRounds) {
        daysPlayed += 1;
        xp += higherLowerXp(right, dailyRounds);
      } else {
        xp += higherLowerXp(right, 0);
      }
    }
  }
  return { daysPlayed, xp };
}

export function useHigherLowerStats(): HigherLowerStats {
  const record = useHigherLowerRecord();
  return useMemo(() => higherLowerStatsFrom(record), [record]);
}

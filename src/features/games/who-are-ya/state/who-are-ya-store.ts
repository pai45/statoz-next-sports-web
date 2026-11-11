"use client";

import { useMemo, useSyncExternalStore } from "react";

import { recordStreakActivity } from "@/features/streaks/activity";

import { parseDayKey } from "../../daily/day";
import { maxGuesses, whoAreYaSports, whoAreYaXp, type WhoAreYaSport } from "../constants";

/**
 * Who Are Ya days, guess by guess. Saved as each guess lands, so leaving and
 * coming back keeps the board. Same cached-snapshot store shape as the other
 * games.
 */

const storageKey = "statoz.next.sports-web.who-are-ya.v1";

export type WhoAreYaStatus = "playing" | "won" | "lost";

export type WhoAreYaDay = {
  dayKey: string;
  targetId: string;
  guessIds: string[];
  status: WhoAreYaStatus;
};

export type WhoAreYaRecord = {
  bySport: Partial<Record<WhoAreYaSport, Record<string, WhoAreYaDay>>>;
  settled: string[];
};

const empty: WhoAreYaRecord = Object.freeze({
  bySport: Object.freeze({}) as WhoAreYaRecord["bySport"],
  settled: Object.freeze([]) as unknown as string[],
});

let cachedRaw: string | null = null;
let cachedValue: WhoAreYaRecord = empty;
let memoryRaw: string | null = null;

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(storageKey) ?? memoryRaw;
  } catch {
    return memoryRaw;
  }
}

function coerce(value: unknown): WhoAreYaRecord {
  if (typeof value !== "object" || value === null) return empty;
  const raw = value as { bySport?: unknown; settled?: unknown };
  const bySport: WhoAreYaRecord["bySport"] = {};
  if (typeof raw.bySport === "object" && raw.bySport !== null) {
    for (const sport of whoAreYaSports) {
      const days = (raw.bySport as Record<string, unknown>)[sport];
      if (typeof days !== "object" || days === null) continue;
      const out: Record<string, WhoAreYaDay> = {};
      for (const [dayKey, rawDay] of Object.entries(days as Record<string, unknown>)) {
        if (!parseDayKey(dayKey) || typeof rawDay !== "object" || rawDay === null) continue;
        const day = rawDay as Record<string, unknown>;
        if (typeof day.targetId !== "string") continue;
        const guessIds = Array.isArray(day.guessIds)
          ? day.guessIds.filter((id): id is string => typeof id === "string").slice(0, maxGuesses)
          : [];
        const status: WhoAreYaStatus = day.status === "won" || day.status === "lost" ? day.status : "playing";
        out[dayKey] = { dayKey, targetId: day.targetId, guessIds, status };
      }
      if (Object.keys(out).length > 0) bySport[sport] = out;
    }
  }
  const settled = Array.isArray(raw.settled) ? raw.settled.filter((id): id is string => typeof id === "string") : [];
  return { bySport, settled };
}

function getSnapshot(): WhoAreYaRecord {
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

function write(next: WhoAreYaRecord): void {
  const text = JSON.stringify(next);
  try {
    window.localStorage.setItem(storageKey, text);
    memoryRaw = null;
  } catch {
    memoryRaw = text;
  }
  for (const listener of listeners) listener();
}

export function useWhoAreYaRecord(): WhoAreYaRecord {
  return useSyncExternalStore(subscribe, getSnapshot, () => empty);
}

export function whoAreYaDayFor(record: WhoAreYaRecord, sport: WhoAreYaSport, dayKey: string): WhoAreYaDay | null {
  return record.bySport[sport]?.[dayKey] ?? null;
}

/**
 * Adds a guess and settles the day when it is solved or out of guesses.
 * Duplicates and guesses after the end are ignored.
 */
export function submitWhoAreYaGuess(sport: WhoAreYaSport, dayKey: string, targetId: string, guessId: string): WhoAreYaDay {
  const current = getSnapshot();
  const existing = whoAreYaDayFor(current, sport, dayKey) ?? { dayKey, targetId, guessIds: [], status: "playing" as const };
  if (existing.status !== "playing" || existing.guessIds.includes(guessId)) return existing;
  const guessIds = [...existing.guessIds, guessId];
  const status: WhoAreYaStatus = guessId === existing.targetId ? "won" : guessIds.length >= maxGuesses ? "lost" : "playing";
  const day: WhoAreYaDay = { ...existing, guessIds, status };
  const settleId = `who-are-ya:${sport}:${dayKey}`;
  const finished = status !== "playing" && !current.settled.includes(settleId);
  write({
    bySport: { ...current.bySport, [sport]: { ...(current.bySport[sport] ?? {}), [dayKey]: day } },
    settled: finished ? [...current.settled, settleId].slice(-400) : current.settled,
  });
  if (finished) {
    const date = parseDayKey(dayKey);
    if (date) recordStreakActivity("whoAreYa", new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12));
  }
  return day;
}

export type WhoAreYaStats = { played: number; won: number; xp: number };

export function whoAreYaStatsFrom(record: WhoAreYaRecord): WhoAreYaStats {
  let played = 0;
  let won = 0;
  let xp = 0;
  for (const days of Object.values(record.bySport)) {
    for (const day of Object.values(days ?? {})) {
      if (day.status === "playing") continue;
      played += 1;
      if (day.status === "won") won += 1;
      xp += whoAreYaXp(day.status === "won", day.guessIds.length);
    }
  }
  return { played, won, xp };
}

export function useWhoAreYaStats(): WhoAreYaStats {
  const record = useWhoAreYaRecord();
  return useMemo(() => whoAreYaStatsFrom(record), [record]);
}

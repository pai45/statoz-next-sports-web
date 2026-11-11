"use client";

import { useMemo, useSyncExternalStore } from "react";

import { recordStreakActivity } from "@/features/streaks/activity";

import { parseDayKey } from "../../daily/day";
import { maxMistakes } from "../constants";

/**
 * Football Connections days: the groups found, in order, and every submitted
 * guess (for the share grid). The day ends with all four found or four misses.
 */

const storageKey = "statoz.next.sports-web.connections.v1";

export type ConnectionsDay = {
  dayKey: string;
  solved: string[];
  guesses: string[][];
  mistakes: number;
};

export type ConnectionsRecord = { days: Record<string, ConnectionsDay>; settled: string[] };

const empty: ConnectionsRecord = Object.freeze({ days: Object.freeze({}) as Record<string, ConnectionsDay>, settled: Object.freeze([]) as unknown as string[] });

let cachedRaw: string | null = null;
let cachedValue: ConnectionsRecord = empty;
let memoryRaw: string | null = null;

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(storageKey) ?? memoryRaw;
  } catch {
    return memoryRaw;
  }
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function coerce(value: unknown): ConnectionsRecord {
  if (typeof value !== "object" || value === null) return empty;
  const raw = value as { days?: unknown; settled?: unknown };
  const days: Record<string, ConnectionsDay> = {};
  if (typeof raw.days === "object" && raw.days !== null) {
    for (const [dayKey, rawDay] of Object.entries(raw.days as Record<string, unknown>)) {
      if (!parseDayKey(dayKey) || typeof rawDay !== "object" || rawDay === null) continue;
      const day = rawDay as Record<string, unknown>;
      days[dayKey] = {
        dayKey,
        solved: strings(day.solved).slice(0, 4),
        guesses: Array.isArray(day.guesses) ? day.guesses.map(strings).slice(0, 8) : [],
        mistakes: typeof day.mistakes === "number" ? Math.min(maxMistakes, Math.max(0, Math.floor(day.mistakes))) : 0,
      };
    }
  }
  return { days, settled: strings(raw.settled) };
}

function getSnapshot(): ConnectionsRecord {
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

function write(next: ConnectionsRecord): void {
  const text = JSON.stringify(next);
  try {
    window.localStorage.setItem(storageKey, text);
    memoryRaw = null;
  } catch {
    memoryRaw = text;
  }
  for (const listener of listeners) listener();
}

export function useConnectionsRecord(): ConnectionsRecord {
  return useSyncExternalStore(subscribe, getSnapshot, () => empty);
}

export function connectionsDayFor(record: ConnectionsRecord, dayKey: string): ConnectionsDay | null {
  return record.days[dayKey] ?? null;
}

export function isConnectionsDone(day: ConnectionsDay | null): boolean {
  return Boolean(day && (day.solved.length >= 4 || day.mistakes >= maxMistakes));
}

/** Records a submitted four: `clubId` when it completes a group, null for a miss. */
export function submitConnectionsGuess(dayKey: string, picks: string[], clubId: string | null): void {
  const current = getSnapshot();
  const day = connectionsDayFor(current, dayKey) ?? { dayKey, solved: [], guesses: [], mistakes: 0 };
  if (isConnectionsDone(day)) return;
  const next: ConnectionsDay = {
    dayKey,
    solved: clubId && !day.solved.includes(clubId) ? [...day.solved, clubId] : day.solved,
    guesses: [...day.guesses, picks],
    mistakes: clubId ? day.mistakes : day.mistakes + 1,
  };
  const settleId = `connections:${dayKey}`;
  const finished = isConnectionsDone(next) && !current.settled.includes(settleId);
  write({ days: { ...current.days, [dayKey]: next }, settled: finished ? [...current.settled, settleId].slice(-400) : current.settled });
  if (finished) {
    const date = parseDayKey(dayKey);
    if (date) recordStreakActivity("connections", new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12));
  }
}

export function connectionsXp(day: ConnectionsDay): number {
  return day.solved.length * 2 + (day.solved.length === 4 ? Math.max(0, maxMistakes - day.mistakes) : 0);
}

export function useConnectionsStats(): { played: number; xp: number } {
  const record = useConnectionsRecord();
  return useMemo(() => {
    let played = 0;
    let xp = 0;
    for (const day of Object.values(record.days)) {
      xp += connectionsXp(day);
      if (isConnectionsDone(day)) played += 1;
    }
    return { played, xp };
  }, [record]);
}

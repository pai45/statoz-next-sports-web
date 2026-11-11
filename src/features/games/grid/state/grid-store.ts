"use client";

import { useMemo, useSyncExternalStore } from "react";

import { recordStreakActivity } from "@/features/streaks/activity";

import { parseDayKey } from "../../daily/day";
import { gridGuesses } from "../constants";

/**
 * The daily Football Grid, cell by cell. Each guess is spent whether it lands
 * or not; the day ends when the grid is full or the guesses run out.
 */

const storageKey = "statoz.next.sports-web.football-grid.v1";

export type GridDay = {
  dayKey: string;
  /** Cell index (0–8) to the career id placed there. */
  cells: Record<number, string>;
  guessesUsed: number;
  done: boolean;
};

export type GridRecord = { days: Record<string, GridDay>; settled: string[] };

const empty: GridRecord = Object.freeze({ days: Object.freeze({}) as Record<string, GridDay>, settled: Object.freeze([]) as unknown as string[] });

let cachedRaw: string | null = null;
let cachedValue: GridRecord = empty;
let memoryRaw: string | null = null;

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(storageKey) ?? memoryRaw;
  } catch {
    return memoryRaw;
  }
}

function coerce(value: unknown): GridRecord {
  if (typeof value !== "object" || value === null) return empty;
  const raw = value as { days?: unknown; settled?: unknown };
  const days: Record<string, GridDay> = {};
  if (typeof raw.days === "object" && raw.days !== null) {
    for (const [dayKey, rawDay] of Object.entries(raw.days as Record<string, unknown>)) {
      if (!parseDayKey(dayKey) || typeof rawDay !== "object" || rawDay === null) continue;
      const day = rawDay as Record<string, unknown>;
      const cells: Record<number, string> = {};
      if (typeof day.cells === "object" && day.cells !== null) {
        for (const [cell, id] of Object.entries(day.cells as Record<string, unknown>)) {
          const index = Number(cell);
          if (Number.isInteger(index) && index >= 0 && index < 9 && typeof id === "string") cells[index] = id;
        }
      }
      const guessesUsed = typeof day.guessesUsed === "number" ? Math.min(gridGuesses, Math.max(0, Math.floor(day.guessesUsed))) : 0;
      days[dayKey] = { dayKey, cells, guessesUsed, done: day.done === true };
    }
  }
  const settled = Array.isArray(raw.settled) ? raw.settled.filter((id): id is string => typeof id === "string") : [];
  return { days, settled };
}

function getSnapshot(): GridRecord {
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

function write(next: GridRecord): void {
  const text = JSON.stringify(next);
  try {
    window.localStorage.setItem(storageKey, text);
    memoryRaw = null;
  } catch {
    memoryRaw = text;
  }
  for (const listener of listeners) listener();
}

export function useGridRecord(): GridRecord {
  return useSyncExternalStore(subscribe, getSnapshot, () => empty);
}

export function gridDayFor(record: GridRecord, dayKey: string): GridDay | null {
  return record.days[dayKey] ?? null;
}

/**
 * Spends one guess on a cell. `correct` is decided by the caller against the
 * day's grid; a correct guess fills the cell. Ignored once the day is done.
 */
export function spendGridGuess(dayKey: string, cell: number, careerId: string, correct: boolean): GridDay {
  const current = getSnapshot();
  const day = gridDayFor(current, dayKey) ?? { dayKey, cells: {}, guessesUsed: 0, done: false };
  if (day.done || day.cells[cell] !== undefined) return day;
  const cells = correct ? { ...day.cells, [cell]: careerId } : day.cells;
  const guessesUsed = day.guessesUsed + 1;
  const done = Object.keys(cells).length >= 9 || guessesUsed >= gridGuesses;
  const next: GridDay = { dayKey, cells, guessesUsed, done };
  const settleId = `football-grid:${dayKey}`;
  const settle = done && !current.settled.includes(settleId);
  write({ days: { ...current.days, [dayKey]: next }, settled: settle ? [...current.settled, settleId].slice(-400) : current.settled });
  if (settle) {
    const date = parseDayKey(dayKey);
    if (date) recordStreakActivity("grid", new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12));
  }
  return next;
}

/** Ends the day early, keeping what was placed. */
export function finishGridDay(dayKey: string): void {
  const current = getSnapshot();
  const day = gridDayFor(current, dayKey);
  if (!day || day.done) return;
  spendRemaining(current, day);
}

function spendRemaining(current: GridRecord, day: GridDay): void {
  const settleId = `football-grid:${day.dayKey}`;
  const settle = !current.settled.includes(settleId);
  write({
    days: { ...current.days, [day.dayKey]: { ...day, guessesUsed: gridGuesses, done: true } },
    settled: settle ? [...current.settled, settleId].slice(-400) : current.settled,
  });
  if (settle) {
    const date = parseDayKey(day.dayKey);
    if (date) recordStreakActivity("grid", new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12));
  }
}

export type GridStats = { played: number; cellsFilled: number; xp: number };

/** Two XP per filled cell, plus a bonus for a full grid. */
export function gridXp(filled: number): number {
  return filled * 2 + (filled === 9 ? 5 : 0);
}

export function gridStatsFrom(record: GridRecord): GridStats {
  let played = 0;
  let cellsFilled = 0;
  let xp = 0;
  for (const day of Object.values(record.days)) {
    const filled = Object.keys(day.cells).length;
    cellsFilled += filled;
    xp += gridXp(filled);
    if (day.done) played += 1;
  }
  return { played, cellsFilled, xp };
}

export function useGridStats(): GridStats {
  const record = useGridRecord();
  return useMemo(() => gridStatsFrom(record), [record]);
}

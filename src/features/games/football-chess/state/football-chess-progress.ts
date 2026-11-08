"use client";

import { useSyncExternalStore } from "react";

import { chessFormations, type ChessFormation } from "../types";

/**
 * The lifetime record for Football Chess — the web port of `FootballChessStats`
 * and the storage the cubit settles it into.
 *
 * Same shape as the other games' stores: a versioned key, a frozen default that
 * doubles as the server snapshot, and a cached parse so `useSyncExternalStore`
 * can compare by reference. Flutter persists this under
 * `pd_football_chess_stats` via `SecureGameStorage`; the chosen formation rides
 * along, because on the web it is picked in the lobby rather than on a deck.
 */

const storageKey = "statoz.next.sports-web.footballchess.v1";

export type FootballChessStats = {
  wins: number;
  losses: number;
  draws: number;
  currentStreak: number;
  bestStreak: number;
  /** The shape the lobby last selected. */
  formation: ChessFormation;
};

const nothingPlayed: FootballChessStats = Object.freeze({
  wins: 0,
  losses: 0,
  draws: 0,
  currentStreak: 0,
  bestStreak: 0,
  formation: "box",
});

/**
 * `useSyncExternalStore` compares snapshots by reference, so the parsed value is
 * cached and only replaced when the stored text actually changes. Returning a
 * fresh object every read would re-render forever.
 */
let cachedRaw: string | null = null;
let cachedValue: FootballChessStats = nothingPlayed;

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(storageKey);
  } catch {
    // A private window refusing storage is not an error worth surfacing.
    return null;
  }
}

function positiveInteger(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : 0;
}

function coerce(value: unknown): FootballChessStats {
  if (typeof value !== "object" || value === null) return nothingPlayed;
  const record = value as Record<string, unknown>;
  const formation = record.formation;
  return {
    wins: positiveInteger(record.wins),
    losses: positiveInteger(record.losses),
    draws: positiveInteger(record.draws),
    currentStreak: positiveInteger(record.currentStreak),
    bestStreak: positiveInteger(record.bestStreak),
    formation:
      typeof formation === "string" &&
      (chessFormations as readonly string[]).includes(formation)
        ? (formation as ChessFormation)
        : "box",
  };
}

function getSnapshot(): FootballChessStats {
  const raw = readRaw();
  if (raw === cachedRaw) return cachedValue;
  cachedRaw = raw;
  if (raw === null) {
    cachedValue = nothingPlayed;
    return cachedValue;
  }
  try {
    cachedValue = coerce(JSON.parse(raw));
  } catch {
    cachedValue = nothingPlayed;
  }
  return cachedValue;
}

function getServerSnapshot(): FootballChessStats {
  return nothingPlayed;
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

function write(next: FootballChessStats): void {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(next));
  } catch {
    // Storage refused; the value still stands for this session.
  }
  cachedRaw = null;
  for (const listener of listeners) listener();
}

/* ---- What a match is worth ------------------------------------------------ */

/**
 * A win pays by margin and caps at 26; a draw is worth something, and a loss
 * still pays a little. Ported from `calculateFootballChessXP`.
 */
export function calculateFootballChessXp(
  won: boolean,
  draw: boolean,
  goalMargin: number,
): number {
  if (won) return Math.min(26, 14 + Math.min(Math.max(goalMargin - 1, 0), 99) * 3);
  if (draw) return 6;
  return 2;
}

export function played(stats: FootballChessStats): number {
  return stats.wins + stats.losses + stats.draws;
}

export function winRate(stats: FootballChessStats): string {
  const total = played(stats);
  return total === 0 ? "—" : `${Math.round((stats.wins / total) * 100)}%`;
}

/* ---- Reading and writing --------------------------------------------------- */

const neverChanges = () => () => {};

/** False on the server and through the first client render, true afterwards. */
export function useIsHydrated(): boolean {
  return useSyncExternalStore(
    neverChanges,
    () => true,
    () => false,
  );
}

export function useFootballChessStats(): FootballChessStats {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Reads without subscribing — for the beat a match is settled. */
export function readFootballChessStats(): FootballChessStats {
  if (typeof window === "undefined") return nothingPlayed;
  return getSnapshot();
}

/** Settles one result, and returns the XP it paid. */
export function recordFootballChess(
  won: boolean,
  draw: boolean,
  goalMargin: number,
): number {
  const current = readFootballChessStats();
  const nextStreak = won ? current.currentStreak + 1 : 0;
  write({
    ...current,
    wins: won ? current.wins + 1 : current.wins,
    losses: !won && !draw ? current.losses + 1 : current.losses,
    draws: draw ? current.draws + 1 : current.draws,
    currentStreak: nextStreak,
    bestStreak: Math.max(current.bestStreak, nextStreak),
  });
  return calculateFootballChessXp(won, draw, goalMargin);
}

export function saveFormation(formation: ChessFormation): void {
  const current = readFootballChessStats();
  if (current.formation === formation) return;
  write({ ...current, formation });
}

export function resetFootballChessProgress(): void {
  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // Nothing to do; the next read falls back to the default.
  }
  cachedRaw = null;
  for (const listener of listeners) listener();
}

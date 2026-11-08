"use client";

import { useSyncExternalStore } from "react";

import { recordStreakActivity } from "@/features/streaks/activity";

import type {
  PitchDuelHistoryEntry,
  PitchDuelProgress,
  PitchDuelRoundResult,
} from "../types";

const storageKey = "statoz.next.sports-web.pitch-duel.v1";
const historyLimit = 25;

const emptyProgress: PitchDuelProgress = Object.freeze({
  version: 1,
  xp: 0,
  wins: 0,
  played: 0,
  currentStreak: 0,
  bestStreak: 0,
  tutorialSeen: Object.freeze([]) as unknown as string[],
  history: Object.freeze([]) as unknown as PitchDuelHistoryEntry[],
});

const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cachedValue: PitchDuelProgress = emptyProgress;

function nonNegativeInt(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : 0;
}

function coerce(value: unknown): PitchDuelProgress {
  if (!value || typeof value !== "object") return emptyProgress;
  const record = value as Record<string, unknown>;
  const tutorialSeen = Array.isArray(record.tutorialSeen)
    ? [...new Set(record.tutorialSeen.filter((item): item is string => typeof item === "string"))]
    : [];
  const history = Array.isArray(record.history)
    ? (record.history.filter(
        (entry): entry is PitchDuelHistoryEntry =>
          Boolean(entry) &&
          typeof entry === "object" &&
          typeof (entry as PitchDuelHistoryEntry).id === "string",
      ) as PitchDuelHistoryEntry[]).slice(0, historyLimit)
    : [];

  return {
    version: 1,
    xp: nonNegativeInt(record.xp),
    wins: nonNegativeInt(record.wins),
    played: nonNegativeInt(record.played),
    currentStreak: nonNegativeInt(record.currentStreak),
    bestStreak: nonNegativeInt(record.bestStreak),
    tutorialSeen,
    history,
  };
}

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

function getSnapshot(): PitchDuelProgress {
  const raw = readRaw();
  if (raw === cachedRaw) return cachedValue;
  cachedRaw = raw;
  try {
    cachedValue = raw ? coerce(JSON.parse(raw)) : emptyProgress;
  } catch {
    cachedValue = emptyProgress;
  }
  return cachedValue;
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  const onStorage = (event: StorageEvent) => {
    if (event.key === storageKey || event.key === null) {
      cachedRaw = null;
      onChange();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function write(next: PitchDuelProgress): void {
  const safe = coerce(next);
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(safe));
  } catch {
    cachedValue = safe;
  }
  cachedRaw = null;
  for (const listener of listeners) listener();
}

export function usePitchDuelProgress(): PitchDuelProgress {
  return useSyncExternalStore(subscribe, getSnapshot, () => emptyProgress);
}

export function readPitchDuelProgress(): PitchDuelProgress {
  if (typeof window === "undefined") return emptyProgress;
  return getSnapshot();
}

export function pitchDuelXp(
  result: "Victory" | "Draw" | "Defeat",
  playerScore: number,
  opponentScore: number,
): number {
  if (result === "Draw") return 4;
  if (result === "Victory") {
    const shutout = opponentScore === 0 ? 5 : 0;
    return Math.min(25, 10 + (playerScore - opponentScore) * 3 + shutout);
  }
  return Math.max(-15, -(5 + (opponentScore - playerScore) * 2));
}

export function recordPitchDuel(input: {
  id: string;
  opponentName: string;
  playerScore: number;
  opponentScore: number;
  rounds: PitchDuelRoundResult[];
}): { gained: number; total: number; result: "Victory" | "Draw" | "Defeat" } {
  const current = getSnapshot();
  const existing = current.history.find((entry) => entry.id === input.id);
  if (existing) {
    return { gained: existing.xpEarned, total: current.xp, result: existing.result };
  }

  const result =
    input.playerScore > input.opponentScore
      ? "Victory"
      : input.playerScore < input.opponentScore
        ? "Defeat"
        : "Draw";
  const gained = pitchDuelXp(result, input.playerScore, input.opponentScore);
  const total = Math.max(0, current.xp + gained);
  const currentStreak = result === "Victory" ? current.currentStreak + 1 : 0;
  const entry: PitchDuelHistoryEntry = {
    id: input.id,
    playedAt: new Date().toISOString(),
    opponentName: input.opponentName,
    playerScore: input.playerScore,
    opponentScore: input.opponentScore,
    result,
    xpEarned: gained,
    rounds: input.rounds.map((round) => ({
      round: round.round,
      scenarioTitle: round.scenario.title,
      outcome: round.outcome,
      playerAttacking: round.playerAttacking,
    })),
  };

  write({
    ...current,
    xp: total,
    wins: current.wins + (result === "Victory" ? 1 : 0),
    played: current.played + 1,
    currentStreak,
    bestStreak: Math.max(current.bestStreak, currentStreak),
    history: [entry, ...current.history].slice(0, historyLimit),
  });
  recordStreakActivity("pitchDuel", new Date(entry.playedAt));
  return { gained, total, result };
}

export function markPitchDuelTutorialSeen(key: string): void {
  const current = getSnapshot();
  if (current.tutorialSeen.includes(key)) return;
  write({ ...current, tutorialSeen: [...current.tutorialSeen, key] });
}

/** Replays the in-game guidance without touching career progress or history. */
export function resetPitchDuelTutorials(): void {
  const current = getSnapshot();
  if (current.tutorialSeen.length === 0) return;
  write({ ...current, tutorialSeen: [] });
}

export function resetPitchDuelProgress(): void {
  write(emptyProgress);
}

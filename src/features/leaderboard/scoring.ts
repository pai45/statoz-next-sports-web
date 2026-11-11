import type {
  GameMode,
  LeaderboardType,
  ScoreMeta,
  MatchesBoard,
  TournamentScope,
} from "./types";

/**
 * How a board reads the field.
 *
 * Every rival has exactly one canonical XP; a board is a lens on it, never a
 * separate table of numbers. Keeping the arithmetic here — pure, with no store
 * or hook behind it — is what makes that checkable.
 */

export const leaderboardTypeOrder: LeaderboardType[] = ["matches", "games"];

export const matchesBoardOrder: MatchesBoard[] = ["players", "teams"];

export const tournamentScopeOrder: TournamentScope[] = [
  "weekly",
  "season",
  "allTime",
];

export function jsSafeHash(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 0x7fffffff;
  }
  return hash;
}

/** An empty record stays at zero, and no score drops below it. */
export function leagueAdjustedScore(base: number, leagueId: string): number {
  if (base <= 0) return 0;
  return Math.max(0, base + (jsSafeHash(leagueId) % 700) - 320);
}

/** What the score column is measured in. */
export function scoreMetaFor(
  type: LeaderboardType,
  isTeamBoard: boolean,
): ScoreMeta {
  if (isTeamBoard) return { unit: "PTS" };
  return { unit: type === "games" ? "W" : "XP" };
}

/** A season is six weeks of play, and all-time is twenty-seven. */
function weeksIn(scope: TournamentScope): number {
  return scope === "weekly" ? 1 : scope === "season" ? 6 : 27;
}

/** A rival's canonical XP, read through the active board's lens. */
export function scoreFor(
  type: LeaderboardType,
  base: number,
  scope: TournamentScope,
  mode: GameMode,
  leagueId: string,
): number {
  switch (type) {
    case "matches":
      return leagueAdjustedScore(base * weeksIn(scope), leagueId);
    case "games":
      // Wins, not XP — a rough weekly win count with a nudge per mode.
      if (base <= 0) return 0;
      return Math.max(0, Math.round(base / 55) + (jsSafeHash(mode) % 9) - 4) * weeksIn(scope);
  }
}

/**
 * Places a scored field in order. The board ranks on the score it shows, so
 * the numbers always read top-down; equal scores fall back to the name, which
 * keeps the order stable between renders.
 */
export function rankByScore<T extends { name: string; score: number }>(field: readonly T[]): (T & { rank: number })[] {
  return [...field]
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

/** Entries whose name holds every word of the query; two characters minimum. */
export function searchEntries<T extends { name: string }>(entries: readonly T[], query: string): T[] {
  const normalized = query.trim().toLocaleLowerCase().replace(/\s+/g, " ");
  if (normalized.length < 2) return [];
  const words = normalized.split(" ");
  return entries.filter((entry) => words.every((word) => entry.name.toLocaleLowerCase().includes(word)));
}

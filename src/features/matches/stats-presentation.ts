import type { MatchDetailScoreboard, SportMatch } from "@/domain/matches";

export function statText(value: string | number | null | undefined): string {
  if (value == null || (typeof value === "number" && !Number.isFinite(value))) return "—";
  return String(value).trim() || "—";
}

/** Amounts, not a judgement about which side performed better. */
export function comparisonShares(home: number | undefined, away: number | undefined) {
  if (home == null || away == null || !Number.isFinite(home) || !Number.isFinite(away) || home < 0 || away < 0) return null;
  const total = home + away;
  return total === 0 ? { home: 0, away: 0 } : { home: home / total, away: away / total };
}

export function tennisSetRows(match: Pick<SportMatch, "tennisSets">, scoreboard: Pick<MatchDetailScoreboard, "scoreRows">) {
  if (match.tennisSets?.length) return match.tennisSets.map((set, index) => ({
    label: `Set ${index + 1}`, home: statText(set.homeScore), away: statText(set.awayScore),
  }));
  return scoreboard.scoreRows.map(row => ({ label: row.label, home: statText(row.home), away: statText(row.away) }));
}

export function matchTabFromHash(hash: string): "stats" | "picks" | null {
  return hash === "#stats" ? "stats" : hash === "#picks" ? "picks" : null;
}

export function traceIndexForKey(key: string, index: number, points: number): number | null {
  const last = Math.max(0, points - 1);
  if (key === "Home") return 0;
  if (key === "End") return last;
  if (key === "ArrowRight" || key === "ArrowUp") return Math.min(last, index + 1);
  if (key === "ArrowLeft" || key === "ArrowDown") return Math.max(0, index - 1);
  return null;
}

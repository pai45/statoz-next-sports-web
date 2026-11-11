import type { TournamentScope } from "./types";

const dayMs = 86_400_000;

/**
 * The stretch of time a board counts. Weekly boards turn over on Monday at
 * 00:00 UTC and seasons follow calendar quarters; all-time never closes, so it
 * has no `end`.
 */
export type LeaderboardWindow = {
  id: string;
  start: number | null;
  end: number | null;
  label: string;
};

export function leaderboardWindow(scope: TournamentScope, now: number): LeaderboardWindow {
  const date = new Date(now);
  const year = date.getUTCFullYear();
  if (scope === "allTime") return { id: "all-time", start: null, end: null, label: "All-time" };
  if (scope === "season") {
    const quarter = Math.floor(date.getUTCMonth() / 3);
    return {
      id: `season:${year}-Q${quarter + 1}`,
      start: Date.UTC(year, quarter * 3, 1),
      end: Date.UTC(year, quarter * 3 + 3, 1),
      label: `${year} Season ${quarter + 1}`,
    };
  }
  const start = Date.UTC(year, date.getUTCMonth(), date.getUTCDate()) - ((date.getUTCDay() + 6) % 7) * dayMs;
  return {
    id: `week:${new Date(start).toISOString().slice(0, 10)}`,
    start,
    end: start + 7 * dayMs,
    label: `Week of ${new Date(start).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })}`,
  };
}

/** `4d 6h` while days remain, then `5h 12m`. */
export function leaderboardCountdown(end: number, now: number): string {
  const minutes = Math.max(0, Math.ceil((end - now) / 60_000));
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor(minutes / 60) % 24;
  return days > 0 ? `${days}d ${hours}h` : `${hours}h ${minutes % 60}m`;
}

/**
 * `9 Nov – 15 Nov 2026`: the period's first and last day. Periods run on UTC
 * days, so the days are read in UTC; a local zone would push the last day
 * forward or back depending on where the viewer is.
 */
export function windowRange(period: LeaderboardWindow): string | null {
  if (period.start === null || period.end === null) return null;
  const from = new Date(period.start).toLocaleDateString(undefined, { day: "numeric", month: "short", timeZone: "UTC" });
  const to = new Date(period.end - 1).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  return `${from} – ${to}`;
}

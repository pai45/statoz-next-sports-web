import {
  dayKeyFor,
  formatResetCountdown,
  parseDayKey,
} from "../guess-player/engine/day-keys";

/**
 * The daily calendar every daily game shares.
 *
 * Days are the player's local days, keyed `yyyy-mm-dd`, the same keys Guess
 * the Player and Bingo already store, so one day means the same thing in every
 * card on the hub. The helpers are re-exported rather than copied so the two
 * can never drift.
 */

export { dayKeyFor, formatResetCountdown, parseDayKey };

/**
 * Day one of the numbered dailies. Puzzle `#N` is the Nth local day since this
 * date, which gives every share line a stable number that is the same for
 * everyone playing on that day.
 */
export const dailyEpochKey = "2026-01-01";

const millisPerDay = 86_400_000;

/** Today's key for the player's local clock. */
export function todayKey(now: Date = new Date()): string {
  return dayKeyFor(now);
}

/**
 * Whole days from the epoch to `dayKey`, zero-based. Uses noon on both sides
 * so a daylight-saving shift can never round a day away.
 */
export function dayIndexFor(dayKey: string): number {
  const epoch = parseDayKey(dailyEpochKey);
  const day = parseDayKey(dayKey);
  if (!epoch || !day) return 0;
  const noon = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12).getTime();
  return Math.max(0, Math.round((noon(day) - noon(epoch)) / millisPerDay));
}

/** The public puzzle number, `#1` on the epoch day. */
export function dailyNumberFor(dayKey: string): number {
  return dayIndexFor(dayKey) + 1;
}

/** Milliseconds until the next local midnight. */
export function msUntilNextDay(now: Date = new Date()): number {
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return Math.max(0, tomorrow.getTime() - now.getTime());
}

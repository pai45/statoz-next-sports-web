import { dayIndexFor } from "../../daily/day";
import { dailySlice } from "../../daily/seeded";
import { maxGuesses, whoAreYaXp, type WhoAreYaSport } from "../constants";
import { poolFor, type WhoAthlete } from "./pool";

export { maxGuesses, whoAreYaXp };

/** Bumped only if the dealing rule changes, so shared days are never re-dealt. */
const seedVersion = "v1";

/**
 * The mystery player for a sport on a day: the same for everyone, and no
 * repeat until the sport's whole pool has been used once.
 */
export function mysteryFor(sport: WhoAreYaSport, dayKey: string): WhoAthlete | null {
  const pool = poolFor(sport);
  const [index] = dailySlice(pool.length, `who-are-ya:${seedVersion}:${sport}`, dayIndexFor(dayKey), 1);
  return index === undefined ? null : pool[index];
}

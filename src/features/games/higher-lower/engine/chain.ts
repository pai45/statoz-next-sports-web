import { playerRoleSports, type PlayerCard } from "@/domain/cards";
import type { Sport } from "@/domain/sports";
import { allPlayerCards } from "@/features/packs/data/catalog";

import { dayIndexFor } from "../../daily/day";
import { seededRandom } from "../../daily/seeded";
import { dailyRounds } from "../constants";

/**
 * Higher or Lower on StatOz card ratings.
 *
 * A chain of players from one sport: the first rating is shown, and each round
 * asks whether the next player is rated higher or lower than the last. The
 * ratings are the app's own card ratings (the same numbers on every card in
 * packs and decks), so the game is consistent with the rest of StatOz.
 *
 * Neighbours in a chain never share a rating, so every round has an answer.
 */

export function poolFor(sport: Sport): PlayerCard[] {
  return allPlayerCards.filter((card) => playerRoleSports[card.role] === sport).sort((a, b) => a.id.localeCompare(b.id));
}

/** A chain of `length` players with no two neighbours rated the same. */
export function chainFromSeed(sport: Sport, seed: string, length: number): PlayerCard[] {
  const pool = poolFor(sport);
  if (pool.length < 2) return [];
  const random = seededRandom(seed);
  const chain: PlayerCard[] = [];
  const used = new Set<string>();
  let guard = 0;
  while (chain.length < length && guard < length * 200) {
    guard += 1;
    const candidate = pool[Math.floor(random() * pool.length)];
    if (used.has(candidate.id)) continue;
    const last = chain.at(-1);
    if (last && last.rating === candidate.rating) continue;
    chain.push(candidate);
    used.add(candidate.id);
  }
  return chain;
}

/** Today's chain for a sport: `dailyRounds` guesses means one more player. */
export function dailyChain(sport: Sport, dayKey: string): PlayerCard[] {
  return chainFromSeed(sport, `higher-lower:v1:${sport}:${dayIndexFor(dayKey)}`, dailyRounds + 1);
}

export type Call = "higher" | "lower";

/** Whether `call` about `next` against `previous` is right. */
export function isRightCall(previous: PlayerCard, next: PlayerCard, call: Call): boolean {
  return call === "higher" ? next.rating > previous.rating : next.rating < previous.rating;
}

import { penaltyDirections, type PenaltyDirection } from "../types";
import type { RandomSource } from "../../shared/engine/random-source";

/**
 * A source of uniform randomness, so the engine stays pure and seedable. It
 * lives in `shared` now that a second game needs it, and is re-exported here so
 * the shootout's own modules keep importing it from where they always did.
 */
export type { RandomSource };

/** How sharply the CPU reads the player, ramping to its ceiling at level 12. */
export function cpuSmartness(level: number): number {
  return Math.min(1, level / 12);
}

/** The odds the CPU plays the read rather than guessing: 0.25 up to 0.60. */
export function readChanceForLevel(level: number): number {
  return 0.25 + 0.35 * cpuSmartness(level);
}

/**
 * The strictly most frequent direction, or null on no data — and also on a
 * tie, which is what sends the CPU back to a uniform guess rather than letting
 * it break the tie in some order the player could learn.
 */
export function mostFrequent(
  directions: PenaltyDirection[],
): PenaltyDirection | null {
  if (directions.length === 0) return null;

  const counts = new Map<PenaltyDirection, number>();
  for (const direction of directions) {
    counts.set(direction, (counts.get(direction) ?? 0) + 1);
  }

  const best = Math.max(...counts.values());
  const leaders = [...counts.entries()].filter(([, count]) => count === best);
  return leaders.length === 1 ? leaders[0][0] : null;
}

export type CpuDirectionInput = {
  level: number;
  /** Every direction the player has shot in this shootout so far. */
  playerShots: PenaltyDirection[];
  /** Every direction the player has dived in this shootout so far. */
  playerDives: PenaltyDirection[];
  /** Whether the CPU is picking a dive (true) or a shot (false). */
  playerTaking: boolean;
  random: RandomSource;
};

/**
 * The CPU's pick for this kick.
 *
 * It draws once to decide whether to play the read, and may draw again to
 * choose among what is left. Both draws come before the goal roll — keep that
 * order if the engine is ever seeded, or replays will diverge.
 */
export function cpuDirection({
  level,
  playerShots,
  playerDives,
  playerTaking,
  random,
}: CpuDirectionInput): PenaltyDirection {
  if (random() < readChanceForLevel(level)) {
    if (playerTaking) {
      // As keeper, dive toward wherever the player keeps shooting.
      const habit = mostFrequent(playerShots);
      if (habit) return habit;
    } else {
      // As shooter, aim anywhere but wherever the player keeps diving.
      const habit = mostFrequent(playerDives);
      if (habit) {
        const options = penaltyDirections.filter(
          (direction) => direction !== habit,
        );
        return options[Math.floor(random() * options.length)];
      }
    }
  }

  return penaltyDirections[Math.floor(random() * penaltyDirections.length)];
}

import type { QuizMode } from "../quiz/types";

/**
 * The shape of a Daily Quiz: five questions, the same for everyone on the day,
 * dealt from the authored ladder pools without touching ladder progress.
 *
 * Two easy, two medium, one hard, in that order, so the run ramps the way a
 * ladder set does but in a minute instead of ten.
 */
export const dailyQuizMix: readonly { mode: QuizMode; count: number }[] = [
  { mode: "easy", count: 2 },
  { mode: "medium", count: 2 },
  { mode: "hard", count: 1 },
];

export const dailyQuizLength = dailyQuizMix.reduce((sum, part) => sum + part.count, 0);

/** Seconds on the clock for each question. Running out counts as a miss. */
export const secondsPerQuestion = 15;

/** An answer inside this many seconds earns the speed bonus. */
export const speedBonusWindowSeconds = 5;

/** XP added for a correct answer inside the speed window. */
export const speedBonusXp = 1;

/**
 * Bumped if the dealing rule ever changes, so a new rule cannot silently
 * re-deal days people have already played and shared.
 */
export const dailyQuizSeedVersion = "v1";

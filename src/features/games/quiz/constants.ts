import type { QuizMode } from "./types";

/**
 * The shape of a Knowledge Arena ladder.
 *
 * Every mode is fifty numbered sets of ten questions, authored in five bands of
 * a hundred. The bands are how difficulty ramps across the ladder — band 1 is a
 * mode's gentlest rung, band 5 its hardest — and they are also how the question
 * files are written, so the two must agree.
 */

export const setCount = 50;
export const questionsPerSet = 10;

/** Sets covered by one authored band. Five bands span the ladder. */
export const setsPerBand = 10;
export const bandCount = setCount / setsPerBand;
export const bandSize = questionsPerSet * setsPerBand;

/**
 * Coins charged to replay a set. The first play of every set is free: the
 * ladder is the quiz's main content, and charging for a first look at it made
 * the loop cost more than it ever paid back.
 */
export const entryCost = 25;

/**
 * Oz paid the first time each mastery star is earned on a set: the first,
 * second and third star respectively. Paid once per star per set, ever, so
 * replaying a set cannot farm them.
 */
export const starCoinRewards: readonly [number, number, number] = [5, 5, 10];

/**
 * Best-score threshold for the second mastery star. There is no pass gate —
 * finishing a set always clears it — so stars are the only reason to replay,
 * and the third one costs a flawless run.
 */
export const twoStarScore = 7;

/** The four modes, in ladder order. */
export const quizModes: QuizMode[] = ["easy", "medium", "hard", "global"];

/**
 * XP paid per correct answer. Every correct answer pays, whatever the final
 * score — there is no pass gate. It lives here rather than with the modes'
 * colours and glyphs because the ladder's own arithmetic depends on it, and
 * that must not have to reach through the design system to find it.
 */
export const modeRewards: Record<QuizMode, number> = {
  easy: 1,
  medium: 2,
  hard: 4,
  global: 5,
};

import type { Sport } from "@/domain/sports";

import { modeRewards } from "../../quiz/constants";
import type { QuizMode, TriviaQuestion } from "../../quiz/types";
import { dayIndexFor } from "../../daily/day";
import { dailySlice } from "../../daily/seeded";
import {
  dailyQuizMix,
  dailyQuizSeedVersion,
  speedBonusWindowSeconds,
  speedBonusXp,
} from "../constants";

/**
 * Which questions a sport's Daily Quiz deals on a given day.
 *
 * Each mode walks its own seeded permutation of its pool, `count` questions a
 * day, so a question does not come back until the whole pool has been dealt:
 * with five hundred questions per mode that is 250 days of easy and medium and
 * 500 of hard before any repeat. Pure, so it can be tested without a browser.
 */
export function dailyQuizQuestions(
  sport: Sport,
  dayKey: string,
  pools: Partial<Record<QuizMode, TriviaQuestion[]>>,
): TriviaQuestion[] {
  const dayIndex = dayIndexFor(dayKey);
  const questions: TriviaQuestion[] = [];
  for (const { mode, count } of dailyQuizMix) {
    const pool = pools[mode] ?? [];
    const seed = `daily-quiz:${dailyQuizSeedVersion}:${sport}:${mode}`;
    for (const index of dailySlice(pool.length, seed, dayIndex, count)) {
      questions.push(pool[index]);
    }
  }
  return questions;
}

/** XP one answer is worth: the mode's rate, plus the speed bonus. */
export function answerXp(
  question: TriviaQuestion,
  correct: boolean,
  secondsTaken: number,
): number {
  if (!correct) return 0;
  const bonus = secondsTaken <= speedBonusWindowSeconds ? speedBonusXp : 0;
  return modeRewards[question.mode] + bonus;
}

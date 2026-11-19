import { quizModes, setCount } from "../constants";
import type { QuizMode, QuizProgress } from "../types";
import { completedCount, modeProgressOf, nextChallenge, setProgressOf, isSetUnlocked } from "./ladder";

export function continueTarget(progress: QuizProgress): { mode: QuizMode; set: number; started: boolean } {
  let best: { mode: QuizMode; cleared: number } | null = null;
  for (const mode of quizModes) {
    const cleared = completedCount(modeProgressOf(progress, mode));
    if (cleared > 0 && cleared < setCount && (!best || cleared > best.cleared)) best = { mode, cleared };
  }
  const started = quizModes.some(mode => completedCount(modeProgressOf(progress, mode)) > 0);
  const mode = best?.mode ?? quizModes.find(mode => completedCount(modeProgressOf(progress, mode)) < setCount) ?? "easy";
  return { mode, set: nextChallenge(modeProgressOf(progress, mode), setCount), started };
}

/** Quick continue never silently spends coins or starts unavailable content. */
export function canContinue(progress: QuizProgress, mode: QuizMode, set: number, authored: number): boolean {
  const ladder = modeProgressOf(progress, mode);
  return set <= authored && isSetUnlocked(ladder, set) && setProgressOf(ladder, set).attempts === 0;
}

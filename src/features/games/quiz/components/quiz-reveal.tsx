"use client";
import { ArrowRightIcon } from "@statoz/design-system/web";
import type { Sport } from "@/domain/sports";
import { levelProgress } from "@/domain/progression";
import { modeLabels } from "@/mocks/games/quiz";
import type { AnswerResult, QuizMode, SetOutcome } from "../types";
import { ArenaBackdrop, ArenaHeader, ArenaStars, arenaTheme } from "./arena-shell";
import styles from "./arena.module.css";

export type QuizRevealProps = { sport: Sport; mode: QuizMode; setNumber: number; results: AnswerResult[]; totalXp: number; xpBefore: number; outcome: SetOutcome; bestStreak: number; coinsEarned: number; replayCost: number; hasNextSet: boolean; onNext: () => void; onReplay: () => void; onDone: () => void };
export function QuizReveal({ sport, mode, setNumber, results, totalXp, xpBefore, outcome, bestStreak, coinsEarned, replayCost, hasNextSet, onNext, onReplay, onDone }: QuizRevealProps) {
  const correct = results.filter(result => result.correct).length;
  const perfect = correct === results.length;
  const level = levelProgress(xpBefore + totalXp);
  return <section className={styles.arena} style={arenaTheme(sport)}>
    <ArenaBackdrop sport={sport} />
    <ArenaHeader sport={sport} title="Your result" onBack={onDone} />
    <div className={styles.results}>
      <div>
        <p className={styles.eyebrow}>{modeLabels[mode]} / SET {String(setNumber).padStart(2, "0")}</p>
        <h2 className={styles.resultTitle}>{perfect ? "A perfect performance." : "Another set. More knowledge."}</h2>
        <p className={styles.score}>{correct}<small> / {results.length}</small></p>
        <p className={styles.resultCaption}>CORRECT ANSWERS / BEST STREAK {bestStreak}{correct > outcome.bestBefore ? " / NEW BEST" : ""}</p>
        <ArenaStars count={outcome.stars} large />
        <p className={styles.resultCaption}>{outcome.starsGained > 0 ? `+${outcome.starsGained} new mastery stars` : "Your best mastery record is kept"}</p>
        <div className={styles.rewardGrid}><div><strong>+{totalXp}</strong><span>XP banked</span></div><div><strong>+{coinsEarned}</strong><span>Oz from new stars</span></div></div>
        {totalXp === 0 && outcome.bestBefore > 0 && <p className={styles.resultCaption}>Beat your best of {outcome.bestBefore}/{results.length} to bank more XP.</p>}
        <div className={styles.level}><span>Level {level.level}</span><span>{level.intoLevel}/{level.levelSpan} XP</span></div><progress className={styles.levelProgress} value={level.fraction} max={1} aria-label="Level progress" />
      </div>
      <div>
        <p className={styles.eyebrow}>KEEP THE MOMENTUM</p>
        <h2 className={styles.briefTitle}>{hasNextSet ? `Set ${setNumber + 1} is ready.` : "Your path, your pace."}</h2>
        <p className={styles.bodyCopy}>{hasNextSet ? "Take your knowledge to the next challenge, or revisit this one to improve your best." : "Explore your sets and turn every score into a personal best."}</p>
        <button className={styles.primary} onClick={hasNextSet ? onNext : onDone}>{hasNextSet ? `Play next set / ${setNumber + 1}` : "Back to sets"}<ArrowRightIcon size={20} /></button>
        <button className={styles.secondary} onClick={onReplay}>Replay set / {replayCost} Oz</button>
        {hasNextSet && <button className={styles.secondary} onClick={onDone}>Back to sets</button>}
        <details className={styles.review}><summary>Review all {results.length} answers</summary><ol>
          {results.map((result, index) => <li key={index}><span className={styles.reviewState} data-correct={result.correct}>{String(index + 1).padStart(2, "0")} / {result.correct ? "CORRECT" : "INCORRECT"}</span><strong>{result.prompt}</strong><p>Your answer: {result.pickedLabel}</p>{!result.correct && <p>Correct answer: {result.correctLabel}</p>}</li>)}
        </ol></details>
      </div>
    </div>
  </section>;
}

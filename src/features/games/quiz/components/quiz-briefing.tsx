"use client";
import type { Sport } from "@/domain/sports";
import { modeLabels } from "@/mocks/games/quiz";
import { entryCost, modeRewards, questionsPerSet } from "../constants";
import type { QuizMode } from "../types";
import { ArenaDialog, sportNames } from "./arena-shell";
import styles from "./arena.module.css";
export type QuizBriefingProps = { sport: Sport; mode: QuizMode; setNumber: number; coins: number; onCancel: () => void; onStart: () => void };
export function QuizBriefing({ sport, mode, setNumber, coins, onCancel, onStart }: QuizBriefingProps) {
  const canAfford = coins >= entryCost;
  return <ArenaDialog title="Another shot at mastery" onClose={onCancel}>
    <p className={styles.eyebrow}>{sportNames[sport]} / {modeLabels[mode]}</p>
    <p className={styles.briefTitle}>Replay set {String(setNumber).padStart(2, "0")}</p>
    <p className={styles.bodyCopy}>{questionsPerSet} questions. Beat your best to bank more XP and earn any missing stars.</p>
    <dl className={styles.briefStats}><div><dt>Replay entry</dt><dd>{entryCost} Oz</dd></div><div><dt>Your balance</dt><dd>{coins} Oz</dd></div><div><dt>Per additional correct answer</dt><dd>+{modeRewards[mode]} XP</dd></div></dl>
    {!canAfford && <p role="status" className={styles.warning}>You need {entryCost - coins} more Oz to replay this set. First plays of unlocked sets are free.</p>}
    <button className={styles.primary} disabled={!canAfford} onClick={onStart}>Replay for {entryCost} Oz <span aria-hidden="true">&rarr;</span></button>
    <button className={styles.secondary} onClick={onCancel}>Back to sets</button>
  </ArenaDialog>;
}

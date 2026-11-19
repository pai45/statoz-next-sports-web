"use client";
import { LockIcon, PlayArrowIcon, ScheduleIcon } from "@statoz/design-system/web";
import { starsFor } from "../state/ladder";
import type { QuizMode, QuizSetProgress, QuizSetVisualState } from "../types";
import { ArenaStars } from "./arena-shell";
import styles from "./arena.module.css";
export type QuizSetTileProps = { mode: QuizMode; setNumber: number; progress: QuizSetProgress; state: QuizSetVisualState; launching: boolean; onOpen: () => void };
export function QuizSetTile({ setNumber, progress, state, launching, onOpen }: QuizSetTileProps) {
  const disabled = state === "locked" || state === "upcoming";
  const label = state === "locked" ? `Finish set ${setNumber - 1} first` : state === "upcoming" ? "Coming soon" : state === "mastered" ? "Mastered" : state === "cleared" ? "Cleared ? Replay" : "Play";
  return <button className={styles.setTile} data-state={state} disabled={disabled || launching} onClick={onOpen} aria-label={`Set ${setNumber}. ${label}. ${starsFor(progress.bestCorrect)} stars`}>
    <span className={styles.setNumber}>{String(setNumber).padStart(2, "0")}</span>
    <span className={styles.setSymbol} aria-hidden="true">{state === "locked" ? <LockIcon size={17} /> : state === "upcoming" ? <ScheduleIcon size={17} /> : state === "available" ? <PlayArrowIcon size={17} /> : null}</span>
    {progress.completed ? <ArenaStars count={starsFor(progress.bestCorrect)} /> : <span className={styles.setLabel}>{state === "locked" ? "Locked" : state === "upcoming" ? "Soon" : "Play"}</span>}
    {launching && <span className={styles.srOnly}>Opening</span>}
  </button>;
}

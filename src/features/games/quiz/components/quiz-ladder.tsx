"use client";
import { useEffect, useRef, type CSSProperties } from "react";
import { ArrowRightIcon } from "@statoz/design-system/web";
import type { Sport } from "@/domain/sports";
import { bandNames, firstSetOfBand, modeAccent, modeLabels } from "@/mocks/games/quiz";
import { setCount } from "../constants";
import { completedCount, nextChallenge, setProgressOf, starCount, visualStateFor } from "../state/ladder";
import type { QuizMode, QuizModeProgress } from "../types";
import { QuizSetTile } from "./quiz-set-tile";
import styles from "./arena.module.css";

export type QuizLadderProps = { sport: Sport; mode: QuizMode; progress: QuizModeProgress; authoredSets: number; launchingSet: number | null; onOpenSet: (set: number) => void };
export function QuizLadder({ mode, progress, authoredSets, launchingSet, onOpenSet }: QuizLadderProps) {
  const next = nextChallenge(progress, authoredSets);
  const cleared = completedCount(progress);
  const complete = authoredSets > 0 && cleared >= authoredSets;
  const chapter = useRef<HTMLElement>(null);
  useEffect(() => { if (next > 10) chapter.current?.scrollIntoView({ block: "nearest" }); }, [next]);
  return <div className={styles.content} style={{ "--arena-accent": modeAccent(mode) } as CSSProperties}>
    <section className={styles.challenge}>
      <div><p className={styles.eyebrow}>{authoredSets === 0 ? "MORE TO COME" : complete ? "PATH COMPLETE" : "YOUR NEXT CHALLENGE"}</p>
        <h2>{authoredSets === 0 ? "This path is warming up." : complete ? "You've cleared the path." : <>Set {String(next).padStart(2, "0")}<span> / {modeLabels[mode]}</span></>}</h2>
        <p>{authoredSets === 0 ? "Questions are unavailable right now. Return to the arena and try another path." : complete ? "Revisit a set below and chase all three mastery stars." : "10 questions. One step closer. Your first play is free."}</p>
      </div>
      {authoredSets > 0 && !complete && <button className={styles.primary} onClick={() => onOpenSet(next)}>Play set {next}<ArrowRightIcon size={20} /></button>}
    </section>
    <div className={styles.sectionHeading}><h2>Your climb</h2><span>{cleared}/{setCount} sets / {starCount(progress)} stars</span></div>
    <div className={styles.chapters}>
      {bandNames.map((name, index) => <section key={name} ref={index === Math.floor((next - 1) / 10) ? chapter : undefined} className={styles.chapter}>
        <div className={styles.chapterHeading}><span>0{index + 1}</span><h3>{name}</h3><small>SETS {firstSetOfBand(index)}-{firstSetOfBand(index) + 9}</small></div>
        <div className={styles.setGrid}>{Array.from({ length: 10 }, (_, offset) => {
          const set = firstSetOfBand(index) + offset;
          return <QuizSetTile key={set} mode={mode} setNumber={set} progress={setProgressOf(progress, set)} state={visualStateFor(progress, set, authoredSets)} launching={launchingSet === set} onOpen={() => onOpenSet(set)} />;
        })}</div>
      </section>)}
    </div>
    <p className={styles.footerNote}>Finish any set to unlock the next. Replay for 25 Oz to improve your best.</p>
  </div>;
}

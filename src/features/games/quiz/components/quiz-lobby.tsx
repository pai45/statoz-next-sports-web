"use client";

import { useState, type CSSProperties } from "react";
import { ArrowRightIcon, Glyph, MoreIcon } from "@statoz/design-system/web";
import type { Sport } from "@/domain/sports";
import { DailyDrop } from "@/features/packs";
import { GameLeaderboardCta } from "../../components/game-leaderboard-cta";
import type { GameId } from "../../types";
import { modeAccent, modeBlurb, modeGlyph, modeLabels } from "@/mocks/games/quiz";
import { questionsPerSet, quizModes, setCount } from "../constants";
import { continueTarget } from "../state/continue-target";
import { clearedAcross, completedCount, modeProgressOf, nextChallenge, starCount } from "../state/ladder";
import type { QuizMode, QuizProgress } from "../types";
import { ArenaBackdrop, ArenaDialog, ArenaHeader, arenaTheme, sportNames } from "./arena-shell";
import styles from "./arena.module.css";

export type QuizLobbyProps = { sport: Sport; progress: QuizProgress; loadingMode: QuizMode | null; onPickMode: (mode: QuizMode) => void; onContinue: () => void; onLeave: () => void };
export function QuizLobby({ sport, progress, loadingMode, onPickMode, onContinue, onLeave }: QuizLobbyProps) {
  const [menu, setMenu] = useState(false);
  const cleared = clearedAcross(progress, quizModes);
  const total = setCount * quizModes.length;
  const stars = quizModes.reduce((sum, mode) => sum + starCount(modeProgressOf(progress, mode)), 0);
  const target = continueTarget(progress);
  const complete = cleared === total;
  return <section className={styles.arena} style={arenaTheme(sport)}>
    <ArenaHeader sport={sport} title="Knowledge Arena" onBack={onLeave}>
      <button className={styles.iconButton} aria-label="Arena menu" onClick={() => setMenu(true)}><MoreIcon size={24} /></button>
    </ArenaHeader>
    <div className={styles.hero}>
      <ArenaBackdrop sport={sport} hero />
      <div className={styles.heroContent}>
        <p className={styles.eyebrow}>THE {sportNames[sport].toUpperCase()} CHALLENGE</p>
        <h2>KNOWLEDGE<br /><span>ARENA.</span></h2>
        <p className={styles.heroCopy}>You know the game.<br />Now prove it.</p>
        <div className={styles.heroStats}>
          <div><strong>{cleared}<small>/{total}</small></strong><span>Sets cleared</span></div>
          <div><strong>{stars}</strong><span>Mastery stars</span></div>
          <div><strong>{Math.round(cleared / total * 100)}<small>%</small></strong><span>Arena complete</span></div>
        </div>
        <button className={styles.primary} disabled={loadingMode !== null} aria-busy={loadingMode !== null} onClick={onContinue}>
          <span>{loadingMode ? "Opening challenge..." : complete ? "Explore your sets" : target.started ? "Continue your climb" : "Enter the arena"}</span><ArrowRightIcon size={22} />
        </button>
        <p className={styles.ctaCaption}>{complete ? "Every path cleared. Chase your perfect scores." : `${modeLabels[target.mode]} / SET ${target.set} / ${questionsPerSet} QUESTIONS / FIRST PLAY FREE`}</p>
      </div>
      <div className={styles.heroSignature} aria-hidden="true"><span>01 - 50</span><span>FOUR PATHS.<br />ONE ARENA.</span></div>
    </div>
    <div className={styles.content}>
      <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>PICK YOUR CHALLENGE</p><h2>How well do you know it?</h2></div><span>4 paths / 50 sets each</span></div>
      <div className={styles.modeGrid}>
        {quizModes.map((mode, index) => {
          const ladder = modeProgressOf(progress, mode);
          const count = completedCount(ladder);
          return <button key={mode} className={styles.modeCard} style={{ "--mode": modeAccent(mode) } as CSSProperties} disabled={loadingMode !== null} onClick={() => onPickMode(mode)} aria-label={`${modeLabels[mode]}, ${count} of ${setCount} sets cleared. Open sets`}>
            <div className={styles.modeTop}><span className={styles.modeNumber}>0{index + 1}</span><Glyph name={modeGlyph(mode, sport)} size={25} /></div>
            <h3>{modeLabels[mode]}</h3><p>{modeBlurb(mode, sport)}</p>
            <div className={styles.modeMeter}><span style={{ width: `${count / setCount * 100}%` }} /></div>
            <div className={styles.modeFooter}><span>{count}/{setCount} cleared</span><ArrowRightIcon size={19} /></div>
            <span className={styles.modeNext}>{loadingMode === mode ? "Loading..." : count === setCount ? "All sets cleared" : `Next up / Set ${nextChallenge(ladder, setCount)}`}</span>
          </button>;
        })}
      </div>
      <p className={styles.footerNote}>From the basics to the moments only a true fan remembers.</p>
    </div>
    {menu && <ArenaDialog title="Your arena" onClose={() => setMenu(false)}>
      <div className={styles.instructions}><p className={styles.eyebrow}>HOW TO PLAY</p><h3>Ten questions. Make them count.</h3><p>Choose a path and finish a set to unlock the next. First plays are free; replays cost 25 Oz. Earn one star for a correct answer, two for 7/10, and three for a perfect 10.</p><p>New stars earn 5, 5 and 10 Oz. Beat your best score to bank more XP. Answers advance after three seconds; the final question waits for you.</p></div>
      <GameLeaderboardCta sport={sport} gameId={`${sport}-quiz` as GameId} /><DailyDrop sport={sport} />
    </ArenaDialog>}
  </section>;
}

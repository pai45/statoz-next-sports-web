"use client";

import Link from "next/link";
import type { CSSProperties } from "react";

import { Glyph, StarIcon } from "@statoz/design-system/web";
import type { Sport } from "@/domain/sports";
import { modeAccent, modeBlurb, modeGlyph, modeLabels } from "@/mocks/games/quiz";

import { questionsPerSet, quizModes, setCount } from "../quiz/constants";
import { completedCount, maxStars, modeProgressOf, nextChallenge, setProgressOf, starCount, starsFor } from "../quiz/state/ladder";
import { progressForSport, useQuizRecord } from "../quiz/state/quiz-progress";
import type { QuizMode, QuizProgress } from "../quiz/types";
import styles from "./hub.module.css";
import { PlayMark } from "./quiz-cover";

/**
 * The quiz ladder, surfaced on the hub as a game would: one save slot that
 * starts your next set in a single tap, and a level select of the four paths.
 */

export function quizHref(sport: Sport, mode?: QuizMode, set?: number): string {
  const params = new URLSearchParams();
  if (mode) params.set("mode", mode);
  if (set) params.set("set", String(set));
  const query = params.toString();
  return `/play/quiz/${sport}${query ? `?${query}` : ""}`;
}

/**
 * The path to pick up: the one with the most progress that is not finished.
 * A fresh player starts at easy, set one.
 */
export function continueTarget(progress: QuizProgress): { mode: QuizMode; set: number; started: boolean } {
  let best: { mode: QuizMode; cleared: number } | null = null;
  for (const mode of quizModes) {
    const cleared = completedCount(modeProgressOf(progress, mode));
    if (cleared === 0 || cleared >= setCount) continue;
    if (!best || cleared > best.cleared) best = { mode, cleared };
  }
  if (!best) {
    const anyStarted = quizModes.some((mode) => completedCount(modeProgressOf(progress, mode)) > 0);
    const mode = anyStarted ? quizModes.find((m) => completedCount(modeProgressOf(progress, m)) < setCount) ?? "easy" : "easy";
    return { mode, set: nextChallenge(modeProgressOf(progress, mode), setCount), started: anyStarted };
  }
  return { mode: best.mode, set: nextChallenge(modeProgressOf(progress, best.mode), setCount), started: true };
}

/** CONTINUE, as a save slot: the path, the set, the climb so far. */
export function QuizContinue({ sport }: { sport: Sport }) {
  const progress = progressForSport(useQuizRecord(), sport);
  const target = continueTarget(progress);
  const ladder = modeProgressOf(progress, target.mode);
  const set = setProgressOf(ladder, target.set);
  const cleared = completedCount(ladder);
  const sub =
    set.attempts > 0
      ? `Best ${set.bestCorrect}/${questionsPerSet} · ${starsFor(set.bestCorrect)}/3 stars · replay for more`
      : target.started
        ? `${cleared}/${setCount} sets cleared · first play of every set is free`
        : `Your first set · ${questionsPerSet} questions · free`;

  return (
    <Link
      href={quizHref(sport, target.mode, target.set)}
      className={styles.slot}
      style={{ "--slot": modeAccent(target.mode) } as CSSProperties}
      aria-label={`Continue: ${modeLabels[target.mode]} path, set ${target.set}. ${sub}`}
    >
      <span className={styles.slotBadge} aria-hidden>
        <Glyph name={modeGlyph(target.mode, sport)} size={28} />
      </span>
      <span className="min-w-0">
        <span className={styles.slotKicker}>{target.started ? "CONTINUE" : "START HERE"} · {modeLabels[target.mode]} PATH</span>
        <span className={styles.slotTitle}>SET {target.set}</span>
        <span className={styles.slotSub}>{sub}</span>
        <span className={styles.slotMeter} aria-hidden>
          <span style={{ width: `${(cleared / setCount) * 100}%` }} />
        </span>
      </span>
      <span className={styles.slotGo} aria-hidden>
        <PlayMark size={14} /> {set.attempts > 0 ? "REPLAY" : "PLAY"}
      </span>
    </Link>
  );
}

/** The four paths as a level select. */
export function QuizPaths({ sport }: { sport: Sport }) {
  const progress = progressForSport(useQuizRecord(), sport);
  return (
    <ul className={styles.levels}>
      {quizModes.map((mode) => {
        const ladder = modeProgressOf(progress, mode);
        const cleared = completedCount(ladder);
        const stars = starCount(ladder);
        const accent = modeAccent(mode);
        return (
          <li key={mode}>
            <Link
              href={quizHref(sport, mode)}
              className={styles.level}
              style={{ "--level": accent } as CSSProperties}
              aria-label={`${modeLabels[mode]} path: ${cleared} of ${setCount} sets cleared, ${stars} of ${maxStars} stars`}
            >
              <span className={styles.levelTop}>
                <span className={styles.levelGlyph} aria-hidden>
                  <Glyph name={modeGlyph(mode, sport)} size={22} />
                </span>
                <Ring fraction={cleared / setCount} color={accent} label={`${Math.round((cleared / setCount) * 100)}%`} />
              </span>
              <p className={styles.levelName}>{modeLabels[mode]}</p>
              <p className={styles.levelBlurb}>{modeBlurb(mode, sport)}</p>
              <span className={styles.levelFoot}>
                <span>
                  <b>{cleared}</b>/{setCount} SETS
                </span>
                <span className={styles.stars}>
                  <StarIcon size={12} /> {stars}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function Ring({ fraction, color, label }: { fraction: number; color: string; label: string }) {
  const radius = 19;
  const circumference = 2 * Math.PI * radius;
  return (
    <span className={styles.levelRing} aria-hidden>
      <svg viewBox="0 0 46 46">
        <circle cx="23" cy="23" r={radius} fill="none" stroke="var(--ds-color-border-default)" strokeWidth="4" />
        <circle
          cx="23"
          cy="23"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeDasharray={`${circumference * Math.max(0.001, fraction)} ${circumference}`}
          style={{ filter: `drop-shadow(0 0 4px ${color})` }}
        />
      </svg>
      <span>{label}</span>
    </span>
  );
}

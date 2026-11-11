"use client";
import { typography } from "@statoz/design-system/web/tokens/typography";

import { useEffect, useRef } from "react";

import {
  AccentPanel,
  accentVar,
  ArrowRightIcon,
  Button,
  feedbackVar,
  Glyph,
  PremiumIcon,
  ScheduleIcon,
  StarIcon,
  LightbulbIcon,
  withAlpha,
} from "@statoz/design-system/web";
import type { Sport } from "@/domain/sports";

import { entryCost, questionsPerSet, setCount, starCoinRewards } from "../constants";
import { bandNames, firstSetOfBand, modeAccent, modeGlyph, modeLabels } from "@/mocks/games/quiz";
import {
  completedCount,
  maxStars,
  nextChallenge,
  setProgressOf,
  starCount,
  starsFor,
  visualStateFor,
} from "../state/ladder";
import type { QuizMode, QuizModeProgress, QuizSetProgress } from "../types";

import { QuizSetTile } from "./quiz-set-tile";
import styles from "./quiz.module.css";

/**
 * The fifty-set ladder of one mode.
 *
 * Sets are gated one behind the next, and the five chapters are the difficulty
 * bands the questions are actually authored in — so the selector is not a
 * paginator, it is the ladder's shape.
 *
 * On a phone one chapter shows at a time, as in the app. Once there is room all
 * fifty sets are on screen together with the chapters as headings, because the
 * thing a wide screen can do here is let you see the whole climb at once.
 */

const gold = accentVar("gold");

export type QuizLadderProps = {
  sport: Sport;
  mode: QuizMode;
  progress: QuizModeProgress;
  /** How many of the fifty sets the question file actually reaches. */
  authoredSets: number;
  launchingSet: number | null;
  onOpenSet: (setNumber: number) => void;
};

export function QuizLadder({
  sport,
  mode,
  progress,
  authoredSets,
  launchingSet,
  onOpenSet,
}: QuizLadderProps) {
  const accent = modeAccent(mode);
  const next = nextChallenge(progress, authoredSets);
  const nextChapter = useRef<HTMLElement>(null);

  const cleared = completedCount(progress);
  const stars = starCount(progress);
  const ladderComplete = authoredSets > 0 && cleared >= authoredSets;

  // Land on the chapter holding the next set, rather than at chapter one with
  // the climb so far scrolled out of sight.
  useEffect(() => {
    if (next > 10) nextChapter.current?.scrollIntoView({ block: "center" });
    // Only on arrival, not every time the record moves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto w-full max-w-107.5 px-4 pb-7 pt-4 lg:max-w-240 lg:px-6">
      <NextChallenge
        sport={sport}
        mode={mode}
        setNumber={next}
        progress={setProgressOf(progress, next)}
        ladderComplete={ladderComplete}
        awaitingContent={authoredSets === 0}
        onPlay={authoredSets > 0 && !ladderComplete ? () => onOpenSet(next) : null}
      />

      <div className="mt-5 flex items-center gap-2">
        <h2
          className="flex-1 font-display font-black leading-none text-muted"
          style={{ fontSize: typography.sizeRem.p11, letterSpacing: "var(--ds-tracking-ultra)" }}
        >
          SET CHAPTERS
        </h2>
        <span
          className="ds-tabular font-display font-black leading-none"
          style={{
            fontSize: typography.sizeRem.p11,
            letterSpacing: "var(--ds-tracking-ultra)",
            color: accent,
          }}
        >
          {cleared}/{setCount} CLEARED
        </span>
        <StarIcon size={12} style={{ color: gold }} />
        <span
          className="ds-tabular font-display font-black leading-none"
          style={{
            fontSize: typography.sizeRem.p11,
            letterSpacing: "var(--ds-tracking-label)",
            color: gold,
          }}
        >
          {stars}/{maxStars}
        </span>
      </div>

      {/* One path, chapter by chapter. The chapters are dividers on the climb
          rather than tabs, so difficulty reads as one axis: the path you are
          on, and how far up it you are. */}
      <div>
        {bandNames.map((name, index) => (
          <section
            key={name}
            ref={index === Math.floor((next - 1) / 10) ? nextChapter : undefined}
            className="mt-5 first:mt-3"
          >
            <div className="flex items-baseline gap-2">
              <h3
                className="font-display font-black leading-none"
                style={{
                  fontSize: typography.sizeRem.p11,
                  letterSpacing: "var(--ds-tracking-ultra)",
                  color:
                    index * 10 < authoredSets
                      ? accent
                      : "var(--ds-color-text-muted)",
                }}
              >
                {name}
              </h3>
              <span
                className="ds-tabular font-display font-black leading-none text-muted"
                style={{ fontSize: typography.sizeRem.p11, letterSpacing: "var(--ds-tracking-label)" }}
              >
                {String(firstSetOfBand(index)).padStart(2, "0")}–
                {firstSetOfBand(index) + 9}
              </span>
              <span
                aria-hidden
                className="ml-1 h-px flex-1"
                style={{ background: "var(--ds-color-border-subtle)" }}
              />
            </div>

            <div className="mt-2 grid grid-cols-5 gap-2 max-[382px]:grid-cols-4 lg:grid-cols-10">
              {Array.from({ length: 10 }, (_, offset) => {
                const setNumber = firstSetOfBand(index) + offset;
                return (
                  <QuizSetTile
                    key={setNumber}
                    mode={mode}
                    setNumber={setNumber}
                    progress={setProgressOf(progress, setNumber)}
                    state={visualStateFor(progress, setNumber, authoredSets)}
                    launching={launchingSet === setNumber}
                    onOpen={() => onOpenSet(setNumber)}
                  />
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <LadderRule accent={accent} />
    </div>
  );
}

/* ---- Next challenge ------------------------------------------------------ */

function NextChallenge({
  sport,
  mode,
  setNumber,
  progress,
  ladderComplete,
  awaitingContent,
  onPlay,
}: {
  sport: Sport;
  mode: QuizMode;
  setNumber: number;
  progress: QuizSetProgress;
  ladderComplete: boolean;
  awaitingContent: boolean;
  /** Starts the named set. Null when there is nothing to start. */
  onPlay: (() => void) | null;
}) {
  const accent = awaitingContent
    ? "var(--ds-color-text-muted)"
    : ladderComplete
      ? feedbackVar("success")
      : modeAccent(mode);

  const stars = starsFor(progress.bestCorrect);
  const replay = progress.attempts > 0 && stars < 3;

  const heading = awaitingContent
    ? "IN DEVELOPMENT"
    : ladderComplete
      ? "LADDER COMPLETE"
      : "NEXT CHALLENGE";

  const chip = awaitingContent
    ? "SOON"
    : ladderComplete
      ? "CLEARED"
      : `SET ${setNumber}`;

  const title = awaitingContent
    ? `${modeLabels[mode]} LADDER LOADING`
    : ladderComplete
      ? `${modeLabels[mode]} KNOWLEDGE MASTERED`
      : `${modeLabels[mode]} · SET ${setNumber}`;

  const body = awaitingContent
    ? "This ladder is still being written. Try another mode or sport."
    : ladderComplete
      ? "Replay any set to chase a flawless 3-star run."
      : replay
        ? `Best ${progress.bestCorrect}/${questionsPerSet} · ${stars}/3 stars · replay for a perfect run.`
        : `${questionsPerSet} questions · instant verdict after every answer.`;

  return (
    <AccentPanel accent={accent} className={styles.riseIn}>
      <div className="p-4">
        <div className="flex items-center gap-2.25">
          {awaitingContent ? (
            <ScheduleIcon size={22} style={{ color: accent }} />
          ) : ladderComplete ? (
            <PremiumIcon size={22} style={{ color: accent }} />
          ) : (
            <Glyph name={modeGlyph(mode, sport)} size={22} style={{ color: accent }} />
          )}
          <h2
            className="flex-1 font-display font-black leading-none"
            style={{
              fontSize: typography.sizeRem.p11,
              letterSpacing: "var(--ds-tracking-ultra)",
              color: accent,
            }}
          >
            {heading}
          </h2>
          <span
            className="shrink-0 border px-2 py-1 font-display font-black leading-none"
            style={{
              fontSize: typography.sizeRem.p11,
              letterSpacing: "var(--ds-tracking-ultra)",
              color: accent,
              background: withAlpha(accent, 0.12),
              borderColor: withAlpha(accent, 0.55),
            }}
          >
            {chip}
          </span>
        </div>

        <p
          className="mt-3.75 font-display font-black leading-tight"
          style={{ fontSize: typography.sizeRem.p20, letterSpacing: "var(--ds-tracking-ultra)" }}
        >
          {title}
        </p>
        <p className="mt-1.75 text-xs leading-snug text-muted">{body}</p>
        {onPlay ? (
          <div className="mt-3.5">
            <Button accent={accent} glow fullWidth trailingIcon={<ArrowRightIcon size={18} />} onClick={onPlay}>
              {progress.attempts > 0 ? `REPLAY SET ${setNumber}` : `PLAY SET ${setNumber}`}
            </Button>
          </div>
        ) : null}
      </div>
    </AccentPanel>
  );
}

/* ---- The rule ------------------------------------------------------------- */

function LadderRule({ accent }: { accent: string }) {
  return (
    <div
      className="mt-3.5 flex items-start gap-2.5 border p-3"
      style={{
        background: withAlpha("var(--ds-color-background-secondary)", 0.88),
        borderColor: "var(--ds-color-border-default)",
      }}
    >
      <LightbulbIcon size={18} style={{ color: accent }} />
      <p className="text-2xs leading-snug text-muted">
        Finish all {questionsPerSet} questions to unlock the next set — any score
        clears it. Score {questionsPerSet}/{questionsPerSet} for 3 stars. The first
        play of every set is free; replays cost {entryCost} coins, and each new
        star pays {starCoinRewards.join(" / ")} Oz.
      </p>
    </div>
  );
}

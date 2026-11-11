"use client";
import { typography } from "@statoz/design-system/web/tokens/typography";

import {
  accentVar,
  feedbackVar,
  LockIcon,
  PlayArrowIcon,
  PremiumIcon,
  ReplayIcon,
  ScheduleIcon,
  StarIcon,
  StarOutlineIcon,
  withAlpha,
} from "@statoz/design-system/web";

import { questionsPerSet } from "../constants";
import { modeAccent, modeRewards } from "@/mocks/games/quiz";
import { starsFor } from "../state/ladder";
import type { QuizMode, QuizSetProgress, QuizSetVisualState } from "../types";

import styles from "./quiz.module.css";

/**
 * One numbered set on the ladder.
 *
 * The tile says four things at a glance: whether you can open it, what it is
 * worth, how you did, and — once it is graded — how close to flawless. There is
 * no fail state, so a cleared set is never scolded; it simply offers a replay.
 *
 * Under the glow rule only the tile actually being opened is live.
 */

const gold = accentVar("gold");

const icons: Record<QuizSetVisualState, typeof StarIcon> = {
  mastered: PremiumIcon,
  cleared: ReplayIcon,
  available: PlayArrowIcon,
  locked: LockIcon,
  // The app uses an empty hourglass; a clock is the nearest thing the icon set
  // has, and reads the same way — this one is not ready yet.
  upcoming: ScheduleIcon,
};

function colorFor(state: QuizSetVisualState, mode: QuizMode): string {
  switch (state) {
    case "mastered":
      return gold;
    case "cleared":
      return feedbackVar("success");
    case "available":
      return modeAccent(mode);
    default:
      return "var(--ds-color-text-muted)";
  }
}

function statusFor(state: QuizSetVisualState, setNumber: number): string {
  switch (state) {
    case "mastered":
      return "PERFECT";
    case "cleared":
      return "REPLAY";
    case "available":
      return "PLAY";
    case "locked":
      return `FINISH ${setNumber - 1}`;
    case "upcoming":
      return "SOON";
  }
}

export type QuizSetTileProps = {
  mode: QuizMode;
  setNumber: number;
  progress: QuizSetProgress;
  state: QuizSetVisualState;
  launching: boolean;
  onOpen: () => void;
};

export function QuizSetTile({
  mode,
  setNumber,
  progress,
  state,
  launching,
  onOpen,
}: QuizSetTileProps) {
  const enabled = state !== "locked" && state !== "upcoming" && !launching;
  const graded = state === "mastered" || state === "cleared";
  const color = colorFor(state, mode);
  const Icon = icons[state];
  const status = statusFor(state, setNumber);
  const stars = starsFor(progress.bestCorrect);

  return (
    <button
      type="button"
      disabled={!enabled}
      onClick={onOpen}
      className={`${styles.pressable} block aspect-[0.8] w-full border px-1 py-2 text-center ${
        enabled ? "cursor-pointer" : "cursor-default opacity-50"
      }`}
      style={{
        background: `color-mix(in srgb, ${color} 7%, var(--ds-color-background-secondary))`,
        borderColor: withAlpha(color, 0.62),
        boxShadow: launching ? `0 0 12px 0 ${withAlpha(color, 0.22)}` : undefined,
      }}
      aria-label={
        progress.attempts > 0
          ? `Set ${setNumber}, ${status.toLowerCase()}, best ${progress.bestCorrect} of ${questionsPerSet}, ${stars} of 3 stars, replay costs coins`
          : state === "available"
            ? `Set ${setNumber}, play free, +${modeRewards[mode]} XP per correct answer`
            : `Set ${setNumber}, ${status.toLowerCase()}`
      }
    >
      {/* Three things only, so each can be read at 11px in a fifth of a phone:
          what you can do, which set, and how it went. The rest is in the
          accessible name and the briefing. */}
      <span className="flex h-full flex-col items-center justify-center gap-1.5">
        <Icon size={18} style={{ color }} />

        <span
          className="ds-tabular font-display font-black leading-none"
          style={{ fontSize: typography.sizeRem.p15, color }}
        >
          {String(setNumber).padStart(2, "0")}
        </span>

        {graded ? (
          <>
            <StarRating earned={stars} />
            <span
              className="ds-tabular font-display font-black leading-none text-muted"
              style={{ fontSize: typography.sizeRem.p11 }}
            >
              {launching ? "…" : `${progress.bestCorrect}/${questionsPerSet}`}
            </span>
          </>
        ) : state === "available" || state === "upcoming" ? (
          <span
            className="font-display font-black leading-none"
            style={{ fontSize: typography.sizeRem.p11, letterSpacing: "var(--ds-tracking-label)", color }}
          >
            {launching ? "…" : state === "available" ? "FREE" : "SOON"}
          </span>
        ) : null}
      </span>
    </button>
  );
}

/** Three stars, only the earned ones lit. */
export function StarRating({
  earned,
  size = 11,
}: {
  earned: number;
  size?: number;
}) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${earned} of 3 stars`}>
      {[0, 1, 2].map((index) =>
        index < earned ? (
          <StarIcon key={index} size={size} style={{ color: gold }} />
        ) : (
          <StarOutlineIcon
            key={index}
            size={size}
            style={{ color: "var(--ds-color-border-default)" }}
          />
        ),
      )}
    </span>
  );
}

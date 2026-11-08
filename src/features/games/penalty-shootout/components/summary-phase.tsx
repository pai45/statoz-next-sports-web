"use client";

import type { CSSProperties } from "react";

import {
  accentVar,
  Button,
  feedbackVar,
  Glyph,
  Progress,
  withAlpha,
} from "@statoz/design-system/web";

import { summarySequenceMs } from "../constants";
import { interval } from "../../shared/engine/curves";
import { levelProgress } from "../state/shootout-progress";
import { useTimeline } from "../state/use-kick-timeline";
import {
  penaltyDirectionLetters,
  type PenaltyKick,
  type ShootoutState,
} from "../types";

import styles from "./penalty-shootout.module.css";
import { MatchPanel } from "../../shared/components/match-chrome";

/**
 * What the shootout came to.
 *
 * The pieces arrive in sequence rather than all at once — the verdict, then the
 * scoreline, then what it was worth — because a result read all in one frame
 * lands flatter than one that unfolds.
 */

/** Where each piece lands on the 2200ms sequence, as Flutter's intervals. */
const bannerAt = 0;
const scoreAt = 0.12;
const panelAt = 0.28;
const countWindow = { start: 0.38, end: 0.78 } as const;
const logAt = 0.5;

function delayFor(fraction: number): string {
  return `${Math.round(fraction * summarySequenceMs)}ms`;
}

export type SummaryPhaseProps = {
  state: ShootoutState;
  /** XP this shootout earned, already applied to the store. */
  xpGained: number;
  /** Total XP after this shootout, for the level bar. */
  totalXp: number;
  onPlayAgain: () => void;
  /** Back to the lobby — Flutter's HOME, which is the shootout's own home. */
  onHome: () => void;
};

export function SummaryPhase({
  state,
  xpGained,
  totalXp,
  onPlayAgain,
  onHome,
}: SummaryPhaseProps) {
  const t = useTimeline(summarySequenceMs);
  const won = state.winner === "player";
  const accent = won ? feedbackVar("success") : feedbackVar("danger");
  const progress = levelProgress(totalXp);

  const counted = Math.round(
    xpGained * interval(t, countWindow.start, countWindow.end),
  );

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-3.5 px-4 py-4">
        {/* The verdict. */}
        <div
          className={styles.rise}
          style={{ "--rise-delay": delayFor(bannerAt) } as CSSProperties}
        >
          <div
            className="flex flex-col items-center gap-2 py-4.5"
            style={{
              background: withAlpha(accent, 0.12),
              border: `1.5px solid ${accent}`,
            }}
          >
            <span style={{ color: accent }}>
              <Glyph
                name={won ? "auto_awesome" : "warning"}
                size={36}
              />
            </span>
            <h1
              className="font-display font-black leading-compact"
              style={{
                color: accent,
                fontSize: "var(--ds-text-3xl)",
                letterSpacing: "var(--ds-tracking-mega)",
              }}
            >
              {won ? "SHOOTOUT WON" : "SHOOTOUT LOST"}
            </h1>
          </div>
        </div>

        {/* The scoreline, always the user's goals first. */}
        <div
          className={`${styles.rise} flex flex-col items-center`}
          style={{ "--rise-delay": delayFor(scoreAt) } as CSSProperties}
        >
          <p
            className="flex items-baseline font-display font-black leading-compact"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            <span
              style={{
                color: accentVar("cyan"),
                fontSize: "var(--ds-text-hero)",
              }}
            >
              {state.playerScore}
            </span>
            <span
              className="px-4 text-muted"
              style={{ fontSize: "var(--ds-text-2xl)" }}
            >
              –
            </span>
            <span
              style={{
                color: feedbackVar("danger"),
                fontSize: "var(--ds-text-hero)",
              }}
            >
              {state.opponentScore}
            </span>
          </p>
          <p
            className="mt-1 font-display font-bold leading-compact"
            style={{
              color: accentVar("cyan"),
              fontSize: "var(--ds-text-xs)",
              letterSpacing: "var(--ds-tracking-display)",
            }}
          >
            {state.suddenDeath ? "DECIDED IN SUDDEN DEATH" : "PENALTIES"}
          </p>
        </div>

        {/* What it was worth. */}
        <div
          className={styles.rise}
          style={{ "--rise-delay": delayFor(panelAt) } as CSSProperties}
        >
          <MatchPanel accent={accent} className="p-4">
            <p
              className="font-display font-black leading-compact"
              style={{
                fontSize: "var(--ds-text-2xl)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {`+${counted} XP`}
            </p>
            <div className="mt-3">
              <Progress
                value={progress.fraction}
                accent={accentVar("lime")}
                label={`Level ${progress.level} progress`}
                height={6}
              />
            </div>
            <p
              className="mt-2 font-display font-extrabold leading-compact text-muted"
              style={{
                fontSize: "var(--ds-text-2xs)",
                letterSpacing: "var(--ds-tracking-label)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {`${progress.intoLevel} / ${progress.levelSpan} XP · LEVEL ${progress.level}`}
            </p>
          </MatchPanel>
        </div>

        {/* Every kick, in the order they were taken. */}
        <div
          className={styles.rise}
          style={{ "--rise-delay": delayFor(logAt) } as CSSProperties}
        >
          <KickLog kicks={state.kicks} opponentName={state.opponentName} />
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-md shrink-0 flex-col gap-3 px-4 pb-8">
        <Button
          variant="solid"
          accent={accentVar("lime")}
          size="lg"
          fullWidth
          glow
          onClick={onPlayAgain}
        >
          PLAY AGAIN
        </Button>
        <Button
          variant="tonal"
          accent={accentVar("cyan")}
          size="lg"
          fullWidth
          onClick={onHome}
        >
          HOME
        </Button>
      </div>
    </div>
  );
}

function KickLog({
  kicks,
  opponentName,
}: {
  kicks: PenaltyKick[];
  opponentName: string;
}) {
  return (
    <section>
      <h2
        className="font-display font-extrabold leading-compact"
        style={{
          color: accentVar("cyan"),
          fontSize: "var(--ds-text-xs)",
          letterSpacing: "var(--ds-tracking-mega)",
        }}
      >
        KICK LOG
      </h2>

      <div
        className="mt-2"
        style={{
          border: `1px solid ${withAlpha(accentVar("cyan"), 0.3)}`,
        }}
      >
        <div
          className="flex items-center gap-2 px-3 py-2 font-display font-extrabold leading-compact text-muted"
          style={{
            fontSize: "var(--ds-text-2xs)",
            letterSpacing: "var(--ds-tracking-label)",
            borderBottom: `1px solid ${withAlpha(accentVar("cyan"), 0.2)}`,
          }}
        >
          <span className="w-6 shrink-0">#</span>
          <span className="min-w-0 flex-1">TAKER</span>
          <span className="w-9 shrink-0 text-center">SHOOT</span>
          <span className="w-9 shrink-0 text-center">DIVE</span>
          <span className="w-8 shrink-0" />
        </div>

        {kicks.map((kick) => (
          <KickLogRow
            key={kick.kickNumber}
            kick={kick}
            opponentName={opponentName}
          />
        ))}
      </div>
    </section>
  );
}

function KickLogRow({
  kick,
  opponentName,
}: {
  kick: PenaltyKick;
  opponentName: string;
}) {
  const takerAccent = kick.byPlayer
    ? accentVar("cyan")
    : accentVar("orange");

  return (
    <div
      className="flex items-center gap-2 px-3 py-2.5"
      style={{
        background: kick.scored
          ? withAlpha(accentVar("cyan"), 0.04)
          : undefined,
      }}
    >
      <span
        className="w-6 shrink-0 font-bold leading-compact text-muted"
        style={{
          fontSize: "var(--ds-text-2xs)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {kick.kickNumber}
      </span>
      <span
        className="min-w-0 flex-1 truncate font-display font-bold leading-compact"
        style={{
          color: takerAccent,
          fontSize: "var(--ds-text-xs)",
          letterSpacing: "var(--ds-tracking-label)",
        }}
        title={kick.byPlayer ? undefined : opponentName}
      >
        {kick.shooter.shortName}
      </span>
      <span
        className="w-9 shrink-0 text-center font-display font-black leading-compact"
        style={{
          color: kick.scored ? accentVar("cyan") : feedbackVar("danger"),
          fontSize: "var(--ds-text-xs)",
        }}
      >
        {penaltyDirectionLetters[kick.shootDirection]}
      </span>
      <span
        className="w-9 shrink-0 text-center font-display font-black leading-compact text-muted"
        style={{ fontSize: "var(--ds-text-xs)" }}
      >
        {penaltyDirectionLetters[kick.diveDirection]}
      </span>
      <span
        className="grid w-8 shrink-0 place-items-center"
        style={{
          color: kick.scored ? accentVar("lime") : feedbackVar("danger"),
        }}
        title={kick.scored ? "Scored" : "Saved"}
      >
        <Glyph name={kick.scored ? "sports_soccer" : "block"} size={18} />
      </span>
    </div>
  );
}

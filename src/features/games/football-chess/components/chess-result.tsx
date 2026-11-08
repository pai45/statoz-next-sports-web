"use client";

import { accentVar, Button, feedbackVar, Glyph, withAlpha } from "@statoz/design-system/web";

import { matchSeconds } from "../constants";
import type { ChessMatch } from "../engine/match";
import { isDraw, playerWon } from "../engine/match";
import type { FootballChessStats } from "../state/football-chess-progress";
import { played, winRate } from "../state/football-chess-progress";

import styles from "./football-chess.module.css";

/**
 * Full time — the web port of `football_chess_result.dart`.
 *
 * The verdict, the score, the goal timeline with its scorers, what the match
 * paid, and the lifetime record it moved.
 */

export type ChessResultProps = {
  match: ChessMatch;
  xpGained: number;
  coinsGained: number;
  stats: FootballChessStats;
  onPlayAgain: () => void;
  onExit: () => void;
};

/** The clock reading a goal went in at, as a match time. */
function matchTime(atClock: number): string {
  const elapsed = Math.max(0, Math.round(matchSeconds - atClock));
  const minutes = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const seconds = String(elapsed % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function ChessResult({
  match,
  xpGained,
  coinsGained,
  stats,
  onPlayAgain,
  onExit,
}: ChessResultProps) {
  const won = playerWon(match);
  const draw = isDraw(match);
  const accent = won ? feedbackVar("success") : draw ? accentVar("gold") : feedbackVar("danger");
  const verdict = won ? "VICTORY" : draw ? "DRAW" : "DEFEAT";

  return (
    <div
      className="absolute inset-0 z-30 overflow-y-auto"
      style={{ background: withAlpha("var(--ds-color-background-primary)", 0.97) }}
      role="dialog"
      aria-modal="true"
      aria-label={`Full time: ${verdict}`}
    >
      <div className="mx-auto flex min-h-full w-full max-w-105 flex-col justify-center gap-4 px-6 py-5">
        <div className={`${styles.enter} text-center`}>
          <p
            className="font-display font-black leading-compact"
            style={{
              color: accent,
              fontSize: "var(--ds-text-3xl)",
              letterSpacing: "var(--ds-tracking-mega)",
              textShadow: `0 0 22px ${withAlpha(accent, 0.55)}`,
            }}
          >
            {verdict}
          </p>
          <p
            className="mt-1 font-bold leading-compact text-muted"
            style={{ fontSize: "var(--ds-text-2xs)", letterSpacing: "var(--ds-tracking-label)" }}
          >
            FULL TIME
          </p>
        </div>

        <div className={`${styles.enter} flex items-center justify-center gap-4`}>
          <SideScore
            label="YOU"
            value={match.playerScore}
            color={accentVar("cyan")}
          />
          <span
            className="font-display font-black leading-compact text-muted"
            style={{ fontSize: "var(--ds-text-xl)" }}
          >
            –
          </span>
          <SideScore
            label={match.opponentName.toUpperCase()}
            value={match.opponentScore}
            color={accentVar("violet")}
          />
        </div>

        <div
          className={`${styles.enter} p-3`}
          style={{
            background: withAlpha("var(--ds-color-background-secondary)", 0.72),
            border: `1px solid ${withAlpha(accentVar("gold"), 0.28)}`,
          }}
        >
          <p
            className="font-bold leading-compact text-muted"
            style={{ fontSize: "var(--ds-text-2xs)", letterSpacing: "var(--ds-tracking-label)" }}
          >
            GOAL TIMELINE
          </p>

          {match.goals.length === 0 ? (
            <p
              className="mt-2 leading-body text-muted"
              style={{ fontSize: "var(--ds-text-sm)" }}
            >
              Nothing got past either keeper.
            </p>
          ) : (
            <ul className="mt-2 flex flex-col gap-1.5">
              {match.goals.map((goal, index) => (
                <li
                  key={`${goal.scorerShortName}-${index}`}
                  className="flex items-center gap-2"
                >
                  <span
                    style={{
                      color: goal.byPlayer ? accentVar("cyan") : accentVar("violet"),
                    }}
                  >
                    <Glyph name="sports_soccer" size={14} />
                  </span>
                  <span
                    className="min-w-0 flex-1 truncate font-bold leading-compact"
                    style={{ fontSize: "var(--ds-text-xs)" }}
                  >
                    {goal.scorerShortName}
                  </span>
                  <span
                    className="font-bold leading-compact text-muted ds-tabular"
                    style={{ fontSize: "var(--ds-text-2xs)" }}
                  >
                    {matchTime(goal.atClock)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={`${styles.enter} flex items-center justify-center gap-6`}>
          <Reward label="XP" value={`+${xpGained}`} color={accentVar("violet")} />
          <Reward label="COINS" value={`+${coinsGained}`} color={accentVar("gold")} />
        </div>

        <div className={`${styles.enter} flex justify-between gap-2`}>
          <Record label="WINS" value={String(stats.wins)} />
          <Record label="DRAWS" value={String(stats.draws)} />
          <Record label="LOSSES" value={String(stats.losses)} />
          <Record label="WIN RATE" value={winRate(stats)} />
          <Record label="STREAK" value={String(stats.currentStreak)} />
        </div>

        <div className={`${styles.enter} mt-2 flex flex-col gap-3`}>
          <Button
            accent={accentVar("gold")}
            variant="solid"
            fullWidth
            leadingIcon={<Glyph name="replay" size={18} />}
            onClick={onPlayAgain}
          >
            PLAY AGAIN
          </Button>
          <button
            type="button"
            onClick={onExit}
            className="w-full cursor-pointer py-2 font-bold leading-compact text-muted"
            style={{ fontSize: "var(--ds-text-xs)", letterSpacing: "var(--ds-tracking-label)" }}
          >
            BACK TO FOOTBALL CHESS
          </button>
        </div>

        <p
          className="text-center font-bold leading-compact text-muted"
          style={{ fontSize: "var(--ds-text-2xs)", letterSpacing: "var(--ds-tracking-tight)" }}
        >
          {played(stats)} PLAYED · BEST STREAK {stats.bestStreak}
        </p>
      </div>
    </div>
  );
}

function SideScore({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="min-w-0 text-center">
      <p
        className="font-display font-black leading-compact ds-tabular"
        style={{ color, fontSize: "var(--ds-text-hero)" }}
      >
        {value}
      </p>
      <p
        className="mt-1 truncate font-bold leading-compact text-muted"
        style={{ fontSize: "var(--ds-text-2xs)", letterSpacing: "var(--ds-tracking-label)" }}
      >
        {label}
      </p>
    </div>
  );
}

function Reward({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="text-center">
      <p
        className="font-display font-black leading-compact ds-tabular"
        style={{ color, fontSize: "var(--ds-text-2xl)", letterSpacing: "var(--ds-tracking-display)" }}
      >
        {value}
      </p>
      <p
        className="mt-0.5 font-bold leading-compact text-muted"
        style={{ fontSize: "var(--ds-text-2xs)", letterSpacing: "var(--ds-tracking-label)" }}
      >
        {label}
      </p>
    </div>
  );
}

function Record({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 flex-1 text-center">
      <p
        className="font-display font-black leading-compact ds-tabular"
        style={{ fontSize: "var(--ds-text-lg)" }}
      >
        {value}
      </p>
      <p
        className="mt-0.5 truncate font-bold leading-compact text-muted"
        style={{ fontSize: "var(--ds-text-2xs)", letterSpacing: "var(--ds-tracking-tight)" }}
      >
        {label}
      </p>
    </div>
  );
}

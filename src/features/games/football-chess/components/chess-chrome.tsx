"use client";

import {
  accentVar,
  feedbackVar,
  Glyph,
  withAlpha,
  type GlyphName,
} from "@statoz/design-system/web";

import { decisionSeconds } from "../constants";
import type { ChessMatch } from "../engine/match";
import { boardActionLabels, type BoardActionType } from "../types";

import styles from "./football-chess.module.css";

/**
 * The chrome around the board — the web port of `football_chess_overlays.dart`:
 * the score and clock, the contextual action bar, the pick countdown, the centre
 * flash and the toast that names the CPU's move.
 */

/* ---- Score and clock ------------------------------------------------------ */

export function ChessHud({
  match,
  onExit,
}: {
  match: ChessMatch;
  onExit: () => void;
}) {
  const seconds = Math.ceil(match.clockRemaining);
  const clock = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(
    seconds % 60,
  ).padStart(2, "0")}`;
  const urgent = seconds <= 15;

  return (
    <div className="flex items-center px-1.5 pt-1">
      <button
        type="button"
        onClick={onExit}
        aria-label="Leave the match"
        className="grid size-11 shrink-0 cursor-pointer place-items-center"
        style={{ color: "var(--ds-color-text-muted)" }}
      >
        <svg width={20} height={20} viewBox="0 0 24 24" aria-hidden fill="none">
          <path
            d="M6 6l12 12M18 6L6 18"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
          />
        </svg>
      </button>

      <div className="flex flex-1 items-center justify-center">
        <Score value={match.playerScore} color={accentVar("cyan")} label="You" />
        <span
          className="px-3.5 font-display font-black leading-compact ds-tabular"
          style={{
            fontSize: "var(--ds-text-lg)",
            letterSpacing: "var(--ds-tracking-tight)",
            color: urgent ? feedbackVar("danger") : "var(--ds-color-text-default)",
          }}
        >
          {clock}
        </span>
        <Score
          value={match.opponentScore}
          color={accentVar("violet")}
          label={match.opponentName}
        />
      </div>

      {/* Balances the close button so the score stays centred. */}
      <span className="size-11 shrink-0" aria-hidden />
    </div>
  );
}

function Score({
  value,
  color,
  label,
}: {
  value: number;
  color: string;
  label: string;
}) {
  return (
    <span
      className="font-display font-black leading-compact ds-tabular"
      style={{ color, fontSize: "var(--ds-text-2xl)" }}
      aria-label={`${label}: ${value}`}
    >
      {value}
    </span>
  );
}

/* ---- The action bar -------------------------------------------------------- */

const actionAccents: Record<BoardActionType, string> = {
  shoot: "gold",
  dribble: "cyan",
  pass: "cyan",
  press: "violet",
  tackle: "violet",
  slide: "violet",
  move: "muted",
};

const actionGlyphs: Record<BoardActionType, GlyphName> = {
  dribble: "directions_run",
  pass: "sync_alt",
  shoot: "sports_soccer",
  press: "compress",
  tackle: "shield",
  slide: "sports_kabaddi",
  move: "swap_horiz",
};

function accentFor(verb: BoardActionType): string {
  const name = actionAccents[verb];
  return name === "muted" ? "var(--ds-color-text-muted)" : accentVar(name as "cyan");
}

/**
 * The selected piece's legal verbs. MOVE is deliberately absent: it is armed the
 * moment a piece is selected, so its chip would be a button that does nothing.
 */
export function ActionBar({
  match,
  onChoose,
}: {
  match: ChessMatch;
  onChoose: (verb: BoardActionType) => void;
}) {
  /*
   * Between turns the deck keeps its slot but drops its chrome. Returning null
   * gave the row above 85px back, and the board — centred in that row — slid
   * half of it down and up again on every beat.
   */
  if (match.phase !== "playerTurn" && match.phase !== "opponentTurn") {
    return <div className={`${styles.actionBar} mx-3`} aria-hidden />;
  }

  const verbs = match.availableActions.filter((verb) => verb !== "move");

  return (
    <div
      className={`${styles.actionBar} mx-3 flex items-center justify-center gap-2 rounded-lg px-5 py-3.5`}
      style={{
        background: withAlpha("var(--ds-color-background-elevated)", 0.85),
        border: `1px solid ${withAlpha(accentVar("cyan"), 0.3)}`,
        boxShadow: "0 4px 10px rgba(0, 0, 0, 0.5)",
      }}
    >
      {match.phase === "opponentTurn" ? (
        <Prompt text="WAITING FOR OPPONENT" color="var(--ds-color-text-muted)" />
      ) : match.selectedPieceId === null ? (
        <Prompt text="SELECT A PIECE" color={accentVar("cyan")} />
      ) : match.availableActions.length === 0 ? (
        <Prompt text="NO ACTIONS" color={feedbackVar("danger")} />
      ) : verbs.length === 0 ? (
        <Prompt text="TAP A SQUARE TO MOVE" color={accentVar("cyan")} />
      ) : (
        verbs.map((verb) => (
          <ActionChip
            key={verb}
            verb={verb}
            armed={match.selectedAction === verb}
            onTap={() => onChoose(verb)}
          />
        ))
      )}
    </div>
  );
}

function Prompt({ text, color }: { text: string; color: string }) {
  return (
    <span
      className="font-display font-semibold leading-compact"
      style={{
        color,
        fontSize: "var(--ds-text-md)",
        letterSpacing: "var(--ds-tracking-mega)",
      }}
    >
      {text}
    </span>
  );
}

function ActionChip({
  verb,
  armed,
  onTap,
}: {
  verb: BoardActionType;
  armed: boolean;
  onTap: () => void;
}) {
  const color = accentFor(verb);
  return (
    <button
      type="button"
      onClick={onTap}
      aria-pressed={armed}
      className={`${styles.actionChip} flex min-h-11 cursor-pointer flex-col items-center gap-[3px] px-3.5 py-2.5`}
      style={{
        background: `linear-gradient(to bottom, ${withAlpha(color, armed ? 0.35 : 0.18)}, ${withAlpha(
          "var(--ds-color-background-elevated)",
          0.95,
        )})`,
        border: `${armed ? 2 : 1.2}px solid ${color}`,
        borderRadius: 2,
        color,
        filter: armed ? `drop-shadow(0 0 10px ${withAlpha(color, 0.5)})` : undefined,
      }}
    >
      <Glyph name={actionGlyphs[verb]} size={20} />
      <span
        className="font-bold leading-compact"
        style={{ fontSize: "var(--ds-text-2xs)", letterSpacing: "var(--ds-tracking-tight)" }}
      >
        {boardActionLabels[verb]}
      </span>
    </button>
  );
}

/* ---- The pick countdown ---------------------------------------------------- */

export function DecisionTimer({ match }: { match: ChessMatch }) {
  /*
   * Off the player's turn the countdown keeps its space rather than vanishing.
   * Collapsing it re-flowed the column under the board on every turn, which
   * moved the board — the one thing on this screen that must not move.
   */
  if (match.phase !== "playerTurn") {
    return <div className={`${styles.timerSlot} mx-auto mb-1.5 w-50`} aria-hidden />;
  }

  const seconds = Math.min(Math.max(Math.ceil(match.decisionRemaining), 0), 99);
  const low = match.decisionRemaining <= 3;
  const color = low ? feedbackVar("danger") : accentVar("cyan");
  const fraction = Math.min(Math.max(match.decisionRemaining / decisionSeconds, 0), 1);

  return (
    <div className={`${styles.timerSlot} mx-auto mb-1.5 flex w-50 items-center gap-2`}>
      <span
        className="font-bold leading-compact ds-tabular"
        style={{ color, fontSize: "var(--ds-text-xs)", letterSpacing: "var(--ds-tracking-tight)" }}
      >
        {seconds}s
      </span>
      <span
        className="block h-[5px] flex-1 overflow-hidden"
        style={{ background: withAlpha("var(--ds-color-border-default)", 0.6) }}
      >
        <span
          className="block h-full"
          style={{ width: `${fraction * 100}%`, background: color }}
        />
      </span>
    </div>
  );
}

/* ---- The centre flash ------------------------------------------------------ */

type Flash = { text: string; color: string; big: boolean };

function flashFor(match: ChessMatch): Flash | null {
  switch (match.phase) {
    case "goalScored":
      return { text: "GOAL!", color: accentVar("gold"), big: true };
    case "resolving":
      return match.banner === null
        ? null
        : { text: match.banner, color: accentVar("orange"), big: false };
    case "playerTurn":
      return { text: "YOUR MOVE", color: accentVar("cyan"), big: false };
    case "opponentTurn":
      return { text: "OPPONENT'S MOVE", color: accentVar("violet"), big: false };
    default:
      return null;
  }
}

/**
 * One transient flash for every in-match beat.
 *
 * Derived rather than held: the flash *is* a function of the phase, so the
 * element is keyed on the phase and the CSS animation replays whenever React
 * remounts it. No effect, no state, and nothing to fall out of step.
 */
export function CentreFlash({ match }: { match: ChessMatch }) {
  const flash = flashFor(match);
  if (flash === null) return null;

  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center">
      <span
        key={match.phase}
        className={`${styles.flash} font-display font-black leading-compact`}
        style={{
          padding: flash.big ? "12px 22px" : "10px 18px",
          background: withAlpha("var(--ds-color-background-primary)", 0.82),
          border: `1px solid ${withAlpha(flash.color, 0.85)}`,
          color: flash.color,
          fontSize: flash.big ? "var(--ds-text-hero)" : "var(--ds-text-md)",
          letterSpacing: flash.big
            ? "var(--ds-tracking-max)"
            : "var(--ds-tracking-mega)",
          filter: flash.big
            ? `drop-shadow(0 0 16px ${withAlpha(flash.color, 0.6)})`
            : undefined,
        }}
      >
        {flash.text}
      </span>
    </div>
  );
}

/* ---- The CPU's move -------------------------------------------------------- */

/**
 * Names the piece the CPU just moved and the verb it played.
 *
 * `lastMove` already survives the phase it was made in — it stands until the
 * player acts — so the toast is derived from it and keyed on the move count.
 * The animation fades it out and holds it there, which gives the same visible
 * lifetime as Flutter's 2.2 s controller without a timer to keep in step.
 */
export function OpponentToast({ match }: { match: ChessMatch }) {
  const lastMove = match.lastMove;
  if (lastMove === null || lastMove.side !== "opponent") return null;

  const violet = accentVar("violet");

  return (
    <div className="pointer-events-none absolute inset-x-0 top-[32%] grid place-items-center">
      <span
        key={match.moveLog.length}
        className={`${styles.toast} flex flex-col items-center px-4 py-2.5`}
        style={{
          background: withAlpha("var(--ds-color-background-primary)", 0.88),
          border: `1px solid ${withAlpha(violet, 0.85)}`,
          filter: `drop-shadow(0 0 12px ${withAlpha(violet, 0.4)})`,
        }}
      >
        <span
          className="font-bold leading-compact text-muted"
          style={{ fontSize: "var(--ds-text-2xs)", letterSpacing: "var(--ds-tracking-mega)" }}
        >
          CPU
        </span>
        <span
          className="font-display font-black leading-compact"
          style={{
            color: violet,
            fontSize: "var(--ds-text-md)",
            letterSpacing: "var(--ds-tracking-display)",
          }}
        >
          {lastMove.actorName.toUpperCase()} · {boardActionLabels[lastMove.verb]}
        </span>
      </span>
    </div>
  );
}

/* ---- The goal wash --------------------------------------------------------- */

export function GoalFlash({ match }: { match: ChessMatch }) {
  if (match.phase !== "goalScored") return null;
  return (
    <span
      key={match.eventTick}
      className={`${styles.goalFlash} pointer-events-none absolute inset-0`}
      style={{ background: accentVar("gold") }}
      aria-hidden
    />
  );
}

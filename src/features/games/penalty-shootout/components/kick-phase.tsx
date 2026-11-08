"use client";

import { useEffect, useState } from "react";

import { accentVar, Button, Glyph, withAlpha } from "@statoz/design-system/web";

import {
  autoAdvanceMs,
  autoAdvanceTickMs,
  resolvingHoldMs,
} from "../constants";
import { useCountdown } from "../state/use-kick-timeline";
import {
  currentKeeper,
  currentShooter,
  penaltyDirectionLabels,
  playerTaking,
  turnRole,
  type PenaltyDirection,
  type PenaltyKick,
  type ShootoutState,
} from "../types";

import { KickHistoryRow, opponentTag } from "./kick-history-row";
import { KickScene } from "./kick-scene";
import { PenaltyArena } from "./penalty-arena";
import { ShooterActionPanel } from "./shooter-action-panel";
import { MatchPanel, MatchScaffold } from "../../shared/components/match-chrome";

/**
 * The kick loop: aim or dive, commit, watch it resolve, go again.
 *
 * Choosing and resolving share this one component — and one mount — so the
 * header and the running score stay put between kicks instead of crossfading
 * out and back in every time the ball is struck.
 */

export type KickPhaseProps = {
  state: ShootoutState;
  onSelect: (direction: PenaltyDirection) => void;
  onConfirm: () => void;
  onNextKick: () => void;
  onSummary: () => void;
  onQuit: () => void;
};

export function KickPhase(props: KickPhaseProps) {
  const { state } = props;
  const title = state.suddenDeath ? "SUDDEN DEATH" : "PENALTY SHOOTOUT";
  const scoreLabel = `PEN ${state.playerScore}-${state.opponentScore}`;

  return state.stage === "result" ? (
    <ResultBeat {...props} title={title} scoreLabel={scoreLabel} />
  ) : (
    <ChooseBeat {...props} title={title} scoreLabel={scoreLabel} />
  );
}

type BeatProps = KickPhaseProps & { title: string; scoreLabel: string };

function ChooseBeat({
  state,
  onSelect,
  onConfirm,
  onQuit,
  title,
  scoreLabel,
}: BeatProps) {
  const shooting = playerTaking(state);
  const selected = state.selectedDirection;

  const confirmLabel = selected
    ? `${shooting ? "TAKE SHOT" : "COMMIT DIVE"} · ${penaltyDirectionLabels[selected]}`
    : shooting
      ? "CHOOSE SHOT TARGET"
      : "CHOOSE DIVE DIRECTION";

  return (
    <MatchScaffold
      quitLabel="Quit shootout"
      title={title}
      subtitle={
        shooting ? "// ATTACK — YOUR SHOT" : "// DEFEND — YOU'RE IN GOAL"
      }
      scoreLabel={scoreLabel}
      onQuit={onQuit}
      bottomAction={
        <Button
          variant="solid"
          accent={accentVar("lime")}
          size="lg"
          fullWidth
          glow={selected !== null}
          disabled={selected === null}
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
      }
    >
      <ShooterActionPanel
        role={turnRole(state)}
        shooter={currentShooter(state)}
        keeper={currentKeeper(state)}
        opponentName={state.opponentName}
      />
      <PenaltyArena
        role={turnRole(state)}
        keeper={currentKeeper(state)}
        selected={selected}
        onSelect={onSelect}
      />
    </MatchScaffold>
  );
}

function ResultBeat({
  state,
  onNextKick,
  onSummary,
  onQuit,
  title,
  scoreLabel,
}: BeatProps) {
  const kick = state.kicks[state.kicks.length - 1];

  const subtitle = kick.byPlayer
    ? kick.scored
      ? "// GOAL"
      : "// SHOT SAVED"
    : kick.scored
      ? "// GOAL CONCEDED"
      : "// YOU SAVED IT";

  return (
    <MatchScaffold
      quitLabel="Quit shootout"
      title={title}
      subtitle={subtitle}
      scoreLabel={scoreLabel}
      onQuit={onQuit}
      bottomAction={
        state.over ? (
          <Button
            variant="solid"
            accent={accentVar("lime")}
            size="lg"
            fullWidth
            glow
            onClick={onSummary}
          >
            CONTINUE
          </Button>
        ) : (
          <NextKickAction
            key={state.kicks.length}
            state={state}
            onNextKick={onNextKick}
          />
        )
      }
    >
      <KickScene key={kick.kickNumber} kick={kick} />
      <KickTable kick={kick} opponentName={state.opponentName} />
      <MatchPanel accent={accentVar("cyan")}>
        <KickHistoryRow kicks={state.kicks} opponentName={state.opponentName} />
      </MatchPanel>
      {state.over ? <WinnerBanner winner={state.winner} /> : null}
    </MatchScaffold>
  );
}

/** Who did what, with the user always on the left whoever took the kick. */
function KickTable({
  kick,
  opponentName,
}: {
  kick: PenaltyKick;
  opponentName: string;
}) {
  const userShot = kick.byPlayer;
  const shot = penaltyDirectionLabels[kick.shootDirection];
  const dive = penaltyDirectionLabels[kick.diveDirection];

  const user = {
    card: userShot ? kick.shooter : kick.keeper,
    action: userShot ? `SHOT ${shot}` : `DIVED ${dive}`,
    glyph: userShot ? ("sports_soccer" as const) : ("pan_tool" as const),
  };
  const rival = {
    card: userShot ? kick.keeper : kick.shooter,
    action: userShot ? `DIVED ${dive}` : `SHOT ${shot}`,
    glyph: userShot ? ("pan_tool" as const) : ("sports_soccer" as const),
  };

  return (
    <MatchPanel accent={accentVar("cyan")}>
      <p
        className="font-display font-black leading-compact"
        style={{
          fontSize: "var(--ds-text-xs)",
          letterSpacing: "var(--ds-tracking-label)",
        }}
      >
        {`SHOT: ${shot} · DIVE: ${dive}`}
      </p>

      <div className="mt-2.5 flex items-stretch">
        <KickCell
          heading="YOU"
          accent={accentVar("cyan")}
          name={user.card.shortName}
          action={user.action}
          glyph={user.glyph}
        />
        <span
          aria-hidden
          className="mx-2 w-px self-stretch"
          style={{ background: "var(--ds-color-border-strong)" }}
        />
        <KickCell
          heading={opponentTag(opponentName)}
          accent={accentVar("orange")}
          name={rival.card.shortName}
          action={rival.action}
          glyph={rival.glyph}
        />
      </div>
    </MatchPanel>
  );
}

function KickCell({
  heading,
  accent,
  name,
  action,
  glyph,
}: {
  heading: string;
  accent: string;
  name: string;
  action: string;
  glyph: "sports_soccer" | "pan_tool";
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <span className="shrink-0" style={{ color: accent }}>
        <Glyph name={glyph} size={22} />
      </span>
      <div className="min-w-0">
        <p
          className="font-display font-extrabold leading-compact"
          style={{
            color: accent,
            fontSize: "var(--ds-text-2xs)",
            letterSpacing: "var(--ds-tracking-ultra)",
          }}
        >
          {heading}
        </p>
        <p
          className="mt-1 truncate font-bold leading-compact"
          style={{ fontSize: "var(--ds-text-2xs)" }}
        >
          {`${name} · ${action}`}
        </p>
      </div>
    </div>
  );
}

/**
 * The beat between kicks: a moment that reads as the game thinking, then a
 * button that counts itself down so a player can either tap on or sit back.
 *
 * Mounted fresh per kick by its `key`, so both timers start from the hold
 * rather than needing to be reset.
 */
function NextKickAction({
  state,
  onNextKick,
}: {
  state: ShootoutState;
  onNextKick: () => void;
}) {
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setResolved(true), resolvingHoldMs);
    return () => window.clearTimeout(timer);
  }, []);

  if (!resolved) {
    return (
      <div
        className="grid h-14 place-items-center font-display font-extrabold leading-compact text-muted"
        style={{
          fontSize: "var(--ds-text-xs)",
          letterSpacing: "var(--ds-tracking-label)",
          background: withAlpha("var(--ds-color-background-secondary)", 0.9),
          border: `1px solid ${withAlpha(accentVar("cyan"), 0.22)}`,
        }}
      >
        RESOLVING KICK…
      </div>
    );
  }

  return <AutoAdvanceButton state={state} onNextKick={onNextKick} />;
}

/** Counts down to the next kick, and takes it if nobody taps first. */
function AutoAdvanceButton({
  state,
  onNextKick,
}: {
  state: ShootoutState;
  onNextKick: () => void;
}) {
  const remaining = useCountdown(
    autoAdvanceMs / autoAdvanceTickMs,
    autoAdvanceTickMs,
  );

  useEffect(() => {
    const timer = window.setTimeout(onNextKick, autoAdvanceMs);
    return () => window.clearTimeout(timer);
  }, [onNextKick]);

  // `round` has already advanced, so this names the kick about to be taken.
  const nextRole = playerTaking(state) ? "ATTACK" : "DEFEND";

  return (
    <Button
      variant="solid"
      accent={accentVar("lime")}
      size="lg"
      fullWidth
      onClick={onNextKick}
    >
      {`NEXT: ${nextRole} · ${Math.max(0, remaining)}`}
    </Button>
  );
}

function WinnerBanner({ winner }: { winner: ShootoutState["winner"] }) {
  const won = winner === "player";
  const color = won ? accentVar("lime") : "var(--ds-color-danger)";

  return (
    <div
      className="px-3.5 py-4 text-center font-display font-black leading-compact"
      style={{
        color,
        fontSize: "var(--ds-text-lg)",
        letterSpacing: "var(--ds-tracking-display)",
        background: withAlpha(color, 0.1),
        border: `1px solid ${withAlpha(color, 0.4)}`,
      }}
    >
      {won ? "YOU WIN THE SHOOTOUT" : "DEFEAT IN THE SHOOTOUT"}
    </div>
  );
}

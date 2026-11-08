"use client";

import type { CSSProperties } from "react";

import {
  accentVar,
  Button,
  Glyph,
  glyphRegistry,
  rarityVar,
  withAlpha,
} from "@statoz/design-system/web";
import type { GlyphName } from "@statoz/design-system/web";
import type { PlayerCard } from "@/domain/cards";

import { lineupRevealMs } from "../constants";
import type { ShootoutState } from "../types";

import styles from "./penalty-shootout.module.css";
import { MatchScaffold } from "../../shared/components/match-chrome";

/**
 * Both squads squaring up before the first kick.
 *
 * The order shown is the order they will step up in: two attackers, two
 * defenders, then the keeper — who takes the fifth kick and then has to go
 * straight back in goal.
 */

/** The rows deal in one after another, your side first. */
const stepMs = Math.round(lineupRevealMs / 12);

function glyphFor(card: PlayerCard): GlyphName {
  return card.icon in glyphRegistry
    ? (card.icon as GlyphName)
    : "sports_soccer";
}

function SquadRow({
  card,
  index,
  accent,
  fromLeft,
  delayMs,
}: {
  card: PlayerCard;
  index: number;
  accent: string;
  fromLeft: boolean;
  delayMs: number;
}) {
  const style = {
    "--deal-delay": `${delayMs}ms`,
    "--deal-from": fromLeft ? "-24px" : "24px",
    background: withAlpha("var(--ds-color-background-secondary)", 0.7),
    border: `1px solid ${withAlpha(accent, 0.22)}`,
  } as CSSProperties;

  return (
    <div className={`${styles.deal} flex items-center gap-2.5 px-2.5 py-2`} style={style}>
      <span
        className="w-4 shrink-0 text-center font-display font-black leading-compact"
        style={{
          color: withAlpha(accent, 0.7),
          fontSize: "var(--ds-text-2xs)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {index + 1}
      </span>
      <span className="shrink-0" style={{ color: accent }}>
        <Glyph name={glyphFor(card)} size={18} />
      </span>
      <span
        className="min-w-0 flex-1 truncate font-display font-black leading-compact"
        style={{
          fontSize: "var(--ds-text-xs)",
          letterSpacing: "var(--ds-tracking-label)",
        }}
      >
        {card.shortName}
      </span>
      <span
        className="shrink-0 font-bold leading-compact text-muted"
        style={{
          fontSize: "var(--ds-text-2xs)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {card.position.split("/")[0]}
      </span>
      <span
        className="shrink-0 px-1.5 py-0.5 font-display font-black leading-compact"
        style={{
          fontSize: "var(--ds-text-2xs)",
          fontVariantNumeric: "tabular-nums",
          color: rarityVar(card.tier, "light"),
          background: withAlpha(rarityVar(card.tier), 0.16),
        }}
      >
        {card.rating}
      </span>
    </div>
  );
}

function Squad({
  label,
  accent,
  cards,
  fromLeft,
  startMs,
}: {
  label: string;
  accent: string;
  cards: PlayerCard[];
  fromLeft: boolean;
  startMs: number;
}) {
  return (
    <section className="flex flex-col gap-1.5">
      <h2
        className="font-display font-extrabold leading-compact"
        style={{
          color: accent,
          fontSize: "var(--ds-text-2xs)",
          letterSpacing: "var(--ds-tracking-max)",
        }}
      >
        {label}
      </h2>
      {cards.map((card, index) => (
        <SquadRow
          key={`${card.id}-${index}`}
          card={card}
          index={index}
          accent={accent}
          fromLeft={fromLeft}
          delayMs={startMs + index * stepMs}
        />
      ))}
    </section>
  );
}

export type LineupPhaseProps = {
  state: ShootoutState;
  onStart: () => void;
  onQuit: () => void;
};

export function LineupPhase({ state, onStart, onQuit }: LineupPhaseProps) {
  return (
    <MatchScaffold
      quitLabel="Quit shootout"
      title="PENALTY SHOOTOUT"
      subtitle="// FACE-OFF"
      onQuit={onQuit}
      bottomAction={
        <Button
          variant="solid"
          accent={accentVar("lime")}
          size="lg"
          fullWidth
          glow
          onClick={onStart}
        >
          BEGIN SHOOTOUT
        </Button>
      }
    >
      <div className="flex flex-1 flex-col justify-center gap-3">
        <Squad
          label="YOUR SQUAD"
          accent={accentVar("cyan")}
          cards={state.playerShooters}
          fromLeft
          startMs={0}
        />

        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="h-px flex-1"
            style={{ background: "var(--ds-color-border-default)" }}
          />
          <span
            className={`${styles.pulse} grid size-11 place-items-center rounded-pill font-display font-black leading-compact`}
            style={{
              fontSize: "var(--ds-text-xs)",
              letterSpacing: "var(--ds-tracking-label)",
              color: accentVar("lime"),
              background: withAlpha(accentVar("lime"), 0.1),
              border: `1px solid ${withAlpha(accentVar("lime"), 0.4)}`,
            }}
          >
            VS
          </span>
          <span
            aria-hidden
            className="h-px flex-1"
            style={{ background: "var(--ds-color-border-default)" }}
          />
        </div>

        <Squad
          label={`${state.opponentName.toUpperCase()} SQUAD`}
          accent={accentVar("orange")}
          cards={state.cpuShooters}
          fromLeft={false}
          startMs={stepMs * 6}
        />
      </div>
    </MatchScaffold>
  );
}

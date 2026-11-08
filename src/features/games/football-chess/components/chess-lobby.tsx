"use client";

import { DailyDrop } from "@/features/packs";

import type { CSSProperties } from "react";

import { accentVar, Button, Glyph, withAlpha } from "@statoz/design-system/web";
import { GameLeaderboardCta } from "@/features/games/components/game-leaderboard-cta";

import type { FootballChessStats } from "../state/football-chess-progress";
import { played, winRate } from "../state/football-chess-progress";
import {
  chessFormations,
  formationBlurbs,
  formationCodes,
  formationLabels,
  type ChessFormation,
} from "../types";

import styles from "./football-chess.module.css";

/**
 * The lobby — the web port of `football_chess_lobby_screen.dart`.
 *
 * Flutter reads the shape off the active deck slot, which is configured in its
 * deck builder. The web's football loadout carries no formation, so it is picked
 * here instead and remembered with the rest of the record — the same decision,
 * made where the player can see what it does.
 */

export type ChessLobbyProps = {
  stats: FootballChessStats;
  formation: ChessFormation;
  squadReady: boolean;
  onBack: () => void;
  onFormationChange: (formation: ChessFormation) => void;
  onPlay: () => void;
};

function delayed(delay: number): CSSProperties {
  return { "--lobby-delay": `${delay}ms` } as CSSProperties;
}

export function ChessLobby({
  stats,
  formation,
  squadReady,
  onBack,
  onFormationChange,
  onPlay,
}: ChessLobbyProps) {
  const gold = accentVar("gold");

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="mx-auto flex w-full max-w-95 flex-1 flex-col gap-4 px-5 pb-6 pt-4 md:max-w-120">
        <div className={styles.lobbyIn} style={delayed(0)}>
          <div className="flex items-center gap-2">
            <span
              className={`${styles.statusDot} block size-[7px] rounded-full`}
              style={{ background: gold }}
            />
            <span
              className="font-bold leading-compact text-muted"
              style={{
                fontSize: "var(--ds-text-2xs)",
                letterSpacing: "var(--ds-tracking-label)",
              }}
            >
              SYS://CHESS_GRID v1.0.0
            </span>
          </div>
        </div>

        <div className={`${styles.lobbyIn} flex items-center gap-3.5`} style={delayed(80)}>
          <span
            className="grid size-14.5 shrink-0 place-items-center rounded-full"
            style={{
              background: "var(--ds-color-background-elevated)",
              border: `1.6px solid ${withAlpha(gold, 0.5)}`,
              color: gold,
            }}
          >
            <Glyph name="grid_view" size={26} />
          </span>
          <div className="min-w-0">
            <h1
              className="font-display font-black leading-compact"
              style={{
                fontSize: "var(--ds-text-xl)",
                letterSpacing: "var(--ds-tracking-display)",
              }}
            >
              5V5 FOOTBALL CHESS
            </h1>
            <p
              className="mt-1 font-bold leading-compact text-muted"
              style={{
                fontSize: "var(--ds-text-2xs)",
                letterSpacing: "var(--ds-tracking-label)",
              }}
            >
              TWO MINUTES. ONE ACTION A TURN.
            </p>
          </div>
        </div>

        <div className={styles.lobbyIn} style={delayed(200)}>
          <SectionLabel>SHAPE</SectionLabel>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {chessFormations.map((option) => (
              <FormationTile
                key={option}
                formation={option}
                selected={option === formation}
                onSelect={() => onFormationChange(option)}
              />
            ))}
          </div>
          <p
            className="mt-2 leading-body text-muted"
            style={{ fontSize: "var(--ds-text-xs)" }}
          >
            {formationBlurbs[formation]}
          </p>
        </div>

        <div className={styles.lobbyIn} style={delayed(260)}>
          <div
            className="p-3"
            style={{
              background: `linear-gradient(160deg, ${withAlpha(
                "var(--ds-color-background-secondary)",
                0.72,
              )}, ${withAlpha("var(--ds-color-background-primary)", 0.42)})`,
              border: `1px solid ${withAlpha(gold, 0.28)}`,
            }}
          >
            <SectionLabel>RECORD</SectionLabel>
            <div className="mt-3 flex gap-2">
              <Stat label="WINS" value={String(stats.wins)} />
              <Stat label="DRAWS" value={String(stats.draws)} />
              <Stat label="LOSSES" value={String(stats.losses)} />
              <Stat label="WIN RATE" value={winRate(stats)} />
              <Stat label="STREAK" value={String(stats.currentStreak)} />
            </div>
            <p
              className="mt-2 font-bold leading-compact text-muted"
              style={{
                fontSize: "var(--ds-text-2xs)",
                letterSpacing: "var(--ds-tracking-tight)",
              }}
            >
              {played(stats)} PLAYED · BEST STREAK {stats.bestStreak}
            </p>
          </div>
        </div>

        <div className="flex-1" />

        <div className={`${styles.lobbyIn} flex flex-col gap-3`} style={delayed(320)}>
          <Button
            accent={gold}
            variant="solid"
            size="lg"
            fullWidth
            glow={squadReady}
            disabled={!squadReady}
            leadingIcon={<Glyph name="grid_view" size={20} />}
            onClick={onPlay}
          >
            {squadReady ? "FIND MATCH" : "SQUAD INCOMPLETE"}
          </Button>
          <p
            className="text-center font-bold leading-compact text-muted"
            style={{
              fontSize: "var(--ds-text-2xs)",
              letterSpacing: "var(--ds-tracking-label)",
            }}
          >
            {squadReady
              ? `SHAPE: ${formationCodes[formation]}  ${formationLabels[formation]}`
              : "BUILD A 5-A-SIDE DECK: 2 ATK · 2 DEF · GK"}
          </p>
          <Button accent={gold} variant="ghost" fullWidth onClick={onBack}>
            BACK TO GAMES
          </Button>
          <Button accent={gold} variant="ghost" fullWidth href="/decks/football?returnTo=/play/football-chess">
            DECK BUILDER
          </Button>
        </div>
        <GameLeaderboardCta sport="football" gameId="football-chess" />
        <DailyDrop sport="football" />
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="font-bold leading-compact text-muted"
      style={{ fontSize: "var(--ds-text-2xs)", letterSpacing: "var(--ds-tracking-ultra)" }}
    >
      {children}
    </p>
  );
}

function FormationTile({
  formation,
  selected,
  onSelect,
}: {
  formation: ChessFormation;
  selected: boolean;
  onSelect: () => void;
}) {
  const gold = accentVar("gold");
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`${styles.tile} flex cursor-pointer flex-col items-start gap-1 px-3 py-2.5`}
      style={{
        background: selected
          ? withAlpha(gold, 0.16)
          : withAlpha("var(--ds-color-background-elevated)", 0.8),
        border: `${selected ? 1.5 : 1}px solid ${
          selected ? withAlpha(gold, 0.9) : "var(--ds-color-border-default)"
        }`,
      }}
    >
      <span
        className="font-display font-black leading-compact"
        style={{
          color: selected ? gold : "var(--ds-color-text-default)",
          fontSize: "var(--ds-text-sm)",
          letterSpacing: "var(--ds-tracking-label)",
        }}
      >
        {formationLabels[formation]}
      </span>
      <span
        className="font-bold leading-compact text-muted ds-tabular"
        style={{ fontSize: "var(--ds-text-2xs)", letterSpacing: "var(--ds-tracking-tight)" }}
      >
        {formationCodes[formation]}
      </span>
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 flex-1">
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

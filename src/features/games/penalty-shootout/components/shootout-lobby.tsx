"use client";

import { DailyDrop } from "@/features/packs";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useState } from "react";

import { accentVar, Progress, withAlpha } from "@statoz/design-system/web";
import { ArenaBackdrop } from "@/features/onboarding";
import { GameLeaderboardCta } from "@/features/games/components/game-leaderboard-cta";

import {
  lobbyActionsDelayMs,
  lobbyHeroDelayMs,
  lobbyPlayDelayMs,
  lobbyStatsDelayMs,
  lobbyStatsStepMs,
} from "../constants";
import {
  levelProgress,
  useShootoutProgress,
  type ShootoutHistoryEntry,
} from "../state/shootout-progress";

import { HudCta } from "./hud-cta";
import styles from "./penalty-shootout.module.css";
import { ShootoutEmblem } from "./shootout-emblem";

/**
 * The Penalty Shootout lobby.
 *
 * The screen the game opens on: what the player has done in this mode, whether
 * their squad can take the spot, and the one action that matters. It is the
 * Flutter lobby beat for beat — status strip, emblem and wordmark, three
 * telemetry cells, the hero CTA, and the pair of secondary actions — laid out
 * in the same 380px column on a phone and given room to breathe above it.
 */

const lime = accentVar("lime");
const cyan = accentVar("cyan");
const orange = accentVar("orange");

/** Groups an integer with thousands separators: 3870 becomes 3,870. */
function grouped(value: number): string {
  return value.toLocaleString("en-US");
}

function rise(delayMs: number): CSSProperties {
  return { "--rise-delay": `${delayMs}ms` } as CSSProperties;
}

export type ShootoutLobbyProps = {
  /** Whether the squad can take the spot: 2 attackers, 2 defenders, a keeper. */
  squadReady: boolean;
  onPlay: () => void;
  /** Leaves the game and returns through browser history. */
  onBack: () => void;
};

export function ShootoutLobby({
  squadReady,
  onPlay,
  onBack,
}: ShootoutLobbyProps) {
  const progress = useShootoutProgress();
  const [historyOpen, setHistoryOpen] = useState(false);
  const band = levelProgress(progress.xp);

  return (
    <div className="relative flex min-h-dvh flex-col">
      <ArenaBackdrop />

      <header className="relative flex shrink-0 items-center gap-2 px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to football games"
          className="grid size-11 shrink-0 place-items-center"
          style={{ color: lime }}
        >
          <svg width={18} height={18} viewBox="0 0 24 24" aria-hidden fill="none">
            <path
              d="M15 5l-7 7 7 7"
              stroke="currentColor"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <h1
          className="min-w-0 flex-1 truncate font-display font-black leading-compact"
          style={{
            fontSize: "var(--ds-text-sm)",
            letterSpacing: "var(--ds-tracking-display)",
          }}
        >
          PENALTY SHOOTOUT
        </h1>
        <LevelBadge level={band.level} fraction={band.fraction} />
      </header>

      <div className="relative flex flex-1 items-center justify-center px-6 pt-2 pb-9">
        <div className="flex w-full max-w-95 flex-col md:max-w-120">
          <div className={styles.rise} style={rise(0)}>
            <StatusStrip />
          </div>

          {/* Hero: the targeting emblem, the wordmark, and the squad's state. */}
          <div
            className={`${styles.rise} mt-4.5 flex items-center gap-4`}
            style={rise(lobbyHeroDelayMs)}
          >
            <ShootoutEmblem size={92} className="md:size-28" />
            <div className="min-w-0 flex-1">
              <p
                className="font-display font-black"
                style={{
                  fontSize: "var(--ds-text-2xl)",
                  lineHeight: 1.05,
                  letterSpacing: "var(--ds-tracking-display)",
                  textShadow: `0 0 14px ${withAlpha(lime, 0.4)}`,
                }}
              >
                PENALTY
                <br />
                SHOOTOUT
              </p>
              <p
                className="mt-2 font-display font-extrabold leading-compact text-muted"
                style={{
                  fontSize: "var(--ds-text-2xs)",
                  letterSpacing: "var(--ds-tracking-mega)",
                }}
              >
                SUDDEN-DEATH SPOT KICKS
              </p>
              <p
                className="mt-2.5 inline-block px-2 py-0.5 font-bold leading-compact"
                style={{
                  fontSize: "var(--ds-text-2xs)",
                  color: squadReady ? lime : orange,
                  background: withAlpha(squadReady ? lime : orange, 0.12),
                  border: `1px solid ${withAlpha(squadReady ? lime : orange, 0.7)}`,
                }}
              >
                {squadReady ? "SQUAD READY" : "SQUAD INCOMPLETE"}
              </p>
            </div>
          </div>

          {/* Telemetry — real numbers, no glow. */}
          <div className="mt-5 grid grid-cols-3 gap-2">
            <HudStat
              label="LEVEL"
              value={`${band.level}`}
              delayMs={lobbyStatsDelayMs}
            />
            <HudStat
              label="MODE XP"
              value={grouped(progress.xp)}
              delayMs={lobbyStatsDelayMs + lobbyStatsStepMs}
            />
            <HudStat
              label="WON"
              value={`${progress.wins}`}
              accent={lime}
              delayMs={lobbyStatsDelayMs + lobbyStatsStepMs * 2}
            />
          </div>

          <div className={`${styles.rise} mt-6`} style={rise(lobbyPlayDelayMs)}>
            <HudCta
              label="PLAY SHOOTOUT"
              accent={lime}
              onClick={onPlay}
              disabled={!squadReady}
            />
          </div>

          {!squadReady ? (
            <p
              className="mt-2.5 text-center font-semibold leading-body text-muted"
              style={{ fontSize: "var(--ds-text-xs)" }}
            >
              Build a full squad (2 ATK · 2 DEF · 1 GK) to take the spot.
            </p>
          ) : null}

          <div className="mt-3.5 grid grid-cols-2 gap-3">
            <SecondaryAction
              label="Deck Builder"
              delayMs={lobbyActionsDelayMs}
              href="/decks/football?returnTo=/play/penalty-shootout"
            />
            <SecondaryAction
              label="Match History"
              delayMs={lobbyActionsDelayMs + lobbyStatsStepMs}
              onClick={() => setHistoryOpen(true)}
            />
          </div>
          <div className="mt-3.5"><GameLeaderboardCta sport="football" gameId="penalty-shootout" /></div>
        <DailyDrop sport="football" />
        </div>
      </div>

      {historyOpen ? (
        <MatchHistoryDialog
          entries={progress.history}
          onClose={() => setHistoryOpen(false)}
        />
      ) : null}
    </div>
  );
}

/** A live indicator and a system readout — greebling, and a sign of life. */
function StatusStrip() {
  return (
    <div className="flex items-center gap-2.5">
      <span
        aria-hidden
        className="size-1.75 shrink-0 rounded-pill"
        style={{ background: lime, boxShadow: `0 0 8px ${withAlpha(lime, 0.6)}` }}
      />
      <span
        className="font-display font-black leading-compact"
        style={{
          color: lime,
          fontSize: "var(--ds-text-2xs)",
          letterSpacing: "var(--ds-tracking-mega)",
        }}
      >
        ARMED
      </span>
      <span
        aria-hidden
        className="h-px flex-1"
        style={{ background: withAlpha(lime, 0.16) }}
      />
      <span
        className="font-display font-extrabold leading-compact text-muted"
        style={{
          fontSize: "var(--ds-text-2xs)",
          letterSpacing: "var(--ds-tracking-label)",
        }}
      >
        SYS://SHOOTOUT v1.0.0
      </span>
    </div>
  );
}

function HudStat({
  label,
  value,
  accent = lime,
  delayMs,
}: {
  label: string;
  value: string;
  accent?: string;
  delayMs: number;
}) {
  return (
    <div
      className={`${styles.deal} px-2 py-2`}
      style={
        {
          "--deal-delay": `${delayMs}ms`,
          "--deal-from": "0px",
          "--deal-lift": "130px",
          background: withAlpha("var(--ds-color-background-primary)", 0.5),
          border: `1px solid ${withAlpha(accent, 0.25)}`,
        } as CSSProperties
      }
    >
      <p
        className="truncate font-display font-black leading-compact"
        style={{
          fontSize: "var(--ds-text-lg)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </p>
      <p
        className="mt-0.5 truncate font-display font-extrabold leading-compact text-muted"
        style={{
          fontSize: "var(--ds-text-2xs)",
          letterSpacing: "var(--ds-tracking-label)",
        }}
      >
        {label}
      </p>
    </div>
  );
}

function SecondaryAction({
  label,
  delayMs,
  onClick,
  href,
}: {
  label: string;
  delayMs: number;
  onClick?: () => void;
  href?: string;
}) {
  const className = `${styles.deal} grid h-11 w-full place-items-center font-display font-extrabold leading-compact cursor-pointer`;
  const style = {
    "--deal-delay": `${delayMs}ms`,
    "--deal-from": "0px",
    "--deal-lift": "95px",
    fontSize: "var(--ds-text-2xs)",
    letterSpacing: "var(--ds-tracking-label)",
    color: cyan,
    background: withAlpha("var(--ds-color-background-secondary)", 0.82),
    border: `1px solid ${withAlpha(cyan, 0.45)}`,
  } as CSSProperties;

  if (href) {
    return <Link href={href} className={className} style={style}>{label.toUpperCase()}</Link>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={className}
      style={style}
    >
      {label.toUpperCase()}
    </button>
  );
}

/** Every shootout this browser has finished, newest first. */
function MatchHistoryDialog({
  entries,
  onClose,
}: {
  entries: ShootoutHistoryEntry[];
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Shootout match history"
      className="fixed inset-0 z-50 grid place-items-center p-5"
      style={{ background: "var(--ds-color-overlay-scrim)" }}
    >
      <div
        className="flex max-h-140 w-full max-w-95 flex-col"
        style={{
          background: "var(--ds-color-background-elevated)",
          border: `1px solid ${withAlpha(cyan, 0.35)}`,
          boxShadow: "var(--ds-shadow-panel)",
        }}
      >
        <div
          className="flex shrink-0 items-center gap-3 px-4 py-3"
          style={{ borderBottom: `1px solid ${withAlpha(cyan, 0.2)}` }}
        >
          <h2
            className="min-w-0 flex-1 font-display font-black leading-compact"
            style={{
              fontSize: "var(--ds-text-sm)",
              letterSpacing: "var(--ds-tracking-display)",
            }}
          >
            SHOOTOUT HISTORY
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close match history"
            className="grid size-11 shrink-0 cursor-pointer place-items-center"
            style={{ color: cyan }}
          >
            <svg width={18} height={18} viewBox="0 0 24 24" aria-hidden fill="none">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {entries.length === 0 ? (
            <p
              className="px-4 py-10 text-center font-semibold leading-body text-muted"
              style={{ fontSize: "var(--ds-text-sm)" }}
            >
              No shootouts yet. Take the spot and this fills up.
            </p>
          ) : (
            entries.map((entry) => (
              <HistoryRow key={entry.id} entry={entry} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function HistoryRow({ entry }: { entry: ShootoutHistoryEntry }) {
  const won = entry.playerScore > entry.opponentScore;
  const color = won ? lime : "var(--ds-color-danger)";

  return (
    <div
      className="flex items-center gap-3 px-4 py-3"
      style={{ borderBottom: `1px solid var(--ds-color-border-subtle)` }}
    >
      <span
        className="w-13 shrink-0 font-display font-black leading-compact"
        style={{
          color,
          fontSize: "var(--ds-text-2xs)",
          letterSpacing: "var(--ds-tracking-label)",
        }}
      >
        {won ? "VICTORY" : "DEFEAT"}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className="truncate font-display font-bold leading-compact"
          style={{
            fontSize: "var(--ds-text-xs)",
            letterSpacing: "var(--ds-tracking-label)",
          }}
        >
          {entry.opponentName.toUpperCase()}
        </p>
        <p
          className="mt-1 font-bold leading-compact text-muted"
          style={{ fontSize: "var(--ds-text-2xs)" }}
        >
          {entry.suddenDeath ? "SUDDEN DEATH" : "PENALTIES"}
          {entry.xpEarned > 0 ? ` · +${entry.xpEarned} XP` : ""}
        </p>
      </div>
      <span
        className="shrink-0 font-display font-black leading-compact"
        style={{
          color,
          fontSize: "var(--ds-text-lg)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {`${entry.playerScore}-${entry.opponentScore}`}
      </span>
    </div>
  );
}

/** The mode's level, and how far into it — the lobby's right-hand badge. */
function LevelBadge({ level, fraction }: { level: number; fraction: number }) {
  return (
    <div
      className="flex h-11 shrink-0 items-center gap-2 px-2.5"
      style={{
        background: "var(--ds-color-background-secondary)",
        border: `1.2px solid ${withAlpha(cyan, 0.9)}`,
      }}
    >
      <div className="flex flex-col items-center">
        <span
          className="font-display font-black leading-compact"
          style={{
            color: cyan,
            fontSize: "var(--ds-text-2xs)",
            letterSpacing: "var(--ds-tracking-label)",
          }}
        >
          LVL
        </span>
        <span
          className="font-display font-black leading-compact"
          style={{
            fontSize: "var(--ds-text-md)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {level}
        </span>
      </div>
      <div className="w-13">
        <Progress
          value={fraction}
          accent={cyan}
          label={`Level ${level} progress`}
          height={4}
        />
      </div>
    </div>
  );
}

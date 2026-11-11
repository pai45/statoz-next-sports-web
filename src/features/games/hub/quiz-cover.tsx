"use client";

import Link from "next/link";
import type { CSSProperties } from "react";

import { accentVar, CheckIcon, LockIcon } from "@statoz/design-system/web";
import type { Sport } from "@/domain/sports";
import { useAuthSession, useRequireAuth } from "@/features/auth";
import type { GameEntry } from "@/mocks/games";
import { publicAsset } from "@/shared/config";

import { GameScene } from "../components/game-scenes";
import type { DailyCardStatus } from "../daily/daily-status";
import { sportNames } from "../daily/share";
import type { GameId } from "../types";
import styles from "./hub.module.css";

/**
 * A game as box art: the sport's world behind the game's own scene, the title
 * set as a logo, and where you stand today in the corner. Hover or focus lifts
 * it, lights its frame and offers PLAY; on the hub that also previews it in the
 * spotlight.
 */

export function worldUrl(sport: Sport | "trending"): string {
  return `url("${publicAsset(`/assets/backgrounds/hub/${sport}-wide.svg`)}")`;
}

export type QuizCoverProps = {
  game: GameId;
  entry: GameEntry;
  sport: Sport;
  status?: DailyCardStatus;
  active?: boolean;
  /** Called on hover and focus, for the spotlight preview. */
  onPreview?: (game: GameId) => void;
};

export function QuizCover({ game, entry, sport, status, active = false, onPreview }: QuizCoverProps) {
  const session = useAuthSession();
  const requireAuth = useRequireAuth();
  const locked = !entry.guestPlayable && session.status === "guest";
  const state = status?.state ?? null;
  const done = state === "done";
  const accent = accentVar(entry.accent);
  const action = locked ? "LOG IN" : done ? "RESULT" : state === "in-progress" ? "RESUME" : "PLAY";
  const statusText = locked
    ? "Log in to play"
    : !status
      ? ""
      : status.state === "done"
        ? `Done today, ${status.label}`
        : status.state === "in-progress"
          ? `In progress, ${status.label}`
          : "New today";
  const label = `${entry.title}, ${sportNames[sport].toLowerCase()}. ${statusText}`;

  const body = (
    <>
      <span className={styles.coverFrame}>
        <span className={styles.coverArt}>
          <span className={styles.coverWorld} style={{ "--world": worldUrl(sport) } as CSSProperties} aria-hidden />
          <span className={styles.coverScene} aria-hidden>
            <GameScene game={game} animate={active} />
          </span>
          <span className={styles.coverShade} aria-hidden />
          <span className={styles.coverLogo} aria-hidden>
            {entry.title}
          </span>
          <StatusBadge status={status} locked={locked} />
          <span className={styles.coverPlay} aria-hidden>
            {locked ? <LockIcon size={12} /> : <PlayMark />} {action}
          </span>
          <span className={styles.coverCorners} aria-hidden />
        </span>
      </span>
      <span className={styles.caption}>
        <span className={styles.captionTitle}>{entry.title}</span>
      </span>
      <span className={styles.captionSub}>
        <b>{sportNames[sport]}</b> · {entry.meta ?? entry.subtitle}
      </span>
    </>
  );

  const shared = {
    className: `${styles.cover} ${done ? styles.coverDone : ""}`,
    style: { "--cover": accent } as CSSProperties,
    "data-active": active || undefined,
    "data-game-card": game,
    "aria-label": label,
    onPointerEnter: (event: React.PointerEvent) => {
      if (event.pointerType === "mouse") onPreview?.(game);
    },
    onFocus: () => onPreview?.(game),
  };

  if (locked) {
    return (
      <button
        type="button"
        {...shared}
        className={`${shared.className} w-full cursor-pointer text-left`}
        onClick={() => requireAuth({ intent: "play", message: `Log in to play ${entry.title} and save your progress.`, returnTo: entry.href })}
      >
        {body}
      </button>
    );
  }
  return (
    <Link href={entry.href} {...shared}>
      {body}
    </Link>
  );
}

function StatusBadge({ status, locked }: { status?: DailyCardStatus; locked: boolean }) {
  if (locked) {
    return (
      <span className={`${styles.coverStatus} ${styles.statusLocked}`}>
        <LockIcon size={11} /> LOG IN
      </span>
    );
  }
  if (!status) return null;
  // The corner has room for a score, not a sentence; the caption and the
  // accessible name carry the full label.
  const score = status.state === "new" ? null : (status.label.match(/\d+\/\d+/)?.[0] ?? null);
  if (status.state === "done") {
    return (
      <span className={`${styles.coverStatus} ${styles.statusDone}`}>
        <CheckIcon size={11} /> {score ?? (status.won ? "WON" : "DONE")}
      </span>
    );
  }
  if (status.state === "in-progress") return <span className={`${styles.coverStatus} ${styles.statusProgress}`}>{score ?? "…"}</span>;
  return <span className={`${styles.coverStatus} ${styles.statusNew}`}>NEW</span>;
}

export function PlayMark({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M4 2v12l10-6z" fill="currentColor" />
    </svg>
  );
}

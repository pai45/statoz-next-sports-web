"use client";
import { accentVar, BrandIcon, GameMarkIcon, HudPanel, LockIcon } from "@statoz/design-system/web";
import { useAuthSession, useRequireAuth } from "@/features/auth";
import type { GameEntry } from "@/mocks/games";
import type { GameId } from "../types";
import { artGameFor, GameScene } from "./game-scenes";
import styles from "./discovery-card.module.css";

export type DiscoveryGameTileProps = { game: GameId; entry: GameEntry; landscape?: boolean; streak?: number };

/** The Flutter launch hierarchy, adapted to web auth and responsive shelves. */
export function DiscoveryGameTile({ game, entry, landscape = false, streak = 0 }: DiscoveryGameTileProps) {
  const session = useAuthSession();
  const requireAuth = useRequireAuth();
  const authenticated = session.status === "authenticated", guest = session.status === "guest";
  const action = guest ? "LOG IN TO PLAY" : entry.ctaLabel ?? (entry.scene === "quiz" ? "TAKE THE QUIZ" : entry.scene === "bingo" ? "BUILD YOUR GRID" : "OPEN THE CHALLENGE");
  const badge = entry.badgeLabel ?? (entry.scene === "quiz" ? "TRIVIA" : entry.scene === "bingo" ? "GRID CHALLENGE" : "DAILY MYSTERY");
  return <HudPanel accent={accentVar(entry.accent)} className={styles.panel} href={authenticated ? entry.href : undefined}
    onClick={authenticated ? undefined : () => requireAuth({ intent: "play", message: `Log in to play ${entry.title} and save your progress.`, returnTo: entry.href })}
    label={`${entry.title}, ${action}`}>
    <div className={`${styles.body} ${landscape ? styles.landscape : ""}`}>
      <div className={styles.content}>
        <div className={styles.badge}><GameMarkIcon game={artGameFor(game)} size={20} /><span className={styles.badgeText}>{badge.split("//").at(-1)?.trim()}</span>{guest && <span className={styles.status}><LockIcon size={12} />LOG IN</span>}</div>
        <div className={styles.art}><GameScene game={game} /></div>
        <div className={styles.copy}>
          {streak > 0 && <span className={styles.streak}><BrandIcon name="streak" size={13} alt="" /><span className="ds-tabular">{streak}</span></span>}
          <p className={styles.title}>{entry.titleLines ? entry.titleLines.map(line => <span className="block" key={line}>{line}</span>) : entry.title}</p>
          <p className={styles.subtitle}>{entry.subtitle}</p>
        </div>
      </div>
      <p className={styles.rail}><span>{action}</span><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 8h11M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg></p>
    </div>
  </HudPanel>;
}

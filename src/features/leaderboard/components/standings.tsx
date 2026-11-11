"use client";

import type { CSSProperties } from "react";
import { TrophyIcon } from "@statoz/design-system/games";
import { formatInt } from "@/shared/utils/format";
import type { LeaderboardEntry, ScoreMeta, TournamentScope } from "../types";
import { RivalAvatar } from "./rank-parts";
import styles from "./board.module.css";

/** What the change column measures against. All-time still moves weekly. */
export function comparisonFor(scope: TournamentScope): string {
  return scope === "season" ? "last season" : "last week";
}

const unitNames: Record<string, string> = { XP: "XP", W: "Wins", PTS: "Points" };

export function RankChange({ movement, isNew, scope }: { movement: number; isNew: boolean; scope: TournamentScope }) {
  const comparison = comparisonFor(scope);
  const direction = isNew ? "new" : movement > 0 ? "up" : movement < 0 ? "down" : "same";
  const description = isNew
    ? `New since ${comparison}`
    : movement === 0 ? `Unchanged since ${comparison}` : `${movement > 0 ? "Up" : "Down"} ${Math.abs(movement)} since ${comparison}`;
  return <span className={styles.change} data-direction={direction}>
    <span className="sr-only">{description}</span>
    <span aria-hidden="true">{isNew ? "NEW" : movement === 0 ? "—" : `${movement > 0 ? "↑" : "↓"} ${Math.abs(movement)}`}</span>
  </span>;
}

export type StandingsProps = {
  entries: LeaderboardEntry[];
  meta: ScoreMeta;
  scope: TournamentScope;
  /** Team rows show a crest and open nothing. */
  teamBoard: boolean;
  avatarSrc?: string;
  frameColor?: string;
  onOpen?: (entry: LeaderboardEntry) => void;
};

export function Standings({ entries, meta, scope, teamBoard, avatarSrc, frameColor, onOpen }: StandingsProps) {
  return <div className={styles.standings}>
    <div className={styles.tableHeading} aria-hidden="true"><span>RANK</span><span>{teamBoard ? "TEAM" : "PLAYER"}</span><span>{meta.unit}</span><span>CHANGE</span></div>
    <ol className={styles.rankList} aria-label="Leaderboard standings" start={entries[0]?.rank ?? 1}>
      {entries.map((entry, index) => <li key={entry.name} value={entry.rank} className={styles.rankRow}
        data-rank={entry.rank} data-self={entry.isUser || undefined} data-entry={entry.name}
        style={{ "--row-delay": `${Math.min(index, 12) * 28}ms` } as CSSProperties}>
        <span className={styles.rankNumber}><span className="sr-only">Rank </span>{entry.rank <= 3 && <TrophyIcon size={15} aria-hidden="true" />}<b>{entry.rank}</b></span>
        <div className={styles.playerCell}>
          <EntryIdentity entry={entry} avatarSrc={avatarSrc} frameColor={frameColor} onOpen={teamBoard ? undefined : onOpen} />
          <span className={styles.mobileChange}><RankChange movement={entry.movement} isNew={entry.isNew} scope={scope} /></span>
        </div>
        <div className={styles.pointsCell}><strong className="ds-tabular"><span className="sr-only">{unitNames[meta.unit] ?? meta.unit}: </span>{formatInt(entry.score)}</strong></div>
        <div className={styles.desktopChange}><RankChange movement={entry.movement} isNew={entry.isNew} scope={scope} /></div>
      </li>)}
    </ol>
  </div>;
}

function EntryIdentity({ entry, avatarSrc, frameColor, onOpen }: {
  entry: LeaderboardEntry; avatarSrc?: string; frameColor?: string; onOpen?: (entry: LeaderboardEntry) => void;
}) {
  const content = <>
    <RivalAvatar name={entry.name} size={32} team={entry.team ?? undefined} highlight={entry.isUser}
      src={entry.isUser ? avatarSrc : undefined} frameColor={entry.isUser ? frameColor : undefined} />
    <span className={styles.playerCopy}>
      <strong>
        {entry.name}
        {entry.isUser && <small className={styles.youTag}>{entry.team ? "YOUR TEAM" : "YOU"}</small>}
        {!entry.team && entry.badge && <small className={styles.proTag}>{entry.badge}</small>}
      </strong>
    </span>
  </>;
  if (!onOpen) return <div className={styles.playerButton}>{content}</div>;
  return <button type="button" className={styles.playerButton} onClick={() => onOpen(entry)}
    aria-label={entry.isUser ? `Open your profile, ${entry.name}` : `View ${entry.name}'s profile`}>
    {content}
  </button>;
}

export function StandingsEmpty({ type }: { type: "matches" | "games" }) {
  return <div className={styles.emptyState}>
    <TrophyIcon size={32} aria-hidden="true" />
    <h3>The climb starts here</h3>
    <p>{type === "matches" ? "Make a match prediction to claim your first rank." : "Play this game to claim your first rank."}</p>
  </div>;
}

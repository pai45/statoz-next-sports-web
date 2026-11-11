"use client";

import { formatInt } from "@/shared/utils/format";
import type { LeaderboardEntry, ScoreMeta, TournamentScope } from "../types";
import { RivalAvatar } from "./rank-parts";
import { RankChange } from "./standings";
import styles from "./board.module.css";

/**
 * Where you stand on the open board. Sits in the rail on desktop and docks
 * above the bottom bar on a phone; either way it takes you to your row.
 */
export function YourStanding({ entry, meta, scope, avatarSrc, frameColor, onShow }: {
  entry: LeaderboardEntry;
  meta: ScoreMeta;
  scope: TournamentScope;
  avatarSrc?: string;
  frameColor?: string;
  onShow: () => void;
}) {
  const label = entry.team ? "YOUR TEAM" : "YOUR RANK";
  const spoken = entry.team ? "Your team" : "Your rank";
  return <button type="button" className={styles.standing} onClick={onShow}
    aria-label={`${spoken}: ${entry.rank}, ${entry.name}, ${formatInt(entry.score)} ${meta.unit}. Show on the board`}>
    <span className={styles.standingRank}>#{entry.rank}</span>
    <RivalAvatar name={entry.name} size={36} team={entry.team ?? undefined} highlight
      src={entry.team ? undefined : avatarSrc} frameColor={entry.team ? undefined : frameColor} />
    <span className={styles.standingCopy}>
      <span className={styles.standingLabel}>{label}</span>
      <strong className={styles.standingName}>{entry.name}</strong>
      <span className={`${styles.standingPoints} ds-tabular`}>{formatInt(entry.score)} <small>{meta.unit}</small></span>
    </span>
    <RankChange movement={entry.movement} isNew={entry.isNew} scope={scope} />
  </button>;
}

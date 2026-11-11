"use client";

import type { CSSProperties, ReactNode } from "react";
import { accentVar, rarityVar } from "@statoz/design-system/games";
import { formatInt } from "@/shared/utils/format";
import type { LeaderboardEntry, ScoreMeta } from "../types";
import { RankPlate } from "./rank-plate";
import { RivalAvatar } from "./rank-parts";
import styles from "./podium.module.css";

const medals = [accentVar("gold"), rarityVar("silver"), rarityVar("bronze")] as const;
const places = ["1ST", "2ND", "3RD"] as const;

/** The board's top three, arranged 2–1–3 on stepped platforms. */
export function PodiumStage({ entries, meta, avatarSrc, frameColor, onOpen }: {
  entries: LeaderboardEntry[];
  meta: ScoreMeta;
  avatarSrc?: string;
  frameColor?: string;
  /** Omitted on a team board, whose winners open nothing. */
  onOpen?: (entry: LeaderboardEntry) => void;
}) {
  if (entries.length < 3) return null;
  const [first, second, third] = entries;
  return <section className={styles.stage} aria-label="Top three">
    <ol className={styles.podium} aria-label="Top three podium">
      {[second, first, third].map((entry) => {
        const champion = entry.rank === 1;
        const medal = medals[entry.rank - 1];
        const face = <>
          <span className={styles.crownSlot}>{champion && <Crown />}</span>
          <span className={styles.portrait}>
            <RivalAvatar name={entry.name} size={champion ? 80 : 60} ring={medal} team={entry.team ?? undefined}
              src={entry.isUser ? avatarSrc : undefined} frameColor={entry.isUser ? frameColor : undefined} highlight={entry.isUser} />
          </span>
          <strong className={styles.name}>{entry.name} {entry.isUser && <small className={styles.youTag}>{entry.team ? "YOUR TEAM" : "YOU"}</small>}</strong>
        </>;
        return <li key={entry.name} value={entry.rank} className={styles.column}
          data-rank={entry.rank} data-self={entry.isUser || undefined} data-entry={entry.name}
          style={{ "--podium-medal": medal, "--podium-delay": `${champion ? 120 : entry.rank === 2 ? 60 : 0}ms` } as CSSProperties}>
          <Winner entry={entry} onOpen={onOpen}>{face}</Winner>
          <span className={`${styles.score} ds-tabular`}>{formatInt(entry.score)}<small>{meta.unit}</small></span>
          <RankPlate cut={10} borderColor="var(--podium-medal)"
            background="linear-gradient(180deg, color-mix(in srgb, var(--podium-medal) 24%, var(--ds-color-background-primary)), var(--ds-color-background-primary))"
            className={styles.platform}>
            <span className={styles.platformInner}><span className={styles.place}>{places[entry.rank - 1]}</span><span className={styles.platformStripes} aria-hidden="true" /></span>
          </RankPlate>
        </li>;
      })}
    </ol>
  </section>;
}

function Winner({ entry, onOpen, children }: { entry: LeaderboardEntry; onOpen?: (entry: LeaderboardEntry) => void; children: ReactNode }) {
  if (!onOpen) return <div className={styles.winner}>{children}</div>;
  return <button type="button" className={styles.winner} onClick={() => onOpen(entry)}
    aria-label={entry.isUser ? `Open your profile, ${entry.name}` : `View ${entry.name}'s profile`}>
    {children}
  </button>;
}

function Crown() {
  return <svg aria-hidden="true" width="36" height="27" viewBox="0 0 30 22" className={styles.crown}>
    <path fill="currentColor" d="M2 6l6.5 5L15 2l6.5 9L28 6l-2.5 11h-21z" />
    <path fill="currentColor" d="M4.5 18.5h21v3h-21z" />
    <circle cx="15" cy="12" r="1.8" fill="var(--ds-color-background-primary)" />
  </svg>;
}

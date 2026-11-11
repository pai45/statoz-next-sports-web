"use client";

import { AdaptiveDrawer } from "@statoz/design-system/games";
import type { LeaderboardWindow } from "../periods";
import type { TournamentScope } from "../types";
import styles from "./board.module.css";

const scopeLabels: Record<TournamentScope, string> = { weekly: "WEEKLY", season: "SEASON", allTime: "ALL-TIME" };

/** HOW RANKING WORKS: what each board counts, and when it turns over. */
export function LeaderboardDetails({ open, context, scope, periodWindow, onClose }: {
  open: boolean;
  context: string;
  scope: TournamentScope;
  periodWindow: LeaderboardWindow | null;
  onClose: () => void;
}) {
  return <AdaptiveDrawer open={open} onClose={onClose} title="HOW RANKING WORKS" className={styles.drawer}>
    <div className={styles.details}>
      <span className={styles.eyebrow}>{context} · {scopeLabels[scope]}</span>
      {periodWindow?.end != null && <p>This board closes <time dateTime={new Date(periodWindow.end).toISOString()}>{new Date(periodWindow.end).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</time> in your local time.</p>}
      <h2>Every league. Every game. One climb.</h2>
      <p>Each sport has a board for every league under MATCHES and for every game under QUIZ. Pick one from the list to see where you stand.</p>
      <h3>What each board counts</h3>
      <p>MATCHES boards rank players by the XP they earn from match predictions in that league. The TEAMS view ranks national sides by their points (PTS) instead. QUIZ boards count wins (W) in that game.</p>
      <h3>Clear periods, fresh standings</h3>
      <p>Weekly boards reset on Monday at 00:00 UTC. Seasons follow calendar quarters, starting January 1, April 1, July 1 and October 1 at 00:00 UTC. All-time boards never reset. A period&apos;s dates are UTC days; its closing time is shown in your local time.</p>
      <h3>Reading the board</h3>
      <p>Everyone is ranked by the score shown. Equal scores are placed alphabetically. Change shows the places gained or lost since last week (last season on a Season board); NEW means the player was not on the board before.</p>
      <div className={styles.protocolNote}><strong>LOCAL EDITION</strong><p>The other players on these boards are generated samples. Your own row is placed from the XP saved on this device.</p></div>
    </div>
  </AdaptiveDrawer>;
}

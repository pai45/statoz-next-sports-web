"use client";

import { CheckIcon, CloseIcon, EditIcon, LockIcon, PaidIcon, ScheduleIcon } from "@statoz/design-system/web";
import type { SportMatch } from "@/domain/matches";
import { useAuthSession } from "@/features/auth";
import { usePicks } from "@/features/picks/state/picks-store";
import { usePredictions } from "@/features/predictions/state/prediction-store";
import { pickMarkets } from "@/mocks/picks";
import { quizzesForMatch } from "@/mocks/matches";
import { formatOzCompact } from "@/shared/utils";
import { summarizeMatchActivity, type MatchActivity } from "../card-activity";
import styles from "./card-participation.module.css";

const signed = (value: number) => `${value > 0 ? "+" : value < 0 ? "−" : ""}${formatOzCompact(Math.abs(value))}`;
const exact = (value: number) => value.toLocaleString("en-GB");

const statusLabels = { locked: "Locked", saved: "Saved", pending: "Pending", placed: "Placed", live: "In play", reveal: "Results ready" };

/** A single quiet footer, kept exclusively on fixture cards. */
export function MatchActivityStrip({ activity }: { activity: MatchActivity | null }) {
  if (!activity) return null;
  const status = activity.status && statusLabels[activity.status];
  const Glyph = activity.status === "locked" ? LockIcon : activity.status === "saved" ? EditIcon : ScheduleIcon;
  const details = [
    status,
    `${activity.correct} correct, ${activity.wrong} wrong`,
    activity.hasSettledCoins && `${activity.profitOz > 0 ? "+" : ""}${exact(activity.profitOz)} Oz net profit or loss`,
    activity.refundOz > 0 && `${exact(activity.refundOz)} Oz refunded`,
    activity.pendingReturnOz > 0 && `Potential return ${exact(activity.pendingReturnOz)} Oz; result pending`,
    activity.pendingStakeOz > 0 && `${exact(activity.pendingStakeOz)} Oz placed or entry paid`,
  ].filter(Boolean).join(". ");
  const coins = activity.hasSettledCoins || activity.refundOz > 0 || activity.pendingReturnOz > 0 || activity.pendingStakeOz > 0;
  return <span className={styles.strip} role="group" aria-label={`Your match activity: ${details}`} title={details} data-match-activity>
    <span className={styles.signals} aria-hidden="true">
      {status && <span className={styles.status}><Glyph size={11}/><span>{status}</span></span>}
      {activity.correct > 0 && <span className={styles.verdict} data-tone="correct"><CheckIcon size={11}/>{activity.correct}</span>}
      {activity.wrong > 0 && <span className={styles.verdict} data-tone="wrong"><CloseIcon size={11}/>{activity.wrong}</span>}
      <span className={styles.trace}>{activity.marks.slice(0,8).map((mark,index)=><i key={index} data-verdict={mark}/>)}</span>
    </span>
    {coins && <span className={styles.coins} aria-hidden="true"><PaidIcon size={11}/>
      {activity.hasSettledCoins && <span data-tone={activity.profitOz > 0 ? "correct" : activity.profitOz < 0 ? "wrong" : undefined}>{signed(activity.profitOz)} Oz</span>}
      {activity.refundOz > 0 && <span>{formatOzCompact(activity.refundOz)} Oz back</span>}
      {activity.pendingReturnOz > 0 ? <span>{formatOzCompact(activity.pendingReturnOz)} Oz pending</span> : activity.pendingStakeOz > 0 && <span>{formatOzCompact(activity.pendingStakeOz)} Oz in</span>}
    </span>}
  </span>;
}

export function MatchParticipation({ match }: { match: SportMatch }) {
  const picks = usePicks(), predictions = usePredictions(), session = useAuthSession();
  if (!session.isAuthenticated) return null;
  const entries = Object.values(predictions.predictions).filter(prediction => prediction.matchId === match.id);
  const activity = summarizeMatchActivity({ match, markets: pickMarkets, positions: picks.positions, quizzes: entries.length ? quizzesForMatch(match) : [], predictions: entries });
  return <MatchActivityStrip activity={activity}/>;
}

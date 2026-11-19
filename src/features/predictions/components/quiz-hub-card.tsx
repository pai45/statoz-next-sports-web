"use client";

import type { CSSProperties } from "react";
import { ArrowRightIcon, BoltIcon, LockIcon } from "@statoz/design-system/web";
import type { SportMatch } from "@/domain/matches";
import type { PredictionQuiz, UserPrediction } from "@/domain/predictions";
import { EditorialRevealCard } from "@/features/matches/components/editorial-reveal-card";
import { TeamBadge } from "@/features/matches/components/team-badge";
import { resolveQuizHubVisual } from "../hub-visual";
import styles from "./predictions.module.css";

export type QuizHubCardProps = {
  match: SportMatch;
  quiz: PredictionQuiz;
  index: number;
  prediction: UserPrediction | undefined;
  coins?: number;
  now?: number;
  onOpen: () => void;
  onBlocked: (message: string) => void;
};

/** The Games cartridge frame, with the quiz identity and one quiet launch action. */
export function QuizHubCard({ match, quiz, index, prediction, coins, now, onOpen, onBlocked }: QuizHubCardProps) {
  const visual = resolveQuizHubVisual(match, quiz, prediction, { coins, now });
  if (visual.glow && match.sport !== "tennis") return <EditorialRevealCard match={match} quiz={quiz} onOpen={onOpen}/>;
  const action = visual.tag === "OBJECTIVE" ? "Start predicting" : prediction?.status === "settled" ? "Review predictions" : visual.ctaText;
  const ActionIcon = visual.blocked ? LockIcon : ArrowRightIcon;
  const category = visual.tag === "OBJECTIVE" ? visual.contest ? "Scoreline contest" : "Free quiz" : visual.tag;

  return <button
    type="button"
    className={`${styles.hubCard} ${visual.blocked ? styles.hubBlocked : ""}`}
    style={{ "--hub-accent": visual.accent } as CSSProperties}
    aria-label={`${quiz.title}, ${match.home.name} versus ${match.away.name}, ${quiz.questions.length} questions, ${visual.rewardText}. ${visual.blocked ? visual.blockedMessage : action}${visual.contest && !visual.contest.paid ? `. Entry ${visual.contest.fee} Oz` : ""}`}
    onClick={() => visual.blocked ? onBlocked(visual.blockedMessage ?? "This quiz is not available right now.") : onOpen()}
    data-quiz-card
  >
    <span className={styles.hubFrame}>
      <span className={styles.hubHeading}>
        <span className={styles.hubSerial} aria-hidden="true">{String(index).padStart(2, "0")}</span>
        <span className={styles.hubTag}>{category}</span>
        <span className={styles.hubReward} style={{ "--reward-color": visual.rewardColor } as CSSProperties}><BoltIcon size={13} aria-hidden="true"/>{visual.rewardText}</span>
      </span>
      <span className={styles.hubMain}>
        <span className={styles.hubCopy}>
          <i className={styles.hubSignal} aria-hidden="true"/>
          <span className={styles.hubTitle}>{quiz.title}</span>
          {quiz.subtitle && <span className={styles.hubSubtitle}>{quiz.subtitle}</span>}
          {match.sport !== "motorsport" && <span className={styles.hubFixture}>
            <span className={styles.hubTeam}><TeamBadge team={match.home} size={30}/><strong>{match.home.shortName}</strong></span>
            <span className={styles.hubVersus}>vs</span>
            <span className={styles.hubTeam}><TeamBadge team={match.away} size={30}/><strong>{match.away.shortName}</strong></span>
          </span>}
        </span>
        <span className={styles.hubCta}>
          <span className={styles.hubCtaText}>{action}</span>
          <span className={styles.hubPlayPlate} aria-hidden="true"><ActionIcon size={18}/></span>
        </span>
      </span>
      {visual.blocked && visual.blockedMessage && <span className={styles.blockedNote}>{visual.blockedMessage}</span>}
      <span className={styles.hubCorner} aria-hidden="true"/>
    </span>
  </button>;
}

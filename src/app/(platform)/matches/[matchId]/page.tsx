import { matchById, matchDetailFor } from "@/mocks/matches";
import { MatchSummaryHeader } from "@/features/matches/components/match-summary-header";
import { MatchTabsView } from "@/features/matches/components/match-tabs-view";
import { MatchDetailContext } from "@/features/matches/components/match-detail-context";
import { allMockMatchIds } from "@/mocks/matches";
import { notFound } from "next/navigation";

import styles from "@/features/matches/components/match-detail.module.css";

export function generateStaticParams() {
  return allMockMatchIds.map((matchId) => ({ matchId }));
}

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const resolvedParams = await params;
  const match = matchById(resolvedParams.matchId);

  if (!match) {
    notFound();
  }
  const detail = matchDetailFor(match);

  return (
    <div className={styles.page}>
      <div className={styles.frame}>
        <MatchSummaryHeader match={match} />
        <MatchTabsView match={match} detail={detail} />
        <MatchDetailContext match={match} />
      </div>
    </div>
  );
}

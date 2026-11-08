import { notFound } from "next/navigation";

import { MatchCircleScreen } from "@/features/matches/components/match-circle-screen";
import { allMockMatchIds, matchById } from "@/mocks/matches";

import styles from "@/features/matches/components/match-circle.module.css";

export function generateStaticParams() {
  return allMockMatchIds.map((matchId) => ({ matchId }));
}

export default async function MatchCirclePage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  const match = matchById(matchId);
  if (!match) notFound();

  return (
    <div className={styles.page}>
      <div className={styles.frame}>
        <MatchCircleScreen match={match} />
      </div>
    </div>
  );
}

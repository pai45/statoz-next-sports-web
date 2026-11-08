import { notFound } from "next/navigation";
import { Suspense } from "react";

import { LeagueHubScreen } from "@/features/leagues";
import { allLeagueHubIds, leagueHubById } from "@/mocks/leagues";
import { fixturesForLeague } from "@/mocks/matches";
import { pickMarketsForLeague } from "@/mocks/picks";

export function generateStaticParams() {
  return allLeagueHubIds.map((leagueId) => ({ leagueId }));
}

export default async function LeagueHubPage({ params }: { params: Promise<{ leagueId: string }> }) {
  const { leagueId } = await params;
  const snapshot = leagueHubById(leagueId);
  if (!snapshot) notFound();

  return (
    <Suspense fallback={null}>
      <LeagueHubScreen snapshot={snapshot} fixtures={fixturesForLeague(leagueId)} markets={pickMarketsForLeague(leagueId)} />
    </Suspense>
  );
}

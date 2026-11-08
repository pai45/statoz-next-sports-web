import { notFound } from "next/navigation";

import { LeaguePlayerDossierScreen } from "@/features/leagues";
import { allLeaguePlayerParams, leaguePlayerById } from "@/mocks/leagues";

export function generateStaticParams() {
  return allLeaguePlayerParams;
}

export default async function LeaguePlayerPage({ params }: { params: Promise<{ leagueId: string; playerId: string }> }) {
  const { leagueId, playerId } = await params;
  const profile = leaguePlayerById(leagueId, playerId);
  if (!profile) notFound();
  return <LeaguePlayerDossierScreen profile={profile} />;
}

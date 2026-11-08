import { notFound } from "next/navigation";

import { MatchPlayerDossierScreen } from "@/features/matches";
import { matchById, matchDetailFor } from "@/mocks/matches";
import { cricketSnapshotPlayerIds, footballSnapshotPlayerIds } from "@/mocks/matches/details";

export function generateStaticParams() {
  return [
    ...footballSnapshotPlayerIds.map((playerId) => ({ matchId: "401879318", playerId })),
    ...cricketSnapshotPlayerIds.map((playerId) => ({ matchId: "1535465", playerId })),
  ];
}

export default async function MatchPlayerPage({ params }: { params: Promise<{ matchId: string; playerId: string }> }) {
  const { matchId, playerId } = await params;
  const match = matchById(matchId);
  if (!match) notFound();
  const player = matchDetailFor(match).scoreboard.players?.find((entry) => entry.id === playerId);
  if (!player) notFound();
  return <MatchPlayerDossierScreen match={match} player={player} />;
}

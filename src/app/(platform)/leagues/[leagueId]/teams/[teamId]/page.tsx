import { notFound } from "next/navigation";

import { TeamDetailScreen } from "@/features/leagues";
import { allLeagueHubIds, leagueHubById, leaguePlayersForTeam, leagueTeamById } from "@/mocks/leagues";
import { fixturesForLeague } from "@/mocks/matches";
import { pickMarketsForLeague } from "@/mocks/picks";

export function generateStaticParams() {
  return allLeagueHubIds.flatMap((leagueId) => {
    const snapshot = leagueHubById(leagueId);
    return snapshot?.groups.flatMap((group) => group.rows.map((row) => ({ leagueId, teamId: row.competitor.id }))) ?? [];
  });
}

export default async function LeagueTeamPage({ params }: { params: Promise<{ leagueId: string; teamId: string }> }) {
  const { leagueId, teamId } = await params;
  const snapshot = leagueHubById(leagueId);
  const competitor = leagueTeamById(leagueId, teamId);
  if (!snapshot || !competitor) notFound();

  const fixtures = fixturesForLeague(leagueId).filter((match) => mentionsCompetitor(match.home, competitor) || mentionsCompetitor(match.away, competitor));
  const markets = pickMarketsForLeague(leagueId).filter((market) => {
    const match = fixtures.find((fixture) => fixture.id === market.matchId);
    if (match) return true;
    const text = [market.question, market.contextTitle, market.homeLabel, market.awayLabel, ...market.outcomes.map((outcome) => outcome.label)].filter(Boolean).join(" ").toLowerCase();
    return text.includes(competitor.name.toLowerCase()) || text.includes(competitor.shortName.toLowerCase());
  });

  return <TeamDetailScreen snapshot={snapshot} competitor={competitor} fixtures={fixtures} markets={markets} players={leaguePlayersForTeam(leagueId, teamId)} />;
}

function mentionsCompetitor(candidate: { id: string; name: string; shortName: string }, target: { id: string; name: string; shortName: string }): boolean {
  return candidate.id === target.id || candidate.name === target.name || candidate.shortName === target.shortName;
}

import { crestForSport, type SportTeam } from "@/domain/matches";
import type { PickMarket, PickOutcome } from "@/domain/predictions";
import { sportFixtures } from "@/mocks/matches";
import { followableLeagues } from "@/mocks/onboarding";
import { resolveTeamPalette } from "@/mocks/identity/team-palettes.generated";

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Only named team outcomes get a crest; Yes, No, Draw and totals retain their labels. */
export function teamForMarketOutcome(market: PickMarket, outcome: PickOutcome): SportTeam | undefined {
  if (!["football", "cricket", "basketball"].includes(market.sport)) return undefined;
  const key = normalize(outcome.label), id = normalize(outcome.id);
  if (["yes", "no", "draw", "over", "under", "field", "thefield"].includes(id) || /\d|\//.test(outcome.label)) return undefined;
  const fixtures = sportFixtures.filter(match => match.sport === market.sport);
  const linked = fixtures.find(match => match.id === market.matchId);
  const teams = [...(linked ? [linked.home, linked.away] : []), ...fixtures.flatMap(match => [match.home, match.away])];
  const exact = teams.find(team => [team.id, team.name, team.shortName].some(value => normalize(value) === key || normalize(value) === id));
  if (exact) return exact;
  const club = followableLeagues.filter(league => league.sport === market.sport).flatMap(league => league.teams).find(team => [team.id, team.name, team.shortName].some(value => normalize(value) === key || normalize(value) === id));
  const palette = resolveTeamPalette({ sport: market.sport, name: club?.name ?? outcome.label, abbreviation: club?.shortName ?? outcome.id, competition: market.leagueLabel });
  if (!club && !palette) return undefined;
  return { id: club?.id ?? outcome.id, name: club?.name ?? outcome.label, shortName: club?.shortName ?? outcome.id.toUpperCase(), color: palette?.primaryColor ?? outcome.color ?? "var(--ds-color-accent-cyan)", secondaryColor: palette?.secondaryColor, badgeTextColor: palette?.textColor, crest: crestForSport(market.sport) };
}

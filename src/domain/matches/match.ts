import type { Sport } from "../sports";

export type MatchStatus = "scheduled" | "live" | "finished";

/**
 * The silhouette a team badge is drawn in. Each team sport has its own crest:
 * a striped shield for football and a ringed roundel for basketball. Cricket is
 * choosing between crossed bats and a wicket, so a fixture can still ask for
 * either. Everything else keeps the house octagon.
 */
export type TeamCrest = "octagon" | "shield" | "roundel" | "bats" | "wicket";

/** The crest every team in a sport wears. */
export function crestForSport(sport: Sport): TeamCrest {
  if (sport === "football") return "shield";
  if (sport === "basketball") return "roundel";
  if (sport === "cricket") return "bats";
  return "octagon";
}

export type SportTeam = {
  id: string;
  name: string;
  shortName: string;
  /** Identity color, as a hex value. */
  color: string;
  /** Secondary identity color used by two-tone badges. */
  secondaryColor?: string;
  /** Contrast-safe badge label color when white is unsuitable. */
  badgeTextColor?: string;
  /** Contrast-safe supporting label color for two-tone identity surfaces. */
  secondaryTextColor?: string;
  /** Badge design; the octagon when unset. */
  crest?: TeamCrest;
};

export type TennisSetScore = {
  homeScore: number;
  awayScore: number;
};

export type SportMatch = {
  id: string;
  sport: Sport;
  leagueId: string;
  /** Short code shown on tiles, for example "EPL". */
  leagueLabel: string;
  home: SportTeam;
  away: SportTeam;
  status: MatchStatus;
  /** ISO 8601 timestamp. */
  kickoff: string;
  /** Display-ready score. Cricket innings include wickets and overs. */
  homeScore?: number | string;
  awayScore?: number | string;
  /** Optional human-readable outcome shown below a finished fixture. */
  resultLine?: string;
  /** Per-set detail for tennis fixtures. */
  tennisSets?: TennisSetScore[];
  /** Minutes played, when live. */
  liveMinute?: number;
  /** XP a correct call on this match is worth. */
  rewardXp: number;
  /** Oz staked across this match's markets. */
  volumeOz: number;
};

export function isLive(match: SportMatch): boolean {
  return match.status === "live";
}

export function isFinished(match: SportMatch): boolean {
  return match.status === "finished";
}

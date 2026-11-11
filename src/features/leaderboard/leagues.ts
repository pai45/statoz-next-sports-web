import type { Sport } from "@/domain/sports";

/** `short` is the code on the league's tile in the board picker. */
export type LeaderboardLeague = { id: string; label: string; short: string };

export const leaderboardLeagues: Record<Sport, LeaderboardLeague[]> = {
  football: [
    { id: "epl", label: "PREMIER LEAGUE", short: "PL" },
    { id: "laliga", label: "LALIGA", short: "LL" },
    { id: "serie-a", label: "SERIE A", short: "SA" },
    { id: "bundesliga", label: "BUNDESLIGA", short: "BL" },
  ],
  cricket: [
    { id: "ipl", label: "IPL", short: "IPL" },
    { id: "t20i", label: "T20I", short: "T20" },
    { id: "bbl", label: "BIG BASH", short: "BBL" },
  ],
  basketball: [
    { id: "nba", label: "NBA", short: "NBA" },
    { id: "euroleague", label: "EUROLEAGUE", short: "EL" },
    { id: "wnba", label: "WNBA", short: "WNBA" },
  ],
  motorsport: [
    { id: "f1", label: "FORMULA 1", short: "F1" },
    { id: "f2", label: "FORMULA 2", short: "F2" },
    { id: "nascar", label: "NASCAR", short: "NAS" },
    { id: "indy", label: "INDYCAR", short: "INDY" },
  ],
  tennis: [
    { id: "atp", label: "ATP", short: "ATP" },
    { id: "wta", label: "WTA", short: "WTA" },
  ],
};

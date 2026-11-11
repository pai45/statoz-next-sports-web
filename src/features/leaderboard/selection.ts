import { sportModuleFor, sportOrder, type Sport } from "@/domain/sports";
import { gameRegistry, sportGameDecks } from "@/mocks/games";
import { leaderboardLeagues } from "./leagues";
import { tournamentScopeOrder } from "./scoring";
import type { GameMode, LeaderboardType, MatchesBoard, TournamentScope } from "./types";

/**
 * Which board is on screen, as the URL spells it.
 *
 * A MATCHES board is a sport's league; a QUIZ board is one of the sport's
 * games. Both remember the other half (`league` / `mode`) so switching type
 * lands where the player last was.
 */
export type LeaderboardSelection = {
  type: LeaderboardType;
  sport: Sport;
  league: string;
  mode: GameMode;
  board: MatchesBoard;
  scope: TournamentScope;
};

/** Keeps `league` and `mode` valid for the selection's sport. */
export function normalizeSelection(selection: LeaderboardSelection): LeaderboardSelection {
  const leagues = leaderboardLeagues[selection.sport];
  const deck = sportGameDecks[selection.sport];
  return {
    ...selection,
    league: leagues.some((league) => league.id === selection.league) ? selection.league : leagues[0].id,
    mode: deck.includes(selection.mode) ? selection.mode : deck[0],
  };
}

export function parseLeaderboardSelection(params: Pick<URLSearchParams, "get">): LeaderboardSelection {
  const scope = params.get("scope");
  return normalizeSelection({
    type: params.get("type") === "games" ? "games" : "matches",
    sport: sportOrder.find((sport) => sport === params.get("sport")) ?? "football",
    league: params.get("league") ?? "",
    mode: (params.get("mode") ?? "") as GameMode,
    board: params.get("board") === "teams" ? "teams" : "players",
    scope: tournamentScopeOrder.find((entry) => entry === scope) ?? "weekly",
  });
}

export function leaderboardHref(selection: LeaderboardSelection, search = false): string {
  const { type, sport, league, mode, board, scope } = selection;
  const params = new URLSearchParams({ type, sport, league, mode, board, scope });
  return `/leaderboard${search ? "/search" : ""}?${params}`;
}

/**
 * The search page's selection. Older links carried the board inside a
 * `returnTo` URL; that is read only when it points back at the leaderboard.
 */
export function searchBoardSelection(params: URLSearchParams): LeaderboardSelection {
  const returnTo = params.get("returnTo");
  if (!params.has("type") && returnTo) {
    try {
      const url = new URL(returnTo, "https://leaderboard.local");
      if (url.origin === "https://leaderboard.local" && /^\/leaderboard\/?$/.test(url.pathname)) {
        return parseLeaderboardSelection(url.searchParams);
      }
    } catch { /* A malformed legacy return URL is just the default board. */ }
  }
  return parseLeaderboardSelection(params);
}

/** The board's own name: the league, or the quiz game. */
export function boardTitle(selection: LeaderboardSelection): string {
  if (selection.type === "games") return gameRegistry[selection.mode].title;
  return leaderboardLeagues[selection.sport].find((league) => league.id === selection.league)?.label ?? "LEADERBOARD";
}

/** `FOOTBALL · MATCHES`, `CRICKET · QUIZ` and so on. */
export function boardContext(selection: LeaderboardSelection): string {
  const sport = sportModuleFor(selection.sport).label.toUpperCase();
  return `${sport} · ${selection.type === "games" ? "QUIZ" : "MATCHES"}`;
}

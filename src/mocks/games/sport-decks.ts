import type { Sport } from "@/domain/sports";

import { gameRegistry, isGameLive } from "./game-registry";
import type { GameId } from "@/features/games/types";

/**
 * Every game a sport offers, in the order its deck lists them. Heroes lead,
 * quick games follow — the deck reads the `kind` off the registry rather than
 * keeping two lists, so a game can be promoted by editing one field.
 */
const sourceDecks: Record<Sport, GameId[]> = {
  football: [
    "retro-football",
    "pitch-duel",
    "penalty-shootout",
    "football-chess",
    "football-daily-quiz",
    "guess-player",
    "football-who-are-ya",
    "football-grid",
    "football-connections",
    "football-higher-lower",
    "football-bingo",
    "football-quiz",
  ],
  cricket: ["retro-innings", "final-over", "cricket-daily-quiz", "cricket-guess-player", "cricket-who-are-ya", "cricket-higher-lower", "cricket-quiz"],
  basketball: ["retro-hoops", "hoop-duel", "basketball-daily-quiz", "basketball-guess-player", "basketball-who-are-ya", "basketball-higher-lower", "basketball-quiz"],
  tennis: ["tennis-rally", "tennis-daily-quiz", "tennis-higher-lower", "tennis-guess-winner", "tennis-quiz"],
  motorsport: ["retro-circuit", "grand-prix-dash", "motorsport-daily-quiz", "motorsport-higher-lower", "guess-driver", "motorsport-quiz"],
};

export const sportGameDecks = Object.fromEntries(Object.entries(sourceDecks).map(([sport, games]) => [sport, games.filter(isGameLive)])) as Record<Sport, GameId[]>;

/** A sport's daily games, in the order its TODAY row lists them. */
export function dailyGamesFor(sport: Sport): GameId[] {
  return sportGameDecks[sport].filter((id) => gameRegistry[id].daily === true);
}

/** The sport's quiz ladder game, which the QUIZ PATHS section opens. */
export function quizPathsGameFor(sport: Sport): GameId | null {
  return sportGameDecks[sport].find((id) => gameRegistry[id].format === "quiz-paths") ?? null;
}

export type SportDeck = {
  sport: Sport;
  heroes: GameId[];
  quick: GameId[];
};

/** A sport's deck, split into the two shelves it renders as. */
export function deckFor(sport: Sport): SportDeck {
  const games = sportGameDecks[sport];
  return {
    sport,
    heroes: games.filter((id) => gameRegistry[id].kind === "hero"),
    quick: games.filter((id) => gameRegistry[id].kind === "quick"),
  };
}

/** Small summary used by the shared All Sports picker. */
export function gameCountForSport(sport: Sport): number {
  return sportGameDecks[sport].length;
}

/**
 * Which sport a game belongs to, inverted from the decks above so the two can
 * never disagree about it.
 */
const sportByGame: Record<GameId, Sport> = Object.fromEntries(
  Object.entries(sportGameDecks).flatMap(([sport, games]) =>
    games.map((id) => [id, sport as Sport] as const),
  ),
) as Record<GameId, Sport>;

export function sportForGame(game: GameId): Sport {
  return sportByGame[game];
}

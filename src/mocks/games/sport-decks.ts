import { isGameEnabled } from "@/domain/demo-product";
import type { Sport } from "@/domain/sports";

import { gameRegistry } from "./game-registry";
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
    "football-quiz",
    "football-bingo",
    "guess-player",
  ],
  cricket: ["retro-innings", "final-over", "cricket-quiz", "cricket-guess-player"],
  basketball: ["retro-hoops", "hoop-duel", "basketball-quiz", "basketball-guess-player"],
  tennis: ["tennis-rally", "tennis-quiz", "tennis-guess-winner"],
  motorsport: ["retro-circuit", "grand-prix-dash", "motorsport-quiz", "guess-driver"],
};

export const sportGameDecks = Object.fromEntries(Object.entries(sourceDecks).map(([sport, games]) => [sport, games.filter(isGameEnabled)])) as Record<Sport, GameId[]>;

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

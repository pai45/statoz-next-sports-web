import type { BentoSpan, StatozGameId } from "@statoz/design-system/web";
import type { Sport } from "@/domain/sports";

/**
 * Identifier of a playable game. Several sports run their own cut of the same
 * format — five quizzes, four mystery games — so the id names the sport's
 * version rather than the format alone.
 */
export type GameId =
  | StatozGameId
  | "retro-circuit"
  | "retro-football"
  | "retro-hoops"
  | "retro-innings"
  | DailyQuizGameId
  | WhoAreYaGameId
  | HigherLowerGameId
  | "football-grid"
  | "football-connections";

/** Higher or Lower on card ratings, one per sport. Borrows each sport's arcade art. */
export type HigherLowerGameId =
  | "football-higher-lower"
  | "cricket-higher-lower"
  | "basketball-higher-lower"
  | "tennis-higher-lower"
  | "motorsport-higher-lower";

/** Who Are Ya, for the sports with career routes. Borrows Guess the Player's art. */
export type WhoAreYaGameId = "football-who-are-ya" | "cricket-who-are-ya" | "basketball-who-are-ya";

/**
 * The Daily Quiz, one per sport. Web-only ids: they borrow their sport quiz's
 * artwork and game mark, so the shared design system needs no new entries.
 */
export type DailyQuizGameId =
  | "football-daily-quiz"
  | "cricket-daily-quiz"
  | "basketball-daily-quiz"
  | "tennis-daily-quiz"
  | "motorsport-daily-quiz";

/**
 * What kind of game an entry is, which decides where the Quiz hub files it:
 * dailies under TODAY, quiz ladders under QUIZ PATHS, arcade games elsewhere.
 */
export type GameFormat =
  | "daily-quiz"
  | "quiz-paths"
  | "guess-player"
  | "who-are-ya"
  | "grid"
  | "higher-lower"
  | "connections"
  | "bingo"
  | "mystery"
  | "arcade";

/**
 * How a game presents itself. `hero` tiles carry a painted scene and a call to
 * action; `quick` tiles are the compact icon plates.
 */
export type GameTileKind = "hero" | "quick";

/**
 * Which illustration a game shows. Formats that repeat across sports share one
 * drawing rather than carrying five near-identical files.
 */
export type GameSceneId =
  | "pitch-duel"
  | "penalty-shootout"
  | "football-chess"
  | "final-over"
  | "hoop-duel"
  | "grand-prix-dash"
  | "tennis-rally"
  | "quiz"
  | "bingo"
  | "guess-player"
  | "guess-driver"
  | "guess-winner";

/** One tile in the games trending bento. */
export type GamesTrendingTileConfig = {
  id: string;
  /** Id of the game the tile launches. */
  sourceId: GameId;
  sport: Sport;
  span: BentoSpan;
};

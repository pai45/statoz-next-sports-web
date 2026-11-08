import type { BentoSpan, StatozGameId } from "@statoz/design-system/web";
import type { Sport } from "@/domain/sports";

/**
 * Identifier of a playable game. Several sports run their own cut of the same
 * format — five quizzes, four mystery games — so the id names the sport's
 * version rather than the format alone.
 */
export type GameId = StatozGameId | "retro-circuit" | "retro-football" | "retro-hoops" | "retro-innings";

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

import type { SportTeam } from "@/domain/matches";
import type { GameId } from "@/features/games/types";

/** Which board is on screen. Drives the score unit and the filter row. */
export type LeaderboardType = "matches" | "games";

/** The tournament board ranks either players or the teams they back. */
export type MatchesBoard = "teams" | "players";

/** How far back the tournament board counts. */
export type TournamentScope = "weekly" | "season" | "allTime";

/** The four modes the GAMES board separates wins by. */
export type GameMode = GameId;

/**
 * One fabricated rival. There is no backend — a rival is a display name plus a
 * canonical XP (`base`), from which their avatar, level and whole dossier are
 * derived deterministically, so they read identically wherever they appear.
 */
export type RivalSeed = {
  name: string;
  base: number;
  /** >0 climbed, <0 dropped, 0 held. */
  movement: number;
  isNew?: boolean;
  badge?: string;
};

/** A national team on the tournament TEAMS board. */
export type TeamSeed = {
  team: SportTeam;
  score: number;
  movement: number;
  /** The side the player backs. A team board ranks teams, not players. */
  isBacked?: boolean;
};

/**
 * One row on a rank board. `score` is whatever the active board measures; `xp`
 * is the player's canonical XP, which is what their dossier is scouted from.
 */
export type LeaderboardEntry = {
  rank: number;
  name: string;
  score: number;
  /** >0 climbed, <0 dropped, 0 held. */
  movement: number;
  isNew: boolean;
  badge?: string;
  isUser: boolean;
  /** Set on a team row, which shows a crest and opens no dossier. */
  team?: SportTeam | null;
  /** Independent of the active board type and scope. */
  xp: number;
  /** Optional detail line beside the movement badge. */
  subtitle?: string;
};

/** What a board's score column is measured in. */
export type ScoreMeta = { unit: string };

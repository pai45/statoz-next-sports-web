"use client";

import { useMemo } from "react";

import type { PlayerStanding } from "@/features/profile";

import { nationalTeams, rivalRoster } from "@/mocks/leaderboard";
import { rankByScore, scoreFor, scoreMetaFor } from "../scoring";
import type {
  GameMode,
  LeaderboardEntry,
  LeaderboardType,
  ScoreMeta,
  MatchesBoard,
  TournamentScope,
} from "../types";

/**
 * What a board shows, assembled from the fixed field and the live player.
 *
 * Every rival's score is a projection of their one canonical XP: the board type
 * and its filters decide the arithmetic, never a separate table. That is what
 * lets the same twenty-three names carry six different boards without any of
 * them contradicting each other.
 */

export type BoardSelection = {
  type: LeaderboardType;
  board: MatchesBoard;
  scope: TournamentScope;
  mode: GameMode;
  leagueId: string;
  /** Omitted for guests so no local player is injected into a public board. */
  player?: PlayerStanding | null;
};

export type BoardState = {
  entries: LeaderboardEntry[];
  meta: ScoreMeta;
  /** The row to pin below the board, or null when the player is not on it. */
  user: LeaderboardEntry | null;
  /** True while the board ranks teams, which have no dossier to open. */
  isTeamBoard: boolean;
};

export function useBoardEntries({
  type,
  board,
  scope,
  mode,
  leagueId,
  player = null,
}: BoardSelection): BoardState {
  const isTeamBoard = type === "matches" && board === "teams";
  const personalized = player !== null;

  return useMemo(() => {
    const meta = scoreMetaFor(type, isTeamBoard);

    if (isTeamBoard) {
      const entries: LeaderboardEntry[] = rankByScore(nationalTeams.map((seed) => ({
        name: seed.team.name,
        score: scoreFor(type, seed.score, scope, mode, `${leagueId}:${seed.team.name}`),
        movement: seed.movement,
        isNew: false,
        badge: seed.team.shortName,
        isUser: personalized ? seed.isBacked ?? false : false,
        team: seed.team,
        xp: 0,
      })));
      return {
        entries,
        meta,
        user: entries.find((entry) => entry.isUser) ?? null,
        isTeamBoard,
      };
    }

    /**
     * The player is ranked on their real XP rather than pinned to a fixture
     * rank, so the board answers to what they have actually played. Before the
     * browser's own record has been read there is nothing true to rank, and
     * the field stands alone — which is also what the server can render.
     */
    const field = rivalRoster.map((seed) => ({
      name: seed.name,
      xp: seed.base,
      movement: seed.movement,
      isNew: seed.isNew ?? false,
      badge: seed.badge,
      isUser: false,
    }));

    if (player?.ready) {
      field.push({
        name: player.displayName,
        xp: player.totalXp,
        // Nothing behind the web's board moves week to week yet, so the
        // player's row holds rather than claiming a delta it cannot support.
        movement: 0,
        isNew: false,
        badge: undefined,
        isUser: true,
      });
    }

    const entries: LeaderboardEntry[] = rankByScore(field.map((seed) => ({
      name: seed.name,
      score: scoreFor(type, seed.xp, scope, mode, `${leagueId}:${seed.name}`),
      movement: seed.movement,
      isNew: seed.isNew,
      badge: seed.badge,
      isUser: seed.isUser,
      xp: seed.xp,
      team: null,
    })));

    return {
      entries,
      meta,
      user: entries.find((entry) => entry.isUser) ?? null,
      isTeamBoard,
    };
  }, [type, scope, mode, leagueId, isTeamBoard, personalized, player]);
}

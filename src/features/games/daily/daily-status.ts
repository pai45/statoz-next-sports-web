"use client";

import { useMemo } from "react";

import type { Sport } from "@/domain/sports";
import { dailyGamesFor, gameRegistry, sportForGame } from "@/mocks/games";

import { dailyQuizDayFor, useDailyQuizRecord } from "../daily-quiz/state/daily-quiz-store";
import { gridSize } from "../football-bingo/constants";
import { useBingoArchive } from "../football-bingo/state/bingo-archive-store";
import { maxAttempts } from "../guess-player/constants";
import { archiveFor, useGuessPlayerStore } from "../guess-player/state/guess-player-store";
import type { GameId } from "../types";
import { isWhoAreYaSport, maxGuesses as whoAreYaGuesses } from "../who-are-ya/constants";
import { useWhoAreYaRecord, whoAreYaDayFor } from "../who-are-ya/state/who-are-ya-store";
import { gridDayFor, useGridRecord } from "../grid/state/grid-store";
import { connectionsDayFor, isConnectionsDone, useConnectionsRecord } from "../connections/state/connections-store";
import { dailyRounds as higherLowerRounds } from "../higher-lower/constants";
import { higherLowerDayFor, useHigherLowerRecord } from "../higher-lower/state/higher-lower-store";

/**
 * Where today's run of each daily game stands, read from the games' own stores.
 *
 * Every daily keeps its own record in its own shape; this is the one place that
 * folds them into the three states a hub card shows. Reading the games' stores
 * rather than keeping a second copy means a card can never disagree with the
 * game it opens.
 */

export type DailyCardStatus =
  | { state: "new" }
  | { state: "in-progress"; label: string }
  | { state: "done"; label: string; won: boolean };

const fresh: DailyCardStatus = Object.freeze({ state: "new" });

/** The sports with a Guess the Player route table. Kept local so the hub does
 * not pull in the game's card pools just to ask. */
function hasGuessPlayer(sport: Sport): sport is "football" | "cricket" | "basketball" {
  return sport === "football" || sport === "cricket" || sport === "basketball";
}

export type DailyBoard = {
  statusOf: (game: GameId) => DailyCardStatus;
  /** Today's finished dailies for a sport, and how many it has. */
  progressFor: (sport: Sport) => { done: number; total: number };
};

/**
 * Today's board. Pass the day key from `useDailyCountdown` so the board rolls
 * over at midnight; null (before hydration) reads every card as new, which is
 * also what the prerendered page shows.
 */
export function useDailyBoard(dayKey: string | null): DailyBoard {
  const quizRecord = useDailyQuizRecord();
  const guessStore = useGuessPlayerStore();
  const bingo = useBingoArchive();
  const whoAreYa = useWhoAreYaRecord();
  const gridRecord = useGridRecord();
  const higherLower = useHigherLowerRecord();
  const connections = useConnectionsRecord();

  return useMemo(() => {
    const statusOf = (game: GameId): DailyCardStatus => {
      if (dayKey === null) return fresh;
      const entry = gameRegistry[game];
      const sport = sportForGame(game);
      if (!entry?.daily || !sport) return fresh;

      if (entry.format === "daily-quiz") {
        const day = dailyQuizDayFor(quizRecord, sport, dayKey);
        if (!day || day.answers.length === 0) return fresh;
        const correct = day.answers.filter((answer) => answer.correct).length;
        if (day.completed) {
          return { state: "done", label: `${correct}/${day.answers.length}`, won: correct === day.answers.length };
        }
        return { state: "in-progress", label: `${day.answers.length}/${day.questionIds.length} ANSWERED` };
      }

      if (entry.format === "guess-player" && hasGuessPlayer(sport)) {
        const day = archiveFor(guessStore, sport).resultsByDay[dayKey];
        if (!day) return fresh;
        const tries = day.guessedPlayerIds.length;
        if (day.status === "won") return { state: "done", label: `SOLVED ${tries}/${maxAttempts}`, won: true };
        if (day.status === "gaveUp" || day.status === "lost" || day.status === "expired") {
          return { state: "done", label: "MISSED", won: false };
        }
        if (tries === 0) return fresh;
        return { state: "in-progress", label: `${tries}/${maxAttempts} GUESSES` };
      }

      if (entry.format === "who-are-ya" && isWhoAreYaSport(sport)) {
        const day = whoAreYaDayFor(whoAreYa, sport, dayKey);
        if (!day || day.guessIds.length === 0) return fresh;
        if (day.status === "won") return { state: "done", label: `SOLVED ${day.guessIds.length}/${whoAreYaGuesses}`, won: true };
        if (day.status === "lost") return { state: "done", label: "MISSED", won: false };
        return { state: "in-progress", label: `${day.guessIds.length}/${whoAreYaGuesses} GUESSES` };
      }

      if (entry.format === "higher-lower") {
        const day = higherLowerDayFor(higherLower, sport, dayKey);
        if (!day || day.calls.length === 0) return fresh;
        const right = day.calls.filter(Boolean).length;
        if (day.calls.length >= higherLowerRounds) return { state: "done", label: `${right}/${day.calls.length}`, won: right === day.calls.length };
        return { state: "in-progress", label: `${day.calls.length}/${higherLowerRounds} CALLS` };
      }

      if (entry.format === "connections") {
        const day = connectionsDayFor(connections, dayKey);
        if (!day || day.guesses.length === 0) return fresh;
        if (isConnectionsDone(day)) {
          return day.solved.length === 4
            ? { state: "done", label: `SOLVED · ${day.mistakes} MISS`, won: true }
            : { state: "done", label: `${day.solved.length}/4`, won: false };
        }
        return { state: "in-progress", label: `${day.solved.length}/4 FOUND` };
      }

      if (entry.format === "grid") {
        const day = gridDayFor(gridRecord, dayKey);
        if (!day || day.guessesUsed === 0) return fresh;
        const filled = Object.keys(day.cells).length;
        if (day.done) return { state: "done", label: `${filled}/9`, won: filled === 9 };
        return { state: "in-progress", label: `${filled}/9 FILLED` };
      }

      if (entry.format === "bingo") {
        const day = bingo?.progressByDay[dayKey];
        if (!day) return fresh;
        const cells = gridSize * gridSize;
        const solved = day.solvedCellIds.length;
        if (day.completed) return { state: "done", label: `${solved}/${cells}`, won: solved === cells };
        if (solved === 0 && day.currentIndex === 0) return fresh;
        return { state: "in-progress", label: `${solved}/${cells} PLACED` };
      }

      return fresh;
    };

    const progressFor = (sport: Sport) => {
      const games = dailyGamesFor(sport);
      return {
        done: games.filter((game) => statusOf(game).state === "done").length,
        total: games.length,
      };
    };

    return { statusOf, progressFor };
  }, [dayKey, quizRecord, guessStore, bingo, whoAreYa, gridRecord, higherLower, connections]);
}

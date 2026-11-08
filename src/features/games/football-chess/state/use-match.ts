"use client";

import { useCallback, useEffect, useMemo, useReducer } from "react";

import {
  cpuThinkMs,
  goalCelebrationMs,
  resolutionMs,
  tickIntervalMs,
} from "../constants";
import {
  buildMatch,
  matchReducer,
  type BuildMatchOptions,
  type ChessMatch,
  type MatchAction,
  type MatchRandom,
} from "../engine/match";

/**
 * The match, and the three timers that drive it.
 *
 * Flutter's cubit owns a periodic clock and a one-shot CPU timer, and the match
 * screen calls back into it once an animation has played out. The reducer here
 * is the cubit; this hook is those timers. Each one is an effect keyed on the
 * phase, so a beat that is no longer current cannot fire late — the phase it
 * was scheduled for has already gone.
 */

export type UseMatchResult = {
  match: ChessMatch;
  dispatch: (action: MatchAction) => void;
};

/**
 * No `running` flag: every timer below is already gated on the phase, and the
 * reducer refuses a tick outside `playerTurn` and `opponentTurn`. The toss and
 * full time stop the clock by being phases, which is one source of truth rather
 * than two that can disagree.
 */
export function useMatch(
  options: BuildMatchOptions,
  sources: MatchRandom,
): UseMatchResult {
  // Closed over rather than held in a ref: a reducer runs during render, and a
  // ref read there is a lie about when the value took hold. `useMatchRandom`
  // memoises the pair, so this identity is stable for the life of the match.
  const reduce = useCallback(
    (state: ChessMatch, action: MatchAction) => matchReducer(state, action, sources),
    [sources],
  );

  // Built once, in the browser: the opponent's formation is a roll, and a roll
  // during a server render would differ from the client's.
  const [match, dispatch] = useReducer(reduce, options, (initial) =>
    buildMatch(initial, sources.play),
  );

  /* The 2:00 clock. One interval for the life of the match, gated on phase. */
  useEffect(() => {
    const active = match.phase === "playerTurn" || match.phase === "opponentTurn";
    if (!active || match.paused) return;

    const timer = window.setInterval(
      () => dispatch({ type: "tick" }),
      tickIntervalMs,
    );
    return () => window.clearInterval(timer);
  }, [match.phase, match.paused]);

  /* The CPU appears to think, then plays. */
  useEffect(() => {
    if (match.phase !== "opponentTurn" || match.paused) return;
    const timer = window.setTimeout(
      () => dispatch({ type: "cpuMove" }),
      cpuThinkMs,
    );
    return () => window.clearTimeout(timer);
  }, [match.phase, match.paused, match.eventTick]);

  /* A resolved action holds on screen, then the turn passes. */
  useEffect(() => {
    if (match.phase !== "resolving") return;
    const timer = window.setTimeout(
      () => dispatch({ type: "resolutionAnimated" }),
      resolutionMs,
    );
    return () => window.clearTimeout(timer);
  }, [match.phase, match.eventTick]);

  /* The goal celebration, then the kickoff reset. */
  useEffect(() => {
    if (match.phase !== "goalScored") return;
    const timer = window.setTimeout(
      () => dispatch({ type: "goalReset" }),
      goalCelebrationMs,
    );
    return () => window.clearTimeout(timer);
  }, [match.phase, match.eventTick]);

  return useMemo(() => ({ match, dispatch }), [match]);
}

/** A pair of independent sources, drawn once so a re-render cannot reseed them. */
export function useMatchRandom(): MatchRandom {
  return useMemo(() => ({ play: Math.random, decide: Math.random }), []);
}

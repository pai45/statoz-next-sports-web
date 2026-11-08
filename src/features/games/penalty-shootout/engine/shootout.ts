import {
  currentKeeper,
  currentShooter,
  playerTaking,
  type PenaltyDirection,
  type PenaltyKick,
  type ShootoutSquads,
  type ShootoutState,
  type ShootoutWinner,
} from "../types";

import { cpuDirection, type RandomSource } from "./cpu";
import { shootoutGoalChance, shootoutKicks } from "./odds";

/**
 * What the shootout can be told. These are Flutter's bloc events, one for one,
 * so the phase sequence and the guards on it read the same in both apps.
 */
export type ShootoutAction =
  | { type: "opponentRevealCompleted" }
  | { type: "started" }
  | { type: "directionSelected"; direction: PenaltyDirection }
  | { type: "kickConfirmed"; random?: RandomSource }
  | { type: "nextKick" }
  | { type: "summaryShown" };

export function initialShootout(squads: ShootoutSquads): ShootoutState {
  return {
    ...squads,
    stage: "opponentReveal",
    kicks: [],
    playerScore: 0,
    opponentScore: 0,
    round: 0,
    over: false,
    selectedDirection: null,
    suddenDeath: false,
    winner: null,
  };
}

export function shootoutReducer(
  state: ShootoutState,
  action: ShootoutAction,
): ShootoutState {
  switch (action.type) {
    case "opponentRevealCompleted":
      if (state.stage !== "opponentReveal") return state;
      return { ...state, stage: "lineup" };

    case "started":
      if (state.stage !== "lineup") return state;
      return { ...state, stage: "choose" };

    case "directionSelected":
      return { ...state, selectedDirection: action.direction };

    case "kickConfirmed":
      return resolveKick(state, action.random ?? Math.random);

    case "nextKick":
      return { ...state, stage: "choose", selectedDirection: null };

    case "summaryShown":
      return { ...state, stage: "summary" };
  }
}

/**
 * Resolves the kick on the spot and decides whether the shootout is over.
 *
 * Two random draws happen here, in this order: the CPU's direction first, then
 * the goal roll. Reordering them would change every seeded outcome.
 */
function resolveKick(state: ShootoutState, random: RandomSource): ShootoutState {
  if (state.over || state.selectedDirection === null) return state;

  const byPlayer = playerTaking(state);
  const playerDirection = state.selectedDirection;
  const aiDirection = cpuDirection({
    level: state.cpuLevel,
    playerShots: state.kicks
      .filter((kick) => kick.byPlayer)
      .map((kick) => kick.shootDirection),
    playerDives: state.kicks
      .filter((kick) => !kick.byPlayer)
      .map((kick) => kick.diveDirection),
    playerTaking: byPlayer,
    random,
  });

  const shootDirection = byPlayer ? playerDirection : aiDirection;
  const diveDirection = byPlayer ? aiDirection : playerDirection;
  const shooter = currentShooter(state);
  const keeper = currentKeeper(state);

  const scored =
    random() <
    shootoutGoalChance({
      shooterRating: shooter.rating,
      keeperRating: keeper.rating,
      keeperGuessedRight: shootDirection === diveDirection,
    });

  const kick: PenaltyKick = {
    kickNumber: state.round + 1,
    byPlayer,
    shootDirection,
    diveDirection,
    scored,
    shooter,
    keeper,
  };

  const kicks = [...state.kicks, kick];
  const playerScore = state.playerScore + (byPlayer && scored ? 1 : 0);
  const opponentScore = state.opponentScore + (!byPlayer && scored ? 1 : 0);

  let over = false;
  let suddenDeath = state.suddenDeath;
  let winner: ShootoutWinner | null = state.winner;

  if (!suddenDeath) {
    if (earlyOut(kicks.length, playerScore, opponentScore)) {
      over = true;
      winner = playerScore > opponentScore ? "player" : "opponent";
    } else if (kicks.length >= shootoutKicks) {
      if (playerScore !== opponentScore) {
        over = true;
        winner = playerScore > opponentScore ? "player" : "opponent";
      } else {
        // Level after five each. From here the latch never lifts.
        suddenDeath = true;
      }
    }
  } else {
    // Sudden death is judged a pair at a time, once both sides have kicked.
    const sdDone = kicks.length - shootoutKicks;
    if (sdDone > 0 && sdDone % 2 === 0) {
      const pair = kicks.slice(-2);
      const playerGoal = pair.some((entry) => entry.byPlayer && entry.scored);
      const opponentGoal = pair.some((entry) => !entry.byPlayer && entry.scored);
      if (playerGoal !== opponentGoal) {
        over = true;
        winner = playerGoal ? "player" : "opponent";
      }
    }
  }

  return {
    ...state,
    stage: "result",
    kicks,
    playerScore,
    opponentScore,
    round: state.round + 1,
    over,
    winner,
    selectedDirection: null,
    suddenDeath,
  };
}

/**
 * Whether the trailing side can no longer catch up inside regulation.
 *
 * The kicks left to each side come from the parity of the remaining indices,
 * not from halving what is left: the player kicks on even indices, so with an
 * odd number of kicks still to take, the two sides do not have the same number
 * of chances remaining.
 */
export function earlyOut(
  kicksTaken: number,
  playerScore: number,
  opponentScore: number,
): boolean {
  if (kicksTaken >= shootoutKicks) return false;

  let playerLeft = 0;
  let opponentLeft = 0;
  for (let index = kicksTaken; index < shootoutKicks; index += 1) {
    if (index % 2 === 0) playerLeft += 1;
    else opponentLeft += 1;
  }

  return (
    playerScore > opponentScore + opponentLeft ||
    opponentScore > playerScore + playerLeft
  );
}

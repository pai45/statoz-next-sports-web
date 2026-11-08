/**
 * The opponent's brain — the web port of the CPU half of
 * `games/football_chess/football_chess_engine.dart`.
 *
 * Every candidate action is scored across its probability-weighted outcomes and
 * the player's best immediate reply, so the CPU plays a one-ply search with the
 * player's counter dominating the decision. It sees no hidden information: the
 * only thing it "remembers" is the verbs the player has been leaning on, which
 * it reads off the shared move log.
 *
 * Only exactly equivalent choices consult the decision RNG, so thinking never
 * changes a gameplay roll.
 */

import type { RandomSource } from "../../shared/engine/random-source";
import {
  boardRows,
  carrierOf,
  isShootingHalfFor,
  isBenched,
  neighbors8,
  outfieldAt,
  pieceById,
  withPieceAt,
  type BoardActionType,
  type BoardState,
  type ChessAction,
  type ActionResult,
} from "../types";

import {
  adjacentDefenders,
  allActions,
  applyAction,
  dribbleWinProbability,
  foulChance,
  benchTurns,
  missedShotOutcome,
  passTargets,
  shotBlockers,
  shotGoalProbability,
  slideLanding,
  slideWinProbability,
  tackleWinProbability,
} from "./rules";

/**
 * What the CPU is allowed to know: the score, the clock, and which verbs the
 * player has been reaching for lately.
 */
export type CpuDecisionContext = {
  playerScore: number;
  opponentScore: number;
  clockRemaining: number;
  recentPlayerActions: readonly BoardActionType[];
};

type ExpectedOutcome = { probability: number; result: ActionResult };

/** A never-consulted source, for the branches that must stay deterministic. */
const unusedRandom: RandomSource = () => 0;

function frequency(
  actions: readonly BoardActionType[],
  action: BoardActionType,
): number {
  return actions.filter((candidate) => candidate === action).length;
}

/* ---- Outcome enumeration -------------------------------------------------- */

/**
 * Every outcome an action can have, with its probability. The deterministic
 * verbs reuse `applyAction`; the rolled ones are enumerated by hand because the
 * CPU needs both branches, not the one a roll happened to pick.
 */
function expectedOutcomes(state: BoardState, action: ChessAction): ExpectedOutcome[] {
  switch (action.type) {
    case "move":
    case "pass":
    case "press":
      return [{ probability: 1, result: applyAction(state, action, unusedRandom) }];

    case "dribble": {
      const carrier = carrierOf(state);
      const defender = pieceById(state, action.targetId as string);
      if (carrier === null || defender === null) {
        return [{ probability: 1, result: applyAction(state, action, unusedRandom) }];
      }
      const chance = dribbleWinProbability(carrier, defender);
      const swapped = withPieceAt(
        withPieceAt(state, carrier.id, defender.cell),
        defender.id,
        carrier.cell,
      );
      return [
        {
          probability: chance,
          result: {
            state: { ...swapped, ballCell: defender.cell },
            event: "advanced",
            scorer: null,
            card: "none",
          },
        },
        {
          probability: 1 - chance,
          result: {
            state: { ...state, ballCell: defender.cell, possession: defender.side },
            event: "turnover",
            scorer: null,
            card: "none",
          },
        },
      ];
    }

    case "shoot": {
      const shooter = carrierOf(state);
      if (shooter === null) {
        return [{ probability: 1, result: applyAction(state, action, unusedRandom) }];
      }
      const chance = shotGoalProbability(state, shooter);
      return [
        {
          probability: chance,
          result: { state, event: "goal", scorer: shooter.side, card: "none" },
        },
        { probability: 1 - chance, result: missedShotOutcome(state, shooter) },
      ];
    }

    case "tackle": {
      const tackler = pieceById(state, action.pieceId);
      const carrier = carrierOf(state);
      if (tackler === null || carrier === null) {
        return [{ probability: 1, result: applyAction(state, action, unusedRandom) }];
      }
      const adjacent = adjacentDefenders(state, tackler.side, carrier.cell);
      const chance = tackleWinProbability(tackler, carrier, adjacent);
      const base = withPieceAt(state, tackler.id, tackler.cell, {
        tackleCooldownTurns: 2,
      });
      return [
        {
          probability: chance,
          result: {
            state: { ...base, ballCell: tackler.cell, possession: tackler.side },
            event: "turnover",
            scorer: null,
            card: "none",
          },
        },
        {
          probability: 1 - chance,
          result: { state: base, event: "none", scorer: null, card: "none" },
        },
      ];
    }

    case "slide": {
      const slider = pieceById(state, action.pieceId);
      const carrier = carrierOf(state);
      if (slider === null || carrier === null) {
        return [{ probability: 1, result: applyAction(state, action, unusedRandom) }];
      }
      const chance = slideWinProbability(slider, carrier);
      const base = withPieceAt(state, slider.id, slider.cell, {
        slideCooldownTurns: 3,
      });
      const landing = slideLanding(base, slider, carrier) ?? slider.cell;
      const success = withPieceAt(base, slider.id, landing, {
        slideCooldownTurns: 3,
      });
      const red = slider.yellow;
      const card = red ? ("red" as const) : ("yellow" as const);
      const booked = {
        ...base,
        pieces: base.pieces.map((piece) =>
          piece.id === slider.id
            ? {
                ...piece,
                yellow: true,
                benchedTurns: red ? benchTurns : piece.benchedTurns,
              }
            : piece,
        ),
      };
      const miss = 1 - chance;
      return [
        {
          probability: chance,
          result: {
            state: { ...success, ballCell: landing, possession: slider.side },
            event: "turnover",
            scorer: null,
            card: "none",
          },
        },
        {
          probability: miss * (1 - foulChance),
          result: { state: base, event: "none", scorer: null, card: "none" },
        },
        {
          probability: miss * foulChance,
          result: { state: booked, event: "none", scorer: null, card },
        },
      ];
    }
  }
}

/* ---- Position value ------------------------------------------------------- */

function boardUtility(state: BoardState, context: CpuDecisionContext): number {
  const carrier = carrierOf(state);
  let value = state.possession === "opponent" ? 150 : -165;

  if (carrier !== null && !carrier.isKeeper) {
    if (carrier.side === "opponent") {
      const progress = boardRows - 1 - carrier.cell.row;
      value += progress * 44;
      value += passTargets(state, carrier).length * 11;
      if (isShootingHalfFor(carrier.cell, "opponent")) {
        value += shotGoalProbability(state, carrier) * 290;
      }
      value -= adjacentDefenders(state, "player", carrier.cell) * 28;
    } else {
      const danger = carrier.cell.row;
      value -= danger * 52;
      value -= passTargets(state, carrier).length * 12;
      if (isShootingHalfFor(carrier.cell, "player")) {
        value -= shotGoalProbability(state, carrier) * 340;
        value += shotBlockers(state, carrier) * 42;
      }

      // Read the player's habits and crowd out whatever they keep doing.
      const counters = context.recentPlayerActions;
      const dribbles = frequency(counters, "dribble");
      const passes = frequency(counters, "pass");
      const shoots = frequency(counters, "shoot");
      const carries = frequency(counters, "move");
      const crowd = adjacentDefenders(state, "opponent", carrier.cell);
      value += crowd * dribbles * 18;
      value -= passTargets(state, carrier).length * passes * 7;
      value -= shotGoalProbability(state, carrier) * shoots * 42;
      value -= danger * carries * 5;
    }
  }

  for (const piece of state.pieces) {
    const sign = piece.side === "opponent" ? 1 : -1;
    if (isBenched(piece)) value += sign * -145;
    if (piece.yellow) value += sign * -24;
    value += sign * -(piece.tackleCooldownTurns * 4 + piece.slideCooldownTurns * 3);
    if (!piece.isKeeper && piece.cell.col === 1) value += sign * 5;
  }

  const late = context.clockRemaining <= 30;
  const cpuLeading = context.opponentScore > context.playerScore;
  const cpuTrailing = context.opponentScore < context.playerScore;
  if (late && cpuLeading) {
    value += state.possession === "opponent" ? 95 : -65;
  } else if (late && cpuTrailing) {
    if (carrier !== null && carrier.side === "opponent") {
      value += (boardRows - 1 - carrier.cell.row) * 18;
      if (isShootingHalfFor(carrier.cell, "opponent")) {
        value += shotGoalProbability(state, carrier) * 100;
      }
    }
  }

  return value;
}

function valueAfterCpuOutcome(
  outcome: ActionResult,
  context: CpuDecisionContext,
): number {
  if (outcome.event === "goal") {
    return outcome.scorer === "opponent" ? 1200 : -1200;
  }

  const afterCpu = boardUtility(outcome.state, context);
  const replies = allActions(outcome.state, "player");
  if (replies.length === 0) return afterCpu;

  let strongestReply = Infinity;
  for (const reply of replies) {
    let replyValue = 0;
    for (const response of expectedOutcomes(outcome.state, reply)) {
      const value =
        response.result.event === "goal"
          ? response.result.scorer === "player"
            ? -1200
            : 1200
          : boardUtility(response.result.state, context);
      replyValue += response.probability * value;
    }
    strongestReply = Math.min(strongestReply, replyValue);
  }

  // Keep some value on the position the CPU creates, but let the player's
  // strongest counter dominate the decision.
  return afterCpu * 0.35 + strongestReply * 0.65;
}

/* ---- Situational nudges --------------------------------------------------- */

function contextualActionBias(
  state: BoardState,
  action: ChessAction,
  context: CpuDecisionContext,
): number {
  const piece = pieceById(state, action.pieceId);
  if (piece === null) return 0;
  const carrier = carrierOf(state);
  let bias = 0;

  const late = context.clockRemaining <= 30;
  const cpuLeading = context.opponentScore > context.playerScore;
  const cpuTrailing = context.opponentScore < context.playerScore;

  // Ahead and late: keep the ball, stop gambling.
  if (late && cpuLeading && state.possession === "opponent") {
    if (action.type === "pass") bias += 48;
    if (action.type === "shoot") {
      bias -= (1 - shotGoalProbability(state, piece)) * 105;
    }
    if (action.type === "dribble") {
      const defender = pieceById(state, action.targetId as string);
      if (defender !== null) {
        bias -= (1 - dribbleWinProbability(piece, defender)) * 75;
      }
    }
  }
  // Behind and late: shoot on sight.
  if (late && cpuTrailing) {
    if (action.type === "shoot") {
      bias += shotGoalProbability(state, piece) * 250;
      if (context.clockRemaining <= 10) bias += 350;
    }
    if (action.type === "pass") bias += 16;
  }

  const recent = context.recentPlayerActions;
  const shoots = frequency(recent, "shoot");
  const dribbles = frequency(recent, "dribble");
  const passes = frequency(recent, "pass");
  if (carrier !== null && carrier.side === "player") {
    if (action.type === "tackle") bias += shoots * 12 + dribbles * 14;
    if (action.type === "press") bias += shoots * 10 + passes * 8;
    if (action.type === "slide") {
      const chance = slideWinProbability(piece, carrier);
      bias -= (1 - chance) * (55 + (piece.yellow ? 90 : 0));
    }
  }

  switch (action.type) {
    case "shoot": {
      const chance = shotGoalProbability(state, piece);
      bias += chance * 80 - (1 - chance) * 24;
      break;
    }
    case "tackle": {
      if (carrier === null) break;
      const adjacent = adjacentDefenders(state, "opponent", carrier.cell);
      bias +=
        tackleWinProbability(piece, carrier, adjacent) * 34 + carrier.cell.row * 8;
      break;
    }
    case "slide": {
      if (carrier === null) break;
      const chance = slideWinProbability(piece, carrier);
      bias += chance * 24 - (1 - chance) * 58;
      if (piece.yellow) bias -= 70;
      break;
    }
    case "press": {
      if (carrier === null) break;
      bias += 22 + carrier.cell.row * 6;
      break;
    }
    case "pass": {
      const target = pieceById(state, action.targetId as string);
      if (target === null) break;
      const advance = state.ballCell.row - target.cell.row;
      const pressure = neighbors8(target.cell)
        .map((c) => outfieldAt(state, c))
        .filter((p) => p !== null && p.side === "player").length;
      bias += advance * 18 - pressure * 24;
      break;
    }
    case "dribble": {
      const defender = pieceById(state, action.targetId as string);
      if (defender === null) break;
      const chance = dribbleWinProbability(piece, defender);
      const advance = state.ballCell.row - defender.cell.row;
      bias += chance * 38 + advance * 16 - (1 - chance) * 34;
      break;
    }
    case "move": {
      if (carrier !== null && carrier.side === "player" && action.cell !== undefined) {
        const before = Math.max(
          Math.abs(piece.cell.col - carrier.cell.col),
          Math.abs(piece.cell.row - carrier.cell.row),
        );
        const after = Math.max(
          Math.abs(action.cell.col - carrier.cell.col),
          Math.abs(action.cell.row - carrier.cell.row),
        );
        bias += (before - after) * 12;
      }
      break;
    }
  }
  return bias;
}

export function scoreCpuAction(
  state: BoardState,
  action: ChessAction,
  context: CpuDecisionContext,
): number {
  let value = 0;
  for (const outcome of expectedOutcomes(state, action)) {
    value += outcome.probability * valueAfterCpuOutcome(outcome.result, context);
  }
  return value + contextualActionBias(state, action, context);
}

/**
 * The CPU's move. Ties within a thousandth are collected and one is drawn from
 * the *decision* source, so a tie-break never consumes a gameplay roll.
 */
export function cpuChooseAction(
  state: BoardState,
  context: CpuDecisionContext,
  decisionRandom: RandomSource,
): ChessAction | null {
  const actions = allActions(state, "opponent");
  if (actions.length === 0) return null;

  let bestScore = -Infinity;
  const best: ChessAction[] = [];
  for (const action of actions) {
    const score = scoreCpuAction(state, action, context);
    if (score > bestScore + 0.001) {
      bestScore = score;
      best.length = 0;
      best.push(action);
    } else if (Math.abs(score - bestScore) <= 0.001) {
      best.push(action);
    }
  }
  return best[Math.floor(decisionRandom() * best.length)];
}

export { expectedOutcomes, boardUtility, contextualActionBias };

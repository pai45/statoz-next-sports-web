/**
 * The pure rules of Football Chess — the web port of the setup, legal-option
 * and apply halves of `games/football_chess/football_chess_engine.dart`.
 *
 * Every probability helper is pure so it can be asserted directly; all
 * randomness arrives through an injected `RandomSource`, and the *order* of the
 * draws inside each function is part of the contract.
 */

import type { PlayerCard } from "@/domain/cards";

import type { RandomSource } from "../../shared/engine/random-source";
import { formationCells } from "../data/formations";
import {
  boardRows,
  carrierOf,
  cell,
  clamp,
  distanceTo,
  isAdjacent8,
  isBenched,
  isEmptyCell,
  isShootingHalfFor,
  keeperOf,
  neighbors8,
  opposite,
  outfield,
  outfieldAt,
  pieceById,
  pieceRating,
  sameCell,
  withPieceAt,
  type ActionResult,
  type BoardActionType,
  type BoardCell,
  type BoardPiece,
  type BoardState,
  type CardType,
  type ChessAction,
  type ChessFormation,
  type CoinSide,
  type Side,
} from "../types";

/** Foul chance on a missed slide, and how long a red card benches a piece. */
export const foulChance = 0.3;
export const benchTurns = 2;

/* ---- Setup --------------------------------------------------------------- */

function makePiece(
  id: string,
  card: PlayerCard,
  side: Side,
  at: BoardCell,
  isKeeper: boolean,
): BoardPiece {
  return {
    id,
    card,
    side,
    cell: at,
    isKeeper,
    yellow: false,
    benchedTurns: 0,
    tackleCooldownTurns: 0,
    slideCooldownTurns: 0,
  };
}

export type InitialBoardOptions = {
  playerSquad: PlayerCard[];
  opponentSquad: PlayerCard[];
  playerFormation: ChessFormation;
  opponentFormation: ChessFormation;
  kickoff: Side;
};

/**
 * The kickoff board. Squads are `[atk, atk, def, def, gk]`. The player owns the
 * bottom two rows, the opponent the top two, and the kicking-off side gets the
 * ball on its most central forward piece.
 */
export function initialBoard({
  playerSquad,
  opponentSquad,
  playerFormation,
  opponentFormation,
  kickoff,
}: InitialBoardOptions): BoardState {
  const playerCells = formationCells(playerFormation);
  // Mirrored into the opponent half: row r becomes row 3 - r.
  const opponentCells = formationCells(opponentFormation).map((c) =>
    cell(c.col, boardRows - 1 - c.row),
  );

  const pieces: BoardPiece[] = [
    ...playerCells.map((c, index) =>
      makePiece(`p${index}`, playerSquad[index], "player", c, false),
    ),
    makePiece("pk", playerSquad[4], "player", cell(1, -1), true),
    ...opponentCells.map((c, index) =>
      makePiece(`o${index}`, opponentSquad[index], "opponent", c, false),
    ),
    makePiece("ok", opponentSquad[4], "opponent", cell(1, boardRows), true),
  ];

  return giveKickoffBall(
    { pieces, ballCell: cell(1, 1), possession: kickoff },
    kickoff,
  );
}

/**
 * Hand the ball to the kicking-off side's most central forward outfielder.
 * Forward means nearer the halfway line — the highest row for the player, the
 * lowest for the opponent — with ties broken toward the centre column.
 */
function giveKickoffBall(state: BoardState, kickoff: Side): BoardState {
  const mine = [...outfield(state, kickoff)].sort((a, b) => {
    const fa = kickoff === "player" ? -a.cell.row : a.cell.row;
    const fb = kickoff === "player" ? -b.cell.row : b.cell.row;
    if (fa !== fb) return fa - fb;
    return Math.abs(a.cell.col - 1) - Math.abs(b.cell.col - 1);
  });
  const carrier = mine[0];
  return { ...state, ballCell: carrier.cell, possession: kickoff };
}

export function kickoffReset(state: BoardState, kickoff: Side): BoardState {
  return giveKickoffBall(state, kickoff);
}

/* ---- Legal options ------------------------------------------------------- */

/** Empty eight-directional neighbours. */
export function legalMoves(state: BoardState, piece: BoardPiece): BoardCell[] {
  return neighbors8(piece.cell).filter((c) => isEmptyCell(state, c));
}

/** Adjacent opponents a carrier can take on. */
export function dribbleTargets(state: BoardState, carrier: BoardPiece): string[] {
  const out: string[] = [];
  for (const c of neighbors8(carrier.cell)) {
    const other = outfieldAt(state, c);
    if (other !== null && other.side !== carrier.side) out.push(other.id);
  }
  return out;
}

/**
 * Teammates reachable by a straight lane — row, column or true diagonal — with
 * nothing standing in it. Keepers may pass to any teammate.
 */
export function passTargets(state: BoardState, carrier: BoardPiece): string[] {
  const out: string[] = [];
  for (const target of outfield(state, carrier.side)) {
    if (target.id === carrier.id) continue;
    if (carrier.isKeeper || clearLine(state, carrier.cell, target.cell)) {
      out.push(target.id);
    }
  }
  return out;
}

function clearLine(state: BoardState, from: BoardCell, to: BoardCell): boolean {
  const dc = Math.sign(to.col - from.col);
  const dr = Math.sign(to.row - from.row);
  // Orthogonal and true diagonal lanes only; an L-shape is not a lane.
  if (
    dc !== 0 &&
    dr !== 0 &&
    Math.abs(to.col - from.col) !== Math.abs(to.row - from.row)
  ) {
    return false;
  }
  if (dc === 0 && dr === 0) return false;

  let c = cell(from.col + dc, from.row + dr);
  while (!sameCell(c, to)) {
    if (outfieldAt(state, c) !== null) return false;
    c = cell(c.col + dc, c.row + dr);
  }
  return true;
}

/** The empty neighbour that gets closest to the carrier, or null if none does. */
function pressStep(
  state: BoardState,
  piece: BoardPiece,
  carrier: BoardPiece,
): BoardCell | null {
  let bestDistance = distanceTo(piece.cell, carrier.cell);
  let best: BoardCell | null = null;
  for (const c of legalMoves(state, piece)) {
    const d = distanceTo(c, carrier.cell);
    if (d < bestDistance) {
      bestDistance = d;
      best = c;
    }
  }
  return best;
}

function adjacentDefenders(
  state: BoardState,
  side: Side,
  carrierCell: BoardCell,
): number {
  return outfield(state, side).filter((piece) =>
    isAdjacent8(piece.cell, carrierCell),
  ).length;
}

/** The legal verbs for a piece, in display order — this drives the action bar. */
export function availableActions(
  state: BoardState,
  side: Side,
  piece: BoardPiece,
): BoardActionType[] {
  if (piece.side !== side || isBenched(piece)) return [];

  const carrier = carrierOf(state);
  const isCarrier = carrier !== null && carrier.id === piece.id;
  const verbs: BoardActionType[] = [];

  // A keeper can only pass, and only holding the ball.
  if (piece.isKeeper) {
    if (isCarrier && passTargets(state, piece).length > 0) verbs.push("pass");
    return verbs;
  }

  if (state.possession === side) {
    if (isCarrier) {
      if (legalMoves(state, piece).length > 0) verbs.push("move");
      if (dribbleTargets(state, piece).length > 0) verbs.push("dribble");
      if (passTargets(state, piece).length > 0) verbs.push("pass");
      if (isShootingHalfFor(piece.cell, side)) verbs.push("shoot");
    } else if (legalMoves(state, piece).length > 0) {
      verbs.push("move");
    }
    return verbs;
  }

  // Defending: press from range, tackle or slide when adjacent, then move.
  if (carrier !== null) {
    const d = distanceTo(piece.cell, carrier.cell);
    if (d >= 2 && pressStep(state, piece, carrier) !== null) verbs.push("press");
    if (d === 1) {
      if (piece.tackleCooldownTurns === 0) verbs.push("tackle");
      if (piece.slideCooldownTurns === 0) verbs.push("slide");
    }
  }
  if (legalMoves(state, piece).length > 0) verbs.push("move");
  return verbs;
}

/** Every legal action for a side — the CPU's candidate list. */
export function allActions(state: BoardState, side: Side): ChessAction[] {
  const out: ChessAction[] = [];
  for (const piece of outfield(state, side)) {
    for (const verb of availableActions(state, side, piece)) {
      switch (verb) {
        case "move":
          for (const c of legalMoves(state, piece)) {
            out.push({ type: verb, pieceId: piece.id, cell: c });
          }
          break;
        case "dribble":
          for (const targetId of dribbleTargets(state, piece)) {
            out.push({ type: verb, pieceId: piece.id, targetId });
          }
          break;
        case "pass":
          for (const targetId of passTargets(state, piece)) {
            out.push({ type: verb, pieceId: piece.id, targetId });
          }
          break;
        default:
          out.push({ type: verb, pieceId: piece.id });
      }
    }
  }
  return out;
}

/* ---- Probabilities (pure) ------------------------------------------------ */

export function shotBlockers(state: BoardState, shooter: BoardPiece): number {
  const col = shooter.cell.col;
  const defending = opposite(shooter.side);
  let count = 0;
  if (shooter.side === "player") {
    for (let r = shooter.cell.row + 1; r < boardRows; r += 1) {
      const piece = outfieldAt(state, cell(col, r));
      if (piece !== null && piece.side === defending) count += 1;
    }
  } else {
    for (let r = shooter.cell.row - 1; r >= 0; r -= 1) {
      const piece = outfieldAt(state, cell(col, r));
      if (piece !== null && piece.side === defending) count += 1;
    }
  }
  return count;
}

/**
 * Goal probability: closer, with a clearer lane and a rating edge over the
 * keeper, is better.
 */
export function shotGoalProbability(
  state: BoardState,
  shooter: BoardPiece,
): number {
  const distance =
    shooter.side === "player" ? boardRows - shooter.cell.row : shooter.cell.row + 1;
  let p = distance <= 1 ? 0.55 : 0.3;
  p *= Math.pow(0.45, shotBlockers(state, shooter));
  const keeper = keeperOf(state, opposite(shooter.side));
  p *= 1 + (pieceRating(shooter) - pieceRating(keeper)) * 0.012;
  return clamp(p, 0.03, 0.92);
}

/**
 * Standing-tackle win chance: a rating edge plus a boost for every extra
 * adjacent team-mate. `adjacentCount` includes the tackler.
 */
export function tackleWinProbability(
  tackler: BoardPiece,
  carrier: BoardPiece,
  adjacentCount: number,
): number {
  const outnumber = clamp(adjacentCount - 1, 0, 3) * 0.18;
  const p = 0.5 + (pieceRating(tackler) - pieceRating(carrier)) * 0.02 + outnumber;
  return clamp(p, 0.15, 0.9);
}

/** Higher base than a lone tackle, but a miss lets the carrier break free. */
export function slideWinProbability(slider: BoardPiece, carrier: BoardPiece): number {
  const p = 0.62 + (pieceRating(slider) - pieceRating(carrier)) * 0.02;
  return clamp(p, 0.2, 0.92);
}

export function dribbleWinProbability(
  carrier: BoardPiece,
  defender: BoardPiece,
): number {
  const p = 0.55 + (pieceRating(carrier) - pieceRating(defender)) * 0.02;
  return clamp(p, 0.2, 0.9);
}

export function tossCoin(random: RandomSource): CoinSide {
  return random() < 0.5 ? "heads" : "tails";
}

/* ---- Applying an action -------------------------------------------------- */

function result(
  state: BoardState,
  event: ActionResult["event"],
  scorer: Side | null = null,
  card: CardType = "none",
): ActionResult {
  return { state, event, scorer, card };
}

/** An empty cell adjacent to the carrier, nearest the slider — the lunge end. */
function slideLanding(
  state: BoardState,
  slider: BoardPiece,
  carrier: BoardPiece,
): BoardCell | null {
  if (isAdjacent8(slider.cell, carrier.cell)) return slider.cell;
  let best: BoardCell | null = null;
  let bestDistance = 999;
  for (const c of neighbors8(carrier.cell)) {
    if (!sameCell(c, slider.cell) && !isEmptyCell(state, c)) continue;
    const d = distanceTo(slider.cell, c);
    if (d < bestDistance) {
      bestDistance = d;
      best = c;
    }
  }
  return best;
}

/** After a save or a block, the side's outfielder nearest its own goal takes it. */
function distributeTo(state: BoardState, side: Side): BoardState {
  const mine = [...outfield(state, side)].sort((a, b) => {
    const da = side === "player" ? a.cell.row : -a.cell.row;
    const db = side === "player" ? b.cell.row : -b.cell.row;
    return da - db;
  });
  return { ...state, ballCell: mine[0].cell, possession: side };
}

/** MOVE — reposition; the carrier takes the ball with them into space. */
function applyMove(state: BoardState, pieceId: string, to: BoardCell): ActionResult {
  let next = withPieceAt(state, pieceId, to);
  if (carrierOf(state)?.id === pieceId) next = { ...next, ballCell: to };
  return result(next, "none");
}

/**
 * DRIBBLE — take on an adjacent defender. Win and the two swap squares with the
 * ball following; lose and it is a turnover to that defender.
 */
function applyDribble(
  state: BoardState,
  defenderId: string,
  random: RandomSource,
): ActionResult {
  const carrier = carrierOf(state);
  const defender = pieceById(state, defenderId);
  if (carrier === null || defender === null) return result(state, "none");

  const p = clamp(dribbleWinProbability(carrier, defender), 0, 1);
  if (random() < p) {
    const swapped = withPieceAt(
      withPieceAt(state, carrier.id, defender.cell),
      defender.id,
      carrier.cell,
    );
    return result({ ...swapped, ballCell: defender.cell }, "advanced");
  }
  return result(
    { ...state, ballCell: defender.cell, possession: defender.side },
    "turnover",
  );
}

function applyPass(state: BoardState, targetId: string): ActionResult {
  const target = pieceById(state, targetId);
  if (target === null) return result(state, "none");
  return result({ ...state, ballCell: target.cell }, "advanced");
}

function applyShoot(state: BoardState, random: RandomSource): ActionResult {
  const shooter = carrierOf(state);
  if (shooter === null) return result(state, "none");

  const goalChance = clamp(shotGoalProbability(state, shooter), 0, 1);
  if (random() < goalChance) return result(state, "goal", shooter.side);

  return missedShotOutcome(state, shooter);
}

export function missedShotOutcome(
  state: BoardState,
  shooter: BoardPiece,
): ActionResult {
  const defending = opposite(shooter.side);
  const blocked = shotBlockers(state, shooter) > 0;
  const next = blocked
    ? distributeTo(state, defending)
    : {
        ...state,
        ballCell: keeperOf(state, defending).cell,
        possession: defending,
      };
  return result(next, blocked ? "blocked" : "save");
}

/** PRESS — close down one cell toward the carrier. Never wins the ball. */
function applyPress(state: BoardState, presserId: string): ActionResult {
  const presser = pieceById(state, presserId);
  const carrier = carrierOf(state);
  if (presser === null || carrier === null) return result(state, "none");
  const step = pressStep(state, presser, carrier);
  if (step === null) return result(state, "none");
  return result(withPieceAt(state, presserId, step), "none");
}

/** TACKLE — an adjacent standing tackle: rating plus outnumbering, safe on a miss. */
function applyTackle(
  state: BoardState,
  tacklerId: string,
  random: RandomSource,
): ActionResult {
  const tackler = pieceById(state, tacklerId);
  const carrier = carrierOf(state);
  if (tackler === null || carrier === null) return result(state, "none");

  const adjacent = adjacentDefenders(state, tackler.side, carrier.cell);
  const p = clamp(tackleWinProbability(tackler, carrier, adjacent), 0, 1);
  const base = withPieceAt(state, tacklerId, tackler.cell, {
    tackleCooldownTurns: 2,
  });

  if (random() < p) {
    return result(
      { ...base, ballCell: tackler.cell, possession: tackler.side },
      "turnover",
    );
  }
  return result(base, "none");
}

/**
 * SLIDE — a committed lunge: a high win chance, but a miss lets the carrier
 * break past and risks a booking. A second yellow is a red, and a red benches.
 */
function applySlide(
  state: BoardState,
  sliderId: string,
  random: RandomSource,
): ActionResult {
  const slider = pieceById(state, sliderId);
  const carrier = carrierOf(state);
  if (slider === null || carrier === null) return result(state, "none");

  const p = clamp(slideWinProbability(slider, carrier), 0, 1);
  const base = withPieceAt(state, sliderId, slider.cell, { slideCooldownTurns: 3 });

  if (random() < p) {
    const landing = slideLanding(base, slider, carrier) ?? slider.cell;
    const won = withPieceAt(base, sliderId, landing, { slideCooldownTurns: 3 });
    return result(
      { ...won, ballCell: landing, possession: slider.side },
      "turnover",
    );
  }

  // Missed — and maybe a foul with it.
  let next = base;
  let card: CardType = "none";
  if (random() < foulChance) {
    const red = slider.yellow;
    card = red ? "red" : "yellow";
    next = {
      ...base,
      pieces: base.pieces.map((piece) =>
        piece.id === sliderId
          ? {
              ...piece,
              yellow: true,
              benchedTurns: red ? benchTurns : piece.benchedTurns,
            }
          : piece,
      ),
    };
  }
  return result(next, "none", null, card);
}

export function applyAction(
  state: BoardState,
  action: ChessAction,
  random: RandomSource,
): ActionResult {
  switch (action.type) {
    case "move":
      return applyMove(state, action.pieceId, action.cell as BoardCell);
    case "dribble":
      return applyDribble(state, action.targetId as string, random);
    case "pass":
      return applyPass(state, action.targetId as string);
    case "shoot":
      return applyShoot(state, random);
    case "press":
      return applyPress(state, action.pieceId);
    case "tackle":
      return applyTackle(state, action.pieceId, random);
    case "slide":
      return applySlide(state, action.pieceId, random);
  }
}

export { adjacentDefenders, distributeTo, pressStep, slideLanding };

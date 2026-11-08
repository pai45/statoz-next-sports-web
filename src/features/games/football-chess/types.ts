/**
 * Football Chess's domain vocabulary — the web port of the app's
 * `models/football_chess.dart` and `games/football_chess/football_chess_board.dart`.
 *
 * A 3×4 grid played one action at a time. Rows 0–1 are the player's half at the
 * bottom, rows 2–3 the opponent's at the top; the two keepers stand off-grid in
 * the goals at row -1 and row 4.
 *
 * Flutter models the enums as `enum`s and `BoardCell` as a value object with
 * equality. The string unions serialise for free, and the cell becomes a plain
 * readonly pair with comparison helpers — TypeScript has no operator overloads,
 * and a structural `===` on objects would silently be identity.
 */

import type { PlayerCard } from "@/domain/cards";

/* ---- Sides and phases ---------------------------------------------------- */

export type Side = "player" | "opponent";

export function opposite(side: Side): Side {
  return side === "player" ? "opponent" : "player";
}

/** The kinds of action a piece can take on a turn, in display order. */
export type BoardActionType =
  | "move"
  | "dribble"
  | "pass"
  | "shoot"
  | "press"
  | "tackle"
  | "slide";

export const boardActionLabels: Record<BoardActionType, string> = {
  move: "MOVE",
  dribble: "DRIBBLE",
  pass: "PASS",
  shoot: "SHOOT",
  press: "PRESS",
  tackle: "TACKLE",
  slide: "SLIDE",
};

/**
 * True when the verb needs a follow-up target tap; the rest resolve the moment
 * the verb is chosen.
 */
export function needsTarget(action: BoardActionType): boolean {
  return action === "move" || action === "dribble" || action === "pass";
}

/** The outcome of resolving an action — drives the banners. */
export type BoardEvent =
  | "none"
  | "advanced"
  | "goal"
  | "save"
  | "blocked"
  | "turnover";

/** A booking handed out for a reckless (missed) slide. */
export type CardType = "none" | "yellow" | "red";

export type CoinSide = "heads" | "tails";

export type ChessMatchPhase =
  | "toss"
  | "playerTurn"
  | "opponentTurn"
  | "resolving"
  | "goalScored"
  | "fullTime";

/* ---- Formations ---------------------------------------------------------- */

/** 5-a-side shapes, used as the starting layout of the four outfielders. */
export type ChessFormation = "box" | "diamond" | "attacking" | "defensive";

export const chessFormations: readonly ChessFormation[] = [
  "box",
  "diamond",
  "attacking",
  "defensive",
];

export const formationLabels: Record<ChessFormation, string> = {
  box: "BOX",
  diamond: "DIAMOND",
  attacking: "HIGH LINE",
  defensive: "LOW BLOCK",
};

/** 5-a-side code, keeper omitted. */
export const formationCodes: Record<ChessFormation, string> = {
  box: "2-2",
  diamond: "1-2-1",
  attacking: "2-1-1",
  defensive: "1-1-2",
};

export const formationBlurbs: Record<ChessFormation, string> = {
  box: "Balanced two-and-two across the back and front.",
  diamond: "Compact diamond — control the centre.",
  attacking: "Push up — start higher up the pitch.",
  defensive: "Sit deep — start nearer your own goal.",
};

/* ---- The grid ------------------------------------------------------------ */

export const boardCols = 3;
export const boardRows = 4;

/** Row 0 is the player's back row at the bottom; row 3 is the opponent's. */
export type BoardCell = { readonly col: number; readonly row: number };

export function cell(col: number, row: number): BoardCell {
  return { col, row };
}

/** A stable string for keys, sets and lookups — cells are compared by value. */
export function cellKey(c: BoardCell): string {
  return `${c.col},${c.row}`;
}

export function sameCell(a: BoardCell, b: BoardCell): boolean {
  return a.col === b.col && a.row === b.row;
}

export function containsCell(cells: readonly BoardCell[], c: BoardCell): boolean {
  return cells.some((candidate) => sameCell(candidate, c));
}

export function inBounds(c: BoardCell): boolean {
  return c.col >= 0 && c.col < boardCols && c.row >= 0 && c.row < boardRows;
}

export function inPlayerHalf(c: BoardCell): boolean {
  return c.row <= 1;
}

export function inOpponentHalf(c: BoardCell): boolean {
  return c.row >= 2;
}

/**
 * The half a side is *attacking into*, and so may shoot from. The player attacks
 * upward, the opponent downward.
 */
export function isShootingHalfFor(c: BoardCell, side: Side): boolean {
  return side === "player" ? inOpponentHalf(c) : inPlayerHalf(c);
}

/** All eight in-bounds neighbours, orthogonal and diagonal. */
export function neighbors8(c: BoardCell): BoardCell[] {
  const out: BoardCell[] = [];
  for (let dc = -1; dc <= 1; dc += 1) {
    for (let dr = -1; dr <= 1; dr += 1) {
      if (dc === 0 && dr === 0) continue;
      const candidate = cell(c.col + dc, c.row + dr);
      if (inBounds(candidate)) out.push(candidate);
    }
  }
  return out;
}

/** Chebyshev distance — a diagonal step counts as one. */
export function distanceTo(a: BoardCell, b: BoardCell): number {
  return Math.max(Math.abs(a.col - b.col), Math.abs(a.row - b.row));
}

export function isAdjacent8(a: BoardCell, b: BoardCell): boolean {
  return distanceTo(a, b) === 1;
}

/* ---- Pieces -------------------------------------------------------------- */

/**
 * A player on the board. Outfielders occupy grid cells; the keeper is flagged
 * and parked in the goal, on a sentinel cell just off-grid.
 */
export type BoardPiece = {
  id: string;
  card: PlayerCard;
  side: Side;
  cell: BoardCell;
  isKeeper: boolean;
  /** A second booking sends them off. */
  yellow: boolean;
  /** Turns the piece must sit out after a red; 0 means available. */
  benchedTurns: number;
  tackleCooldownTurns: number;
  slideCooldownTurns: number;
};

export function pieceRating(piece: BoardPiece): number {
  return piece.card.rating;
}

export function isBenched(piece: BoardPiece): boolean {
  return piece.benchedTurns > 0;
}

/* ---- Board state --------------------------------------------------------- */

/**
 * Immutable spatial state: where everyone is, where the ball is, and who holds
 * it. Scores, clock and turn live on the match; the board stays purely
 * positional.
 */
export type BoardState = {
  /** All ten players — eight outfielders on the grid, two keepers off it. */
  pieces: readonly BoardPiece[];
  /** Always the cell the possessing side's carrier stands on. */
  ballCell: BoardCell;
  possession: Side;
};

export function outfield(state: BoardState, side: Side): BoardPiece[] {
  return state.pieces.filter((piece) => piece.side === side && !piece.isKeeper);
}

export function keeperOf(state: BoardState, side: Side): BoardPiece {
  const keeper = state.pieces.find((piece) => piece.side === side && piece.isKeeper);
  if (keeper === undefined) throw new Error(`No keeper for ${side}`);
  return keeper;
}

export function pieceById(state: BoardState, id: string): BoardPiece | null {
  return state.pieces.find((piece) => piece.id === id) ?? null;
}

/** The piece — outfielder or keeper — standing on a cell. */
export function pieceAt(state: BoardState, c: BoardCell): BoardPiece | null {
  return state.pieces.find((piece) => sameCell(piece.cell, c)) ?? null;
}

export function outfieldAt(state: BoardState, c: BoardCell): BoardPiece | null {
  return (
    state.pieces.find((piece) => !piece.isKeeper && sameCell(piece.cell, c)) ?? null
  );
}

export function isEmptyCell(state: BoardState, c: BoardCell): boolean {
  return inBounds(c) && outfieldAt(state, c) === null;
}

/** The piece carrying the ball, if the side on the ball cell is in possession. */
export function carrierOf(state: BoardState): BoardPiece | null {
  const piece = pieceAt(state, state.ballCell);
  return piece !== null && piece.side === state.possession ? piece : null;
}

/** Replace one piece by id with a moved copy. */
export function withPieceAt(
  state: BoardState,
  id: string,
  to: BoardCell,
  cooldowns: { tackleCooldownTurns?: number; slideCooldownTurns?: number } = {},
): BoardState {
  return {
    ...state,
    pieces: state.pieces.map((piece) =>
      piece.id === id
        ? {
            ...piece,
            cell: to,
            tackleCooldownTurns:
              cooldowns.tackleCooldownTurns ?? piece.tackleCooldownTurns,
            slideCooldownTurns:
              cooldowns.slideCooldownTurns ?? piece.slideCooldownTurns,
          }
        : piece,
    ),
  };
}

/* ---- Match records ------------------------------------------------------- */

/** One goal in the match log — feeds the result screen's timeline. */
export type ChessGoal = {
  scorerShortName: string;
  byPlayer: boolean;
  /** The clock reading when it went in, in seconds remaining. */
  atClock: number;
};

/** The last action's cells, which tint the board chess.com style. */
export type LastMove = {
  from: BoardCell;
  to: BoardCell;
  side: Side;
  verb: BoardActionType;
  actorName: string;
};

export type MoveLogEntry = {
  side: Side;
  verb: BoardActionType;
  card: CardType;
};

/** One chosen action: who acts, and where or on whom. */
export type ChessAction = {
  type: BoardActionType;
  pieceId: string;
  /** Move and dribble destination. */
  cell?: BoardCell;
  /** Pass or dribble target piece id. */
  targetId?: string;
};

/** The result of applying an action: the new board and what happened. */
export type ActionResult = {
  state: BoardState;
  event: BoardEvent;
  scorer: Side | null;
  /** A booking handed out this action, from a missed slide. */
  card: CardType;
};

export function clamp(value: number, minimum: number, maximum: number): number {
  return value < minimum ? minimum : value > maximum ? maximum : value;
}

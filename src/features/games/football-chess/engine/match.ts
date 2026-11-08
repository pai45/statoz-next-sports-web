/**
 * The match state machine — the web port of `blocs/football_chess/football_chess_cubit.dart`.
 *
 * The toss, the alternating one-action turns, the 2:00 clock and its soft
 * per-move timer, goals, and the final whistle. Flutter drives this from a
 * cubit with two `Timer`s; here it is a reducer, and the timers become the
 * component dispatching `resolutionAnimated`, `goalReset` and `cpuMove` once
 * the corresponding animation has played.
 *
 * Guards return the same state reference rather than throwing, and the switch
 * has no `default`, so a new action is a type error rather than a silent no-op.
 */

import type { PlayerCard } from "@/domain/cards";

import type { RandomSource } from "../../shared/engine/random-source";
import { decisionSeconds, matchSeconds, moveLogLimit, tickSeconds } from "../constants";
import {
  carrierOf,
  chessFormations,
  needsTarget,
  opposite,
  outfieldAt,
  pieceAt,
  pieceById,
  sameCell,
  containsCell,
  type BoardActionType,
  type BoardCell,
  type BoardEvent,
  type BoardPiece,
  type BoardState,
  type ChessAction,
  type ChessFormation,
  type ChessGoal,
  type ChessMatchPhase,
  type CoinSide,
  type LastMove,
  type MoveLogEntry,
  type Side,
} from "../types";

import { cpuChooseAction, type CpuDecisionContext } from "./cpu";
import {
  allActions,
  applyAction,
  availableActions,
  dribbleTargets,
  initialBoard,
  kickoffReset,
  legalMoves,
  passTargets,
  tossCoin,
} from "./rules";

/* ---- State --------------------------------------------------------------- */

export type ChessMatch = {
  playerSquad: PlayerCard[];
  opponentSquad: PlayerCard[];
  opponentName: string;
  opponentLevel: number;
  playerFormation: ChessFormation;
  opponentFormation: ChessFormation;

  board: BoardState;
  phase: ChessMatchPhase;
  /** Whose action it is — and the actor while resolving or celebrating. */
  turnSide: Side;
  playerScore: number;
  opponentScore: number;
  /** Seconds, counting 120 down to 0. */
  clockRemaining: number;
  decisionRemaining: number;
  paused: boolean;

  tossCall: CoinSide | null;
  tossResult: CoinSide | null;
  playerWonToss: boolean | null;

  selectedPieceId: string | null;
  availableActions: readonly BoardActionType[];
  /** The armed verb awaiting a target tap, or null. */
  selectedAction: BoardActionType | null;
  /** Highlight targets: cells for move and dribble, teammate ids for pass. */
  moveCells: readonly BoardCell[];
  passTargetIds: readonly string[];

  lastEvent: BoardEvent;
  banner: string | null;
  lastMove: LastMove | null;
  moveLog: readonly MoveLogEntry[];
  goals: readonly ChessGoal[];
  /** Bumped on every emission, so the presentation can key its beats off it. */
  eventTick: number;
};

export function isFinished(match: ChessMatch): boolean {
  return match.phase === "fullTime";
}

export function playerWon(match: ChessMatch): boolean {
  return match.playerScore > match.opponentScore;
}

export function isDraw(match: ChessMatch): boolean {
  return match.playerScore === match.opponentScore;
}

export function selectedPiece(match: ChessMatch): BoardPiece | null {
  return match.selectedPieceId === null
    ? null
    : pieceById(match.board, match.selectedPieceId);
}

/* ---- Building a match ---------------------------------------------------- */

export type BuildMatchOptions = {
  playerSquad: PlayerCard[];
  formation: ChessFormation;
  opponentSquad: PlayerCard[];
  opponentName: string;
  opponentLevel: number;
};

/**
 * A kickoff-ready match, waiting on the toss.
 *
 * The opponent's shape is drawn here, from the match's own source and before
 * anything else touches it — the CPU turns up in a different formation every
 * time, and the draw's position in the stream is part of the contract.
 */
export function buildMatch(
  { playerSquad, formation, opponentSquad, opponentName, opponentLevel }: BuildMatchOptions,
  random: RandomSource = Math.random,
): ChessMatch {
  const opponentFormation =
    chessFormations[Math.floor(random() * chessFormations.length)];

  return {
    playerSquad,
    opponentSquad,
    opponentName,
    opponentLevel,
    playerFormation: formation,
    opponentFormation,
    board: initialBoard({
      playerSquad,
      opponentSquad,
      playerFormation: formation,
      opponentFormation,
      kickoff: "player",
    }),
    phase: "toss",
    turnSide: "player",
    playerScore: 0,
    opponentScore: 0,
    clockRemaining: matchSeconds,
    decisionRemaining: decisionSeconds,
    paused: false,
    tossCall: null,
    tossResult: null,
    playerWonToss: null,
    selectedPieceId: null,
    availableActions: [],
    selectedAction: null,
    moveCells: [],
    passTargetIds: [],
    lastEvent: "none",
    banner: null,
    lastMove: null,
    moveLog: [],
    goals: [],
    eventTick: 0,
  };
}

/* ---- Actions ------------------------------------------------------------- */

export type MatchAction =
  | { type: "callToss"; call: CoinSide }
  | { type: "beginPlay" }
  | { type: "tapCell"; cell: BoardCell }
  | { type: "chooseAction"; verb: BoardActionType }
  | { type: "deselect" }
  /** The renderer has finished playing the resolution out. */
  | { type: "resolutionAnimated" }
  /** The goal celebration is over; reset for the kickoff. */
  | { type: "goalReset" }
  /** The CPU's thinking time has elapsed. */
  | { type: "cpuMove" }
  | { type: "tick" }
  | { type: "setPaused"; paused: boolean };

const clearedSelection = {
  selectedPieceId: null,
  availableActions: [] as readonly BoardActionType[],
  selectedAction: null,
  moveCells: [] as readonly BoardCell[],
  passTargetIds: [] as readonly string[],
};

function bump(match: ChessMatch, patch: Partial<ChessMatch>): ChessMatch {
  return { ...match, ...patch, eventTick: match.eventTick + 1 };
}

function bannerFor(event: BoardEvent): string | null {
  switch (event) {
    case "turnover":
      return "BALL WON";
    case "save":
      return "SAVED";
    case "blocked":
      return "BLOCKED";
    default:
      return null;
  }
}

/* ---- Reducer ------------------------------------------------------------- */

/**
 * The two sources a match draws on.
 *
 * `play` rolls the outcomes; `decide` only ever breaks a tie between CPU moves
 * the search rated identically. Flutter keeps them apart for a reason — sharing
 * one stream would let the CPU's thinking consume a gameplay roll and shift
 * every outcome after it.
 */
export type MatchRandom = { play: RandomSource; decide: RandomSource };

const defaultRandom: MatchRandom = { play: Math.random, decide: Math.random };

export function matchReducer(
  match: ChessMatch,
  action: MatchAction,
  sources: MatchRandom = defaultRandom,
): ChessMatch {
  const random = sources.play;
  switch (action.type) {
    case "callToss": {
      if (match.phase !== "toss") return match;
      const result = tossCoin(random);
      const won = result === action.call;
      const kickoff: Side = won ? "player" : "opponent";
      return bump(match, {
        tossCall: action.call,
        tossResult: result,
        playerWonToss: won,
        board: kickoffReset(match.board, kickoff),
        turnSide: kickoff,
      });
    }

    case "beginPlay": {
      if (match.phase !== "toss") return match;
      return startTurn(match, match.playerWonToss !== false ? "player" : "opponent");
    }

    case "tapCell":
      return tapCell(match, action.cell, random);

    case "chooseAction":
      return chooseAction(match, action.verb, random);

    case "deselect":
      if (match.selectedPieceId === null) return match;
      return bump(match, clearedSelection);

    case "resolutionAnimated": {
      if (match.phase !== "resolving") return match;
      if (match.clockRemaining <= 0) return endMatch(match);
      return startTurn(match, opposite(match.turnSide));
    }

    case "goalReset": {
      if (match.phase !== "goalScored") return match;
      if (match.clockRemaining <= 0) return endMatch(match);
      // A full reset to the starting shapes; the conceding side kicks off.
      const conceder = opposite(match.turnSide);
      const reset = {
        ...match,
        board: kickoffReset(
          initialBoard({
            playerSquad: match.playerSquad,
            opponentSquad: match.opponentSquad,
            playerFormation: match.playerFormation,
            opponentFormation: match.opponentFormation,
            kickoff: conceder,
          }),
          conceder,
        ),
        banner: null,
      };
      return startTurn(reset, conceder);
    }

    case "cpuMove": {
      if (match.phase !== "opponentTurn") return match;
      const chosen = cpuChooseAction(
        match.board,
        cpuContext(match),
        sources.decide,
      );
      if (chosen === null) return startTurn(match, "player");
      return applyChessAction(match, chosen, random);
    }

    case "tick":
      return tick(match, random);

    case "setPaused":
      return { ...match, paused: action.paused };
  }
}

function cpuContext(match: ChessMatch): CpuDecisionContext {
  return {
    playerScore: match.playerScore,
    opponentScore: match.opponentScore,
    clockRemaining: match.clockRemaining,
    recentPlayerActions: match.moveLog
      .filter((entry) => entry.side === "player")
      .map((entry) => entry.verb),
  };
}

/* ---- Player input -------------------------------------------------------- */

function tapCell(
  match: ChessMatch,
  c: BoardCell,
  random: RandomSource,
): ChessMatch {
  if (match.phase !== "playerTurn") return match;
  const selected = selectedPiece(match);
  const verb = match.selectedAction;

  // An armed targeted verb is waiting for its destination.
  if (selected !== null && verb !== null && needsTarget(verb)) {
    if (verb === "move" && containsCell(match.moveCells, c)) {
      return applyChessAction(
        match,
        { type: verb, pieceId: selected.id, cell: c },
        random,
      );
    }
    if (verb === "dribble" && containsCell(match.moveCells, c)) {
      const opponentPiece = outfieldAt(match.board, c);
      if (opponentPiece !== null) {
        return applyChessAction(
          match,
          { type: verb, pieceId: selected.id, targetId: opponentPiece.id },
          random,
        );
      }
    }
    if (verb === "pass") {
      const tapped = pieceAt(match.board, c);
      if (tapped !== null && match.passTargetIds.includes(tapped.id)) {
        return applyChessAction(
          match,
          { type: "pass", pieceId: selected.id, targetId: tapped.id },
          random,
        );
      }
    }
    // Tapped off-target: fall through to (re)select or deselect.
  }

  const tapped = pieceAt(match.board, c);
  if (tapped !== null && tapped.side === "player") {
    // Tapping the selected piece again puts it down.
    if (tapped.id === match.selectedPieceId) return bump(match, clearedSelection);
    return select(match, tapped);
  }
  return bump(match, clearedSelection);
}

function select(match: ChessMatch, piece: BoardPiece): ChessMatch {
  const available = availableActions(match.board, "player", piece);
  const hasMove = available.includes("move");
  return bump(match, {
    selectedPieceId: piece.id,
    availableActions: available,
    // Move is armed by default, so a selected piece can be walked immediately.
    selectedAction: hasMove ? "move" : null,
    moveCells: hasMove ? legalMoves(match.board, piece) : [],
    passTargetIds: [],
  });
}

function chooseAction(
  match: ChessMatch,
  verb: BoardActionType,
  random: RandomSource,
): ChessMatch {
  if (match.phase !== "playerTurn") return match;
  const selected = selectedPiece(match);
  if (selected === null || !match.availableActions.includes(verb)) return match;

  if (needsTarget(verb)) return arm(match, verb, selected);
  return applyChessAction(match, { type: verb, pieceId: selected.id }, random);
}

function arm(
  match: ChessMatch,
  verb: BoardActionType,
  piece: BoardPiece,
): ChessMatch {
  const cells =
    verb === "move"
      ? legalMoves(match.board, piece)
      : verb === "dribble"
        ? // Dribble targets are adjacent opponents, so highlight their cells.
          dribbleTargets(match.board, piece)
            .map((id) => pieceById(match.board, id))
            .filter((p): p is BoardPiece => p !== null)
            .map((p) => p.cell)
        : [];
  return bump(match, {
    selectedAction: verb,
    moveCells: cells,
    passTargetIds: verb === "pass" ? passTargets(match.board, piece) : [],
  });
}

/* ---- Resolution ---------------------------------------------------------- */

function lastMoveFor(
  match: ChessMatch,
  action: ChessAction,
  actor: BoardPiece,
  resultState: BoardState,
): LastMove {
  const from = actor.cell;
  let to = from;
  switch (action.type) {
    case "move":
      to = action.cell ?? from;
      break;
    case "pass":
    case "dribble": {
      const target = pieceById(match.board, action.targetId as string);
      to = target?.cell ?? from;
      break;
    }
    case "tackle":
    case "slide":
      to = carrierOf(match.board)?.cell ?? from;
      break;
    default:
      to = pieceById(resultState, actor.id)?.cell ?? from;
  }
  return { from, to, side: actor.side, verb: action.type, actorName: actor.card.shortName };
}

function applyChessAction(
  match: ChessMatch,
  action: ChessAction,
  random: RandomSource,
): ChessMatch {
  const actor = pieceById(match.board, action.pieceId);
  if (actor === null) return match;
  const side = actor.side;

  const result = applyAction(match.board, action, random);
  const lastMove = lastMoveFor(match, action, actor, result.state);

  const log: MoveLogEntry[] = [
    ...match.moveLog,
    { side, verb: action.type, card: result.card },
  ];
  const moveLog = log.length > moveLogLimit ? log.slice(log.length - moveLogLimit) : log;

  if (result.event === "goal") {
    const scorerIsPlayer = result.scorer === "player";
    return bump(match, {
      phase: "goalScored",
      board: result.state,
      turnSide: side,
      playerScore: scorerIsPlayer ? match.playerScore + 1 : match.playerScore,
      opponentScore: scorerIsPlayer ? match.opponentScore : match.opponentScore + 1,
      banner: "GOAL",
      goals: [
        ...match.goals,
        {
          scorerShortName: actor.card.shortName,
          byPlayer: scorerIsPlayer,
          atClock: match.clockRemaining,
        },
      ],
      lastMove,
      moveLog,
      ...clearedSelection,
    });
  }

  const banner =
    result.card === "red"
      ? "RED CARD"
      : result.card === "yellow"
        ? "YELLOW CARD"
        : bannerFor(result.event);

  return bump(match, {
    phase: "resolving",
    board: result.state,
    turnSide: side,
    lastEvent: result.event,
    banner,
    lastMove,
    moveLog,
    ...clearedSelection,
  });
}

/* ---- Turns and the clock ------------------------------------------------- */

function startTurn(match: ChessMatch, side: Side): ChessMatch {
  // Bookings and cooldowns tick down at the start of that side's turn.
  const board: BoardState = {
    ...match.board,
    pieces: match.board.pieces.map((piece) =>
      piece.side === side
        ? {
            ...piece,
            benchedTurns: Math.max(0, piece.benchedTurns - 1),
            tackleCooldownTurns: Math.max(0, piece.tackleCooldownTurns - 1),
            slideCooldownTurns: Math.max(0, piece.slideCooldownTurns - 1),
          }
        : piece,
    ),
  };

  return bump(match, {
    board,
    phase: side === "player" ? "playerTurn" : "opponentTurn",
    turnSide: side,
    decisionRemaining: decisionSeconds,
    banner: null,
    ...clearedSelection,
  });
}

function tick(match: ChessMatch, random: RandomSource): ChessMatch {
  const active = match.phase === "playerTurn" || match.phase === "opponentTurn";
  if (!active || match.paused) return match;

  const clock = match.clockRemaining - tickSeconds;
  if (clock <= 0) return endMatch({ ...match, clockRemaining: 0 });

  if (match.phase !== "playerTurn") {
    return { ...match, clockRemaining: clock };
  }

  const decision = match.decisionRemaining - tickSeconds;
  if (decision <= 0) {
    // Out of decision time: commit a legal move so play keeps flowing.
    return autoAct({ ...match, clockRemaining: clock, decisionRemaining: 0 }, random);
  }
  return { ...match, clockRemaining: clock, decisionRemaining: decision };
}

function autoAct(match: ChessMatch, random: RandomSource): ChessMatch {
  const actions = allActions(match.board, "player");
  if (actions.length === 0) return startTurn(match, "opponent");
  return applyChessAction(
    match,
    actions[Math.floor(random() * actions.length)],
    random,
  );
}

function endMatch(match: ChessMatch): ChessMatch {
  return bump(match, {
    phase: "fullTime",
    banner: null,
    ...clearedSelection,
  });
}

/** Where the ball sits, for the presentation's benefit. */
export function ballIsAt(match: ChessMatch, c: BoardCell): boolean {
  return sameCell(match.board.ballCell, c);
}

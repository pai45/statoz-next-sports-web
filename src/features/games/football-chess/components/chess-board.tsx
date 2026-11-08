"use client";

import type { CSSProperties } from "react";

import { accentVar, feedbackVar, Glyph, withAlpha } from "@statoz/design-system/web";

import {
  boardActionLabels,
  boardCols,
  boardRows,
  cell,
  cellKey,
  containsCell,
  isBenched,
  keeperOf,
  outfieldAt,
  pieceAt,
  sameCell,
  type BoardCell,
  type BoardPiece,
  type Side,
} from "../types";
import type { ChessMatch } from "../engine/match";
import { selectedPiece } from "../engine/match";

import styles from "./football-chess.module.css";

/**
 * The board — the web port of `GridComponent` and `PlayerTokenComponent`.
 *
 * Flutter draws the whole thing into a Flame canvas and catches taps on a
 * full-area layer. Three columns by four rows of DOM is the better web answer:
 * every square is a real `<button>`, so the board is keyboard-reachable and
 * screen-readable, the pieces slide on a CSS transition instead of a
 * `MoveEffect`, and only the last-move arrow — which is genuine geometry — needs
 * an SVG layer over the top.
 *
 * The grid is drawn top-down (opponent's row 3 first) because row 0 is the
 * player's back row at the *bottom* of the pitch.
 */

export type ChessBoardProps = {
  match: ChessMatch;
  /** Squares are live only on the player's turn. */
  interactive: boolean;
  onTapCell: (c: BoardCell) => void;
};

const rowsTopDown = Array.from({ length: boardRows }, (_u, i) => boardRows - 1 - i);
const colsLeftRight = Array.from({ length: boardCols }, (_u, i) => i);

function teamColor(side: Side): string {
  return side === "player" ? accentVar("cyan") : accentVar("violet");
}

export function ChessBoard({ match, interactive, onTapCell }: ChessBoardProps) {
  const selected = selectedPiece(match);
  const carrier =
    pieceAt(match.board, match.board.ballCell)?.side === match.board.possession
      ? pieceAt(match.board, match.board.ballCell)
      : null;

  const passCells = match.passTargetIds
    .map((id) => match.board.pieces.find((piece) => piece.id === id))
    .filter((piece): piece is BoardPiece => piece !== undefined)
    .map((piece) => piece.cell);

  // The carrier wears a danger ring when the selected defender can duel it.
  const canDuel =
    match.selectedPieceId !== null &&
    (match.availableActions.includes("tackle") ||
      match.availableActions.includes("slide"));
  const dangerCell = canDuel ? (carrier?.cell ?? null) : null;

  const lastMove = match.lastMove;
  const dribbleArmed = match.selectedAction === "dribble";

  return (
    <div className={styles.pitch}>
      {/* The keeper's goal at the far end. */}
      <GoalStrip side="opponent" keeper={keeperOf(match.board, "opponent")} atTop />

      <div className={styles.grid}>
        {rowsTopDown.map((row) =>
          colsLeftRight.map((col) => {
            const c = cell(col, row);
            const piece = outfieldAt(match.board, c);
            const isSelected = selected !== null && sameCell(selected.cell, c);
            const isMoveTarget = !dribbleArmed && containsCell(match.moveCells, c);
            const isDribbleTarget = dribbleArmed && containsCell(match.moveCells, c);
            const isPassTarget = containsCell(passCells, c);
            const isDanger = dangerCell !== null && sameCell(dangerCell, c);
            const isLastFrom = lastMove !== null && sameCell(lastMove.from, c);
            const isLastTo = lastMove !== null && sameCell(lastMove.to, c);
            const hasBall = sameCell(match.board.ballCell, c);

            return (
              <Square
                key={cellKey(c)}
                cell={c}
                piece={piece}
                hasBall={hasBall}
                selected={isSelected}
                moveTarget={isMoveTarget}
                dribbleTarget={isDribbleTarget}
                passTarget={isPassTarget}
                danger={isDanger}
                lastTouched={isLastFrom || isLastTo}
                interactive={interactive}
                onTap={() => onTapCell(c)}
              />
            );
          }),
        )}

        <LastMoveArrow match={match} />
        <span className={styles.halfway} aria-hidden />
        <span className={styles.centreCircle} aria-hidden />
      </div>

      {/* The player's own goal, nearest the reader. */}
      <GoalStrip side="player" keeper={keeperOf(match.board, "player")} />
    </div>
  );
}

/* ---- Pieces of the board -------------------------------------------------- */

/**
 * A goal, and the keeper standing in it.
 *
 * The keeper is off the playing grid — Flutter parks it on a sentinel cell at
 * row -1 or row 4 — so it gets its own strip rather than a square. It is not a
 * button: the only thing a keeper ever does is pass, and it only holds the ball
 * after a save, which the engine resolves without a tap.
 */
function GoalStrip({
  side,
  keeper,
  atTop = false,
}: {
  side: Side;
  keeper: BoardPiece;
  atTop?: boolean;
}) {
  const color = teamColor(side);
  return (
    <div className={styles.goalRow}>
      <span
        className={`${styles.goal} ${atTop ? styles.goalFar : styles.goalNear}`}
        style={{ background: withAlpha(color, 0.55), boxShadow: `0 0 12px ${withAlpha(color, 0.35)}` }}
        aria-hidden
      />
      <span
        className={styles.keeperCell}
        aria-label={`${side === "player" ? "Your" : "Opponent"} keeper: ${keeper.card.shortName}, rated ${keeper.card.rating}`}
      >
        <Token piece={keeper} selected={false} />
      </span>
    </div>
  );
}

type SquareProps = {
  cell: BoardCell;
  piece: BoardPiece | null;
  hasBall: boolean;
  selected: boolean;
  moveTarget: boolean;
  dribbleTarget: boolean;
  passTarget: boolean;
  danger: boolean;
  lastTouched: boolean;
  interactive: boolean;
  onTap: () => void;
};

function Square({
  cell: c,
  piece,
  hasBall,
  selected,
  moveTarget,
  dribbleTarget,
  passTarget,
  danger,
  lastTouched,
  interactive,
  onTap,
}: SquareProps) {
  const label = squareLabel(c, piece, {
    selected,
    moveTarget,
    dribbleTarget,
    passTarget,
    hasBall,
  });

  return (
    <button
      type="button"
      onClick={onTap}
      disabled={!interactive}
      aria-label={label}
      aria-pressed={selected}
      className={`${styles.square} ${interactive ? styles.squareLive : ""}`}
      /*
       * Both placements are published, and the stylesheet picks one. Rotating
       * the board on a wide screen is a display decision, so it belongs in a
       * media query rather than in a width the component has to measure.
       */
      style={
        {
          "--sq-col": c.col + 1,
          "--sq-row": boardRows - c.row,
          "--sq-wide-col": c.row + 1,
          "--sq-wide-row": c.col + 1,
        } as CSSProperties
      }
    >
      {lastTouched ? <span className={styles.lastTouched} aria-hidden /> : null}
      {selected ? <span className={styles.selectedPlate} aria-hidden /> : null}
      {moveTarget ? <span className={styles.moveDot} aria-hidden /> : null}
      {dribbleTarget || danger ? <span className={styles.dangerRing} aria-hidden /> : null}
      {passTarget ? <span className={styles.passRing} aria-hidden /> : null}

      {piece !== null ? <Token piece={piece} selected={selected} /> : null}
      {hasBall ? <span className={styles.ball} aria-hidden /> : null}
    </button>
  );
}

function Token({ piece, selected }: { piece: BoardPiece; selected: boolean }) {
  const benched = isBenched(piece);
  const color = benched ? "var(--ds-color-text-muted)" : teamColor(piece.side);

  return (
    <span className={styles.token}>
      <span
        className={`${styles.chip} ${selected && !benched ? styles.chipActive : ""}`}
        style={{
          background: withAlpha("var(--ds-color-background-elevated)", benched ? 0.55 : 1),
          borderColor: withAlpha(color, selected ? 1 : 0.75),
          borderWidth: selected ? 3 : 2,
          color,
        }}
      >
        <span className={`${styles.rating} ds-tabular`}>{piece.card.rating}</span>
        {piece.yellow || benched ? (
          <span
            className={styles.booking}
            style={{ background: benched ? feedbackVar("danger") : accentVar("gold") }}
          />
        ) : null}
      </span>
      <span className={styles.name}>{shortLabel(piece)}</span>
    </span>
  );
}

function shortLabel(piece: BoardPiece): string {
  const name = piece.card.shortName;
  return name.length > 9 ? name.slice(0, 9) : name;
}

function squareLabel(
  c: BoardCell,
  piece: BoardPiece | null,
  marks: {
    selected: boolean;
    moveTarget: boolean;
    dribbleTarget: boolean;
    passTarget: boolean;
    hasBall: boolean;
  },
): string {
  const where = `Column ${c.col + 1}, row ${c.row + 1}`;
  const who =
    piece === null
      ? "empty"
      : `${piece.card.shortName}, rated ${piece.card.rating}, ${
          piece.side === "player" ? "your player" : "opponent"
        }${isBenched(piece) ? ", sent off" : piece.yellow ? ", booked" : ""}`;

  const marked = [
    marks.hasBall ? "has the ball" : null,
    marks.selected ? "selected" : null,
    marks.moveTarget ? "move here" : null,
    marks.dribbleTarget ? "take on" : null,
    marks.passTarget ? "pass to" : null,
  ].filter((mark): mark is string => mark !== null);

  return marked.length > 0
    ? `${where}: ${who}. ${marked.join(", ")}.`
    : `${where}: ${who}.`;
}

/**
 * The chess.com-style arrow over the last action.
 *
 * SVG rather than a div: it is a line, a head and — for a duel — a second head
 * pointing back, which the cascade has no way to express. The viewBox is the
 * grid in cell units, so it scales with the board and never needs a resize
 * observer.
 */
function LastMoveArrow({ match }: { match: ChessMatch }) {
  const lastMove = match.lastMove;
  if (lastMove === null || sameCell(lastMove.from, lastMove.to)) return null;

  const isDuel = lastMove.verb === "tackle" || lastMove.verb === "slide";
  const wonIt = isDuel && match.lastEvent === "turnover";
  const color = isDuel
    ? wonIt
      ? feedbackVar("success")
      : feedbackVar("danger")
    : teamColor(lastMove.side);
  const badge = isDuel ? "security" : lastMove.verb === "dribble" ? "directions_run" : null;

  /*
   * Both orientations are drawn and the stylesheet shows one. The arrow is the
   * only part of the board whose geometry the cascade cannot re-map, and two
   * short SVGs cost less than teaching the component to measure the viewport.
   */
  return (
    <>
      <ArrowLayer
        className={styles.arrowTall}
        width={boardCols}
        height={boardRows}
        // Row 0 is the player's back row, at the bottom.
        project={(c) => ({ x: c.col + 0.5, y: boardRows - c.row - 0.5 })}
        from={lastMove.from}
        to={lastMove.to}
        color={color}
        isDuel={isDuel}
        badge={badge}
      />
      <ArrowLayer
        className={styles.arrowWide}
        width={boardRows}
        height={boardCols}
        // Turned a quarter clockwise: the player's back row is now the left
        // column, so a row index reads across and a column index reads down.
        project={(c) => ({ x: c.row + 0.5, y: c.col + 0.5 })}
        from={lastMove.from}
        to={lastMove.to}
        color={color}
        isDuel={isDuel}
        badge={badge}
      />
    </>
  );
}

type ArrowLayerProps = {
  className: string;
  width: number;
  height: number;
  project: (c: BoardCell) => { x: number; y: number };
  from: BoardCell;
  to: BoardCell;
  color: string;
  isDuel: boolean;
  badge: "security" | "directions_run" | null;
};

function ArrowLayer({
  className,
  width,
  height,
  project,
  from: fromCell,
  to: toCell,
  color,
  isDuel,
  badge,
}: ArrowLayerProps) {
  const from = project(fromCell);
  const to = project(toCell);

  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  // In cell units, matching Flutter's 3px stroke and 12px head against a cell
  // of roughly 113px. `vectorEffect` must stay off: it would reinterpret the
  // width as device pixels and the line would vanish.
  const head = 0.11;

  const headPath = (at: { x: number; y: number }, facing: number) =>
    `M ${at.x} ${at.y} L ${at.x - head * Math.cos(facing - Math.PI / 6)} ${
      at.y - head * Math.sin(facing - Math.PI / 6)
    } L ${at.x - head * Math.cos(facing + Math.PI / 6)} ${
      at.y - head * Math.sin(facing + Math.PI / 6)
    } Z`;

  const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };

  return (
    <svg
      className={`${styles.arrow} ${className}`}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      <g opacity={0.6}>
        <line
          x1={from.x}
          y1={from.y}
          x2={to.x}
          y2={to.y}
          stroke={color}
          strokeWidth={0.03}
          strokeLinecap="round"
        />
        <path d={headPath(to, angle)} fill={color} />
        {isDuel ? <path d={headPath(from, angle + Math.PI)} fill={color} /> : null}
      </g>
      {badge !== null ? (
        <foreignObject x={mid.x - 0.22} y={mid.y - 0.22} width={0.44} height={0.44}>
          <span
            className={styles.arrowBadge}
            style={{ color, background: withAlpha("var(--ds-color-background-primary)", 0.8) }}
          >
            <Glyph name={badge} size={14} />
          </span>
        </foreignObject>
      ) : null}
    </svg>
  );
}

export { boardActionLabels };

/**
 * The four 5-a-side shapes, as starting cells for the outfielders.
 *
 * Ported from `_formationCells` in the Flutter engine. Cells are given in the
 * player's half — row 0 is the back row, row 1 the front — in squad order
 * `[atk0, atk1, def0, def1]`. The opponent's shape is this mirrored, which the
 * board setup does rather than storing it twice.
 */

import { cell, type BoardCell, type ChessFormation } from "../types";

const cells: Record<ChessFormation, readonly BoardCell[]> = {
  box: [cell(0, 1), cell(2, 1), cell(0, 0), cell(2, 0)],
  diamond: [cell(0, 1), cell(2, 1), cell(1, 0), cell(1, 1)],
  attacking: [cell(1, 1), cell(0, 1), cell(2, 1), cell(1, 0)],
  defensive: [cell(1, 1), cell(1, 0), cell(0, 0), cell(2, 0)],
};

export function formationCells(formation: ChessFormation): BoardCell[] {
  return [...cells[formation]];
}

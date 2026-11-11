import { bingoCareers } from "../../football-bingo/data/careers";
import { clubCode, clubLabel } from "../../football-bingo/data/clubs";
import type { BingoCareer } from "../../football-bingo/types";
import { dayIndexFor } from "../../daily/day";
import { seededRandom } from "../../daily/seeded";

/**
 * Football Grid: three clubs across, three down, and a player who turned out
 * for both in every cell.
 *
 * Built on the senior-club record behind Football Bingo, so every answer the
 * grid accepts is one the app already stands behind. Grids are dealt by a
 * seeded search over the clubs with the most players on record, and a grid is
 * only accepted when every cell has enough answers to be fair.
 */

export type GridClub = { id: string; label: string; code: string };

export type GridPuzzle = {
  id: string;
  rows: GridClub[];
  cols: GridClub[];
  /** Career ids that answer each cell, row-major, 0–8. */
  answers: string[][];
};

/** Fewest answers a cell may have. */
export const minAnswersPerCell = 3;

/** Clubs with at least this many players on record take part in grids. */
const minClubPlayers = 6;

const careers: readonly BingoCareer[] = bingoCareers;
const careerById = new Map(careers.map((career) => [career.playerId, career]));

function clubsOf(career: BingoCareer): Set<string> {
  return new Set(career.clubHistory.map((spell) => spell.clubId));
}

const careerClubs = new Map(careers.map((career) => [career.playerId, clubsOf(career)]));

/** Clubs eligible for grids, most-represented first, in a stable order. */
export const gridClubIds: string[] = (() => {
  const counts = new Map<string, number>();
  for (const clubs of careerClubs.values()) for (const id of clubs) counts.set(id, (counts.get(id) ?? 0) + 1);
  return [...counts]
    .filter(([, count]) => count >= minClubPlayers)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([id]) => id);
})();

export function answersFor(rowClub: string, colClub: string): string[] {
  const out: string[] = [];
  for (const [id, clubs] of careerClubs) if (clubs.has(rowClub) && clubs.has(colClub)) out.push(id);
  return out.sort();
}

function club(id: string): GridClub {
  return { id, label: clubLabel(id), code: clubCode(id) };
}

/** Shared-player counts between eligible clubs, computed once. */
let pairCounts: Map<string, number> | null = null;
function pairCount(a: string, b: string): number {
  if (!pairCounts) {
    pairCounts = new Map();
    for (const x of gridClubIds) for (const y of gridClubIds) if (x < y) pairCounts.set(`${x}|${y}`, answersFor(x, y).length);
  }
  return pairCounts.get(a < b ? `${a}|${b}` : `${b}|${a}`) ?? 0;
}

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items];
  for (let index = out.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [out[index], out[swap]] = [out[swap], out[index]];
  }
  return out;
}

/**
 * A fair grid from a seed: six distinct clubs whose nine pairings all have at
 * least `minAnswersPerCell` answers. Deterministic for a given seed.
 *
 * Rows first, then columns drawn only from clubs that pair well with all
 * three rows, so the search never wastes time on grids that cannot work.
 */
export function gridFromSeed(seed: string): GridPuzzle | null {
  const random = seededRandom(seed);
  for (let attempt = 0; attempt < 400; attempt += 1) {
    const rows = shuffled(gridClubIds, random).slice(0, 3);
    const candidates = gridClubIds.filter(
      (id) => !rows.includes(id) && rows.every((row) => pairCount(row, id) >= minAnswersPerCell),
    );
    if (candidates.length < 3) continue;
    const cols = shuffled(candidates, random).slice(0, 3);
    const answers = rows.flatMap((row) => cols.map((col) => answersFor(row, col)));
    return { id: seed, rows: rows.map(club), cols: cols.map(club), answers };
  }
  return null;
}

/** Today's grid: the same for everyone on the day. */
export function dailyGrid(dayKey: string): GridPuzzle | null {
  return gridFromSeed(`grid:v1:football:${dayIndexFor(dayKey)}`);
}

export function isValidAnswer(puzzle: GridPuzzle, cell: number, careerId: string): boolean {
  return puzzle.answers[cell]?.includes(careerId) ?? false;
}

export function careerName(careerId: string): string {
  return careerById.get(careerId)?.name ?? careerId;
}

export function careerShortName(careerId: string): string {
  return careerById.get(careerId)?.shortName ?? careerName(careerId);
}

/** Every player a guess can name, for the search list. */
export const gridSearchPool: { id: string; name: string }[] = careers
  .map((career) => ({ id: career.playerId, name: career.name }))
  .sort((a, b) => a.name.localeCompare(b.name));

/* ---- Tic-tac-toe ------------------------------------------------------------ */

export const winningLines: readonly [number, number, number][] = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

export type Mark = "X" | "O";

export function winnerOf(marks: (Mark | null)[]): Mark | null {
  for (const [a, b, c] of winningLines) {
    if (marks[a] && marks[a] === marks[b] && marks[a] === marks[c]) return marks[a];
  }
  return null;
}

/**
 * The computer's cell: win if it can, block if it must, then centre, corners,
 * edges. Only cells that still have an unused answer are considered.
 */
export function cpuCell(marks: (Mark | null)[], playable: (cell: number) => boolean, me: Mark = "O"): number | null {
  const them: Mark = me === "X" ? "O" : "X";
  const open = marks.map((mark, cell) => (mark === null && playable(cell) ? cell : -1)).filter((cell) => cell >= 0);
  if (open.length === 0) return null;
  const completes = (mark: Mark) =>
    open.find((cell) => {
      const next = [...marks];
      next[cell] = mark;
      return winnerOf(next) === mark;
    });
  return completes(me) ?? completes(them) ?? [4, 0, 2, 6, 8, 1, 3, 5, 7].find((cell) => open.includes(cell)) ?? null;
}

import { bingoCareers } from "../../football-bingo/data/careers";
import { clubLabel } from "../../football-bingo/data/clubs";
import { dayIndexFor } from "../../daily/day";
import { seededRandom } from "../../daily/seeded";
import { gridClubIds } from "../../grid/engine/grid";

/**
 * Football Connections: sixteen players, four hidden clubs. Find the four
 * players who share each club.
 *
 * Built from the same senior-club record as the Grid and Bingo. A puzzle is
 * only dealt when every player played for exactly one of its four clubs, so
 * each group has one answer and no player could belong to two.
 */

export type ConnectionGroup = {
  clubId: string;
  label: string;
  playerIds: string[];
  /** 0 = easiest (most-represented club) to 3 = hardest. */
  level: 0 | 1 | 2 | 3;
};

export type ConnectionsPuzzle = {
  id: string;
  groups: ConnectionGroup[];
  /** All sixteen player ids in their dealt order. */
  tiles: string[];
};

const careerClubs = new Map(
  bingoCareers.map((career) => [career.playerId, new Set(career.clubHistory.map((spell) => spell.clubId))]),
);
const names = new Map(bingoCareers.map((career) => [career.playerId, career.name]));

export function playerName(id: string): string {
  return names.get(id) ?? id;
}

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items];
  for (let index = out.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [out[index], out[swap]] = [out[swap], out[index]];
  }
  return out;
}

const clubSize = new Map(gridClubIds.map((id) => [id, [...careerClubs.values()].filter((clubs) => clubs.has(id)).length]));

export function connectionsFromSeed(seed: string): ConnectionsPuzzle | null {
  const random = seededRandom(seed);
  for (let attempt = 0; attempt < 400; attempt += 1) {
    const clubs = shuffled(gridClubIds, random).slice(0, 4);
    const groups: ConnectionGroup[] = [];
    for (const clubId of clubs) {
      const others = clubs.filter((other) => other !== clubId);
      // Played for this club and none of the other three.
      const eligible = [...careerClubs]
        .filter(([, played]) => played.has(clubId) && others.every((other) => !played.has(other)))
        .map(([id]) => id)
        .sort();
      if (eligible.length < 4) break;
      groups.push({ clubId, label: clubLabel(clubId), playerIds: shuffled(eligible, random).slice(0, 4), level: 0 });
    }
    if (groups.length !== 4) continue;
    // The best-known clubs are the easiest groups.
    const ranked = [...groups].sort((a, b) => (clubSize.get(b.clubId) ?? 0) - (clubSize.get(a.clubId) ?? 0));
    ranked.forEach((group, index) => (group.level = index as 0 | 1 | 2 | 3));
    return { id: seed, groups: ranked, tiles: shuffled(ranked.flatMap((group) => group.playerIds), random) };
  }
  return null;
}

export function dailyConnections(dayKey: string): ConnectionsPuzzle | null {
  return connectionsFromSeed(`connections:v1:football:${dayIndexFor(dayKey)}`);
}

/** The group four picks complete, if any, and how close the best group came. */
export function judge(puzzle: ConnectionsPuzzle, picks: string[]): { group: ConnectionGroup | null; bestOverlap: number } {
  let bestOverlap = 0;
  for (const group of puzzle.groups) {
    const overlap = picks.filter((id) => group.playerIds.includes(id)).length;
    if (overlap === 4) return { group, bestOverlap: 4 };
    bestOverlap = Math.max(bestOverlap, overlap);
  }
  return { group: null, bestOverlap };
}

export function groupOf(puzzle: ConnectionsPuzzle, playerId: string): ConnectionGroup | undefined {
  return puzzle.groups.find((group) => group.playerIds.includes(playerId));
}

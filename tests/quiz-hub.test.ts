import test from "node:test";
import assert from "node:assert/strict";

import { dailyNumberFor, dayIndexFor } from "../src/features/games/daily/day";
import { dailySlice, seededPermutation } from "../src/features/games/daily/seeded";
import { shareTextFor } from "../src/features/games/daily/share";
import { answerXp, dailyQuizQuestions } from "../src/features/games/daily-quiz/engine/pick";
import { entryCostFor, starRewardsFor } from "../src/features/games/quiz/state/ladder";
import { entryCost, starCoinRewards } from "../src/features/games/quiz/constants";
import type { QuizMode, TriviaQuestion } from "../src/features/games/quiz/types";
import { dailyGamesFor, gameEntryFor, gameRegistry, playableGameHrefs, quizPathsGameFor, sportGameDecks } from "../src/mocks/games";
import { sportOrder } from "../src/domain/sports";

function pool(mode: QuizMode, size = 500): TriviaQuestion[] {
  return Array.from({ length: size }, (_, index) => ({
    id: `football_${mode}_q${String(index + 1).padStart(3, "0")}`,
    sport: "football",
    mode,
    prompt: `Q${index}`,
    options: ["a", "b", "c", "d"],
    correctIndex: 0,
  }));
}

const pools = { easy: pool("easy"), medium: pool("medium"), hard: pool("hard") };

test("daily numbers count local days from the epoch", () => {
  assert.equal(dailyNumberFor("2026-01-01"), 1);
  assert.equal(dailyNumberFor("2026-01-02"), 2);
  assert.equal(dayIndexFor("2026-11-11"), 314);
  // Across the March daylight-saving change the count still steps by one.
  assert.equal(dayIndexFor("2026-03-30") - dayIndexFor("2026-03-29"), 1);
});

test("seeded permutation is deterministic and a true permutation", () => {
  const a = seededPermutation(500, "seed");
  assert.deepEqual(a, seededPermutation(500, "seed"));
  assert.notDeepEqual(a, seededPermutation(500, "other"));
  assert.deepEqual([...a].sort((x, y) => x - y), Array.from({ length: 500 }, (_, i) => i));
});

test("daily quiz deals the same five questions for a day, in easy-medium-hard order", () => {
  const first = dailyQuizQuestions("football", "2026-11-11", pools);
  assert.equal(first.length, 5);
  assert.deepEqual(first.map((q) => q.id), dailyQuizQuestions("football", "2026-11-11", pools).map((q) => q.id));
  assert.deepEqual(first.map((q) => q.mode), ["easy", "easy", "medium", "medium", "hard"]);
  assert.notDeepEqual(first.map((q) => q.id), dailyQuizQuestions("football", "2026-11-12", pools).map((q) => q.id));
  // Each sport walks its own order.
  assert.notDeepEqual(
    dailyQuizQuestions("football", "2026-11-11", pools).map((q) => q.prompt),
    dailyQuizQuestions("cricket", "2026-11-11", pools).map((q) => q.prompt),
  );
});

test("no daily question repeats until its pool is exhausted (250 days of easy)", () => {
  const seen = new Set<string>();
  for (let day = 0; day < 250; day += 1) {
    for (const index of dailySlice(500, "daily-quiz:v1:football:easy", day, 2)) {
      const key = String(index);
      assert.ok(!seen.has(key), `repeat on day ${day}`);
      seen.add(key);
    }
  }
  assert.equal(seen.size, 500);
});

test("answer XP pays the mode rate plus a speed bonus inside five seconds", () => {
  const [easy] = pools.easy;
  const [hard] = pools.hard;
  assert.equal(answerXp(easy, true, 3), 2);
  assert.equal(answerXp(easy, true, 9), 1);
  assert.equal(answerXp(hard, true, 9), 4);
  assert.equal(answerXp(hard, false, 1), 0);
});

test("first play of a set is free, replays cost the entry fee", () => {
  assert.equal(entryCostFor({ completed: false, bestCorrect: 0, attempts: 0 }), 0);
  assert.equal(entryCostFor({ completed: true, bestCorrect: 4, attempts: 1 }), entryCost);
});

test("stars pay once each, by star index, with stable ids", () => {
  const first = starRewardsFor("football:easy:1", { newlyCleared: true, stars: 2, starsGained: 2, bestBefore: 0 });
  assert.deepEqual(first.map((r) => [r.star, r.coins]), [[1, starCoinRewards[0]], [2, starCoinRewards[1]]]);
  const later = starRewardsFor("football:easy:1", { newlyCleared: false, stars: 3, starsGained: 1, bestBefore: 8 });
  assert.deepEqual(later.map((r) => r.id), ["quiz-star:football:easy:1:3"]);
  assert.deepEqual(starRewardsFor("football:easy:1", { newlyCleared: false, stars: 2, starsGained: 0, bestBefore: 8 }), []);
});

test("share text is game, sport, number, score, then squares", () => {
  const text = shareTextFor({ game: "Daily Quiz", sport: "football", dailyNumber: 315, score: "4/5", steps: [true, true, false, true, true], detail: "⏱ 31s" });
  assert.equal(text, "StatOz Daily Quiz ⚽ #315 4/5\n🟩🟩🟥🟩🟩\n⏱ 31s");
});

test("every sport has a daily quiz and a quiz path; hidden games have no tile or route", () => {
  for (const sport of sportOrder) {
    assert.ok(dailyGamesFor(sport).some((id) => gameRegistry[id].format === "daily-quiz"), `${sport} daily quiz`);
    assert.ok(quizPathsGameFor(sport), `${sport} quiz path`);
    for (const id of sportGameDecks[sport]) assert.notEqual(gameRegistry[id].status, "hidden");
  }
  assert.equal(gameEntryFor("guess-driver"), undefined);
  assert.equal(gameEntryFor("tennis-guess-winner"), undefined);
  assert.ok(!playableGameHrefs().includes("/play/guess-driver"));
  assert.ok(playableGameHrefs().includes("/play/daily-quiz/tennis"));
});

test("every daily is playable without an account; quiz paths are not", () => {
  for (const sport of sportOrder) {
    for (const id of dailyGamesFor(sport)) assert.equal(gameRegistry[id].guestPlayable, true, id);
    const paths = quizPathsGameFor(sport)!;
    assert.notEqual(gameRegistry[paths].guestPlayable, true);
  }
});

/* ---- Who Are Ya ------------------------------------------------------------ */

import { attributeSpecs, poolFor, whoAreYaSports } from "../src/features/games/who-are-ya/engine/pool";
import { compareGuess } from "../src/features/games/who-are-ya/engine/compare";
import { mysteryFor } from "../src/features/games/who-are-ya/engine/daily";
import type { WhoAthlete } from "../src/features/games/who-are-ya/engine/pool";

function athlete(values: Record<string, string | number>, clubs: string[] = []): WhoAthlete {
  return { id: JSON.stringify(values), name: "x", values, clubs };
}

test("who are ya pools come only from players with a card and a career route", () => {
  for (const sport of whoAreYaSports) {
    const pool = poolFor(sport);
    assert.ok(pool.length >= 25, `${sport} pool ${pool.length}`);
    for (const player of pool) {
      for (const spec of attributeSpecs[sport]) assert.notEqual(player.values[spec.key], undefined, `${player.name} ${spec.key}`);
    }
  }
});

test("who are ya deals one mystery per sport per day, and it is in the pool", () => {
  for (const sport of whoAreYaSports) {
    const today = mysteryFor(sport, "2026-11-11");
    assert.ok(today && poolFor(sport).includes(today));
    assert.equal(mysteryFor(sport, "2026-11-11")?.id, today?.id);
  }
  // No repeat until the pool is used up.
  const seen = new Set<string>();
  const size = poolFor("football").length;
  for (let day = 0; day < size; day += 1) {
    const date = new Date(2026, 0, 1 + day);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    seen.add(mysteryFor("football", key)!.id);
  }
  assert.equal(seen.size, size);
});

test("who are ya clues: exact, near by group, overlap, past club and number range", () => {
  const specs = attributeSpecs.football;
  const target = athlete({ nation: "ARG", position: "RW/CAM", club: "Inter Miami", debut: 2004, clubs: 3, ovr: 92 }, ["Barcelona", "Paris SG", "Inter Miami"]);
  const guess = athlete({ nation: "BRA", position: "CAM", club: "Barcelona", debut: 2006, clubs: 6, ovr: 92 });
  const tiles = Object.fromEntries(compareGuess(specs, guess, target).map((tile) => [tile.key, tile]));
  assert.equal(tiles.nation.state, "near"); // both South America
  assert.equal(tiles.position.state, "near"); // shares CAM
  assert.equal(tiles.club.state, "near"); // the mystery player also played for Barcelona
  assert.deepEqual([tiles.debut.state, tiles.debut.arrow], ["near", "down"]); // within 2, theirs is earlier
  assert.deepEqual([tiles.clubs.state, tiles.clubs.arrow], ["miss", "down"]);
  assert.equal(tiles.ovr.state, "hit");
  const far = athlete({ nation: "ENG", position: "ST", club: "Chelsea", debut: 2015, clubs: 3, ovr: 80 });
  const farTiles = Object.fromEntries(compareGuess(specs, far, target).map((tile) => [tile.key, tile]));
  assert.equal(farTiles.nation.state, "miss");
  assert.equal(farTiles.club.state, "miss");
  assert.equal(farTiles.clubs.state, "hit");
  assert.deepEqual([farTiles.ovr.state, farTiles.ovr.arrow], ["miss", "up"]);
  // Basketball: same conference is near.
  const east = Object.fromEntries(compareGuess(attributeSpecs.basketball, athlete({ team: "ATL", position: "PG", debut: 2018, clubs: 1, ovr: 90 }), athlete({ team: "BOS", position: "SF", debut: 2017, clubs: 1, ovr: 94 })).map((t) => [t.key, t]));
  assert.equal(east.team.state, "near");
});

/* ---- Football Grid --------------------------------------------------------- */

import { cpuCell, dailyGrid, minAnswersPerCell, winnerOf } from "../src/features/games/grid/engine/grid";

test("a year of daily grids: always dealt, six distinct clubs, every cell fair", () => {
  for (let day = 0; day < 365; day += 1) {
    const date = new Date(2026, 0, 1 + day);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const grid = dailyGrid(key);
    assert.ok(grid, `no grid for ${key}`);
    assert.equal(new Set([...grid.rows, ...grid.cols].map((club) => club.id)).size, 6);
    for (const answers of grid.answers) assert.ok(answers.length >= minAnswersPerCell);
    assert.deepEqual(dailyGrid(key)?.answers, grid.answers);
  }
});

test("grid tic-tac-toe: wins are detected and the computer wins or blocks first", () => {
  assert.equal(winnerOf(["X", "X", "X", null, null, null, null, null, null]), "X");
  assert.equal(winnerOf(["O", null, null, null, "O", null, null, null, "O"]), "O");
  assert.equal(winnerOf(["X", "O", "X", null, null, null, null, null, null]), null);
  const all = () => true;
  // O can complete the middle row.
  assert.equal(cpuCell([null, null, null, "O", "O", null, "X", "X", null], all, "O"), 5);
  // Nothing to win: block X's top row.
  assert.equal(cpuCell(["X", "X", null, null, "O", null, null, null, null], all, "O"), 2);
  // Otherwise the centre, and never a cell with no answers left.
  assert.equal(cpuCell(Array(9).fill(null), all, "O"), 4);
  assert.equal(cpuCell(Array(9).fill(null), (cell) => cell !== 4, "O"), 0);
});

/* ---- Higher or Lower and Connections ---------------------------------------- */

import { chainFromSeed, dailyChain, isRightCall, poolFor as ratingPool } from "../src/features/games/higher-lower/engine/chain";
import { dailyRounds } from "../src/features/games/higher-lower/constants";
import { dailyConnections, judge } from "../src/features/games/connections/engine/connections";

test("higher or lower: every sport deals a full daily chain with no tied neighbours", () => {
  for (const sport of sportOrder) {
    assert.ok(ratingPool(sport).length >= 50, `${sport} pool`);
    const chain = dailyChain(sport, "2026-11-11");
    assert.equal(chain.length, dailyRounds + 1);
    assert.equal(new Set(chain.map((card) => card.id)).size, chain.length);
    for (let index = 1; index < chain.length; index += 1) assert.notEqual(chain[index].rating, chain[index - 1].rating);
    assert.deepEqual(dailyChain(sport, "2026-11-11").map((card) => card.id), chain.map((card) => card.id));
  }
  const [a, b] = chainFromSeed("football", "x", 2);
  assert.equal(isRightCall(a, b, b.rating > a.rating ? "higher" : "lower"), true);
  assert.equal(isRightCall(a, b, b.rating > a.rating ? "lower" : "higher"), false);
});

test("connections: a year of puzzles, four groups of four, each player in exactly one group", () => {
  for (let day = 0; day < 365; day += 1) {
    const date = new Date(2026, 0, 1 + day);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const puzzle = dailyConnections(key);
    assert.ok(puzzle, `no puzzle for ${key}`);
    assert.equal(puzzle.groups.length, 4);
    assert.equal(new Set(puzzle.tiles).size, 16);
    assert.deepEqual(puzzle.groups.map((group) => group.level), [0, 1, 2, 3]);
    for (const group of puzzle.groups) assert.equal(judge(puzzle, group.playerIds).group?.clubId, group.clubId);
  }
  const puzzle = dailyConnections("2026-11-11")!;
  const [first, second] = puzzle.groups;
  assert.deepEqual(judge(puzzle, [...first.playerIds.slice(0, 3), second.playerIds[0]]), { group: null, bestOverlap: 3 });
});

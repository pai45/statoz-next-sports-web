import test from "node:test";
import assert from "node:assert/strict";

import { leaderboardCountdown, leaderboardWindow, windowRange } from "../src/features/leaderboard/periods";
import { rankByScore, scoreFor, searchEntries } from "../src/features/leaderboard/scoring";
import {
  boardContext,
  boardTitle,
  leaderboardHref,
  normalizeSelection,
  parseLeaderboardSelection,
  searchBoardSelection,
} from "../src/features/leaderboard/selection";
import { leaderboardLeagues } from "../src/features/leaderboard/leagues";
import { sportGameDecks } from "../src/mocks/games";
import { rivalRoster } from "../src/mocks/leaderboard";

test("an empty or unknown URL opens the football Premier League weekly board", () => {
  const selection = parseLeaderboardSelection(new URLSearchParams("sport=darts&type=bogus&scope=forever&league=nope&mode=nope"));
  assert.deepEqual(selection, {
    type: "matches",
    sport: "football",
    league: "epl",
    mode: sportGameDecks.football[0],
    board: "players",
    scope: "weekly",
  });
});

test("a board's URL reads back as the same board", () => {
  const selection = normalizeSelection({ type: "games", sport: "cricket", league: "bbl", mode: sportGameDecks.cricket[1], board: "teams", scope: "allTime" });
  const href = leaderboardHref(selection);
  assert.ok(href.startsWith("/leaderboard?"));
  assert.deepEqual(parseLeaderboardSelection(new URLSearchParams(href.split("?")[1])), selection);
  assert.ok(leaderboardHref(selection, true).startsWith("/leaderboard/search?"));
});

test("changing sport keeps league and game valid for that sport", () => {
  const moved = normalizeSelection({ ...parseLeaderboardSelection(new URLSearchParams()), sport: "tennis" });
  assert.equal(moved.league, leaderboardLeagues.tennis[0].id);
  assert.ok(sportGameDecks.tennis.includes(moved.mode));
});

test("the search page reads an old returnTo link only when it points at the leaderboard", () => {
  const legacy = new URLSearchParams({ returnTo: "/leaderboard?type=matches&sport=basketball&league=wnba&scope=season" });
  assert.equal(searchBoardSelection(legacy).league, "wnba");
  assert.equal(searchBoardSelection(legacy).scope, "season");
  const foreign = new URLSearchParams({ returnTo: "https://example.com/leaderboard?sport=tennis" });
  assert.equal(searchBoardSelection(foreign).sport, "football");
});

test("boards are named by league or game, under their sport", () => {
  const selection = parseLeaderboardSelection(new URLSearchParams("sport=motorsport&league=f1"));
  assert.equal(boardTitle(selection), "FORMULA 1");
  assert.equal(boardContext(selection), "MOTORSPORT · MATCHES");
  assert.match(boardContext({ ...selection, type: "games" }), /· QUIZ$/);
});

test("weekly boards run Monday to Monday in UTC; seasons are calendar quarters", () => {
  const wednesday = Date.UTC(2026, 10, 11, 15, 30);
  const week = leaderboardWindow("weekly", wednesday);
  assert.equal(week.start, Date.UTC(2026, 10, 9));
  assert.equal(week.end, Date.UTC(2026, 10, 16));
  assert.match(windowRange(week)!, /9 Nov.*15 Nov 2026/);

  const season = leaderboardWindow("season", wednesday);
  assert.equal(season.start, Date.UTC(2026, 9, 1));
  assert.equal(season.end, Date.UTC(2027, 0, 1));
  assert.equal(season.label, "2026 Season 4");
  assert.match(windowRange(season)!, /1 Oct.*31 Dec 2026/);

  const allTime = leaderboardWindow("allTime", wednesday);
  assert.equal(allTime.end, null);
  assert.equal(windowRange(allTime), null);
});

test("the countdown shows days and hours, then hours and minutes", () => {
  const now = Date.UTC(2026, 10, 11, 18, 0);
  assert.equal(leaderboardCountdown(Date.UTC(2026, 10, 16), now), "4d 6h");
  assert.equal(leaderboardCountdown(now + 90 * 60_000, now), "1h 30m");
  assert.equal(leaderboardCountdown(now - 1, now), "0h 0m");
});

test("boards rank on the score they show, so scores always read top-down", () => {
  for (const scope of ["weekly", "season", "allTime"] as const) {
    const ranked = rankByScore(rivalRoster.map((seed) => ({ name: seed.name, score: scoreFor("matches", seed.base, scope, "football-quiz", `epl:${seed.name}`) })));
    ranked.forEach((entry, index) => {
      assert.equal(entry.rank, index + 1);
      if (index > 0) assert.ok(ranked[index - 1].score >= entry.score, `${scope}: rank ${index} out of order`);
    });
  }
  const tied = rankByScore([{ name: "b", score: 5 }, { name: "a", score: 5 }]);
  assert.deepEqual(tied.map((entry) => entry.name), ["a", "b"]);
});

test("a player with no XP scores zero, and no score is negative", () => {
  for (const league of ["epl", "ipl", "nba", "f1", "atp"]) {
    assert.equal(scoreFor("matches", 0, "weekly", "football-quiz", `${league}:PLAYER ONE`), 0);
    assert.ok(scoreFor("matches", 40, "weekly", "football-quiz", `${league}:PLAYER ONE`) >= 0);
  }
  assert.equal(scoreFor("games", 0, "season", sportGameDecks.football[0], "epl"), 0);
});

test("search needs two characters and matches every word", () => {
  const entries = [{ name: "NeoStrike" }, { name: "Echo Zero" }, { name: "Zenith" }];
  assert.deepEqual(searchEntries(entries, "n"), []);
  assert.deepEqual(searchEntries(entries, "  NEO ").map((entry) => entry.name), ["NeoStrike"]);
  assert.deepEqual(searchEntries(entries, "zero echo").map((entry) => entry.name), ["Echo Zero"]);
});

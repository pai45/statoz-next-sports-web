import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { comparisonShares, matchTabFromHash, statText, tennisSetRows, traceIndexForKey } from "../src/features/matches/stats-presentation";
import { MatchScoreboard } from "../src/features/matches/components/match-scoreboard";
import { StatComparisonRow } from "../src/features/matches/components/match-stats-shell";
import { MatchTraceChart } from "../src/features/matches/components/match-trace-chart";
import { sportFixtures } from "../src/mocks/matches/catalog";
import { matchDetailFor } from "../src/mocks/matches/details";
import type { Sport } from "../src/domain/sports";

test("comparisons preserve zero and ties without assigning an advantage", () => {
  assert.deepEqual(comparisonShares(0, 0), {home: 0, away: 0});
  assert.deepEqual(comparisonShares(5, 5), {home: .5, away: .5});
  assert.deepEqual(comparisonShares(0, 10), {home: 0, away: 1});
  assert.equal(comparisonShares(undefined, 2), null);
  assert.equal(comparisonShares(NaN, 0), null);
  assert.equal(statText(0), "0");
  assert.equal(statText(undefined), "—");
  assert.equal(statText(Infinity), "—");
});

test("fixture set scores take precedence over generic scoreboard rows", () => {
  const fallback = {scoreRows: [{label: "Set 1", home: "6", away: "4"}]};
  assert.deepEqual(tennisSetRows({tennisSets: [{homeScore: 0, awayScore: 1}]}, fallback), [{label: "Set 1", home: "0", away: "1"}]);
  assert.deepEqual(tennisSetRows({}, fallback), fallback.scoreRows);
  assert.deepEqual(tennisSetRows({}, {scoreRows: []}), []);
});

test("stats entry preserves the existing picks entry", () => {
  assert.equal(matchTabFromHash("#stats"), "stats");
  assert.equal(matchTabFromHash("#picks"), "picks");
  assert.equal(matchTabFromHash("#unknown"), null);
});

test("chart keyboard navigation supports endpoints and clamps its range", () => {
  assert.equal(traceIndexForKey("Home", 7, 10), 0);
  assert.equal(traceIndexForKey("End", 1, 10), 9);
  assert.equal(traceIndexForKey("ArrowRight", 9, 10), 9);
  assert.equal(traceIndexForKey("ArrowLeft", 0, 10), 0);
  assert.equal(traceIndexForKey("ArrowUp", 1, 10), 2);
  assert.equal(traceIndexForKey("Tab", 1, 10), null);
});

test("similar team colours and long labels retain both values and a patterned away bar", () => {
  const html = renderToStaticMarkup(<StatComparisonRow stat={{label: "A very long statistic label for both competitors", home: "0", away: "0", homeValue: 0, awayValue: 0}} homeColor="#123456" awayColor="#123456" />);
  assert.ok(html.includes("data-away"));
  assert.ok(html.includes("width:0%"));
  assert.ok(html.toLowerCase().includes("a very long statistic label"));
  assert.ok(!html.includes("NaN"));
});

for (const sport of ["football", "cricket", "basketball", "tennis", "motorsport"] as Sport[]) {
  test(`${sport} renders the shared report with accessible section controls`, () => {
    const fixture = sportFixtures.find(match => match.sport === sport && match.status !== "scheduled")!;
    assert.ok(fixture);
    const html = renderToStaticMarkup(<MatchScoreboard match={fixture} scoreboard={matchDetailFor(fixture).scoreboard} />);
    assert.ok(html.includes(`data-match-stats="${sport}"`));
    assert.ok(html.includes("Inside the match"));
    assert.ok(html.includes('role="tablist"'));
    assert.ok(html.includes('role="tabpanel"'));
    assert.ok(!html.includes("NaN"));
    if (sport === "tennis") assert.ok(!html.includes("STARTING FIVE"));
  });
  test(`${sport} renders each available fixture lifecycle without invalid figures`, () => {
    const statuses = new Set(sportFixtures.filter(match => match.sport === sport).map(match => match.status));
    for (const status of statuses) {
      const fixture = sportFixtures.find(match => match.sport === sport && match.status === status)!;
      const html = renderToStaticMarkup(<MatchScoreboard match={fixture} scoreboard={matchDetailFor(fixture).scoreboard} />);
      assert.ok(html.includes(`data-status="${status}"`));
      assert.ok(!html.includes("NaN"));
      if (status === "scheduled") assert.ok(!html.includes("TEAM CONTROL"));
    }
  });
}

test("scheduled reports never present generated performance figures", () => {
  const fixture = {...sportFixtures[0], status: "scheduled" as const};
  const html = renderToStaticMarkup(<MatchScoreboard match={fixture} scoreboard={matchDetailFor(fixture).scoreboard} />);
  assert.ok(html.includes("PRE-MATCH"));
  assert.ok(!html.includes("TEAM CONTROL"));
  assert.ok(!html.includes("RACE WINNER"));
});

test("an empty trace renders unavailable rather than a zero score", () => {
  const html = renderToStaticMarkup(<MatchTraceChart match={sportFixtures[0]} trace={{title: "Momentum", unit: "pressure", ticks: [], home: [], away: []}} />);
  assert.ok(html.toLowerCase().includes("chart unavailable"));
  assert.ok(!html.includes('role="slider"'));
});

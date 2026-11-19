import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { pickCardResult, predictionCardVerdicts, type PickMarket, type PickPosition, type UserPrediction } from "../src/domain/predictions";
import { matchSportOrder } from "../src/domain/sports";
import { selectFeaturedPicks } from "../src/features/matches/editorial-cycle";
import { teamForMarketOutcome } from "../src/features/matches/market-team";
import { MatchActivityStrip } from "../src/features/matches/components/card-participation";
import { summarizeMatchActivity } from "../src/features/matches/card-activity";
import { MarketOutcomeRow } from "../src/features/matches/components/market-outcome-row";
import { EditorialEventsPanel } from "../src/features/matches/components/editorial-events-panel";
import { EditorialMarketCard } from "../src/features/matches/components/editorial-market-card";
import { EditorialMission } from "../src/features/matches/components/editorial-mission";
import { QuizHubCard } from "../src/features/predictions/components/quiz-hub-card";
import { MatchPitchView } from "../src/features/matches/components/match-pitch-view";
import { selectFilteredMarkets, type PicksSnapshot } from "../src/features/picks/state/picks-store";
import { pickMarkets } from "../src/mocks/picks";
import { sportFixtures, quizzesForMatch } from "../src/mocks/matches";
import { matchDetailFor } from "../src/mocks/matches/details";

const cardFixture = sportFixtures.find(match => match.sport === "football" && match.status === "scheduled")!;
const market: PickMarket = { id: "test", matchId: cardFixture.id, sport: "football", type: "event", leagueLabel: "EPL", question: "Who scores next?", status: "upcoming", outcomes: [{ id: "cfc", label: "Chelsea", probabilityPercent: 56 }, { id: "new", label: "Newcastle", probabilityPercent: 44 }], volumeOz: 0, resolved: false };
const position: PickPosition = { id: "ticket", marketId: "test", marketQuestion: market.question, marketType: "event", leagueLabel: "EPL", outcomeId: "cfc", outcomeLabel: "Chelsea", stakeOz: 112, shareCount: 2, averageProbabilityPercent: 56, submittedAt: "2026-08-25T00:00:00Z", status: "pending", payoutOz: 0 };

function renderActivity(sample: PickMarket, positions: PickPosition[] = [position]) {
  return renderToStaticMarkup(<MatchActivityStrip activity={summarizeMatchActivity({ match: cardFixture, markets: [sample], positions, quizzes: [], predictions: [] })}/>);
}

test("trending selects seven distinct, supported markets and handles sparse catalogs", () => {
  const featured = selectFeaturedPicks(pickMarkets);
  assert.equal(featured.length, 7);
  assert.equal(new Set(featured.map(item => item.id)).size, 7);
  assert.ok(featured.every(item => item.sport !== "tennis"));
  assert.deepEqual(selectFeaturedPicks([]), []);
  assert.equal(selectFeaturedPicks([{ ...market, type: "match" }]).length, 1);
  assert.ok(!matchSportOrder.includes("tennis"));
});

test("all Pick filters exclude tennis, including all and closed states", () => {
  const snapshot: PicksSnapshot = { version: 1, hydrated: true, positions: [], typeFilter: "all", sportFilter: "all", leagueFilter: "all", statusFilter: "all", sort: "start" };
  for (const statusFilter of ["all", "open", "closed", "live", "settled", "voided"] as const) {
    const matches = selectFilteredMarkets({ ...snapshot, statusFilter });
    assert.ok(matches.length > 0);
    assert.ok(matches.every(item => item.sport !== "tennis"));
    if (["live", "settled", "voided"].includes(statusFilter)) assert.ok(matches.every(item => item.status === statusFilter));
  }
});

test("open, live and unresolved tickets show exposure and potential, never a loss", () => {
  for (const status of ["upcoming", "live", "closed", "unresolved"] as const) {
    const result = pickCardResult({ ...market, status }, position);
    assert.equal(result.resolved, false);
    assert.equal(result.potential, 200);
    const html = renderActivity({ ...market, status });
    assert.match(html, /112 Oz placed or entry paid/);
    assert.match(html, /200 Oz pending/);
    assert.doesNotMatch(html, /net profit or loss/);
  }
});

test("wins show net profit and payout before claim; losses show the stake lost", () => {
  const settled = { ...market, status: "settled" as const, resolvedOutcomeId: "cfc" };
  assert.equal(pickCardResult(settled, position).profit, 88);
  const win = renderActivity(settled, [{ ...position, status: "settleable" }]);
  assert.match(win, /1 correct, 0 wrong/);
  assert.match(win, /\+88 Oz/);
  const loss = renderActivity({ ...settled, resolvedOutcomeId: "new" });
  assert.match(loss, /0 correct, 1 wrong/);
  assert.match(loss, /−112 Oz/);
});

test("voids return the stake and missing winners remain unresolved", () => {
  const result = pickCardResult({ ...market, status: "voided" }, position);
  assert.equal(result.profit, 0);
  assert.equal(result.payout, 112);
  const html = renderActivity({ ...market, status: "voided" });
  assert.match(html, /112 Oz refunded/);
  assert.match(html, /112 Oz back/);
  assert.match(html, /0 correct, 0 wrong/);
  assert.equal(pickCardResult({ ...market, status: "settled" }, position).resolved, false);
  assert.equal(pickCardResult(market, { ...position, status: "won", payoutOz: 200 }).profit, 88);
});

test("team outcomes use their sport crest and team identity; binary outcomes keep text", () => {
  const football = teamForMarketOutcome(market, market.outcomes[0]);
  assert.equal(football?.crest, "shield");
  assert.match(football!.name, /Chelsea/);
  for (const sport of ["cricket", "basketball"] as const) {
    const sample = pickMarkets.find(item => item.sport === sport && item.type === "match")!;
    assert.equal(teamForMarketOutcome(sample, sample.outcomes[0])?.crest, sport === "cricket" ? "bats" : "roundel");
  }
  assert.equal(teamForMarketOutcome(market, { id: "yes", label: "Yes", probabilityPercent: 50 }), undefined);
  assert.equal(teamForMarketOutcome(market, { id: "draw", label: "Draw", probabilityPercent: 50 }), undefined);
  const html = renderToStaticMarkup(<MarketOutcomeRow market={{ ...market, status: "settled", resolvedOutcomeId: "cfc" }} outcome={market.outcomes[0]} />);
  assert.match(html, /data-crest="shield"/);
  assert.doesNotMatch(html, /Your pick|data-match-activity/);
  assert.match(html, /Winner/);
  assert.doesNotMatch(html, /<button/);
});

test("grouped event cards retain claim actions without displaying the match-only indicator", () => {
  const html = renderToStaticMarkup(<EditorialEventsPanel markets={[{ ...market, status: "settled", resolvedOutcomeId: "cfc" }]} positionsFor={() => [{ ...position, status: "settleable" }]} onClaim={() => {}} />);
  assert.doesNotMatch(html, /data-match-activity|Correct pick|88 Oz|Your picks/);
  assert.match(html, /<button[^>]*>Claim result/);
  assert.match(html, /Newcastle/);
});

test("match picks, events and futures render every lifecycle, with buying only while open", () => {
  for (const type of ["match", "event", "future"] as const) {
    for (const status of ["upcoming", "live", "closed", "unresolved", "settled", "voided"] as const) {
      const sample = { ...market, type, status, resolvedOutcomeId: status === "settled" ? "cfc" : undefined, voidReason: status === "voided" ? "Stakes refunded" : undefined };
      const html = renderToStaticMarkup(<EditorialMarketCard market={sample} positions={[position]} onPick={() => {}} />);
      assert.doesNotMatch(html, /data-match-activity|Your pick|held/);
      assert.match(html, /Chelsea/);
      assert.match(html, /Newcastle/);
      if (status === "upcoming" || status === "live") assert.match(html, /<button[^>]*aria-label="Pick Chelsea/);
      else assert.doesNotMatch(html, /<button/);
      if (status === "settled") assert.match(html, /Winner/);
      if (status === "voided") assert.match(html, /Stakes refunded/);
    }
  }
});

test("prediction verdicts distinguish right, wrong, void and unanswered without revealing locked answers", () => {
  const match = sportFixtures.find(item => item.sport === "football" && item.status === "finished")!;
  const template = quizzesForMatch(match)[0];
  const quiz = { ...template, questions: [
    { id: "right", text: "Right", type: "multipleChoice" as const, options: ["A", "B"], reward: 10, settledOptionIndex: 0 },
    { id: "wrong", text: "Wrong", type: "multipleChoice" as const, options: ["A", "B"], reward: 10, settledOptionIndex: 0 },
    { id: "void", text: "Void", type: "multipleChoice" as const, options: [], reward: 0, forcedVoid: true },
    { id: "empty", text: "Unanswered", type: "multipleChoice" as const, options: ["A", "B"], reward: 10, settledOptionIndex: 0 },
  ] };
  const entry: UserPrediction = { matchId: match.id, quizId: quiz.id, answers: { right: 0, wrong: 1 }, multipliersByQuestion: {}, submittedAt: match.kickoff, status: "locked", rewardEarned: 0, contestPrizeOz: 0 };
  assert.deepEqual(predictionCardVerdicts(quiz, entry), ["pending", "pending", "void", "unanswered"]);
  const settled = { ...entry, status: "settled" as const, rewardEarned: 10 };
  assert.deepEqual(predictionCardVerdicts(quiz, settled), ["correct", "wrong", "void", "unanswered"]);
  const html = renderToStaticMarkup(<MatchActivityStrip activity={summarizeMatchActivity({ match, markets: [], positions: [], quizzes: [quiz], predictions: [settled] })}/>);
  assert.match(html, /1 correct, 1 wrong/);
  assert.match(html, /data-verdict="correct"/);
  assert.match(html, /data-verdict="wrong"/);
});

test("locked predictions use one unboxed strip exclusively on the fixture card", () => {
  const quiz = quizzesForMatch(cardFixture)[0];
  const prediction: UserPrediction = { matchId: cardFixture.id, quizId: quiz.id, answers: { [quiz.questions[0].id]: 0 }, multipliersByQuestion: {}, submittedAt: cardFixture.kickoff, status: "locked", rewardEarned: 0, contestPrizeOz: 0 };
  const activity = summarizeMatchActivity({ match: cardFixture, markets: [], positions: [], quizzes: [quiz], predictions: [prediction] });
  const strip = renderToStaticMarkup(<MatchActivityStrip activity={activity}/>);
  assert.equal((strip.match(/data-match-activity/g) ?? []).length, 1);
  assert.match(strip, /Locked/);
  assert.doesNotMatch(strip, /<button|class="ticket"|class="prediction"|class="verdicts"|QUESTIONS|ANSWERS SEALED/);
  for (const html of [
    renderToStaticMarkup(<EditorialMission match={cardFixture} quiz={quiz} prediction={prediction}/>),
    renderToStaticMarkup(<QuizHubCard match={cardFixture} quiz={quiz} index={1} prediction={prediction} onOpen={() => {}} onBlocked={() => {}}/>),
  ]) assert.doesNotMatch(html, /data-match-activity|class="ticket"|class="prediction"/);
});

test("quiz launch cards omit the question, entry and prize tags while retaining their action and identity", () => {
  const quiz = quizzesForMatch(cardFixture).find(quiz => quiz.entryFee > 0)!;
  assert.ok(quiz);
  const now = Date.parse(cardFixture.kickoff) - 60_000;
  const html = renderToStaticMarkup(<QuizHubCard match={cardFixture} quiz={quiz} index={1} prediction={undefined} coins={1000} now={now} onOpen={() => {}} onBlocked={() => {}}/>);
  const text = html.replace(/<[^>]*>/g, "");
  assert.match(text, /Scoreline Quiz/);
  assert.match(text, /Start predicting/);
  assert.match(text, /XP/);
  assert.doesNotMatch(text, /QUESTIONS|OZ ENTRY|PRIZES|FREE ENTRY|ENTRY PAID/);
  assert.doesNotMatch(html, /hubDetails|hubDivider|chevronChip|contestChip|outcomeDots|hubTrack/);
  assert.match(html, /class="hubPlayPlate"/);
  assert.match(html, /data-crest="shield"/);
  assert.match(html, new RegExp(`Entry ${quiz.entryFee} Oz`));
  assert.equal((html.match(/<button/g) ?? []).length, 1);
  const blocked = renderToStaticMarkup(<QuizHubCard match={cardFixture} quiz={quiz} index={1} prediction={undefined} coins={0} now={now} onOpen={() => {}} onBlocked={() => {}}/>);
  assert.match(blocked, /hubBlocked/);
  assert.match(blocked, new RegExp(`Need ${quiz.entryFee} Oz to enter`));
});

test("one match strip aggregates outcomes and coins while ignoring unrelated tickets", () => {
  const secondMarket = { ...market, id: "second", status: "settled" as const, resolvedOutcomeId: "new" };
  const win = { ...market, status: "settled" as const, resolvedOutcomeId: "cfc" };
  const activity = summarizeMatchActivity({ match: cardFixture, markets: [win, secondMarket], positions: [position, { ...position, id: "loss", marketId: "second", stakeOz: 56, shareCount: 1 }, { ...position, id: "other", marketId: "unrelated" }], quizzes: [], predictions: [] })!;
  assert.equal(activity.correct, 1);
  assert.equal(activity.wrong, 1);
  assert.equal(activity.profitOz, 32);
  const html = renderToStaticMarkup(<MatchActivityStrip activity={activity}/>);
  assert.equal((html.match(/data-match-activity/g) ?? []).length, 1);
  assert.match(html, /\+32 Oz/);
  assert.equal(summarizeMatchActivity({ match: cardFixture, markets: [], positions: [], quizzes: [], predictions: [] }), null);
  assert.equal(renderToStaticMarkup(<MatchActivityStrip activity={null}/>), "");
});

test("pending returns never count opposing outcomes as simultaneous wins", () => {
  const opposite = { ...position, id: "opposite", outcomeId: "new", outcomeLabel: "Newcastle", stakeOz: 44, shareCount: 1 };
  const summary = (positions: PickPosition[]) => summarizeMatchActivity({ match: cardFixture, markets: [market], positions, quizzes: [], predictions: [] })!;
  assert.equal(summary([position, opposite]).pendingReturnOz, 200);
  assert.equal(summary([position, opposite]).pendingStakeOz, 156);
  assert.equal(summary([position, { ...position, id: "second-buy" }, opposite]).pendingReturnOz, 400);
});

test("lineups retain all starters once, formation and bench controls for both sports", () => {
  for (const sport of ["football", "basketball"] as const) {
    const match = sportFixtures.find(item => item.sport === sport && item.status === "finished")!;
    const detail = matchDetailFor(match)!;
    const html = renderToStaticMarkup(<MatchPitchView match={match} scoreboard={detail.scoreboard} />);
    assert.match(html, /Team sheet/);
    assert.match(html, /formation/);
    assert.match(html, /BENCH UNIT/);
    assert.equal((html.match(/class="playerNumber"/g) ?? []).length, detail.scoreboard.homeLineup.players.length);
  }
});

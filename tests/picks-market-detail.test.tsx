import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { PickMarket, PickOutcome, PickPosition } from "../src/domain/predictions/market";
import { createPickOrderSubmission, placementError, quotePickOrder } from "../src/features/picks/order";
import { chartOutcomes, historyForRange, initialOutcome, marketTimestamp, outcomeChartColor } from "../src/features/picks/market-detail-presentation";
import { PickOrderForm, type PickOrder } from "../src/features/picks/components/pick-order-form";

const punjab: PickOutcome = { id: "pbks", label: "Punjab", probabilityPercent: 44, color: "#ef3340" };
const bengaluru: PickOutcome = { id: "rcb", label: "Bengaluru", probabilityPercent: 56, color: "#d71920" };
const market: PickMarket = { id: "ipl_pjk_rcb_winner", sport: "cricket", leagueLabel: "IPL", question: "Punjab Kings vs RCB result", outcomes: [punjab, bengaluru], volumeOz: 67900, status: "live", resolved: false };
const input = { market, outcome: bengaluru, stakeOz: 112, balanceOz: 1000 };
const placed = { ok: true as const, position: {} as PickPosition };

test("two Bengaluru shares cost 112 Oz, pay 200 and earn 88 profit", () => {
  const quote = quotePickOrder(market, bengaluru, 112, 1000);
  assert.equal(quote.error, null);
  assert.equal(quote.shares, 2);
  assert.equal(quote.maxPayoutOz, 200);
  assert.equal(quote.profitOz, 88);
  assert.equal(quote.balanceAfter, 888);
});

test("invalid, fractional, over-balance and insufficient stakes cannot submit", () => {
  for (const stake of [0, -56, 57, 56.5, NaN, 1008]) assert.ok(quotePickOrder(market, bengaluru, stake, 1000).error);
  assert.match(quotePickOrder(market, bengaluru, 56, 40).error!, /Not enough/);
  assert.equal(quotePickOrder(market, punjab, 44, 44).balanceAfter, 0);
});

test("only upcoming and live markets accept orders", () => {
  for (const status of ["closed", "unresolved", "settled", "voided"] as const) {
    assert.match(quotePickOrder({ ...market, status }, bengaluru, 56, 1000).error!, /closed/);
  }
  assert.equal(quotePickOrder({ ...market, status: "upcoming" }, punjab, 44, 1000).error, null);
});

test("authentication denial never places a pick and permits retry after login", () => {
  const submission = createPickOrderSubmission();
  let writes = 0;
  const place = () => { writes++; return placed; };
  assert.deepEqual(submission.submit(input, { authorize: () => false, place }), {});
  assert.equal(writes, 0);
  assert.ok(submission.submit(input, { authorize: () => true, place }).success);
  assert.equal(writes, 1);
});

test("one confirmation cannot spend twice, including a reentrant submit", () => {
  const submission = createPickOrderSubmission();
  let writes = 0;
  const services = { authorize: () => true, place: () => { writes++; submission.submit(input, services); return placed; } };
  const result = submission.submit(input, services);
  assert.deepEqual(result.success, { outcomeLabel: "Bengaluru", stakeOz: 112, shares: 2, maxPayoutOz: 200 });
  submission.submit(input, services);
  assert.equal(writes, 1);
  submission.reset();
  submission.submit(input, services);
  assert.equal(writes, 2);
});

test("fresh balances and failed placement leave the order editable", () => {
  const submission = createPickOrderSubmission();
  let writes = 0;
  const services = { authorize: () => true, place: () => { writes++; return placed; } };
  assert.ok(submission.submit({ ...input, balanceOz: 10 }, services).error);
  assert.equal(writes, 0);
  assert.match(submission.submit(input, { authorize: () => true, place: () => ({ ok: false, reason: "insufficient" }) }).error!, /balance changed/);
  assert.ok(submission.submit(input, services).success);
  for (const reason of ["market", "outcome", "closed", "stake", "insufficient"] as const) assert.ok(placementError(reason));
});

test("held outcomes take precedence over the leader; identical team colors remain distinct", () => {
  assert.equal(initialOutcome(market, []).id, "rcb");
  assert.equal(initialOutcome(market, [{ outcomeId: "pbks" } as PickPosition]).id, "pbks");
  assert.notEqual(outcomeChartColor(market, "pbks"), outcomeChartColor(market, "rcb"));
  assert.equal(outcomeChartColor(market, "pbks"), outcomeChartColor({ ...market, outcomes: [{ ...punjab, probabilityPercent: 70 }, bengaluru] }, "pbks"));
});

test("a lower-ranked selection is always plotted with the two leading alternatives", () => {
  const extra = { id: "other", label: "Another outcome", probabilityPercent: 2 };
  const many = { ...market, outcomes: [...market.outcomes, { ...extra, id: "third", probabilityPercent: 20 }, extra] };
  assert.deepEqual(chartOutcomes(many, extra).map((outcome) => outcome.id), ["other", "rcb", "pbks"]);
});

test("history ranges sort by timestamp without padding sparse ranges with older prices", () => {
  const point = (at: string) => ({ at, percentsByOutcome: { rcb: 56, pbks: 44 } });
  const history = [point("2026-08-25T12:00:00Z"), point("invalid"), point("2026-08-17T12:00:00Z")];
  assert.equal(historyForRange(history, "All")[0].at, "2026-08-17T12:00:00Z");
  assert.equal(historyForRange(history, "Week").length, 1);
  assert.equal(historyForRange(history, "Day").length, 1);
  assert.deepEqual(historyForRange([], "Day"), []);
  assert.match(marketTimestamp("2026-08-25T16:30:00Z"), /25 Aug 2026.*22:00.*(?:IST|GMT\+5:30)/);
  assert.equal(marketTimestamp("invalid"), "Not available");
});

test("shared form labels stake, explains total payout, exposes validation and gates guests", () => {
  const order: PickOrder = { stakeOz: 112, setStakeOz() {}, phase: "idle", confirm() {}, quote: quotePickOrder(market, bengaluru, 112, 1000), error: null, balance: 1000, isAuthenticated: false, hydrating: false };
  const html = renderToStaticMarkup(<PickOrderForm outcome={bengaluru} order={order} />);
  assert.match(html, /<label for=/);
  assert.match(html, /Log in to confirm/);
  assert.match(html, /Maximum payout/);
  assert.match(html, /Potential profit/);
  assert.match(html, /Payout includes your stake/);
  const error = renderToStaticMarkup(<PickOrderForm outcome={bengaluru} order={{ ...order, error: "Your balance changed." }} />);
  assert.match(error, /role="alert"/);
  assert.match(error, /aria-invalid="true"/);
  const locked = renderToStaticMarkup(<PickOrderForm outcome={bengaluru} order={{ ...order, phase: "placed" }} />);
  assert.match(locked, /disabled="">Pick locked/);
});

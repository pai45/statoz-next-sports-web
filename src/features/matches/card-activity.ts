import type { SportMatch } from "@/domain/matches";
import { isQuizSettleable, pickCardResult, predictionCardVerdicts, type PickMarket, type PickPosition, type PredictionQuiz, type PredictionVerdict, type UserPrediction } from "@/domain/predictions";

export type MatchActivity = {
  status: "locked" | "saved" | "pending" | "placed" | "live" | "reveal" | null;
  correct: number;
  wrong: number;
  marks: PredictionVerdict[];
  hasSettledCoins: boolean;
  profitOz: number;
  refundOz: number;
  pendingReturnOz: number;
  pendingStakeOz: number;
};

/** One small match-level summary, regardless of how many tickets or quizzes it holds. */
export function summarizeMatchActivity({ match, markets, positions, quizzes, predictions }: {
  match: SportMatch; markets: PickMarket[]; positions: PickPosition[];
  quizzes: PredictionQuiz[]; predictions: UserPrediction[];
}): MatchActivity | null {
  const marketIndex = new Map(markets.filter(market => market.matchId === match.id).map(market => [market.id, market]));
  const quizIndex = new Map(quizzes.filter(quiz => quiz.matchId === match.id).map(quiz => [quiz.id, quiz]));
  const activity: MatchActivity = { status: null, correct: 0, wrong: 0, marks: [], hasSettledCoins: false, profitOz: 0, refundOz: 0, pendingReturnOz: 0, pendingStakeOz: 0 };
  const pendingByMarket = new Map<string, Map<string, number>>();
  let pending = false, live = false, unresolved = false, locked = false, saved = false, reveal = false;

  for (const position of positions) {
    const market = marketIndex.get(position.marketId);
    if (!market) continue;
    const result = pickCardResult(market, position);
    activity.marks.push(result.state === "won" ? "correct" : result.state === "lost" ? "wrong" : result.state === "void" ? "void" : "pending");
    if (result.state === "won") activity.correct += 1;
    if (result.state === "lost") activity.wrong += 1;
    if (result.state === "void") activity.refundOz += result.payout;
    else if (result.resolved) {
      activity.hasSettledCoins = true;
      activity.profitOz += result.profit;
    } else {
      pending = true;
      live ||= result.state === "live";
      unresolved ||= result.state === "unresolved";
      const outcomes = pendingByMarket.get(market.id) ?? new Map<string, number>();
      outcomes.set(position.outcomeId, (outcomes.get(position.outcomeId) ?? 0) + result.potential);
      pendingByMarket.set(market.id, outcomes);
      activity.pendingStakeOz += result.stake;
    }
  }

  // Opposing outcomes in one market cannot both win; show its best possible return.
  for (const outcomes of pendingByMarket.values()) activity.pendingReturnOz += Math.max(...outcomes.values());

  for (const prediction of predictions) {
    const quiz = prediction.matchId === match.id ? quizIndex.get(prediction.quizId) : undefined;
    if (!quiz) continue;
    const verdicts = predictionCardVerdicts(quiz, prediction);
    activity.marks.push(...verdicts);
    activity.correct += verdicts.filter(verdict => verdict === "correct").length;
    activity.wrong += verdicts.filter(verdict => verdict === "wrong").length;
    locked ||= prediction.status === "locked";
    saved ||= prediction.status === "open";
    reveal ||= match.status === "finished" && prediction.status !== "settled" && isQuizSettleable(quiz);
    if (quiz.entryFee > 0) {
      if (prediction.status === "settled") {
        activity.hasSettledCoins = true;
        activity.profitOz += prediction.contestPrizeOz - quiz.entryFee;
      } else activity.pendingStakeOz += quiz.entryFee;
    }
  }

  if (!activity.marks.length && !locked && !saved) return null;
  activity.status = reveal ? "reveal" : live || (locked && match.status === "live") ? "live" : locked ? "locked" : unresolved ? "pending" : pending ? "placed" : saved ? "saved" : null;
  return activity;
}

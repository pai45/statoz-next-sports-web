import { payoutForShares, positionIsFinal, type PickMarket, type PickPosition } from "./market";
import { settledAnswerFor, type PredictionQuiz, type UserPrediction } from "./quiz";

/** Display a known result before claim without crediting coins or mutating a ticket. */
export function pickCardResult(market: PickMarket, position: PickPosition) {
  const final = positionIsFinal(position);
  const refunded = position.status === "voided" || market.status === "voided";
  const knownWinner = market.status === "settled" && market.outcomes.some(outcome => outcome.id === market.resolvedOutcomeId);
  const resolved = final || knownWinner || refunded;
  const won = position.status === "won" || (!final && market.status === "settled" && market.resolvedOutcomeId === position.outcomeId);
  const payout = final ? position.payoutOz : refunded ? position.stakeOz : won ? payoutForShares(position.shareCount) : 0;
  const state = refunded ? "void" : resolved ? won ? "won" : "lost" : market.status === "live" ? "live" : market.status === "closed" || market.status === "unresolved" || market.status === "settled" ? "unresolved" : "open";
  return { state, resolved, payout, profit: payout - position.stakeOz, potential: payoutForShares(position.shareCount), stake: position.stakeOz };
}

export type PredictionVerdict = "correct" | "wrong" | "void" | "pending" | "unanswered";
export function predictionCardVerdicts(quiz: PredictionQuiz, prediction: UserPrediction): PredictionVerdict[] {
  return quiz.questions.map(question => {
    if (question.forcedVoid) return "void";
    const answer = prediction.answers[question.id];
    if (answer == null) return "unanswered";
    if (prediction.status !== "settled" || settledAnswerFor(question) == null) return "pending";
    return answer === settledAnswerFor(question) ? "correct" : "wrong";
  });
}

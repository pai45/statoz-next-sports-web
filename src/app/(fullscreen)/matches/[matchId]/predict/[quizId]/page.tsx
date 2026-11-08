import { notFound } from "next/navigation";

import { MatchPredictionScreen } from "@/features/predictions";
import {
  allMockMatchIds,
  matchById,
  quizForMatch,
  quizzesForMatch,
} from "@/mocks/matches";

export function generateStaticParams() {
  return allMockMatchIds.flatMap((matchId) => {
    const match = matchById(matchId);
    if (!match) return [];
    return quizzesForMatch(match).map((quiz) => ({ matchId, quizId: quiz.id }));
  });
}

export default async function MatchPredictionPage({
  params,
}: {
  params: Promise<{ matchId: string; quizId: string }>;
}) {
  const { matchId, quizId } = await params;
  const match = matchById(matchId);
  if (!match) notFound();
  const quiz = quizForMatch(match, quizId);
  if (!quiz) notFound();

  return <MatchPredictionScreen match={match} quiz={quiz} />;
}

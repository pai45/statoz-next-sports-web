import type { Metadata } from "next";

import { QuizHub } from "@/features/games/hub";

export const metadata: Metadata = {
  title: "Quiz",
  description: "Today's free daily sports quizzes and games, plus the full quiz paths for every sport.",
};

/** The ALL view: today's daily games across every sport. */
export default function QuizPage() {
  return <QuizHub sport={null} />;
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { sportModules, sportOrder, type Sport } from "@/domain/sports";
import { QuizHub } from "@/features/games/hub";

/**
 * One sport's page on the QUIZ tab. Every sport is known up front, so all five
 * prerender, which the static export needs; anything else is a 404.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return sportOrder.map((sport) => ({ sport }));
}

function resolve(sport: string): Sport | null {
  return sport in sportModules ? (sport as Sport) : null;
}

export async function generateMetadata({ params }: PageProps<"/quiz/[sport]">): Promise<Metadata> {
  const sport = resolve((await params).sport);
  if (!sport) return { title: "Quiz" };
  const label = sportModules[sport].label;
  return {
    title: `${label} quiz`,
    description: `Today's ${label.toLowerCase()} daily quiz and games, plus four quiz paths of fifty sets.`,
  };
}

export default async function SportQuizPage({ params }: PageProps<"/quiz/[sport]">) {
  const sport = resolve((await params).sport);
  if (!sport) notFound();
  return <QuizHub sport={sport} />;
}

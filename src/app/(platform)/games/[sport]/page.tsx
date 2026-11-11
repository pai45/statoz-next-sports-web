import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { sportModules, sportOrder, type Sport } from "@/domain/sports";
import { QuizHub } from "@/features/games/hub";

/**
 * The older address for a sport's games. It renders the same page as
 * `/quiz/<sport>` rather than redirecting, because the static export has no
 * server to send a redirect, and it points search engines at the new address.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return sportOrder.map((sport) => ({ sport }));
}

function resolve(sport: string): Sport | null {
  return sport in sportModules ? (sport as Sport) : null;
}

export async function generateMetadata({ params }: PageProps<"/games/[sport]">): Promise<Metadata> {
  const sport = resolve((await params).sport);
  if (!sport) return { title: "Games" };
  const label = sportModules[sport].label;
  return {
    title: `${label} quiz`,
    description: `Today's ${label.toLowerCase()} daily quiz and games.`,
    alternates: { canonical: `/quiz/${sport}` },
  };
}

export default async function SportGamesPage({ params }: PageProps<"/games/[sport]">) {
  const sport = resolve((await params).sport);
  if (!sport) notFound();
  return <QuizHub sport={sport} />;
}

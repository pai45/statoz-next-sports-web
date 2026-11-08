import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { sportModules, sportOrder, type Sport } from "@/domain/sports";
import { AdSlot } from "@/features/ads";
import { SportGameDeck, SportGamesHub } from "@/features/games";

/** Every sport is known up front, so all five decks prerender. */
export function generateStaticParams() {
  return sportOrder.map((sport) => ({ sport }));
}

function resolve(sport: string): Sport | null {
  return sport in sportModules ? (sport as Sport) : null;
}

export async function generateMetadata({
  params,
}: PageProps<"/games/[sport]">): Promise<Metadata> {
  const sport = resolve((await params).sport);
  if (!sport) return { title: "Games" };

  const label = sportModules[sport].label;
  return {
    title: `${label} games`,
    description: `Every StatOz game you can play on ${label.toLowerCase()}.`,
  };
}

export default async function SportGamesPage({ params }: PageProps<"/games/[sport]">) {
  const sport = resolve((await params).sport);
  if (!sport) notFound();

  return (
    <SportGamesHub sport={sport}>
      <AdSlot placement="games-catalog" />
      <SportGameDeck sport={sport} />
    </SportGamesHub>
  );
}

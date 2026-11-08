import { Suspense, type ReactNode } from "react";

import { sportOrder, type Sport } from "@/domain/sports";
import { GamesTrendingFeed, SportGameDeck } from "@/features/games";
import { TrendingFeed } from "@/features/matches";

import { HomeHub } from "./_components/home-hub";

/** Every sport's deck, rendered up front so the browse strip switches locally. */
const sportDecks = Object.fromEntries(
  sportOrder.map((sport) => [sport, <SportGameDeck key={sport} sport={sport} />]),
) as Record<Sport, ReactNode>;

export default function HomePage() {
  return (
    <Suspense fallback={<div className="flex-1 bg-background" />}>
      <HomeHub
        matchFeed={<TrendingFeed />}
        gamesFeed={<GamesTrendingFeed />}
        sportDecks={sportDecks}
      />
    </Suspense>
  );
}

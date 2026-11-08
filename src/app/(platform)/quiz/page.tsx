import { Suspense } from "react";
import { HomeHub } from "../_components/home-hub";
import { GamesTrendingFeed, SportGameDeck } from "@/features/games";
import { sportOrder, type Sport } from "@/domain/sports";
import type { ReactNode } from "react";
const sportDecks = Object.fromEntries(sportOrder.map(sport=>[sport,<SportGameDeck key={sport} sport={sport}/>])) as Record<Sport,ReactNode>;
export default function QuizPage(){return <Suspense><HomeHub mode="games" matchFeed={null} gamesFeed={<GamesTrendingFeed/>} sportDecks={sportDecks}/></Suspense>;}

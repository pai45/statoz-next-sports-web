"use client";

import { isGameEnabled } from "@/domain/demo-product";
import type { ComponentType } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";

import { accentVar } from "@statoz/design-system/web";
import { AuthBoundary } from "@/features/auth";
import { activeLoadout, isLoadoutComplete, useDecks } from "@/features/cards-decks";
import {
  claimPack,
  rollStarterPackFor,
  StarterPackReveal,
  useIsHydrated,
  useIsPackClaimed,
} from "@/features/packs";
import type { Sport } from "@/domain/sports";

import { HoopDuel } from "../basketball";
import { FinalOver } from "../final-over";
import { FootballBingo } from "../football-bingo";
import { FootballChess } from "../football-chess";
import { GrandPrix } from "../grand-prix";
import { GuessPlayer } from "../guess-player";
import { PenaltyShootout } from "../penalty-shootout";
import { PitchDuel } from "../pitch-duel";
import { SportQuiz } from "../quiz";
import { TennisRally } from "../tennis";
import { sportForGame, type GameEntry } from "@/mocks/games";
import type { GameId } from "../types";
import { GameLandingAdProvider } from "../shared/components/game-landing-ad";

import { GamePlaceholder } from "./game-placeholder";

export type GameLauncherProps = {
  game: GameId;
  entry: GameEntry;
};

/**
 * The games that exist. Anything absent falls through to the placeholder, which
 * says so plainly rather than 404ing — every tile in the app leads somewhere.
 */
const RetroFootball = dynamic(() => import("../retro-football/screen").then(m=>m.RetroFootball), {ssr:false,loading:()=> <div role="status" className="grid min-h-dvh place-content-center">LOADING RETRO FOOTBALL?</div>});
const RetroCircuit = dynamic(() => import("../retro-circuit/screen").then(m=>m.RetroCircuit), {ssr:false,loading:()=> <div role="status" className="grid min-h-dvh place-content-center">LOADING RETRO CIRCUIT…</div>});
const RetroInnings = dynamic(() => import("../retro-innings").then(m => m.RetroInnings), {
  ssr: false,
  loading: () => <div role="status" className="grid min-h-dvh place-content-center">LOADING RETRO INNINGS...</div>,
});
const renderers: Partial<Record<GameId, ComponentType<GameLauncherProps>>> = {
  "retro-hoops": dynamic(() => import("../retro-hoops").then(m=>m.RetroHoops), {ssr:false,loading:()=> <div role="status" className="grid min-h-dvh place-content-center">LOADING RETRO HOOPS…</div>}),
  "retro-innings": RetroInnings,
  "retro-circuit": RetroCircuit,
  "retro-football": RetroFootball,
  "penalty-shootout": PenaltyShootout,
  "pitch-duel": PitchDuel,
  "final-over": FinalOver,
  "football-chess": FootballChess,
  "football-bingo": FootballBingo,
  // One screen serves all three: the sport it was launched as picks the route
  // table, the pool it searches, and the archive it keys.
  "guess-player": GuessPlayer,
  "cricket-guess-player": GuessPlayer,
  "basketball-guess-player": GuessPlayer,
  "hoop-duel": HoopDuel,
  "grand-prix-dash": GrandPrix,
  "tennis-rally": TennisRally,
  // One screen serves all five: it reads its sport from the game it was
  // launched as, exactly as the ladder data is keyed.
  "football-quiz": SportQuiz,
  "cricket-quiz": SportQuiz,
  "basketball-quiz": SportQuiz,
  "tennis-quiz": SportQuiz,
  "motorsport-quiz": SportQuiz,
};

function GameSurface({ game, entry }: GameLauncherProps) {
  const Game = renderers[game] ?? GamePlaceholder;
  return <Game game={game} entry={entry} />;
}

/**
 * What happens when a player opens a game.
 *
 * A game that fields a deck hands over its sport's starter pack the first time
 * it is entered, and only then; everything else goes straight through. This is
 * Flutter's `_enter*GameFlow` — check the sport's flag, run the reveal, and
 * re-issue the launch once it clears — with the flag in browser storage rather
 * than a bloc.
 */
export function GameLauncher({ game, entry }: GameLauncherProps) {
  if (!isGameEnabled(game)) return <div role="status">This mode belongs to the other StatOz demo. <Link href="/">Return home</Link></div>;
  return (
    <AuthBoundary
      intent="play"
      message={`Log in to play ${entry.title} and save your progress.`}
      returnTo={entry.href}
      fullScreen
    >
      <GameLandingAdProvider>
        <AuthenticatedGameLauncher game={game} entry={entry} />
      </GameLandingAdProvider>
    </AuthBoundary>
  );
}

function AuthenticatedGameLauncher({ game, entry }: GameLauncherProps) {
  const sport = sportForGame(game);
  const hydrated = useIsHydrated();
  const claimed = useIsPackClaimed(sport);
  const decks = useDecks();

  // Storage is not readable on the server, so the gate cannot be decided there.
  // Rendering the game first would flash it before the pack, so the prerendered
  // frame names the game and nothing else, and the decision lands on hydration.
  if (!hydrated) return <GameOpening entry={entry} />;

  if (entry.requiresDeck && !claimed) {
    return <StarterPackGate game={game} entry={entry} sport={sport} />;
  }

  if (entry.requiresDeck && !isLoadoutComplete(activeLoadout(decks, sport))) {
    return <DeckRequired sport={sport} entry={entry} />;
  }

  return <GameSurface game={game} entry={entry} />;
}

function DeckRequired({ sport, entry }: { sport: Sport; entry: GameEntry }) {
  const accent = accentVar(entry.accent);
  return <div className="grid min-h-dvh place-items-center px-5 text-center"><div className="max-w-md border border-border bg-surface-raised p-6"><p className="font-display text-2xs font-black tracking-ultra text-muted">{"// LOADOUT REQUIRED"}</p><h1 className="mt-3 font-display text-2xl font-black" style={{ color: accent }}>{entry.title}</h1><p className="mt-3 text-xs leading-relaxed text-muted">Your active deck profile is incomplete or stale. Repair every required slot before entering the game.</p><Link href={`/decks/${sport}?returnTo=${encodeURIComponent(entry.href)}`} className="mt-6 grid h-12 place-items-center font-display text-xs font-black text-background" style={{ background: accent }}>OPEN LOADOUT EDITOR</Link></div></div>;
}

/**
 * Mounted only after hydration, so the roll happens exactly once and only in
 * the browser — a pack drawn during render would differ between the server and
 * the client and React would report the mismatch.
 */
function StarterPackGate({
  game,
  entry,
  sport,
}: GameLauncherProps & { sport: Sport }) {
  const [reveal] = useState(() => rollStarterPackFor(sport));
  const [opened, setOpened] = useState(false);

  if (opened) return <GameSurface game={game} entry={entry} />;

  return (
    <StarterPackReveal
      reveal={reveal}
      onComplete={() => {
        claimPack(sport, reveal);
        setOpened(true);
      }}
    />
  );
}

/**
 * The frame before the gate is known, and the whole of the prerendered HTML.
 *
 * It carries the game's name so the page is never blank — for a crawler, for a
 * slow connection, and for the beat before hydration decides what comes next.
 */
function GameOpening({ entry }: { entry: GameEntry }) {
  const accent = accentVar(entry.accent);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <h1
        className="font-display font-black leading-tight"
        style={{
          color: accent,
          fontSize: "var(--ds-text-2xl)",
          letterSpacing: "var(--ds-tracking-display)",
        }}
      >
        {entry.title}
      </h1>
      <p
        className="mt-3 font-bold leading-compact text-muted"
        style={{
          fontSize: "var(--ds-text-2xs)",
          letterSpacing: "var(--ds-tracking-ultra)",
        }}
      >
        OPENING...
      </p>
    </div>
  );
}

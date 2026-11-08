"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { settleCoinReward } from "@/features/economy";
import {
  footballAttackers,
  footballDefenders,
  footballGoalkeepers,
  footballPlayerCards,
} from "@/features/packs";
import { activeLoadout, useDecks } from "@/features/cards-decks";
import type { PlayerCard } from "@/domain/cards";

import { randomOpponentName } from "../../shared/data/opponent-names";
import { generateShootoutOpponent } from "../../shared/engine/opponent";
import type { GameEntry } from "@/mocks/games";
import type { GameId } from "../../types";
import { GameLandingAd } from "../../shared/components/game-landing-ad";
import { useGameReturn } from "../../shared/hooks/use-game-return";
import { isDraw, isFinished, playerWon } from "../engine/match";
import {
  readFootballChessStats,
  recordFootballChess,
  saveFormation,
  useFootballChessStats,
  useIsHydrated,
} from "../state/football-chess-progress";
import { useMatch, useMatchRandom } from "../state/use-match";
import type { BoardActionType, BoardCell, ChessFormation } from "../types";

import {
  GameMatchGate,
  matchmakingFighter,
  useMatchmakingPlayer,
} from "../../shared/components/matchmaking";

import { ChessBoard } from "./chess-board";
import { ChessLobby } from "./chess-lobby";
import { ChessResult } from "./chess-result";
import {
  ActionBar,
  CentreFlash,
  ChessHud,
  DecisionTimer,
  GoalFlash,
  OpponentToast,
} from "./chess-chrome";
import { TossPhase } from "./toss-phase";

import styles from "./football-chess.module.css";

/**
 * 5v5 Football Chess — a two-minute grid duel, one action a turn.
 *
 * The orchestrator owns the lobby/session swap and nothing else. A rematch is a
 * new `key` rather than a reset, so the reducer, the clock and every timer come
 * up fresh without a state-resetting effect.
 */

export type FootballChessProps = {
  game: GameId;
  entry: GameEntry;
};

/**
 * The five the football loadout fields, in the order the engine wants:
 * `[atk, atk, def, def, gk]`. Anything short of a full 5-a-side deck holds the
 * CTA rather than fielding a broken side.
 */
function squadFromLoadout(loadout: {
  attackers: string[];
  defenders: string[];
  keeperId: string | null;
} | undefined): PlayerCard[] | null {
  if (loadout === undefined || loadout.keeperId === null) return null;
  const find = (id: string) => footballPlayerCards.find((card) => card.id === id);

  const attackers = loadout.attackers.map(find).filter((c): c is PlayerCard => c !== undefined);
  const defenders = loadout.defenders.map(find).filter((c): c is PlayerCard => c !== undefined);
  const keeper = find(loadout.keeperId);

  if (attackers.length < 2 || defenders.length < 2 || keeper === undefined) return null;
  return [attackers[0], attackers[1], defenders[0], defenders[1], keeper];
}

export function FootballChess({ game: _game }: FootballChessProps) {
  void _game;
  const [view, setView] = useState<"lobby" | "matchmaking" | "playing">("lobby");
  const [session, setSession] = useState(0);
  const [setup, setSetup] = useState<MatchSetup | null>(null);
  const decks = useDecks();
  const hydrated = useIsHydrated();
  const stats = useFootballChessStats();
  const goBack = useGameReturn();
  const footballLoadout = activeLoadout(decks, "football");
  const player = useMatchmakingPlayer(`LV ${playerLevel}`);

  const squad = useMemo(
    () => squadFromLoadout(footballLoadout),
    [footballLoadout],
  );

  /*
   * The rival is drawn here rather than inside the session, because the queue
   * is who the player watches arrive — the gate has to know the name and the
   * level before the board exists. Drawn in the browser, on the press: a roll
   * during a server render would differ from the client's.
   */
  const play = useCallback(() => {
    setSetup(drawOpponent());
    setSession((value) => value + 1);
    setView("matchmaking");
  }, []);

  if (view === "lobby" || squad === null || setup === null) {
    return (
      <>
        <ChessLobby
          stats={stats}
          formation={stats.formation}
          squadReady={squad !== null && hydrated}
          onBack={goBack}
          onFormationChange={(formation) => saveFormation(formation)}
          onPlay={play}
        />
        <GameLandingAd />
      </>
    );
  }

  if (view === "matchmaking") {
    return (
      <GameMatchGate
        goLabel="KICK OFF!"
        config={{
          title: "5V5 FOOTBALL CHESS",
          queueLabel: "SCANNING GLOBAL CHESS QUEUE",
          player,
          opponent: matchmakingFighter(
            setup.opponentName,
            `LV ${setup.opponentLevel}`,
          ),
        }}
        onReady={() => setView("playing")}
        onCancel={() => setView("lobby")}
      />
    );
  }

  return (
    <FootballChessSession
      key={session}
      squad={squad}
      formation={stats.formation}
      setup={setup}
      onPlayAgain={play}
      onExit={() => setView("lobby")}
    />
  );
}

/** The level the player fields at. Football Chess banks no XP of its own yet. */
const playerLevel = 5;

type MatchSetup = {
  opponentName: string;
  opponentLevel: number;
  opponentSquad: PlayerCard[];
};

/** The rival's name, level and side — one roll, before the queue is shown. */
function drawOpponent(): MatchSetup {
  const opponentLevel = Math.min(
    99,
    Math.max(1, playerLevel + Math.floor(Math.random() * 4) - 1),
  );
  const opponent = generateShootoutOpponent(
    opponentLevel,
    footballAttackers,
    footballDefenders,
    footballGoalkeepers,
  );
  return {
    opponentName: randomOpponentName(),
    opponentLevel,
    opponentSquad: opponent.shooters,
  };
}

/* ---- One match ------------------------------------------------------------ */

type SessionProps = {
  squad: PlayerCard[];
  formation: ChessFormation;
  /** The rival the queue landed on, drawn before matchmaking was shown. */
  setup: MatchSetup;
  onPlayAgain: () => void;
  onExit: () => void;
};

function FootballChessSession({
  squad,
  formation,
  setup,
  onPlayAgain,
  onExit,
}: SessionProps) {
  const sources = useMatchRandom();

  const [award, setAward] = useState({ xp: 0, coins: 0 });
  const [resultShown, setResultShown] = useState(false);
  const recorded = useRef(false);

  const { match, dispatch } = useMatch(
    {
      playerSquad: squad,
      formation,
      opponentSquad: setup.opponentSquad,
      opponentName: setup.opponentName,
      opponentLevel: setup.opponentLevel,
    },
    sources,
  );

  // Settled the instant full time lands, and guarded so a re-render cannot pay
  // out twice — the same beat Flutter dispatches its XP on.
  useEffect(() => {
    if (!isFinished(match) || recorded.current) return;
    recorded.current = true;

    const won = playerWon(match);
    const draw = isDraw(match);
    const margin = Math.abs(match.playerScore - match.opponentScore);
    const xp = recordFootballChess(won, draw, margin);
    const coins = won ? 50 : draw ? 20 : 10;
    settleCoinReward({
      // Minted here rather than during render: it is only needed once, and the
      // `recorded` guard is what actually keeps the payout idempotent.
      id: `football-chess-${Date.now()}-${Math.random()}`,
      coins,
      title: "5V5 FOOTBALL CHESS",
      subtitle: `${won ? "WIN" : draw ? "DRAW" : "LOSS"} ${match.playerScore}-${match.opponentScore}`,
    });
    setAward({ xp, coins });
    setResultShown(true);
  }, [match]);

  const onTapCell = useCallback(
    (cell: BoardCell) => dispatch({ type: "tapCell", cell }),
    [dispatch],
  );
  const onChoose = useCallback(
    (verb: BoardActionType) => dispatch({ type: "chooseAction", verb }),
    [dispatch],
  );

  return (
    <div className="relative flex min-h-dvh flex-col items-center">
      {/*
        * The column widens at the breakpoint where the board turns horizontal,
        * but the score bar and the action deck stay on the narrow measure — a
        * 900px-wide row of three chips reads as scattered, not spacious.
        */}
      <div className="relative flex min-h-dvh w-full max-w-120 flex-col lg:max-w-265">
        <div className="mx-auto w-full max-w-120">
          <ChessHud match={match} onExit={onExit} />
        </div>

        <div className="relative flex min-h-0 flex-1 items-center justify-center px-3 py-2">
          <ChessBoard
            match={match}
            interactive={match.phase === "playerTurn"}
            onTapCell={onTapCell}
          />
          <GoalFlash match={match} />
          <CentreFlash match={match} />
          <OpponentToast match={match} />
        </div>

        <div
          className="mx-auto w-full max-w-120 shrink-0 pb-5"
          style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
        >
          <DecisionTimer match={match} />
          <ActionBar match={match} onChoose={onChoose} />
        </div>

        {match.phase === "toss" ? (
          <TossPhase
            match={match}
            onCall={(call) => dispatch({ type: "callToss", call })}
            onBeginPlay={() => dispatch({ type: "beginPlay" })}
            onQuit={onExit}
          />
        ) : null}

        {resultShown ? (
          <ChessResult
            match={match}
            xpGained={award.xp}
            coinsGained={award.coins}
            stats={readFootballChessStats()}
            onPlayAgain={onPlayAgain}
            onExit={onExit}
          />
        ) : null}
      </div>

      {/* Desktop only: the board is tap-driven, so say what the keys do. */}
      <p
        className={`${styles.enter} pointer-events-none absolute bottom-6 left-6 hidden font-bold leading-body text-muted lg:block`}
        style={{ fontSize: "var(--ds-text-2xs)", letterSpacing: "var(--ds-tracking-tight)" }}
      >
        TAB TO A SQUARE · ENTER TO SELECT
        <br />PICK A VERB, THEN A TARGET SQUARE
      </p>
    </div>
  );
}

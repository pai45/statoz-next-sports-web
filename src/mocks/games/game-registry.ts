import { isGameEnabled } from "@/domain/demo-product";
import type { AccentName } from "@statoz/design-system/web";

import type { GameId, GameSceneId, GameTileKind } from "@/features/games/types";

export type GameEntry = {
  kind: GameTileKind;
  /** Single-line title, and the accessible name the tile announces. */
  title: string;
  /**
   * Where the title is set over fixed lines rather than wrapped. Flutter pins
   * these so long names break at the same point every time.
   */
  titleLines?: string[];
  subtitle: string;
  /** Hero tiles only: the corner tag above the title. */
  badgeLabel?: string;
  /** Hero tiles only: the verb pinned to the bottom edge. */
  ctaLabel?: string;
  accent: AccentName;
  /** Casts the accent bloom. Only the featured game sets it. */
  glow?: boolean;
  /**
   * Whether the game fields a deck of cards. Those games hand the player their
   * sport's starter pack the first time they enter; quizzes and the guessing
   * games need no cards and so have no gate.
   */
  requiresDeck?: true;
  /** Legacy format identifier; discovery artwork is resolved by game id. */
  scene: GameSceneId;
  href: string;
};

/**
 * Copy, accent, illustration, and destination for every playable game.
 *
 * The Flutter screen builds these inline, in two places — the trending bento
 * and the per-sport deck — and the two disagree in a few spots. Here each game
 * has one identity, so the collapsed cases are called out where they happen.
 *
 * Route slugs follow the game module directories under `features/games`, so a
 * few differ from the id: the arcade names a game, the module names a sport.
 */
export const gameRegistry: Record<GameId, GameEntry> = {
  "retro-hoops": {kind:"hero",title:"RETRO HOOPS",titleLines:["RETRO","HOOPS"],subtitle:"THREE MINUTES. FULL COURT.",badgeLabel:"RETRO // 3V3 BASKETBALL",ctaLabel:"TAKE THE COURT",accent:"game-hoop-duel",scene:"hoop-duel",href:"/play/retro-hoops"},
  "retro-circuit": {kind:"hero",title:"RETRO CIRCUIT",titleLines:["RETRO","CIRCUIT"],subtitle:"THREE LAPS. ONE CLEAN LINE.",badgeLabel:"RETRO // ARCADE RACING",ctaLabel:"CHASE THE HORIZON",accent:"game-grand-prix-dash",scene:"grand-prix-dash",href:"/play/retro-circuit"},
  "retro-football": {kind:"hero",title:"RETRO FOOTBALL",titleLines:["RETRO","FOOTBALL"],subtitle:"TWO HALVES. ONE EXHIBITION.",badgeLabel:"RETRO // FOOTBALL",ctaLabel:"KICK OFF",accent:"game-pitch-duel",scene:"pitch-duel",href:"/play/retro-football"},
  /* ---- football ------------------------------------------------------- */
  "pitch-duel": {
    kind: "hero",
    title: "PITCH DUEL",
    subtitle: "TACTICAL CARD GAME",
    badgeLabel: "FEATURED // TACTICAL",
    ctaLabel: "ENTER THE DUEL",
    accent: "game-pitch-duel",
    glow: true,
    scene: "pitch-duel",
    href: "/play/pitch-duel",
    requiresDeck: true,
  },
  "penalty-shootout": {
    kind: "hero",
    title: "PENALTY SHOOTOUT",
    titleLines: ["PENALTY", "SHOOTOUT"],
    subtitle: "SUDDEN-DEATH SPOT KICKS",
    badgeLabel: "SUDDEN DEATH",
    ctaLabel: "TAKE THE SHOT",
    accent: "game-penalty-shootout",
    scene: "penalty-shootout",
    href: "/play/penalty-shootout",
    requiresDeck: true,
  },
  "football-chess": {
    kind: "hero",
    title: "5V5 FOOTBALL CHESS",
    titleLines: ["5V5 FOOTBALL", "CHESS"],
    subtitle: "TACTICAL SQUAD DUEL",
    badgeLabel: "FEATURED // 5V5",
    ctaLabel: "MAKE YOUR MOVE",
    accent: "game-football-chess",
    scene: "football-chess",
    href: "/play/football-chess",
    requiresDeck: true,
  },
  "football-quiz": {
    kind: "quick",
    title: "FOOTBALL QUIZ",
    subtitle: "TRIVIA GAUNTLET",
    accent: "game-football-quiz",
    scene: "quiz",
    href: "/play/quiz/football",
  },
  "football-bingo": {
    kind: "quick",
    title: "FOOTBALL BINGO",
    // The deck said "COUNTRY x CLUB GRID"; both axes are clubs, and the grid
    // asks which player turned out for the pair. The trending bento says
    // "BUILD A WINNING GRID".
    subtitle: "CLUB x CLUB GRID",
    accent: "game-football-bingo",
    scene: "bingo",
    href: "/play/football-bingo",
  },
  "guess-player": {
    kind: "quick",
    title: "GUESS THE PLAYER",
    subtitle: "DAILY FOOTBALL MYSTERY",
    accent: "game-guess-player",
    scene: "guess-player",
    href: "/play/guess-player",
  },

  "retro-innings": {
    kind: "hero", title: "RETRO INNINGS", titleLines: ["RETRO", "INNINGS"],
    subtitle: "BAT AN OVER. DEFEND YOUR SCORE.", badgeLabel: "PRIVATE // CRICKET PREVIEW",
    ctaLabel: "PLAY PRIVATE PREVIEW", accent: "game-final-over", scene: "final-over",
    href: "/play/retro-innings",
  },
  /* ---- cricket -------------------------------------------------------- */
  "final-over": {
    kind: "hero",
    title: "FINAL OVER",
    subtitle: "THREE-OVER CHASE",
    badgeLabel: "FEATURED // THREE OVERS",
    ctaLabel: "START THE CHASE",
    accent: "game-final-over",
    scene: "final-over",
    href: "/play/final-over",
    requiresDeck: true,
  },
  "cricket-quiz": {
    kind: "quick",
    title: "CRICKET QUIZ",
    subtitle: "TRIVIA GAUNTLET",
    accent: "game-cricket-quiz",
    scene: "quiz",
    href: "/play/quiz/cricket",
  },
  "cricket-guess-player": {
    kind: "quick",
    title: "GUESS THE PLAYER",
    subtitle: "DAILY CRICKET MYSTERY",
    accent: "game-cricket-guess-player",
    scene: "guess-player",
    href: "/play/guess-player/cricket",
  },

  /* ---- basketball ----------------------------------------------------- */
  "hoop-duel": {
    kind: "hero",
    title: "HOOP DUEL",
    subtitle: "STREET 1-ON-1 ARCADE HOOPS",
    badgeLabel: "FEATURED // STREET",
    ctaLabel: "HIT THE COURT",
    accent: "game-hoop-duel",
    scene: "hoop-duel",
    href: "/play/basketball",
    requiresDeck: true,
  },
  "basketball-quiz": {
    kind: "quick",
    title: "BASKETBALL QUIZ",
    subtitle: "TRIVIA GAUNTLET",
    accent: "game-basketball-quiz",
    scene: "quiz",
    href: "/play/quiz/basketball",
  },
  "basketball-guess-player": {
    kind: "quick",
    title: "GUESS THE PLAYER",
    subtitle: "DAILY BASKETBALL MYSTERY",
    accent: "game-basketball-guess-player",
    scene: "guess-player",
    href: "/play/guess-player/basketball",
  },

  /* ---- tennis --------------------------------------------------------- */
  "tennis-rally": {
    kind: "hero",
    title: "TENNIS RALLY",
    subtitle: "2D ARCADE SETS // 5 MODES",
    badgeLabel: "FEATURED // NEW",
    ctaLabel: "STEP ON COURT",
    accent: "game-tennis-rally",
    scene: "tennis-rally",
    href: "/play/tennis",
    requiresDeck: true,
  },
  "tennis-quiz": {
    kind: "quick",
    title: "TENNIS QUIZ",
    subtitle: "TRIVIA GAUNTLET",
    accent: "game-tennis-quiz",
    scene: "quiz",
    href: "/play/quiz/tennis",
  },
  "tennis-guess-winner": {
    kind: "quick",
    title: "GUESS THE WINNER",
    subtitle: "DAILY MYSTERY",
    accent: "game-tennis-guess-winner",
    scene: "guess-winner",
    href: "/play/guess-winner",
  },

  /* ---- motorsport ----------------------------------------------------- */
  "grand-prix-dash": {
    kind: "hero",
    title: "GRAND PRIX DASH",
    titleLines: ["GRAND PRIX", "DASH"],
    subtitle: "ONE-LAP ARCADE RACER",
    badgeLabel: "FEATURED // RACE",
    ctaLabel: "RACE NOW",
    accent: "game-grand-prix-dash",
    scene: "grand-prix-dash",
    href: "/play/grand-prix",
    requiresDeck: true,
  },
  "motorsport-quiz": {
    kind: "quick",
    title: "MOTORSPORT QUIZ",
    subtitle: "TRIVIA GAUNTLET",
    accent: "game-motorsport-quiz",
    scene: "quiz",
    href: "/play/quiz/motorsport",
  },
  "guess-driver": {
    kind: "quick",
    title: "GUESS THE DRIVER",
    subtitle: "DAILY F1 MYSTERY",
    accent: "game-guess-driver",
    scene: "guess-driver",
    href: "/play/guess-driver",
  },
};

/** The registry entry for a game, or `undefined` when it has no tile yet. */
export function gameEntryFor(id: GameId): GameEntry | undefined {
  return isGameEnabled(id) ? gameRegistry[id] : undefined;
}

/**
 * Every game addressable under `/play`, and the game each href names.
 *
 * Built from the registry rather than kept alongside it, so a game that changes
 * its href cannot end up unreachable.
 */
const gameByHref: Record<string, GameId> = Object.fromEntries(
  Object.entries(gameRegistry).filter(([id]) => isGameEnabled(id)).map(([id, entry]) => [entry.href, id as GameId]),
);

export function playableGameHrefs(): string[] {
  return Object.keys(gameByHref);
}

export function gameForHref(
  href: string,
): { game: GameId; entry: GameEntry } | null {
  const game = gameByHref[href];
  return game ? { game, entry: gameRegistry[game] } : null;
}

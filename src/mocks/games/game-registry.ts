import { isGameEnabled } from "@/domain/demo-product";
import type { AccentName } from "@statoz/design-system/web";

import type { GameFormat, GameId, GameSceneId, GameTileKind } from "@/features/games/types";

export type GameEntry = {
  /** Where the Quiz hub files it. Arcade games, absent from that hub, omit it. */
  format?: GameFormat;
  /** One line saying what you actually do, unique to the game. */
  hook?: string;
  /** Size of a run at a glance, e.g. `5 Q · ~1 MIN`. */
  meta?: string;
  /** A new puzzle every local day, the same for everyone. */
  daily?: true;
  /**
   * `hidden` keeps a game out of every deck, catalogue and route until it can
   * actually be played, so no tile ever leads to a "not built yet" screen.
   */
  status?: "live" | "hidden";
  /** Playable without logging in. Progress stays in this browser. */
  guestPlayable?: true;
  /** The game whose artwork and mark this one borrows. Defaults to itself. */
  artGame?: GameId;
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
  "football-daily-quiz": {
    kind: "quick",
    format: "daily-quiz",
    title: "DAILY QUIZ",
    subtitle: "FOOTBALL · 5 QUESTIONS",
    hook: "Five questions, fifteen seconds each. Same quiz for everyone today.",
    meta: "5 Q · 1 MIN",
    daily: true,
    guestPlayable: true,
    artGame: "football-quiz",
    accent: "cyan",
    scene: "quiz",
    href: "/play/daily-quiz/football",
  },
  "football-quiz": {
    kind: "quick",
    format: "quiz-paths",
    title: "FOOTBALL QUIZ",
    subtitle: "CLUBS, CUPS & LEGENDS",
    hook: "Four paths of 50 sets. Clear sets to climb, score 10/10 for three stars.",
    meta: "10 Q / SET",
    accent: "game-football-quiz",
    scene: "quiz",
    href: "/play/quiz/football",
  },
  "football-bingo": {
    kind: "quick",
    format: "bingo",
    title: "FOOTBALL BINGO",
    // The deck said "COUNTRY x CLUB GRID"; both axes are clubs, and the grid
    // asks which player turned out for the pair. The trending bento says
    // "BUILD A WINNING GRID".
    subtitle: "CLUB x CLUB GRID",
    hook: "Players arrive one by one. Drop each into the club pair they played for.",
    meta: "3×3 GRID",
    daily: true,
    guestPlayable: true,
    accent: "game-football-bingo",
    scene: "bingo",
    href: "/play/football-bingo",
  },
  "guess-player": {
    kind: "quick",
    format: "guess-player",
    title: "GUESS THE PLAYER",
    subtitle: "DAILY FOOTBALL MYSTERY",
    hook: "Name the mystery player from their career path, one club at a time.",
    meta: "6 TRIES",
    daily: true,
    guestPlayable: true,
    accent: "game-guess-player",
    scene: "guess-player",
    href: "/play/guess-player",
  },
  "football-who-are-ya": {
    kind: "quick",
    format: "who-are-ya",
    title: "WHO ARE YA?",
    subtitle: "NATION · CLUB · POSITION CLUES",
    hook: "Guess any player. Each guess shows how close you are: nation, club, position, debut, rating.",
    meta: "8 GUESSES",
    daily: true,
    guestPlayable: true,
    accent: "orange",
    scene: "guess-player",
    href: "/play/who-are-ya/football",
  },
  "football-grid": {
    kind: "quick",
    format: "grid",
    title: "FOOTBALL GRID",
    subtitle: "CLUB × CLUB · NAME THE PLAYER",
    hook: "Name a player who played for both clubs in every cell. Or play tic-tac-toe against the CPU or a friend.",
    meta: "9 CELLS · VS MODE",
    daily: true,
    guestPlayable: true,
    accent: "violet",
    scene: "bingo",
    href: "/play/grid/football",
  },
  "football-connections": {
    kind: "quick",
    format: "connections",
    title: "CONNECTIONS",
    subtitle: "16 PLAYERS · 4 HIDDEN CLUBS",
    hook: "Sort sixteen players into the four clubs they share. Four mistakes and the day is over.",
    meta: "4 GROUPS · 4 MISTAKES",
    daily: true,
    guestPlayable: true,
    accent: "gold",
    scene: "football-chess",
    href: "/play/connections/football",
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
  "cricket-daily-quiz": {
    kind: "quick",
    format: "daily-quiz",
    title: "DAILY QUIZ",
    subtitle: "CRICKET · 5 QUESTIONS",
    hook: "Five questions, fifteen seconds each. Same quiz for everyone today.",
    meta: "5 Q · 1 MIN",
    daily: true,
    guestPlayable: true,
    artGame: "cricket-quiz",
    accent: "cyan",
    scene: "quiz",
    href: "/play/daily-quiz/cricket",
  },
  "cricket-quiz": {
    kind: "quick",
    format: "quiz-paths",
    title: "CRICKET QUIZ",
    subtitle: "TESTS, TOURS & RECORDS",
    hook: "Four paths of 50 sets. Clear sets to climb, score 10/10 for three stars.",
    meta: "10 Q / SET",
    accent: "game-cricket-quiz",
    scene: "quiz",
    href: "/play/quiz/cricket",
  },
  "cricket-guess-player": {
    kind: "quick",
    format: "guess-player",
    title: "GUESS THE PLAYER",
    subtitle: "DAILY CRICKET MYSTERY",
    hook: "Name the mystery cricketer from their career path, one team at a time.",
    meta: "6 TRIES",
    daily: true,
    guestPlayable: true,
    accent: "game-cricket-guess-player",
    scene: "guess-player",
    href: "/play/guess-player/cricket",
  },
  "cricket-who-are-ya": {
    kind: "quick",
    format: "who-are-ya",
    title: "WHO ARE YA?",
    subtitle: "TEAM · ROLE · DEBUT CLUES",
    hook: "Guess any cricketer. Each guess shows how close you are: team, role, debut, rating.",
    meta: "8 GUESSES",
    daily: true,
    guestPlayable: true,
    accent: "orange",
    scene: "guess-player",
    href: "/play/who-are-ya/cricket",
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
  "basketball-daily-quiz": {
    kind: "quick",
    format: "daily-quiz",
    title: "DAILY QUIZ",
    subtitle: "BASKETBALL · 5 QUESTIONS",
    hook: "Five questions, fifteen seconds each. Same quiz for everyone today.",
    meta: "5 Q · 1 MIN",
    daily: true,
    guestPlayable: true,
    artGame: "basketball-quiz",
    accent: "cyan",
    scene: "quiz",
    href: "/play/daily-quiz/basketball",
  },
  "basketball-quiz": {
    kind: "quick",
    format: "quiz-paths",
    title: "BASKETBALL QUIZ",
    subtitle: "TEAMS, TITLES & MVPS",
    hook: "Four paths of 50 sets. Clear sets to climb, score 10/10 for three stars.",
    meta: "10 Q / SET",
    accent: "game-basketball-quiz",
    scene: "quiz",
    href: "/play/quiz/basketball",
  },
  "basketball-guess-player": {
    kind: "quick",
    format: "guess-player",
    title: "GUESS THE PLAYER",
    subtitle: "DAILY BASKETBALL MYSTERY",
    hook: "Name the mystery player from their career path, one team at a time.",
    meta: "6 TRIES",
    daily: true,
    guestPlayable: true,
    accent: "game-basketball-guess-player",
    scene: "guess-player",
    href: "/play/guess-player/basketball",
  },
  "basketball-who-are-ya": {
    kind: "quick",
    format: "who-are-ya",
    title: "WHO ARE YA?",
    subtitle: "TEAM · POSITION · DEBUT CLUES",
    hook: "Guess any player. Each guess shows how close you are: team, conference, position, debut, rating.",
    meta: "8 GUESSES",
    daily: true,
    guestPlayable: true,
    accent: "orange",
    scene: "guess-player",
    href: "/play/who-are-ya/basketball",
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
  "tennis-daily-quiz": {
    kind: "quick",
    format: "daily-quiz",
    title: "DAILY QUIZ",
    subtitle: "TENNIS · 5 QUESTIONS",
    hook: "Five questions, fifteen seconds each. Same quiz for everyone today.",
    meta: "5 Q · 1 MIN",
    daily: true,
    guestPlayable: true,
    artGame: "tennis-quiz",
    accent: "cyan",
    scene: "quiz",
    href: "/play/daily-quiz/tennis",
  },
  "tennis-quiz": {
    kind: "quick",
    format: "quiz-paths",
    title: "TENNIS QUIZ",
    subtitle: "SLAMS, RIVALS & RECORDS",
    hook: "Four paths of 50 sets. Clear sets to climb, score 10/10 for three stars.",
    meta: "10 Q / SET",
    accent: "game-tennis-quiz",
    scene: "quiz",
    href: "/play/quiz/tennis",
  },
  "tennis-guess-winner": {
    kind: "quick",
    format: "mystery",
    // No web screen yet: hidden until Who Are Ya covers tennis.
    status: "hidden",
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
  "motorsport-daily-quiz": {
    kind: "quick",
    format: "daily-quiz",
    title: "DAILY QUIZ",
    subtitle: "MOTORSPORT · 5 QUESTIONS",
    hook: "Five questions, fifteen seconds each. Same quiz for everyone today.",
    meta: "5 Q · 1 MIN",
    daily: true,
    guestPlayable: true,
    artGame: "motorsport-quiz",
    accent: "cyan",
    scene: "quiz",
    href: "/play/daily-quiz/motorsport",
  },
  "motorsport-quiz": {
    kind: "quick",
    format: "quiz-paths",
    title: "MOTORSPORT QUIZ",
    subtitle: "TEAMS, TRACKS & TITLES",
    hook: "Four paths of 50 sets. Clear sets to climb, score 10/10 for three stars.",
    meta: "10 Q / SET",
    accent: "game-motorsport-quiz",
    scene: "quiz",
    href: "/play/quiz/motorsport",
  },
  "guess-driver": {
    kind: "quick",
    format: "mystery",
    // No web screen yet: hidden until Who Are Ya covers motorsport.
    status: "hidden",
    title: "GUESS THE DRIVER",
    subtitle: "DAILY F1 MYSTERY",
    accent: "game-guess-driver",
    scene: "guess-driver",
    href: "/play/guess-driver",
  },
  /* ---- higher or lower (every sport) -------------------------------- */
  "football-higher-lower": {
    kind: "quick",
    format: "higher-lower",
    title: "HIGHER OR LOWER",
    subtitle: "FOOTBALL · CARD RATINGS",
    hook: "Is the next player rated higher or lower? Ten calls today, or go endless.",
    meta: "10 CALLS · ENDLESS",
    daily: true,
    guestPlayable: true,
    accent: "lime",
    scene: "pitch-duel",
    href: "/play/higher-lower/football",
  },
  "cricket-higher-lower": {
    kind: "quick",
    format: "higher-lower",
    title: "HIGHER OR LOWER",
    subtitle: "CRICKET · CARD RATINGS",
    hook: "Is the next player rated higher or lower? Ten calls today, or go endless.",
    meta: "10 CALLS · ENDLESS",
    daily: true,
    guestPlayable: true,
    accent: "lime",
    scene: "final-over",
    href: "/play/higher-lower/cricket",
  },
  "basketball-higher-lower": {
    kind: "quick",
    format: "higher-lower",
    title: "HIGHER OR LOWER",
    subtitle: "BASKETBALL · CARD RATINGS",
    hook: "Is the next player rated higher or lower? Ten calls today, or go endless.",
    meta: "10 CALLS · ENDLESS",
    daily: true,
    guestPlayable: true,
    accent: "lime",
    scene: "hoop-duel",
    href: "/play/higher-lower/basketball",
  },
  "tennis-higher-lower": {
    kind: "quick",
    format: "higher-lower",
    title: "HIGHER OR LOWER",
    subtitle: "TENNIS · CARD RATINGS",
    hook: "Is the next player rated higher or lower? Ten calls today, or go endless.",
    meta: "10 CALLS · ENDLESS",
    daily: true,
    guestPlayable: true,
    accent: "lime",
    scene: "tennis-rally",
    href: "/play/higher-lower/tennis",
  },
  "motorsport-higher-lower": {
    kind: "quick",
    format: "higher-lower",
    title: "HIGHER OR LOWER",
    subtitle: "MOTORSPORT · CARD RATINGS",
    hook: "Is the next player rated higher or lower? Ten calls today, or go endless.",
    meta: "10 CALLS · ENDLESS",
    daily: true,
    guestPlayable: true,
    accent: "lime",
    scene: "grand-prix-dash",
    href: "/play/higher-lower/motorsport",
  },
};

/**
 * Enabled for this demo and not hidden. A hidden game has no tile and no route,
 * so nothing in the app can lead to a screen that does not exist yet.
 */
export function isGameLive(id: GameId): boolean {
  return isGameEnabled(id) && gameRegistry[id]?.status !== "hidden";
}

/** The registry entry for a game, or `undefined` when it has no tile yet. */
export function gameEntryFor(id: GameId): GameEntry | undefined {
  return isGameLive(id) ? gameRegistry[id] : undefined;
}

/**
 * Every game addressable under `/play`, and the game each href names.
 *
 * Built from the registry rather than kept alongside it, so a game that changes
 * its href cannot end up unreachable.
 */
const gameByHref: Record<string, GameId> = Object.fromEntries(
  Object.entries(gameRegistry).filter(([id]) => isGameLive(id as GameId)).map(([id, entry]) => [entry.href, id as GameId]),
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

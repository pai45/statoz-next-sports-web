/**
 * The shootout's timeline and geometry, in one place.
 *
 * Flutter spreads these across a dozen AnimationControllers and a private
 * `_GoalGeom`; both halves are collected here for the same reason the packs
 * feature collects its own — a value read by both a component and its
 * stylesheet must not be able to drift.
 */

/* ---- Lobby -------------------------------------------------------------- */

/** The brand emblem's loop — one cycle is two strikes, left corner then right. */
export const emblemLoopMs = 5200;

/** The hero CTA's idle halo, breathing in and out. */
export const ctaPulseMs = 1800;

/** The lobby deals itself in: the status strip, the hero, then the rest. */
export const lobbyEnterMs = 480;
export const lobbyHeroDelayMs = 80;
export const lobbyStatsDelayMs = 180;
export const lobbyStatsStepMs = 85;
export const lobbyPlayDelayMs = 390;
export const lobbyActionsDelayMs = 470;

/* ---- Phase timeline ---------------------------------------------------- */

/** Lineup: both squads deal in, then the kick loop takes over. */
export const lineupRevealMs = 850;

/** The crossfade between stages. Choose and result share a mount and skip it. */
export const phaseSwitchMs = 300;

/** Choose: the banner drops in, the keeper breathes, the aim preview loops. */
export const turnBannerMs = 260;
export const keeperIdleMs = 1600;
export const aimPreviewMs = 1050;

/** Result: the kick scene, the hold after it, and the auto-advance countdown. */
export const resultSceneMs = 1300;
export const resolvingHoldMs = 1250;
export const autoAdvanceMs = 2000;
export const autoAdvanceTickMs = 1000;

/** Summary: the outcome, score, XP panel, and kick log arriving in sequence. */
export const summarySequenceMs = 2200;

/* ---- Result scene sub-timeline ----------------------------------------- */

/**
 * Every beat of the kick is an interval on the one normalised clock, exactly
 * as Flutter layers them on a single controller. Impact is the pivot: the ball
 * meets the keeper's line at 0.55 and everything after it reacts.
 */
export const sceneImpact = 0.55;

export const sceneBallFlight = { start: 0.08, end: sceneImpact } as const;
export const sceneKeeperDive = { start: 0.16, end: 0.58 } as const;
export const sceneRipple = { start: sceneImpact, end: 1 } as const;
export const sceneFlash = { start: sceneImpact, end: 0.75 } as const;
export const sceneShake = { start: sceneImpact, end: 0.9 } as const;
export const sceneVerdict = { start: 0.62, end: 0.92 } as const;
export const sceneBallSettle = { start: sceneImpact, end: 0.75 } as const;
export const sceneBallDrop = { start: sceneImpact, end: 0.85 } as const;
export const sceneSparks = { start: sceneImpact, end: 0.78 } as const;

/** The two ghosts trailing the ball: how far behind, and how faint. */
export const ballTrails = [
  { lag: 0.16, alpha: 0.12 },
  { lag: 0.08, alpha: 0.25 },
] as const;

/* ---- Goal geometry ----------------------------------------------------- */

/**
 * The arena's own coordinate space. Everything below is a fraction of it, so
 * the SVG scales to any width without the goal drifting off its ground line.
 */
export const arenaWidth = 320;
export const arenaHeight = 220;
/** The result scene is a little taller — the ball drops below the goal line. */
export const sceneHeight = 232;

export const goalLeft = arenaWidth * 0.1;
export const goalRight = arenaWidth * 0.9;
export const goalWidth = goalRight - goalLeft;
export const crossbarY = arenaHeight * 0.16;
export const groundY = arenaHeight * 0.8;
export const mouthHeight = groundY - crossbarY;
export const spot = { x: arenaWidth / 2, y: arenaHeight * 0.93 } as const;

/** Where each direction's target sits across the mouth. */
export const zoneX = {
  left: goalLeft + goalWidth * 0.17,
  center: goalLeft + goalWidth * 0.5,
  right: goalRight - goalWidth * 0.17,
} as const;

/** Shots are aimed at the same height whichever way they go. */
export const targetY = crossbarY + mouthHeight * 0.4;

/** The net's weave, and how the ripple spreads through it. */
export const netColumns = 9;
export const netRows = 5;
export const netSamples = 11;
export const rippleAmplitude = 11;
export const rippleSpread = 42;

/** The keeper stands on the goal line at just over three quarters of its height. */
export const keeperHeight = mouthHeight * 0.78;

export const ballRadius = 8;

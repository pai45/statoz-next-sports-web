/**
 * The match's clock and the beats the presentation runs on.
 *
 * The first two are rules — the reducer counts them down. The rest are timings
 * the Flutter match screen owns, driving the state machine from the renderer
 * once an animation has played out; changing one of those must not change a
 * single result.
 */

/** Kickoff to full time. */
export const matchSeconds = 120;

/** The soft per-move timer during the player's turn. */
export const decisionSeconds = 10;

/** The clock ticks ten times a second, as Flutter's periodic timer does. */
export const tickIntervalMs = 100;
export const tickSeconds = 0.1;

/* ---- Presentation beats -------------------------------------------------- */

/** How long the CPU appears to think before it plays. */
export const cpuThinkMs = 650;

/** How long a resolved action holds on screen before the turn passes. */
export const resolutionMs = 430;

/** The goal celebration, before the board resets for the kickoff. */
export const goalCelebrationMs = 1200;

/** A piece slides to its new cell on this. */
export const pieceMoveMs = 340;

/** The centre flash, and the toast that names the CPU's move. */
export const centreFlashMs = 1000;
export const opponentToastMs = 2200;

/** The coin toss: how long the coin spins, and the hold before kickoff. */
export const tossSpinMs = 1500;
export const tossHoldMs = 1300;
export const tossHoldReducedMs = 650;

/** The move log keeps the last eight entries. */
export const moveLogLimit = 8;

import type { PlayerCard } from "@/domain/cards";

/**
 * The three places a penalty can be aimed, and the three a keeper can commit
 * to. Flutter models this as an enum; the string union serialises for free and
 * reads the same at the call site.
 */
export type PenaltyDirection = "left" | "center" | "right";

/** In enum order, so a uniform pick is an index into this. */
export const penaltyDirections: PenaltyDirection[] = ["left", "center", "right"];

export const penaltyDirectionLabels: Record<PenaltyDirection, string> = {
  left: "LEFT",
  center: "CENTER",
  right: "RIGHT",
};

/** The single letter the kick log prints under SHOOT and DIVE. */
export const penaltyDirectionLetters: Record<PenaltyDirection, string> = {
  left: "L",
  center: "C",
  right: "R",
};

export type ShootoutStage =
  | "opponentReveal"
  | "lineup"
  | "choose"
  | "result"
  | "summary";

/**
 * What the user is responsible for on this kick. Derived from the round rather
 * than stored, and presentation-only — it is never persisted.
 */
export type ShootoutTurnRole = "shooting" | "defending";

/** One resolved kick, kept in memory for the history row and the kick log. */
export type PenaltyKick = {
  kickNumber: number;
  byPlayer: boolean;
  shootDirection: PenaltyDirection;
  diveDirection: PenaltyDirection;
  scored: boolean;
  shooter: PlayerCard;
  keeper: PlayerCard;
};

/**
 * Both line-ups and the difficulty they were drawn at. Kick order per side is
 * ATK1, ATK2, DEF1, DEF2, GK — the keeper steps up last.
 */
export type ShootoutSquads = {
  playerShooters: PlayerCard[];
  playerKeeper: PlayerCard;
  cpuShooters: PlayerCard[];
  cpuKeeper: PlayerCard;
  cpuLevel: number;
  opponentName: string;
};

export type ShootoutWinner = "player" | "opponent";

export type ShootoutState = ShootoutSquads & {
  stage: ShootoutStage;
  kicks: PenaltyKick[];
  playerScore: number;
  opponentScore: number;
  /** Kick index, 0-based. The player shoots on even rounds, the CPU on odd. */
  round: number;
  over: boolean;
  selectedDirection: PenaltyDirection | null;
  suddenDeath: boolean;
  winner: ShootoutWinner | null;
};

/** The player always kicks first, so the parity of the round names the side. */
export function playerTaking(state: ShootoutState): boolean {
  return state.round % 2 === 0;
}

export function turnRole(state: ShootoutState): ShootoutTurnRole {
  return playerTaking(state) ? "shooting" : "defending";
}

/**
 * How many kicks the side now on the spot has already taken. The lineup is
 * indexed modulo its length, which is what cycles it again through sudden
 * death.
 */
export function sideKickIndex(state: ShootoutState): number {
  return Math.floor(state.round / 2);
}

export function currentShooter(state: ShootoutState): PlayerCard {
  const shooters = playerTaking(state) ? state.playerShooters : state.cpuShooters;
  return shooters[sideKickIndex(state) % shooters.length];
}

/** The keeper standing in goal for this kick — always the other side's. */
export function currentKeeper(state: ShootoutState): PlayerCard {
  return playerTaking(state) ? state.cpuKeeper : state.playerKeeper;
}

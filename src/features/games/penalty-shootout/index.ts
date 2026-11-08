export { PenaltyShootout } from "./components/penalty-shootout";
export type { PenaltyShootoutProps } from "./components/penalty-shootout";

export { shootoutGoalChance, shootoutKicks } from "./engine/odds";
export { cpuDirection, cpuSmartness, readChanceForLevel } from "./engine/cpu";
export {
  generateShootoutOpponent,
  targetRatingForLevel,
  type OpponentSquad,
} from "../shared/engine/opponent";
export {
  earlyOut,
  initialShootout,
  shootoutReducer,
  type ShootoutAction,
} from "./engine/shootout";

export {
  levelFromXp,
  levelProgress,
  recordShootout,
  resetShootoutProgress,
  shootoutXp,
  useShootoutProgress,
  type LevelProgress,
  type ShootoutProgress,
} from "./state/shootout-progress";

export type {
  PenaltyDirection,
  PenaltyKick,
  ShootoutSquads,
  ShootoutStage,
  ShootoutState,
  ShootoutTurnRole,
} from "./types";

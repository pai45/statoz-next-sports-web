export { GrandPrix } from "./components/grand-prix";
export type { GrandPrixProps } from "./components/grand-prix";

/**
 * The mode's contribution to the profile, and the demo reset. The field, the
 * engine, and every rule stay inside the module.
 */
export {
  readGrandPrixStats,
  resetGrandPrixProgress,
  useGrandPrixStats,
  type GrandPrixStats,
} from "./state/grand-prix-progress";

/**
 * Football Chess's public API.
 *
 * Only the surface the launcher mounts. The rules, the CPU and the progress
 * store stay internal — nothing outside this module should be able to reach a
 * resolver or a board transition.
 */
export { FootballChess } from "./components/football-chess";
export type { FootballChessProps } from "./components/football-chess";

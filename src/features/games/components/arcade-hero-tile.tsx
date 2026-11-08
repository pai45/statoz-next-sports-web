import type { GameEntry } from "@/mocks/games";
import type { GameId } from "../types";
import { DiscoveryGameTile } from "./discovery-game-tile";
import styles from "./discovery-card.module.css";

export type HeroLayout = "portrait" | "landscape";
export type ArcadeHeroTileProps = { game: GameId; entry: GameEntry; layout?: HeroLayout; streak?: number };
export function ArcadeHeroTile({ game, entry, layout = "portrait", streak = 0 }: ArcadeHeroTileProps) {
  return <div className={styles.card} data-discovery-card={game}><DiscoveryGameTile game={game} entry={entry} landscape={layout === "landscape"} streak={streak} /></div>;
}

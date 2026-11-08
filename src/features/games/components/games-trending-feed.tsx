import { Badge, BentoGrid, BentoTile, SignalOffIcon, SignalPanel } from "@statoz/design-system/web";

import { gameEntryFor, gamesTrendingCatalog } from "@/mocks/games";
import type { GamesTrendingTileConfig } from "../types";
import { ArcadeHeroTile } from "./arcade-hero-tile";
import styles from "./discovery-card.module.css";
import { QuickGameTile } from "./quick-game-tile";

/** The curated arcade bento — the home screen's GAMES surface. */
export function GamesTrendingFeed() {
  return (
    <BentoGrid>
      {gamesTrendingCatalog.map((config) => (
        <BentoTile key={config.id} span={config.span} className={config.sourceId === "pitch-duel" || config.sourceId === "penalty-shootout" ? styles.compactHero : undefined}>
          <GameTile config={config} />
        </BentoTile>
      ))}
    </BentoGrid>
  );
}

function GameTile({ config }: { config: GamesTrendingTileConfig }) {
  const entry = gameEntryFor(config.sourceId);
  if (!entry) return <Offline id={config.sourceId} />;

  return entry.kind === "hero" ? (
    <ArcadeHeroTile game={config.sourceId} entry={entry} />
  ) : (
    <QuickGameTile game={config.sourceId} entry={entry} />
  );
}

const MUTED = "var(--ds-color-text-muted)";

/** `_TrendingGameUnavailable` — a catalog entry the registry does not cover. */
function Offline({ id }: { id: string }) {
  return (
    <SignalPanel
      accent={MUTED}
      lifted={false}
      pad={false}
      tag={<Badge accent={MUTED}>GAME</Badge>}
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-3.5 text-muted">
        <SignalOffIcon size={22} />
        <p className="text-center font-display text-2xs font-extrabold leading-tight tracking-wide">
          MODE OFFLINE
          <br />
          {id.toUpperCase()}
        </p>
      </div>
    </SignalPanel>
  );
}

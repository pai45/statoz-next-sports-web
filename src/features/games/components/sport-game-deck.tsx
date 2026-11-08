import { sportModuleFor, type Sport } from "@/domain/sports";

import { deckFor, gameRegistry } from "@/mocks/games";
import { ArcadeHeroTile } from "./arcade-hero-tile";
import { QuickGameTile } from "./quick-game-tile";
import { QuickPlayHeader } from "./quick-play-header";

export type SportGameDeckProps = {
  sport: Sport;
};

/**
 * Everything one sport has to play: its featured games as full-width banners,
 * then the free games on a shelf below.
 *
 * Flutter stacks the banners one per row on a phone. Here they reflow to two
 * and three columns once there is room, so a five-game deck does not become a
 * scroll on a desktop.
 */
export function SportGameDeck({ sport }: SportGameDeckProps) {
  const { heroes, quick } = deckFor(sport);
  const label = sportModuleFor(sport).label.toUpperCase();

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <h2 className="sr-only">{label} games</h2>

      {/* A lone featured game keeps the full width the app gives it; several
          share the row rather than stacking into a scroll. */}
      {heroes.length > 0 ? (
        <ul
          className={[
            "grid gap-3",
            heroes.length > 1 ? "md:grid-cols-2 xl:grid-cols-3" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {heroes.map((id) => (
            <li key={id}>
              <ArcadeHeroTile game={id} entry={gameRegistry[id]} layout="landscape" />
            </li>
          ))}
        </ul>
      ) : null}

      {quick.length > 0 ? (
        <div className="flex flex-col gap-2.5">
          <QuickPlayHeader count={quick.length} />
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {quick.map((id) => (
              <li key={id}>
                <QuickGameTile game={id} entry={gameRegistry[id]} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

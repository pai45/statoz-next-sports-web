import type { CSSProperties } from "react";

import { HomeHubSurface } from "@/features/shell/components/home-hub-surface";

import { AdSlot } from "@/features/ads";
import { PlatformBreadcrumbs, PlatformNav, PlatformTopBar } from "@/features/shell";

/**
 * The platform shell. Navigation sits at the bottom on phones and moves to a
 * side rail once there is room for it.
 */
export default function PlatformLayout({ children }: LayoutProps<"/">) {
  return (
    <div
      className="min-h-dvh"
      style={
        {
          background: "var(--ds-gradient-app-background)",
          /**
           * The bar nav's height, published because it is sticky and therefore
           * floats over the page: anything a screen docks above it — the
           * leaderboard's YOUR RANK card — has to offset by exactly this. The
           * nav below is sized from the same value, so the two cannot drift.
           */
          "--platform-nav-height": "5.25rem",
        } as CSSProperties
      }
    >
      <div className="mx-auto grid min-h-dvh w-full max-w-[104rem] grid-cols-1 2xl:grid-cols-[10rem_minmax(0,80rem)_10rem] 2xl:gap-4 2xl:px-4">
        <div className="hidden 2xl:block">
          <div className="sticky top-4">
            <AdSlot placement="platform-left-rail" />
          </div>
        </div>

        <div className="mx-auto flex min-h-dvh w-full max-w-7xl min-w-0 flex-col lg:flex-row 2xl:mx-0">
          <div className="hidden shrink-0 lg:block lg:w-56">
            <div className="sticky top-0 h-dvh">
              <PlatformNav orientation="rail" />
            </div>
          </div>

          <HomeHubSurface>
            <PlatformTopBar />
            <PlatformBreadcrumbs />
            <main className="flex min-h-0 flex-1 flex-col pb-[env(safe-area-inset-bottom)]">
              {children}
            </main>
          </HomeHubSurface>

          <PlatformNav className="sticky bottom-0 z-20 h-[calc(var(--platform-nav-height)+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)] lg:hidden" />
        </div>

        <div className="hidden 2xl:block">
          <div className="sticky top-4">
            <AdSlot placement="platform-right-rail" />
          </div>
        </div>
      </div>
    </div>
  );
}

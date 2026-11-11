"use client";

import { usePathname } from "next/navigation";
import { createContext, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";

import { HubBackdrop, type HubBackgroundTheme } from "@statoz/design-system/web/components/layout/hub-backdrop";
import { publicAsset } from "@/shared/config/base-path";
import styles from "./home-hub-surface.module.css";

const HubThemeContext = createContext<Dispatch<SetStateAction<HubBackgroundTheme | null>> | null>(null);

/** The home feature publishes the exact active selection, including unlock fallbacks. */
export function useHomeHubTheme() {
  const publish = useContext(HubThemeContext);
  if (!publish) throw new Error("HomeHub must be inside HomeHubSurface");
  return publish;
}

/**
 * Only the Matches hub paints the page-wide artwork. The QUIZ tab paints its
 * sport worlds inside its own spotlight and covers, so a second world behind
 * the whole page would only compete with them.
 */
function paintsBackdrop(pathname: string): boolean {
  return pathname === "/";
}

export function HomeHubSurface({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [theme, setTheme] = useState<HubBackgroundTheme | null>(null);
  return (
    <HubThemeContext.Provider value={setTheme}>
      <div className={styles.surface}>
        {paintsBackdrop(pathname) && theme && (
          <div className={styles.background}>
            <HubBackdrop theme={theme} assetRoot={publicAsset("/assets/backgrounds/hub")} />
          </div>
        )}
        {children}
      </div>
    </HubThemeContext.Provider>
  );
}

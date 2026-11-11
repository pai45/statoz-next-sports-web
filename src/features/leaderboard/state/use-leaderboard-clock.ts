"use client";

import { useSyncExternalStore } from "react";

/**
 * The current minute, or null on the server and before hydration, so period
 * dates and countdowns render only once the browser has a clock to read.
 */

const minuteSnapshot = () => Math.floor(Date.now() / 60_000) * 60_000;
const serverSnapshot = () => null;

function subscribe(listener: () => void) {
  const timer = window.setInterval(listener, 60_000);
  window.addEventListener("pageshow", listener);
  document.addEventListener("visibilitychange", listener);
  return () => {
    window.clearInterval(timer);
    window.removeEventListener("pageshow", listener);
    document.removeEventListener("visibilitychange", listener);
  };
}

export function useLeaderboardClock(): number | null {
  return useSyncExternalStore(subscribe, minuteSnapshot, serverSnapshot);
}

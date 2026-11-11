"use client";

import { useEffect, useState } from "react";

import { formatResetCountdown, todayKey } from "./day";

/**
 * `hh:mm:ss` until the next daily drop, ticking once a second, plus today's
 * key so a page left open over midnight rolls over to the new day.
 *
 * Empty on the server and the first client render, so the prerendered HTML and
 * hydration agree; the clock fills in a frame later.
 */
export function useDailyCountdown(): { countdown: string; dayKey: string | null } {
  const [state, setState] = useState<{ countdown: string; dayKey: string | null }>({
    countdown: "",
    dayKey: null,
  });

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setState({ countdown: formatResetCountdown(now), dayKey: todayKey(now) });
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  return state;
}

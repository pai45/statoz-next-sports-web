"use client";
import { useEffect, useRef, useState } from "react";

/** One clock for the animation, countdown and transition, with resumable time. */
export function useStageTimer(stage: string, duration: number | null, paused: boolean, onDone: () => void) {
  const clock = useRef({ stage: "", remaining: 0 });
  const callback = useRef(onDone);
  const [remaining, setRemaining] = useState(duration ?? 0);
  useEffect(() => { callback.current = onDone; }, [onDone]);
  useEffect(() => {
    if (clock.current.stage !== stage) clock.current = { stage, remaining: duration ?? 0 };
    if (duration === null || paused) return;
    let previous = performance.now();
    let done = false;
    const tick = () => {
      const now = performance.now();
      clock.current.remaining = Math.max(0, clock.current.remaining - (now - previous));
      previous = now;
      setRemaining(clock.current.remaining);
      if (clock.current.remaining === 0 && !done) { done = true; clearInterval(id); callback.current(); }
    };
    const id = window.setInterval(tick, 40);
    return () => {
      clearInterval(id);
      if (!done) clock.current.remaining = Math.max(0, clock.current.remaining - (performance.now() - previous));
    };
  }, [stage, duration, paused]);
  return remaining;
}

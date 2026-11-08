"use client";

import { useEffect, useState } from "react";

import { usePrefersReducedMotion } from "../../shared/state/use-reduced-motion";

/**
 * The clocks the shootout runs on.
 *
 * Flutter drives the result scene from one AnimationController and reads every
 * beat off it as an Interval. That is what `useTimeline` is: a single
 * requestAnimationFrame loop producing normalised progress, which the scene
 * slices up rather than each element owning a timer of its own.
 *
 * None of these take a reset key. A timeline restarts by being mounted again,
 * so a caller that needs a fresh run gives the component a new `key` — which
 * keeps the hooks free of the state-resetting effects that pattern replaces.
 */

/**
 * Normalised progress across `durationMs`, starting when the component mounts.
 *
 * On reduced motion it reports its final frame immediately, which is what
 * Flutter's `disableAnimations` branch does rather than freezing the ball
 * halfway to the goal.
 */
export function useTimeline(durationMs: number): number {
  const reduced = usePrefersReducedMotion();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (reduced) return;

    let frame = 0;
    const started = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / durationMs);
      setProgress(t);
      if (t < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [durationMs, reduced]);

  return reduced ? 1 : progress;
}

/**
 * A timeline that loops instead of settling — the keeper's idle bob and the
 * aim preview. Reduced motion parks it at a representative frame rather than
 * running forever.
 */
export function useLoop(
  durationMs: number,
  active: boolean,
  parkedAt = 0,
): number {
  const reduced = usePrefersReducedMotion();
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (!active || reduced) return;

    let frame = 0;
    const started = performance.now();

    const tick = (now: number) => {
      setPhase(((now - started) % durationMs) / durationMs);
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, durationMs, reduced]);

  if (!active) return 0;
  return reduced ? parkedAt : phase;
}

/** A countdown ticking to zero from the moment it mounts. */
export function useCountdown(from: number, tickMs: number): number {
  const [remaining, setRemaining] = useState(from);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRemaining((value) => (value <= 0 ? 0 : value - 1));
    }, tickMs);
    return () => window.clearInterval(timer);
  }, [tickMs]);

  return remaining;
}

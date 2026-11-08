"use client";

import { useCallback, useEffect, useRef, type CSSProperties, type ReactNode } from "react";

import { BrandIcon } from "@statoz/design-system/web";
import { usePrefersReducedMotion } from "@/shared/hooks";
import { formatInt } from "@/shared/utils";

import styles from "./shop-acquire-overlay.module.css";

export type ShopAcquisition = {
  key: string;
  name: string;
  accent: string;
  coinsSpent: number;
  preview: ReactNode;
};

type OverlayStyle = CSSProperties & { "--acquire-accent": string; "--acquire-shake": string };

function clamp(value: number) {
  return Math.min(1, Math.max(0, value));
}

function easeOut(value: number) {
  const x1 = 0;
  const y1 = 0;
  const x2 = 0.58;
  const y2 = 1;
  const sample = (time: number, first: number, second: number) => {
    const inverse = 1 - time;
    return 3 * inverse * inverse * time * first + 3 * inverse * time * time * second + time * time * time;
  };
  let low = 0;
  let high = 1;
  let time = value;
  for (let index = 0; index < 12; index += 1) {
    time = (low + high) / 2;
    if (sample(time, x1, x2) < value) low = time;
    else high = time;
  }
  return sample(time, y1, y2);
}

export function ShopAcquireOverlay({ acquisition, onDismissed }: { acquisition: ShopAcquisition; onDismissed: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const dismissedRef = useRef(false);
  const dismissedCallbackRef = useRef(onDismissed);
  const reduceMotion = usePrefersReducedMotion();

  useEffect(() => {
    dismissedCallbackRef.current = onDismissed;
  }, [onDismissed]);

  const dismiss = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    dismissedCallbackRef.current();
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(dismiss, 2200);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [dismiss]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = rootRef.current;
    if (!canvas || !root || reduceMotion) return;

    const context = canvas.getContext("2d");
    if (!context) return;
    const size = 320;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * pixelRatio;
    canvas.height = size * pixelRatio;
    context.scale(pixelRatio, pixelRatio);

    const startedAt = performance.now();
    let animationFrame = 0;
    const paint = (now: number) => {
      const elapsed = now - startedAt;
      const particleProgress = clamp((elapsed - 90) / 1400);
      const shakeProgress = clamp((elapsed - 690) / 350);
      const shake = Math.sin(shakeProgress * Math.PI * 6) * 7 * (1 - shakeProgress);
      root.style.setProperty("--acquire-shake", `${shake}px`);

      context.clearRect(0, 0, size, size);
      if (elapsed >= 90 && particleProgress < 1) {
        const distanceProgress = easeOut(particleProgress);
        const accent = getComputedStyle(canvas).color;
        context.fillStyle = accent;
        context.globalAlpha = (1 - particleProgress) * 0.9;
        for (let index = 0; index < 26; index += 1) {
          const angle = (index / 26) * Math.PI * 2;
          const reach = index % 2 === 0 ? 147.2 : 147.2 * 0.78;
          const distance = distanceProgress * reach;
          const radius = 3.5 + (1 - particleProgress) * 3;
          const x = size / 2 + Math.cos(angle) * distance;
          const y = size / 2 + Math.sin(angle) * distance;
          context.beginPath();
          context.arc(x, y, radius, 0, Math.PI * 2);
          context.fill();
        }
        context.globalAlpha = 1;
      }

      if (elapsed < 1490 || shakeProgress < 1) animationFrame = window.requestAnimationFrame(paint);
    };
    animationFrame = window.requestAnimationFrame(paint);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [reduceMotion]);

  return (
    <div
      ref={rootRef}
      className={styles.root}
      style={{ "--acquire-accent": acquisition.accent, "--acquire-shake": "0px" } as OverlayStyle}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shop-acquired-name"
    >
      <div className={styles.vignette} />
      <button type="button" className={styles.dismissTarget} onClick={dismiss} aria-label="Dismiss acquired item animation" />
      <canvas ref={canvasRef} className={styles.particles} aria-hidden="true" />

      <div className={styles.centerColumn}>
        <p className={styles.acquiredLabel}>ACQUIRED</p>
        <div className={styles.previewMotion}>
          <div className={styles.previewGlow}>{acquisition.preview}</div>
        </div>
        <div className={styles.bannerOpacity}>
          <div className={styles.bannerSlide}>
            <h2 id="shop-acquired-name" className={styles.itemName}>{acquisition.name.toUpperCase()}</h2>
            {acquisition.coinsSpent > 0 ? (
              <div className={styles.spendRow}>
                <BrandIcon name="ozCoins" size={18} alt="" />
                <span>−{formatInt(acquisition.coinsSpent)}</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <p className={styles.continueLabel}>TAP TO CONTINUE</p>
    </div>
  );
}

export function CoinTopUpCelebration({ amount, onDone }: { amount: number; onDone: () => void }) {
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const timer = window.setTimeout(() => onDoneRef.current(), 1500);
    return () => window.clearTimeout(timer);
  }, []);

  return <div className={styles.coinTopUp} aria-live="assertive">+{formatInt(amount)} COINS</div>;
}

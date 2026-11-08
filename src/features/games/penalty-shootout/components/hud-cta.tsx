"use client";

import { hudClipPath, withAlpha } from "@statoz/design-system/web";

import styles from "./penalty-shootout.module.css";

/**
 * The lobby's hero action.
 *
 * A bright chamfered plate with a chevron compartment, a hairline divider, and
 * the label — carrying a halo that breathes while it waits to be pressed.
 * Flutter drives that halo from an AnimationController; here it is a CSS
 * animation, so the global reduced-motion damper stills it for free.
 *
 * The plate wears the design system's HUD chamfer rather than Flutter's
 * slightly stronger cut: it is the same silhouette every other action surface
 * in this app already uses, and a second set of measurements for one button
 * would put the shape out of step with the rest of the hardware.
 */

export type HudCtaProps = {
  label: string;
  accent: string;
  onClick: () => void;
  disabled?: boolean;
  /** Sits under the label — the lobby uses it for the squad hint. */
  helper?: string;
};

export function HudCta({
  label,
  accent,
  onClick,
  disabled = false,
  helper,
}: HudCtaProps) {
  const ink = "var(--ds-color-text-inverse)";
  const contentColor = disabled ? "var(--ds-color-text-muted)" : ink;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        disabled ? "" : styles.ctaGlow,
        "relative flex h-16 w-full items-center gap-3.5 px-4.5 text-left",
        disabled ? "cursor-not-allowed opacity-[0.58]" : "cursor-pointer",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        clipPath: hudClipPath,
        color: contentColor,
        background: disabled
          ? "linear-gradient(to bottom, var(--ds-color-background-secondary), var(--ds-color-background-elevated))"
          : `linear-gradient(to bottom, color-mix(in srgb, ${accent} 66%, #ffffff), ${accent})`,
        boxShadow: disabled
          ? "none"
          : `inset 0 0 0 1.4px ${withAlpha("#ffffff", 0.45)}`,
        // The halo's colour, read by the stylesheet's pulse.
        ["--cta-accent" as string]: accent,
      }}
    >
      <svg width={26} height={26} viewBox="0 0 24 24" aria-hidden fill="none">
        <path
          d="m6 5 7 7-7 7M13 5l7 7-7 7"
          stroke="currentColor"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <span
        aria-hidden
        className="h-7 w-px shrink-0"
        style={{ background: withAlpha(contentColor, 0.3) }}
      />

      <span className="flex min-w-0 flex-1 flex-col items-center">
        <span
          className="font-display font-black leading-compact"
          style={{
            fontSize: "var(--ds-text-md)",
            letterSpacing: "var(--ds-tracking-display)",
          }}
        >
          {label}
        </span>
        {helper ? (
          <span
            className="mt-1 font-bold leading-compact"
            style={{
              fontSize: "var(--ds-text-2xs)",
              color: withAlpha(contentColor, 0.75),
            }}
          >
            {helper}
          </span>
        ) : null}
      </span>
    </button>
  );
}

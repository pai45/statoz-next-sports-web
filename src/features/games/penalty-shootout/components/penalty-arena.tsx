"use client";

import { accentVar, withAlpha } from "@statoz/design-system/web";
import type { PlayerCard } from "@/domain/cards";

import {
  aimPreviewMs,
  arenaHeight,
  arenaWidth,
  crossbarY,
  goalLeft,
  goalWidth,
  groundY,
  keeperHeight,
  mouthHeight,
  spot,
  targetY,
  zoneX,
} from "../constants";
import { quadraticBezier } from "../../shared/engine/curves";
import { useLoop, useTimeline } from "../state/use-kick-timeline";
import {
  penaltyDirectionLabels,
  penaltyDirections,
  type PenaltyDirection,
  type ShootoutTurnRole,
} from "../types";

import { GoalNet, GoalStructure, PenaltyBall } from "./goal-frame";
import {
  KeeperRig,
  keeperVisualFor,
  type KeeperPose,
  type KeeperVisual,
} from "./keeper-rig";
import styles from "./penalty-shootout.module.css";

/**
 * The goal a player aims at, or defends.
 *
 * Flutter makes the whole third of the mouth tappable rather than the small
 * reticle drawn on it — a deliberate fat-finger target, and one that happens to
 * clear the 44px minimum here without any adjustment. The reticles stay purely
 * decorative.
 */

/** How long the keeper takes to settle into a newly picked dive. */
const leanMs = 180;

/** Where the ball's arc bends on its way to the target. */
function controlPoint(target: { x: number; y: number }) {
  return {
    x: (spot.x + target.x) / 2,
    y: crossbarY + mouthHeight * 0.04,
  };
}

/** A percentage of the arena box, so HTML chrome can sit over the drawing. */
function across(x: number): string {
  return `${(x / arenaWidth) * 100}%`;
}

function down(y: number): string {
  return `${(y / arenaHeight) * 100}%`;
}

/**
 * The keeper in this goal. Selecting a dive eases them into it over `leanMs`
 * rather than snapping, so a pick reads as a decision being made.
 */
function ArenaKeeper({
  visual,
  pose,
  direction,
  leaning,
  idlePhase,
}: {
  visual: KeeperVisual;
  pose: KeeperPose;
  direction: PenaltyDirection;
  leaning: boolean;
  idlePhase: number;
}) {
  const lean = useTimeline(leanMs);

  return (
    <KeeperRig
      anchor={{ x: goalLeft + goalWidth / 2, y: groundY }}
      height={keeperHeight}
      visual={visual}
      pose={pose}
      direction={direction}
      progress={leaning ? lean : 0}
      idlePhase={idlePhase}
    />
  );
}

function Reticle({
  direction,
  active,
  accent,
}: {
  direction: PenaltyDirection;
  active: boolean;
  accent: string;
}) {
  const x = zoneX[direction];
  const half = 30;
  const tick = 10;
  const stroke = active ? 2 : 1.4;
  const color = withAlpha(accent, active ? 1 : 0.42);

  const corners = [
    [x - half, targetY - half, 1, 1],
    [x + half, targetY - half, -1, 1],
    [x - half, targetY + half, 1, -1],
    [x + half, targetY + half, -1, -1],
  ] as const;

  return (
    <g aria-hidden>
      {corners.map(([cx, cy, sx, sy], index) => (
        <path
          key={index}
          d={`M ${cx + sx * tick} ${cy} L ${cx} ${cy} L ${cx} ${cy + sy * tick}`}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
        />
      ))}
      <circle
        cx={x}
        cy={targetY}
        r={7}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
      />
      {active ? <circle cx={x} cy={targetY} r={2.4} fill={color} /> : null}
    </g>
  );
}

/**
 * The looping preview of where a chosen shot would go: a dotted arc, a ghost
 * ball running it, and the real ball sitting faint on the spot behind.
 */
function AimPreview({
  direction,
  accent,
}: {
  direction: PenaltyDirection;
  accent: string;
}) {
  const phase = useLoop(aimPreviewMs, true, 0.78);
  const target = { x: zoneX[direction], y: targetY };
  const control = controlPoint(target);

  const dots = [1, 2, 3, 4, 5].map((index) =>
    quadraticBezier(spot, control, target, index / 6),
  );
  const flying = quadraticBezier(spot, control, target, phase);
  const trails = [
    { lag: 0.14, alpha: 0.13 },
    { lag: 0.07, alpha: 0.25 },
  ];

  return (
    <g aria-hidden>
      <path
        d={`M ${spot.x} ${spot.y} Q ${control.x} ${control.y} ${target.x} ${target.y}`}
        fill="none"
        stroke={withAlpha(accent, 0.22)}
        strokeWidth={1.5}
        strokeDasharray="3 5"
      />
      {dots.map((dot, index) => (
        <circle
          key={index}
          cx={dot.x}
          cy={dot.y}
          r={1.8}
          fill={withAlpha(accent, 0.38)}
        />
      ))}
      <PenaltyBall position={spot} scale={0.82} alpha={0.28} />
      {trails.map((trail, index) => {
        const point = quadraticBezier(
          spot,
          control,
          target,
          Math.max(0, phase - trail.lag),
        );
        return (
          <PenaltyBall
            key={index}
            position={point}
            scale={0.9}
            alpha={trail.alpha}
          />
        );
      })}
      <PenaltyBall position={flying} />
    </g>
  );
}

export type PenaltyArenaProps = {
  role: ShootoutTurnRole;
  /** The keeper standing in this goal — the CPU's, or the player's own. */
  keeper: PlayerCard;
  selected: PenaltyDirection | null;
  onSelect: (direction: PenaltyDirection) => void;
};

export function PenaltyArena({
  role,
  keeper,
  selected,
  onSelect,
}: PenaltyArenaProps) {
  const shooting = role === "shooting";
  const accent = accentVar(shooting ? "cyan" : "orange");
  const visual = keeperVisualFor(keeper, !shooting);

  // The keeper breathes only while waiting; a committed lean holds still.
  const idlePhase = useLoop(1600, !shooting && selected === null);

  const pose: KeeperPose =
    !shooting && selected
      ? selected === "center"
        ? "smother"
        : "anticipate"
      : "ready";

  const washThird = goalWidth / 3;
  const washX =
    selected === "left"
      ? goalLeft
      : selected === "center"
        ? goalLeft + washThird
        : goalLeft + washThird * 2;

  return (
    <div className="flex flex-col gap-3">
      <div
        className="relative w-full"
        style={{ aspectRatio: `${arenaWidth} / ${arenaHeight}` }}
      >
        <svg
          viewBox={`0 0 ${arenaWidth} ${arenaHeight}`}
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 h-full w-full"
          role="presentation"
        >
          {selected ? (
            <rect
              x={washX}
              y={crossbarY}
              width={washThird}
              height={mouthHeight}
              fill={withAlpha(accentVar("cyan"), 0.14)}
            />
          ) : null}

          <GoalNet />
          <GoalStructure />

          <ArenaKeeper
            // A new selection remounts the lean, which is what restarts it.
            key={selected ?? "none"}
            visual={visual}
            pose={pose}
            direction={selected ?? "center"}
            leaning={!shooting && selected !== null}
            idlePhase={idlePhase}
          />

          {shooting && selected ? (
            <AimPreview direction={selected} accent={accent} />
          ) : (
            <PenaltyBall position={spot} />
          )}

          {shooting
            ? penaltyDirections.map((direction) => (
                <Reticle
                  key={direction}
                  direction={direction}
                  active={selected === direction}
                  accent={accent}
                />
              ))
            : null}
        </svg>

        {/*
         * Shooting puts the targets on the goal itself. Each is a full-height
         * third rather than the reticle drawn inside it.
         */}
        {shooting ? (
          <div className="absolute inset-0 flex">
            {penaltyDirections.map((direction) => (
              <button
                key={direction}
                type="button"
                onClick={() => onSelect(direction)}
                aria-pressed={selected === direction}
                aria-label={`Shoot ${penaltyDirectionLabels[direction].toLowerCase()}`}
                className={`${styles.zone} flex-1 cursor-pointer`}
              />
            ))}
          </div>
        ) : null}

        {shooting
          ? penaltyDirections.map((direction) => (
              <span
                key={direction}
                aria-hidden
                className="pointer-events-none absolute -translate-x-1/2 px-2 py-1 text-center font-display font-extrabold leading-compact"
                style={{
                  left: across(zoneX[direction]),
                  top: down(targetY + 33),
                  minWidth: across(78),
                  fontSize: "var(--ds-text-2xs)",
                  letterSpacing: "var(--ds-tracking-label)",
                  color:
                    selected === direction
                      ? accent
                      : "var(--ds-color-text-muted)",
                  background:
                    selected === direction
                      ? withAlpha(accent, 0.16)
                      : withAlpha("var(--ds-color-background-muted)", 0.34),
                  border: `1px solid ${
                    selected === direction
                      ? withAlpha(accent, 0.45)
                      : withAlpha("var(--ds-color-border-strong)", 0.18)
                  }`,
                }}
              >
                {penaltyDirectionLabels[direction]}
              </span>
            ))
          : null}
      </div>

      {/*
       * Defending gets explicit pads instead. The goal is the CPU's to aim at,
       * so making it tappable would suggest the player picks the shot.
       */}
      {!shooting ? (
        <div className="flex gap-2">
          {penaltyDirections.map((direction) => {
            const active = selected === direction;
            return (
              <button
                key={direction}
                type="button"
                onClick={() => onSelect(direction)}
                aria-pressed={active}
                className="flex min-h-15 flex-1 cursor-pointer flex-col items-center justify-center gap-1.5 px-1 py-2 font-display font-extrabold leading-compact transition-colors"
                style={{
                  fontSize: "var(--ds-text-2xs)",
                  letterSpacing: "var(--ds-tracking-label)",
                  borderRadius: "var(--ds-radius-sm)",
                  color: active ? accent : "var(--ds-color-text-default)",
                  background: active
                    ? withAlpha(accent, 0.18)
                    : withAlpha("var(--ds-color-background-secondary)", 0.86),
                  border: `1px solid ${
                    active
                      ? withAlpha(accent, 0.72)
                      : withAlpha("var(--ds-color-border-strong)", 0.42)
                  }`,
                }}
              >
                <DivePadGlyph direction={direction} />
                {direction === "center"
                  ? "HOLD CENTER"
                  : `DIVE ${penaltyDirectionLabels[direction]}`}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

/** Chevrons for a dive, a shield for holding the middle. */
function DivePadGlyph({ direction }: { direction: PenaltyDirection }) {
  if (direction === "center") {
    return (
      <svg width={20} height={20} viewBox="0 0 24 24" aria-hidden fill="none">
        <path
          d="M12 3 4 6v6c0 4.4 3.4 8.2 8 9 4.6-.8 8-4.6 8-9V6l-8-3Z"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  const flip = direction === "right";
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      aria-hidden
      fill="none"
      style={flip ? { transform: "scaleX(-1)" } : undefined}
    >
      <path
        d="M17 5 10 12l7 7M11 5 4 12l7 7"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

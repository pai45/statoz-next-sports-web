"use client";

import { accentVar, withAlpha } from "@statoz/design-system/web";

import { emblemLoopMs } from "../constants";
import { easeIn, easeOutCubic, interval, lerp, quadraticBezier } from "../../shared/engine/curves";
import { useLoop } from "../state/use-kick-timeline";

/**
 * The Penalty Shootout brand mark.
 *
 * A targeting reticle sweeps from the middle of the goal to an upper corner and
 * locks, the ball fires into it on a curved strike, the net flashes, and the
 * whole thing resets — alternating corners each cycle. One loop is two strikes.
 *
 * It has its own goal geometry, deliberately squarer than the arena's, because
 * it has to read as a mark at 92px rather than as a pitch.
 */

/** The emblem draws in a 100-unit square and scales with the element. */
const s = 100;

const left = s * 0.18;
const right = s * 0.82;
const crossbarY = s * 0.3;
const groundY = s * 0.64;
const mouthWidth = right - left;
const mouthHeight = groundY - crossbarY;
const spot = { x: s * 0.5, y: s * 0.86 };
const restingReticle = { x: s * 0.5, y: crossbarY + mouthHeight * 0.45 };

const ringRadius = s * 0.46;
const reticleRadius = s * 0.11;
const ballRadius = s * 0.05;

const netColumns = 6;
const netRows = 4;

const lime = accentVar("lime");
const cyan = accentVar("cyan");

type Point = { x: number; y: number };

function ripple(point: Point, centre: Point, impact: number): Point {
  if (impact <= 0 || impact >= 1) return point;

  const dx = point.x - centre.x;
  const dy = point.y - centre.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 0.5) return point;

  const amp =
    4 * Math.sin(impact * Math.PI) * Math.exp(-(distance * distance) / (2 * 16 * 16));
  return {
    x: point.x + (dx / distance) * amp,
    y: point.y + (dy / distance) * amp,
  };
}

export type ShootoutEmblemProps = {
  /** Rendered size in px. The drawing scales; the geometry does not change. */
  size?: number;
  className?: string;
};

export function ShootoutEmblem({ size = 92, className }: ShootoutEmblemProps) {
  // Reduced motion parks the loop mid-strike, with the reticle locked and the
  // ball already in the corner — the frame that best explains the mark.
  const t = useLoop(emblemLoopMs, true, 0.32);

  const aimRight = t >= 0.5;
  const lt = (t % 0.5) / 0.5;

  const aim = easeOutCubic(interval(lt, 0, 0.3));
  const flight = easeIn(interval(lt, 0.32, 0.56));
  const impact = interval(lt, 0.56, 0.74);
  const reset = easeIn(interval(lt, 0.8, 1));
  const locked = lt >= 0.3 && lt < 0.8;

  const target: Point = {
    x: aimRight ? right - mouthWidth * 0.16 : left + mouthWidth * 0.16,
    y: crossbarY + mouthHeight * 0.26,
  };

  // The reticle rides out on `aim` and is pulled back by `reset`.
  const reticleT = aim - reset * aim;
  const reticle: Point = {
    x: lerp(restingReticle.x, target.x, reticleT),
    y: lerp(restingReticle.y, target.y, reticleT),
  };

  const control: Point = {
    x: (spot.x + target.x) / 2,
    y: crossbarY + mouthHeight * 0.1,
  };

  // The scanning tick: a short bright arc walking the ring once per loop.
  const sweep = t * 2 * Math.PI;
  const arcFrom = {
    x: s / 2 + Math.cos(sweep) * ringRadius,
    y: s / 2 + Math.sin(sweep) * ringRadius,
  };
  const arcTo = {
    x: s / 2 + Math.cos(sweep + 0.6) * ringRadius,
    y: s / 2 + Math.sin(sweep + 0.6) * ringRadius,
  };

  const netLines: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (let index = 1; index < netColumns; index += 1) {
    const x = left + (mouthWidth * index) / netColumns;
    const a = ripple({ x, y: crossbarY }, target, impact);
    const b = ripple({ x, y: groundY }, target, impact);
    netLines.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
  }
  for (let index = 1; index < netRows; index += 1) {
    const y = crossbarY + (mouthHeight * index) / netRows;
    const a = ripple({ x: left, y }, target, impact);
    const b = ripple({ x: right, y }, target, impact);
    netLines.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
  }

  const reticleColor = locked ? lime : "rgb(255 255 255 / 80%)";
  const reticleStroke = locked ? 2 : 1.4;
  const tick = reticleRadius * 0.55;

  return (
    <svg
      viewBox={`0 0 ${s} ${s}`}
      width={size}
      height={size}
      className={className}
      aria-hidden
      focusable="false"
      style={{ flexShrink: 0 }}
    >
      {/* Outer HUD ring, with the scanning tick riding it. */}
      <circle
        cx={s / 2}
        cy={s / 2}
        r={ringRadius}
        fill="none"
        stroke={withAlpha(lime, 0.22)}
        strokeWidth={1}
      />
      <path
        d={`M ${arcFrom.x} ${arcFrom.y} A ${ringRadius} ${ringRadius} 0 0 1 ${arcTo.x} ${arcTo.y}`}
        fill="none"
        stroke={withAlpha(lime, 0.6)}
        strokeWidth={2}
        strokeLinecap="round"
      />

      {netLines.map((line, index) => (
        <line
          key={index}
          {...line}
          stroke={withAlpha(cyan, 0.16)}
          strokeWidth={0.8}
        />
      ))}

      <path
        d={`M ${left} ${groundY} L ${left} ${crossbarY} L ${right} ${crossbarY} L ${right} ${groundY}`}
        fill="none"
        stroke="rgb(255 255 255 / 92%)"
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Reticle: four corner ticks, a ring, and a dot once it has locked. */}
      <g stroke={reticleColor} strokeWidth={reticleStroke} fill="none">
        {[-1, 1].map((sx) =>
          [-1, 1].map((sy) => {
            const cx = reticle.x + sx * reticleRadius;
            const cy = reticle.y + sy * reticleRadius;
            return (
              <path
                key={`${sx}-${sy}`}
                d={`M ${cx - sx * tick} ${cy} L ${cx} ${cy} L ${cx} ${cy - sy * tick}`}
              />
            );
          }),
        )}
        <circle cx={reticle.x} cy={reticle.y} r={reticleRadius * 0.42} />
      </g>
      {locked ? (
        <circle
          cx={reticle.x}
          cy={reticle.y}
          r={reticleRadius * (0.12 + 0.16 * Math.sin(impact * Math.PI))}
          fill={lime}
        />
      ) : null}

      {/* Ball: waits on the spot, arcs into the corner, fades on the reset. */}
      {lt < 0.56 ? (
        <>
          {flight > 0
            ? [
                { lag: 0.18, alpha: 0.1 },
                { lag: 0.09, alpha: 0.22 },
              ].map((trail) => {
                const u = Math.min(1, Math.max(0, flight - trail.lag));
                if (u <= 0) return null;
                return (
                  <EmblemBall
                    key={trail.lag}
                    at={quadraticBezier(spot, control, target, u)}
                    alpha={trail.alpha}
                  />
                );
              })
            : null}
          <EmblemBall at={quadraticBezier(spot, control, target, flight)} alpha={1} />
        </>
      ) : (
        <EmblemBall at={target} alpha={Math.min(1, Math.max(0, 1 - reset))} />
      )}

      {impact > 0 && impact < 1 ? (
        <circle
          cx={target.x}
          cy={target.y}
          r={s * (0.04 + 0.12 * impact)}
          fill="none"
          stroke={withAlpha(lime, 0.85 * (1 - impact))}
          strokeWidth={2.2}
        />
      ) : null}
    </svg>
  );
}

function EmblemBall({ at, alpha }: { at: Point; alpha: number }) {
  return (
    <>
      <circle
        cx={at.x}
        cy={at.y}
        r={ballRadius}
        fill={`rgb(255 255 255 / ${95 * alpha}%)`}
      />
      <circle
        cx={at.x}
        cy={at.y}
        r={ballRadius * 0.5}
        fill="none"
        stroke={withAlpha("var(--ds-color-background-muted)", 0.8 * alpha)}
        strokeWidth={1}
      />
    </>
  );
}

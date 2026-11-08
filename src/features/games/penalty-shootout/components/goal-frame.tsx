import { GoalMouthStructure, accentVar, withAlpha } from "@statoz/design-system/web";

import {
  arenaWidth,
  ballRadius,
  crossbarY,
  goalLeft,
  goalRight,
  goalWidth,
  groundY,
  mouthHeight,
  netColumns,
  netRows,
  netSamples,
  rippleAmplitude,
  rippleSpread,
  spot,
} from "../constants";

/**
 * The goal itself: net, posts, crossbar, ground line, spot, and ball.
 *
 * Every piece is shared between the choose arena and the result scene, so the
 * goal a player aims at is drawn by the same code that the ball then hits.
 */

type Point = { x: number; y: number };

export type Ripple = {
  center: Point;
  /** 0..1 through the ripple. Outside that range the net sits still. */
  t: number;
};

/**
 * Pushes a point radially away from the impact, falling off as a gaussian.
 * This is what makes the net bulge around the ball rather than shear.
 */
function displace(point: Point, ripple: Ripple | undefined): Point {
  if (!ripple || ripple.t <= 0 || ripple.t >= 1) return point;

  const dx = point.x - ripple.center.x;
  const dy = point.y - ripple.center.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 1) return point;

  const amp =
    rippleAmplitude *
    Math.sin(ripple.t * Math.PI) *
    Math.exp(-(distance * distance) / (2 * rippleSpread * rippleSpread));

  return {
    x: point.x + (dx / distance) * amp,
    y: point.y + (dy / distance) * amp,
  };
}

/** One net line, sampled so the ripple has something to bend. */
function netLine(from: Point, to: Point, ripple: Ripple | undefined): string {
  const points: string[] = [];
  for (let index = 0; index <= netSamples - 1; index += 1) {
    const t = index / (netSamples - 1);
    const sample = displace(
      { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t },
      ripple,
    );
    points.push(`${sample.x.toFixed(2)} ${sample.y.toFixed(2)}`);
  }
  return `M ${points.join(" L ")}`;
}

export function GoalNet({ ripple }: { ripple?: Ripple }) {
  const lines: string[] = [];

  for (let index = 1; index < netColumns; index += 1) {
    const x = goalLeft + (goalWidth * index) / netColumns;
    lines.push(netLine({ x, y: crossbarY }, { x, y: groundY }, ripple));
  }
  for (let index = 1; index < netRows; index += 1) {
    const y = crossbarY + (mouthHeight * index) / netRows;
    lines.push(netLine({ x: goalLeft, y }, { x: goalRight, y }, ripple));
  }

  const showRing = ripple && ripple.t > 0 && ripple.t < 1;

  return (
    <g aria-hidden>
      {lines.map((d, index) => (
        <path
          key={index}
          d={d}
          fill="none"
          stroke={withAlpha(accentVar("cyan"), 0.2)}
          strokeWidth={1}
        />
      ))}
      {showRing ? (
        <circle
          cx={ripple.center.x}
          cy={ripple.center.y}
          r={8 + 34 * ripple.t}
          fill="none"
          stroke={withAlpha(accentVar("lime"), 0.5 * (1 - ripple.t))}
          strokeWidth={2}
        />
      ) : null}
    </g>
  );
}

/** Posts and crossbar over the net, the ground line, and the penalty spot. */
export function GoalStructure() {
  return (
    <g aria-hidden>
      <g stroke="rgb(255 255 255 / 92%)" strokeLinecap="round" strokeLinejoin="round">
        <GoalMouthStructure left={goalLeft} right={goalRight} top={crossbarY} bottom={groundY} />
      </g>
      <line
        x1={0}
        y1={groundY}
        x2={arenaWidth}
        y2={groundY}
        stroke={withAlpha(accentVar("cyan"), 0.35)}
        strokeWidth={1.5}
      />
      <circle cx={spot.x} cy={spot.y} r={2.5} fill="rgb(255 255 255 / 70%)" />
    </g>
  );
}

export type PenaltyBallProps = {
  position: Point;
  scale?: number;
  alpha?: number;
};

/** The ball, with the seam that makes it read as one at eight pixels across. */
export function PenaltyBall({
  position,
  scale = 1,
  alpha = 1,
}: PenaltyBallProps) {
  const r = ballRadius * scale;
  const seamRadius = r * 0.85;
  const from = {
    x: position.x + Math.cos(0.6) * seamRadius,
    y: position.y + Math.sin(0.6) * seamRadius,
  };
  const to = {
    x: position.x + Math.cos(2.2) * seamRadius,
    y: position.y + Math.sin(2.2) * seamRadius,
  };
  const seam = withAlpha("var(--ds-color-background-muted)", 0.85 * alpha);

  return (
    <g aria-hidden>
      <circle
        cx={position.x}
        cy={position.y}
        r={r}
        fill={`rgb(255 255 255 / ${95 * alpha}%)`}
      />
      <circle
        cx={position.x}
        cy={position.y}
        r={r * 0.45}
        fill="none"
        stroke={seam}
        strokeWidth={1.2}
      />
      <path
        d={`M ${from.x} ${from.y} A ${seamRadius} ${seamRadius} 0 0 1 ${to.x} ${to.y}`}
        fill="none"
        stroke={seam}
        strokeWidth={1.2}
      />
    </g>
  );
}

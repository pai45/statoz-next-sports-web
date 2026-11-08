import { accentVar, rarityVar } from "@statoz/design-system/web";
import type { PlayerCard } from "@/domain/cards";

import { lerp } from "../../shared/engine/curves";
import type { PenaltyDirection } from "../types";

/**
 * The procedural goalkeeper.
 *
 * Flutter paints this with a CustomPainter and no sprite at all — a skeleton of
 * six points, two-segment limbs, and oversized gloves. The same skeleton is
 * expressed here as SVG so the kit can be a design token rather than a hex
 * baked into a canvas call, and so the whole rig scales with the goal.
 */

export type KeeperPose =
  | "ready"
  | "anticipate"
  | "dive"
  | "smother"
  | "catching"
  | "beaten";

/** The ink the rig is outlined in — darker than any background token. */
const ink = "#05070b";

/** Flutter's `rigDarken`: lerp a colour toward the outline ink. */
function darken(color: string, amount: number): string {
  return `color-mix(in srgb, ${color} ${(1 - amount) * 100}%, ${ink})`;
}

export type KeeperVisual = {
  primary: string;
  secondary: string;
  skin: string;
  hair: string;
  gloves: string;
};

const skinTones = ["#f2c6a0", "#d99a72", "#b96f4f", "#7b432f", "#4a2b23"];
const hairTones = ["#171b24", "#33241e", "#5a3828", "#d4a45d"];

/**
 * A stable identity from a card. It suggests a character rather than a
 * likeness — at this scale nothing more would read anyway — and the same card
 * always produces the same keeper.
 *
 * The hash is kept inside 32 bits rather than following Dart's unbounded
 * integer, since it only has to be stable, not identical across the two apps.
 */
export function keeperVisualFor(
  card: PlayerCard | undefined,
  userSide: boolean,
): KeeperVisual {
  const id = card?.id ?? "keeper";
  let hash = 17;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) | 0;
  }
  const positive = Math.abs(hash);

  return {
    primary: accentVar(userSide ? "cyan" : "orange"),
    // Platinum takes its deep shade: the base one is cyan, which would vanish
    // into the player's own jersey.
    secondary:
      card?.tier === "platinum"
        ? rarityVar("platinum", "deep")
        : rarityVar(card?.tier ?? "bronze"),
    skin: skinTones[positive % skinTones.length],
    hair: hairTones[Math.floor(positive / 7) % hairTones.length],
    gloves: userSide ? "#e7fbff" : "#fff2d8",
  };
}

type Point = { x: number; y: number };

function signOf(direction: PenaltyDirection): number {
  if (direction === "left") return -1;
  if (direction === "right") return 1;
  return 0;
}

function add(point: Point, dx: number, dy: number): Point {
  return { x: point.x + dx, y: point.y + dy };
}

function lerpPoint(from: Point, to: Point, t: number): Point {
  return { x: lerp(from.x, to.x, t), y: lerp(from.y, to.y, t) };
}

type LimbProps = {
  from: Point;
  to: Point;
  /** Which way the joint buckles: negative for knees, positive for elbows. */
  bend: number;
  upper: string;
  upperWidth: number;
  lower: string;
  lowerWidth: number;
  overlay?: string;
  boot?: string;
};

/**
 * A two-segment limb whose joint is the midpoint pushed along the segment
 * normal — enough of an inverse-kinematic cheat to give the keeper readable
 * knees and elbows without any rigging.
 */
function Limb({
  from,
  to,
  bend,
  upper,
  upperWidth,
  lower,
  lowerWidth,
  overlay,
  boot,
}: LimbProps) {
  const mid = lerpPoint(from, to, 0.5);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  const normal =
    length > 0.001 ? { x: -dy / length, y: dx / length } : { x: 1, y: 0 };
  const joint = { x: mid.x + normal.x * bend, y: mid.y + normal.y * bend };
  const overlayEnd = lerpPoint(joint, to, 0.5);

  return (
    <>
      <line
        x1={from.x}
        y1={from.y}
        x2={joint.x}
        y2={joint.y}
        stroke={upper}
        strokeWidth={upperWidth}
        strokeLinecap="round"
      />
      <line
        x1={joint.x}
        y1={joint.y}
        x2={to.x}
        y2={to.y}
        stroke={lower}
        strokeWidth={lowerWidth}
        strokeLinecap="round"
      />
      {overlay ? (
        <line
          x1={joint.x}
          y1={joint.y}
          x2={overlayEnd.x}
          y2={overlayEnd.y}
          stroke={overlay}
          strokeWidth={lowerWidth * 0.62}
          strokeLinecap="round"
        />
      ) : null}
      {boot ? (
        <rect
          x={to.x - lowerWidth * 0.9}
          y={to.y - lowerWidth * 0.42}
          width={lowerWidth * 1.9}
          height={lowerWidth * 0.85}
          rx={lowerWidth * 0.3}
          fill={boot}
        />
      ) : null}
    </>
  );
}

export type KeeperRigProps = {
  /** The midpoint between the boots when the keeper stands on the goal line. */
  anchor: Point;
  /** Head to boot, in arena units. Everything else scales off this. */
  height: number;
  visual: KeeperVisual;
  pose: KeeperPose;
  direction: PenaltyDirection;
  /** How far into the pose, 0..1. */
  progress?: number;
  /** 0..1 around the idle bob loop. Only read while the pose is `ready`. */
  idlePhase?: number;
  /** Where the ball actually is, so a save closes the gloves around it. */
  intercept?: Point;
};

export function KeeperRig({
  anchor,
  height,
  visual,
  pose,
  direction,
  progress = 1,
  idlePhase = 0,
  intercept,
}: KeeperRigProps) {
  const p = Math.min(1, Math.max(0, progress));
  const s = height / 150;
  const sign = signOf(direction);

  const diving = pose === "dive" || pose === "catching" || pose === "beaten";
  const centerAction =
    direction === "center" && (pose === "smother" || pose === "catching");
  const anticipating = pose === "anticipate";
  const idle = pose === "ready" ? Math.sin(idlePhase * Math.PI * 2) : 0;

  const travel = diving ? 43 * s * p : anticipating ? 9 * s * p : 0;
  const crouch = centerAction ? 16 * s * p : 0;
  const rotation = diving ? sign * 0.92 * p : sign * 0.08 * p;

  const hip: Point = { x: 0, y: -48 * s };
  const shoulder: Point = {
    x: (diving ? sign * 5 * p : sign * 2 * p) * s,
    y: -91 * s,
  };
  const head = add(shoulder, sign * 2 * s, -21 * s);
  const leftFoot: Point = { x: -18 * s, y: 0 };
  const rightFoot: Point = { x: 18 * s, y: 0 };

  let leftHand = add(shoulder, -35 * s, -5 * s);
  let rightHand = add(shoulder, 35 * s, -5 * s);

  if (anticipating) {
    leftHand = add(leftHand, sign * 7 * s, -4 * s * p);
    rightHand = add(rightHand, sign * 7 * s, -4 * s * p);
  }
  if (diving) {
    const reach = 23 * s * p;
    leftHand = add(leftHand, sign * reach, -18 * s * p);
    rightHand = add(rightHand, sign * reach, -18 * s * p);
  }
  if (centerAction) {
    leftHand = add(shoulder, -15 * s, 20 * s * p);
    rightHand = add(shoulder, 15 * s, 20 * s * p);
  }

  // On a save, close both gloves around where the ball really is. The ball is
  // given in arena space, so it has to be walked back through this rig's own
  // translate and rotate before the hands can be blended toward it.
  if (intercept && (pose === "catching" || pose === "smother")) {
    const globalX = anchor.x + sign * travel;
    const globalY = anchor.y - crouch + idle * s;
    const deltaX = intercept.x - globalX;
    const deltaY = intercept.y - globalY;
    const cos = Math.cos(-rotation);
    const sin = Math.sin(-rotation);
    const local: Point = {
      x: deltaX * cos - deltaY * sin,
      y: deltaX * sin + deltaY * cos,
    };
    const lock = Math.min(1, Math.max(0, (p - 0.55) / 0.45));
    leftHand = lerpPoint(leftHand, add(local, -6 * s, 0), lock);
    rightHand = lerpPoint(rightHand, add(local, 6 * s, 0), lock);
  }

  const farKit = darken(visual.primary, 0.34);
  const socks = darken(visual.primary, 0.18);
  const shorts = darken(visual.primary, 0.28);

  const torso = [
    `M ${shoulder.x - 18 * s} ${shoulder.y - 3 * s}`,
    `L ${shoulder.x + 18 * s} ${shoulder.y - 3 * s}`,
    `L ${hip.x + 14 * s} ${hip.y + 5 * s}`,
    `L ${hip.x - 14 * s} ${hip.y + 5 * s}`,
    "Z",
  ].join(" ");

  const hairArc = [
    `M ${head.x - 9.5 * s} ${head.y - 2 * s}`,
    `A ${9.5 * s} ${9.5 * s} 0 0 1 ${head.x + 9.5 * s} ${head.y - 2 * s}`,
    "Z",
  ].join(" ");

  const transform = [
    `translate(${anchor.x + sign * travel} ${anchor.y - crouch + idle * s})`,
    `rotate(${(rotation * 180) / Math.PI})`,
  ].join(" ");

  return (
    <g transform={transform}>
      {/* Legs, far side first, so the near one reads as in front. */}
      <Limb
        from={add(hip, -5 * s, 0)}
        to={leftFoot}
        bend={-10 * s}
        upper={farKit}
        upperWidth={9 * s}
        lower={socks}
        lowerWidth={7 * s}
        overlay={visual.secondary}
        boot="#101722"
      />
      <Limb
        from={add(hip, 5 * s, 0)}
        to={rightFoot}
        bend={10 * s}
        upper={visual.primary}
        upperWidth={10 * s}
        lower={socks}
        lowerWidth={7 * s}
        overlay={visual.secondary}
        boot="#101722"
      />

      {/* Arms take a dark outline pass before the coloured articulated one. */}
      <line
        x1={shoulder.x - 13 * s}
        y1={shoulder.y}
        x2={leftHand.x}
        y2={leftHand.y}
        stroke={ink}
        strokeWidth={12 * s}
        strokeLinecap="round"
      />
      <line
        x1={shoulder.x + 13 * s}
        y1={shoulder.y}
        x2={rightHand.x}
        y2={rightHand.y}
        stroke={ink}
        strokeWidth={12 * s}
        strokeLinecap="round"
      />
      <Limb
        from={add(shoulder, -13 * s, 0)}
        to={leftHand}
        bend={-8 * s}
        upper={farKit}
        upperWidth={9 * s}
        lower={visual.skin}
        lowerWidth={7 * s}
        overlay={visual.secondary}
      />
      <Limb
        from={add(shoulder, 13 * s, 0)}
        to={rightHand}
        bend={8 * s}
        upper={visual.primary}
        upperWidth={10 * s}
        lower={visual.skin}
        lowerWidth={7 * s}
        overlay={visual.secondary}
      />

      {/* Broad angular jersey, chest stripe, and padded shorts. */}
      <path
        d={torso}
        fill={visual.primary}
        stroke={ink}
        strokeWidth={5 * s}
        strokeLinejoin="round"
      />
      <line
        x1={shoulder.x - 13 * s}
        y1={shoulder.y + 8 * s}
        x2={shoulder.x + 13 * s}
        y2={shoulder.y + 8 * s}
        stroke={visual.secondary}
        strokeWidth={3 * s}
        strokeLinecap="round"
      />
      <rect
        x={hip.x - 15.5 * s}
        y={hip.y - 4 * s}
        width={31 * s}
        height={18 * s}
        rx={5 * s}
        fill={shorts}
      />

      {/* Head, hair, and an eye line that carries expression at game scale. */}
      <circle cx={head.x} cy={head.y} r={12 * s} fill={ink} />
      <circle cx={head.x} cy={head.y} r={9.5 * s} fill={visual.skin} />
      <path d={hairArc} fill={visual.hair} />
      <line
        x1={head.x - 4 * s}
        y1={head.y + 1 * s}
        x2={head.x + 4 * s}
        y2={head.y + 1 * s}
        stroke={darken(visual.hair, 0.1)}
        strokeWidth={1.4 * s}
        strokeLinecap="round"
      />

      {/* Oversized gloves — the visual focus of the whole character. */}
      {[leftHand, rightHand].map((hand, index) => (
        <g key={index}>
          <circle cx={hand.x} cy={hand.y} r={8.2 * s} fill={ink} />
          <circle cx={hand.x} cy={hand.y} r={6.1 * s} fill={visual.gloves} />
          <line
            x1={hand.x - 3 * s}
            y1={hand.y}
            x2={hand.x + 3 * s}
            y2={hand.y}
            stroke={visual.secondary}
            strokeWidth={1.6 * s}
            strokeLinecap="round"
          />
        </g>
      ))}
    </g>
  );
}

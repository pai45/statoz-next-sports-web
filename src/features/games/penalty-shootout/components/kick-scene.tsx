"use client";

import { accentVar, feedbackVar, withAlpha } from "@statoz/design-system/web";

import {
  arenaWidth,
  ballTrails,
  crossbarY,
  goalLeft,
  goalWidth,
  groundY,
  keeperHeight,
  mouthHeight,
  resultSceneMs,
  sceneBallDrop,
  sceneBallFlight,
  sceneBallSettle,
  sceneFlash,
  sceneHeight,
  sceneImpact,
  sceneKeeperDive,
  sceneRipple,
  sceneShake,
  sceneSparks,
  sceneVerdict,
  spot,
  targetY,
  zoneX,
} from "../constants";
import {
  easeIn,
  easeOut,
  easeOutBack,
  easeOutCubic,
  interval,
  quadraticBezier,
} from "../../shared/engine/curves";
import { useTimeline } from "../state/use-kick-timeline";
import type { PenaltyDirection, PenaltyKick } from "../types";

import { GoalNet, GoalStructure, PenaltyBall } from "./goal-frame";
import { KeeperRig, keeperVisualFor, type KeeperPose } from "./keeper-rig";

/**
 * The kick resolving.
 *
 * Everything here hangs off one clock. The ball meets the keeper's line at
 * 0.55 and every reaction — the net bulging, the colour wash, the shake, the
 * verdict landing — is an interval after it, which is what makes the beat read
 * as a single event rather than a stack of independent animations.
 */

function signOf(direction: PenaltyDirection): number {
  if (direction === "left") return -1;
  if (direction === "right") return 1;
  return 0;
}

/** What the kick reads as from the user's side of the pitch. */
export function verdictFor(kick: PenaltyKick): string {
  if (kick.byPlayer) {
    return kick.scored
      ? "GOAL"
      : `SAVED BY ${kick.keeper.shortName.toUpperCase()}`;
  }
  return kick.scored ? "GOAL CONCEDED" : "YOU SAVED IT";
}

export function isGoodForUser(kick: PenaltyKick): boolean {
  return kick.byPlayer ? kick.scored : !kick.scored;
}

export function KickScene({ kick }: { kick: PenaltyKick }) {
  const t = useTimeline(resultSceneMs);

  const goal = kick.scored;
  const good = isGoodForUser(kick);
  const verdict = verdictFor(kick);
  const verdictColor = good ? accentVar("lime") : feedbackVar("danger");

  const target = { x: zoneX[kick.shootDirection], y: targetY };
  const control = {
    x: (spot.x + target.x) / 2,
    y: crossbarY + mouthHeight * 0.05,
  };

  const rippleT = goal ? interval(t, sceneRipple.start, sceneRipple.end) : 0;
  const diveT = easeOutCubic(
    interval(t, sceneKeeperDive.start, sceneKeeperDive.end),
  );
  const flightT = easeIn(
    interval(t, sceneBallFlight.start, sceneBallFlight.end),
  );

  const flashT = interval(t, sceneFlash.start, sceneFlash.end);
  const flash = 0.3 * Math.sin(flashT * Math.PI);
  const shakeT = interval(t, sceneShake.start, sceneShake.end);
  const shakeX = goal
    ? 0
    : Math.sin(shakeT * Math.PI * 5) * 6 * (1 - shakeT);
  const stampT = easeOutBack(
    interval(t, sceneVerdict.start, sceneVerdict.end),
  );

  const keeperPose: KeeperPose = goal
    ? "beaten"
    : kick.diveDirection === "center"
      ? "smother"
      : "catching";

  const ballAt = (u: number) => quadraticBezier(spot, control, target, u);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={verdict}
      className="relative w-full overflow-hidden"
      style={{
        aspectRatio: `${arenaWidth} / ${sceneHeight}`,
        transform: `translateX(${shakeX}px)`,
      }}
    >
      <svg
        viewBox={`0 0 ${arenaWidth} ${sceneHeight}`}
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 h-full w-full"
        role="presentation"
      >
        <GoalNet ripple={goal ? { center: target, t: rippleT } : undefined} />
        <GoalStructure />

        <KeeperRig
          anchor={{ x: goalLeft + goalWidth / 2, y: groundY }}
          height={keeperHeight}
          // The keeper in this goal belongs to whoever is not taking the kick.
          visual={keeperVisualFor(kick.keeper, !kick.byPlayer)}
          pose={keeperPose}
          direction={kick.diveDirection}
          progress={diveT}
          intercept={goal ? undefined : target}
        />

        {t < sceneImpact ? (
          <>
            {flightT > 0
              ? ballTrails.map((trail) => {
                  const u = Math.min(1, Math.max(0, flightT - trail.lag));
                  if (u <= 0) return null;
                  return (
                    <PenaltyBall
                      key={trail.lag}
                      position={ballAt(u)}
                      scale={1 - 0.2 * u}
                      alpha={trail.alpha}
                    />
                  );
                })
              : null}
            <PenaltyBall
              position={ballAt(flightT)}
              scale={1 - 0.2 * flightT}
            />
          </>
        ) : goal ? (
          <PenaltyBall
            position={{
              x: target.x,
              y:
                target.y +
                6 *
                  easeOut(
                    interval(t, sceneBallSettle.start, sceneBallSettle.end),
                  ),
            }}
            scale={0.8}
          />
        ) : (
          <SmotheredBall t={t} target={target} kick={kick} />
        )}
      </svg>

      {flash > 0.01 ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: withAlpha(verdictColor, flash) }}
        />
      ) : null}

      {stampT > 0 ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 grid place-items-center px-4"
        >
          <p
            className="text-center font-display font-black leading-compact"
            style={{
              color: verdictColor,
              opacity: Math.min(1, Math.max(0, stampT)),
              transform: `scale(${0.6 + 0.4 * stampT})`,
              fontSize:
                verdict.length > 13
                  ? "var(--ds-text-xl)"
                  : "var(--ds-text-3xl)",
              letterSpacing:
                verdict.length > 13
                  ? "var(--ds-tracking-display)"
                  : "var(--ds-tracking-mega)",
              textShadow: `0 0 22px ${withAlpha(verdictColor, 0.75)}`,
            }}
          >
            {verdict}
          </p>
        </div>
      ) : null}
    </div>
  );
}

/** The ball dropping off the glove, and the spark burst where it was caught. */
function SmotheredBall({
  t,
  target,
  kick,
}: {
  t: number;
  target: { x: number; y: number };
  kick: PenaltyKick;
}) {
  const dropT = easeIn(interval(t, sceneBallDrop.start, sceneBallDrop.end));
  const outward = signOf(kick.shootDirection);
  const landed = {
    x: target.x + outward * 26 * dropT,
    y: target.y + (groundY - 6 - target.y) * dropT,
  };

  const sparkT = interval(t, sceneSparks.start, sceneSparks.end);
  const sparks =
    sparkT > 0 && sparkT < 1
      ? Array.from({ length: 8 }, (_, index) => {
          const angle = (index * Math.PI) / 4;
          const dx = Math.cos(angle);
          const dy = Math.sin(angle);
          return {
            x1: target.x + dx * (6 + 16 * sparkT),
            y1: target.y + dy * (6 + 16 * sparkT),
            x2: target.x + dx * (12 + 22 * sparkT),
            y2: target.y + dy * (12 + 22 * sparkT),
          };
        })
      : [];

  return (
    <>
      <PenaltyBall position={landed} scale={0.8 + 0.1 * dropT} />
      {sparks.map((spark, index) => (
        <line
          key={index}
          x1={spark.x1}
          y1={spark.y1}
          x2={spark.x2}
          y2={spark.y2}
          stroke={withAlpha(accentVar("violet"), 0.8 * (1 - sparkT))}
          strokeWidth={2}
          strokeLinecap="round"
        />
      ))}
    </>
  );
}

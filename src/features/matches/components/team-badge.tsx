import { useId, type CSSProperties, type ReactNode } from "react";

import type { SportTeam, TeamCrest } from "@/domain/matches";

import styles from "./team-badge.module.css";

export type TeamBadgeProps = {
  team: SportTeam;
  size?: number;
};

/**
 * The team crest used throughout the sport pages: the sport's own crest design
 * when the team carries one, or the layered octagon.
 */
export function TeamBadge({ team, size = 46 }: TeamBadgeProps) {
  const lift = Math.max(3, Math.round(size * 0.11));
  const fontScale = team.shortName.length > 3 ? 0.2 : 0.24;
  const fontPx = Math.max(8, Math.round(size * fontScale));
  const style = {
    width: size,
    height: size,
    "--team-primary": team.color,
    "--team-secondary": team.secondaryColor ?? team.color,
    "--team-ink": team.badgeTextColor ?? "var(--ds-color-text-default)",
    "--team-badge-lift": `${lift}px`,
    "--team-badge-font-size": `${fontPx}px`,
  } as CSSProperties;

  if (team.crest != null && team.crest !== "octagon") {
    return <CrestBadge team={team} crest={team.crest} size={size} lift={lift} fontPx={fontPx} style={style} />;
  }

  return (
    <span className={styles.badge} style={style} role="img" aria-label={team.name}>
      <span aria-hidden className={styles.shadow} />
      <span className={styles.face}>{team.shortName}</span>
    </span>
  );
}

/** One crest design, laid out in a 100-unit box whose face is `height` tall. */
type CrestArt = {
  /** The part the code sits on: the team colour, rimmed in its second colour, with the hard lift under it. */
  face: string;
  /** Inner rim thickness. */
  rim: number;
  /** Drawn flat behind the face and its lift, such as the cricket crests' bats and stumps. */
  behind?: ReactNode;
  /** How far the face lifts, as a share of the badge's lift, so it does not bury what is behind it. */
  liftShare?: number;
  /** Drawn over the face, inside the rim. */
  decor?: ReactNode;
  /** Vertical centre of the code. */
  labelY: number;
  /** Widest the code may run before it is squeezed to fit. */
  labelWidth: number;
};

/**
 * The sport crest designs: the same hard lift as the octagon, with the face cut
 * to the crest's silhouette and dressed in the team's second colour.
 */
function CrestBadge({
  team,
  crest,
  size,
  lift,
  fontPx,
  style,
}: {
  team: SportTeam;
  crest: Exclude<TeamCrest, "octagon">;
  size: number;
  lift: number;
  fontPx: number;
  style: CSSProperties;
}) {
  const clipId = `crest-${useId().replace(/[^\w-]/g, "")}`;
  const liftUnits = (lift / size) * 100;
  const font = (fontPx / size) * 100;
  const art = crestArt[crest](100 - liftUnits, font);

  return (
    <span className={styles.badge} style={style} role="img" aria-label={team.name} data-crest={crest}>
      <svg aria-hidden className={styles.crest} viewBox="0 0 100 100">
        <defs>
          <clipPath id={clipId}>
            <path d={art.face} />
          </clipPath>
        </defs>
        {art.behind}
        <path d={art.face} transform={`translate(0 ${liftUnits * (art.liftShare ?? 1)})`} className={styles.crestShadow} />
        <g clipPath={`url(#${clipId})`}>
          <path d={art.face} className={styles.crestFace} />
          {art.decor}
          <path d={art.face} className={styles.crestRim} strokeWidth={art.rim * 2} />
        </g>
        <text
          x={50}
          // Orbitron's caps sit about 0.72em tall; centre them, not the em box.
          y={art.labelY + font * 0.36}
          fontSize={font}
          textAnchor="middle"
          className={styles.crestLabel}
          {...fitLabel(team.shortName, font, art.labelWidth)}
        >
          {team.shortName}
        </text>
      </svg>
    </span>
  );
}

/** A bat standing handle-up about the origin, 116 long: handle, shoulders, blade, toe. */
const bat = "M-3.25 -58H3.25V-26L8 -19V52Q8 58 2 58H-2Q-8 58 -8 52V-19L-3.25 -26Z";

const crestArt: Record<Exclude<TeamCrest, "octagon">, (height: number, font: number) => CrestArt> = {
  /** Football: a heraldic shield, the code in the chief, a striped field below. */
  shield(h) {
    const rim = 6;
    const bar = h * 0.56;
    const stripe = (100 - rim * 2) / 7;
    const outline = `M0 9L9 0H91L100 9V${h * 0.5}C100 ${h * 0.78} 74 ${h * 0.92} 50 ${h}C26 ${h * 0.92} 0 ${h * 0.78} 0 ${h * 0.5}Z`;
    return {
      face: outline,
      rim,
      decor: (
        <>
          <rect x={0} y={bar - 2} width={100} height={4} className={styles.crestSecondary} />
          {[1, 3, 5].map((slot) => (
            <rect key={slot} x={rim + stripe * slot} y={bar} width={stripe} height={h - bar} className={styles.crestSecondary} />
          ))}
        </>
      ),
      labelY: (rim + bar - 2) / 2,
      labelWidth: 100 - rim * 2 - 4,
    };
  },

  /** Basketball: a coin-like roundel, a ring in the second colour, a star over the code. */
  roundel(h, font) {
    const rim = 7;
    const r = h / 2;
    const disc = r - rim - 2.5;
    return {
      face: circle(50, r, r),
      rim,
      decor: (
        <>
          <circle cx={50} cy={r} r={r - rim - 1.2} strokeWidth={2.4} className={styles.crestDeep} />
          <path d={`M${50 - disc} ${r}A${disc} ${disc} 0 0 1 ${50 + disc} ${r}Z`} className={styles.crestGloss} />
          <path d={star(50, r - disc * 0.64, 6)} className={styles.crestSecondary} />
          <rect x={39} y={r + disc * 0.55} width={22} height={3.5} className={styles.crestSecondary} />
        </>
      ),
      labelY: r,
      labelWidth: 2 * Math.sqrt(disc ** 2 - (font / 2) ** 2) - 4,
    };
  },

  /** Cricket, first draft: crossed willow bats behind a team plate, a ball above. */
  bats(h) {
    const rim = 4.5;
    const cy = h / 2;
    const plate = chamferedRect(10, cy - 16, 80, 32, 6);
    const crossed = [-45, 45].map((angle) => `translate(50 ${cy}) rotate(${angle})`);
    return {
      face: plate,
      rim,
      behind: (
        <>
          {crossed.map((transform) => (
            <g key={transform} transform={transform}>
              <path d={bat} strokeWidth={1.5} className={styles.crestWillow} />
              <rect x={-3.25} y={-58} width={6.5} height={16} className={styles.crestSecondary} />
            </g>
          ))}
          <circle cx={50} cy={12} r={6.5} className={styles.crestBall} />
        </>
      ),
      liftShare: 0.5,
      labelY: cy,
      labelWidth: 80 - rim * 2 - 6,
    };
  },

  /** Cricket, second draft: three willow stumps and bails, a forked team ribbon across them. */
  wicket(h) {
    const rim = 4.5;
    const mid = h * 0.55;
    const fork = 9;
    const ribbon = `M0 ${mid - 16}H100L${100 - fork} ${mid}L100 ${mid + 16}H0L${fork} ${mid}Z`;
    const stumps = [25, 50, 75].map((x) => `M${x - 5.5} 10H${x + 5.5}V${h - 8}L${x} ${h}L${x - 5.5} ${h - 8}Z`);
    const bails = ["M19 4H49V8.5H19Z", "M51 4H81V8.5H51Z"];
    return {
      face: ribbon,
      rim,
      behind: [...stumps, ...bails].map((d) => <path key={d} d={d} strokeWidth={1.5} className={styles.crestWillow} />),
      liftShare: 0.5,
      labelY: mid,
      labelWidth: 100 - (fork + rim) * 2 - 4,
    };
  },
};

function circle(cx: number, cy: number, r: number): string {
  return `M${cx - r} ${cy}A${r} ${r} 0 1 0 ${cx + r} ${cy}A${r} ${r} 0 1 0 ${cx - r} ${cy}Z`;
}

function chamferedRect(x: number, y: number, width: number, height: number, cut: number): string {
  return `M${x + cut} ${y}H${x + width - cut}L${x + width} ${y + cut}V${y + height - cut}L${x + width - cut} ${y + height}H${x + cut}L${x} ${y + height - cut}V${y + cut}Z`;
}

function star(cx: number, cy: number, r: number): string {
  const points = Array.from({ length: 10 }, (_, i) => {
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const reach = i % 2 === 0 ? r : r * 0.45;
    return `${(cx + Math.cos(angle) * reach).toFixed(2)} ${(cy + Math.sin(angle) * reach).toFixed(2)}`;
  });
  return `M${points.join("L")}Z`;
}

/**
 * Squeezes a code that would overrun its crest. The display face runs wide, and
 * wider still on M and W, so the estimate weighs those (and the slim I) apart.
 */
function fitLabel(label: string, font: number, maxWidth: number) {
  const ems = [...label].reduce((sum, char) => sum + (/[IJ1]/.test(char) ? 0.35 : char === "W" ? 1.1 : char === "M" ? 0.95 : 0.84), 0);
  return ems * font > maxWidth ? { textLength: maxWidth, lengthAdjust: "spacingAndGlyphs" as const } : {};
}

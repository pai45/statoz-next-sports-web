import { accentVar, Glyph, glyphRegistry, withAlpha } from "@statoz/design-system/web";
import type { GlyphName } from "@statoz/design-system/web";
import type { PlayerCard } from "@/domain/cards";

import type { ShootoutTurnRole } from "../types";

import { MatchPanel } from "../../shared/components/match-chrome";

/**
 * Who is on the spot, who is in goal, and what the player is being asked to do
 * about it.
 *
 * The app ships no player art, so where Flutter shows a portrait this shows the
 * card's glyph plate — the same face a `PlayerCard` renders everywhere else.
 */

/** A card's glyph, or the football, when the pool names one we do not have. */
function glyphFor(card: PlayerCard): GlyphName {
  return card.icon in glyphRegistry
    ? (card.icon as GlyphName)
    : "sports_soccer";
}

function CardPlate({ card, accent }: { card: PlayerCard; accent: string }) {
  return (
    <div
      className="grid h-12.5 w-11 shrink-0 place-items-center"
      style={{
        background: withAlpha("var(--ds-color-background-primary)", 0.6),
        border: `1px solid ${withAlpha(accent, 0.35)}`,
        color: accent,
      }}
    >
      <Glyph name={glyphFor(card)} size={22} />
    </div>
  );
}

function DuelPlayerSummary({
  label,
  card,
  accent,
  align,
}: {
  label: string;
  card: PlayerCard;
  accent: string;
  align: "start" | "end";
}) {
  const alignment = align === "end" ? "items-end text-right" : "items-start";

  return (
    <div className={`flex min-w-0 flex-1 flex-col ${alignment}`}>
      <span
        className="font-display font-extrabold leading-compact"
        style={{
          color: accent,
          fontSize: "var(--ds-text-2xs)",
          letterSpacing: "var(--ds-tracking-ultra)",
        }}
      >
        {label}
      </span>
      <span
        className="mt-1 w-full truncate font-display font-black leading-compact"
        style={{
          fontSize: "var(--ds-text-xs)",
          letterSpacing: "var(--ds-tracking-label)",
        }}
      >
        {card.shortName}
      </span>
      <span
        className="mt-0.5 w-full truncate font-bold leading-compact text-muted"
        style={{
          fontSize: "var(--ds-text-2xs)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {`${card.position.split("/")[0]} / OVR ${card.rating}`}
      </span>
    </div>
  );
}

function TurnRoleBanner({
  role,
  accent,
}: {
  role: ShootoutTurnRole;
  accent: string;
}) {
  const shooting = role === "shooting";

  return (
    <div
      // The role flips every kick, and it is the one thing a player must not
      // miss, so it announces itself rather than only changing colour.
      role="status"
      aria-live="polite"
      className="flex items-center gap-2.5 px-2.5 py-2.5"
      style={{
        background: withAlpha(accent, 0.09),
        border: `1px solid ${withAlpha(accent, 0.34)}`,
      }}
    >
      <span
        className="grid size-9.5 shrink-0 place-items-center rounded-pill"
        style={{
          background: withAlpha(accent, 0.14),
          border: `1px solid ${withAlpha(accent, 0.45)}`,
          color: accent,
        }}
      >
        <Glyph name={shooting ? "sports_soccer" : "shield"} size={21} />
      </span>

      <div className="min-w-0 flex-1">
        <p
          className="font-display font-extrabold leading-compact"
          style={{
            color: accent,
            fontSize: "var(--ds-text-2xs)",
            letterSpacing: "var(--ds-tracking-ultra)",
          }}
        >
          {shooting ? "ATTACK" : "DEFEND"}
        </p>
        <p
          className="mt-0.5 font-display font-black leading-compact"
          style={{
            fontSize: "var(--ds-text-md)",
            letterSpacing: "var(--ds-tracking-label)",
          }}
        >
          {shooting ? "YOUR SHOT" : "YOU'RE IN GOAL"}
        </p>
        <p
          className="mt-1 font-medium leading-body text-muted"
          style={{ fontSize: "var(--ds-text-xs)" }}
        >
          {shooting
            ? "Tap where you want to shoot."
            : "Choose where your keeper dives."}
        </p>
      </div>

      <span className="shrink-0" style={{ color: withAlpha(accent, 0.85) }}>
        <Glyph name={shooting ? "my_location" : "pan_tool"} size={20} />
      </span>
    </div>
  );
}

export type ShooterActionPanelProps = {
  role: ShootoutTurnRole;
  shooter: PlayerCard;
  keeper: PlayerCard;
  /** The name the rival plays under, for the side that is not the player's. */
  opponentName: string;
};

export function ShooterActionPanel({
  role,
  shooter,
  keeper,
  opponentName,
}: ShooterActionPanelProps) {
  const shooting = role === "shooting";
  // The side the player controls is always cyan; the rival is always orange.
  const accent = accentVar(shooting ? "cyan" : "orange");
  const keeperAccent = accentVar(shooting ? "orange" : "cyan");

  return (
    <MatchPanel accent={accent}>
      <TurnRoleBanner role={role} accent={accent} />

      <div className="mt-2.5 flex items-center gap-2">
        <CardPlate card={shooter} accent={accent} />
        <DuelPlayerSummary
          label={shooting ? "YOUR TAKER" : opponentName.toUpperCase()}
          card={shooter}
          accent={accent}
          align="start"
        />

        <span
          className="grid size-8.5 shrink-0 place-items-center rounded-pill font-display font-extrabold"
          style={{
            fontSize: "var(--ds-text-2xs)",
            letterSpacing: "var(--ds-tracking-label)",
            background: withAlpha(accent, 0.1),
            border: `1px solid ${withAlpha(accent, 0.32)}`,
          }}
        >
          VS
        </span>

        <DuelPlayerSummary
          label={shooting ? opponentName.toUpperCase() : "YOUR KEEPER"}
          card={keeper}
          accent={keeperAccent}
          align="end"
        />
        <CardPlate card={keeper} accent={keeperAccent} />
      </div>
    </MatchPanel>
  );
}

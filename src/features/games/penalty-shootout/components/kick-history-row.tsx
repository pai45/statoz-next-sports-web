import { accentVar, feedbackVar, Glyph, withAlpha } from "@statoz/design-system/web";

import type { PenaltyKick } from "../types";

/**
 * Both sides' kicks so far, as a row of pips each.
 *
 * The user is always the top row and the rival always the bottom, whoever took
 * the last kick — the row is a scoreboard, not a running order.
 */

/** The rival's first name, when it is short enough to fit the label. */
export function opponentTag(opponentName: string): string {
  const first = opponentName.split(" ")[0] ?? "";
  return first.length > 0 && first.length <= 6 ? first.toUpperCase() : "OPP";
}

function Pip({ state }: { state: "pending" | "scored" | "missed" }) {
  if (state === "pending") {
    return (
      <span
        className="grid size-7.5 place-items-center rounded-pill"
        style={{
          border: `1px solid ${withAlpha("var(--ds-color-text-muted)", 0.35)}`,
          color: withAlpha("var(--ds-color-text-muted)", 0.45),
        }}
      >
        <Glyph name="sports_soccer" size={15} />
      </span>
    );
  }

  const color = state === "scored" ? accentVar("lime") : feedbackVar("danger");

  return (
    <span
      className="grid size-7.5 place-items-center rounded-pill"
      style={{
        background: withAlpha(color, 0.16),
        border: `1.3px solid ${withAlpha(color, 0.7)}`,
        color,
      }}
    >
      <Glyph name="sports_soccer" size={15} />
    </span>
  );
}

function SideRow({
  label,
  accent,
  kicks,
  slots,
}: {
  label: string;
  accent: string;
  kicks: PenaltyKick[];
  slots: number;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="w-12 shrink-0 font-display font-black leading-compact"
        style={{
          color: accent,
          fontSize: "var(--ds-text-2xs)",
          letterSpacing: "var(--ds-tracking-ultra)",
        }}
      >
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: slots }, (_, index) => {
          const kick = kicks[index];
          return (
            <Pip
              key={index}
              state={
                kick === undefined
                  ? "pending"
                  : kick.scored
                    ? "scored"
                    : "missed"
              }
            />
          );
        })}
      </div>
    </div>
  );
}

export type KickHistoryRowProps = {
  kicks: PenaltyKick[];
  opponentName: string;
};

export function KickHistoryRow({ kicks, opponentName }: KickHistoryRowProps) {
  const playerKicks = kicks.filter((kick) => kick.byPlayer);
  const opponentKicks = kicks.filter((kick) => !kick.byPlayer);
  // Five slots always show, so the regulation shape is legible from kick one.
  const slots = Math.max(5, playerKicks.length, opponentKicks.length);

  return (
    <div className="flex flex-col gap-2.5">
      <SideRow
        label="YOU"
        accent={accentVar("cyan")}
        kicks={playerKicks}
        slots={slots}
      />
      <SideRow
        label={opponentTag(opponentName)}
        accent={accentVar("orange")}
        kicks={opponentKicks}
        slots={slots}
      />
    </div>
  );
}

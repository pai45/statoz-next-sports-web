import type { AttributeSpec, WhoAthlete } from "./pool";

/**
 * How one guess reads against the mystery player, clue by clue.
 *
 * `hit` is an exact match, `near` is close (same continent or conference, a
 * shared position, a club the mystery player also played for, or a number
 * within range), `miss` is neither. Numbers also say which way to go.
 */

export type TileState = "hit" | "near" | "miss";

export type Tile = {
  key: string;
  label: string;
  value: string | number;
  state: TileState;
  /** For numbers that missed: whether the mystery player's value is higher or lower. */
  arrow: "up" | "down" | null;
};

function tokens(value: string): string[] {
  return value.split("/").map((part) => part.trim()).filter(Boolean);
}

export function compareAttribute(
  spec: AttributeSpec,
  guess: WhoAthlete,
  target: WhoAthlete,
): Tile {
  const mine = guess.values[spec.key] ?? "";
  const theirs = target.values[spec.key] ?? "";
  const base = { key: spec.key, label: spec.label, value: mine };

  if (spec.kind.type === "number") {
    const a = Number(mine);
    const b = Number(theirs);
    if (a === b) return { ...base, state: "hit", arrow: null };
    const near = Math.abs(a - b) <= spec.kind.nearWithin;
    return { ...base, state: near ? "near" : "miss", arrow: b > a ? "up" : "down" };
  }

  const a = String(mine);
  const b = String(theirs);
  if (a === b) return { ...base, state: "hit", arrow: null };
  if (spec.kind.nearOverlap && tokens(a).some((token) => tokens(b).includes(token))) {
    return { ...base, state: "near", arrow: null };
  }
  if (spec.kind.nearGroup) {
    const group = spec.kind.nearGroup(a);
    if (group !== null && group === spec.kind.nearGroup(b)) return { ...base, state: "near", arrow: null };
  }
  // A club the mystery player turned out for, though not their current one.
  if (spec.key === "club" && target.clubs.includes(a)) return { ...base, state: "near", arrow: null };
  return { ...base, state: "miss", arrow: null };
}

export function compareGuess(specs: AttributeSpec[], guess: WhoAthlete, target: WhoAthlete): Tile[] {
  return specs.map((spec) => compareAttribute(spec, guess, target));
}

/** One emoji per clue, for the share line. */
export function tileEmoji(state: TileState): string {
  return state === "hit" ? "🟩" : state === "near" ? "🟨" : "⬛";
}

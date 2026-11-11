import type { Sport } from "@/domain/sports";

/**
 * The text a finished daily shares: plain emoji, so it pastes the same way into
 * any chat, post or note. The format follows the daily-puzzle convention
 * players already know: game, number, score, then one square per step.
 */

const sportEmoji: Record<Sport, string> = {
  football: "⚽",
  cricket: "🏏",
  basketball: "🏀",
  tennis: "🎾",
  motorsport: "🏎️",
};

export function sportEmojiFor(sport: Sport): string {
  return sportEmoji[sport];
}

/** Full sport names. The shared sport module abbreviates basketball for tight tab strips. */
export const sportNames: Record<Sport, string> = {
  football: "FOOTBALL",
  cricket: "CRICKET",
  basketball: "BASKETBALL",
  tennis: "TENNIS",
  motorsport: "MOTORSPORT",
};

export type ShareLineInput = {
  game: string;
  sport: Sport;
  dailyNumber: number;
  /** e.g. `4/5`, `3/6`. */
  score: string;
  /** One entry per step: true = hit, false = miss. */
  steps: boolean[];
  /** Optional trailing detail, e.g. a time. */
  detail?: string;
};

export function shareTextFor(input: ShareLineInput): string {
  const squares = input.steps.map((hit) => (hit ? "🟩" : "🟥")).join("");
  const head = `StatOz ${input.game} ${sportEmoji[input.sport]} #${input.dailyNumber} ${input.score}`;
  return [head, squares, input.detail].filter(Boolean).join("\n");
}

export type ShareOutcome = "shared" | "copied" | "failed";

/**
 * The system share sheet when there is one, the clipboard otherwise. A share
 * the player cancels is not an error, so it reports `failed` quietly.
 */
export async function shareResult(text: string): Promise<ShareOutcome> {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      await navigator.share({ text });
      return "shared";
    }
  } catch {
    // Cancelled or refused: fall through to the clipboard.
  }
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return "failed";
  }
}

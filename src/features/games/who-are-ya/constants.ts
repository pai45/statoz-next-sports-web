/**
 * Who Are Ya's fixed numbers and sports, kept apart from the engine so the
 * hub can read a day's status without loading the card catalogue.
 */

/** Guesses allowed before the answer is revealed. */
export const maxGuesses = 8;

/** The sports with career routes to build clues from. */
export type WhoAreYaSport = "football" | "cricket" | "basketball";

export const whoAreYaSports: readonly WhoAreYaSport[] = ["football", "cricket", "basketball"];

export function isWhoAreYaSport(sport: string): sport is WhoAreYaSport {
  return (whoAreYaSports as readonly string[]).includes(sport);
}

/** XP for a solve: more for fewer guesses, nothing for a miss. */
export function whoAreYaXp(solved: boolean, guesses: number): number {
  return solved ? Math.max(2, (maxGuesses + 1 - guesses) * 2) : 0;
}

/** Calls in the daily chain. The chain holds one more player than this. */
export const dailyRounds = 10;

/** XP per right call, plus a bonus for a perfect day. */
export const xpPerCall = 1;
export const perfectBonusXp = 3;

export function higherLowerXp(right: number, rounds: number): number {
  return right * xpPerCall + (rounds > 0 && right === rounds ? perfectBonusXp : 0);
}

/** Kicks per side before sudden death — five each, alternating, so ten. */
export const shootoutKicks = 10;

export type GoalChanceInput = {
  shooterRating: number;
  keeperRating: number;
  keeperGuessedRight: boolean;
};

/**
 * The chance a penalty is scored.
 *
 * A keeper diving the wrong way is a near-certain goal; on a correct guess the
 * save scales with keeper against shooter. The step table is deliberate — it
 * keeps the direction duel the thing that decides most kicks while still
 * letting a strong keeper or a strong taker tip the ones that are read.
 */
export function shootoutGoalChance({
  shooterRating,
  keeperRating,
  keeperGuessedRight,
}: GoalChanceInput): number {
  if (!keeperGuessedRight) return 0.95;

  const diff = shooterRating - keeperRating;
  if (diff > 15) return 0.45;
  if (diff > 5) return 0.35;
  if (diff > -5) return 0.25;
  if (diff > -15) return 0.15;
  return 0.08;
}

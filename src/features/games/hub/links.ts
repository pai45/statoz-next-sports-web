import type { Sport } from "@/domain/sports";

/** The QUIZ tab's address for a sport, or for every sport when null. */
export function hubHref(sport: Sport | null): string {
  return sport === null ? "/quiz" : `/quiz/${sport}`;
}

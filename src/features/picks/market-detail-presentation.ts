import { leadingOutcome, type PickMarket, type PickOutcome, type PickPosition, type PickPricePoint } from "@/domain/predictions";

export type HistoryRange = "All" | "Week" | "Day";
const chartColors = ["cyan", "violet", "gold", "lime", "pink", "orange", "blue"];

/** Outcome identity never changes when selection or the leading probability changes. */
export function outcomeChartColor(market: PickMarket, outcomeId: string): string {
  const index = Math.max(0, market.outcomes.findIndex((outcome) => outcome.id === outcomeId));
  return `var(--ds-color-accent-${chartColors[index % chartColors.length]})`;
}

export function initialOutcome(market: PickMarket, positions: PickPosition[]): PickOutcome {
  return market.outcomes.find((outcome) => outcome.id === positions[0]?.outcomeId) ?? leadingOutcome(market);
}

export function chartOutcomes(market: PickMarket, selected: PickOutcome): PickOutcome[] {
  return [selected, ...market.outcomes.filter((outcome) => outcome.id !== selected.id).sort((a, b) => b.probabilityPercent - a.probabilityPercent).slice(0, 2)];
}

export function historyForRange(history: PickPricePoint[], range: HistoryRange): PickPricePoint[] {
  const ordered = history.filter((point) => Number.isFinite(Date.parse(point.at))).toSorted((a, b) => Date.parse(a.at) - Date.parse(b.at));
  if (range === "All" || ordered.length === 0) return ordered;
  const cutoff = Date.parse(ordered[ordered.length - 1].at) - (range === "Week" ? 7 : 1) * 86_400_000;
  return ordered.filter((point) => Date.parse(point.at) >= cutoff);
}

/** Explicit timezone keeps exported HTML and hydration identical. */
export function marketTimestamp(value: string | undefined, compact = false): string {
  if (!value || !Number.isFinite(Date.parse(value))) return "Not available";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata", day: "numeric", month: "short",
    ...(compact ? {} : { year: "numeric" as const }),
    hour: "2-digit", minute: "2-digit", hour12: false,
    ...(compact ? {} : { timeZoneName: "short" as const }),
  }).format(new Date(value));
}

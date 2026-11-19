import type { PickMarket, PickOutcome } from "@/domain/predictions";
import { teamForMarketOutcome } from "../market-team";
import { TeamBadge } from "./team-badge";

export function MarketOutcomeMark({ market, outcome, size = 28 }: { market: PickMarket; outcome: PickOutcome; size?: number }) {
  const team = teamForMarketOutcome(market, outcome);
  return team ? <TeamBadge team={team} size={size} /> : null;
}

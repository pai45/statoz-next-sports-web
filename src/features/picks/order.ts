import {
  isValidStake, marketCanBuy, payoutForShares, sharesForStake,
  type PickMarket, type PickOutcome,
} from "@/domain/predictions";
import type { PlacePickResult } from "./state/picks-store";

export type PickTradeSuccess = { outcomeLabel: string; stakeOz: number; shares: number; maxPayoutOz: number };

export function quotePickOrder(market: PickMarket, outcome: PickOutcome, stakeOz: number, balanceOz: number) {
  const price = outcome.probabilityPercent;
  const shares = sharesForStake(stakeOz, price);
  const maxPayoutOz = payoutForShares(shares);
  let error: string | null = null;
  if (!marketCanBuy(market)) error = "This market is closed for new picks.";
  else if (balanceOz < price) error = "Not enough Oz for one share.";
  else if (stakeOz > balanceOz) error = "Your stake exceeds your available balance.";
  else if (!isValidStake({ stakeOz, probabilityPercent: price, balanceOz })) error = `Enter a positive multiple of ${price} Oz (one share).`;
  return {
    shares, maxPayoutOz, profitOz: shares > 0 ? maxPayoutOz - stakeOz : 0,
    balanceAfter: Math.max(0, balanceOz - stakeOz), error,
    maxStake: price > 0 ? Math.floor(balanceOz / price) * price : 0,
  };
}

export function placementError(reason: Exclude<PlacePickResult, { ok: true }>["reason"]): string {
  if (reason === "insufficient") return "Your balance changed. Lower your stake and try again.";
  if (reason === "closed") return "This market has closed. Your pick was not placed.";
  if (reason === "stake") return "The price changed. Check the share price and try again.";
  return "This outcome is no longer available. Please choose another pick.";
}

/** Blocks a second click before React can repaint; successful orders stay latched until edited. */
export function createPickOrderSubmission() {
  let locked = false;
  return {
    reset() { locked = false; },
    submit(input: { market: PickMarket; outcome: PickOutcome; stakeOz: number; balanceOz: number }, services: {
      authorize: () => boolean;
      place: (input: { marketId: string; outcomeId: string; stakeOz: number }) => PlacePickResult;
    }): { success?: PickTradeSuccess; error?: string } {
      if (locked) return {};
      locked = true;
      try {
        const quote = quotePickOrder(input.market, input.outcome, input.stakeOz, input.balanceOz);
        if (quote.error) { locked = false; return { error: quote.error }; }
        if (!services.authorize()) { locked = false; return {}; }
        const result = services.place({ marketId: input.market.id, outcomeId: input.outcome.id, stakeOz: input.stakeOz });
        if (!result.ok) { locked = false; return { error: placementError(result.reason) }; }
        return { success: { outcomeLabel: input.outcome.label, stakeOz: input.stakeOz, shares: quote.shares, maxPayoutOz: quote.maxPayoutOz } };
      } catch {
        locked = false;
        return { error: "We couldn't place your pick. Check your ticket and balance before trying again." };
      }
    },
  };
}

export function multiplierLabel(price: number): string {
  if (price <= 0) return "\u2014";
  return `${(100 / price).toFixed(2).replace(/0$/, "").replace(/\.0?$/, "")}\u00d7`;
}

"use client";

import { useId, useRef, useState } from "react";
import { BrandIcon } from "@statoz/design-system/web";
import type { PickMarket, PickOutcome } from "@/domain/predictions";
import { useAuthSession, useRequireAuth } from "@/features/auth";
import { readEconomy, useEconomy } from "@/features/economy";
import { formatInt } from "@/shared/utils";
import { createPickOrderSubmission, multiplierLabel, quotePickOrder, type PickTradeSuccess } from "../order";
import { placePick } from "../state/picks-store";
import styles from "./pick-order-form.module.css";

/** Owned above the responsive presentation so moving into a drawer keeps the draft. */
export function usePickOrder(market: PickMarket, outcome: PickOutcome, onPlaced: (success: PickTradeSuccess) => void, onAuthRequired?: () => void) {
  const economy = useEconomy();
  const session = useAuthSession();
  const requireAuth = useRequireAuth();
  const [stakeOz, setStake] = useState(outcome.probabilityPercent);
  const [phase, setPhase] = useState<"idle" | "submitting" | "placed">("idle");
  const [error, setError] = useState<string | null>(null);
  const submission = useRef<ReturnType<typeof createPickOrderSubmission> | null>(null);
  submission.current ??= createPickOrderSubmission();
  const quote = quotePickOrder(market, outcome, stakeOz, economy.coins);

  function setStakeOz(value: number) {
    if (phase === "submitting") return;
    submission.current!.reset();
    setPhase("idle"); setError(null); setStake(value);
  }

  function confirm() {
    if (phase !== "idle") return;
    setPhase("submitting");
    const result = submission.current!.submit({ market, outcome, stakeOz, balanceOz: readEconomy().coins }, {
      authorize: () => {
        // A native modal makes the app's authentication dialog inert until closed.
        if (!session.isAuthenticated) onAuthRequired?.();
        return requireAuth({ intent: "lock a pick", message: "Log in to buy shares and save this pick." });
      },
      place: placePick,
    });
    if (result.success) { setPhase("placed"); onPlaced(result.success); }
    else { setPhase("idle"); setError(result.error ?? null); }
  }

  return { stakeOz, setStakeOz, phase, confirm, quote, error, balance: economy.coins, isAuthenticated: session.isAuthenticated, hydrating: session.status === "hydrating" };
}

export type PickOrder = ReturnType<typeof usePickOrder>;

export function PickOrderForm({ outcome, order }: { outcome: PickOutcome; order: PickOrder }) {
  const id = useId();
  const price = outcome.probabilityPercent;
  const { quote, phase, stakeOz, setStakeOz } = order;
  const message = order.error ?? quote.error;
  const presets = [
    { label: "1\u00d7", value: price }, { label: "5\u00d7", value: price * 5 },
    { label: "10\u00d7", value: price * 10 }, { label: "Max", value: quote.maxStake },
  ];

  return (
    <form className={styles.form} onSubmit={(event) => { event.preventDefault(); order.confirm(); }}>
      <div className={styles.balance}><label htmlFor={id}>Stake</label><span>Balance <b>{formatInt(order.balance)} Oz</b></span></div>
      <div className={styles.stepper}>
        <button type="button" aria-label={`Lower stake by ${price} Oz`} disabled={phase === "submitting" || stakeOz <= price} onClick={() => setStakeOz(Math.max(price, stakeOz - price))}>−</button>
        <div className={styles.amount}><BrandIcon name="coin" size={20} /><input id={id} inputMode="numeric" autoComplete="off" value={String(stakeOz)} disabled={phase === "submitting"} onChange={(event) => setStakeOz(Number(event.target.value.replace(/\D/g, "")) || 0)} aria-describedby={`${id}-help ${message ? `${id}-error` : ""}`} aria-invalid={Boolean(message)} /><span>Oz</span></div>
        <button type="button" aria-label={`Raise stake by ${price} Oz`} disabled={phase === "submitting" || stakeOz + price > order.balance} onClick={() => setStakeOz(stakeOz + price)}>+</button>
      </div>
      <div className={styles.presets} role="group" aria-label="Quick stake in shares">
        {presets.map((preset) => <button type="button" key={preset.label} disabled={phase === "submitting" || preset.value <= 0 || preset.value > quote.maxStake} aria-pressed={preset.value === stakeOz} onClick={() => setStakeOz(preset.value)}>{preset.label}</button>)}
      </div>
      <p id={`${id}-help`} className={styles.hint}>1 share costs {price} Oz · pays 100 Oz if correct</p>
      <dl className={styles.summary}>
        <div><dt>Shares</dt><dd>{formatInt(quote.shares)}</dd></div>
        <div><dt>Price per share</dt><dd>{price} Oz <span>· {multiplierLabel(price)}</span></dd></div>
        <div><dt>Balance after</dt><dd>{formatInt(quote.balanceAfter)} Oz</dd></div>
        <div className={styles.payout}><dt>Maximum payout</dt><dd>{formatInt(quote.maxPayoutOz)} <small>Oz</small></dd></div>
        <div className={styles.profit}><dt>Potential profit</dt><dd>+{formatInt(quote.profitOz)} Oz</dd></div>
      </dl>
      {message ? <p id={`${id}-error`} className={styles.error} role="alert">{message}</p> : null}
      <button className={styles.confirm} type="submit" disabled={Boolean(quote.error) || phase !== "idle" || order.hydrating}>
        {phase === "submitting" ? "Confirming…" : phase === "placed" ? "Pick locked ✓" : order.isAuthenticated ? "Confirm pick" : "Log in to confirm"}
      </button>
      <p className={styles.footnote}>{phase === "placed" ? "Pick saved. Adjust your stake to place another." : "Paid in Oz Coins. Payout includes your stake."}</p>
    </form>
  );
}

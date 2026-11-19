"use client";

import { AdaptiveDrawer } from "@statoz/design-system/web";
import type { PickMarket, PickOutcome } from "@/domain/predictions";
import type { PickTradeSuccess } from "../order";
import { PickOrderForm, usePickOrder, type PickOrder } from "./pick-order-form";
import styles from "./pick-trade-sheet.module.css";

export { multiplierLabel, type PickTradeSuccess } from "../order";

export function PickTradeSheet({ market, outcome, onClose, onPlaced }: {
  market: PickMarket | null; outcome: PickOutcome | null;
  onClose: () => void; onPlaced: (success: PickTradeSuccess) => void;
}) {
  return market && outcome ? <SheetOrder key={`${market.id}:${outcome.id}`} market={market} outcome={outcome} onClose={onClose} onPlaced={onPlaced} /> : null;
}

function SheetOrder({ market, outcome, onClose, onPlaced }: {
  market: PickMarket; outcome: PickOutcome; onClose: () => void;
  onPlaced: (success: PickTradeSuccess) => void;
}) {
  const order = usePickOrder(market, outcome, onPlaced, onClose);
  return <PickOrderDrawer open market={market} outcome={outcome} order={order} onClose={onClose} />;
}

export function PickOrderDrawer({ open, market, outcome, order, onClose }: {
  open: boolean; market: PickMarket; outcome: PickOutcome; order: PickOrder; onClose: () => void;
}) {
  return (
    <AdaptiveDrawer open={open} onClose={() => { if (order.phase !== "submitting") onClose(); }} title="Buy pick" className={styles.drawer}>
      <div className={styles.body}>
        <p className={styles.question}>{market.question}</p>
        <div className={styles.selection}><strong>{outcome.label}</strong><span>{outcome.probabilityPercent}% chance</span></div>
        <PickOrderForm outcome={outcome} order={order} />
      </div>
    </AdaptiveDrawer>
  );
}

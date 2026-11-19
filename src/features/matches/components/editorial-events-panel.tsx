"use client";
import { useEditorialEntrance } from "../editorial-entrance";
import type { PickMarket, PickPosition } from "@/domain/predictions";
import styles from "./editorial-discovery.module.css";
import { EditorialMarketCard } from "./editorial-market-card";

/** Event markets retain the same outcomes, tickets and settlement actions as Picks and Futures. */
export function EditorialEventsPanel({ markets, positionsFor, onPick, onClaim }: {
  markets: PickMarket[]; positionsFor?: (id: string) => PickPosition[];
  onPick?: (market: PickMarket, id: string) => void; onClaim?: (position: PickPosition) => void;
}) {
  const entrance = useEditorialEntrance('events:' + markets.map(m => m.id).join(','));
  if (!markets.length) return null;
  return <section ref={entrance} className={styles.personalHistory} aria-label={`${markets[0].sport} Events`} data-kind="events">
    <h3 className={styles.sectionTitle}>Events</h3>
    {markets.map(market => <EditorialMarketCard key={market.id} market={market} positions={positionsFor?.(market.id)} onPick={onPick} onClaim={onClaim} />)}
  </section>;
}

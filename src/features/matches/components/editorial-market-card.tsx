"use client";
import Link from "next/link";
import { useEditorialEntrance } from "../editorial-entrance";
import { matchDiscovery } from "@statoz/design-system/web/tokens/match-discovery.generated";
import { type PickMarket, type PickPosition } from "@/domain/predictions";
import { matchDemoAnchor } from "@/mocks/matches";
import { useDemoNow } from "@/shared/hooks";
import styles from "./editorial-discovery.module.css";
import { deadlineLabel } from "../editorial-format";
import { DiscoveryChrome as EditorialChrome } from '@statoz/design-system/web/components/data-display/discovery-card';
import { EditorialStatus, editorialPlateClass, editorialSportStyle } from './editorial-presentation';
import { usePicks } from "@/features/picks/state/picks-store";
import { useAuthSession } from "@/features/auth";
import { MarketOutcomeRow } from "./market-outcome-row";

export function EditorialMarketCard({ market, positions: supplied, onPick, onClaim, featured = false }: {
  market: PickMarket; featured?: boolean; positions?: PickPosition[];
  onPick?: (market: PickMarket, id: string) => void; onClaim?: (position: PickPosition) => void;
}) {
  const now = useDemoNow(matchDemoAnchor) ?? Date.parse(matchDemoAnchor);
  const entrance = useEditorialEntrance('pick:' + market.id);
  const picks = usePicks(), session = useAuthSession();
  const positions = supplied ?? (session.isAuthenticated ? picks.positions.filter(position => position.marketId === market.id) : []);
  const claimable = positions.find(p => p.status === "settleable");
  const type = market.type === "future" ? "Future" : market.type === "event" ? "Event" : "Match Pick";
  const outcomes = featured ? market.outcomes.slice(0, matchDiscovery.appearance.featuredOutcomes) : market.outcomes;
  return <article ref={entrance} className={editorialPlateClass} style={editorialSportStyle(market.sport)} data-kind={market.type ?? "pick"}>
    <EditorialChrome /><EditorialStatus sport={market.sport} label={`${market.leagueLabel} · ${type}`} status={market.status ?? (market.resolved ? "settled" : undefined)} timing={deadlineLabel(market.closesAt, market.status, now) || (market.status === "live" ? market.liveLabel : undefined)} />
    <Link href={`/picks/${market.id}`} className={styles.title}>{market.question}</Link>
    {!featured && market.contextTitle && <p className={styles.answer}>{market.contextTitle}</p>}
    <div className={styles.outcomes}>{outcomes.map(outcome => <MarketOutcomeRow key={outcome.id} market={market} outcome={outcome} onPick={onPick} />)}</div>
    {outcomes.length < market.outcomes.length && <Link className={styles.answer} href={`/picks/${market.id}`}>View all {market.outcomes.length} outcomes →</Link>}
    {(market.status === "voided" ? market.voidReason : market.resultNote) && <p className={styles.answer}>{market.status === "voided" ? market.voidReason : market.resultNote}</p>}
    <div className={styles.marketFooter}><span>{market.volumeOz.toLocaleString("en-GB")} Oz volume</span>{claimable && onClaim ? <button type="button" onClick={() => onClaim(claimable)}>Claim result ↗</button> : <Link href={`/picks/${market.id}`}>View {type} ↗</Link>}</div>
  </article>;
}

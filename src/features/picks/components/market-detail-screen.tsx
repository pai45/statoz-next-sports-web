"use client";
import { MarketOutcomeMark } from "@/features/matches/components/market-outcome-mark";
import { teamForMarketOutcome } from "@/features/matches/market-team";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { ArrowRightIcon, BrandIcon, FilterChips, InteractiveLineChart, QuizIcon, colors, liftForContrast } from "@statoz/design-system/web";
import { latestDeltaFor, marketCanBuy, payoutForShares, type PickMarket, type PickOutcome, type PickPosition } from "@/domain/predictions";
import { useAuthSession } from "@/features/auth";
import { hasLinkedFixture } from "@/mocks/picks";
import { formatInt, formatOzCompact } from "@/shared/utils";
import { chartOutcomes, historyForRange, initialOutcome, marketTimestamp, outcomeChartColor, type HistoryRange } from "../market-detail-presentation";
import type { PickTradeSuccess } from "../order";
import { pickMarketStatusColor, pickMarketStatusLabel, pickMarketTypeLabel, pickOutcomeCode, pickPositionColor, pickPositionLabel } from "../status";
import { selectPositionsForMarket, usePicks } from "../state/picks-store";
import { PickOrderForm, usePickOrder } from "./pick-order-form";
import { PickOrderDrawer } from "./pick-trade-sheet";
import { usePickTrading } from "./pick-trading";
import styles from "./market-detail.module.css";

export function MarketDetailScreen({ market }: { market: PickMarket }) {
  const picks = usePicks();
  const session = useAuthSession();
  const positions = session.isAuthenticated ? selectPositionsForMarket(picks, market.id) : [];
  const held = new Set(positions.map((position) => position.outcomeId));
  const trading = usePickTrading();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const selected = market.outcomes.find((outcome) => outcome.id === selectedId) ?? initialOutcome(market, positions);
  const selectedColor = outcomeChartColor(market, selected.id);
  const canBuy = marketCanBuy(market);

  function buy(outcomeId: string) { setSelectedId(outcomeId); setDrawerOpen(true); }

  return (
    <div className={styles.screen} data-market-detail style={{ "--selected-color": selectedColor } as CSSProperties}>
      <MarketHeader market={market} />
      <div className={styles.body}>
        <div className={styles.analysis}>
          <OddsChart market={market} selected={selected} onSelect={setSelectedId} />
          <section className={styles.panel} aria-labelledby="market-outcomes-title">
            <div className={styles.sectionTop}><h2 id="market-outcomes-title">Outcomes</h2><span>100 Oz payout per winning share</span></div>
            <div className={styles.tableHead} aria-hidden><span>Outcome</span><span>Chance</span><span>Pick</span></div>
            {market.outcomes.map((outcome) => <OutcomeRow key={outcome.id} market={market} outcome={outcome} selected={outcome.id === selected.id} held={held.has(outcome.id)} canBuy={canBuy} onSelect={() => setSelectedId(outcome.id)} onBuy={() => buy(outcome.id)} />)}
          </section>
          <section className={styles.about} aria-labelledby="market-about-title">
            <h2 id="market-about-title">How this pick works</h2>
            <p>Back an outcome with Oz Coins. Each share costs its current probability in Oz and pays 100 Oz if that outcome wins.</p>
            {market.voidReason || market.resultNote ? <p className={styles.resultNote}>{market.voidReason ?? market.resultNote}</p> : null}
            <span>Market status <b style={{ color: pickMarketStatusColor(market.status) }}>{pickMarketStatusLabel(market.status)}</b></span>
          </section>
        </div>
        <aside className={styles.sidebar} aria-label="Your picks and order ticket">
          <MarketOrder key={`${market.id}:${selected.id}`} market={market} outcome={selected} held={held.has(selected.id)} open={drawerOpen} onClose={() => setDrawerOpen(false)} onPlaced={(success) => { setDrawerOpen(false); trading.onPlaced(success); }} />
          <section className={styles.positions} aria-labelledby="market-positions-title">
            <div className={styles.positionsTitle}><h2 id="market-positions-title">Your positions</h2><span>{positions.length}</span></div>
            {positions.length ? positions.map((position) => <TicketPanel key={position.id} market={market} position={position} onClaim={() => trading.claim(position)} />) : <div className={styles.emptyPosition}><BrandIcon name="coin" size={24} /><p>{canBuy ? "Your first pick starts here." : "No position in this market."}</p><span>{canBuy ? "Choose an outcome to build your ticket." : "Buying is closed for this market."}</span></div>}
          </section>
          {hasLinkedFixture(market) ? <Link href={`/matches/${market.matchId}`} className={styles.quizCta}><QuizIcon size={18} aria-hidden="true" /><span>Prediction Quiz<small>Put your match knowledge to the test</small></span><ArrowRightIcon size={18} aria-hidden="true" /></Link> : null}
        </aside>
      </div>
      <div className={styles.mobileOrder}>
        <span><small>Your pick</small><strong>{selected.label}</strong><span>{selected.probabilityPercent}% chance</span></span>
        <button type="button" disabled={!canBuy} onClick={(event) => { event.currentTarget.focus(); buy(selected.id); }}>{canBuy ? `Buy · ${selected.probabilityPercent} Oz` : pickMarketStatusLabel(market.status)}<ArrowRightIcon size={16} aria-hidden="true" /></button>
      </div>
      {trading.overlays}
    </div>
  );
}

function MarketHeader({ market }: { market: PickMarket }) {
  return (
    <header className={styles.header}>
      <div className={styles.headerMain}>
        <span className={styles.leagueMark} aria-hidden>{market.leagueLabel.slice(0, 3)}</span>
        <div className={styles.identity}>
          <div className={styles.eyebrow}><span>{market.leagueLabel}</span><span className={styles.separator}>/</span><span>{pickMarketTypeLabel(market.type)}</span><span className={styles.status} style={{ "--status-color": pickMarketStatusColor(market.status) } as CSSProperties}><i />{market.status === "live" ? market.liveLabel ?? "LIVE" : pickMarketStatusLabel(market.status)}</span></div>
          <h1>{market.question}</h1>
          {market.homeLabel && market.awayLabel ? <p className={styles.score}><span>{market.homeLabel} <b>{market.homeScore ?? "—"}</b></span><span className={styles.separator}>—</span><span>{market.awayLabel} <b>{market.awayScore ?? "—"}</b></span>{market.contextSubtitle ? <small>{market.contextSubtitle}</small> : null}</p> : market.contextTitle || market.contextSubtitle ? <p className={styles.context}>{[market.contextTitle, market.contextSubtitle].filter(Boolean).join(" · ")}</p> : null}
        </div>
      </div>
      <div className={styles.metadata}><span><i className={styles.volumeIcon} aria-hidden>↗</i><b>{formatOzCompact(market.volumeOz)} Oz</b> volume</span><span className={styles.closeTime}>Closes <time dateTime={market.closesAt}>{marketTimestamp(market.closesAt)}</time></span></div>
    </header>
  );
}

function OutcomeRow({ market, outcome, selected, held, canBuy, onSelect, onBuy }: {
  market: PickMarket; outcome: PickOutcome; selected: boolean; held: boolean; canBuy: boolean; onSelect: () => void; onBuy: () => void;
}) {
  const identityColor = liftForContrast(outcome.color ?? colors.accent.cyan, { against: colors.background.secondary });
  return (
    <div className={styles.outcomeRow} data-selected={selected} style={{ "--outcome-color": outcomeChartColor(market, outcome.id), "--identity-color": identityColor } as CSSProperties}>
      <button type="button" className={styles.outcomeSelect} aria-pressed={selected} onClick={onSelect}>
        {teamForMarketOutcome(market, outcome) ? <MarketOutcomeMark market={market} outcome={outcome} size={36}/> : <span className={styles.outcomeMark} aria-hidden>{pickOutcomeCode(outcome.label)}</span>}
        <span className={styles.outcomeName}><strong>{outcome.label}{held ? <small>Held</small> : null}</strong><span>{outcome.probabilityPercent} Oz / share</span></span>
      </button>
      <div className={styles.chance}><b>{outcome.probabilityPercent}<small>%</small></b><span aria-hidden><i style={{ width: `${outcome.probabilityPercent}%` }} /></span></div>
      <button className={styles.buyButton} type="button" disabled={!canBuy} aria-label={canBuy ? `Buy ${outcome.label} at ${outcome.probabilityPercent} Oz per share` : `${outcome.label}: buying closed`} onClick={(event) => { event.currentTarget.focus(); onBuy(); }}>{canBuy ? "Buy" : "Closed"}<ArrowRightIcon size={14} aria-hidden="true" /></button>
    </div>
  );
}

const desktopQuery = "(min-width: 960px)";
function subscribeDesktop(change: () => void) { const query = window.matchMedia(desktopQuery); query.addEventListener("change", change); return () => query.removeEventListener("change", change); }
function desktopSnapshot() { return window.matchMedia(desktopQuery).matches; }
function serverDesktopSnapshot() { return false; }

function MarketOrder({ market, outcome, held, open, onClose, onPlaced }: {
  market: PickMarket; outcome: PickOutcome; held: boolean; open: boolean; onClose: () => void; onPlaced: (success: PickTradeSuccess) => void;
}) {
  const desktop = useSyncExternalStore(subscribeDesktop, desktopSnapshot, serverDesktopSnapshot);
  const order = usePickOrder(market, outcome, onPlaced, onClose);
  const ref = useRef<HTMLElement>(null);
  useEffect(() => { if (open && desktop) { ref.current?.querySelector("input")?.focus(); onClose(); } }, [open, desktop, onClose]);
  if (!desktop) return <PickOrderDrawer open={open} market={market} outcome={outcome} order={order} onClose={onClose} />;
  return (
    <section ref={ref} className={`${styles.panel} ${styles.orderPanel}`} aria-labelledby="market-order-title">
      <div className={styles.orderTitle}><h2 id="market-order-title">Make your pick</h2><span>BUY</span></div>
      <div className={styles.selectedOutcome}><span className={styles.selectedDot} /><div><strong>{outcome.label}</strong><small>{held ? "You hold this outcome" : "Selected outcome"}</small></div><b>{outcome.probabilityPercent}<small>%</small></b></div>
      <PickOrderForm outcome={outcome} order={order} />
    </section>
  );
}

function TicketPanel({ market, position, onClaim }: { market: PickMarket; position: PickPosition; onClaim: () => void }) {
  const final = ["won", "lost", "voided"].includes(position.status);
  return (
    <article className={styles.ticket}>
      <div className={styles.ticketTop}><strong>{position.outcomeLabel}</strong><span style={{ color: pickPositionColor(position.status) }}>{pickPositionLabel(position.status)}</span></div>
      <dl className={styles.ticketMetrics}><div><dt>Stake</dt><dd>{formatInt(position.stakeOz)} Oz</dd></div><div><dt>Shares</dt><dd>{formatInt(position.shareCount)}</dd></div><div><dt>{final ? "Payout" : "Max payout"}</dt><dd>{formatInt(final ? position.payoutOz : payoutForShares(position.shareCount))} Oz</dd></div></dl>
      {position.status === "settleable" ? <button type="button" className={styles.claimButton} onClick={onClaim}><BrandIcon name="coin" size={16} />{market.status === "voided" ? "Claim refund" : "Reveal result"}<ArrowRightIcon size={16} aria-hidden="true" /></button> : final ? <p className={styles.ticketResult} style={{ color: pickPositionColor(position.status) }}>{position.status === "won" ? `+${formatInt(position.payoutOz - position.stakeOz)} Oz profit` : position.status === "voided" ? "Stake refunded" : `${formatInt(position.stakeOz)} Oz spent`}</p> : null}
    </article>
  );
}

function OddsChart({ market, selected, onSelect }: { market: PickMarket; selected: PickOutcome; onSelect: (id: string) => void }) {
  const [range, setRange] = useState<HistoryRange>("All");
  const [scrub, setScrub] = useState<{ outcome: string; index: number } | null>(null);
  const plotted = useMemo(() => chartOutcomes(market, selected), [market, selected]);
  const history = useMemo(() => historyForRange(market.priceHistory ?? [], range).filter((point) => plotted.every((outcome) => Number.isFinite(point.percentsByOutcome[outcome.id]))), [market.priceHistory, range, plotted]);
  const series = plotted.map((outcome, index) => ({ id: outcome.id, label: outcome.label, color: outcomeChartColor(market, outcome.id), fill: index === 0, values: history.map((point) => point.percentsByOutcome[outcome.id]) }));
  const selectedIndex = scrub?.outcome === selected.id ? Math.min(scrub.index, Math.max(0, history.length - 1)) : null;
  const active = selectedIndex ?? history.length - 1;
  const delta = latestDeltaFor(market, selected.id);

  return (
    <section className={`${styles.panel} ${styles.chartPanel}`} aria-labelledby="market-chart-title">
      <div className={styles.chartTop}><h2 id="market-chart-title">Market probability</h2><span>{history.length} price {history.length === 1 ? "update" : "updates"}</span></div>
      <div className={styles.chartHero}><div><span className={styles.heroLabel}><i />{selected.label}</span><div className={styles.heroValue}>{selected.probabilityPercent}<span>%</span><small>chance</small></div></div><div className={styles.change}>{delta != null ? <><b style={{ color: delta > 0 ? "var(--ds-color-success)" : delta < 0 ? "var(--ds-color-accent-orange)" : undefined }}>{delta > 0 ? "+" : ""}{delta} pp</b><small>since previous update</small></> : <small>No previous update</small>}</div></div>
      <div className={styles.chartToolbar}><FilterChips options={["All", "Week", "Day"]} selected={range} onSelect={(value) => { setRange(value as HistoryRange); setScrub(null); }} label="Price history range" /><span>Probability · %</span></div>
      {history.length >= 2 ? <>
        <div className={styles.chartArea}><div className={styles.yAxis} aria-hidden><span>100%</span><span>50%</span><span>0%</span></div><InteractiveLineChart className={styles.plot} series={series} stepped scale={{ min: 0, max: 100 }} selectedIndex={selectedIndex} onSelectedIndexChange={(index) => setScrub({ outcome: selected.id, index })} label={`${market.question} price history`} valueText={(_, index) => `${marketTimestamp(history[index]?.at)}. ${series.map((line) => `${line.label} ${line.values[index]} percent`).join(", ")}`} height="20rem" /></div>
        <div className={styles.xAxis} aria-hidden>{[0, Math.floor((history.length - 1) / 2), history.length - 1].filter((index, i, indexes) => indexes.indexOf(index) === i).map((index) => <span key={index}>{marketTimestamp(history[index].at, true)}</span>)}</div>
      </> : <div className={styles.sparseHistory}><span aria-hidden>↗</span><strong>{history.length ? "One price update in this range" : "No price history in this range"}</strong><p>{history.length ? "A trend will appear when more prices are available." : "Try another range. Current outcome prices are shown below."}</p></div>}
      <div className={styles.legend} aria-label="Chart outcomes">{series.map((line) => <button key={line.id} type="button" aria-pressed={line.id === selected.id} style={{ "--line-color": line.color } as CSSProperties} onClick={() => onSelect(line.id)}><i aria-hidden /><span>{line.label}</span><b>{history[active]?.percentsByOutcome[line.id] ?? market.outcomes.find((outcome) => outcome.id === line.id)!.probabilityPercent}%</b></button>)}</div>
      <div className={styles.chartFootnote}><span>{active >= 0 ? `Sample: ${marketTimestamp(history[active]?.at)}` : "Latest listed probabilities"}</span>{history.length >= 2 ? <span>Drag or use ← → to explore</span> : null}</div>
    </section>
  );
}

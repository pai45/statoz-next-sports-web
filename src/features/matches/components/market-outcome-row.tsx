"use client";
import type { CSSProperties } from "react";
import { CheckIcon, colors, liftForContrast } from "@statoz/design-system/web";
import { marketCanBuy, type PickMarket, type PickOutcome } from "@/domain/predictions";
import { editorialPercentageInk } from "../editorial-accent";
import { MarketOutcomeMark } from "./market-outcome-mark";
import styles from "./market-outcome-row.module.css";

export function MarketOutcomeRow({ market, outcome, onPick }: { market: PickMarket; outcome: PickOutcome; onPick?: (market: PickMarket, id: string) => void }) {
  const fill = liftForContrast(outcome.color ?? colors.accent.cyan, { against: colors.fixture.base });
  const winner = market.status === "settled" && market.resolvedOutcomeId === outcome.id;
  const content = <><MarketOutcomeMark market={market} outcome={outcome} /><span className={styles.label}>{outcome.label}</span>{winner && <span className={styles.winner}><CheckIcon size={14} aria-hidden="true" /><span>Winner</span></span>}<b className={styles.percent}>{outcome.probabilityPercent}%</b></>;
  const style = { "--outcome-fill": fill, "--outcome-ink": editorialPercentageInk(fill) } as CSSProperties;
  return marketCanBuy(market) && onPick ? <button type="button" className={styles.row} style={style} aria-label={`Pick ${outcome.label}, ${outcome.probabilityPercent}% chance`} onClick={() => onPick(market, outcome.id)}>{content}</button> : <div className={styles.row} style={style} data-winner={winner || undefined}>{content}</div>;
}

"use client";

import { useId, useRef, type CSSProperties, type ReactNode } from "react";
import { FilterChips, accentVar } from "@statoz/design-system/games";
import type { SportMatch } from "@/domain/matches";
import { sportModuleFor } from "@/domain/sports";
import styles from "./match-stats.module.css";

/** One report frame and one scroll owner across all five sports. */
export function MatchStatsLayout({ match, sections, selected, onSelect, children }: {
  match: SportMatch; sections: string[]; selected: string; onSelect: (section: string) => void; children: ReactNode;
}) {
  const panelId = useId();
  const scroll = useRef<HTMLDivElement>(null);
  const sport = sportModuleFor(match.sport);
  const label = match.status === "scheduled" ? "PRE-MATCH" : match.status === "live" ? "LIVE MATCH" : "MATCH COMPLETE";
  return <div className={styles.statsView} data-match-stats={match.sport}
    style={{ "--report-accent": accentVar(sport.accent) } as CSSProperties}>
    <header className={styles.reportHeader}>
      <div><span className={styles.reportEyebrow}>{match.sport === "basketball" ? "Basketball" : sport.label} / MATCH CENTRE</span><h2>Inside the match<span aria-hidden="true">.</span></h2></div>
      <span className={styles.reportStatus} data-status={match.status}><i aria-hidden="true" />{label}</span>
    </header>
    <FilterChips options={sections} selected={selected} onSelect={next => {
      onSelect(next);
      scroll.current?.scrollTo({ top: 0, behavior: "instant" });
    }} label={`${sport.label} report sections`} panelId={panelId} accent={accentVar(sport.accent)} className={styles.reportTabs} />
    <div ref={scroll} id={panelId} role="tabpanel" aria-label={selected} tabIndex={0} className={styles.statsScroll}>{children}</div>
  </div>;
}

/** A continuous clipped edge, with content kept clear of the cut corners. */
export function ReportPanel({ title, children, full = false }: { title: string; children: ReactNode; full?: boolean }) {
  return <section className={`${styles.tight} ${styles.reportPanel} ${full ? styles.fullPanel : ""}`}><h3 className={styles.sectionHeading}>{title}</h3>{children}</section>;
}

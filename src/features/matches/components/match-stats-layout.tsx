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
  return <div className={styles.statsView} data-match-stats={match.sport} data-status={match.status}
    style={{ "--report-accent": accentVar(sport.accent) } as CSSProperties}>
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

"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { InteractiveLineChart } from "@statoz/design-system/web";
import type { F1RaceReport, SportMatch } from "@/domain/matches";
import { publicAsset } from "@/shared/config";
import { statText } from "../stats-presentation";
import { EmptyPanel } from "./match-stats-shell";
import { MatchStatsLayout, ReportPanel } from "./match-stats-layout";
import styles from "./motorsport-stats-view.module.css";

const tabs = ["RACE", "WEEKEND", "QUALIFYING"];

export function MotorsportStatsView({ match, report }: { match: SportMatch; report: F1RaceReport }) {
  const [tab, setTab] = useState(tabs[0]);
  return <MatchStatsLayout match={match} sections={tabs} selected={tab} onSelect={setTab}>
    {tab === "RACE" && <RaceView report={report} finished={match.status === "finished"} />}
    {tab === "WEEKEND" && <WeekendView report={report} />}
    {tab === "QUALIFYING" && <QualifyingView report={report} />}
  </MatchStatsLayout>;
}

function RaceView({ report, finished }: { report: F1RaceReport; finished: boolean }) {
  return <div className={styles.stack}>
    <ReportPanel title={report.circuit.fullName} full>
      <div className={styles.circuit}>
        <div className={styles.pills}><span>{report.abbreviation}</span><span>SEASON {report.season}</span></div>
        <Link href={`/matches/${report.id}/track`} className={styles.mapLink} aria-label={`Expand ${report.circuit.fullName} track map`}>
          <Image src={publicAsset(report.circuit.asset)} alt="" width={800} height={480} unoptimized />
          <span>EXPAND TRACK</span>
        </Link>
        <dl className={styles.metrics}><div><dt>LAPS</dt><dd>{statText(report.circuit.laps)}</dd></div><div><dt>LAP</dt><dd>{statText(report.circuit.lengthKm)} KM</dd></div><div><dt>TURNS</dt><dd>{statText(report.circuit.turns)}</dd></div></dl>
        <p className={styles.record}>LAP RECORD <b>{statText(report.circuit.lapRecord)}</b> · {statText(report.circuit.lapRecordDriver)}</p>
        {finished && <div className={styles.winner}><span>RACE WINNER</span><strong>{report.winner.name}</strong><b>FROM P{report.winner.grid}</b></div>}
      </div>
    </ReportPanel>
    <ReportPanel title={finished ? "RACE CLASSIFICATION" : "PUBLISHED RACE POSITIONS"}>
      {report.race.length ? <ol className={styles.rows}>{report.race.map(entry => <li key={entry.driverId}>
        <i style={{ background: entry.color }} /><b>P{entry.position}</b><span>{entry.name}<small>{entry.constructor}</small></span><strong>{entry.gap || entry.status || "—"}</strong>
      </li>)}</ol> : <EmptyPanel title="Race classification unavailable" message="Driver results have not been published." />}
    </ReportPanel>
    <ReportPanel title="GRID TO FINISH">
      {report.race.length ? <ol className={styles.rows}>{report.race.map(entry => {
        const valid = Number.isFinite(entry.grid) && entry.grid > 0 && Number.isFinite(entry.position) && entry.position > 0;
        const delta = entry.grid - entry.position;
        return <li key={entry.driverId}><i style={{ background: entry.color }} /><b>P{entry.position}</b><span>{entry.name}<small>STARTED P{entry.grid || "—"}</small></span>
          <strong className={valid ? delta > 0 ? styles.up : delta < 0 ? styles.down : undefined : undefined} aria-label={valid ? `${Math.abs(delta)} places ${delta > 0 ? "gained" : delta < 0 ? "lost" : "changed"}` : "Grid position unavailable"}>
            {!valid ? "—" : delta > 0 ? `↑ ${delta}` : delta < 0 ? `↓ ${Math.abs(delta)}` : "0"}
          </strong></li>;
      })}</ol> : <EmptyPanel title="Position changes unavailable" message="Starting and finishing positions have not been published." />}
    </ReportPanel>
  </div>;
}

function WeekendView({ report }: { report: F1RaceReport }) {
  const [index, setIndex] = useState(Math.max(0, report.weekendTicks.length - 1));
  const drivers = report.weekendDrivers.filter(driver => driver.positions.length);
  const selected = Math.min(index, Math.max(0, report.weekendTicks.length - 1));
  return <div className={styles.stack}>
    <ReportPanel title="WEEKEND POSITION TRACK" full>
      {report.weekendTicks.length && drivers.length ? <div className={styles.chartPanel}>
        <div className={styles.chartReadout}><span>{report.weekendTicks[selected]}</span><strong>{drivers[0].name} · P{statText(drivers[0].positions[selected])}</strong></div>
        <InteractiveLineChart series={drivers.map(driver => ({ id: driver.id, label: driver.abbreviation, values: driver.positions, color: driver.color }))}
          selectedIndex={selected} onSelectedIndexChange={setIndex} label="Weekend position by session"
          valueText={(value, point) => `${report.weekendTicks[point]}, position ${value}`} invertYAxis scale={{ min: 1, max: 22 }} axisFormatter={value => `P${value}`} height={260} />
        <div className={styles.axis}>{report.weekendTicks.map(tick => <span key={tick}>{tick}</span>)}</div>
      </div> : <EmptyPanel title="Weekend progression unavailable" message="Session position samples have not been published." />}
    </ReportPanel>
    {report.sessions.filter(session => session.label !== "Race").map(session => <ReportPanel key={session.id} title={session.label}>
      {session.classification.length ? <div className={styles.session}>{session.classification.map(entry => <p key={entry.driverId}><b>P{entry.position}</b><span>{entry.name}</span><strong>{entry.gap || entry.status || "—"}</strong></p>)}</div>
        : <EmptyPanel title="Session results unavailable" message="This session has no published classification." />}
    </ReportPanel>)}
  </div>;
}

function QualifyingView({ report }: { report: F1RaceReport }) {
  const qualifying = report.sessions.find(session => session.label.toLowerCase().includes("qual"));
  return <div className={styles.stack}><ReportPanel title="QUALIFYING CLASSIFICATION" full>
    {qualifying?.classification.length ? <ol className={styles.rows}>{qualifying.classification.map(entry => <li key={entry.driverId}>
      <i style={{ background: entry.color }} /><b>P{entry.position}</b><span>{entry.name}<small>{entry.constructor}</small></span><strong>{entry.gap || entry.status || "—"}</strong>
    </li>)}</ol> : <EmptyPanel title="Qualifying unavailable" message="Qualifying classifications have not been published for this weekend." />}
    <p className={styles.honesty}>Session classifications are shown as published. Missing lap and sector telemetry is not estimated.</p>
  </ReportPanel></div>;
}

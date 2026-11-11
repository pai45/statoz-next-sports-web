"use client";

import Link from "next/link";
import { useState } from "react";
import type { MatchDetailScoreboard, SportMatch } from "@/domain/matches";
import { tennisSetRows } from "../stats-presentation";
import { CommentaryView } from "./match-report-parts";
import { MatchStatsLayout, ReportPanel } from "./match-stats-layout";
import { EmptyPanel, MatchIntelPanel, StatComparisonRow, TeamLegendRow } from "./match-stats-shell";
import { TeamBadge } from "./team-badge";
import styles from "./match-stats.module.css";

const sections = ["OVERVIEW", "SETS", "PLAYERS", "COMMENTARY"];

export function TennisStatsView({ match, scoreboard }: { match: SportMatch; scoreboard: MatchDetailScoreboard }) {
  const [selected, setSelected] = useState(sections[0]);
  return <MatchStatsLayout match={match} sections={sections} selected={selected} onSelect={setSelected}>
    {selected === "OVERVIEW" && <div className={styles.stack}>
      <ReportPanel title="SET BY SET" full><TennisSets match={match} scoreboard={scoreboard} /></ReportPanel>
      <ReportPanel title="SERVE & RETURN"><TeamLegendRow match={match} />
        {scoreboard.stats.length ? scoreboard.stats.map(stat => <StatComparisonRow key={stat.label} stat={stat} homeColor={match.home.color} awayColor={match.away.color} />)
          : <EmptyPanel title="Statistics unavailable" message="Serve and return statistics have not been published." />}
      </ReportPanel>
      <ReportPanel title="MATCH INTEL"><MatchIntelPanel match={match} intel={scoreboard.intel} /></ReportPanel>
    </div>}
    {selected === "SETS" && <div className={styles.stack}><ReportPanel title="SET SCORES" full><TennisSets match={match} scoreboard={scoreboard} /></ReportPanel></div>}
    {selected === "PLAYERS" && <div className={styles.stack}>
      {([match.home, match.away]).map((player, index) => {
        const dossier = scoreboard.players?.find(entry => entry.id === player.id || entry.name === player.name);
        return <ReportPanel key={player.id} title={`PLAYER ${index + 1}`}>
          <div className={styles.participant}><TeamBadge team={player} size={64} /><div><h4>{player.name}</h4><p>Match participant</p>
            {dossier && <Link href={`/matches/${match.id}/players/${dossier.id}`} className={styles.participantLink}>View player details ↗</Link>}
          </div></div>
        </ReportPanel>;
      })}
    </div>}
    {selected === "COMMENTARY" && <CommentaryView match={match} commentary={scoreboard.commentary} />}
  </MatchStatsLayout>;
}

function TennisSets({ match, scoreboard }: { match: SportMatch; scoreboard: MatchDetailScoreboard }) {
  const sets = tennisSetRows(match, scoreboard);
  if (!sets.length) return <EmptyPanel title="Set scores unavailable" message="Set-by-set scores have not been published for this match." />;
  return <div className={styles.tableScroll} role="region" aria-label="Tennis set scores" tabIndex={0}>
    <table className={`${styles.card} ${styles.setTable}`}>
      <caption className="sr-only">{match.home.name} against {match.away.name}: set scores</caption>
      <thead><tr><th scope="col">PLAYER</th>{sets.map((set, index) => <th scope="col" key={index}>{set.label}</th>)}</tr></thead>
      <tbody>{(["home", "away"] as const).map(side => <tr key={side}>
        <th scope="row">{match[side].name}</th>{sets.map((set, index) => <td key={index}><b>{set[side]}</b></td>)}
      </tr>)}</tbody>
    </table>
  </div>;
}

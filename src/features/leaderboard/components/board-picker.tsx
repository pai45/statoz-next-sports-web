"use client";

import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { CheckIcon, FilterChips, SearchField } from "@statoz/design-system/games";
import { accentVar, GameMarkIcon } from "@statoz/design-system/web";
import { sportModuleFor, sportOrder, type Sport } from "@/domain/sports";
import { artGameFor } from "@/features/games/components/game-scenes";
import { SportIcon } from "@/features/matches/components/sport-icon";
import { gameRegistry, sportGameDecks } from "@/mocks/games";
import { leaderboardLeagues } from "../leagues";
import type { LeaderboardSelection } from "../selection";
import type { LeaderboardType } from "../types";
import styles from "./board.module.css";

type Option = { id: string; label: string; mark: ReactNode; markAccent?: string };

const typeOptions = ["MATCHES", "QUIZ"];

/**
 * Every board in one list: MATCHES lists each sport's leagues, QUIZ each
 * sport's games, grouped under the sport in its own accent. Sits in the rail
 * on desktop and in a drawer on smaller screens.
 */
export function BoardPicker({ selection, accent, onType, onSelect }: {
  selection: LeaderboardSelection;
  accent: string;
  onType: (type: LeaderboardType) => void;
  onSelect: (sport: Sport, id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const baseId = useId();
  const list = useRef<HTMLDivElement>(null);
  const quiz = selection.type === "games";
  const activeKey = `${selection.type}:${selection.sport}:${quiz ? selection.mode : selection.league}`;

  /**
   * Bring the open board into view: inside the list when it scrolls itself
   * (the rail), otherwise inside whatever holds it (the drawer). Deferred a
   * frame so a drawer that is opening has been shown first.
   */
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const container = list.current;
      const active = container?.querySelector<HTMLElement>("[aria-current]");
      if (!container || !active) return;
      if (container.scrollHeight > container.clientHeight + 1) {
        const top = active.offsetTop;
        const hidden = top < container.scrollTop || top + active.offsetHeight > container.scrollTop + container.clientHeight;
        if (hidden) container.scrollTop = top - (container.clientHeight - active.offsetHeight) / 2;
      } else {
        active.scrollIntoView({ block: "nearest" });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [activeKey]);
  const needle = query.trim().toLocaleLowerCase();
  const groups = sportOrder.map((sport) => {
    const sportLabel = sportModuleFor(sport).label.toUpperCase();
    const options: Option[] = quiz
      ? sportGameDecks[sport].map((id) => ({
        id,
        label: gameRegistry[id].title,
        mark: <GameMarkIcon game={artGameFor(id)} size={20} aria-hidden="true" />,
        markAccent: accentVar(gameRegistry[id].accent),
      }))
      : leaderboardLeagues[sport].map((league) => ({ id: league.id, label: league.label, mark: league.short }));
    const matchesSport = sportLabel.toLocaleLowerCase().includes(needle);
    return { sport, sportLabel, options: options.filter((option) => !needle || matchesSport || option.label.toLocaleLowerCase().includes(needle)) };
  }).filter((group) => group.options.length > 0);

  return <nav aria-label="Leaderboard boards" className={styles.picker}>
    <FilterChips label="Board type" options={typeOptions} selected={quiz ? "QUIZ" : "MATCHES"} accent={accent}
      onSelect={(value) => onType(value === "QUIZ" ? "games" : "matches")} className={styles.typeChips} />
    <SearchField label={quiz ? "Search quiz games" : "Search leagues"} placeholder={quiz ? "Find a game" : "Find a league"}
      value={query} onChange={(event) => setQuery(event.target.value)} onClear={() => setQuery("")} />
    <div ref={list} className={styles.gameList}>
      {groups.map(({ sport, sportLabel, options }) => {
        const headingId = `${baseId}-${sport}`;
        return <div key={sport} role="group" aria-labelledby={headingId} className={styles.sportGroup}
          style={{ "--sport-accent": accentVar(sportModuleFor(sport).accent) } as CSSProperties}>
          <p id={headingId} className={styles.sportHeading}><SportIcon sport={sport} size={14} aria-hidden="true" />{sportLabel}</p>
          {options.map((option) => {
            const active = selection.sport === sport && (quiz ? selection.mode === option.id : selection.league === option.id);
            return <button type="button" key={option.id} className={styles.boardOption} aria-current={active ? "true" : undefined} onClick={() => onSelect(sport, option.id)}>
              <span className={styles.optionMark} aria-hidden="true" style={option.markAccent ? { "--mark-accent": option.markAccent } as CSSProperties : undefined}>{option.mark}</span>
              <span className={styles.optionCopy}><strong>{option.label}</strong></span>
              {active && <CheckIcon size={16} aria-hidden="true" />}
            </button>;
          })}
        </div>;
      })}
      {groups.length === 0 && <p className={styles.emptySearch} role="status">{quiz ? "No games match." : "No leagues match."} Try another name.</p>}
    </div>
  </nav>;
}

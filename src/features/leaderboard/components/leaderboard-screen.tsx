"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { flushSync } from "react-dom";

import {
  AdaptiveDrawer,
  ChevronRightIcon,
  ExpandableSearchField,
  FilterChips,
  NoDataState,
  PageSearchHeader,
  PersonSearchIcon,
  ScheduleIcon,
} from "@statoz/design-system/games";
import { accentVar } from "@statoz/design-system/web";
import { sportModuleFor, type Sport } from "@/domain/sports";
import { AdSlot } from "@/features/ads";
import { useAuthSession, useRequireAuth } from "@/features/auth";
import { SportIcon } from "@/features/matches/components/sport-icon";
import { RivalDossierOverlay } from "@/features/profile/components/rival-dossier";
import { usePlayerStanding, type PlayerStanding } from "@/features/profile/state/player-standing";
import { isPro, rivalSeedByName } from "@/mocks/leaderboard";

import { leaderboardCountdown, leaderboardWindow, windowRange } from "../periods";
import { searchEntries } from "../scoring";
import {
  boardContext,
  boardTitle,
  leaderboardHref,
  normalizeSelection,
  parseLeaderboardSelection,
  type LeaderboardSelection,
} from "../selection";
import { useBoardEntries } from "../state/use-board-entries";
import { useLeaderboardClock } from "../state/use-leaderboard-clock";
import type { GameMode, LeaderboardEntry, TournamentScope } from "../types";

import { BoardPicker } from "./board-picker";
import { LeaderboardDetails } from "./leaderboard-details";
import { PodiumStage } from "./podium-stage";
import { comparisonFor, Standings, StandingsEmpty } from "./standings";
import { YourStanding } from "./your-standing";
import styles from "./board.module.css";

/**
 * LEADERBOARD — where you stand, laid out like the Games web's board.
 *
 * A page title with player search, every board (each sport's leagues under
 * MATCHES, its games under QUIZ) in the left rail, and one bracketed board:
 * its name and period chips, the period's dates and reset clock, the podium,
 * then the standings table. Below desktop width the rail folds into a drawer
 * behind the board's title, and your own rank docks above the bottom bar.
 */

const scopeChips: { id: TournamentScope; label: string }[] = [
  { id: "weekly", label: "WEEKLY" },
  { id: "season", label: "SEASON" },
  { id: "allTime", label: "ALL-TIME" },
];

type OpenRival = { name: string; rank: number; xp: number; pro: boolean };

export function LeaderboardScreen() {
  const session = useAuthSession();
  if (session.status === "authenticated") return <PersonalizedLeaderboard />;
  return <LeaderboardWorkspace />;
}

function PersonalizedLeaderboard() {
  const player = usePlayerStanding();
  return <LeaderboardWorkspace player={player} authenticated />;
}

function LeaderboardWorkspace({ player = null, authenticated = false }: { player?: PlayerStanding | null; authenticated?: boolean }) {
  const router = useRouter();
  const query = useSearchParams();
  const requireAuth = useRequireAuth();
  const now = useLeaderboardClock();
  const [selection, setSelection] = useState<LeaderboardSelection>(() => parseLeaderboardSelection(query));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [openRival, setOpenRival] = useState<OpenRival | null>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const dossierTrigger = useRef<HTMLElement | null>(null);
  const boardTitleId = useId();

  const href = leaderboardHref(selection);
  const currentParams = query.toString();
  useEffect(() => {
    if (currentParams !== href.split("?")[1]) router.replace(href, { scroll: false });
  }, [currentParams, href, router]);

  const { entries, meta, user, isTeamBoard } = useBoardEntries({
    type: selection.type,
    board: selection.board,
    scope: selection.scope,
    mode: selection.mode,
    leagueId: selection.league,
    player,
  });

  const accent = accentVar(sportModuleFor(selection.sport).accent);
  const title = boardTitle(selection);
  const context = boardContext(selection);
  const periodWindow = now === null ? null : leaderboardWindow(selection.scope, now);
  const range = periodWindow ? windowRange(periodWindow) : null;
  const searching = search.trim().length > 0;
  const results = searching ? searchEntries(entries, search) : entries;
  const hasPodium = !searching && entries.length >= 3;
  const tableEntries = searching ? results : hasPodium ? entries.slice(3) : entries;
  const boardKey = `${selection.type}-${selection.sport}-${selection.league}-${selection.mode}-${selection.board}-${selection.scope}`;

  function update(next: Partial<LeaderboardSelection>) {
    setSelection((current) => normalizeSelection({ ...current, ...next }));
  }

  function selectBoard(sport: Sport, id: string) {
    update(selection.type === "games" ? { sport, mode: id as GameMode } : { sport, league: id });
    setPickerOpen(false);
  }

  /** Your own row is your profile; a rival's opens their dossier. Team rows open nothing. */
  function open(entry: LeaderboardEntry) {
    if (!authenticated) {
      requireAuth({ intent: "compare profiles", message: "Log in to compare your standing with other players.", returnTo: href });
      return;
    }
    if (entry.isUser) {
      router.push("/profile");
      return;
    }
    const seed = rivalSeedByName(entry.name);
    if (!seed) return;
    dossierTrigger.current = document.activeElement as HTMLElement | null;
    setOpenRival({ name: seed.name, rank: entry.rank, xp: seed.base, pro: isPro(seed) });
  }
  const onOpen = isTeamBoard ? undefined : open;

  /** Brings your row (or podium place) into view and flashes it. */
  function showMyRow() {
    if (searching) flushSync(() => setSearch(""));
    const row = document.querySelector<HTMLElement>("[data-leaderboard-workspace] [data-self]");
    if (!row) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    row.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
    row.removeAttribute("data-flash");
    void row.offsetWidth;
    row.setAttribute("data-flash", "");
    window.setTimeout(() => row.removeAttribute("data-flash"), 1300);
  }

  const standing = user ? <YourStanding entry={user} meta={meta} scope={selection.scope} avatarSrc={player?.avatarSrc} frameColor={player?.frameColor} onShow={showMyRow} /> : null;
  const picker = <BoardPicker selection={selection} accent={accent} onType={(type) => update({ type })} onSelect={selectBoard} />;

  return <div className="flex flex-1 flex-col" style={{ "--leaderboard-accent": accent } as CSSProperties} data-leaderboard-workspace>
    <div className={styles.workspace}>
      <PageSearchHeader title="Leaderboard">
        <ExpandableSearchField ref={searchInput} label={isTeamBoard ? "Search leaderboard teams" : "Search leaderboard players"}
          placeholder={isTeamBoard ? "Search teams…" : "Search players…"} value={search} enterKeyHint="search"
          onChange={(event) => setSearch(event.target.value)} onClear={() => { setSearch(""); searchInput.current?.focus(); }} />
      </PageSearchHeader>

      <div className={styles.workspaceGrid}>
        <aside className={styles.rail}>
          {picker}
          {standing}
          {entries.length > 0 ? <AdSlot placement="leaderboard-rail" /> : null}
        </aside>

        <div className={styles.boardColumn}>
          <section className={styles.board} aria-labelledby={boardTitleId} data-type={selection.type} data-scope={selection.scope}>
            <header className={styles.boardHeader}>
              <div className={styles.boardIdentity}>
                <span className={styles.identityMark}><SportIcon sport={selection.sport} size={24} aria-hidden="true" /></span>
                <div><span className={styles.eyebrow}>{context}{isTeamBoard ? " · TEAMS" : ""}</span><h2 id={boardTitleId}>{title}</h2></div>
              </div>
              <button type="button" className={styles.mobilePicker} onClick={() => setPickerOpen(true)}
                aria-label={`Choose leaderboard. Showing ${context}, ${title}`} aria-haspopup="dialog" aria-expanded={pickerOpen}>
                <span className={styles.identityMark}><SportIcon sport={selection.sport} size={20} aria-hidden="true" /></span>
                <span><span className={styles.eyebrow}>{context}</span><strong>{title}</strong></span>
                <ChevronRightIcon size={18} aria-hidden="true" />
              </button>
              <div className={styles.boardControls}>
                {selection.type === "matches" && <FilterChips label="Rank players or teams" options={["PLAYERS", "TEAMS"]}
                  selected={selection.board === "teams" ? "TEAMS" : "PLAYERS"} accent={accent} className={styles.chips}
                  onSelect={(value) => update({ board: value === "TEAMS" ? "teams" : "players" })} />}
                <FilterChips label="Ranking period" options={scopeChips.map((chip) => chip.label)}
                  selected={scopeChips.find((chip) => chip.id === selection.scope)!.label} accent={accent} className={styles.chips}
                  onSelect={(value) => update({ scope: scopeChips.find((chip) => chip.label === value)?.id ?? "weekly" })} />
              </div>
              <div className={styles.periodMeta}>
                <span>
                  {selection.scope === "season" && periodWindow && <><span className={styles.seasonLabel}>{periodWindow.label}</span><span className={styles.seasonLabel} aria-hidden="true"> · </span></>}
                  {selection.scope === "allTime" ? "All-time standings" : range ?? "Loading period…"}
                </span>
                <span>{entries.length} {isTeamBoard ? "teams" : "players"}</span>
                <span className={styles.reset}>
                  <ScheduleIcon size={13} aria-hidden="true" />
                  {selection.scope === "allTime" ? "Never resets" : `${selection.scope === "weekly" ? "Resets" : "Ends"} ${now !== null && periodWindow?.end != null ? `in ${leaderboardCountdown(periodWindow.end, now)}` : "…"}`}
                </span>
              </div>
            </header>

            <div className={styles.boardBody} key={boardKey}>
              {hasPodium && <PodiumStage entries={entries.slice(0, 3)} meta={meta} avatarSrc={player?.avatarSrc} frameColor={player?.frameColor} onOpen={onOpen} />}
              {entries.length === 0 ? <StandingsEmpty type={selection.type} />
                : searching && results.length === 0 ? <NoDataState icon={PersonSearchIcon}
                  title={search.trim().length < 2 ? "Find your rival" : isTeamBoard ? "No team found" : "No player found"}
                  message={search.trim().length < 2 ? "Enter at least two characters to search this board." : "Try another name or clear your search."}
                  accent={accent} className="min-h-56" />
                : tableEntries.length > 0 ? <Standings entries={tableEntries} meta={meta} scope={selection.scope} teamBoard={isTeamBoard}
                  avatarSrc={player?.avatarSrc} frameColor={player?.frameColor} onOpen={onOpen} />
                : null}
            </div>

            <footer className={styles.boardFooter}>
              <span>Change vs {comparisonFor(selection.scope)}</span>
              <button type="button" className={styles.textAction} onClick={() => setRulesOpen(true)}>HOW RANKING WORKS <span aria-hidden="true">↗</span></button>
            </footer>
          </section>
        </div>
      </div>
    </div>

    {standing ? <div className={styles.dock}>{standing}</div> : null}

    <AdaptiveDrawer open={pickerOpen} onClose={() => setPickerOpen(false)} title="CHOOSE A LEADERBOARD" className={styles.drawer}>{pickerOpen ? picker : null}</AdaptiveDrawer>
    <LeaderboardDetails open={rulesOpen} context={`${context} · ${title}`} scope={selection.scope} periodWindow={periodWindow} onClose={() => setRulesOpen(false)} />
    {openRival && authenticated ? <RivalDossierOverlay name={openRival.name} rank={openRival.rank} xp={openRival.xp} pro={openRival.pro}
      userRank={user?.rank ?? openRival.rank}
      onClose={() => { setOpenRival(null); requestAnimationFrame(() => dossierTrigger.current?.focus()); }} /> : null}
  </div>;
}

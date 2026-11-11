"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useRef, useState, type CSSProperties } from "react";
import { ArrowLeftIcon, NoDataState, PersonSearchIcon, SearchField } from "@statoz/design-system/games";
import { accentVar } from "@statoz/design-system/web";
import { sportModuleFor } from "@/domain/sports";
import { useAuthSession, useRequireAuth } from "@/features/auth";
import { RivalDossierOverlay } from "@/features/profile/components/rival-dossier";
import { usePlayerStanding, type PlayerStanding } from "@/features/profile/state/player-standing";
import { isPro, rivalSeedByName } from "@/mocks/leaderboard";
import { searchEntries } from "../scoring";
import { boardContext, boardTitle, leaderboardHref, searchBoardSelection } from "../selection";
import { useBoardEntries } from "../state/use-board-entries";
import type { LeaderboardEntry } from "../types";
import { Standings } from "./standings";
import styles from "./board.module.css";

type OpenRival = { name: string; rank: number; xp: number; pro: boolean };

/** FIND A PLAYER: searches the board you came from, keeping each player's rank and score. */
export function LeaderboardSearchScreen() {
  const session = useAuthSession();
  return session.status === "authenticated" ? <PersonalizedSearch /> : <BoardPlayerSearch />;
}

function PersonalizedSearch() {
  const player = usePlayerStanding();
  return <BoardPlayerSearch player={player} authenticated />;
}

function BoardPlayerSearch({ player = null, authenticated = false }: { player?: PlayerStanding | null; authenticated?: boolean }) {
  const params = useSearchParams();
  const serialized = params.toString();
  const selection = useMemo(() => searchBoardSelection(new URLSearchParams(serialized)), [serialized]);
  const { entries, meta, user, isTeamBoard } = useBoardEntries({
    type: selection.type, board: selection.board, scope: selection.scope, mode: selection.mode, leagueId: selection.league, player,
  });
  const [query, setQuery] = useState("");
  const [rival, setRival] = useState<OpenRival | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const requireAuth = useRequireAuth();
  const router = useRouter();
  const accent = accentVar(sportModuleFor(selection.sport).accent);
  const context = `${boardContext(selection)} · ${boardTitle(selection)}`;
  const results = searchEntries(entries, query);
  const noun = isTeamBoard ? "team" : "player";

  function open(entry: LeaderboardEntry) {
    if (!authenticated) {
      requireAuth({ intent: "compare profiles", message: "Log in to compare your standing with other players.", returnTo: leaderboardHref(selection, true) });
      return;
    }
    if (entry.isUser) { router.push("/profile"); return; }
    const seed = rivalSeedByName(entry.name);
    if (!seed) return;
    opener.current = document.activeElement as HTMLElement | null;
    setRival({ name: seed.name, rank: entry.rank, xp: seed.base, pro: isPro(seed) });
  }

  return <section className={styles.searchPage} style={{ "--leaderboard-accent": accent } as CSSProperties}>
    <header className={styles.searchHeader}>
      <Link href={leaderboardHref(selection)} aria-label="Back to leaderboard" className={styles.searchBack}><ArrowLeftIcon size={20} /></Link>
      <div><span className={styles.eyebrow}>{isTeamBoard ? "TEAM" : "PLAYER"} DIRECTORY <span aria-hidden="true">{"//"}</span></span><h1>FIND A {noun.toUpperCase()}</h1><p>{context}</p></div>
    </header>
    <SearchField ref={input} label={`Search leaderboard ${noun}s`} placeholder={`Search ${noun} name`} value={query} accent={accent}
      onChange={(event) => setQuery(event.target.value)} onClear={() => { setQuery(""); input.current?.focus(); }} autoFocus enterKeyHint="search" />
    <div className={styles.searchResults}>
      {query.trim().length < 2
        ? <NoDataState icon={PersonSearchIcon} accent={accent} title="Find your rival" message="Enter at least two characters to search this board. Results keep their rank and score." className="min-h-56" />
        : results.length === 0
          ? <NoDataState icon={PersonSearchIcon} accent={accent} title={`No ${noun} found`} message={`No ${noun} on this board matches “${query.trim()}”.`} className="min-h-56" />
          : <>
            <p className={styles.searchCount} role="status">{results.length} {results.length === 1 ? noun : `${noun}s`} found on {context}</p>
            <Standings entries={results} meta={meta} scope={selection.scope} teamBoard={isTeamBoard}
              avatarSrc={player?.avatarSrc} frameColor={player?.frameColor} onOpen={isTeamBoard ? undefined : open} />
          </>}
    </div>
    {rival && authenticated ? <RivalDossierOverlay name={rival.name} rank={rival.rank} xp={rival.xp} pro={rival.pro} userRank={user?.rank ?? rival.rank}
      onClose={() => { setRival(null); requestAnimationFrame(() => opener.current?.focus()); }} /> : null}
  </section>;
}

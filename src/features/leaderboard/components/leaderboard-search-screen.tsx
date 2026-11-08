"use client";
/* eslint-disable react/jsx-no-comment-textnodes */

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useRef, useState } from "react";

import { AccentPanel, ArrowLeftIcon, NoDataState, PersonSearchIcon, SearchField, SearchIcon, SignalOffIcon } from "@statoz/design-system/web";
import { isPro, rivalRoster } from "@/mocks/leaderboard";
import { RivalDossierOverlay, usePlayerStanding } from "@/features/profile";

type Result = (typeof rivalRoster)[number] & { rank: number };

export function LeaderboardSearchScreen() {
  const params = useSearchParams();
  const back = params.get("returnTo")?.startsWith("/leaderboard") ? params.get("returnTo")! : "/leaderboard";
  const player = usePlayerStanding();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Result | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const normalized = query.trim().toLocaleLowerCase().replace(/\s+/g, " ");
  const results = useMemo(() => searchRivals(normalized, player.displayName), [normalized, player.displayName]);
  return <section className="flex min-h-0 flex-1 flex-col">
    <header className="shrink-0 border-b border-line-muted bg-background/95"><div className="mx-auto flex min-h-16 w-full max-w-4xl items-center px-2 sm:px-4"><Link href={back} aria-label="Back to leaderboard" className="grid size-11 place-items-center text-cyan"><ArrowLeftIcon size={22} /></Link><span className="mr-2 font-display text-xl font-black text-cyan">/</span><div><h1 className="font-display text-lg font-black tracking-wide">PLAYER SEARCH</h1><p className="mt-1 font-display text-2xs font-extrabold tracking-ultra text-muted">// COMPLETE LOCAL FIELD</p></div></div></header>
    <main className="mx-auto w-full max-w-4xl flex-1 overflow-y-auto px-4 py-4 sm:px-6">
      <SearchField ref={input} label="Search leaderboard players" value={query} onChange={(event) => setQuery(event.target.value)} onClear={() => { setQuery(""); input.current?.focus(); }} autoFocus enterKeyHint="search" placeholder="Search player name" />
      <div className="mt-5">
        {normalized.length < 2 ? <NoDataState icon={PersonSearchIcon} spark={SearchIcon} title={normalized ? "Add one more signal" : "Find a rival"} message="Enter at least two characters. Every word in the query must match the player's name." className="min-h-56" /> : results.length === 0 ? <NoDataState icon={SignalOffIcon} spark={SearchIcon} title="No rival found" message={`No player matches “${query.trim()}”.`} className="min-h-56" /> : <div className="grid gap-2" aria-live="polite">{results.map((result) => <button key={result.name} type="button" onClick={() => setOpen(result)} className="text-left"><AccentPanel accent="var(--ds-color-accent-cyan)"><span className="flex min-h-16 items-center gap-3 px-4"><b className="ds-tabular text-cyan">#{result.rank}</b><span className="min-w-0 flex-1"><strong className="block truncate font-display text-sm font-black">{result.name}</strong><small className="text-muted">{result.base.toLocaleString("en-US")} XP</small></span><small className="font-display text-2xs font-black tracking-wide text-muted">OPEN DOSSIER</small></span></AccentPanel></button>)}</div>}
      </div>
    </main>
    {open ? <RivalDossierOverlay name={open.name} rank={open.rank} xp={open.base} pro={isPro(open)} userRank={open.rank} onClose={() => { setOpen(null); requestAnimationFrame(() => input.current?.focus()); }} /> : null}
  </section>;
}

export function searchRivals(query: string, selfName: string): Result[] {
  if (query.length < 2) return [];
  const words = query.split(" ").filter(Boolean);
  return rivalRoster.map((seed, index) => ({ ...seed, rank: index + 1 })).filter((seed) => seed.name.toLocaleLowerCase() !== selfName.trim().toLocaleLowerCase() && words.every((word) => seed.name.toLocaleLowerCase().includes(word))).sort((left, right) => {
    const leftName = left.name.toLocaleLowerCase(); const rightName = right.name.toLocaleLowerCase();
    const score = (name: string) => name === query ? 0 : name.startsWith(query) ? 1 : 2;
    return score(leftName) - score(rightName) || leftName.localeCompare(rightName);
  });
}

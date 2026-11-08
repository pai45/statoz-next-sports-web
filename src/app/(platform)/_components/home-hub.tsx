"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

import {
} from "@statoz/design-system/web";
import { sportOrder, type Sport } from "@/domain/sports";
import { gameCountForSport } from "@/features/games";
import {
  AllSportsSelector,
  fixtureCountsBySport,
  SportHubTabs,
  SportMatchFeed,
  type SportHubSelection,
  type SportSelectorCount,
} from "@/features/matches";
import { useHomeHubTheme } from "@/features/shell/components/home-hub-surface";
import { AdSlot } from "@/features/ads";

function scrollOwners(node: HTMLElement) {
  const owners: HTMLElement[] = [];
  for (let current: HTMLElement | null = node; current; current = current.parentElement) {
    if (['auto', 'scroll'].includes(getComputedStyle(current).overflowY)) owners.push(current);
  }
  return owners;
}
function saveFeedScroll(node: HTMLElement) {
  try {sessionStorage.setItem('statoz.next.sports-web.match-editorial-scroll', JSON.stringify({tops: scrollOwners(node).map(owner => owner.scrollTop), window: window.scrollY}));} catch {}
}



export type HomeHubProps = {
  /** The trending bento, rendered on the server and handed in as children. */
  matchFeed: ReactNode;
  /** The arcade bento, likewise server-rendered. */
  gamesFeed: ReactNode;
  /**
   * One deck per sport, all server-rendered. Every sport is handed over at
   * once so picking one switches without a round trip.
   */
  sportDecks: Record<Sport, ReactNode>;
};

/**
 * The home surface: the MATCH / GAMES switch over the sport browse strip and
 * the feed. Only the selection lives on the client — the feeds themselves are
 * server-rendered and passed through.
 *
 * Each tab keeps its own sport selection, so switching between them does not
 * reset the other's browse position.
 */
export function HomeHub({ matchFeed, gamesFeed, sportDecks, mode }: HomeHubProps & { mode?: "matches" | "games" }) {
  const router = useRouter();
  const matchScroll = useRef<HTMLDivElement>(null);
  const leavingFeed = useRef(false);
  const searchParams = useSearchParams();
  const requestedSport = searchParams.get("sport");
  const initialSport = sportOrder.includes(requestedSport as Sport)
    ? (requestedSport as Sport)
    : null;
  const initialTab = mode === "games" ? 1 : mode === "matches" ? 0 : 0;
  const tab = initialTab;
  const [matchSport, setMatchSport] = useState<SportHubSelection>(
    initialTab === 0 ? initialSport : null,
  );
  const [gamesSport, setGamesSport] = useState<SportHubSelection>(
    initialTab === 1 ? initialSport : null,
  );
  const publishTheme = useHomeHubTheme();
  const activeSport = tab === 0 ? matchSport : gamesSport;
  useLayoutEffect(() => { publishTheme(activeSport ?? "trending"); }, [activeSport, publishTheme]);
  const [selectorMode, setSelectorMode] = useState<"matches" | "games" | null>(null);
  useEffect(() => {
    const node = matchScroll.current;
    if (!node || tab !== 0 || matchSport !== null) return;
    leavingFeed.current = false;
    const owners = scrollOwners(node);
    let saved = {tops: owners.map(() => 0), window: 0};
    try {const value = JSON.parse(sessionStorage.getItem('statoz.next.sports-web.match-editorial-scroll') ?? 'null');if(value && Array.isArray(value.tops) && value.tops.every(Number.isFinite) && Number.isFinite(value.window)) saved = value;} catch {}
    const homePath = window.location.pathname;
    let reconnect: MutationObserver | null = null;
    const save = () => {if(node.isConnected && !leavingFeed.current) saveFeedScroll(node);};
    const restore = () => {
      owners.forEach((owner, index) => {owner.scrollTop = saved.tops[index] ?? 0;});
      window.scrollTo({top: saved.window, behavior: 'instant'});
      const desired = saved.tops.reduce((sum, top) => sum + top, 0) + saved.window;
      const actual = owners.reduce((sum, owner) => sum + owner.scrollTop, 0) + window.scrollY;
      const scrollable = owners.find(owner => owner.scrollHeight > owner.clientHeight);
      if (scrollable) scrollable.scrollTop += desired - actual;
    };
    const returning = () => {
      if (window.location.pathname !== homePath) return;
      try {const value=JSON.parse(sessionStorage.getItem('statoz.next.sports-web.match-editorial-scroll')??'null');if(value&&Array.isArray(value.tops)&&value.tops.every(Number.isFinite)&&Number.isFinite(value.window)) saved=value;} catch {}
      leavingFeed.current=false;
      const connected=()=>{if(!node.isConnected)return;reconnect?.disconnect();requestAnimationFrame(()=>{restore();requestAnimationFrame(restore);});};
      if(node.isConnected)connected();else{reconnect=new MutationObserver(connected);reconnect.observe(document.body,{childList:true,subtree:true});}
    };
    window.addEventListener('popstate',returning);
    let second = 0;
    const first = requestAnimationFrame(() => {restore();second = requestAnimationFrame(() => {restore();owners.forEach(owner => owner.addEventListener('scroll', save, {passive: true}));window.addEventListener('scroll', save, {passive: true});});});
    return () => {cancelAnimationFrame(first);cancelAnimationFrame(second);reconnect?.disconnect();window.removeEventListener('popstate',returning);owners.forEach(owner => owner.removeEventListener('scroll', save));window.removeEventListener('scroll', save);};
  }, [tab, matchSport]);
  const matchCounts = fixtureCountsBySport();
  const gameCounts = Object.fromEntries(
    sportOrder.map((sport) => [sport, { total: gameCountForSport(sport) }]),
  ) as Record<Sport, SportSelectorCount>;
  const visibleSelectorMode = selectorMode ?? (tab === 0 ? "matches" : "games");

  function persistBrowseState(nextTab: number, sport: SportHubSelection) {
    const params = new URLSearchParams();
    params.set("tab", nextTab === 0 ? "match" : "games");
    if (sport !== null) params.set("sport", sport);
    router.replace(`${mode === "games" && true ? "/quiz" : "/"}?${params.toString()}`);
  }



  function selectSport(mode: "matches" | "games", selection: SportHubSelection) {
    if (mode === "matches") setMatchSport(selection);
    else setGamesSport(selection);
    persistBrowseState(mode === "matches" ? 0 : 1, selection);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">

      {tab === 0 ? (
        <div role="tabpanel" aria-label="Match" className="flex min-h-0 flex-1 flex-col">
          <SportHubTabs
            selected={matchSport}
            onSelect={(selection) => selectSport("matches", selection)}
            onMore={() => setSelectorMode("matches")}
            onSearch={() => router.push("/matches/search")}
          />
          <div ref={matchScroll} onClickCapture={event => {
            if(matchSport !== null) return;
            saveFeedScroll(event.currentTarget);
            const link=(event.target as HTMLElement).closest('a[href]');
            if(link && new URL(link.getAttribute('href')!,window.location.href).pathname !== window.location.pathname) leavingFeed.current=true;
          }} className={`flex-1 overflow-y-auto py-3 ${matchSport === null ? "" : "px-5"}`}>
            {matchSport === null ? (
              <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
                {matchFeed}
                <div className="px-5"><AdSlot placement="home-feed" /></div>
              </div>
            ) : (
              <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
                <AdSlot placement="home-feed" />
                <SportMatchFeed key={matchSport} sport={matchSport} />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div role="tabpanel" aria-label="Games" className="flex min-h-0 flex-1 flex-col">
          <SportHubTabs
            selected={gamesSport}
            onSelect={(selection) => selectSport("games", selection)}
            onMore={() => setSelectorMode("games")}
          />
          <div className="flex-1 overflow-y-auto px-4 py-3">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
              <AdSlot placement="home-feed" />
              {gamesSport === null ? gamesFeed : sportDecks[gamesSport]}
            </div>
          </div>
        </div>
      )}

      <AllSportsSelector
        open={selectorMode !== null}
        mode={visibleSelectorMode}
        selected={visibleSelectorMode === "matches" ? matchSport : gamesSport}
        counts={visibleSelectorMode === "matches" ? matchCounts : gameCounts}
        onSelect={(selection) => {
          selectSport(visibleSelectorMode, selection);
        }}
        onClose={() => setSelectorMode(null)}
      />
    </div>
  );
}

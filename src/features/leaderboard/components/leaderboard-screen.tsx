"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type CSSProperties } from "react";

import {
  accentVar,
  SearchIcon,
  UnderlineTabs,
  withAlpha,
  type UnderlineTab,
} from "@statoz/design-system/web";
import { sportModuleFor, sportOrder, type Sport } from "@/domain/sports";
import { AdSlot } from "@/features/ads";
import { useAuthSession, useRequireAuth } from "@/features/auth";
import { SportIcon } from "@/features/matches/components/sport-icon";
import {
  RivalDossierOverlay,
  usePlayerStanding,
  type PlayerStanding,
} from "@/features/profile";

import { isPro, rivalSeedByName } from "@/mocks/leaderboard";
import { sportGameDecks } from "@/mocks/games";
import { leaderboardTypeOrder } from "../scoring";
import { leaderboardLeagues } from "../leagues";
import { useBoardEntries } from "../state/use-board-entries";
import type {
  GameMode,
  LeaderboardEntry,
  LeaderboardType,
  MatchesBoard,
  TournamentScope,
} from "../types";

import { LeaderboardEmpty } from "./leaderboard-empty";
import { LeaderboardFilters } from "./leaderboard-filters";
import styles from "./leaderboard.module.css";
import { RankPodium } from "./rank-podium";
import { RankRow } from "./rank-row";
import { RankUserBar } from "./rank-user-bar";
import { LeagueDial } from "./league-dial";

/**
 * LEADERBOARD — where you stand.
 *
 * Two strips over one board: the sport, then what is being ranked. The sport
 * only ever changes the accent, which is true of the app too — there is one
 * field of players, and the boards are six different lenses on their single
 * canonical XP rather than six different tables.
 *
 * The phone is the app exactly: strips, filters, a scrolling podium and rows,
 * and your own rank docked below so it never scrolls away. Once there is room
 * the board keeps its proportions and the things you *set* — the filters — move
 * out of the reading column into a sidebar, where your rank simply stays in
 * view instead of having to be pinned.
 */

const typeLabels: Record<LeaderboardType, string> = {
  matches: "MATCHES",
  games: "QUIZ",
};

const typeTabs: UnderlineTab[] = leaderboardTypeOrder.map((id) => ({
  id,
  label: typeLabels[id],
}));

const sportTabs: UnderlineTab[] = sportOrder.map((sport) => ({
  id: sport,
  label: sportModuleFor(sport).label.toUpperCase(),
  icon: <SportIcon sport={sport} size={21} />,
}));

/** Rows are dealt in behind the three podium cards. */
function delay(index: number): CSSProperties {
  return { "--enter-delay": `${(index + 3) * 70}ms` } as CSSProperties;
}

type OpenRival = { name: string; rank: number; xp: number; pro: boolean };

export function LeaderboardScreen() {
  const session = useAuthSession();
  if (session.status === "authenticated") return <PersonalizedLeaderboard />;
  return <LeaderboardBoard />;
}

function PersonalizedLeaderboard() {
  const player = usePlayerStanding();
  return <LeaderboardBoard player={player} authenticated />;
}

function LeaderboardBoard({
  player = null,
  authenticated = false,
}: {
  player?: PlayerStanding | null;
  authenticated?: boolean;
}) {
  const router = useRouter();
  const query = useSearchParams();
  const requireAuth = useRequireAuth();
  const initialSport = sportOrder.includes(query.get("sport") as Sport) ? query.get("sport") as Sport : "football";
  const initialType: LeaderboardType = query.get("type") === "games" ? "games" : "matches";
  const [sport, setSport] = useState<Sport>(initialSport);
  const [type, setType] = useState<LeaderboardType>(initialType);
  const [board, setBoard] = useState<MatchesBoard>(query.get("board") === "teams" ? "teams" : "players");
  const [scope, setScope] = useState<TournamentScope>(["weekly", "season", "allTime"].includes(query.get("scope") ?? "") ? query.get("scope") as TournamentScope : "weekly");
  const initialMode = sportGameDecks[initialSport].includes(query.get("mode") as GameMode) ? query.get("mode") as GameMode : sportGameDecks[initialSport][0];
  const [mode, setMode] = useState<GameMode>(initialMode);
  const [selectedLeague, setSelectedLeague] = useState<Record<Sport, string>>(() => Object.fromEntries(sportOrder.map((entry) => [entry, query.get("league") && entry === initialSport && leaderboardLeagues[entry].some((league) => league.id === query.get("league")) ? query.get("league") : leaderboardLeagues[entry][0].id])) as Record<Sport, string>);
  const [openRival, setOpenRival] = useState<OpenRival | null>(null);

  const accent = accentVar(sportModuleFor(sport).accent);
  const { entries, meta, user, isTeamBoard } = useBoardEntries({
    type,
    board,
    scope,
    mode,
    sport,
    leagueId: selectedLeague[sport],
    player,
  });

  useEffect(() => {
    const params = new URLSearchParams({ type, sport, mode, board, scope, league: selectedLeague[sport] });
    router.replace(`/leaderboard?${params.toString()}`, { scroll: false });
  }, [board, mode, router, scope, selectedLeague, sport, type]);

  const changeSport = (next: Sport) => {
    setSport(next);
    if (!sportGameDecks[next].includes(mode)) setMode(sportGameDecks[next][0]);
  };

  /**
   * Your own row is your profile; a rival's opens their dossier. A team has no
   * player behind it, so a team board's rows are inert — as they are in the app.
   */
  function open(entry: LeaderboardEntry) {
    if (entry.team) return;
    if (!authenticated) {
      requireAuth({
        intent: "compare profiles",
        message: "Log in to compare your standing with other players.",
        returnTo: "/leaderboard",
      });
      return;
    }
    if (entry.isUser) {
      router.push("/profile");
      return;
    }
    const seed = rivalSeedByName(entry.name);
    if (!seed) return;
    setOpenRival({
      name: seed.name,
      rank: entry.rank,
      xp: seed.base,
      pro: isPro(seed),
    });
  }

  const onOpen = isTeamBoard ? undefined : open;

  // A short board (under three) has no podium to build and lists everyone.
  const hasPodium = entries.length >= 3;
  const podium = hasPodium ? entries.slice(0, 3) : [];
  const rows = hasPodium ? entries.slice(3) : entries;

  const filters = (
    <LeaderboardFilters
      type={type}
      sport={sport}
      accent={accent}
      board={board}
      onBoard={setBoard}
      scope={scope}
      onScope={setScope}
      mode={mode}
      onMode={setMode}
    />
  );

  const userBar = user ? (
    <RankUserBar
      user={user}
      meta={meta}
      accent={accent}
      avatarSrc={player?.avatarSrc}
      frameColor={player?.frameColor}
      onOpen={user.team ? undefined : () => router.push("/profile")}
    />
  ) : null;

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex justify-end border-b border-line-muted px-4 py-2">
        <Link className="flex min-h-10 items-center gap-2 px-3 font-display text-2xs font-black tracking-ultra text-muted hover:text-cyan" href={`/leaderboard/search?returnTo=${encodeURIComponent(`/leaderboard?type=${type}&sport=${sport}&mode=${mode}&board=${board}&scope=${scope}&league=${selectedLeague[sport]}`)}`}><SearchIcon size={18} /> FIND PLAYER</Link>
      </div>
      <UnderlineTabs
        label="Browse by sport"
        tabs={sportTabs}
        activeIndex={sportOrder.indexOf(sport)}
        accent={accent}
        iconColors={sportOrder.map((entry) =>
          accentVar(sportModuleFor(entry).accent),
        )}
        onChange={(index) => changeSport(sportOrder[index])}
        className="shrink-0"
      />
      <UnderlineTabs
        label="Leaderboard"
        tabs={typeTabs}
        activeIndex={leaderboardTypeOrder.indexOf(type)}
        accent={accent}
        onChange={(index) => setType(leaderboardTypeOrder[index])}
        className="shrink-0"
      />
      <div style={{ "--leaderboard-accent": accent } as CSSProperties}>
        <LeagueDial leagues={leaderboardLeagues[sport]} selected={selectedLeague[sport]} onSelect={(league) => setSelectedLeague((current) => ({ ...current, [sport]: league }))} />
      </div>

      <div
        /* A new board is a new element, so it arrives rather than mutating. */
        key={`${type}-${board}-${scope}-${mode}-${selectedLeague[sport]}`}
        className={`${styles.boardIn} mx-auto flex w-full max-w-160 flex-col gap-4.5 px-4 pb-3.5 pt-2 lg:grid lg:max-w-260 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-5 lg:px-6 lg:pb-8 lg:pt-5`}
      >
        <aside className="flex flex-col gap-2.5 lg:sticky lg:top-5 lg:col-start-2 lg:row-start-1 lg:gap-3.5">
          {filters}
          <div className="hidden lg:block">{userBar}</div>
          {entries.length > 0 ? <AdSlot placement="leaderboard-rail" /> : null}
        </aside>

        <div className="lg:col-start-1 lg:row-start-1">
          {entries.length === 0 ? (
            <LeaderboardEmpty type={type} accent={accent} />
          ) : (
            <>
              <RankPodium
                entries={podium}
                meta={meta}
                accent={accent}
                userAvatarSrc={player?.avatarSrc}
                userFrameColor={player?.frameColor}
                onOpen={onOpen}
              />

              {rows.length > 0 ? (
                <div className={`flex flex-col gap-2.5 ${hasPodium ? "mt-6" : ""}`}>
                  {rows.map((entry, index) => (
                    <div
                      key={entry.name}
                      className={styles.dealIn}
                      style={delay(index)}
                    >
                      <RankRow
                        entry={entry}
                        accent={accent}
                        meta={meta}
                        avatarSrc={player?.avatarSrc}
                        frameColor={player?.frameColor}
                        onOpen={onOpen}
                      />
                    </div>
                  ))}
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>

      {/*
        Docked so it never scrolls away, as the app pins it. The bar nav is
        sticky and floats over the page, so this sticks exactly its height
        above it — and lands in flow beside it at the end of the scroll.
      */}
      {userBar ? (
        <div
          className="sticky z-10 mt-auto border-t bg-background px-4 pb-3 pt-2.5 lg:hidden"
          style={{
            bottom:
              "calc(var(--platform-nav-height) + env(safe-area-inset-bottom))",
            borderColor: withAlpha("var(--ds-color-border-strong)", 0.32),
          }}
        >
          {userBar}
        </div>
      ) : null}

      {openRival && authenticated ? (
        <RivalDossierOverlay
          name={openRival.name}
          rank={openRival.rank}
          xp={openRival.xp}
          pro={openRival.pro}
          userRank={user?.rank ?? openRival.rank}
          onClose={() => setOpenRival(null)}
        />
      ) : null}
    </div>
  );
}

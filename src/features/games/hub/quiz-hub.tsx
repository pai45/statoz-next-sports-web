"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";

import {
  accentVar,
  FlameIcon,
  GameIcon,
  MenuBookIcon,
  ShopIcon,
  TimerIcon,
  TrophyIcon,
} from "@statoz/design-system/web";
import { sportModuleFor, sportOrder, type Sport } from "@/domain/sports";
import { AdSlot } from "@/features/ads";
import { AllSportsSelector, type SportSelectorCount } from "@/features/matches/components/all-sports-selector";
import { SportHubTabs } from "@/features/matches/components/sport-hub-tabs";
import { useHomeHubTheme } from "@/features/shell/components/home-hub-surface";
import { currentStreak, useIsStreakHydrated, useStreakSnapshot } from "@/features/streaks/state/streak-store";
import { dailyGamesFor, gameCountForSport, gameRegistry, quizPathsGameFor, sportForGame } from "@/mocks/games";
import { usePrefersReducedMotion } from "@/shared/hooks";

import { GameScene } from "../components/game-scenes";
import { dailyNumberFor, dayIndexFor } from "../daily/day";
import { useDailyBoard, type DailyBoard, type DailyCardStatus } from "../daily/daily-status";
import { sportNames } from "../daily/share";
import { useDailyCountdown } from "../daily/use-countdown";
import type { GameId } from "../types";
import styles from "./hub.module.css";
import { PlayMark, QuizCover, worldUrl } from "./quiz-cover";
import { QuizContinue, QuizPaths } from "./quiz-paths";
import { hubHref } from "./links";

/**
 * The QUIZ tab, laid out like a games console.
 *
 * A spotlight shows one of today's games over its sport's world, with the
 * day's lineup of covers beneath it; hovering or focusing a cover previews it
 * there, and the spotlight moves on by itself while nobody is browsing. Below,
 * ALL lays every sport out as a shelf, and a sport's page adds its save slot
 * and level select.
 */

const rotateMs = 9000;

export function QuizHub({ sport }: { sport: Sport | null }) {
  const publishTheme = useHomeHubTheme();
  useLayoutEffect(() => publishTheme(sport ?? "trending"), [sport, publishTheme]);

  const { countdown, dayKey } = useDailyCountdown();
  const board = useDailyBoard(dayKey);
  const streakSnapshot = useStreakSnapshot();
  const streakReady = useIsStreakHydrated();
  const streak = streakReady ? currentStreak(streakSnapshot, "overall") : null;
  const [paused, setPaused] = useState(false);
  const router = useRouter();
  const [selectorOpen, setSelectorOpen] = useState(false);
  const counts = Object.fromEntries(sportOrder.map((item) => [item, { total: gameCountForSport(item) }])) as Record<Sport, SportSelectorCount>;
  const go = (selection: Sport | null) => router.push(hubHref(selection), { scroll: false });

  const lineup = lineupFor(sport, board, dayKey);
  const totals = (sport ? [sport] : sportOrder).reduce(
    (sum, item) => {
      const { done, total } = board.progressFor(item);
      return { done: sum.done + done, total: sum.total + total };
    },
    { done: 0, total: 0 },
  );

  return (
    <div className={styles.dashboard} data-paused={paused || undefined}>
      <Ambient />
      {/* The same sport bar as Matches, so the two tabs browse sports alike.
          Trending is the every-sport view. */}
      <SportHubTabs selected={sport} onSelect={go} onMore={() => setSelectorOpen(true)} />
      <Spotlight
        sport={sport}
        lineup={lineup}
        board={board}
        dayKey={dayKey}
        streak={streak}
        countdown={countdown}
        totals={totals}
        paused={paused}
        onTogglePause={() => setPaused((value) => !value)}
      />
      <div className={styles.content}>
        {sport === null ? <AllShelves board={board} /> : <SportSections sport={sport} />}
        <Shortcuts sport={sport} />
        <AdSlot placement="home-feed" />
        <footer className={styles.footer}>
          <span>
            STATOZ <b>QUIZ</b>
          </span>
          <span>Play. Share. Come back tomorrow.</span>
        </footer>
      </div>
      <AllSportsSelector
        open={selectorOpen}
        mode="games"
        selected={sport}
        counts={counts}
        onSelect={(selection) => {
          setSelectorOpen(false);
          go(selection);
        }}
        onClose={() => setSelectorOpen(false)}
      />
    </div>
  );
}

/**
 * Today's lineup, in a fixed order for the day: every daily in scope, rotated
 * by the date so a different game leads each day, unfinished ones first.
 */
function lineupFor(sport: Sport | null, board: DailyBoard, dayKey: string | null): GameId[] {
  const games = sport ? dailyGamesFor(sport) : sportOrder.flatMap((item) => dailyGamesFor(item));
  if (games.length === 0) return [];
  const start = dayKey ? dayIndexFor(dayKey) % games.length : 0;
  const rotated = [...games.slice(start), ...games.slice(0, start)];
  const open = rotated.filter((game) => board.statusOf(game).state !== "done");
  const done = rotated.filter((game) => board.statusOf(game).state === "done");
  return [...open, ...done];
}

/* ---- Ambient --------------------------------------------------------------------- */

function Ambient() {
  return (
    <div className={styles.ambient} aria-hidden>
      <div className={styles.ambientGlow} />
      <div className={styles.ambientGrid} />
      <span className={styles.ambientSweep} />
    </div>
  );
}

/* ---- Spotlight -------------------------------------------------------------------- */

function Spotlight({
  sport,
  lineup,
  board,
  dayKey,
  streak,
  countdown,
  totals,
  paused,
  onTogglePause,
}: {
  sport: Sport | null;
  lineup: GameId[];
  board: DailyBoard;
  dayKey: string | null;
  streak: number | null;
  countdown: string;
  totals: { done: number; total: number };
  paused: boolean;
  onTogglePause: () => void;
}) {
  const reduced = usePrefersReducedMotion();
  const [selected, setSelected] = useState<GameId | null>(null);
  const [browsing, setBrowsing] = useState(false);
  const active = selected && lineup.includes(selected) ? selected : lineup[0];
  const lineupKey = lineup.join("|");

  // Move the spotlight along while nobody is browsing it.
  const latest = useRef({ active, lineup });
  useEffect(() => {
    latest.current = { active, lineup };
  });
  useEffect(() => {
    if (paused || browsing || reduced || lineup.length < 2) return;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      const { active: current, lineup: games } = latest.current;
      const next = games[(games.indexOf(current) + 1) % games.length];
      setSelected(next);
    }, rotateMs);
    return () => window.clearInterval(id);
    // Restart the clock when the lineup itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, browsing, reduced, lineupKey]);

  if (!active) return null;
  const entry = gameRegistry[active];
  const gameSport = sportForGame(active);
  const status = board.statusOf(active);
  const accent = accentVar(entry.accent);

  return (
    <section
      className={styles.opening}
      aria-label="Today's spotlight"
      style={{ "--spot": accent } as CSSProperties}
      onPointerEnter={(event) => event.pointerType === "mouse" && setBrowsing(true)}
      onPointerLeave={() => setBrowsing(false)}
      onFocus={() => setBrowsing(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setBrowsing(false);
      }}
    >
      <div className={styles.art} aria-hidden>
        <div key={`world-${gameSport}`} className={styles.world} style={{ "--world": worldUrl(gameSport) } as CSSProperties} />
        <div className={styles.veil} />
        <div className={styles.slashes} />
        <div key={`scene-${active}`} className={styles.heroScene}>
          <GameScene game={active} animate={!paused} />
        </div>
      </div>

      <div className={styles.hero}>
        <div className={styles.hud}>
          {streak !== null ? (
            <span className={styles.hudChip} title="Daily streak" aria-label={`${streak} day streak`}>
              <FlameIcon size={15} className={styles.flame} /> <strong>{streak}</strong>
              <span className={styles.hudLong}> DAY STREAK</span>
            </span>
          ) : null}
          {countdown ? (
            <span className={styles.hudChip} title="Time until tomorrow's games" aria-label={`New games in ${countdown}`}>
              <TimerIcon size={15} />
              <span className={styles.hudLong}>NEW IN </span>
              <strong>{countdown}</strong>
            </span>
          ) : null}
          {!reduced && lineup.length > 1 ? (
            <button type="button" className={styles.motion} onClick={onTogglePause} aria-pressed={paused} aria-label={paused ? "Resume the spotlight" : "Pause the spotlight"}>
              {paused ? (
                <PlayMark size={13} />
              ) : (
                <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path d="M4 3h3v10H4zM10 3h3v10h-3z" />
                </svg>
              )}
            </button>
          ) : null}
        </div>

        <div key={active} className={styles.heroCopy}>
          <p className={styles.eyebrow}>
            <span className={styles.liveDot} aria-hidden />
            {eyebrowFor(status, dayKey, gameSport)}
          </p>
          <h1 className={styles.heroTitle}>{entry.title}</h1>
          <ul className={styles.heroMeta} aria-label="About this game">
            <li data-tone="sport">{sportNames[gameSport]}</li>
            {entry.meta ? <li>{entry.meta}</li> : null}
            {status.state === "done" ? <li data-tone="done">✓ {status.label}</li> : status.state === "in-progress" ? <li data-tone="progress">{status.label}</li> : <li>FREE · NEW TODAY</li>}
          </ul>
          {entry.hook ? <p className={styles.heroHook}>{entry.hook}</p> : null}
          <div className={styles.heroActions}>
            <Link href={entry.href} className={styles.play} aria-label={`${playLabel(status)} ${entry.title}`}>
              <PlayMark size={15} />
              <span className={styles.playLabel}>{playLabel(status)}</span>
              <span className={styles.playBars} aria-hidden>
                <i />
                <i />
                <i />
              </span>
            </Link>
            {sport === null ? (
              <Link href={hubHref(gameSport)} className={styles.browse}>
                Explore {titleCase(sportNames[gameSport])} <span aria-hidden>↗</span>
              </Link>
            ) : (
              <a href="#quiz-paths" className={styles.browse}>
                Quiz paths <span aria-hidden>↓</span>
              </a>
            )}
          </div>
        </div>

        <div className={styles.index} aria-label={`${totals.done} of ${totals.total} daily games played today`}>
          {totals.done}
          <small>/ {totals.total} TODAY</small>
          <span className={styles.indexMeter}>
            <span style={{ width: `${totals.total ? (totals.done / totals.total) * 100 : 0}%` }} />
          </span>
        </div>
      </div>

      <section className={styles.strip} aria-labelledby="lineup-title">
        <div className={styles.head}>
          <div>
            <span className={styles.kicker}>{sport ? `${sportNames[sport]} · TODAY` : "EVERY SPORT · TODAY"}</span>
            <h2 id="lineup-title" className={styles.headTitle}>
              Today&apos;s lineup <span className={styles.count}>{totals.done}/{totals.total} PLAYED</span>
            </h2>
          </div>
        </div>
        {/* Keyed on the order: the lineup reorders once the day is known and
            as games finish, and a snapping rail would otherwise follow the cover
            it had snapped to into the middle of the list. */}
        <ul key={lineupKey} className={styles.rail}>
          {lineup.map((game) => (
            <li key={game}>
              <QuizCover
                game={game}
                entry={gameRegistry[game]}
                sport={sportForGame(game)}
                status={board.statusOf(game)}
                active={game === active}
                onPreview={setSelected}
              />
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}

function titleCase(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function playLabel(status: DailyCardStatus): string {
  return status.state === "done" ? "RESULT" : status.state === "in-progress" ? "RESUME" : "PLAY";
}

function eyebrowFor(status: DailyCardStatus, dayKey: string | null, sport: Sport): string {
  if (status.state === "in-progress") return "PICK UP WHERE YOU LEFT OFF";
  if (status.state === "done") return "DONE TODAY · SEE HOW YOU DID";
  return `${dayKey ? `DAILY #${dailyNumberFor(dayKey)} · ` : ""}${sportNames[sport]} · NEW TODAY`;
}

/* ---- ALL: a shelf per sport --------------------------------------------------------- */

function AllShelves({ board }: { board: DailyBoard }) {
  return (
    <>
      {sportOrder.map((sport) => {
        const dailies = dailyGamesFor(sport);
        const paths = quizPathsGameFor(sport);
        const games = paths ? [...dailies, paths] : dailies;
        if (games.length === 0) return null;
        const { done, total } = board.progressFor(sport);
        return (
          <section
            key={sport}
            aria-labelledby={`shelf-${sport}`}
            style={{ "--shelf": accentVar(sportModuleFor(sport).accent) } as CSSProperties}
          >
            <div className={styles.head}>
              <h2 id={`shelf-${sport}`} className={styles.headTitle}>
                <span className={styles.bar} aria-hidden />
                {sportNames[sport]}
                <span className={styles.count}>
                  {done}/{total} TODAY
                </span>
              </h2>
              <Link href={hubHref(sport)} className={styles.textAction}>
                View all <span aria-hidden>↗</span>
              </Link>
            </div>
            <ul className={styles.rail}>
              {games.map((game) => (
                <li key={game}>
                  <QuizCover game={game} entry={gameRegistry[game]} sport={sport} status={gameRegistry[game].daily ? board.statusOf(game) : undefined} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </>
  );
}

/* ---- One sport: save slot and level select ------------------------------------------- */

function SportSections({ sport }: { sport: Sport }) {
  if (!quizPathsGameFor(sport)) return null;
  return (
    <>
      <section aria-labelledby="continue-title" style={{ "--shelf": accentVar("lime") } as CSSProperties}>
        <div className={styles.head}>
          <div>
            <span className={styles.kicker}>THE DEEP END · 200 SETS</span>
            <h2 id="continue-title" className={styles.headTitle}>
              <span className={styles.bar} aria-hidden /> Continue
            </h2>
          </div>
        </div>
        <div className="mt-3">
          <QuizContinue sport={sport} />
        </div>
      </section>

      <section id="quiz-paths" aria-labelledby="paths-title" className="scroll-mt-6" style={{ "--shelf": accentVar("violet") } as CSSProperties}>
        <div className={styles.head}>
          <div>
            <span className={styles.kicker}>CHOOSE YOUR LEVEL</span>
            <h2 id="paths-title" className={styles.headTitle}>
              <span className={styles.bar} aria-hidden /> Quiz paths <span className={styles.count}>4 × 50 SETS</span>
            </h2>
          </div>
        </div>
        <div className="mt-3">
          <QuizPaths sport={sport} />
        </div>
      </section>
    </>
  );
}

/* ---- Beyond the play button ------------------------------------------------------------ */

function Shortcuts({ sport }: { sport: Sport | null }) {
  const leaderboard = sport ? `/leaderboard?type=games&sport=${sport}&mode=${sport}-quiz` : "/leaderboard";
  const items = [
    { href: leaderboard, icon: <TrophyIcon size={28} />, title: "Leaderboard", body: "See where you stand." },
    { href: "/streaks", icon: <FlameIcon size={28} />, title: "Streak calendar", body: "Every day you kept it alive." },
    { href: "/how-to-play", icon: <MenuBookIcon size={28} />, title: "How to play", body: "Rules for every game here." },
    { href: "/shop", icon: <ShopIcon size={28} />, title: "StatOz Shop", body: "Spend the Oz you have earned." },
  ];
  return (
    <section aria-labelledby="more-title">
      <div className={styles.head}>
        <div>
          <span className={styles.kicker}>THERE&apos;S MORE TO YOUR GAME</span>
          <h2 id="more-title" className={styles.headTitle}>
            <span className={styles.bar} aria-hidden /> Beyond the play button
          </h2>
        </div>
        <GameIcon size={22} className="hidden text-muted sm:block" aria-hidden />
      </div>
      <div className={`${styles.shortcuts} mt-3`}>
        {items.map((item) => (
          <Link key={item.title} href={item.href} className={styles.shortcut}>
            {item.icon}
            <span>
              <b>{item.title}</b>
              <small>{item.body}</small>
            </span>
            <span aria-hidden>↗</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

"use client";
import { typography } from "@statoz/design-system/web/tokens/typography";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import {
  accentVar,
  Button,
  CloseIcon,
  FlameIcon,
  PersonSearchIcon,
  ShareIcon,
  feedbackVar,
  withAlpha,
} from "@statoz/design-system/web";

import { useAuthSession, useRequireAuth } from "@/features/auth";
import { sportForGame } from "@/mocks/games";

import type { GameLauncherProps } from "../../components/game-launcher";
import { dailyNumberFor, todayKey } from "../../daily/day";
import { shareResult, sportEmojiFor, sportNames, type ShareOutcome } from "../../daily/share";
import { useDailyCountdown } from "../../daily/use-countdown";
import { normalizeGuessPlayerSearch } from "../../guess-player/engine/normalize";
import { compareGuess, tileEmoji, type Tile } from "../engine/compare";
import { maxGuesses, mysteryFor, whoAreYaXp } from "../engine/daily";
import { attributeSpecs, isWhoAreYaSport, poolFor, type WhoAreYaSport, type WhoAthlete } from "../engine/pool";
import { submitWhoAreYaGuess, useWhoAreYaRecord, whoAreYaDayFor } from "../state/who-are-ya-store";

/**
 * Who Are Ya: name today's mystery player in eight guesses. Every guess is a
 * player, and each comes back as a row of clue tiles saying how close it was:
 * green is a match, amber is close, and numbers point up or down.
 */

const orange = accentVar("orange");
const gold = accentVar("gold");

export function WhoAreYa({ game }: GameLauncherProps) {
  const sport = sportForGame(game);
  if (!isWhoAreYaSport(sport)) return null;
  return <WhoAreYaDayScreen sport={sport} />;
}

function WhoAreYaDayScreen({ sport }: { sport: WhoAreYaSport }) {
  const router = useRouter();
  const record = useWhoAreYaRecord();
  // The day is fixed on open, so a game crossing midnight finishes its own puzzle.
  const [dayKey] = useState(() => todayKey());
  const pool = useMemo(() => poolFor(sport), [sport]);
  const byId = useMemo(() => new Map(pool.map((athlete) => [athlete.id, athlete])), [pool]);
  const mystery = useMemo(() => mysteryFor(sport, dayKey), [sport, dayKey]);
  const day = whoAreYaDayFor(record, sport, dayKey);
  const specs = attributeSpecs[sport];

  const guesses = (day?.guessIds ?? []).map((id) => byId.get(id)).filter((a): a is WhoAthlete => Boolean(a));
  const status = day?.status ?? "playing";
  const rows = mystery ? guesses.map((guess) => ({ guess, tiles: compareGuess(specs, guess, mystery) })) : [];

  const leave = useCallback(() => {
    if (window.history.length > 1) router.back();
    else router.push(`/quiz/${sport}`);
  }, [router, sport]);

  if (!mystery) {
    return (
      <Shell sport={sport} dayKey={dayKey} onClose={leave}>
        <p className="p-8 text-center text-sm text-muted">No mystery player today.</p>
      </Shell>
    );
  }

  return (
    <Shell sport={sport} dayKey={dayKey} onClose={leave}>
      <div className="mx-auto w-full max-w-120 px-4 pb-10 pt-4">
        <MysteryCard mystery={mystery} status={status} guessCount={guesses.length} poolSize={pool.length} sport={sport} />

        {status === "playing" ? (
          <GuessSearch
            pool={pool}
            excluded={new Set(day?.guessIds ?? [])}
            onGuess={(athlete) => submitWhoAreYaGuess(sport, dayKey, mystery.id, athlete.id)}
          />
        ) : (
          <Result sport={sport} dayKey={dayKey} won={status === "won"} rows={rows} />
        )}

        <ol className="mt-5 flex flex-col-reverse gap-2.5" aria-label="Your guesses">
          {rows.map(({ guess, tiles }, index) => (
            <li key={guess.id}>
              <GuessRow number={index + 1} name={guess.name} tiles={tiles} solved={guess.id === mystery.id} />
            </li>
          ))}
        </ol>

        {rows.length === 0 && status === "playing" ? <Legend /> : null}
      </div>
    </Shell>
  );
}

/* ---- Shell ------------------------------------------------------------------ */

function Shell({
  sport,
  dayKey,
  onClose,
  children,
}: {
  sport: WhoAreYaSport;
  dayKey: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <header className="flex shrink-0 items-center gap-2 px-2 py-2.5" style={{ borderBottom: `1px solid ${withAlpha(orange, 0.2)}` }}>
        <button type="button" onClick={onClose} aria-label="Leave Who Are Ya" className="grid size-11 shrink-0 cursor-pointer place-items-center text-subtle">
          <CloseIcon size={20} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display font-black leading-none" style={{ fontSize: typography.sizeRem.p15, letterSpacing: "var(--ds-tracking-ultra)" }}>
            WHO ARE YA? #{dailyNumberFor(dayKey)}
          </h1>
          <p className="mt-1 truncate font-display font-black leading-none text-muted" style={{ fontSize: typography.sizeRem.p11, letterSpacing: "var(--ds-tracking-wide)" }}>
            {sportEmojiFor(sport)} {sportNames[sport]} · {maxGuesses} GUESSES
          </p>
        </div>
      </header>
      {children}
    </div>
  );
}

/* ---- Mystery card ----------------------------------------------------------- */

function MysteryCard({
  mystery,
  status,
  guessCount,
  poolSize,
  sport,
}: {
  mystery: WhoAthlete;
  status: "playing" | "won" | "lost";
  guessCount: number;
  poolSize: number;
  sport: WhoAreYaSport;
}) {
  const revealed = status !== "playing";
  const accent = status === "won" ? feedbackVar("success") : status === "lost" ? feedbackVar("danger") : orange;
  return (
    <section
      className="flex items-center gap-4 border p-4"
      style={{ borderColor: withAlpha(accent, 0.5), background: withAlpha(accent, 0.06), clipPath: "var(--ds-clip-hud)" }}
      aria-live="polite"
    >
      <span
        aria-hidden
        className="grid size-16 shrink-0 place-items-center font-display font-black"
        style={{ background: withAlpha(accent, 0.14), border: `1px solid ${withAlpha(accent, 0.6)}`, color: accent, fontSize: typography.sizeRem.p32 }}
      >
        {revealed ? mystery.name.split(" ").map((part) => part[0]).slice(0, 2).join("") : "?"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-display font-black leading-none" style={{ fontSize: typography.sizeRem.p11, letterSpacing: "var(--ds-tracking-ultra)", color: accent }}>
          {status === "won" ? `SOLVED IN ${guessCount}` : status === "lost" ? "OUT OF GUESSES" : "TODAY'S MYSTERY PLAYER"}
        </p>
        <p className="mt-2 font-display font-black leading-tight" style={{ fontSize: typography.sizeRem.p20, letterSpacing: "var(--ds-tracking-wide)" }}>
          {revealed ? mystery.name.toUpperCase() : "WHO ARE YA?"}
        </p>
        <p className="mt-1.5 text-xs leading-snug text-muted">
          {revealed
            ? `The answer for ${sportNames[sport].toLowerCase()} today.`
            : `Guess ${Math.min(guessCount + 1, maxGuesses)} of ${maxGuesses} · pick from ${poolSize} ${sportNames[sport].toLowerCase()} stars`}
        </p>
      </div>
    </section>
  );
}

/* ---- Search ----------------------------------------------------------------- */

function GuessSearch({
  pool,
  excluded,
  onGuess,
}: {
  pool: WhoAthlete[];
  excluded: Set<string>;
  onGuess: (athlete: WhoAthlete) => void;
}) {
  const [query, setQuery] = useState("");
  const needle = normalizeGuessPlayerSearch(query);
  const matches = needle.length === 0
    ? []
    : pool
        .filter((athlete) => !excluded.has(athlete.id) && normalizeGuessPlayerSearch(athlete.name).includes(needle))
        .slice(0, 6);

  return (
    <div className="mt-4">
      <label className="relative block">
        <span className="sr-only">Search for a player</span>
        <PersonSearchIcon size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: orange }} />
        <input
          type="search"
          autoComplete="off"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && matches[0]) {
              onGuess(matches[0]);
              setQuery("");
            }
          }}
          placeholder="Type a player's name"
          className="h-12 w-full border bg-transparent pl-10 pr-3 text-sm outline-none"
          style={{ borderColor: withAlpha(orange, 0.55), background: "var(--ds-color-background-elevated)" }}
        />
      </label>
      {matches.length > 0 ? (
        <ul className="mt-1.5 border" style={{ borderColor: "var(--ds-color-border-default)", background: "var(--ds-color-background-elevated)" }} role="listbox" aria-label="Matching players">
          {matches.map((athlete) => (
            <li key={athlete.id}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => {
                  onGuess(athlete);
                  setQuery("");
                }}
                className="flex min-h-11 w-full cursor-pointer items-center px-3.5 text-left text-sm hover:bg-[color-mix(in_srgb,var(--ds-color-accent-orange)_10%,transparent)]"
              >
                {athlete.name}
              </button>
            </li>
          ))}
        </ul>
      ) : needle.length > 0 ? (
        <p className="mt-2 text-xs text-muted">No player in today&apos;s pool matches that name.</p>
      ) : null}
    </div>
  );
}

/* ---- Rows -------------------------------------------------------------------- */

function GuessRow({ number, name, tiles, solved }: { number: number; name: string; tiles: Tile[]; solved: boolean }) {
  return (
    <div className="border p-2.5" style={{ borderColor: solved ? feedbackVar("success") : "var(--ds-color-border-default)", background: "var(--ds-color-background-elevated)" }}>
      <p className="flex items-baseline gap-2 font-display font-black leading-none" style={{ fontSize: typography.sizeRem.p13, letterSpacing: "var(--ds-tracking-wide)" }}>
        <span className="ds-tabular text-muted" style={{ fontSize: typography.sizeRem.p11 }}>
          {number}.
        </span>
        <span className="truncate">{name.toUpperCase()}</span>
      </p>
      {/* Three to a row on a phone so club names stay whole; one row once wide. */}
      <div className={`mt-2 grid grid-cols-3 gap-1.5 ${tiles.length === 5 ? "sm:grid-cols-5" : "sm:grid-cols-6"}`}>
        {tiles.map((tile) => (
          <TileView key={tile.key} tile={tile} />
        ))}
      </div>
    </div>
  );
}

function TileView({ tile }: { tile: Tile }) {
  const color = tile.state === "hit" ? feedbackVar("success") : tile.state === "near" ? gold : "var(--ds-color-border-default)";
  const ink = tile.state === "miss" ? "var(--ds-color-text-default)" : "var(--ds-color-text-inverse)";
  const verdict = tile.state === "hit" ? "match" : tile.state === "near" ? "close" : "no match";
  const direction = tile.arrow === "up" ? ", the mystery player's is higher" : tile.arrow === "down" ? ", the mystery player's is lower" : "";
  return (
    <div
      className="flex min-h-13 flex-col items-center justify-center px-0.5 py-1.5 text-center"
      style={{ background: tile.state === "miss" ? "var(--ds-color-background-muted)" : color, color: ink, border: `1px solid ${color}` }}
      aria-label={`${tile.label} ${tile.value}: ${verdict}${direction}`}
      title={`${tile.label}: ${tile.value}`}
    >
      <span className="font-display font-black leading-none opacity-75" style={{ fontSize: typography.sizeRem.p11, letterSpacing: "var(--ds-tracking-label)" }}>
        {tile.label}
      </span>
      <span className="mt-1 line-clamp-2 w-full font-display font-black leading-tight" style={{ fontSize: typography.sizeRem.p11 }}>
        {tile.value}
        {tile.arrow ? <span aria-hidden>{tile.arrow === "up" ? " ↑" : " ↓"}</span> : null}
      </span>
    </div>
  );
}

function Legend() {
  const items = [
    { color: feedbackVar("success"), label: "Match" },
    { color: gold, label: "Close: same continent or conference, shared position, a past club, or a number within range" },
    { color: "var(--ds-color-background-muted)", label: "No match. Arrows point towards the mystery player's number." },
  ];
  return (
    <ul className="mt-6 flex flex-col gap-2.5">
      {items.map((item) => (
        <li key={item.label} className="flex items-start gap-2.5 text-xs leading-snug text-muted">
          <span aria-hidden className="mt-0.5 size-3.5 shrink-0 border" style={{ background: item.color, borderColor: "var(--ds-color-border-default)" }} />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

/* ---- Result ------------------------------------------------------------------ */

function Result({
  sport,
  dayKey,
  won,
  rows,
}: {
  sport: WhoAreYaSport;
  dayKey: string;
  won: boolean;
  rows: { guess: WhoAthlete; tiles: Tile[] }[];
}) {
  const session = useAuthSession();
  const requireAuth = useRequireAuth();
  const { countdown } = useDailyCountdown();
  const [shared, setShared] = useState<ShareOutcome | null>(null);

  const score = won ? `${rows.length}/${maxGuesses}` : `X/${maxGuesses}`;
  const text = [
    `StatOz Who Are Ya? ${sportEmojiFor(sport)} #${dailyNumberFor(dayKey)} ${score}`,
    ...rows.map(({ tiles }) => tiles.map((tile) => tileEmoji(tile.state)).join("")),
  ].join("\n");

  return (
    <div className="mt-4 flex flex-col gap-2.5">
      <p className="ds-tabular text-center font-display font-black leading-none" style={{ fontSize: typography.sizeRem.p13, letterSpacing: "var(--ds-tracking-wide)", color: gold }}>
        +{whoAreYaXp(won, rows.length)} XP
      </p>
      <Button accent={orange} glow fullWidth leadingIcon={<ShareIcon size={18} />} onClick={async () => setShared(await shareResult(text))}>
        {shared === "copied" ? "COPIED TO CLIPBOARD" : shared === "shared" ? "SHARED" : "SHARE RESULT"}
      </Button>
      <Link href={`/quiz/${sport}`} className="flex h-12 items-center justify-center border font-display text-xs font-black tracking-wide" style={{ color: orange, borderColor: withAlpha(orange, 0.5) }}>
        BACK TO TODAY&apos;S GAMES
      </Link>
      {session.status === "guest" ? (
        <div className="flex items-center gap-3 border p-3.5" style={{ borderColor: withAlpha(gold, 0.45), background: withAlpha(gold, 0.06) }}>
          <FlameIcon size={20} style={{ color: gold }} />
          <p className="min-w-0 flex-1 text-xs leading-snug text-muted">Log in to keep your streak and climb the leaderboard.</p>
          <button
            type="button"
            onClick={() => requireAuth({ intent: "keep your streak", message: "Log in to keep your daily streak.", returnTo: `/quiz/${sport}` })}
            className="shrink-0 cursor-pointer px-3 py-2 font-display text-xs font-black tracking-wide text-inverse"
            style={{ background: gold }}
          >
            LOG IN
          </button>
        </div>
      ) : null}
      {countdown ? (
        <p className="ds-tabular text-center font-display font-black leading-none text-muted" style={{ fontSize: typography.sizeRem.p11, letterSpacing: "var(--ds-tracking-wide)" }}>
          NEXT MYSTERY IN {countdown}
        </p>
      ) : null}
    </div>
  );
}

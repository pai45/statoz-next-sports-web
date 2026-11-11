"use client";
import { typography } from "@statoz/design-system/web/tokens/typography";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  accentVar,
  Button,
  CloseIcon,
  FlameIcon,
  ReplayIcon,
  ShareIcon,
  feedbackVar,
  withAlpha,
} from "@statoz/design-system/web";
import type { PlayerCard } from "@/domain/cards";
import type { Sport } from "@/domain/sports";
import { useAuthSession, useRequireAuth } from "@/features/auth";
import { usePrefersReducedMotion } from "@/shared/hooks";
import { sportForGame } from "@/mocks/games";

import type { GameLauncherProps } from "../../components/game-launcher";
import { dailyNumberFor, todayKey } from "../../daily/day";
import { shareResult, shareTextFor, sportEmojiFor, sportNames, type ShareOutcome } from "../../daily/share";
import { useDailyCountdown } from "../../daily/use-countdown";
import { dailyRounds, higherLowerXp } from "../constants";
import { chainFromSeed, dailyChain, isRightCall, type Call } from "../engine/chain";
import {
  higherLowerDayFor,
  recordEndlessStreak,
  recordHigherLowerCall,
  useHigherLowerRecord,
} from "../state/higher-lower-store";

/**
 * Higher or Lower on StatOz card ratings. DAILY is a fixed chain of ten calls,
 * the same for everyone; ENDLESS keeps going until the first wrong call.
 */

const lime = accentVar("lime");
const gold = accentVar("gold");
const revealMs = 1100;

export function HigherLower({ game }: GameLauncherProps) {
  const sport = sportForGame(game);
  const router = useRouter();
  const [mode, setMode] = useState<"daily" | "endless">("daily");
  const leave = useCallback(() => {
    if (window.history.length > 1) router.back();
    else router.push(`/quiz/${sport}`);
  }, [router, sport]);

  return (
    <div className="relative flex min-h-dvh flex-col">
      <header className="flex shrink-0 items-center gap-2 px-2 py-2.5" style={{ borderBottom: `1px solid ${withAlpha(lime, 0.2)}` }}>
        <button type="button" onClick={leave} aria-label="Leave Higher or Lower" className="grid size-11 shrink-0 cursor-pointer place-items-center text-subtle">
          <CloseIcon size={20} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display font-black leading-none" style={{ fontSize: typography.sizeRem.p15, letterSpacing: "var(--ds-tracking-ultra)" }}>
            HIGHER OR LOWER
          </h1>
          <p className="mt-1 truncate font-display font-black leading-none text-muted" style={{ fontSize: typography.sizeRem.p11, letterSpacing: "var(--ds-tracking-wide)" }}>
            {sportEmojiFor(sport)} {sportNames[sport]} · STATOZ CARD RATINGS
          </p>
        </div>
      </header>
      <nav aria-label="Mode" className="mx-auto mt-3 grid w-full max-w-120 grid-cols-2 gap-1.5 px-4">
        {(["daily", "endless"] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={mode === value}
            onClick={() => setMode(value)}
            className="h-11 cursor-pointer border font-display font-black"
            style={{
              fontSize: typography.sizeRem.p11,
              letterSpacing: "var(--ds-tracking-wide)",
              color: mode === value ? "var(--ds-color-text-inverse)" : lime,
              background: mode === value ? lime : "transparent",
              borderColor: withAlpha(lime, 0.6),
            }}
          >
            {value === "daily" ? `DAILY · ${dailyRounds} CALLS` : "ENDLESS"}
          </button>
        ))}
      </nav>
      {mode === "daily" ? <Daily sport={sport} /> : <Endless sport={sport} />}
    </div>
  );
}

/* ---- Cards and the call ---------------------------------------------------- */

function RatingCard({
  card,
  rating,
  tone,
  label,
}: {
  card: PlayerCard;
  /** Null hides the rating. */
  rating: number | null;
  tone: "known" | "hidden" | "right" | "wrong";
  label: string;
}) {
  const color = tone === "right" ? feedbackVar("success") : tone === "wrong" ? feedbackVar("danger") : tone === "known" ? lime : "var(--ds-color-border-default)";
  return (
    <div
      className="flex items-center gap-4 border p-4"
      style={{ borderColor: withAlpha(color, 0.7), background: "var(--ds-color-background-elevated)", clipPath: "var(--ds-clip-hud)" }}
    >
      <div className="min-w-0 flex-1">
        <p className="font-display font-black leading-none text-muted" style={{ fontSize: typography.sizeRem.p11, letterSpacing: "var(--ds-tracking-wide)" }}>
          {label}
        </p>
        <p className="mt-2 font-display font-black leading-tight" style={{ fontSize: typography.sizeRem.p18, letterSpacing: "var(--ds-tracking-wide)" }}>
          {card.name.toUpperCase()}
        </p>
        <p className="mt-1.5 text-xs leading-snug text-muted">
          {card.country} · {card.position}
        </p>
      </div>
      <div
        className="grid size-18 shrink-0 place-items-center border font-display font-black"
        style={{ borderColor: color, color: tone === "hidden" ? "var(--ds-color-text-muted)" : color, background: withAlpha(color, 0.1), fontSize: typography.sizeRem.p32 }}
        aria-label={rating === null ? "Rating hidden" : `Rated ${rating}`}
      >
        {rating ?? "?"}
      </div>
    </div>
  );
}

function CallButtons({ disabled, onCall }: { disabled: boolean; onCall: (call: Call) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      <Button accent={lime} glow fullWidth disabled={disabled} onClick={() => onCall("higher")}>
        HIGHER ↑
      </Button>
      <Button accent={lime} variant="tonal" fullWidth disabled={disabled} onClick={() => onCall("lower")}>
        LOWER ↓
      </Button>
    </div>
  );
}

/** Two players and a call, with the hidden rating revealed after the call. */
function Round({
  previous,
  next,
  reveal,
  onCall,
  step,
}: {
  previous: PlayerCard;
  next: PlayerCard;
  reveal: { right: boolean } | null;
  onCall: (call: Call) => void;
  step: string;
}) {
  return (
    <div className="mx-auto mt-4 flex w-full max-w-120 flex-col gap-3 px-4">
      <RatingCard card={previous} rating={previous.rating} tone="known" label="RATED" />
      <p className="text-center font-display font-black" style={{ fontSize: typography.sizeRem.p12, letterSpacing: "var(--ds-tracking-wide)" }}>
        {step} · IS THIS PLAYER RATED HIGHER OR LOWER?
      </p>
      <RatingCard card={next} rating={reveal ? next.rating : null} tone={reveal ? (reveal.right ? "right" : "wrong") : "hidden"} label="MYSTERY RATING" />
      <CallButtons disabled={reveal !== null} onCall={onCall} />
      <p role="status" className="min-h-5 text-center font-display font-black" style={{ fontSize: typography.sizeRem.p12, color: reveal?.right ? feedbackVar("success") : feedbackVar("danger") }}>
        {reveal ? (reveal.right ? "RIGHT CALL" : "WRONG CALL") : ""}
      </p>
    </div>
  );
}

/* ---- Daily ------------------------------------------------------------------- */

function Daily({ sport }: { sport: Sport }) {
  const record = useHigherLowerRecord();
  const reduced = usePrefersReducedMotion();
  const [dayKey] = useState(() => todayKey());
  const chain = useMemo(() => dailyChain(sport, dayKey), [sport, dayKey]);
  const calls = higherLowerDayFor(record, sport, dayKey)?.calls ?? [];
  // The round on screen. It trails the saved calls while a reveal plays.
  const [shown, setShown] = useState<number | null>(null);
  const [reveal, setReveal] = useState<{ right: boolean } | null>(null);
  const index = shown ?? calls.length;

  useEffect(() => {
    if (!reveal) return;
    const id = window.setTimeout(() => {
      setReveal(null);
      setShown(null);
    }, reduced ? 600 : revealMs);
    return () => window.clearTimeout(id);
  }, [reveal, reduced]);

  if (chain.length < dailyRounds + 1) return <p className="p-8 text-center text-sm text-muted">Not enough players for today&apos;s chain.</p>;

  if (index >= dailyRounds && !reveal) return <DailyResult sport={sport} dayKey={dayKey} calls={calls} />;

  return (
    <Round
      previous={chain[index]}
      next={chain[index + 1]}
      reveal={reveal}
      step={`CALL ${index + 1} OF ${dailyRounds}`}
      onCall={(call) => {
        const right = isRightCall(chain[index], chain[index + 1], call);
        // Saved before the reveal, so a reload cannot take the call back.
        setShown(index);
        recordHigherLowerCall(sport, dayKey, right);
        setReveal({ right });
      }}
    />
  );
}

function DailyResult({ sport, dayKey, calls }: { sport: Sport; dayKey: string; calls: boolean[] }) {
  const session = useAuthSession();
  const requireAuth = useRequireAuth();
  const { countdown } = useDailyCountdown();
  const [shared, setShared] = useState<ShareOutcome | null>(null);
  const right = calls.filter(Boolean).length;
  const text = shareTextFor({ game: "Higher or Lower", sport, dailyNumber: dailyNumberFor(dayKey), score: `${right}/${calls.length}`, steps: calls });

  return (
    <div className="mx-auto mt-6 flex w-full max-w-120 flex-col gap-2.5 px-4 pb-10">
      <p className="text-center font-display font-black leading-none" style={{ fontSize: typography.sizeRem.p40, color: right === calls.length ? gold : "var(--ds-color-text-default)" }}>
        {right}/{calls.length}
      </p>
      <div className="flex justify-center gap-1" aria-hidden>
        {calls.map((call, index) => (
          <span key={index} className="size-5" style={{ background: call ? feedbackVar("success") : feedbackVar("danger"), clipPath: "var(--ds-clip-hud)" }} />
        ))}
      </div>
      <p className="ds-tabular text-center font-display font-black" style={{ fontSize: typography.sizeRem.p13, color: gold }}>
        +{higherLowerXp(right, calls.length)} XP
      </p>
      <Button accent={lime} glow fullWidth leadingIcon={<ShareIcon size={18} />} onClick={async () => setShared(await shareResult(text))}>
        {shared === "copied" ? "COPIED TO CLIPBOARD" : shared === "shared" ? "SHARED" : "SHARE RESULT"}
      </Button>
      <Link href={`/quiz/${sport}`} className="flex h-12 items-center justify-center border font-display text-xs font-black tracking-wide" style={{ color: lime, borderColor: withAlpha(lime, 0.5) }}>
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
          NEXT CHAIN IN {countdown} · OR TRY ENDLESS
        </p>
      ) : null}
    </div>
  );
}

/* ---- Endless ----------------------------------------------------------------- */

function Endless({ sport }: { sport: Sport }) {
  const record = useHigherLowerRecord();
  const reduced = usePrefersReducedMotion();
  const [seed, setSeed] = useState(() => `higher-lower:endless:${Date.now()}`);
  const chain = useMemo(() => chainFromSeed(sport, seed, 300), [sport, seed]);
  const [index, setIndex] = useState(0);
  const [reveal, setReveal] = useState<{ right: boolean } | null>(null);
  const [over, setOver] = useState(false);
  const best = record.bestEndless[sport] ?? 0;

  useEffect(() => {
    if (!reveal) return;
    const id = window.setTimeout(() => {
      if (reveal.right) setIndex((current) => current + 1);
      else setOver(true);
      setReveal(null);
    }, reduced ? 600 : revealMs);
    return () => window.clearTimeout(id);
  }, [reveal, reduced]);

  if (over || index + 1 >= chain.length) {
    return (
      <div className="mx-auto mt-6 flex w-full max-w-120 flex-col gap-3 px-4 pb-10 text-center">
        <p className="font-display font-black leading-none text-muted" style={{ fontSize: typography.sizeRem.p12, letterSpacing: "var(--ds-tracking-ultra)" }}>
          STREAK
        </p>
        <p className="font-display font-black leading-none" style={{ fontSize: typography.sizeRem.p40, color: index >= best ? gold : "var(--ds-color-text-default)" }}>
          {index}
        </p>
        <p className="font-display font-black text-muted" style={{ fontSize: typography.sizeRem.p12 }}>
          {index >= best && index > 0 ? "NEW BEST" : `BEST ${best}`}
        </p>
        <Button
          accent={lime}
          glow
          fullWidth
          leadingIcon={<ReplayIcon size={18} />}
          onClick={() => {
            setSeed(`higher-lower:endless:${Date.now()}`);
            setIndex(0);
            setOver(false);
          }}
        >
          PLAY AGAIN
        </Button>
      </div>
    );
  }

  return (
    <Round
      previous={chain[index]}
      next={chain[index + 1]}
      reveal={reveal}
      step={`STREAK ${index} · BEST ${best}`}
      onCall={(call) => {
        const right = isRightCall(chain[index], chain[index + 1], call);
        if (right) recordEndlessStreak(sport, index + 1);
        setReveal({ right });
      }}
    />
  );
}

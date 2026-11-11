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
  ShareIcon,
  feedbackVar,
  withAlpha,
} from "@statoz/design-system/web";
import { useAuthSession, useRequireAuth } from "@/features/auth";

import { dailyNumberFor, todayKey } from "../../daily/day";
import { shareResult, type ShareOutcome } from "../../daily/share";
import { seededRandom } from "../../daily/seeded";
import { useDailyCountdown } from "../../daily/use-countdown";
import { levelEmoji, maxMistakes } from "../constants";
import { dailyConnections, groupOf, judge, playerName, type ConnectionGroup, type ConnectionsPuzzle } from "../engine/connections";
import {
  connectionsDayFor,
  connectionsXp,
  isConnectionsDone,
  submitConnectionsGuess,
  useConnectionsRecord,
} from "../state/connections-store";

/**
 * Football Connections: sixteen players, four hidden clubs. Pick four who
 * played for the same club; four wrong guesses end the day.
 */

const gold = accentVar("gold");
const levelColors = [accentVar("gold"), accentVar("lime"), accentVar("cyan"), accentVar("violet")];

export function FootballConnections() {
  const router = useRouter();
  const record = useConnectionsRecord();
  const [dayKey] = useState(() => todayKey());
  const puzzle = useMemo(() => dailyConnections(dayKey), [dayKey]);
  const day = connectionsDayFor(record, dayKey);
  const [picks, setPicks] = useState<string[]>([]);
  const [order, setOrder] = useState<string[] | null>(null);
  const [message, setMessage] = useState<{ text: string; good: boolean } | null>(null);

  const leave = useCallback(() => {
    if (window.history.length > 1) router.back();
    else router.push("/quiz/football");
  }, [router]);

  if (!puzzle) return <p className="p-8 text-center text-sm text-muted">No puzzle today.</p>;

  const solved = (day?.solved ?? []).map((clubId) => puzzle.groups.find((group) => group.clubId === clubId)!).filter(Boolean);
  const done = isConnectionsDone(day);
  const mistakes = day?.mistakes ?? 0;
  const solvedIds = new Set(solved.flatMap((group) => group.playerIds));
  const remaining = (order ?? puzzle.tiles).filter((id) => !solvedIds.has(id));
  // When the day is lost, reveal the groups left unfound.
  const revealed = done ? puzzle.groups.filter((group) => !solved.includes(group)) : [];

  function toggle(id: string) {
    setMessage(null);
    setPicks((current) => (current.includes(id) ? current.filter((pick) => pick !== id) : current.length < 4 ? [...current, id] : current));
  }

  function submit() {
    if (!puzzle || picks.length !== 4) return;
    const already = day?.guesses.some((guess) => guess.length === 4 && guess.every((id) => picks.includes(id)));
    if (already) {
      setMessage({ text: "ALREADY TRIED THAT FOUR", good: false });
      return;
    }
    const { group, bestOverlap } = judge(puzzle, picks);
    submitConnectionsGuess(dayKey, picks, group?.clubId ?? null);
    setMessage(group ? { text: `✓ ${group.label.toUpperCase()}`, good: true } : { text: bestOverlap === 3 ? "ONE AWAY…" : "NOT A GROUP", good: false });
    setPicks([]);
  }

  return (
    <div className="relative flex min-h-dvh flex-col">
      <header className="flex shrink-0 items-center gap-2 px-2 py-2.5" style={{ borderBottom: `1px solid ${withAlpha(gold, 0.2)}` }}>
        <button type="button" onClick={leave} aria-label="Leave Football Connections" className="grid size-11 shrink-0 cursor-pointer place-items-center text-subtle">
          <CloseIcon size={20} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display font-black leading-none" style={{ fontSize: typography.sizeRem.p15, letterSpacing: "var(--ds-tracking-ultra)" }}>
            CONNECTIONS #{dailyNumberFor(dayKey)}
          </h1>
          <p className="mt-1 truncate font-display font-black leading-none text-muted" style={{ fontSize: typography.sizeRem.p11, letterSpacing: "var(--ds-tracking-wide)" }}>
            ⚽ FIND FOUR PLAYERS FROM THE SAME CLUB
          </p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-120 px-4 pb-10 pt-4">
        <div className="flex flex-col gap-2">
          {[...solved, ...revealed].map((group) => (
            <GroupBar key={group.clubId} group={group} missed={revealed.includes(group)} />
          ))}
        </div>

        {!done ? (
          <>
            <ul className="mt-2 grid grid-cols-4 gap-1.5" aria-label="Players">
              {remaining.map((id) => {
                const picked = picks.includes(id);
                return (
                  <li key={id}>
                    <button
                      type="button"
                      aria-pressed={picked}
                      onClick={() => toggle(id)}
                      className="flex h-17 w-full cursor-pointer items-center justify-center border px-1 text-center font-display font-black leading-tight"
                      style={{
                        fontSize: typography.sizeRem.p11,
                        background: picked ? gold : "var(--ds-color-background-elevated)",
                        color: picked ? "var(--ds-color-text-inverse)" : "var(--ds-color-text-default)",
                        borderColor: picked ? gold : "var(--ds-color-border-default)",
                      }}
                    >
                      <span className="line-clamp-3 [overflow-wrap:anywhere]">{playerName(id).toUpperCase()}</span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <p role="status" className="mt-3 min-h-5 text-center font-display font-black" style={{ fontSize: typography.sizeRem.p12, color: message?.good ? feedbackVar("success") : feedbackVar("danger") }}>
              {message?.text ?? ""}
            </p>

            <div className="mt-1 flex items-center justify-center gap-2" aria-label={`${maxMistakes - mistakes} mistakes left`}>
              <span className="font-display font-black text-muted" style={{ fontSize: typography.sizeRem.p11, letterSpacing: "var(--ds-tracking-wide)" }}>
                MISTAKES LEFT
              </span>
              {Array.from({ length: maxMistakes }, (_, index) => (
                <span key={index} aria-hidden className="size-3 rounded-full" style={{ background: index < maxMistakes - mistakes ? gold : "var(--ds-color-border-default)" }} />
              ))}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <Button accent={gold} variant="tonal" fullWidth onClick={() => setOrder(reshuffle(remaining))}>
                SHUFFLE
              </Button>
              <Button accent={gold} variant="tonal" fullWidth disabled={picks.length === 0} onClick={() => setPicks([])}>
                CLEAR
              </Button>
              <Button accent={gold} glow fullWidth disabled={picks.length !== 4} onClick={submit}>
                SUBMIT
              </Button>
            </div>
          </>
        ) : (
          <Result dayKey={dayKey} puzzle={puzzle} />
        )}
      </div>
    </div>
  );
}

function reshuffle(ids: string[]): string[] {
  const random = seededRandom(`${Date.now()}`);
  const out = [...ids];
  for (let index = out.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [out[index], out[swap]] = [out[swap], out[index]];
  }
  return out;
}

function GroupBar({ group, missed }: { group: ConnectionGroup; missed: boolean }) {
  const color = levelColors[group.level];
  return (
    <div className="px-3 py-3 text-center" style={{ background: missed ? withAlpha(color, 0.35) : color, color: "var(--ds-color-text-inverse)", clipPath: "var(--ds-clip-hud)" }}>
      <p className="font-display font-black leading-none" style={{ fontSize: typography.sizeRem.p13, letterSpacing: "var(--ds-tracking-wide)" }}>
        PLAYED FOR {group.label.toUpperCase()}
      </p>
      <p className="mt-1.5 text-xs font-semibold leading-snug">{group.playerIds.map(playerName).join(" · ")}</p>
    </div>
  );
}

function Result({ dayKey, puzzle }: { dayKey: string; puzzle: ConnectionsPuzzle }) {
  const record = useConnectionsRecord();
  const day = connectionsDayFor(record, dayKey)!;
  const session = useAuthSession();
  const requireAuth = useRequireAuth();
  const { countdown } = useDailyCountdown();
  const [shared, setShared] = useState<ShareOutcome | null>(null);
  const won = day.solved.length === 4;
  const rows = day.guesses.map((guess) => guess.map((id) => levelEmoji[groupOf(puzzle, id)?.level ?? 0]).join(""));
  const text = [`StatOz Connections ⚽ #${dailyNumberFor(dayKey)} ${won ? `${day.mistakes} mistake${day.mistakes === 1 ? "" : "s"}` : "X"}`, ...rows].join("\n");

  return (
    <div className="mt-5 flex flex-col gap-2.5">
      <p className="text-center font-display font-black leading-none" style={{ fontSize: typography.sizeRem.p22, color: won ? gold : feedbackVar("danger") }}>
        {won ? (day.mistakes === 0 ? "PERFECT" : "SOLVED") : "OUT OF MISTAKES"}
      </p>
      <p className="ds-tabular text-center font-display font-black" style={{ fontSize: typography.sizeRem.p13, color: gold }}>
        +{connectionsXp(day)} XP
      </p>
      <Button accent={gold} glow fullWidth leadingIcon={<ShareIcon size={18} />} onClick={async () => setShared(await shareResult(text))}>
        {shared === "copied" ? "COPIED TO CLIPBOARD" : shared === "shared" ? "SHARED" : "SHARE RESULT"}
      </Button>
      <Link href="/quiz/football" className="flex h-12 items-center justify-center border font-display text-xs font-black tracking-wide" style={{ color: gold, borderColor: withAlpha(gold, 0.5) }}>
        BACK TO TODAY&apos;S GAMES
      </Link>
      {session.status === "guest" ? (
        <div className="flex items-center gap-3 border p-3.5" style={{ borderColor: withAlpha(gold, 0.45), background: withAlpha(gold, 0.06) }}>
          <FlameIcon size={20} style={{ color: gold }} />
          <p className="min-w-0 flex-1 text-xs leading-snug text-muted">Log in to keep your streak and climb the leaderboard.</p>
          <button
            type="button"
            onClick={() => requireAuth({ intent: "keep your streak", message: "Log in to keep your daily streak.", returnTo: "/quiz/football" })}
            className="shrink-0 cursor-pointer px-3 py-2 font-display text-xs font-black tracking-wide text-inverse"
            style={{ background: gold }}
          >
            LOG IN
          </button>
        </div>
      ) : null}
      {countdown ? (
        <p className="ds-tabular text-center font-display font-black leading-none text-muted" style={{ fontSize: typography.sizeRem.p11, letterSpacing: "var(--ds-tracking-wide)" }}>
          NEXT PUZZLE IN {countdown}
        </p>
      ) : null}
    </div>
  );
}

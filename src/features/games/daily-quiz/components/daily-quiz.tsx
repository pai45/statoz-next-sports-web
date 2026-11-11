"use client";
import { typography } from "@statoz/design-system/web/tokens/typography";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  accentVar,
  ArrowRightIcon,
  Button,
  CloseIcon,
  FlameIcon,
  QuizIcon,
  ShareIcon,
  TimerIcon,
  feedbackVar,
  withAlpha,
} from "@statoz/design-system/web";
import type { Sport } from "@/domain/sports";
import { useAuthSession, useRequireAuth } from "@/features/auth";
import { usePrefersReducedMotion } from "@/shared/hooks";

import type { GameLauncherProps } from "../../components/game-launcher";
import { dailyNumberFor, todayKey } from "../../daily/day";
import { shareResult, shareTextFor, sportEmojiFor, sportNames, type ShareOutcome } from "../../daily/share";
import { useDailyCountdown } from "../../daily/use-countdown";
import { ensureLoaded, labelFor, poolFor } from "../../quiz/state/question-bank";
import type { TriviaQuestion } from "../../quiz/types";
import { QuizOption } from "../../quiz/components/quiz-option";
import quizStyles from "../../quiz/components/quiz.module.css";
import { sportForGame } from "@/mocks/games";
import { dailyQuizLength, dailyQuizMix, secondsPerQuestion, speedBonusWindowSeconds } from "../constants";
import { answerXp, dailyQuizQuestions } from "../engine/pick";
import {
  beginDailyQuiz,
  dailyQuizDayFor,
  recordDailyAnswer,
  useDailyQuizRecord,
  type DailyQuizDay,
} from "../state/daily-quiz-store";

/**
 * The Daily Quiz: five questions, the same for everyone today, fifteen seconds
 * each. Tapping an option answers it; there is no LOCK IN step, because the
 * clock is the commitment.
 *
 * Answers are saved as they land, so leaving resumes at the next question.
 * Leaving while a question is on screen counts it as a miss, otherwise a peek
 * followed by a fresh clock would be free.
 */

const cyan = accentVar("cyan");
const gold = accentVar("gold");
const verdictHoldMs = 1100;

type Loaded = { dayKey: string; questions: TriviaQuestion[] };

export function DailyQuiz({ game }: GameLauncherProps) {
  const sport = sportForGame(game);
  const record = useDailyQuizRecord();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);
  // True while the play screen owns the window, so the last verdict gets its
  // beat before the result replaces it.
  const [playing, setPlaying] = useState(false);

  // The day is fixed when the screen opens, so a run that crosses midnight
  // finishes the quiz it started.
  useEffect(() => {
    let cancelled = false;
    const dayKey = todayKey();
    void Promise.all(dailyQuizMix.map(({ mode }) => ensureLoaded(sport, mode))).then(() => {
      if (cancelled) return;
      const pools = Object.fromEntries(dailyQuizMix.map(({ mode }) => [mode, poolFor(sport, mode)]));
      const questions = dailyQuizQuestions(sport, dayKey, pools);
      if (questions.length < dailyQuizLength) setFailed(true);
      else setLoaded({ dayKey, questions });
    });
    return () => {
      cancelled = true;
    };
  }, [sport]);

  const day = loaded ? dailyQuizDayFor(record, sport, loaded.dayKey) : null;
  // A day opened before the pools changed keeps the questions it was dealt.
  const questions = useMemo(() => {
    if (!loaded) return [];
    if (!day || day.questionIds.length === 0) return loaded.questions;
    const all = dailyQuizMix.flatMap(({ mode }) => poolFor(sport, mode));
    const byId = new Map(all.map((question) => [question.id, question]));
    const kept = day.questionIds.map((id) => byId.get(id)).filter((q): q is TriviaQuestion => Boolean(q));
    return kept.length === day.questionIds.length ? kept : loaded.questions;
  }, [loaded, day, sport]);

  if (failed) return <Unavailable sport={sport} />;
  if (!loaded) return <Frame sport={sport} dayKey={null}><Centered>LOADING TODAY&apos;S QUIZ…</Centered></Frame>;

  const dayKey = loaded.dayKey;
  if (!playing && day?.completed) {
    return <DailyResult sport={sport} dayKey={dayKey} day={day} questions={questions} />;
  }

  const resuming = Boolean(day && !day.completed && day.answers.length > 0);
  if (!playing && !resuming) {
    return (
      <DailyIntro
        sport={sport}
        dayKey={dayKey}
        onStart={() => {
          beginDailyQuiz(sport, dayKey, questions.map((question) => question.id));
          setPlaying(true);
        }}
      />
    );
  }

  return (
    <DailyPlay
      sport={sport}
      dayKey={dayKey}
      questions={questions}
      startAt={day?.answers.length ?? 0}
      previous={day?.answers.map((answer) => answer.correct) ?? []}
      onBegin={() => setPlaying(true)}
      onDone={() => setPlaying(false)}
    />
  );
}

/* ---- Shell ----------------------------------------------------------------- */

function useLeave(sport: Sport) {
  const router = useRouter();
  return useCallback(() => {
    // Opened from the hub, go back there; opened from a link, go to the hub.
    if (window.history.length > 1) router.back();
    else router.push(`/quiz/${sport}`);
  }, [router, sport]);
}

function Frame({
  sport,
  dayKey,
  onClose,
  children,
}: {
  sport: Sport;
  dayKey: string | null;
  onClose?: () => void;
  children: React.ReactNode;
}) {
  const leave = useLeave(sport);
  return (
    <div className="relative flex min-h-dvh flex-col">
      <header
        className="flex shrink-0 items-center gap-2 px-2 py-2.5"
        style={{ borderBottom: `1px solid ${withAlpha(cyan, 0.16)}` }}
      >
        <button
          type="button"
          onClick={onClose ?? leave}
          aria-label="Leave the daily quiz"
          className="grid size-11 shrink-0 cursor-pointer place-items-center text-subtle"
        >
          <CloseIcon size={20} />
        </button>
        <div className="min-w-0 flex-1">
          <h1
            className="truncate font-display font-black leading-none"
            style={{ fontSize: typography.sizeRem.p15, letterSpacing: "var(--ds-tracking-ultra)" }}
          >
            DAILY QUIZ{dayKey ? ` #${dailyNumberFor(dayKey)}` : ""}
          </h1>
          <p
            className="mt-1 truncate font-display font-black leading-none text-muted"
            style={{ fontSize: typography.sizeRem.p11, letterSpacing: "var(--ds-tracking-wide)" }}
          >
            {sportEmojiFor(sport)} {sportNames[sport]}
          </p>
        </div>
      </header>
      {children}
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid flex-1 place-items-center px-6 text-center">
      <p
        className="font-display font-black leading-snug text-muted"
        style={{ fontSize: typography.sizeRem.p12, letterSpacing: "var(--ds-tracking-ultra)" }}
      >
        {children}
      </p>
    </div>
  );
}

function Unavailable({ sport }: { sport: Sport }) {
  return (
    <Frame sport={sport} dayKey={null}>
      <Centered>
        TODAY&apos;S QUIZ COULD NOT LOAD.
        <br />
        <Link href={`/quiz/${sport}`} className="mt-4 inline-block underline">
          BACK TO QUIZ
        </Link>
      </Centered>
    </Frame>
  );
}

/* ---- Intro ----------------------------------------------------------------- */

function DailyIntro({ sport, dayKey, onStart }: { sport: Sport; dayKey: string; onStart: () => void }) {
  const rules = [
    { label: "QUESTIONS", value: `${dailyQuizLength}` },
    { label: "SECONDS EACH", value: `${secondsPerQuestion}` },
    { label: "ENTRY", value: "FREE" },
  ];
  return (
    <Frame sport={sport} dayKey={dayKey}>
      <div className="mx-auto flex w-full max-w-107.5 flex-1 flex-col justify-center px-5 py-8">
        <div className={quizStyles.riseIn}>
          <p
            className="font-display font-black leading-none"
            style={{ fontSize: typography.sizeRem.p12, letterSpacing: "var(--ds-tracking-ultra)", color: cyan }}
          >
            TODAY · SAME QUIZ FOR EVERYONE
          </p>
          <h2
            className="mt-3 font-display font-black leading-tight"
            style={{ fontSize: typography.sizeRem.p27, letterSpacing: "var(--ds-tracking-wide)" }}
          >
            {sportNames[sport]} DAILY #{dailyNumberFor(dayKey)}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Two easy, two medium, one hard. Tap an answer to lock it in. Answer inside {speedBonusWindowSeconds} seconds for
            bonus XP. Finishing keeps your daily streak alive.
          </p>

          <dl className="mt-6 grid grid-cols-3 gap-2">
            {rules.map((rule) => (
              <div
                key={rule.label}
                className="border px-2 py-3 text-center"
                style={{ borderColor: withAlpha(cyan, 0.3), background: withAlpha(cyan, 0.06) }}
              >
                <dd
                  className="ds-tabular font-display font-black leading-none"
                  style={{ fontSize: typography.sizeRem.p22, color: cyan }}
                >
                  {rule.value}
                </dd>
                <dt
                  className="mt-1.5 font-display font-black leading-none text-muted"
                  style={{ fontSize: typography.sizeRem.p11, letterSpacing: "var(--ds-tracking-wide)" }}
                >
                  {rule.label}
                </dt>
              </div>
            ))}
          </dl>

          <div className="mt-7">
            <Button accent={cyan} glow fullWidth trailingIcon={<ArrowRightIcon size={18} />} onClick={onStart}>
              START TODAY&apos;S QUIZ
            </Button>
          </div>
        </div>
      </div>
    </Frame>
  );
}

/* ---- Play ------------------------------------------------------------------ */

type Verdict = { picked: number | null; correct: boolean };

function DailyPlay({
  sport,
  dayKey,
  questions,
  startAt,
  previous,
  onBegin,
  onDone,
}: {
  sport: Sport;
  dayKey: string;
  questions: TriviaQuestion[];
  startAt: number;
  previous: boolean[];
  onBegin: () => void;
  onDone: () => void;
}) {
  const reduced = usePrefersReducedMotion();
  // Claim the window on mount, including when resuming a half-played day.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => onBegin(), []);
  const leave = useLeave(sport);
  const [index, setIndex] = useState(startAt);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [history, setHistory] = useState<boolean[]>(previous);
  const [remainingMs, setRemainingMs] = useState(secondsPerQuestion * 1000);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const startedAt = useRef(0);
  const answeredRef = useRef(false);
  const clock = useRef<number | null>(null);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });

  const question = questions[index];

  const answer = useCallback(
    (picked: number | null) => {
      if (answeredRef.current || !question) return;
      answeredRef.current = true;
      if (clock.current !== null) window.clearInterval(clock.current);
      const seconds = Math.min(secondsPerQuestion, Math.ceil((performance.now() - startedAt.current) / 1000));
      const correct = picked !== null && picked === question.correctIndex;
      recordDailyAnswer(sport, dayKey, { picked, correct, seconds, xp: answerXp(question, correct, seconds) });
      setVerdict({ picked, correct });
      setHistory((current) => [...current, correct]);
    },
    [question, sport, dayKey],
  );

  // Start the clock for each question, and run it down.
  useEffect(() => {
    answeredRef.current = false;
    startedAt.current = performance.now();
    const id = window.setInterval(() => {
      const left = secondsPerQuestion * 1000 - (performance.now() - startedAt.current);
      setRemainingMs(Math.max(0, left));
      if (left <= 0) answer(null);
    }, 100);
    clock.current = id;
    return () => window.clearInterval(id);
    // `answer` changes with the question, which is exactly when this restarts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // After the verdict, move on. The store marks the day complete on the last
  // answer, which swaps this screen for the result.
  useEffect(() => {
    if (!verdict) return;
    const last = index >= questions.length - 1;
    const id = window.setTimeout(() => {
      if (last) {
        done.current();
        return;
      }
      // A fresh clock and a clean slate for the next question.
      setVerdict(null);
      setRemainingMs(secondsPerQuestion * 1000);
      setIndex((current) => current + 1);
    }, reduced ? 700 : verdictHoldMs);
    return () => window.clearTimeout(id);
  }, [verdict, index, questions.length, reduced]);

  if (!question) return null;

  const fraction = remainingMs / (secondsPerQuestion * 1000);
  const urgent = remainingMs <= 5000 && !verdict;
  const secondsLeft = Math.ceil(remainingMs / 1000);

  return (
    <Frame
      sport={sport}
      dayKey={dayKey}
      onClose={() => {
        if (verdict) leave();
        else setConfirmLeave(true);
      }}
    >
      <div className="mx-auto w-full max-w-107.5 shrink-0 px-4 pt-3">
        <div className="flex gap-1.25" aria-label={`Question ${index + 1} of ${questions.length}`}>
          {questions.map((item, position) => {
            const done = history[position];
            const background =
              done === undefined
                ? position === index
                  ? "var(--ds-gradient-step-current)"
                  : "var(--ds-color-border-default)"
                : done
                  ? "var(--ds-gradient-step-passed)"
                  : "var(--ds-gradient-step-failed)";
            return <span key={item.id} aria-hidden className="h-2 flex-1" style={{ background }} />;
          })}
        </div>

        <div className="mt-3 flex items-center gap-2" role="timer" aria-live="off" aria-label={`${secondsLeft} seconds left`}>
          <TimerIcon size={16} style={{ color: urgent ? feedbackVar("danger") : cyan }} />
          <div className="h-1.5 flex-1 overflow-hidden" style={{ background: "var(--ds-color-border-default)" }}>
            <div
              className="h-full"
              style={{
                width: `${fraction * 100}%`,
                background: urgent ? feedbackVar("danger") : cyan,
                transition: "width 100ms linear",
              }}
            />
          </div>
          <span
            className="ds-tabular w-7 text-right font-display font-black leading-none"
            style={{ fontSize: typography.sizeRem.p13, color: urgent ? feedbackVar("danger") : cyan }}
          >
            {verdict ? "—" : secondsLeft}
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-4">
        <div key={question.id} className={`${quizStyles.questionIn} mx-auto w-full max-w-107.5`}>
          <div
            className="border px-4.5 pb-4.5 pt-5"
            style={{ background: "var(--ds-gradient-fixture-card)", borderColor: withAlpha(cyan, 0.34) }}
          >
            <p
              className="font-display font-black leading-none"
              style={{ fontSize: typography.sizeRem.p11, letterSpacing: "var(--ds-tracking-ultra)", color: cyan }}
            >
              QUESTION {index + 1} OF {questions.length} · {question.mode.toUpperCase()}
            </p>
            <p className="mt-3 font-display text-lg font-black leading-snug">{question.prompt}</p>

            <div className="mt-5 flex flex-col gap-2.5">
              {question.options.map((option, position) => {
                const pickedThis = verdict?.picked === position;
                return (
                  <QuizOption
                    key={position}
                    letter={String.fromCharCode(65 + position)}
                    label={option}
                    selected={pickedThis}
                    accent={cyan}
                    verdict={verdict && pickedThis ? verdict.correct : null}
                    isAnswerKey={Boolean(verdict && !verdict.correct && position === question.correctIndex)}
                    dimmed={Boolean(verdict && !pickedThis && position !== question.correctIndex)}
                    streak={0}
                    disabled={verdict !== null}
                    onSelect={() => answer(position)}
                  />
                );
              })}
            </div>

            {verdict ? (
              <p
                className="mt-4 font-display font-black leading-snug"
                role="status"
                style={{
                  fontSize: typography.sizeRem.p12,
                  letterSpacing: "var(--ds-tracking-wide)",
                  color: verdict.correct ? feedbackVar("success") : feedbackVar("danger"),
                }}
              >
                {verdict.correct
                  ? "CORRECT"
                  : verdict.picked === null
                    ? `TIME'S UP · ANSWER: ${question.options[question.correctIndex]}`
                    : `WRONG · ANSWER: ${question.options[question.correctIndex]}`}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {confirmLeave ? (
        <LeaveDialog
          onStay={() => setConfirmLeave(false)}
          onLeave={() => {
            answer(null);
            leave();
          }}
        />
      ) : null}
    </Frame>
  );
}

function LeaveDialog({ onStay, onLeave }: { onStay: () => void; onLeave: () => void }) {
  return (
    <div className="absolute inset-0 z-40 grid place-items-center px-6" style={{ background: "var(--ds-color-overlay-scrim)" }}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Leave the daily quiz"
        className="w-full max-w-90 border p-5"
        style={{ background: "var(--ds-color-background-elevated)", borderColor: "var(--ds-color-border-default)" }}
      >
        <h2 className="font-display font-black leading-none" style={{ fontSize: typography.sizeRem.p17, letterSpacing: "var(--ds-tracking-ultra)" }}>
          LEAVE THE QUIZ?
        </h2>
        <p className="mt-3 text-xs leading-snug text-muted">
          This question counts as a miss. Your other answers are saved and you can finish the rest later today.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onStay} className="cursor-pointer px-3 py-2 font-display text-xs font-black tracking-wide text-muted hover:text-foreground">
            KEEP PLAYING
          </button>
          <button
            type="button"
            onClick={onLeave}
            className="cursor-pointer px-4 py-2 font-display text-xs font-black tracking-wide text-inverse"
            style={{ background: "var(--ds-color-danger)" }}
          >
            LEAVE
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---- Result ---------------------------------------------------------------- */

function DailyResult({
  sport,
  dayKey,
  day,
  questions,
}: {
  sport: Sport;
  dayKey: string;
  day: DailyQuizDay;
  questions: TriviaQuestion[];
}) {
  const session = useAuthSession();
  const requireAuth = useRequireAuth();
  const { countdown } = useDailyCountdown();
  const [shared, setShared] = useState<ShareOutcome | null>(null);

  const correct = day.answers.filter((answer) => answer.correct).length;
  const xp = day.answers.reduce((sum, answer) => sum + answer.xp, 0);
  const seconds = day.answers.reduce((sum, answer) => sum + answer.seconds, 0);
  const perfect = correct === day.answers.length;
  const text = shareTextFor({
    game: "Daily Quiz",
    sport,
    dailyNumber: dailyNumberFor(dayKey),
    score: `${correct}/${day.answers.length}`,
    steps: day.answers.map((answer) => answer.correct),
    detail: `⏱ ${seconds}s`,
  });

  return (
    <Frame sport={sport} dayKey={dayKey}>
      <div className="mx-auto w-full max-w-107.5 px-5 py-7">
        <p
          className={`${quizStyles.revealIn} text-center font-display font-black leading-none`}
          style={{ fontSize: typography.sizeRem.p12, letterSpacing: "var(--ds-tracking-ultra)", color: perfect ? gold : cyan }}
        >
          {perfect ? "PERFECT DAY" : "TODAY'S QUIZ DONE"}
        </p>
        <p
          className="ds-tabular mt-3 text-center font-display font-black leading-none"
          style={{ fontSize: typography.sizeRem.p40, color: perfect ? gold : "var(--ds-color-text-default)" }}
        >
          {correct}/{day.answers.length}
        </p>
        <div className="mt-4 flex justify-center gap-1.5" aria-label={`${correct} of ${day.answers.length} correct`}>
          {day.answers.map((answer, position) => (
            <span
              key={position}
              aria-hidden
              className="size-7"
              style={{ background: answer.correct ? feedbackVar("success") : feedbackVar("danger"), clipPath: "var(--ds-clip-hud)" }}
            />
          ))}
        </div>
        <p
          className="ds-tabular mt-4 text-center font-display font-black leading-none text-muted"
          style={{ fontSize: typography.sizeRem.p12, letterSpacing: "var(--ds-tracking-wide)" }}
        >
          {seconds}s TOTAL · <span style={{ color: gold }}>+{xp} XP</span>
        </p>

        <div className="mt-6 flex flex-col gap-2.5">
          <Button
            accent={cyan}
            glow
            fullWidth
            leadingIcon={<ShareIcon size={18} />}
            onClick={async () => setShared(await shareResult(text))}
          >
            {shared === "copied" ? "COPIED TO CLIPBOARD" : shared === "shared" ? "SHARED" : "SHARE RESULT"}
          </Button>
          <Link
            href={`/play/quiz/${sport}`}
            className="flex h-12 items-center justify-center gap-2 border font-display text-xs font-black tracking-wide"
            style={{ color: cyan, borderColor: withAlpha(cyan, 0.5) }}
          >
            <QuizIcon size={16} /> KEEP GOING: QUIZ PATHS
          </Link>
          <Link
            href={`/quiz/${sport}`}
            className="flex h-12 items-center justify-center font-display text-xs font-black tracking-wide text-muted hover:text-foreground"
          >
            BACK TO TODAY&apos;S GAMES
          </Link>
        </div>

        {session.status === "guest" ? (
          <div className="mt-5 flex items-center gap-3 border p-3.5" style={{ borderColor: withAlpha(gold, 0.45), background: withAlpha(gold, 0.06) }}>
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
          <p
            className="ds-tabular mt-5 text-center font-display font-black leading-none text-muted"
            style={{ fontSize: typography.sizeRem.p11, letterSpacing: "var(--ds-tracking-wide)" }}
          >
            NEXT QUIZ IN {countdown}
          </p>
        ) : null}

        <ul className="mt-6 flex flex-col gap-2">
          {questions.map((question, position) => {
            const answer = day.answers[position];
            if (!answer) return null;
            return (
              <li key={question.id} className="border px-3.5 py-3" style={{ borderColor: "var(--ds-color-border-muted)" }}>
                <p className="text-xs font-bold leading-snug">
                  Q{position + 1} · {question.prompt}
                </p>
                <p
                  className="mt-1.5 text-xs leading-snug"
                  style={{ color: answer.correct ? feedbackVar("success") : feedbackVar("danger") }}
                >
                  {answer.correct
                    ? `${labelFor(question, answer.picked ?? undefined)} · ${answer.seconds}s`
                    : `${answer.picked === null ? "No answer" : labelFor(question, answer.picked)} · Answer: ${question.options[question.correctIndex]}`}
                </p>
              </li>
            );
          })}
        </ul>
      </div>
    </Frame>
  );
}

"use client";
import { useEffect, useReducer, useRef, useState } from "react";
import { ArrowRightIcon, CloseIcon } from "@statoz/design-system/web";
import type { Sport } from "@/domain/sports";
import { usePrefersReducedMotion } from "@/shared/hooks";
import { modeLabels } from "@/mocks/games/quiz";
import { modeRewards } from "../constants";
import { advanceMs, initialRun, revealMs, runReducer } from "../state/run";
import { useStageTimer } from "../state/use-stage-timer";
import type { AnswerResult, QuizMode, TriviaQuestion } from "../types";
import { ArenaBackdrop, ArenaDialog, arenaTheme, sportNames } from "./arena-shell";
import styles from "./arena.module.css";

export type QuizPlayProps = { sport: Sport; mode: QuizMode; setNumber: number; questions: TriviaQuestion[]; onExit: (earnedXp: number) => void; onFinish: (run: { results: AnswerResult[]; correct: number; earnedXp: number; bestStreak: number }) => void };
export function QuizPlay({ sport, mode, setNumber, questions, onExit, onFinish }: QuizPlayProps) {
  const [run, dispatch] = useReducer(runReducer, initialRun);
  const [confirmExit, setConfirmExit] = useState(false);
  const [hidden, setHidden] = useState(false);
  const reduced = usePrefersReducedMotion();
  const heading = useRef<HTMLHeadingElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const finished = useRef(false);
  const question = questions[run.index];
  const isLast = run.index === questions.length - 1;
  const resolved = run.phase === "resolved";
  const verdict = resolved ? run.results[run.index] : null;
  const paused = confirmExit || hidden;
  const duration = run.phase === "revealing" ? (reduced ? 0 : revealMs) : resolved && !isLast && !reduced ? advanceMs : null;
  const next = () => dispatch({ type: "next", count: questions.length, index: run.index });
  const remaining = useStageTimer(`${run.index}:${run.phase}`, duration, paused, () => {
    if (run.phase === "revealing") dispatch({ type: "resolve", question, reward: modeRewards[mode] });
    else next();
  });
  useEffect(() => {
    const sync = () => setHidden(document.hidden);
    sync(); document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); scroll.current?.scrollTo(0, 0); }, [run.index]);
  useEffect(() => {
    if (run.phase !== "finished" || finished.current) return;
    finished.current = true;
    onFinish({ results: run.results, correct: run.results.filter(result => result.correct).length, earnedXp: run.earnedXp, bestStreak: run.bestStreak });
  }, [run, onFinish]);
  function requestExit() {
    if (run.picked === null && run.results.length === 0) onExit(0);
    else setConfirmExit(true);
  }
  return <section className={`${styles.arena} ${styles.play}`} style={arenaTheme(sport)}>
    <ArenaBackdrop sport={sport} />
    <header className={styles.playHeader}>
      <button className={styles.iconButton} onClick={requestExit} aria-label="Exit quiz"><CloseIcon size={21} /></button>
      <div className={styles.playTitle}><h1>{sportNames[sport]} Quiz</h1><p>{modeLabels[mode]} / SET {String(setNumber).padStart(2, "0")}</p></div>
      <div className={styles.scoreboard}><div><small>Question</small><strong>{run.index + 1}/{questions.length}</strong></div><div><small>Streak</small><strong>{run.streak}</strong></div><div><small>Run XP</small><strong>{run.earnedXp}</strong></div></div>
    </header>
    <div ref={scroll} className={styles.questionScroll}>
      <div className={styles.questionStage}>
        <div className={styles.questionMeta}><b>QUESTION {String(run.index + 1).padStart(2, "0")}</b><span>{run.phase === "revealing" ? "Answer locked" : resolved ? "Answer revealed" : "Select one answer"}</span></div>
        <h2 ref={heading} tabIndex={-1} className={styles.question}>{question.prompt}</h2>
        <div className={styles.options} role="group" aria-label="Answer choices">
          {question.options.map((option, position) => {
            const selected = run.picked === position;
            const answerKey = resolved && position === question.correctIndex;
            const wrong = resolved && selected && !answerKey;
            return <button key={position} type="button" className={styles.option} aria-pressed={selected} disabled={run.phase !== "picking"} data-verdict={answerKey ? "correct" : wrong ? "wrong" : undefined} data-revealing={selected && run.phase === "revealing"} onClick={() => dispatch({ type: "pick", option: position, count: question.options.length })}>
              <span className={styles.optionLetter} aria-hidden="true">{String.fromCharCode(65 + position)}</span><span className={styles.optionText}>{option}</span>
              {(answerKey || wrong) && <span className={styles.optionMark}>{answerKey ? "Correct" : "Incorrect"}</span>}
            </button>;
          })}
        </div>
      </div>
    </div>
    <footer className={styles.playDock}><div className={styles.dockInner}>
      <div className={styles.segments} aria-label={`${run.results.length} of ${questions.length} answers revealed`}>{questions.map((item, index) => <span key={item.id} data-state={run.results[index] ? run.results[index].correct ? "correct" : "wrong" : index === run.index ? "current" : "pending"} />)}</div>
      <div className={styles.dockRow}>
        <div className={styles.verdict} role="status" aria-live="polite" aria-atomic="true" data-correct={verdict?.correct}>
          {verdict ? <><strong>{verdict.correct ? "Correct. Well played." : "Not this time."}</strong><p>{verdict.correct ? `+${modeRewards[mode]} run XP` : `Correct answer: ${verdict.correctLabel}`}</p></> : <><strong>{run.phase === "revealing" ? "The answer is in..." : "Trust your knowledge."}</strong><p>{run.picked === null ? "Choose an answer, then lock it in." : "Lock in your choice when you're ready."}</p></>}
        </div>
        <button className={styles.primary} disabled={run.picked === null || run.phase === "revealing" || run.phase === "finished"} onClick={() => resolved ? next() : dispatch({ type: "lock" })}>
          <span>{resolved ? isLast ? "See results" : "Next question" : run.phase === "revealing" ? "Revealing..." : "Lock in answer"}</span>
          {resolved && !isLast && !reduced ? <><span aria-hidden="true">{Math.max(1, Math.ceil(remaining / 1000))}s</span><span className={styles.countdown} aria-hidden="true" style={{ transform: `scaleX(${Math.min(1, remaining / advanceMs)})` }} /></> : <ArrowRightIcon size={20} />}
        </button>
      </div>
    </div></footer>
    {confirmExit && <ArenaDialog title="Leave this set?" onClose={() => setConfirmExit(false)}>
      <p className={styles.bodyCopy}>Your unfinished run and its {run.earnedXp} run XP will not be saved. Set {setNumber} will stay unfinished. Any replay fee already paid is not refunded.</p>
      <button className={styles.primary} onClick={() => setConfirmExit(false)}>Keep playing</button><button className={styles.secondary} onClick={() => onExit(run.earnedXp)}>Exit quiz</button>
    </ArenaDialog>}
  </section>;
}

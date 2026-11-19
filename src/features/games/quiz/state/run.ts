import type { AnswerResult, TriviaQuestion } from "../types";

export const revealMs = 350;
export const advanceMs = 3000;
export type RunState = { index: number; picked: number | null; phase: "picking" | "revealing" | "resolved" | "finished"; results: AnswerResult[]; streak: number; bestStreak: number; earnedXp: number };
export const initialRun: RunState = { index: 0, picked: null, phase: "picking", results: [], streak: 0, bestStreak: 0, earnedXp: 0 };
export type RunAction = { type: "pick"; option: number; count: number } | { type: "lock" } | { type: "resolve"; question: TriviaQuestion; reward: number } | { type: "next"; count: number; index: number };

/** Guard transitions here so a timer and a click cannot grade or advance twice. */
export function runReducer(state: RunState, action: RunAction): RunState {
  switch (action.type) {
    case "pick": return state.phase === "picking" && action.option >= 0 && action.option < action.count ? { ...state, picked: action.option } : state;
    case "lock": return state.phase === "picking" && state.picked !== null ? { ...state, phase: "revealing" } : state;
    case "resolve": {
      if (state.phase !== "revealing" || state.picked === null) return state;
      const correct = state.picked === action.question.correctIndex;
      const streak = correct ? state.streak + 1 : 0;
      const earnedXp = correct ? action.reward : 0;
      return { ...state, phase: "resolved", streak, bestStreak: Math.max(streak, state.bestStreak), earnedXp: state.earnedXp + earnedXp,
        results: [...state.results, { prompt: action.question.prompt, pickedLabel: action.question.options[state.picked], correctLabel: action.question.options[action.question.correctIndex], correct, earnedXp }] };
    }
    case "next":
      if (state.phase !== "resolved" || action.index !== state.index) return state;
      return state.index === action.count - 1 ? { ...state, phase: "finished" } : { ...state, index: state.index + 1, picked: null, phase: "picking" };
  }
}

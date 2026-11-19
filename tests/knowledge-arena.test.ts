import test from "node:test";
import assert from "node:assert/strict";
import { continueTarget, canContinue } from "../src/features/games/quiz/state/continue-target";
import { initialRun, runReducer } from "../src/features/games/quiz/state/run";
import { recordRun, entryCostFor, starRewardsFor } from "../src/features/games/quiz/state/ladder";
import { quizModes } from "../src/features/games/quiz/constants";
import type { QuizProgress, TriviaQuestion } from "../src/features/games/quiz/types";
const question: TriviaQuestion = { id: "test", sport: "football", mode: "easy", prompt: "Test", options: ["a", "b"], correctIndex: 1 };
test("continue chooses fresh easy then the furthest unfinished path, with stable ties", () => {
  let progress: QuizProgress = { byMode: {} };
  assert.deepEqual(continueTarget(progress), { mode: "easy", set: 1, started: false });
  for (const mode of ["easy", "hard"] as const) progress = recordRun(progress, mode, 1, 5).progress;
  assert.equal(continueTarget(progress).mode, "easy");
  progress = recordRun(progress, "hard", 2, 8).progress;
  assert.deepEqual(continueTarget(progress), { mode: "hard", set: 3, started: true });
  assert.equal(canContinue(progress, "hard", 3, 2), false);
  assert.equal(canContinue(progress, "hard", 2, 50), false);
  assert.equal(canContinue(progress, "hard", 4, 50), false);
  assert.equal(canContinue(progress, "hard", 3, 50), true);
});
test("complete arena never quick-starts a paid replay", () => {
  let progress: QuizProgress = { byMode: {} };
  for (const mode of quizModes) for (let set = 1; set <= 50; set++) progress = recordRun(progress, mode, set, 10).progress;
  const target = continueTarget(progress);
  assert.equal(canContinue(progress, target.mode, target.set, 50), false);
});
test("answer locking and repeated resolve cannot double award XP", () => {
  assert.equal(runReducer(initialRun, { type: "lock" }), initialRun);
  let run = runReducer(initialRun, { type: "pick", option: 1, count: 2 });
  run = runReducer(run, { type: "lock" });
  assert.equal(runReducer(run, { type: "pick", option: 0, count: 2 }), run);
  run = runReducer(run, { type: "resolve", question, reward: 4 });
  assert.equal(run.earnedXp, 4);
  assert.equal(runReducer(run, { type: "resolve", question, reward: 4 }), run);
  assert.equal(run.bestStreak, 1);
});
test("manual next racing an old timer cannot skip a question or finish twice", () => {
  let run = runReducer(initialRun, { type: "pick", option: 1, count: 2 });
  run = runReducer(run, { type: "lock" });
  run = runReducer(run, { type: "resolve", question, reward: 1 });
  run = runReducer(run, { type: "next", index: 0, count: 2 });
  run = runReducer(run, { type: "pick", option: 0, count: 2 });
  run = runReducer(run, { type: "lock" });
  run = runReducer(run, { type: "resolve", question, reward: 1 });
  assert.equal(runReducer(run, { type: "next", index: 0, count: 2 }), run);
  assert.equal(run.streak, 0);
  run = runReducer(run, { type: "next", index: 1, count: 2 });
  assert.equal(run.phase, "finished");
  assert.equal(runReducer(run, { type: "next", index: 1, count: 2 }), run);
  assert.equal(run.results.length, 2);
});
test("replay preserves the best and cannot re-award stars", () => {
  const first = recordRun({ byMode: {} }, "easy", 1, 8);
  const replay = recordRun(first.progress, "easy", 1, 3);
  assert.equal(replay.progress.byMode.easy?.sets[1].bestCorrect, 8);
  assert.equal(entryCostFor(replay.progress.byMode.easy!.sets[1]), 25);
  assert.deepEqual(starRewardsFor("test", replay.outcome), []);
});

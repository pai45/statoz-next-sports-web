import type { ActionCard, PlayerCard } from "@/domain/cards";

import { pitchDuelScenarios } from "../data/scenarios";
import type {
  PitchDuelAction,
  PitchDuelDeck,
  PitchDuelMove,
  PitchDuelRoundResult,
  PitchDuelScenario,
  PitchDuelState,
} from "../types";

export type RandomSource = () => number;

export function cpuSmartness(level: number): number {
  return Math.min(1, level / 12);
}

export function targetRatingForLevel(level: number): number {
  return Math.min(95, 66 + level * 2);
}

function shuffle<T>(items: T[], random: RandomSource): T[] {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [next[index], next[swap]] = [next[swap], next[index]];
  }
  return next;
}

function variedNearestByRating(
  pool: PlayerCard[],
  target: number,
  count: number,
  random: RandomSource,
): PlayerCard[] {
  const sorted = [...pool].sort(
    (a, b) => Math.abs(a.rating - target) - Math.abs(b.rating - target),
  );
  return shuffle(
    sorted.slice(0, Math.min(pool.length, Math.max(count * 8, 12))),
    random,
  ).slice(0, count);
}

export function generateOpponentDeck(
  level: number,
  attackers: PlayerCard[],
  defenders: PlayerCard[],
  actions: ActionCard[],
  random: RandomSource = Math.random,
): PitchDuelDeck {
  const target = targetRatingForLevel(level);
  const remaining = [...actions];
  const byPower = [...actions].sort((a, b) => b.power - a.power);
  const picks: ActionCard[] = [];

  while (picks.length < 6 && remaining.length > 0) {
    const best = byPower.find((card) => remaining.includes(card));
    const card =
      random() < cpuSmartness(level) && best
        ? best
        : remaining[Math.floor(random() * remaining.length)];
    picks.push(card);
    remaining.splice(remaining.indexOf(card), 1);
  }

  return {
    attackers: variedNearestByRating(attackers, target, 2, random),
    defenders: variedNearestByRating(defenders, target, 2, random),
    actions: picks,
  };
}

export function chooseScenario(
  usedIds: string[],
  random: RandomSource = Math.random,
): PitchDuelScenario {
  const available = pitchDuelScenarios.filter(
    (scenario) => !usedIds.includes(scenario.id),
  );
  const pool = available.length > 0 ? available : pitchDuelScenarios;
  return pool[Math.floor(random() * pool.length)];
}

function choosePlayer(
  available: PlayerCard[],
  level: number,
  random: RandomSource,
): PlayerCard {
  if (available.length === 1 || random() > cpuSmartness(level)) {
    return available[Math.floor(random() * available.length)];
  }
  return [...available].sort((a, b) => b.rating - a.rating)[0];
}

function chooseAction(
  available: ActionCard[],
  level: number,
  random: RandomSource,
): ActionCard {
  if (available.length === 1 || random() > cpuSmartness(level)) {
    return available[Math.floor(random() * available.length)];
  }
  return [...available].sort(
    (a, b) => b.power - (b.risky ? 4 : 0) - (a.power - (a.risky ? 4 : 0)),
  )[0];
}

export function pickOpponentMove(
  state: PitchDuelState,
  random: RandomSource = Math.random,
): PitchDuelMove {
  const players = state.playerAttacking
    ? state.opponentDeck.defenders
    : state.opponentDeck.attackers;
  const category = state.playerAttacking ? "defense" : "attack";
  const relevant = state.opponentDeck.actions.filter(
    (card) => card.category === category || card.category === "special",
  );
  const pool = relevant.length > 0 ? relevant : state.opponentDeck.actions;
  const scenarioFavorsCpu = state.playerAttacking
    ? (state.scenario?.defenseBonus ?? 0) > 8
    : (state.scenario?.attackBonus ?? 0) > 8;
  const action =
    scenarioFavorsCpu && random() < cpuSmartness(state.cpuLevel)
      ? [...pool].sort((a, b) => b.power - a.power)[0]
      : chooseAction(pool, state.cpuLevel, random);

  return {
    player: choosePlayer(players, state.cpuLevel, random),
    action,
  };
}

export function initialPitchDuelState(
  playerDeck: PitchDuelDeck,
  cpuLevel: number,
  opponentName: string,
): PitchDuelState {
  return {
    phase: "matchmaking",
    opponentName,
    cpuLevel,
    playerDeck,
    opponentDeck: { attackers: [], defenders: [], actions: [] },
    round: 1,
    playerScore: 0,
    opponentScore: 0,
    playerAttacking: true,
    initialPlayerAttacking: null,
    tossCall: null,
    tossResult: null,
    playerWonToss: null,
    scenario: null,
    usedScenarioIds: [],
    selectedPlayerId: null,
    selectedActionId: null,
    opponentMove: null,
    usedPlayerIds: [],
    usedActionIds: [],
    rounds: [],
  };
}

export function resolveRound(
  state: PitchDuelState,
  playerSurge: number,
  random: RandomSource = Math.random,
): PitchDuelRoundResult | null {
  const playerCard = [...state.playerDeck.attackers, ...state.playerDeck.defenders].find(
    (card) => card.id === state.selectedPlayerId,
  );
  const playerAction = state.playerDeck.actions.find(
    (card) => card.id === state.selectedActionId,
  );
  const cpu = state.opponentMove;
  const scenario = state.scenario;
  if (!playerCard || !playerAction || !cpu || !scenario) return null;

  const attackerCard = state.playerAttacking ? playerCard : cpu.player;
  const defenderCard = state.playerAttacking ? cpu.player : playerCard;
  const attackAction = state.playerAttacking ? playerAction : cpu.action;
  const defenseAction = state.playerAttacking ? cpu.action : playerAction;
  const cpuSurge = random() * 20;
  const attackPower =
    attackerCard.rating +
    attackAction.power +
    scenario.attackBonus +
    (state.playerAttacking ? playerSurge : cpuSurge);
  const defensePower =
    defenderCard.rating +
    defenseAction.power +
    scenario.defenseBonus +
    (state.playerAttacking ? cpuSurge : playerSurge);
  const outcome =
    attackPower > defensePower
      ? "goal"
      : attackPower < defensePower
        ? "saved"
        : random() >= 0.5
          ? "goal"
          : "blocked";

  return {
    round: state.round,
    scenario,
    playerAttacking: state.playerAttacking,
    attackerCard,
    defenderCard,
    attackAction,
    defenseAction,
    outcome,
    attackPower,
    defensePower,
  };
}

export function pitchDuelReducer(
  state: PitchDuelState,
  action: PitchDuelAction,
): PitchDuelState {
  switch (action.type) {
    case "matchStarted":
      return {
        ...state,
        phase: "toss",
        opponentName: action.opponentName,
        opponentDeck: action.opponentDeck,
      };
    case "tossResolved": {
      const won = action.call === action.result;
      const playerAttacking = won ? state.playerAttacking : !action.cpuAttacking;
      return {
        ...state,
        phase: "tossResult",
        tossCall: action.call,
        tossResult: action.result,
        playerWonToss: won,
        playerAttacking,
        initialPlayerAttacking: won ? null : playerAttacking,
      };
    }
    case "roleChosen":
      return {
        ...state,
        phase: "roleReveal",
        playerAttacking: action.playerAttacking,
        initialPlayerAttacking: action.playerAttacking,
      };
    case "tossContinued":
      return { ...state, phase: "roleReveal" };
    case "roleRevealed":
      return {
        ...state,
        phase: "scenario",
        scenario: action.scenario,
        usedScenarioIds: [...state.usedScenarioIds, action.scenario.id],
      };
    case "playStarted":
      return { ...state, phase: "play", opponentMove: action.opponentMove };
    case "playerSelected":
      return { ...state, selectedPlayerId: action.cardId };
    case "actionSelected":
      return { ...state, selectedActionId: action.cardId };
    case "roundResolved": {
      const playerGoal = action.result.outcome === "goal" && state.playerAttacking;
      const opponentGoal = action.result.outcome === "goal" && !state.playerAttacking;
      return {
        ...state,
        phase: "roundResult",
        playerScore: state.playerScore + (playerGoal ? 1 : 0),
        opponentScore: state.opponentScore + (opponentGoal ? 1 : 0),
        usedPlayerIds: [...state.usedPlayerIds, state.selectedPlayerId!],
        usedActionIds: [...state.usedActionIds, state.selectedActionId!],
        rounds: [...state.rounds, action.result],
      };
    }
    case "roundAdvanced": {
      if (state.round >= 4) return { ...state, phase: "finalResult" };
      const round = state.round + 1;
      const initial = state.initialPlayerAttacking ?? state.playerAttacking;
      return {
        ...state,
        phase: "roleReveal",
        round,
        playerAttacking: round % 2 === 1 ? initial : !initial,
        scenario: null,
        selectedPlayerId: null,
        selectedActionId: null,
        opponentMove: null,
      };
    }
    case "matchFinished":
      return { ...state, phase: "finalResult" };
  }
}

export function playerSuccessChance(state: PitchDuelState): number | null {
  const player = [...state.playerDeck.attackers, ...state.playerDeck.defenders].find(
    (card) => card.id === state.selectedPlayerId,
  );
  const action = state.playerDeck.actions.find(
    (card) => card.id === state.selectedActionId,
  );
  if (!player || !action || !state.scenario) return null;
  const playerBonus = state.playerAttacking
    ? state.scenario.attackBonus
    : state.scenario.defenseBonus;
  const cpuPlayers = state.playerAttacking
    ? state.opponentDeck.defenders
    : state.opponentDeck.attackers;
  const category = state.playerAttacking ? "defense" : "attack";
  const cpuActions = state.opponentDeck.actions.filter(
    (card) => card.category === category || card.category === "special",
  );
  const avgPlayer =
    cpuPlayers.reduce((sum, card) => sum + card.rating, 0) / cpuPlayers.length;
  const avgAction =
    cpuActions.reduce((sum, card) => sum + card.power, 0) / cpuActions.length;
  const cpuBonus = state.playerAttacking
    ? state.scenario.defenseBonus
    : state.scenario.attackBonus;
  const diff = player.rating + action.power + playerBonus - (avgPlayer + avgAction + cpuBonus);
  return diff > 0 ? 1 : diff < 0 ? 0 : 0.5;
}

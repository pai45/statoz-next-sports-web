import type { ActionCard, PlayerCard } from "@/domain/cards";

export type PitchDuelPhase =
  | "matchmaking"
  | "toss"
  | "tossResult"
  | "roleReveal"
  | "scenario"
  | "play"
  | "roundResult"
  | "finalResult";

export type TossFace = "heads" | "tails";
export type PitchDuelOutcome = "goal" | "saved" | "blocked";

export type PitchDuelScenario = {
  id: string;
  title: string;
  description: string;
  attackBonus: number;
  defenseBonus: number;
  icon: string;
};

export type PitchDuelMove = {
  player: PlayerCard;
  action: ActionCard;
};

export type PitchDuelRoundResult = {
  round: number;
  scenario: PitchDuelScenario;
  playerAttacking: boolean;
  attackerCard: PlayerCard;
  defenderCard: PlayerCard;
  attackAction: ActionCard;
  defenseAction: ActionCard;
  outcome: PitchDuelOutcome;
  attackPower: number;
  defensePower: number;
};

export type PitchDuelDeck = {
  attackers: PlayerCard[];
  defenders: PlayerCard[];
  actions: ActionCard[];
};

export type PitchDuelState = {
  phase: PitchDuelPhase;
  opponentName: string;
  cpuLevel: number;
  playerDeck: PitchDuelDeck;
  opponentDeck: PitchDuelDeck;
  round: number;
  playerScore: number;
  opponentScore: number;
  playerAttacking: boolean;
  initialPlayerAttacking: boolean | null;
  tossCall: TossFace | null;
  tossResult: TossFace | null;
  playerWonToss: boolean | null;
  scenario: PitchDuelScenario | null;
  usedScenarioIds: string[];
  selectedPlayerId: string | null;
  selectedActionId: string | null;
  opponentMove: PitchDuelMove | null;
  usedPlayerIds: string[];
  usedActionIds: string[];
  rounds: PitchDuelRoundResult[];
};

export type PitchDuelAction =
  | {
      type: "matchStarted";
      opponentName: string;
      opponentDeck: PitchDuelDeck;
    }
  | {
      type: "tossResolved";
      call: TossFace;
      result: TossFace;
      cpuAttacking: boolean;
    }
  | { type: "roleChosen"; playerAttacking: boolean }
  | { type: "tossContinued" }
  | { type: "roleRevealed"; scenario: PitchDuelScenario }
  | { type: "playStarted"; opponentMove: PitchDuelMove }
  | { type: "playerSelected"; cardId: string }
  | { type: "actionSelected"; cardId: string }
  | { type: "roundResolved"; result: PitchDuelRoundResult }
  | { type: "roundAdvanced" }
  | { type: "matchFinished" };

export type PitchDuelHistoryEntry = {
  id: string;
  playedAt: string;
  opponentName: string;
  playerScore: number;
  opponentScore: number;
  result: "Victory" | "Draw" | "Defeat";
  xpEarned: number;
  rounds: Array<{
    round: number;
    scenarioTitle: string;
    outcome: PitchDuelOutcome;
    playerAttacking: boolean;
  }>;
};

export type PitchDuelProgress = {
  version: 1;
  xp: number;
  wins: number;
  played: number;
  currentStreak: number;
  bestStreak: number;
  tutorialSeen: string[];
  history: PitchDuelHistoryEntry[];
};

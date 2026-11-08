"use client";

import type { CSSProperties } from "react";
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";

import {
  ActionCard,
  Button,
  Glyph,
  PlayerCard,
  Progress,
  glyphRegistry,
  type GlyphName,
} from "@statoz/design-system/web";
import { playerRoleLabels, type ActionCard as ActionCardData, type PlayerCard as PlayerCardData } from "@/domain/cards";
import { levelFromXp, levelProgress } from "@/domain/progression";
import { activeLoadout, useDecks, type FootballLoadout } from "@/features/cards-decks";
import { settleCoinReward } from "@/features/economy";
import { avatarOptionById } from "@/features/onboarding";
import {
  actionCardForId,
  allActionCards,
  footballAttackers,
  footballDefenders,
  playerCardForId,
  portraitForCard,
} from "@/features/packs";
import { playerDisplayName, useProfileIdentity } from "@/features/profile";

import type { GameEntry } from "@/mocks/games";
import { opponentNames } from "../../shared/data/opponent-names";
import { usePrefersReducedMotion } from "../../shared/state/use-reduced-motion";
import type { GameId } from "../../types";
import {
  chooseScenario,
  generateOpponentDeck,
  initialPitchDuelState,
  pickOpponentMove,
  pitchDuelReducer,
  playerSuccessChance,
  resolveRound,
} from "../engine/pitch-duel-engine";
import {
  markPitchDuelTutorialSeen,
  recordPitchDuel,
  resetPitchDuelTutorials,
  usePitchDuelProgress,
} from "../state/pitch-duel-progress";
import type {
  PitchDuelDeck,
  PitchDuelRoundResult,
  PitchDuelState,
  TossFace,
} from "../types";

import styles from "./pitch-duel.module.css";
import { PitchDuelHowTo } from "./pitch-duel-how-to";
import { PitchDuelLobby } from "./pitch-duel-lobby";
import {
  GameMatchGate,
  matchmakingFighter,
} from "../../shared/components/matchmaking";
import { useGameReturn } from "../../shared/hooks/use-game-return";

export type PitchDuelProps = { game: GameId; entry: GameEntry };

type PitchDuelView = "lobby" | "howToPlay" | "matchmaking" | "match";

type MatchAward = {
  result: "Victory" | "Draw" | "Defeat";
  xp: number;
  totalXp: number;
  coins: number;
};

const attackAccent = "var(--ds-color-accent-cyan)";
const defenseAccent = "var(--ds-color-accent-violet)";

function glyph(name: string): GlyphName {
  return name in glyphRegistry ? (name as GlyphName) : "sports_soccer";
}

function deckFromLoadout(loadout: FootballLoadout | undefined): PitchDuelDeck | null {
  if (!loadout) return null;
  const attackers = loadout.attackers
    .map(playerCardForId)
    .filter((card): card is PlayerCardData => card !== undefined);
  const defenders = loadout.defenders
    .map(playerCardForId)
    .filter((card): card is PlayerCardData => card !== undefined);
  const actions = loadout.actionCardIds
    .map(actionCardForId)
    .filter((card): card is ActionCardData => card !== undefined);
  return attackers.length === 2 && defenders.length === 2 && actions.length === 6
    ? { attackers, defenders, actions }
    : null;
}

function playerAccent(card: PlayerCardData): string {
  return card.role === "attacker" ? attackAccent : defenseAccent;
}

function coinsFor(result: MatchAward["result"]): number {
  return result === "Victory" ? 50 : result === "Draw" ? 25 : 10;
}

export function PitchDuel({ game: _game }: PitchDuelProps) {
  void _game;
  const goBack = useGameReturn();
  const params = useSearchParams();
  const decks = useDecks();
  const identity = useProfileIdentity();
  const progress = usePitchDuelProgress();
  const footballLoadout = activeLoadout(decks, "football");
  const playerDeck = useMemo(
    () => deckFromLoadout(footballLoadout),
    [footballLoadout],
  );

  /**
   * A challenge from the friends arena or a rival's dossier: the opponent is
   * that rival, at their level, and the match starts at matchmaking rather than
   * the lobby — the player already chose who they are playing.
   */
  const challengedName = params.get("vs");
  const challengedLevel = Number.parseInt(params.get("level") ?? "", 10);

  const [session, setSession] = useState<{ id: number; initialView: PitchDuelView }>(() => ({
    id: 0,
    initialView: challengedName ? "matchmaking" : "lobby",
  }));

  if (!playerDeck) return null;

  return (
    <PitchDuelSession
      key={session.id}
      initialView={session.initialView}
      playerDeck={playerDeck}
      playerName={identity.displayName || playerDisplayName}
      playerAvatar={avatarOptionById(identity.avatarId).src}
      opponentSeed={progress.played + session.id}
      opponentName={challengedName ?? undefined}
      cpuLevel={
        Number.isFinite(challengedLevel) && challengedLevel > 0
          ? challengedLevel
          : levelFromXp(progress.xp)
      }
      onReplay={() => setSession((value) => ({ id: value.id + 1, initialView: "matchmaking" }))}
      onHome={() => setSession((value) => ({ id: value.id + 1, initialView: "lobby" }))}
      onExit={goBack}
    />
  );
}

function PitchDuelSession({
  initialView,
  playerDeck,
  playerName,
  playerAvatar,
  opponentSeed,
  opponentName: challengedName,
  cpuLevel,
  onReplay,
  onHome,
  onExit,
}: {
  initialView: PitchDuelView;
  playerDeck: PitchDuelDeck;
  playerName: string;
  playerAvatar: string;
  opponentSeed: number;
  /** A challenged rival. Absent, the pool picks the night's opponent. */
  opponentName?: string;
  cpuLevel: number;
  onReplay: () => void;
  onHome: () => void;
  onExit: () => void;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const progress = usePitchDuelProgress();
  const opponentName = challengedName ?? opponentNames[opponentSeed % opponentNames.length];
  const [state, dispatch] = useReducer(
    pitchDuelReducer,
    initialPitchDuelState(playerDeck, cpuLevel, opponentName),
  );
  const [view, setView] = useState<PitchDuelView>(initialView);
  const [meterOpen, setMeterOpen] = useState(false);
  const [quitOpen, setQuitOpen] = useState(false);
  const [award, setAward] = useState<MatchAward | null>(null);
  const matchId = useRef<string | null>(null);

  const tutorialKey =
    state.phase === "toss"
      ? "toss"
      : state.phase === "scenario"
        ? "scenario"
        : state.phase === "play"
          ? "play"
          : state.phase === "roundResult"
            ? "round-result"
            : state.phase === "finalResult"
              ? "final"
              : null;
  const tutorialOpen = tutorialKey !== null && !progress.tutorialSeen.includes(tutorialKey);

  useEffect(() => {
    if (state.phase !== "roleReveal") return;
    const delay = reducedMotion ? 120 : 1350;
    const timer = window.setTimeout(() => {
      dispatch({
        type: "roleRevealed",
        scenario: chooseScenario(state.usedScenarioIds),
      });
    }, delay);
    return () => window.clearTimeout(timer);
  }, [reducedMotion, state.phase, state.usedScenarioIds]);

  useEffect(() => {
    if (state.phase !== "scenario" || tutorialOpen || !state.scenario) return;
    const delay = reducedMotion ? 180 : 2600;
    const timer = window.setTimeout(() => {
      dispatch({ type: "playStarted", opponentMove: pickOpponentMove(state) });
    }, delay);
    return () => window.clearTimeout(timer);
  }, [reducedMotion, state, tutorialOpen]);

  useEffect(() => {
    if (
      state.phase !== "tossResult" ||
      state.playerWonToss !== false ||
      tutorialOpen
    ) return;
    const delay = reducedMotion ? 180 : 2200;
    const timer = window.setTimeout(() => dispatch({ type: "tossContinued" }), delay);
    return () => window.clearTimeout(timer);
  }, [reducedMotion, state.phase, state.playerWonToss, tutorialOpen]);

  const startMatch = useCallback(() => {
    matchId.current = `pitch-duel-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
    dispatch({
      type: "matchStarted",
      opponentName: state.opponentName,
      opponentDeck: generateOpponentDeck(
        cpuLevel,
        footballAttackers,
        footballDefenders,
        allActionCards,
      ),
    });
    setView("match");
  }, [cpuLevel, state.opponentName]);

  const callToss = useCallback((call: TossFace) => {
    dispatch({
      type: "tossResolved",
      call,
      result: Math.random() < 0.5 ? "heads" : "tails",
      cpuAttacking: Math.random() < 0.5,
    });
  }, []);

  const commitRound = useCallback(
    (surge: number) => {
      setMeterOpen(false);
      const result = resolveRound(state, surge);
      if (result) dispatch({ type: "roundResolved", result });
    },
    [state],
  );

  const finishMatch = useCallback(() => {
    const id = matchId.current;
    if (!id || award) {
      dispatch({ type: "matchFinished" });
      return;
    }
    const settled = recordPitchDuel({
      id,
      opponentName: state.opponentName,
      playerScore: state.playerScore,
      opponentScore: state.opponentScore,
      rounds: state.rounds,
    });
    const coins = coinsFor(settled.result);
    settleCoinReward({
      id,
      coins,
      title: "PITCH DUEL",
      subtitle: `${settled.result.toUpperCase()} · ${state.playerScore}-${state.opponentScore}`,
    });
    setAward({ result: settled.result, xp: settled.gained, totalXp: settled.total, coins });
    dispatch({ type: "matchFinished" });
  }, [award, state.opponentName, state.opponentScore, state.playerScore, state.rounds]);

  const advanceRound = useCallback(() => {
    if (state.round >= 4) finishMatch();
    else dispatch({ type: "roundAdvanced" });
  }, [finishMatch, state.round]);

  if (view === "lobby") {
    return (
      <PitchDuelLobby
        progress={progress}
        onPlay={() => setView("matchmaking")}
        onHowToPlay={() => setView("howToPlay")}
        onReplayTutorial={resetPitchDuelTutorials}
        onExit={onExit}
      />
    );
  }

  if (view === "howToPlay") {
    return <PitchDuelHowTo onBack={() => setView("lobby")} />;
  }

  if (view === "matchmaking") {
    return (
      <GameMatchGate
        goLabel="KICK OFF!"
        config={{
          title: "PITCH DUEL",
          queueLabel: "SCANNING GLOBAL PITCH QUEUE",
          player: {
            name: playerName,
            avatar: playerAvatar,
            badge: `LV ${cpuLevel}`,
          },
          opponent: matchmakingFighter(state.opponentName, `LV ${cpuLevel}`),
        }}
        onReady={startMatch}
        onCancel={() => setView("lobby")}
      />
    );
  }

  return (
    <>
      <main className={styles.gameShell}>
      <div className={styles.stadium} aria-hidden />
      <div className={styles.vignette} aria-hidden />

      {state.phase !== "finalResult" ? (
        <MatchHeader state={state} onQuit={() => setQuitOpen(true)} />
      ) : null}

      <div className={styles.stage}>
        {state.phase === "toss" ? <Toss onCall={callToss} /> : null}
        {state.phase === "tossResult" ? (
          <TossResult state={state} onRole={(playerAttacking) => dispatch({ type: "roleChosen", playerAttacking })} />
        ) : null}
        {state.phase === "roleReveal" ? <RoleReveal attacking={state.playerAttacking} /> : null}
        {state.phase === "scenario" && state.scenario ? (
          <ScenarioBriefing state={state} />
        ) : null}
        {state.phase === "play" ? (
          <DuelBoard
            state={state}
            onPlayer={(cardId) => dispatch({ type: "playerSelected", cardId })}
            onAction={(cardId) => dispatch({ type: "actionSelected", cardId })}
            onCommit={() => {
              if (!progress.tutorialSeen.includes("shot-meter")) {
                markPitchDuelTutorialSeen("shot-meter");
              }
              if (reducedMotion) commitRound(Math.random() * 20);
              else setMeterOpen(true);
            }}
          />
        ) : null}
        {state.phase === "roundResult" ? (
          <RoundResultView
            result={state.rounds[state.rounds.length - 1]}
            state={state}
            paused={tutorialOpen}
            reducedMotion={reducedMotion}
            onContinue={advanceRound}
          />
        ) : null}
        {state.phase === "finalResult" ? (
          <FinalResultView playerName={playerName} state={state} award={award} onReplay={onReplay} onExit={onHome} />
        ) : null}
      </div>

      {meterOpen ? <ShotMeter onStrike={commitRound} onCancel={() => setMeterOpen(false)} /> : null}
      {tutorialOpen && tutorialKey ? (
        <TutorialOverlay tutorialKey={tutorialKey} onDismiss={() => markPitchDuelTutorialSeen(tutorialKey)} />
      ) : null}
        {quitOpen ? <QuitDialog onStay={() => setQuitOpen(false)} onQuit={onHome} /> : null}
      </main>
    </>
  );
}

function MatchHeader({ state, onQuit }: { state: PitchDuelState; onQuit: () => void }) {
  return (
    <header className={styles.matchHeader}>
      <button type="button" className={styles.closeButton} onClick={onQuit} aria-label="Quit match">
        <span aria-hidden>×</span>
      </button>
      <div className={styles.roundRail} aria-label={`Round ${state.round} of 4`}>
        <span>ROUND {state.round}/4</span>
        <div>{[1, 2, 3, 4].map((round) => <i key={round} data-active={round <= state.round} />)}</div>
      </div>
      <div className={styles.scoreCompact} aria-label={`Score ${state.playerScore} to ${state.opponentScore}`}>
        <b>{state.playerScore}</b><span>—</span><b>{state.opponentScore}</b>
      </div>
    </header>
  );
}

function Toss({ onCall }: { onCall: (call: TossFace) => void }) {
  return (
    <section className={styles.centerScene} aria-labelledby="toss-title">
      <p className={styles.eyebrow}>PRE-MATCH DECIDER</p>
      <h1 id="toss-title">CALL THE TOSS</h1>
      <p className={styles.lede}>Win it and choose your opening role.</p>
      <div className={styles.coin} aria-hidden><span>OZ</span></div>
      <div className={styles.choiceGrid}>
        <Button size="lg" variant="tonal" accent={attackAccent} onClick={() => onCall("heads")}>HEADS</Button>
        <Button size="lg" variant="tonal" accent={defenseAccent} onClick={() => onCall("tails")}>TAILS</Button>
      </div>
    </section>
  );
}

function TossResult({ state, onRole }: { state: PitchDuelState; onRole: (attack: boolean) => void }) {
  const won = state.playerWonToss === true;
  return (
    <section className={styles.centerScene} aria-live="polite">
      <div className={`${styles.coin} ${styles.coinResult}`}><span>{state.tossResult?.toUpperCase()}</span></div>
      <p className={styles.eyebrow}>{won ? "TOSS WON" : "TOSS LOST"}</p>
      <h1>{won ? "YOU DECIDE" : "RIVAL DECIDES"}</h1>
      {won ? (
        <>
          <p className={styles.lede}>Set the tone for round one.</p>
          <div className={styles.choiceGrid}>
            <Button size="lg" glow accent={attackAccent} onClick={() => onRole(true)}>ATTACK FIRST</Button>
            <Button size="lg" variant="tonal" accent={defenseAccent} onClick={() => onRole(false)}>DEFEND FIRST</Button>
          </div>
        </>
      ) : <p className={styles.lede}>They chose to {state.playerAttacking ? "defend" : "attack"}. Stand by.</p>}
    </section>
  );
}

function RoleReveal({ attacking }: { attacking: boolean }) {
  const accent = attacking ? attackAccent : defenseAccent;
  return (
    <section className={`${styles.centerScene} ${styles.roleReveal}`} style={{ "--role-accent": accent } as CSSProperties} aria-live="polite">
      <div className={styles.roleGlyph}><Glyph name={attacking ? "flash_on" : "shield"} size={58} /></div>
      <p className={styles.eyebrow}>ROUND ASSIGNMENT</p>
      <h1>{attacking ? "YOU ATTACK" : "YOU DEFEND"}</h1>
      <p className={styles.lede}>{attacking ? "Break the line and finish the chance." : "Read the danger and shut it down."}</p>
    </section>
  );
}

function ScenarioBriefing({ state }: { state: PitchDuelState }) {
  const scenario = state.scenario!;
  return (
    <section className={styles.centerScene} aria-labelledby="scenario-title">
      <p className={styles.eyebrow}>ROUND {state.round} SCENARIO</p>
      <div className={styles.scenarioIcon}><Glyph name={glyph(scenario.icon)} size={42} /></div>
      <h1 id="scenario-title">{scenario.title}</h1>
      <p className={styles.lede}>{scenario.description}</p>
      <div className={styles.bonusGrid}>
        <div><span>ATTACK</span><b>+{scenario.attackBonus}</b></div>
        <div><span>DEFENSE</span><b>+{scenario.defenseBonus}</b></div>
      </div>
      <div className={styles.loadingRail}><i /></div>
    </section>
  );
}

function DuelBoard({ state, onPlayer, onAction, onCommit }: {
  state: PitchDuelState; onPlayer: (id: string) => void; onAction: (id: string) => void; onCommit: () => void;
}) {
  const rolePlayers = state.playerAttacking ? state.playerDeck.attackers : state.playerDeck.defenders;
  const relevantActions = state.playerDeck.actions.filter((card) =>
    card.category === (state.playerAttacking ? "attack" : "defense") || card.category === "special",
  );
  const chance = playerSuccessChance(state);
  const accent = state.playerAttacking ? attackAccent : defenseAccent;
  const allPlayers = [...state.playerDeck.attackers, ...state.playerDeck.defenders];
  const selectedPlayer = allPlayers.find((card) => card.id === state.selectedPlayerId);
  const selectedAction = state.playerDeck.actions.find((card) => card.id === state.selectedActionId);
  return (
    <section className={styles.board} style={{ "--role-accent": accent } as CSSProperties} aria-label={`Round ${state.round} card selection`}>
      <div className={styles.rivalZone}>
        <div className={styles.rivalName}><span>{state.opponentName}</span><b>THINKING...</b></div>
        <div className={styles.cardBacks}>{[0, 1, 2, 3].map((card) => <i key={card}><Glyph name="sports_soccer" size={17} /></i>)}</div>
      </div>
      <div className={styles.pitch}>
        <div className={styles.pitchMarkings} aria-hidden><i /><i /><i /></div>
        <div className={styles.scenarioChip}><Glyph name={glyph(state.scenario?.icon ?? "sports_soccer")} size={15} /><span>{state.scenario?.title}</span></div>
        <div className={styles.duelArena} aria-label="Locked move preview">
          <div className={styles.arenaSlot} data-rival="true"><Glyph name="lock" size={18} /><span>RIVAL MOVE</span><b>LOCKED</b></div>
          <div className={styles.arenaVs}>VS</div>
          <div className={styles.arenaSlot} data-ready={Boolean(selectedPlayer && selectedAction)}>
            <Glyph name={selectedPlayer ? glyph(selectedPlayer.icon) : "person_search"} size={20} />
            <span>{selectedPlayer?.shortName ?? "PICK PLAYER"}</span>
            <b>{selectedAction?.title ?? "PICK ACTION"}</b>
          </div>
        </div>
        <div className={styles.matchupLine}>
          <span>{state.playerAttacking ? "YOUR ATTACK" : "YOUR DEFENSE"}</span>
          <b>{chance === null ? "SELECT CARDS" : chance === 1 ? "EDGE: YOU" : chance === 0 ? "EDGE: RIVAL" : "EVEN MATCH"}</b>
        </div>
      </div>
      <div className={styles.handPanel}>
        <HandLabel step="01" title={`CHOOSE ${state.playerAttacking ? "ATTACKER" : "DEFENDER"}`} selected={state.selectedPlayerId !== null} />
        <div className={styles.playerHand}>
          {allPlayers.map((card) => {
            const eligible = rolePlayers.some((candidate) => candidate.id === card.id);
            const used = state.usedPlayerIds.includes(card.id);
            return <PlayerChoice key={card.id} card={card} selected={state.selectedPlayerId === card.id} disabled={!eligible || used} used={used} onClick={() => onPlayer(card.id)} />;
          })}
        </div>
        <HandLabel step="02" title="CHOOSE ACTION" selected={state.selectedActionId !== null} />
        <div className={styles.actionHand}>
          {state.playerDeck.actions.map((card) => {
            const eligible = relevantActions.some((candidate) => candidate.id === card.id);
            const used = state.usedActionIds.includes(card.id);
            return <ActionChoice key={card.id} card={card} selected={state.selectedActionId === card.id} disabled={!eligible || used} used={used} onClick={() => onAction(card.id)} />;
          })}
        </div>
        {!state.selectedPlayerId || !state.selectedActionId ? (
          <div className={styles.moveGuidance}>
            <span data-done={Boolean(state.selectedPlayerId)}>01 PLAYER</span><i /><span data-done={Boolean(state.selectedActionId)}>02 ACTION</span>
          </div>
        ) : null}
        <Button fullWidth size="lg" glow accent={accent} disabled={!state.selectedPlayerId || !state.selectedActionId} onClick={onCommit} trailingIcon={<Glyph name="flash_on" size={18} />} className={styles.commitButton}>
          {state.playerAttacking ? "COMMIT ATTACK" : "COMMIT DEFENSE"}
        </Button>
        <p className={styles.commitHelper}>{chance === null ? "SELECT A PLAYER AND ACTION" : `${chance === 1 ? 68 : chance === 0 ? 32 : 50}% ${state.playerAttacking ? "GOAL" : "STOP"} CHANCE · TIME YOUR ${state.playerAttacking ? "STRIKE" : "BLOCK"}`}</p>
      </div>
    </section>
  );
}

function HandLabel({ step, title, selected }: { step: string; title: string; selected: boolean }) {
  return <div className={styles.handLabel}><span>{step}</span><strong>{title}</strong>{selected ? <Glyph name="check" size={15} /> : null}</div>;
}

function PlayerChoice({ card, selected, disabled, used, onClick }: { card: PlayerCardData; selected: boolean; disabled: boolean; used: boolean; onClick: () => void }) {
  return (
    <div className={styles.playerChoice} data-used={used} data-disabled={disabled && !used}>
      <PlayerCard name={card.shortName} roleLabel={playerRoleLabels[card.role]} position={card.position} countryCode={card.countryCode} rating={card.rating} trait={card.trait} tier={card.tier} icon={glyph(card.icon)} portraitSrc={portraitForCard(card)} roleAccent={playerAccent(card)} size="sm" selected={selected} disabled={disabled} onClick={onClick} />
      {used ? <span className={styles.locked}><Glyph name="block" size={12} /> USED</span> : null}
    </div>
  );
}

function ActionChoice({ card, selected, disabled, used, onClick }: { card: ActionCardData; selected: boolean; disabled: boolean; used: boolean; onClick: () => void }) {
  return (
    <div className={styles.actionChoice} data-used={used} data-disabled={disabled && !used}>
      <ActionCard title={card.title} category={card.category} tier={card.tier} effect={card.effect} power={card.power} risky={card.risky} icon={glyph(card.icon)} size="sm" selected={selected} disabled={disabled} onClick={onClick} />
      {used ? <span className={styles.locked}>USED</span> : null}
    </div>
  );
}

function ShotMeter({ onStrike, onCancel }: { onStrike: (surge: number) => void; onCancel: () => void }) {
  const [position, setPosition] = useState(0);
  const [locked, setLocked] = useState(false);
  const frame = useRef<number | null>(null);
  const started = useRef<number | null>(null);

  useEffect(() => {
    const tick = (now: number) => {
      if (started.current === null) started.current = now;
      const cycle = ((now - started.current) % 1200) / 1200;
      setPosition(cycle < 0.5 ? cycle * 2 : (1 - cycle) * 2);
      frame.current = window.requestAnimationFrame(tick);
    };
    frame.current = window.requestAnimationFrame(tick);
    return () => { if (frame.current !== null) window.cancelAnimationFrame(frame.current); };
  }, []);

  const strike = () => {
    if (locked) return;
    setLocked(true);
    if (frame.current !== null) window.cancelAnimationFrame(frame.current);
    const centerAccuracy = 1 - Math.min(1, Math.abs(position - 0.5) / 0.5);
    window.setTimeout(() => onStrike(Math.round(centerAccuracy * 20)), 520);
  };

  const quality = Math.abs(position - 0.5) < 0.1 ? "PERFECT" : Math.abs(position - 0.5) < 0.24 ? "GOOD" : "RISKY";
  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="meter-title">
      <button type="button" className={styles.overlayDismiss} onClick={onCancel} aria-label="Cancel shot meter">×</button>
      <div className={styles.meterPanel}>
        <p className={styles.eyebrow}>POWER SURGE · +0—20</p>
        <h2 id="meter-title">TIME YOUR MOVE</h2>
        <p>Strike inside the center zone for the strongest boost.</p>
        <button type="button" className={styles.meter} onClick={strike} disabled={locked} aria-label="Strike shot meter">
          <span className={styles.meterZones}><i /><i /><i /></span>
          <b style={{ left: `${position * 100}%` }} />
        </button>
        <strong className={styles.meterQuality}>{locked ? quality : "TAP TO STRIKE"}</strong>
        <Button size="lg" fullWidth glow onClick={strike} disabled={locked}>STRIKE</Button>
        <small>Space or Enter also activates the focused meter.</small>
      </div>
    </div>
  );
}

function RoundResultView({ result, state, paused, reducedMotion, onContinue }: { result: PitchDuelRoundResult; state: PitchDuelState; paused: boolean; reducedMotion: boolean; onContinue: () => void }) {
  const playerSucceeded = result.outcome === "goal" ? result.playerAttacking : !result.playerAttacking;
  const headline = result.outcome === "goal" ? "GOAL" : "DENIED";
  const accent = result.outcome === "goal" ? "var(--ds-color-success)" : defenseAccent;
  return (
    <section className={`${styles.resultScene} ${result.outcome === "goal" ? styles.goalScene : styles.deniedScene}`} style={{ "--outcome-accent": accent } as CSSProperties} aria-live="assertive">
      <div className={styles.cinematicLines} aria-hidden />
      <p className={styles.eyebrow}>ROUND {result.round} RESOLVED</p>
      <h1>{headline}</h1>
      <p className={styles.outcomeCopy}>{playerSucceeded ? "You won the matchup." : `${state.opponentName} won the matchup.`}</p>
      <div className={styles.powerDuel}>
        <PowerSide label={result.playerAttacking ? "YOUR ATTACK" : "YOUR DEFENSE"} value={result.playerAttacking ? result.attackPower : result.defensePower} card={result.playerAttacking ? result.attackerCard : result.defenderCard} action={result.playerAttacking ? result.attackAction : result.defenseAction} />
        <div className={styles.powerVs}>VS</div>
        <PowerSide label="RIVAL" value={result.playerAttacking ? result.defensePower : result.attackPower} card={result.playerAttacking ? result.defenderCard : result.attackerCard} action={result.playerAttacking ? result.defenseAction : result.attackAction} />
      </div>
      <div className={styles.scoreHero}><b>{state.playerScore}</b><span>—</span><b>{state.opponentScore}</b></div>
      {!paused ? <AutoContinue key={result.round} reducedMotion={reducedMotion} label={state.round >= 4 ? "FULL-TIME RESULT" : "NEXT ROUND"} onContinue={onContinue} /> : null}
    </section>
  );
}

function PowerSide({ label, value, card, action }: { label: string; value: number; card: PlayerCardData; action: ActionCardData }) {
  return <div className={styles.powerSide}><span>{label}</span><strong>{Math.round(value)}</strong><small>{card.shortName} + {action.title}</small></div>;
}

function AutoContinue({ reducedMotion, label, onContinue }: { reducedMotion: boolean; label: string; onContinue: () => void }) {
  const [seconds, setSeconds] = useState(reducedMotion ? 1 : 3);
  useEffect(() => {
    const interval = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    const timer = window.setTimeout(onContinue, reducedMotion ? 750 : 3000);
    return () => { window.clearInterval(interval); window.clearTimeout(timer); };
  }, [onContinue, reducedMotion]);
  return <Button size="lg" glow onClick={onContinue}>{label} · {seconds}</Button>;
}

function FinalResultView({ playerName, state, award, onReplay, onExit }: { playerName: string; state: PitchDuelState; award: MatchAward | null; onReplay: () => void; onExit: () => void }) {
  const result = award?.result ?? (state.playerScore > state.opponentScore ? "Victory" : state.playerScore < state.opponentScore ? "Defeat" : "Draw");
  const accent = result === "Victory" ? "var(--ds-color-success)" : result === "Draw" ? "var(--ds-color-accent-gold)" : "var(--ds-color-danger)";
  const playerDisplayName = playerName;
  const band = levelProgress(award?.totalXp ?? 0);
  const mvp = state.rounds.find((round) => round.outcome === "goal" && round.playerAttacking)?.attackerCard;
  return (
    <section className={styles.finalScene} style={{ "--result-accent": accent } as CSSProperties} aria-labelledby="final-title">
      <div className={styles.finalBadge}><Glyph name={result === "Victory" ? "emoji_events" : result === "Draw" ? "sync_alt" : "shield"} size={42} /></div>
      <p className={styles.eyebrow}>FULL TIME</p>
      <h1 id="final-title">{result.toUpperCase()}</h1>
      <div className={styles.finalScore}><span>{playerDisplayName}</span><b>{state.playerScore} — {state.opponentScore}</b><span>{state.opponentName}</span></div>
      <div className={styles.xpPanel}>
        <div><span>MATCH XP</span><b>{award && award.xp > 0 ? "+" : ""}{award?.xp ?? 0}</b></div>
        <div><span>LEVEL {band.level}</span><b>{band.intoLevel} / {band.levelSpan}</b></div>
        <Progress value={band.fraction} accent={accent} label={`Level ${band.level} progress`} height={5} />
      </div>
      <div className={styles.rewardGrid}>
        <div><Glyph name="trending_up" size={20} /><span>XP</span><b>{award && award.xp > 0 ? "+" : ""}{award?.xp ?? 0}</b></div>
        <div><Glyph name="paid" size={20} /><span>COINS</span><b>+{award?.coins ?? coinsFor(result)}</b></div>
        <div><Glyph name="workspace_premium" size={20} /><span>TOTAL XP</span><b>{award?.totalXp ?? 0}</b></div>
      </div>
      {mvp ? (
        <div className={styles.mvpPanel}>
          <span>MVP</span>
          <strong>{mvp.shortName}</strong>
          <b>{mvp.rating}</b>
        </div>
      ) : null}
      <div className={styles.roundTrail} aria-label="Four-round goal trail">
        {state.rounds.map((round) => <i key={round.round} data-goal={round.outcome === "goal"} data-player={round.playerAttacking} title={`Round ${round.round}: ${round.outcome}`} />)}
      </div>
      <div className={styles.roundLog}>
        {state.rounds.map((round) => {
          const playerWon = round.outcome === "goal" ? round.playerAttacking : !round.playerAttacking;
          return <div key={round.round}><span>R{round.round}</span><strong>{round.scenario.title}</strong><b data-win={playerWon}>{round.outcome === "goal" ? "GOAL" : "DENIED"}</b></div>;
        })}
      </div>
      <div className={styles.finalActions}>
        <Button size="lg" fullWidth glow accent={accent} onClick={onReplay} leadingIcon={<Glyph name="replay" size={18} />}>PLAY AGAIN</Button>
        <Button size="lg" fullWidth variant="surface" onClick={onExit}>HOME</Button>
      </div>
    </section>
  );
}

const tutorials: Record<string, { title: string; copy: string; icon: GlyphName }> = {
  toss: { title: "CALL YOUR SIDE", copy: "Win the toss and you choose whether to attack or defend first.", icon: "sync_alt" },
  scenario: { title: "READ THE MOMENT", copy: "Each scenario changes the attack and defense bonus. No scenario repeats in this match.", icon: "lightbulb" },
  play: { title: "BUILD YOUR MOVE", copy: "Choose one player and one matching action. Every used card stays visible, but locks for the rest of the duel.", icon: "style" },
  "round-result": { title: "TOTALS DECIDE", copy: "Rating, action power, scenario bonus, and your timing surge combine into the final matchup total.", icon: "insights" },
  final: { title: "REWARDS SETTLED", copy: "XP and coins are awarded once. Replay starts a completely fresh four-round duel.", icon: "workspace_premium" },
};

function TutorialOverlay({ tutorialKey, onDismiss }: { tutorialKey: string; onDismiss: () => void }) {
  const tutorial = tutorials[tutorialKey];
  return (
    <div className={styles.tutorialScrim} role="dialog" aria-modal="true" aria-labelledby="tutorial-title">
      <div className={styles.tutorialCard}>
        <div><Glyph name={tutorial.icon} size={25} /></div>
        <p>FIRST-TIME GUIDE</p>
        <h2 id="tutorial-title">{tutorial.title}</h2>
        <span>{tutorial.copy}</span>
        <Button size="lg" fullWidth glow onClick={onDismiss}>GOT IT</Button>
      </div>
    </div>
  );
}

function QuitDialog({ onStay, onQuit }: { onStay: () => void; onQuit: () => void }) {
  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="quit-title">
      <div className={styles.dialogPanel}>
        <Glyph name="warning" size={32} />
        <h2 id="quit-title">QUIT THIS DUEL?</h2>
        <p>The current match will be abandoned. No rewards or result will be recorded.</p>
        <div><Button size="lg" fullWidth glow onClick={onStay}>STAY IN MATCH</Button><Button size="lg" fullWidth variant="surface" onClick={onQuit}>QUIT MATCH</Button></div>
      </div>
    </div>
  );
}

"use client";

import {
  GameMatchmakingView,
  matchmakingFighter,
  useMatchmakingPlayer,
} from "../../shared/components/matchmaking";
import type { ShootoutState } from "../types";

/**
 * Finding a rival.
 *
 * There is no queue and no server — the opponent was generated the moment the
 * shootout was created. The search is theatre, and deliberately so: it is the
 * beat that turns a solo game into a match.
 *
 * The shootout is the one mode that takes the queue without the countdown after
 * it, because the lineup screen it hands to already is the beat before the
 * first kick — so it fields `GameMatchmakingView` rather than the whole gate,
 * exactly as Flutter's shootout does.
 */

export type OpponentRevealPhaseProps = {
  state: ShootoutState;
  onComplete: () => void;
  onQuit: () => void;
};

export function OpponentRevealPhase({
  state,
  onComplete,
  onQuit,
}: OpponentRevealPhaseProps) {
  const badge = `LV ${state.cpuLevel}`;
  const player = useMatchmakingPlayer(badge);

  return (
    <GameMatchmakingView
      config={{
        title: "PENALTY SHOOTOUT",
        queueLabel: "SCANNING GLOBAL PENALTY QUEUE",
        backgroundAsset: "/assets/backgrounds/penalty_arena.png",
        player,
        opponent: matchmakingFighter(state.opponentName, badge),
      }}
      onMatched={onComplete}
      onCancel={onQuit}
    />
  );
}

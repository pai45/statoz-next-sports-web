"use client";

import { useEffect, useState } from "react";

import { accentVar, Button, feedbackVar, withAlpha } from "@statoz/design-system/web";

import { usePrefersReducedMotion } from "../../shared/state/use-reduced-motion";
import { tossHoldMs, tossHoldReducedMs, tossSpinMs } from "../constants";
import type { ChessMatch } from "../engine/match";
import type { CoinSide } from "../types";

import styles from "./football-chess.module.css";

/**
 * The coin toss — the web port of `football_chess_toss_phase.dart` and the
 * shared `CyberCoinTossPhase` it adapts.
 *
 * Call it, watch it land, and the winner kicks off automatically. The coin is a
 * CSS 3D flip rather than a painted sprite; under reduced motion it simply
 * arrives on its face and the hold shortens, which is what Flutter does when
 * animations are disabled.
 */

export type TossPhaseProps = {
  match: ChessMatch;
  onCall: (call: CoinSide) => void;
  onBeginPlay: () => void;
  onQuit: () => void;
};

export function TossPhase({ match, onCall, onBeginPlay, onQuit }: TossPhaseProps) {
  const reduced = usePrefersReducedMotion();
  const [landed, setLanded] = useState(false);

  const called = match.tossCall !== null;
  const result = match.tossResult;

  // The coin spins, lands, and holds long enough to read before kickoff.
  useEffect(() => {
    if (result === null) return;
    const spin = window.setTimeout(() => setLanded(true), reduced ? 0 : tossSpinMs);
    return () => window.clearTimeout(spin);
  }, [result, reduced]);

  useEffect(() => {
    if (!landed) return;
    const hold = window.setTimeout(
      onBeginPlay,
      reduced ? tossHoldReducedMs : tossHoldMs,
    );
    return () => window.clearTimeout(hold);
  }, [landed, reduced, onBeginPlay]);

  const playerWon = match.playerWonToss === true;
  const accent = playerWon ? accentVar("cyan") : feedbackVar("danger");
  const winner = playerWon ? "YOU" : match.opponentName.toUpperCase();

  return (
    <div
      className="absolute inset-0 z-20 grid place-items-center px-6"
      style={{ background: withAlpha("var(--ds-color-background-primary)", 0.94) }}
      role="dialog"
      aria-modal="true"
      aria-label="Coin toss"
    >
      <div className="flex w-full max-w-95 flex-col items-center gap-6">
        <Coin result={result} landed={landed} spinning={called && !landed} />

        {!called ? (
          <>
            <p
              className="text-center font-bold leading-compact text-muted"
              style={{
                fontSize: "var(--ds-text-2xs)",
                letterSpacing: "var(--ds-tracking-mega)",
              }}
            >
              CALL THE TOSS TO DECIDE KICKOFF
            </p>
            <div className="flex w-full gap-3">
              <Button
                accent={accentVar("gold")}
                variant="solid"
                fullWidth
                onClick={() => onCall("heads")}
              >
                HEADS
              </Button>
              <Button
                accent={accentVar("cyan")}
                variant="solid"
                fullWidth
                onClick={() => onCall("tails")}
              >
                TAILS
              </Button>
            </div>
            <button
              type="button"
              onClick={onQuit}
              className="cursor-pointer py-2 font-bold leading-compact text-muted"
              style={{
                fontSize: "var(--ds-text-xs)",
                letterSpacing: "var(--ds-tracking-label)",
              }}
            >
              LEAVE
            </button>
          </>
        ) : !landed ? (
          <p
            className="font-bold leading-compact text-muted"
            style={{
              fontSize: "var(--ds-text-2xs)",
              letterSpacing: "var(--ds-tracking-mega)",
            }}
          >
            YOU CALLED {match.tossCall?.toUpperCase()}
          </p>
        ) : (
          <div className="flex flex-col items-center gap-1 text-center">
            <p
              className="font-display font-black leading-compact"
              style={{
                color: accent,
                fontSize: "var(--ds-text-2xl)",
                letterSpacing: "var(--ds-tracking-mega)",
                textShadow: `0 0 18px ${withAlpha(accent, 0.5)}`,
              }}
            >
              {winner} WON THE TOSS
            </p>
            <p className="leading-body text-muted" style={{ fontSize: "var(--ds-text-sm)" }}>
              {playerWon ? "YOU KICK OFF" : `${winner} KICKS OFF`}
            </p>
            <p
              className="mt-4 font-bold leading-compact"
              style={{
                color: accent,
                fontSize: "var(--ds-text-xs)",
                letterSpacing: "var(--ds-tracking-mega)",
              }}
            >
              KICKOFF PROTOCOL LOCKED
            </p>
            <span
              className="mt-2.5 block h-[3px] w-40 overflow-hidden rounded-sm"
              style={{ background: withAlpha("var(--ds-color-border-default)", 0.6) }}
            >
              <span className="block h-full w-full" style={{ background: accent }} />
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function Coin({
  result,
  landed,
  spinning,
}: {
  result: CoinSide | null;
  landed: boolean;
  spinning: boolean;
}) {
  const face = landed && result !== null ? result : "heads";
  const gold = accentVar("gold");

  return (
    <span
      className={`${styles.coin} ${spinning ? styles.coinSpin : ""}`}
      style={{
        borderColor: gold,
        color: gold,
        background: withAlpha("var(--ds-color-background-elevated)", 0.9),
      }}
      aria-label={landed && result !== null ? `The coin landed ${result}` : "Coin"}
    >
      <span
        className="font-display font-black leading-compact"
        style={{ fontSize: "var(--ds-text-xl)", letterSpacing: "var(--ds-tracking-display)" }}
      >
        {landed ? face.slice(0, 1).toUpperCase() : "?"}
      </span>
    </span>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@statoz/design-system/web";
import { useAuthSession } from "@/features/auth";
import { publicAsset } from "@/shared/config";
import type { GameLauncherProps } from "../components/game-launcher";
import styles from "./screen.module.css";

export function RetroInnings({ entry }: GameLauncherProps) {
  const session = useAuthSession();
  // Account changes discard the old live session before another player's records load.
  return <PrivateCricket key={session.email ?? "guest"} title={entry.title} />;
}

function PrivateCricket({ title }: { title: string }) {
  const router = useRouter();
  const [active, setActive] = useState(false);
  const [attempt, setAttempt] = useState(0);
  return <section className={styles.root} aria-label={`${title} private cricket preview`}>
    <header className={styles.header}>
      <p className="ds-type-hud-label">RETRO INNINGS / PRIVATE PREVIEW</p>
      <Button variant="surface" onClick={() => router.push("/games/cricket")}>
        {active ? "Exit game" : "Back to cricket"}
      </Button>
    </header>
    {active ? <CricketSession key={attempt} onRetry={() => setAttempt(n => n + 1)} /> :
      <main className={styles.intro}>
        <p className="ds-type-hud-label">CRICKET / ONE OVER EACH</p>
        <h1 className="ds-type-heading">Bat an over.<br />Defend your score.</h1>
        <p>Space starts and swings the indicated stroke. A / D / S choose leg, off or defend. Hold Q / E for loft or power. R runs, V reverses, Esc pauses. Touch controls appear beside or below the field.</p>
        <Button onClick={() => setActive(true)}>Load private game</Button>
        <p className={styles.note}>This preview uses source-derived reference artwork. It remains private. Sound starts off; enable it in Audio &amp; help. Settings and match records are saved locally for your account.</p>
      </main>}
  </section>;
}

function CricketSession({ onRetry }: { onRetry: () => void }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    const timer = window.setTimeout(() => setFailed(true), 15000);
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== element.contentWindow) return;
      if (event.data?.type !== "statoz.next.sports-web.retro-innings:ready" || event.data?.version !== 1) return;
      window.clearTimeout(timer);
      setReady(true);
      setFailed(false);
      element.focus();
    };
    window.addEventListener("message", receive);
    // Install the trusted ready listener before starting the bundled game request.
    element.src = publicAsset("/games/retro-innings/index.html");
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("message", receive);
    };
  }, []);
  return <div className={styles.session}>
    <iframe ref={frame} title="Retro Innings private cricket game" className={styles.frame}
      allow="autoplay" onError={() => setFailed(true)} />
    {(!ready || failed) && <div className={styles.notice} role={failed ? "alert" : "status"}>
      <p>{failed ? "Cricket could not load. Retry or return to Cricket." : "Loading private cricket preview..."}</p>
      {failed && <Button onClick={onRetry}>Retry load</Button>}
    </div>}
  </div>;
}

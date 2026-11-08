"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { publicAsset } from "@/shared/config";
import type { GameId, GameSceneId } from "../types";
import { discoveryFamily } from "./game-discovery.generated";
import { sampleDiscoveryMotion } from "./discovery-motion";
import styles from "./discovery-card.module.css";

/** Original scene ids remain usable by existing non-card consumers. */
const fallbackScenes: Record<GameSceneId, GameId> = {
  "pitch-duel": "pitch-duel", "penalty-shootout": "penalty-shootout",
  "football-chess": "football-chess", "final-over": "final-over",
  "hoop-duel": "hoop-duel", "grand-prix-dash": "grand-prix-dash",
  "tennis-rally": "tennis-rally", quiz: "football-quiz", bingo: "football-bingo",
  "guess-player": "guess-player", "guess-driver": "guess-driver", "guess-winner": "tennis-guess-winner",
};
export const gameSceneAssets = Object.fromEntries(
  Object.entries(fallbackScenes).map(([id, game]) => [id, {
    src: `/assets/games/${game}.svg`, alt: discoveryFamily.games[game].title,
  }]),
) as Record<GameSceneId, { src: string; alt: string }>;

export type GameSceneProps = {
  game: GameId;
  opacity?: number;
  /** Retained for compatibility. The new artwork supplies its own setting. */
  washed?: boolean;
  animate?: boolean;
  locked?: boolean;
  /** A deterministic normalized pose for review, seeking and comparisons. */
  phase?: number;
};

export function GameScene(props: GameSceneProps) {
  if (props.game === "retro-innings") return <div className={styles.scene} aria-hidden="true" data-discovery-game="retro-innings" style={{opacity: props.opacity ?? 1}}><Image src={publicAsset("/assets/games/retro-innings.png")} alt="" fill sizes="(min-width: 1024px) 240px, 50vw" unoptimized className={styles.layerImage} /></div>;
  if(props.game === "retro-football") return <div className={styles.scene} aria-hidden="true" data-discovery-game="retro-football" style={{opacity:props.opacity ?? 1}}><Image src={publicAsset("/assets/games/retro-football.png")} alt="" fill sizes="(min-width: 1024px) 240px, 50vw" unoptimized className={styles.layerImage} /></div>;
  if(props.game === "retro-circuit") return <div className={styles.scene} aria-hidden="true" data-discovery-game="retro-circuit" style={{opacity:props.opacity ?? 1}}><Image src={publicAsset("/assets/games/retro-circuit.png")} alt="" fill sizes="(min-width: 1024px) 240px, 50vw" unoptimized className={styles.layerImage} /></div>;
  return <CatalogGameScene {...props} />;
}
function CatalogGameScene({ game, opacity = 1, animate = true, locked = false, phase }: GameSceneProps) {
  const root = useRef<HTMLDivElement>(null);
  const scene = discoveryFamily.games[game === "retro-innings" ? "final-over" : game === "retro-hoops" ? "hoop-duel" : game];

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const nodes = element.querySelectorAll<HTMLDivElement>("[data-discovery-layer]");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false, request = 0, started = 0;
    const paint = (value: number) => {
      scene.layers.forEach((layer, index) => {
        const pose = sampleDiscoveryMotion(layer.frames, value);
        nodes[index].style.transform = `translate(${pose.x / 2.2}%, ${pose.y / 1.6}%) rotate(${pose.rotate}deg) scale(${pose.scale})`;
        nodes[index].style.opacity = String(pose.opacity);
      });
    };
    const tick = (time: number) => {
      if (!started) started = time;
      paint(((time - started) % discoveryFamily.cycleMs) / discoveryFamily.cycleMs);
      request = requestAnimationFrame(tick);
    };
    const sync = () => {
      cancelAnimationFrame(request);
      request = 0; started = 0;
      if (animate && !locked && phase === undefined && visible && !document.hidden && !reduced.matches) {
        request = requestAnimationFrame(tick);
      } else paint(phase ?? discoveryFamily.stillPhase);
    };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
    observer.observe(element);
    document.addEventListener("visibilitychange", sync);
    reduced.addEventListener("change", sync);
    sync();
    return () => {
      cancelAnimationFrame(request);
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
      reduced.removeEventListener("change", sync);
    };
  }, [scene, animate, locked, phase]);

  return <div ref={root} className={styles.scene} aria-hidden="true" data-discovery-game={game} style={{ opacity }}>
    {scene.layers.map(layer => {
      const pose = sampleDiscoveryMotion(layer.frames, phase ?? discoveryFamily.stillPhase);
      return <div key={layer.id} className={styles.layer} data-discovery-layer={layer.id} style={{
        transformOrigin: `${scene.pivot[0] / 2.2}% ${scene.pivot[1] / 1.6}%`,
        transform: `translate(${pose.x / 2.2}%, ${pose.y / 1.6}%) rotate(${pose.rotate}deg) scale(${pose.scale})`, opacity: pose.opacity,
      }}>
        <Image src={publicAsset(`/assets/games/discovery/${layer.asset}`)} alt="" fill sizes="(min-width: 1024px) 240px, 50vw" unoptimized className={styles.layerImage} />
      </div>;
    })}
  </div>;
}

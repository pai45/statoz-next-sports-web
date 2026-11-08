import { typography } from "@statoz/design-system/web/tokens/typography";
import Link from "next/link";

import { FootballIcon, GameIcon, withAlpha } from "@statoz/design-system/web";

import type { LeaderboardType } from "../types";

import { RankPlate } from "./rank-plate";

/**
 * What a board says when it has nobody on it.
 *
 * With a fixed field none of these is reachable today — the app's is not
 * either. It is still the board's honest empty state, and the moment any of
 * these boards is fed by something real it is the first thing a new player
 * sees, so it is ported rather than skipped.
 */

type EmptyConfig = {
  icon: React.ReactNode;
  title: string;
  body: string;
  cta: string;
  href: string;
};

function configFor(type: LeaderboardType): EmptyConfig {
  switch (type) {
    case "matches":
      return {
        icon: <FootballIcon size={48} />,
        title: "NO MATCH RANKING YET",
        body: "Make a match prediction to claim your first rank.",
        cta: "VIEW MATCHES",
        href: "/",
      };
    case "games":
      return {
        icon: <GameIcon size={48} />,
        title: "NO GAME SCORES YET",
        body: "Play a game mode to claim your first rank.",
        cta: "PLAY GAME",
        href: "/",
      };
  }
}

export function LeaderboardEmpty({
  type,
  accent,
}: {
  type: LeaderboardType;
  accent: string;
}) {
  const config = configFor(type);

  return (
    <div className="flex flex-col items-center px-8 py-8 text-center">
      <span aria-hidden style={{ color: withAlpha(accent, 0.7) }}>
        {config.icon}
      </span>

      <h2
        className="mt-4.5 font-display font-black"
        style={{ fontSize: typography.sizeRem.p16, letterSpacing: "var(--ds-tracking-display)" }}
      >
        {config.title}
      </h2>

      <p className="mt-2 max-w-80 text-sm leading-relaxed text-muted">
        {config.body}
      </p>

      <Link href={config.href} className="mt-5.5 inline-block">
        <RankPlate cut={10} background={accent} interactive>
          <span
            className="block px-5.5 py-3 font-display font-black leading-none text-inverse"
            style={{ fontSize: typography.sizeRem.p12, letterSpacing: "var(--ds-tracking-ultra)" }}
          >
            {config.cta}
          </span>
        </RankPlate>
      </Link>
    </div>
  );
}

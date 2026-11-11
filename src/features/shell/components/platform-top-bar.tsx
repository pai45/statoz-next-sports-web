"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Avatar, BrandIcon, FlameIcon, LockIcon } from "@statoz/design-system/web";
import { useAuthSession, useRequireAuth } from "@/features/auth";
import { useEconomy } from "@/features/economy";
import { usePlayerStanding } from "@/features/profile";
import { currentStreak, useIsStreakHydrated, useStreakSnapshot } from "@/features/streaks";
import { formatInt } from "@/shared/utils";
import styles from "./platform-top-bar.module.css";
import { PlatformPrimaryNav } from "./platform-primary-nav";

export type PlatformTopBarProps = { title?: string; coins?: number; accent?: string };

/** Games Web's command bar, adapted to Sports destinations and guest access. */
export function PlatformTopBar({ coins }: PlatformTopBarProps) {
  const pathname = usePathname();
  const player = usePlayerStanding();
  const session = useAuthSession();
  const requireAuth = useRequireAuth();
  const economy = useEconomy();
  const streakSnapshot = useStreakSnapshot();
  const streakReady = useIsStreakHydrated();
  const streak = currentStreak(streakSnapshot, "overall");

  return (
    <header className={styles.bar} data-platform-command-bar>
      <Link href="/" className={styles.brand} aria-label="StatOz Sports home">
        <BrandIcon name="logo" size={30} alt="" />
        <span>StatOz<small>SPORTS</small></span>
      </Link>
      <PlatformPrimaryNav />
      <div className={styles.utilities}>
        <Link href="/streaks" className={styles.stat} aria-label={streakReady ? `Daily streak: ${streak} days` : "Daily streak"}>
          <FlameIcon size={20} /><span>{streakReady ? formatInt(streak) : "—"}</span>
        </Link>
        <Link href="/shop?tab=coins" className={styles.wallet} aria-label={`${formatInt(coins ?? economy.coins)} Oz Coins. Add coins`}>
          <BrandIcon name="ozCoins" size={18} alt="" /><b>{formatInt(coins ?? economy.coins)}</b><span className={styles.plus} aria-hidden="true">+</span>
        </Link>
        {session.status === "authenticated" ? (
          <Link href="/profile" className={styles.profile} aria-label={`${player.displayName}, level ${player.level}. Open profile`}
            aria-current={pathname.startsWith("/profile") ? "page" : undefined}>
            <Avatar src={player.avatarSrc} alt="" size={32} ring={player.frameColor ?? "var(--ds-color-accent-violet)"} ringWidth={1} />
          </Link>
        ) : (
          <button type="button" className={styles.profile} aria-label="Log in to your profile" title="Log in"
            onClick={() => requireAuth({ intent: "view your profile", message: "Log in to see your profile, history, achievements, and loadouts.", returnTo: "/profile" })}>
            <LockIcon size={20} />
          </button>
        )}
      </div>
    </header>
  );
}

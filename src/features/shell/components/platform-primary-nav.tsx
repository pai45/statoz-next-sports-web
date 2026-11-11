"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FootballIcon, QuizIcon, ShopIcon, TrophyIcon } from "@statoz/design-system/web";
import styles from "./platform-top-bar.module.css";

const destinations = [
  { id: "matches", label: "Matches", href: "/", icon: <FootballIcon size={20} /> },
  { id: "quiz", label: "Quiz", href: "/quiz", icon: <QuizIcon size={20} /> },
  { id: "shop", label: "Shop", href: "/shop", icon: <ShopIcon size={20} /> },
  { id: "leaderboard", label: "Leaderboard", href: "/leaderboard", icon: <TrophyIcon size={20} /> },
];

/** The same four destinations at the top on desktop and bottom on phones. */
export function PlatformPrimaryNav({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  const active = pathname === "/" || /^\/(matches|leagues|picks)(\/|$)/.test(pathname)
    ? "matches"
    : /^\/(quiz|games)(\/|$)/.test(pathname) ? "quiz"
      : pathname.startsWith("/shop") ? "shop"
        : pathname.startsWith("/leaderboard") ? "leaderboard" : "";

  return <nav aria-label="Primary" className={mobile ? styles.mobileNav : styles.nav}>
    {destinations.map(destination => <Link key={destination.id} href={destination.href}
      aria-label={destination.label} title={destination.label}
      aria-current={active === destination.id ? "page" : undefined} className={styles.command}>
      {destination.icon}<span>{destination.label}</span>
    </Link>)}
  </nav>;
}

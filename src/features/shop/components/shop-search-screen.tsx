"use client";
/* eslint-disable react/jsx-no-comment-textnodes */

import Link from "next/link";
import { useMemo, useRef, useState } from "react";

import { AccentPanel, ArrowLeftIcon, NoDataState, SearchField, SearchIcon, ShopIcon, SignalOffIcon, accentVar } from "@statoz/design-system/web";
import { playerRoleSports } from "@/domain/cards";
import type { Sport } from "@/domain/sports";
import { allActionCards, allPlayerCards } from "@/features/packs";
import { colorProducts, racingPacks, shopBanners, shopFrames, standardPacks } from "@/mocks/shop";

type SearchItem = { id: string; name: string; kind: string; sport: Sport; detail: string; aliases: string[]; href: string };

const items: SearchItem[] = [
  ...allPlayerCards.map((card) => ({ id: card.id, name: card.name, kind: "PLAYER CARD", sport: playerRoleSports[card.role], detail: `${card.countryCode} // ${card.position} // ${card.rating}`, aliases: [card.shortName, card.country, card.countryCode, card.trait], href: `/shop?tab=cards&sport=${playerRoleSports[card.role]}&focus=${card.id}` })),
  ...allActionCards.map((card) => ({ id: card.id, name: card.title, kind: "ACTION CARD", sport: "football" as const, detail: `${card.tier.toUpperCase()} // ${card.effect}`, aliases: [card.category, card.effect], href: `/shop?tab=cards&focus=${card.id}` })),
  ...[...standardPacks, ...racingPacks].map((pack) => ({ id: pack.id, name: pack.label, kind: "PACK", sport: pack.id.startsWith("racing-") ? "motorsport" as const : "football" as const, detail: pack.guarantee, aliases: [pack.id, pack.guarantee], href: `/shop?tab=packs&sport=${pack.id.startsWith("racing-") ? "motorsport" : "football"}&focus=${pack.id}` })),
  ...shopFrames.map((frame) => ({ id: frame.id, name: frame.label, kind: "FRAME", sport: frame.sport as Sport, detail: `${frame.shortLabel} // ${frame.leagueId.toUpperCase()}`, aliases: [frame.shortLabel, frame.teamId, frame.leagueId], href: `/shop?tab=frames&sport=${frame.sport}&focus=${frame.id}` })),
  ...colorProducts.map((product) => ({ id: product.id, name: product.label, kind: product.kind.toUpperCase(), sport: product.sport, detail: `${product.price} OZ`, aliases: [product.id, product.kind], href: `/shop?tab=kits&sport=${product.sport}&focus=${product.id}` })),
  ...shopBanners.map((banner) => ({ id: banner.id, name: banner.label, kind: "BANNER", sport: banner.sport, detail: `${banner.price} OZ`, aliases: [banner.id, banner.label.replaceAll(" ", "")], href: `/shop?tab=banners&sport=${banner.sport}&focus=${banner.id}` })),
];

export function ShopSearchScreen() {
  const [query, setQuery] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const normalized = query.trim().toLocaleLowerCase().replace(/\s+/g, " ");
  const results = useMemo(() => normalized.length < 2 ? [] : items.filter((item) => normalized.split(" ").every((word) => [item.name, item.kind, item.detail, ...item.aliases].some((value) => value.toLocaleLowerCase().includes(word)))).sort((left, right) => rank(left, normalized) - rank(right, normalized) || left.name.localeCompare(right.name)), [normalized]);
  return <section className="flex min-h-0 flex-1 flex-col">
    <header className="shrink-0 border-b border-line-muted bg-background/95"><div className="mx-auto flex min-h-16 w-full max-w-5xl items-center px-2 sm:px-4"><Link href="/shop" aria-label="Back to shop" className="grid size-11 place-items-center text-cyan"><ArrowLeftIcon size={22} /></Link><span className="mr-2 font-display text-xl font-black text-cyan">/</span><div><h1 className="font-display text-lg font-black tracking-wide">SHOP SEARCH</h1><p className="mt-1 font-display text-2xs font-extrabold tracking-ultra text-muted">// CARDS + PACKS + COSMETICS</p></div></div></header>
    <main className="mx-auto w-full max-w-5xl flex-1 overflow-y-auto px-4 py-4 sm:px-6"><SearchField ref={input} label="Search the shop catalogue" value={query} onChange={(event) => setQuery(event.target.value)} onClear={() => { setQuery(""); input.current?.focus(); }} autoFocus enterKeyHint="search" placeholder="Search player, country, pack or frame" />
      <div className="mt-5">{normalized.length < 2 ? <NoDataState icon={ShopIcon} spark={SearchIcon} title={normalized ? "Add one more signal" : "Search the full catalogue"} message="Cards include country aliases and codes. Packs, frames, kits and banners are indexed too." className="min-h-56" /> : results.length === 0 ? <NoDataState icon={SignalOffIcon} spark={SearchIcon} title="No product found" message={`No local catalogue item matches “${query.trim()}”.`} className="min-h-56" /> : <div className="grid gap-2 sm:grid-cols-2" aria-live="polite">{results.map((item) => <Link key={`${item.kind}-${item.id}`} href={item.href}><AccentPanel accent={accentVar(item.sport === "football" ? "cyan" : item.sport === "cricket" ? "white" : item.sport === "basketball" ? "gold" : item.sport === "motorsport" ? "racing" : "lime")}><span className="flex min-h-20 items-center gap-3 px-4"><span className="min-w-0 flex-1"><small className="font-display text-2xs font-black tracking-wide text-muted">{item.kind}</small><strong className="mt-1 block truncate font-display text-sm font-black">{item.name}</strong><small className="mt-1 block truncate text-muted">{item.detail}</small></span><b className="font-display text-2xs tracking-wide text-cyan">VIEW</b></span></AccentPanel></Link>)}</div>}</div>
    </main>
  </section>;
}

function rank(item: SearchItem, query: string) {
  const name = item.name.toLocaleLowerCase();
  return name === query ? 0 : name.startsWith(query) ? 1 : 2;
}

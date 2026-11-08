"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type CSSProperties, type ReactNode } from "react";

import {
  LockIcon,
  PlayerCard,
  ProfileIcon,
  SearchIcon,
  UnderlineTabs,
  accentVar,
  glyphRegistry,
  type GlyphName,
} from "@statoz/design-system/web";
import {
  cardTierRank,
  playerRoleLabels,
  playerRoleSports,
  type ActionCard,
  type CardTier,
  type PlayerCard as PlayerCardData,
} from "@/domain/cards";
import { sportModuleFor, sportOrder, type Sport } from "@/domain/sports";
import {
  equipCosmetic,
  addCoinTopUp,
  purchaseItem,
  purchasePack,
  useEconomy,
  type EconomyItemKind,
  type EconomySnapshot,
} from "@/features/economy";
import { SportIcon } from "@/features/matches";
import {
  allActionCards,
  allPlayerCards,
  PackRevealSequence,
  claimPack,
  packRarityOfAction,
  packRarityOfPlayer,
  playerCardCoinPrice,
  playerCardInrPrice,
  portraitAssets,
  portraitForCard,
  rollFrom,
  rollStarterPackFor,
  type PackRevealItem,
} from "@/features/packs";
import { formatInt } from "@/shared/utils";

import {
  coinBundles,
  colorProducts,
  eliteHolo,
  foilMagenta,
  packArtIds,
  packHolo,
  racingPacks,
  shopBanners,
  shopCategories,
  shopFrames,
  standardPacks,
  type ColorProduct,
  type ShopCategory,
  type ShopPack,
} from "@/mocks/shop";

import { AvatarFrameRing } from "./avatar-frame-ring";
import { BannerArt } from "./banner-art";
import { CoinTopUpCelebration, ShopAcquireOverlay, type ShopAcquisition } from "./shop-acquire-overlay";
import { ShopCardFrame } from "./shop-card";
import {
  AvatarTile,
  BannerTile,
  CardGrid,
  CardTile,
  CoinTile,
  FrameTile,
  KitPreview,
  KitTile,
  PackGrid,
  PackTile,
  ShopEmptyFilter,
  StripList,
  TileGrid,
} from "./shop-tiles";
import styles from "./shop-screen.module.css";

const roleAccents: Record<string, string> = {
  attacker: accentVar("cyan"), defender: accentVar("violet"), goalkeeper: accentVar("gold"), batsman: accentVar("cyan"), bowler: accentVar("violet"), basketballGuard: accentVar("gold"), basketballWing: accentVar("cyan"), basketballBig: accentVar("violet"), tennisSingles: accentVar("lime"), f1Driver: accentVar("racing"), f2Driver: accentVar("racing"), nascarDriver: accentVar("racing"), indycarDriver: accentVar("racing"),
};

/** A card tile takes its rarity's colour: muted, cyan, violet, gold. */
const cardAcquireAccents: Record<CardTier, string> = {
  bronze: "var(--ds-color-border-inactive)",
  silver: accentVar("cyan"),
  gold: accentVar("violet"),
  platinum: accentVar("gold"),
};

/** What a kit calls itself, per sport, in the caption under its name. */
const kitCaptions: Record<ColorProduct["kind"], string> = {
  kit: "FINAL OVER KIT",
  jersey: "HOOP DUEL JERSEY",
  livery: "GRAND PRIX LIVERY",
};

function glyph(name: string): GlyphName {
  return name in glyphRegistry ? (name as GlyphName) : "bolt";
}

function cardSport(card: PlayerCardData): Sport {
  return playerRoleSports[card.role];
}

function tabFromQuery(value: string | null): ShopCategory {
  const match = shopCategories.find((entry) => entry.id === value || entry.label.toLowerCase() === value);
  return match?.id ?? "avatars";
}

type ConfirmState = { title: string; price: string; detail: string; action: () => void };
type BuyRequest = {
  kind: EconomyItemKind;
  id: string;
  price: number;
  label: string;
  accent: string;
  preview: ReactNode;
  simulatedInr?: boolean;
};

export function ShopScreen() {
  const economy = useEconomy();
  return <ShopCatalog economy={economy} />;
}

function ShopCatalog({ economy }: { economy: EconomySnapshot }) {
  const searchParams = useSearchParams();
  const [sport, setSport] = useState<Sport>(() => sportOrder.includes(searchParams.get("sport") as Sport) ? searchParams.get("sport") as Sport : "football");
  const [category, setCategory] = useState<ShopCategory>(() => tabFromQuery(searchParams.get("tab")));
  const [filter, setFilter] = useState("ALL");
  const [notice, setNotice] = useState("");
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [acquired, setAcquired] = useState<ShopAcquisition | null>(null);
  const [coinCelebration, setCoinCelebration] = useState<{ key: string; amount: number } | null>(null);
  const [reveal, setReveal] = useState<PackRevealItem[] | null>(null);
  const accent = accentVar(sportModuleFor(sport).accent);

  function changeCategory(index: number) {
    const next = shopCategories[index].id;
    setCategory(next);
    setFilter("ALL");
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }

  function resultNotice(result: ReturnType<typeof purchaseItem>, request: BuyRequest) {
    if (result.ok) {
      setAcquired({
        key: `${request.kind}-${request.id}-${Date.now()}`,
        name: request.label,
        accent: request.accent,
        coinsSpent: request.simulatedInr ? 0 : request.price,
        preview: request.preview,
      });
      setNotice(`${request.label} added to your inventory.`);
    } else {
      setNotice(
        result.reason === "owned"
          ? `${request.label} is already owned.`
          : "Not enough Oz Coins — top up in the Coins tab.",
      );
    }
  }

  function buyItem(request: BuyRequest) {
    const run = () =>
      resultNotice(
        purchaseItem({
          kind: request.kind,
          id: request.id,
          price: request.price,
          title: request.label,
          simulatedInr: request.simulatedInr,
        }),
        request,
      );
    if (request.simulatedInr) {
      setConfirm({
        title: request.label,
        price: `₹${formatInt(request.price)} SIMULATION`,
        detail: "No real payment will be taken. This browser will receive the item.",
        action: run,
      });
    } else {
      run();
    }
  }

  function equip(kind: EquipKind, id: string) {
    equipCosmetic(kind, id);
  }

  function buyCoins(bundle: (typeof coinBundles)[number]) {
    setConfirm({
      title: `${bundle.label} Coin Bundle`,
      price: `₹${formatInt(bundle.inr)} SIMULATION`,
      detail: `${formatInt(bundle.coins)} Oz Coins will be credited locally. No real payment will be taken.`,
      action: () => {
        addCoinTopUp({ id: bundle.id, coins: bundle.coins, title: bundle.label });
        setCoinCelebration({ key: `${bundle.id}-${Date.now()}`, amount: bundle.coins });
        setNotice(`${formatInt(bundle.coins)} Oz Coins added to your balance.`);
      },
    });
  }

  function openPack(pack: ShopPack, simulatedInr: boolean) {
    const execute = () => {
      if (pack.id === "starter") {
        if (economy.starterClaims[sport]) {
          setNotice("This sport's Starter Pack is already claimed.");
          return;
        }
        const starter = rollStarterPackFor(sport);
        claimPack(sport, starter);
        setReveal(toReveal(starter.playerCards, starter.actionCards));
        return;
      }
      const players = allPlayerCards.filter((card) => cardSport(card) === sport);
      const pickedPlayers = Array.from({ length: pack.playerCount }, () =>
        rollFrom(players, packRarityOfPlayer, pack.odds, Math.random),
      ).filter((card): card is PlayerCardData => Boolean(card));
      const pickedActions = Array.from({ length: pack.actionCount }, () =>
        rollFrom(allActionCards, packRarityOfAction, pack.odds, Math.random),
      ).filter((card): card is ActionCard => Boolean(card));
      const result = purchasePack({
        id: pack.id,
        price: simulatedInr ? pack.inr : pack.coinPrice,
        title: pack.label,
        playerCardIds: pickedPlayers.map((card) => card.id),
        actionCardIds: pickedActions.map((card) => card.id),
        simulatedInr,
      });
      if (!result.ok) {
        setNotice("Not enough Oz Coins — top up in the Coins tab.");
        return;
      }
      setReveal(toReveal(pickedPlayers, pickedActions));
    };
    if (simulatedInr) {
      setConfirm({
        title: pack.label,
        price: `₹${formatInt(pack.inr)} SIMULATION`,
        detail: "No real payment will be taken. Pack contents are stored only in this browser.",
        action: execute,
      });
    } else {
      execute();
    }
  }

  const content =
    category === "avatars" ? (
      <AvatarsTab economy={economy} sport={sport} filter={filter} setFilter={setFilter} buy={buyItem} />
    ) : category === "frames" ? (
      <FramesTab economy={economy} sport={sport} buy={buyItem} equip={equip} />
    ) : category === "banners" ? (
      <BannersTab economy={economy} sport={sport} buy={buyItem} />
    ) : category === "kits" ? (
      <KitsTab economy={economy} sport={sport} buy={buyItem} equip={equip} />
    ) : category === "coins" ? (
      <CoinsTab guest={!economy} onBuy={buyCoins} />
    ) : category === "packs" ? (
      <PacksTab economy={economy} sport={sport} onOpen={openPack} />
    ) : (
      <CardsTab economy={economy} sport={sport} filter={filter} setFilter={setFilter} buy={buyItem} />
    );

  return (
    <section
      className={`${styles.shell} relative isolate flex min-h-full flex-1 flex-col`}
      style={{ "--shop-accent": accent } as CSSProperties}
    >
      <div className="flex justify-end border-b border-line-muted px-3 py-2"><Link href="/shop/search" className="flex min-h-10 items-center gap-2 px-3 font-display text-2xs font-black tracking-ultra text-muted hover:text-cyan"><SearchIcon size={18} /> SEARCH SHOP</Link></div>
      <UnderlineTabs
        tabs={sportOrder.map((entry) => ({
          id: entry,
          label: sportModuleFor(entry).label.toUpperCase(),
          icon: <SportIcon sport={entry} size={18} />,
          showLabel: true,
        }))}
        activeIndex={sportOrder.indexOf(sport)}
        onChange={(index) => {
          setSport(sportOrder[index]);
          setFilter("ALL");
        }}
        accent={accent}
        iconColors={sportOrder.map((entry) =>
          accentVar(sportModuleFor(entry).accent),
        )}
        label="Shop sports"
        minTabWidth={116}
        className="sticky top-0 z-10 bg-surface-nav/95"
      />
      <UnderlineTabs
        tabs={shopCategories.map((entry) => ({ id: entry.id, label: entry.label.toUpperCase() }))}
        activeIndex={shopCategories.findIndex((entry) => entry.id === category)}
        onChange={changeCategory}
        accent={accent}
        label="Shop categories"
        minTabWidth={92}
        className="sticky top-12.5 z-10 bg-surface-nav/95"
      />

      <div className="relative z-[1] mx-auto w-full max-w-[1500px] flex-1 px-3 py-4 sm:px-5 lg:px-7">
        {!economy ? (
          <div className="mb-4 flex justify-end">
            <div className="flex items-center gap-2 border border-border-strong bg-surface-raised px-3 py-2 font-display text-2xs font-black tracking-wide text-muted">
              <LockIcon size={15} /> LOG IN TO BUY
            </div>
          </div>
        ) : null}
        <p aria-live="polite" className={`min-h-5 text-xs text-muted ${notice ? "mb-4" : ""}`}>
          {notice}
        </p>
        {content}
      </div>

      {confirm ? <ConfirmDialog state={confirm} close={() => setConfirm(null)} /> : null}
      {acquired ? (
        <ShopAcquireOverlay key={acquired.key} acquisition={acquired} onDismissed={() => setAcquired(null)} />
      ) : null}
      {coinCelebration ? (
        <CoinTopUpCelebration
          key={coinCelebration.key}
          amount={coinCelebration.amount}
          onDone={() => setCoinCelebration(null)}
        />
      ) : null}
      {reveal ? (
        <PackRevealSequence
          items={reveal}
          actionLabel="BACK TO SHOP"
          onComplete={() => {
            setReveal(null);
            setNotice("Pack contents added to your collection.");
          }}
        />
      ) : null}
    </section>
  );
}

function toReveal(players: PlayerCardData[], actions: ActionCard[]): PackRevealItem[] {
  return [
    ...players.map((card): PackRevealItem => ({ kind: "player", card })),
    ...actions.map((card): PackRevealItem => ({ kind: "action", card })),
  ].sort(
    (a, b) =>
      cardTierRank(a.card.tier) - cardTierRank(b.card.tier) ||
      ("rating" in a.card ? a.card.rating : a.card.power) -
        ("rating" in b.card ? b.card.rating : b.card.power),
  );
}

type Buy = (request: BuyRequest) => void;
type EquipKind = Exclude<EconomyItemKind, "playerCard" | "actionCard">;
type Equip = (kind: EquipKind, id: string) => void;

function Filters({
  values,
  value,
  setValue,
}: {
  values: string[];
  value: string;
  setValue: (value: string) => void;
}) {
  return (
    <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
      {values.map((entry) => (
        <button
          key={entry}
          type="button"
          onClick={() => setValue(entry)}
          aria-pressed={value === entry}
          className="shrink-0 border px-3 py-2 font-display text-2xs font-black tracking-wide focus-visible:outline-2"
          style={{
            color: value === entry ? "var(--shop-accent)" : undefined,
            borderColor: value === entry ? "var(--shop-accent)" : "var(--ds-color-border-strong)",
            background: value === entry ? "color-mix(in srgb, var(--shop-accent) 10%, transparent)" : undefined,
          }}
        >
          {entry.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

/* ---- Avatars --------------------------------------------------------------- */

function AvatarsTab({
  economy,
  sport,
  filter,
  setFilter,
  buy,
}: {
  economy: EconomySnapshot | null;
  sport: Sport;
  filter: string;
  setFilter: (value: string) => void;
  buy: Buy;
}) {
  const cyan = accentVar("cyan");
  const avatars = allPlayerCards.filter((card) => cardSport(card) === sport && portraitAssets[card.id]);
  const filters = ["ALL", ...new Set(avatars.map((card) => card.countryCode))].sort((a, b) =>
    a === "ALL" ? -1 : b === "ALL" ? 1 : a.localeCompare(b),
  );
  const shown = filter === "ALL" ? avatars : avatars.filter((card) => card.countryCode === filter);

  return (
    <>
      <Filters values={filters} value={filter} setValue={setFilter} />
      {shown.length === 0 ? (
        <ShopEmptyFilter sport={sport} label="NO AVATARS MATCH THIS FILTER" />
      ) : (
        <TileGrid>
          {shown.map((card, index) => (
            <AvatarTile
              key={card.id}
              index={index}
              name={card.shortName}
              portraitSrc={portraitForCard(card) ?? undefined}
              price={25}
              accent={cyan}
              guest={!economy}
              owned={Boolean(economy?.owned.avatarIds.includes(card.id))}
              onBuy={() =>
                buy({
                  kind: "avatar",
                  id: card.id,
                  price: 25,
                  label: card.name,
                  accent: cyan,
                  preview: <AvatarAcquirePreview card={card} />,
                })
              }
            />
          ))}
        </TileGrid>
      )}
    </>
  );
}

/* ---- Frames ---------------------------------------------------------------- */

function FramesTab({
  economy,
  sport,
  buy,
  equip,
}: {
  economy: EconomySnapshot | null;
  sport: Sport;
  buy: Buy;
  equip: Equip;
}) {
  const frames = shopFrames.filter((frame) => frame.sport === sport);
  if (!frames.length) return <ShopEmptyFilter sport={sport} label="NO TEAM FRAMES HAVE DROPPED FOR THIS SPORT YET" />;

  return (
    <TileGrid>
      {frames.map((frame, index) => (
        <FrameTile
          key={frame.id}
          index={index}
          label={frame.label}
          color={frame.color}
          price={frame.price}
          guest={!economy}
          owned={Boolean(economy?.owned.frameIds.includes(frame.id))}
          equipped={economy?.equipped.frameId === frame.id}
          onEquip={() => equip("frame", frame.id)}
          onBuy={() =>
            buy({
              kind: "frame",
              id: frame.id,
              price: frame.price,
              label: frame.label,
              accent: frame.color,
              preview: <FrameAcquirePreview color={frame.color} />,
            })
          }
        />
      ))}
    </TileGrid>
  );
}

/* ---- Banners --------------------------------------------------------------- */

function BannersTab({
  economy,
  sport,
  buy,
}: {
  economy: EconomySnapshot | null;
  sport: Sport;
  buy: Buy;
}) {
  const banners = shopBanners.filter((banner) => banner.sport === sport);
  if (!banners.length) return <ShopEmptyFilter sport={sport} label="NO BANNERS HAVE DROPPED FOR THIS SPORT YET" />;

  return (
    <StripList>
      {banners.map((banner, index) => (
        <BannerTile
          key={banner.id}
          index={index}
          label={banner.label}
          sportCode={sportModuleFor(banner.sport).shortLabel}
          accent={banner.accent}
          art={<BannerArt banner={banner} />}
          price={banner.price}
          guest={!economy}
          owned={Boolean(economy?.owned.bannerIds.includes(banner.id))}
          onBuy={() =>
            buy({
              kind: "banner",
              id: banner.id,
              price: banner.price,
              label: banner.label,
              accent: banner.accent,
              preview: <BannerAcquirePreview banner={banner} />,
            })
          }
        />
      ))}
    </StripList>
  );
}

/* ---- Kits ------------------------------------------------------------------ */

function KitsTab({
  economy,
  sport,
  buy,
  equip,
}: {
  economy: EconomySnapshot | null;
  sport: Sport;
  buy: Buy;
  equip: Equip;
}) {
  const products = colorProducts.filter((entry) => entry.sport === sport);
  if (!products.length) return <ShopEmptyFilter sport={sport} label="NO KITS HAVE DROPPED FOR THIS SPORT YET" />;

  return (
    <StripList>
      {products.map((item, index) => {
        const ownedKey = `${item.kind}Ids` as "kitIds" | "jerseyIds" | "liveryIds";
        const equippedKey = `${item.kind}Id` as "kitId" | "jerseyId" | "liveryId";
        return (
          <KitTile
            key={item.id}
            index={index}
            label={item.label}
            caption={kitCaptions[item.kind]}
            primary={item.primary}
            secondary={item.secondary}
            accent={item.accent}
            kind={item.kind}
            price={item.price}
            guest={!economy}
            owned={Boolean(economy?.owned[ownedKey].includes(item.id))}
            equipped={economy?.equipped[equippedKey] === item.id}
            onEquip={() => equip(item.kind, item.id)}
            onBuy={() =>
              buy({
                kind: item.kind,
                id: item.id,
                price: item.price,
                label: item.label,
                accent: item.accent,
                preview: <ColorAcquirePreview item={item} />,
              })
            }
          />
        );
      })}
    </StripList>
  );
}

/* ---- Coins ----------------------------------------------------------------- */

function CoinsTab({
  guest,
  onBuy,
}: {
  guest: boolean;
  onBuy: (bundle: (typeof coinBundles)[number]) => void;
}) {
  return (
    <TileGrid>
      {coinBundles.map((bundle, index) => (
        <CoinTile
          key={bundle.id}
          index={index}
          label={bundle.label}
          coins={formatInt(bundle.coins)}
          inr={bundle.inr}
          accent={bundle.accent}
          artSrc={`/assets/shop/coins/${bundle.id}.png`}
          bonus={bundle.bonus}
          tag={bundle.tag}
          guest={guest}
          onBuy={() => onBuy(bundle)}
        />
      ))}
    </TileGrid>
  );
}

/* ---- Packs ----------------------------------------------------------------- */

function PacksTab({
  economy,
  sport,
  onOpen,
}: {
  economy: EconomySnapshot | null;
  sport: Sport;
  onOpen: (pack: ShopPack, inr: boolean) => void;
}) {
  const packs = sport === "motorsport" ? racingPacks : standardPacks;

  return (
    <PackGrid>
      {packs.map((pack, index) => (
        <PackTile
          key={pack.id}
          index={index}
          label={pack.label}
          accent={pack.gradient ? foilMagenta : pack.accent}
          artSrc={`/assets/shop/packs/${packArtIds[pack.id] ?? pack.id}.png`}
          cardCount={pack.playerCount + pack.actionCount}
          coinPrice={pack.coinPrice}
          inr={pack.inr}
          starter={pack.id === "starter"}
          claimed={pack.id === "starter" && Boolean(economy?.starterClaims[sport])}
          elite={Boolean(pack.gradient)}
          guest={!economy}
          holo={packHolo[pack.id] ?? eliteHolo}
          onCoins={() => onOpen(pack, false)}
          onInr={() => onOpen(pack, true)}
        />
      ))}
    </PackGrid>
  );
}

/* ---- Cards ----------------------------------------------------------------- */

const cardFiltersBySport: Record<Sport, string[]> = {
  football: ["ALL", "ATTACKERS", "DEFENDERS", "KEEPERS", "BRONZE", "SILVER", "GOLD", "PLATINUM"],
  cricket: ["ALL", "BATTERS", "BOWLERS", "BRONZE", "SILVER", "GOLD", "PLATINUM"],
  basketball: ["ALL", "GUARDS", "WINGS", "BIGS", "BRONZE", "SILVER", "GOLD", "PLATINUM"],
  tennis: ["ALL", "ATP", "WTA", "BRONZE", "SILVER", "GOLD", "PLATINUM"],
  motorsport: ["ALL", "F1", "F2", "NASCAR", "INDYCAR", "BRONZE", "SILVER", "GOLD", "PLATINUM"],
};

function cardMatchesFilter(card: PlayerCardData, filter: string) {
  if (["BRONZE", "SILVER", "GOLD", "PLATINUM"].includes(filter)) return card.tier === filter.toLowerCase();
  return filter === "ATTACKERS" ? card.role === "attacker"
    : filter === "DEFENDERS" ? card.role === "defender"
      : filter === "KEEPERS" ? card.role === "goalkeeper"
        : filter === "BATTERS" ? card.role === "batsman"
          : filter === "BOWLERS" ? card.role === "bowler"
            : filter === "GUARDS" ? card.role === "basketballGuard"
              : filter === "WINGS" ? card.role === "basketballWing"
                : filter === "BIGS" ? card.role === "basketballBig"
                  : filter === "F1" ? card.role === "f1Driver"
                    : filter === "F2" ? card.role === "f2Driver"
                      : filter === "NASCAR" ? card.role === "nascarDriver"
                        : filter === "INDYCAR" ? card.role === "indycarDriver"
                          : true;
}

function ShopPlayerCard({ card, sport, selected = false }: { card: PlayerCardData; sport: Sport; selected?: boolean }) {
  return (
    <PlayerCard
      name={card.shortName}
      roleLabel={playerRoleLabels[card.role]}
      position={card.position}
      countryCode={card.countryCode}
      rating={card.rating}
      trait={card.trait}
      tier={card.tier}
      icon={glyph(card.icon)}
      portraitSrc={portraitForCard(card)}
      roleAccent={roleAccents[card.role]}
      markings={sport === "football" ? "none" : sport}
      size="sm"
      selected={selected}
    />
  );
}

function CardsTab({
  economy,
  sport,
  filter,
  setFilter,
  buy,
}: {
  economy: EconomySnapshot | null;
  sport: Sport;
  filter: string;
  setFilter: (value: string) => void;
  buy: Buy;
}) {
  const source = allPlayerCards.filter((card) => cardSport(card) === sport);
  const filtered = source.filter((card) => cardMatchesFilter(card, filter));
  const shown = sport === "motorsport" ? filtered : filtered.slice(0, 48);

  return (
    <>
      <Filters values={cardFiltersBySport[sport]} value={filter} setValue={setFilter} />
      {shown.length === 0 ? (
        <ShopEmptyFilter sport={sport} label="NO CARDS MATCH THIS FILTER" />
      ) : (
        <CardGrid>
          {shown.map((card, index) => {
            const accent = cardAcquireAccents[card.tier];
            const coinPrice = playerCardCoinPrice(card);
            const inrPrice = playerCardInrPrice(card);
            const preview = <ShopPlayerCard card={card} sport={sport} selected />;
            return (
              <CardTile
                key={card.id}
                index={index}
                name={card.name}
                accent={accent}
                coinPrice={coinPrice}
                inr={inrPrice}
                guest={!economy}
                owned={Boolean(economy?.owned.playerCardIds.includes(card.id))}
                card={<ShopPlayerCard card={card} sport={sport} />}
                onCoins={() =>
                  buy({ kind: "playerCard", id: card.id, price: coinPrice, label: card.name, accent, preview })
                }
                onInr={() =>
                  buy({
                    kind: "playerCard",
                    id: card.id,
                    price: inrPrice,
                    label: card.name,
                    accent,
                    preview,
                    simulatedInr: true,
                  })
                }
              />
            );
          })}
        </CardGrid>
      )}
    </>
  );
}

/* ---- Previews and art ------------------------------------------------------ */

function AvatarAcquirePreview({ card }: { card: PlayerCardData }) {
  return (
    <div className="h-[150px] w-[120px]">
      <ShopCardFrame accent={accentVar("cyan")}>
        <div className="relative h-full w-full overflow-hidden">
          <Image src={portraitForCard(card)!} alt="" fill sizes="120px" className="object-cover object-top" />
        </div>
      </ShopCardFrame>
    </div>
  );
}

function FrameAcquirePreview({ color }: { color: string }) {
  return (
    <AvatarFrameRing color={color} glow className="block h-[66px] w-[66px]">
      <span className="grid h-full place-items-center bg-surface-raised text-muted">
        <ProfileIcon size={30} />
      </span>
    </AvatarFrameRing>
  );
}

function BannerAcquirePreview({ banner }: { banner: (typeof shopBanners)[number] }) {
  return (
    <div className="h-24 w-60">
      <ShopCardFrame accent={banner.accent}>
        <BannerArt banner={banner} />
      </ShopCardFrame>
    </div>
  );
}

function ColorAcquirePreview({ item }: { item: ColorProduct }) {
  return (
    <div className="grid h-[120px] w-[120px] place-items-center">
      <KitPreview primary={item.primary} secondary={item.secondary} accent={item.accent} kind={item.kind} />
    </div>
  );
}

/* ---- Confirmation ---------------------------------------------------------- */

function ConfirmDialog({ state, close }: { state: ConfirmState; close: () => void }) {
  return (
    <div
      className={`${styles.dialogBackdrop} fixed inset-0 z-50 grid place-items-center p-4`}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className={`${styles.chamfer} w-full max-w-sm border border-accent-cyan bg-surface-raised p-5 shadow-2xl`}
      >
        <p className="font-display text-2xs font-black tracking-ultra text-muted">{"// CONFIRM ACQUISITION"}</p>
        <h2 id="confirm-title" className="mt-2 font-display text-xl font-black">
          {state.title}
        </h2>
        <p className="mt-2 font-display text-sm font-black text-accent-cyan">{state.price}</p>
        <p className="mt-3 text-xs leading-relaxed text-muted">{state.detail}</p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button type="button" autoFocus onClick={close} className="h-11 border border-border-strong font-display text-xs font-black">
            CANCEL
          </button>
          <button
            type="button"
            onClick={() => {
              close();
              state.action();
            }}
            className="h-11 bg-accent-cyan font-display text-xs font-black text-background"
          >
            CONFIRM
          </button>
        </div>
      </div>
    </div>
  );
}

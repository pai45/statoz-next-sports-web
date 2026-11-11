"use client";

import { useSearchParams } from "next/navigation";
import { useId, useMemo, useRef, useState } from "react";
import {
  Button, ExpandableSearchField, FilterChips, InventoryIcon, PageSearchHeader, SearchIcon, ShieldIcon,
} from "@statoz/design-system/games";
import { sportModuleFor, sportOrder, type Sport } from "@/domain/sports";
import { useEconomy } from "@/features/economy";
import { allPlayerCards, portraitForCard } from "@/features/packs";
import { useShopActions } from "../hooks/use-shop-actions";
import {
  buildShopCatalog, buildStorefrontCatalog, categoryFromTab, filterShopCatalog, nextLoadoutProduct,
  shopAvatarSource, type ShopProduct, type ShopSort, type StorefrontCategory,
} from "../lib/shop-catalog";
import { ShopSpotlight } from "./shop-hero";
import { ShopProductArt, ShopProductCard, ShopProductPreview } from "./shop-products";
import { CoinsShelf } from "./shelves/coins-shelf";
import styles from "./shop-screen.module.css";
import sports from "./sports-storefront.module.css";

const categories: StorefrontCategory[] = ["avatars", "frames", "banners", "coins"];
const labels: Record<StorefrontCategory, string> = { coins: "Coins", avatars: "Avatars", frames: "Frames", banners: "Banners" };
const descriptions: Record<StorefrontCategory, string> = {
  avatars: "Pick the face of your next winning streak.",
  frames: "Rep your team. Give your profile an edge.",
  banners: "Make your profile feel like home turf.",
  coins: "Power up your wallet for your next unlock.",
};

export function ShopScreen({ searchMode = false }: { searchMode?: boolean }) {
  const params = useSearchParams(), economy = useEconomy(), panelId = useId(), sportId = useId(), sortId = useId();
  const sport = sportOrder.find(value => value === params.get("sport")) ?? null;
  const scope = params.toString();
  const [input, setInput] = useState({ scope, value: params.get("q") ?? "" });
  if (input.scope !== scope) setInput({ scope, value: params.get("q") ?? "" });
  const query = input.scope === scope ? input.value : params.get("q") ?? "";
  const [preview, setPreview] = useState<ShopProduct | null>(null);
  const [ownedOnly, setOwnedOnly] = useState(false);
  const [sort, setSort] = useState<ShopSort>("recommended");
  const search = useRef<HTMLInputElement>(null);
  const avatars = useMemo(() => allPlayerCards.flatMap(card => {
    const src = portraitForCard(card);
    return src ? [{ card, src }] : [];
  }), []);
  const allProducts = useMemo(() => buildStorefrontCatalog(avatars), [avatars]);
  const products = useMemo(() => sport ? buildShopCatalog(sport, avatars).filter(product => product.category !== "kits") : allProducts, [sport, avatars, allProducts]);
  const focus = params.get("focus");
  const focusedProduct = focus ? products.find(product => product.id === focus) ?? null : null;
  const category = (focusedProduct?.category as StorefrontCategory | undefined) ?? categoryFromTab(params.get("tab"));
  const selected = preview ?? focusedProduct;
  const avatarSrc = shopAvatarSource(economy.equipped.avatarId, avatars);
  const shown = useMemo(() => filterShopCatalog(products, economy, { category, query, ownedOnly, sort }), [products, economy, category, query, ownedOnly, sort]);
  const spotlight = nextLoadoutProduct(products, economy);
  const sportLabel = sport ? sportModuleFor(sport).label : "Sports";

  function updateRoute(values: Record<string, string | null>) {
    const url = new URL(window.location.href);
    for (const [key, value] of Object.entries(values)) {
      if (value) url.searchParams.set(key, value);
      else url.searchParams.delete(key);
    }
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }
  function changeQuery(value: string) {
    setInput({ scope, value });
    updateRoute({ q: value.trim() ? value : null, focus: null });
  }
  function selectCategory(next: StorefrontCategory) {
    setPreview(null);
    setInput({ scope, value: "" });
    updateRoute({ tab: next === "avatars" ? null : next, focus: null, q: null });
  }
  function closePreview() {
    setPreview(null);
    if (focus) updateRoute({ focus: null, tab: category === "avatars" ? null : category });
  }
  function clearFilters() {
    setOwnedOnly(false);
    changeQuery("");
    search.current?.focus();
  }
  const { buy, buyCoins, equip, lastEquipped, overlays } = useShopActions(sport ?? "football", { onGetCoins: () => selectCategory("coins") });
  function buyProduct(product: ShopProduct) {
    closePreview();
    buy({ kind: product.kind, id: product.id, price: product.price, label: product.name, accent: product.accent, tier: product.tier,
      preview: <ShopProductArt product={product} avatarSrc={avatarSrc} large /> });
  }
  function equipProduct(product: ShopProduct) {
    closePreview();
    equip({ kind: product.kind, id: product.id, label: product.name, accent: product.accent, tier: product.tier,
      preview: <ShopProductArt product={product} avatarSrc={avatarSrc} large /> });
  }

  return (
    <section className={styles.shell} data-shop-screen>
      <div className={styles.storefront}>
        <p className={sports.storeKicker}>STATOZ SPORTS / PLAYER STORE</p>
        <PageSearchHeader title="The Locker Room">
          <ExpandableSearchField ref={search} label="Search shop items" placeholder={`Search ${labels[category].toLowerCase()}…`}
            value={query} onChange={event => changeQuery(event.target.value)}
            onClear={() => { changeQuery(""); search.current?.focus(); }} autoFocus={searchMode} enterKeyHint="search" />
        </PageSearchHeader>
        <p className={sports.storeLede}>Your team. Your colours. Your signature look.</p>
        {!searchMode && !query && category !== "coins" && (
          <ShopSpotlight product={spotlight} products={products} economy={economy} avatarSrc={avatarSrc} sportLabel={sportLabel}
            onBuy={buyProduct} onEquip={equipProduct}
            onCategory={next => { if (categories.includes(next as StorefrontCategory)) selectCategory(next as StorefrontCategory); }}
            onShowOwned={() => { selectCategory("avatars"); setOwnedOnly(true); }} />
        )}
        <div className={sports.sportsToolbar}>
          <FilterChips options={categories.map(kind => labels[kind])} selected={labels[category]}
            onSelect={label => selectCategory(categories.find(kind => labels[kind] === label)!)}
            label="Shop category" className={styles.categoryTabs} panelId={panelId} />
          {category !== "coins" && (
            <label htmlFor={sportId} className={sports.sportSelect}>
              <span>Sport</span>
              <select id={sportId} value={sport ?? ""} onChange={event => {
                setPreview(null);
                updateRoute({ sport: event.target.value || null, focus: null });
              }}>
                <option value="">All sports</option>
                {sportOrder.map(item => <option key={item} value={item}>{item === "basketball" ? "Basketball" : sportModuleFor(item).label}</option>)}
              </select>
            </label>
          )}
        </div>
        <div id={panelId} role="tabpanel" aria-label={labels[category]} tabIndex={0} className={styles.tabPanel}>
          <div className={sports.collectionHeading}>
            <div><h2>{category === "coins" ? "The Oz Coin Vault" : labels[category]}</h2><p>{descriptions[category]}</p></div>
            {category !== "coins" && <span className={styles.resultCount} role="status">{shown.length} {shown.length === 1 ? "item" : "items"}</span>}
          </div>
          {category === "coins" ? <CoinsShelf onBuy={buyCoins} query={query} onClear={clearFilters} /> : (
            <section className={styles.catalog} aria-label={`${labels[category]} catalog`} data-shop-catalog>
              <div className={styles.catalogTools}>
                <button type="button" aria-pressed={ownedOnly} onClick={() => setOwnedOnly(value => !value)} className={sports.lockerToggle}>
                  <InventoryIcon size={17} />My locker{ownedOnly && <span aria-hidden="true"> ✓</span>}
                </button>
                <label htmlFor={sortId} className={sports.catalogSort}><span>Sort by</span>
                  <select id={sortId} value={sort} onChange={event => setSort(event.target.value as ShopSort)}>
                    <option value="recommended">Recommended</option><option value="price">Price: low to high</option><option value="name">Name: A–Z</option>
                  </select>
                </label>
              </div>
              {shown.length ? <ProductGrid key={`${category}-${sport}-${query}-${ownedOnly}-${sort}`} products={shown} economy={economy} avatarSrc={avatarSrc}
                lastEquipped={lastEquipped} onBuy={buyProduct} onEquip={equipProduct} onPreview={setPreview} /> : (
                <div className={styles.emptyState}>
                  <SearchIcon size={30} /><h3>{ownedOnly ? "Your locker starts here" : "No items found"}</h3>
                  <p>{ownedOnly ? "Explore the collection to find your first unlock." : "Try a different name, team or country, or browse another sport."}</p>
                  <Button onClick={clearFilters}>{ownedOnly ? "Explore items" : "Clear search"}</Button>
                </div>
              )}
            </section>
          )}
        </div>
        <p className={styles.storeNote}><ShieldIcon size={14} />Cosmetics are yours to equip. Demo purchases stay in this browser.</p>
      </div>
      {selected && <ShopProductPreview key={`${selected.kind}-${selected.id}`} product={selected} economy={economy} avatarSrc={avatarSrc}
        onBuy={() => buyProduct(selected)} onEquip={() => equipProduct(selected)} onClose={closePreview} />}
      {overlays}
    </section>
  );
}

function ProductGrid({ products, economy, avatarSrc, lastEquipped, onBuy, onEquip, onPreview }: {
  products: ShopProduct[]; economy: ReturnType<typeof useEconomy>; avatarSrc?: string; lastEquipped: { kind: string; id: string } | null;
  onBuy: (product: ShopProduct) => void; onEquip: (product: ShopProduct) => void; onPreview: (product: ShopProduct) => void;
}) {
  const [count, setCount] = useState(24);
  return <><div className={styles.productGrid}>
    {products.slice(0, count).map(product => <ShopProductCard key={`${product.kind}-${product.id}`} product={product} economy={economy}
      justEquipped={lastEquipped?.kind === product.kind && lastEquipped.id === product.id}
      avatarSrc={avatarSrc} onBuy={() => onBuy(product)} onEquip={() => onEquip(product)} onPreview={() => onPreview(product)} />)}
  </div>{count < products.length && <Button variant="surface" className={styles.showMore} onClick={() => setCount(value => value + 24)}
    trailingIcon={<span>{Math.min(count, products.length)}/{products.length}</span>}>Show more items</Button>}</>;
}

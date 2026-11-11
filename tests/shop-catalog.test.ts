import test from "node:test";
import assert from "node:assert/strict";
import { readEconomy } from "../src/features/economy";
import {
  avatarPrice, buildShopCatalog, buildStorefrontCatalog, categoryFromTab, filterShopCatalog,
  loadoutProgress, nextLoadoutProduct, productState,
} from "../src/features/shop/lib/shop-catalog";
import { coinBundleValue } from "../src/features/shop/lib/coin-bundles";
import { footballPlayerCards } from "../src/mocks/packs/football-cards";
import { shopFrames, shopBanners, coinBundles } from "../src/mocks/shop";

const avatars = footballPlayerCards.map(card => ({ card, src: `/test/${card.id}.webp` }));
const wallet = () => structuredClone(readEconomy());

test("Sports storefront keeps source prices and offers each cosmetic once", () => {
  const catalog = buildStorefrontCatalog(avatars);
  assert.equal(new Set(catalog.map(item => `${item.kind}:${item.id}`)).size, catalog.length);
  assert.ok(catalog.some(item => item.kind === "avatar" && item.price === avatarPrice));
  for (const item of catalog) {
    assert.ok(["avatar", "frame", "banner"].includes(item.kind));
    if (item.kind === "frame") assert.equal(item.price, shopFrames.find(frame => frame.id === item.id)?.price);
    if (item.kind === "banner") assert.equal(item.price, shopBanners.find(banner => banner.id === item.id)?.price);
  }
});

test("sport selection, country searches, ownership and price sorting compose", () => {
  const catalog = buildShopCatalog("football", avatars);
  assert.ok(catalog.every(item => item.sport === "football"));
  const economy = wallet();
  const neymar = catalog.find(item => item.name.toLocaleLowerCase().includes("neymar"));
  assert.ok(neymar);
  const find = (query: string, ownedOnly = false) => filterShopCatalog(catalog, economy, { category: "avatars", query, ownedOnly, sort: "price" });
  assert.ok(find("brazil neymar").some(item => item.id === neymar.id));
  assert.ok(!find("neymar", true).some(item => item.id === neymar.id));
  economy.owned.avatarIds.push(neymar.id);
  assert.ok(find("neymar", true).some(item => item.id === neymar.id));
  const sorted = find("");
  assert.ok(sorted.every((item, index) => !index || sorted[index - 1].price <= item.price));
});

test("loadout spotlight recommends an owned item before another purchase", () => {
  const catalog = buildStorefrontCatalog(avatars), economy = wallet();
  economy.equipped.avatarId = "";
  economy.equipped.frameId = null;
  economy.equipped.bannerId = "";
  economy.owned.avatarIds = [];
  const avatar = catalog.find(item => item.kind === "avatar" && item.price > 0)!;
  economy.owned.avatarIds.push(avatar.id);
  assert.equal(nextLoadoutProduct(catalog, economy)?.id, avatar.id);
  assert.equal(productState(avatar, economy), "owned");
  economy.equipped.avatarId = avatar.id;
  assert.equal(productState(avatar, economy), "equipped");
  assert.equal(loadoutProgress(economy).find(slot => slot.kind === "avatar")?.complete, true);
});

test("legacy category links and demo coin bundle totals remain valid", () => {
  assert.equal(categoryFromTab("borders"), "frames");
  assert.equal(categoryFromTab("coins"), "coins");
  assert.equal(categoryFromTab("unknown"), "avatars");
  for (const bundle of coinBundles) {
    const value = coinBundleValue(bundle);
    assert.equal(value.base + value.bonusCoins, bundle.coins);
    assert.ok(value.bonusCoins >= 0);
  }
});

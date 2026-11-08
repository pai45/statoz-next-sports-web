import { test } from "node:test";
import assert from "node:assert/strict";
import { gameForHref, gameRegistry, playableGameHrefs } from "../src/mocks/games/game-registry";
import { deckFor, sportForGame } from "../src/mocks/games/sport-decks";
import { signInLocal } from "../src/features/auth/state/auth-session";

test("Private cricket preview has a generated route without replacing Final Over or requiring a deck", () => {
  assert.equal(gameForHref("/play/retro-innings")?.game, "retro-innings");
  assert.ok(playableGameHrefs().includes("/play/retro-innings"));
  assert.equal(sportForGame("retro-innings"), "cricket");
  assert.ok(deckFor("cricket").heroes.includes("retro-innings"));
  assert.match(gameRegistry["retro-innings"].badgeLabel!, /PRIVATE/);
  assert.equal(gameRegistry["retro-innings"].requiresDeck, undefined);
  assert.equal(gameForHref("/play/final-over")?.game, "final-over");
  assert.equal(gameRegistry["final-over"].requiresDeck, true);
});

test("Cricket local records follow the existing player account switch", () => {
  const records = new Map<string, string>();
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const oldEvent = Object.getOwnPropertyDescriptor(globalThis, "StorageEvent");
  const localStorage = {getItem:(k:string) => records.get(k) ?? null, setItem:(k:string,v:string) => records.set(k,v), removeItem:(k:string) => records.delete(k)};
  Object.defineProperty(globalThis, "window", {configurable:true,value:{localStorage,dispatchEvent:() => true}});
  Object.defineProperty(globalThis, "StorageEvent", {configurable:true,value:class {}});
  const key = "statoz.sports.web.retro-innings:v1";
  try {
    signInLocal("cricket-a@example.test"); localStorage.setItem(key, "first-player");
    signInLocal("cricket-b@example.test"); assert.equal(localStorage.getItem(key), null);
    localStorage.setItem(key, "second-player");
    signInLocal("cricket-a@example.test"); assert.equal(localStorage.getItem(key), "first-player");
    signInLocal("cricket-b@example.test"); assert.equal(localStorage.getItem(key), "second-player");
  } finally {
    if(oldWindow) Object.defineProperty(globalThis,"window",oldWindow); else Reflect.deleteProperty(globalThis,"window");
    if(oldEvent) Object.defineProperty(globalThis,"StorageEvent",oldEvent); else Reflect.deleteProperty(globalThis,"StorageEvent");
  }
});

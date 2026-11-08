"use client";

import { useSyncExternalStore } from "react";

import type { AuthSessionSnapshot, AuthStatus } from "../types";

const storageKey = "statoz.next.sports-web.auth.v2";
const accountDirectoryKey = "statoz.next.sports-web.accounts.v1";
const activeDataOwnerKey = "statoz.next.sports-web.account-data-owner.v1";

/* Every browser-local record that belongs to a player. Keeping this list here
 * lets the lightweight local auth shim switch accounts without forcing each
 * feature store to know about authentication. */
const playerStorageKeys = [
  "statoz.next.sports-web.profile.v1",
  "statoz.next.sports-web.economy.v1",
  "statoz.next.sports-web.packs.v1",
  "statoz.next.sports-web.decks.v1",
  "statoz.next.sports-web.decks.v2",
  "statoz.next.sports-web.picks.v1",
  "statoz.next.sports-web.footballchess.v1",
  "statoz.next.sports-web.quiz.v1",
  "statoz.next.sports-web.shootout.v1",
  "statoz.next.sports-web.tennis.v1",
  "statoz.next.sports-web.finalover.v1",
  "statoz.next.sports-web.pitch-duel.v1",
  "statoz.next.sports-web.hoopduel.v1",
  "statoz.next.sports-web.guessplayer.v1",
  "statoz.next.sports-web.streaks.v1",
  "statoz.next.sports-web.retro-circuit:v1",
  "statoz.next.sports-web.retro-football:v1",
  "statoz.next.sports-web.retro-innings:v1",
  "statoz.next.sports-web.retro-hoops.v1",
] as const;

const snapshots: Record<Exclude<AuthStatus, "authenticated">, AuthSessionSnapshot> = {
  hydrating: Object.freeze({ status: "hydrating", isAuthenticated: false, email: null, needsOnboarding: false }),
  guest: Object.freeze({ status: "guest", isAuthenticated: false, email: null, needsOnboarding: false }),
};

const listeners = new Set<() => void>();
let memoryRaw: string | null = null;

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(storageKey);
  } catch {
    return memoryRaw;
  }
}

let cachedRaw: string | null | undefined;
let cachedSnapshot: AuthSessionSnapshot = snapshots.guest;

type AccountDirectory = Record<string, { onboardingComplete: boolean }>;

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function readDirectory(): AccountDirectory {
  try {
    const raw = window.localStorage.getItem(accountDirectoryKey);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const record = parsed as Record<string, unknown>;
    if (record.version !== 1 || !record.accounts || typeof record.accounts !== "object") return {};
    const accounts: AccountDirectory = {};
    for (const [email, value] of Object.entries(record.accounts as Record<string, unknown>)) {
      if (value && typeof value === "object") {
        accounts[email] = { onboardingComplete: (value as Record<string, unknown>).onboardingComplete === true };
      }
    }
    return accounts;
  } catch {
    return {};
  }
}

function writeDirectory(accounts: AccountDirectory): void {
  try {
    window.localStorage.setItem(accountDirectoryKey, JSON.stringify({ version: 1, accounts }));
  } catch {
    // The current tab can still carry its session if browser storage is blocked.
  }
}

function accountBackupKey(email: string, key: string): string {
  return `statoz.next.sports-web.account.${encodeURIComponent(email)}.${key.slice("statoz.next.sports-web.".length)}`;
}

function readActiveDataOwner(): string | null {
  try {
    const value = window.localStorage.getItem(activeDataOwnerKey);
    return value ? normalizeEmail(value) : null;
  } catch {
    return null;
  }
}

function switchPlayerData(nextEmail: string): void {
  const previousEmail = readActiveDataOwner();
  if (previousEmail === nextEmail) return;

  try {
    if (previousEmail) {
      for (const key of playerStorageKeys) {
        const raw = window.localStorage.getItem(key);
        const backupKey = accountBackupKey(previousEmail, key);
        if (raw === null) window.localStorage.removeItem(backupKey);
        else window.localStorage.setItem(backupKey, raw);
      }
    }

    for (const key of playerStorageKeys) {
      const raw = window.localStorage.getItem(accountBackupKey(nextEmail, key));
      if (raw === null) window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, raw);
    }
    window.localStorage.setItem(activeDataOwnerKey, nextEmail);
  } catch {
    // Without localStorage, the in-memory demo cannot persist accounts anyway.
  }
}

function notifyPlayerStores(): void {
  if (typeof window === "undefined") return;
  // Existing feature stores already treat a null storage key as a full refresh.
  window.dispatchEvent(new StorageEvent("storage", { key: null }));
}

function snapshotFromRaw(raw: string | null): AuthSessionSnapshot {
  if (!raw) return snapshots.guest;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return snapshots.guest;
    const record = parsed as Record<string, unknown>;
    const email = typeof record.email === "string" ? normalizeEmail(record.email) : "";
    if (record.version !== 2 || record.authenticated !== true || !email) return snapshots.guest;
    return {
      status: "authenticated",
      isAuthenticated: true,
      email,
      needsOnboarding: readDirectory()[email]?.onboardingComplete !== true,
    };
  } catch {
    return snapshots.guest;
  }
}

function getSnapshot(): AuthSessionSnapshot {
  const raw = readRaw();
  if (raw === cachedRaw) return cachedSnapshot;
  cachedRaw = raw;
  cachedSnapshot = snapshotFromRaw(raw);
  return cachedSnapshot;
}

function getServerSnapshot(): AuthSessionSnapshot {
  return snapshots.hydrating;
}

function notify(): void {
  for (const listener of listeners) listener();
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);

  const onStorage = (event: StorageEvent) => {
    if (event.key !== storageKey && event.key !== null) return;
    memoryRaw = event.key === storageKey ? event.newValue : null;
    cachedRaw = undefined;
    onChange();
  };

  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function useAuthSession(): AuthSessionSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function signInLocal(emailInput: string): AuthSessionSnapshot {
  const email = normalizeEmail(emailInput);
  switchPlayerData(email);
  const accounts = readDirectory();
  if (!accounts[email]) writeDirectory({ ...accounts, [email]: { onboardingComplete: false } });

  const raw = JSON.stringify({ version: 2, authenticated: true, email });
  memoryRaw = raw;
  try {
    window.localStorage.setItem(storageKey, raw);
  } catch {
    // A blocked store keeps the demo session alive in this tab until reload.
  }
  cachedRaw = undefined;
  notifyPlayerStores();
  notify();
  return getSnapshot();
}

/** Marks only the signed-in email as set up; profile data itself stays feature-owned. */
export function completeOnboarding(): void {
  const session = getSnapshot();
  if (!session.email) return;
  const accounts = readDirectory();
  writeDirectory({ ...accounts, [session.email]: { onboardingComplete: true } });
  cachedRaw = undefined;
  notify();
}

export function signOut(): void {
  memoryRaw = null;
  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // The in-memory fallback is already cleared.
  }
  cachedRaw = undefined;
  notifyPlayerStores();
  notify();
}

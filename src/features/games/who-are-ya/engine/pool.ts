import type { PlayerCard } from "@/domain/cards";
import { allPlayerCards } from "@/features/packs/data/catalog";

import {
  basketballGuessTimelines,
  cricketGuessTimelines,
  footballGuessTimelines,
  type GuessPlayerTimeline,
} from "../../guess-player/data/timelines";

/**
 * Who Are Ya's players and the clues each one gives away.
 *
 * Every attribute comes from content the app already ships and curates: the
 * card catalogue (nation or team, position, StatOz rating) and the Guess the
 * Player career routes (clubs and the year of each move). Nothing here is a
 * new fact, so the game can never contradict another screen in the app.
 *
 * Motorsport and tennis have no career routes yet, so they are not covered
 * until they do; a three-clue version would not be a fair puzzle.
 */

import type { WhoAreYaSport } from "../constants";

export { isWhoAreYaSport, whoAreYaSports, type WhoAreYaSport } from "../constants";

/** How a clue compares. `group` values match when equal, near when they share a group. */
export type AttributeKind =
  | { type: "text"; nearGroup?: (value: string) => string | null; nearOverlap?: boolean }
  | { type: "number"; nearWithin: number };

export type AttributeSpec = {
  key: string;
  label: string;
  kind: AttributeKind;
};

export type WhoAthlete = {
  id: string;
  name: string;
  /** Text clues are strings; slash-separated text means several values (positions). */
  values: Record<string, string | number>;
  /** Every club or team on the career route, for the CLUB clue's "played there" near-miss. */
  clubs: string[];
};

/* ---- Groupings ----------------------------------------------------------- */

/** Continent for the football nations in the pool. Unknown codes never count as near. */
const continents: Record<string, string> = {
  ARG: "South America", BRA: "South America", URU: "South America", COL: "South America", CHI: "South America",
  POR: "Europe", BEL: "Europe", ENG: "Europe", FRA: "Europe", ESP: "Europe", GER: "Europe", NED: "Europe",
  CRO: "Europe", ITA: "Europe", DEN: "Europe", CZE: "Europe", GBR: "Europe", RUS: "Europe",
  USA: "North America", CAN: "North America", MEX: "North America",
  JPN: "Asia", KOR: "Asia", IND: "Asia", AUS: "Oceania",
};

/** NBA conference by team code. */
const conferences: Record<string, string> = {
  ATL: "East", BOS: "East", BKN: "East", CHA: "East", CHI: "East", CLE: "East", DET: "East", IND: "East",
  MIA: "East", MIL: "East", NYK: "East", ORL: "East", PHI: "East", TOR: "East", WAS: "East",
  DAL: "West", DEN: "West", GSW: "West", HOU: "West", LAC: "West", LAL: "West", MEM: "West", MIN: "West",
  NOP: "West", OKC: "West", PHX: "West", POR: "West", SAC: "West", SAS: "West", UTA: "West",
};

/* ---- Per-sport clue sets -------------------------------------------------- */

const debut: AttributeSpec = { key: "debut", label: "DEBUT", kind: { type: "number", nearWithin: 2 } };
const clubsCount = (label: string): AttributeSpec => ({ key: "clubs", label, kind: { type: "number", nearWithin: 1 } });
const rating: AttributeSpec = { key: "ovr", label: "OVR", kind: { type: "number", nearWithin: 2 } };

export const attributeSpecs: Record<WhoAreYaSport, AttributeSpec[]> = {
  football: [
    { key: "nation", label: "NATION", kind: { type: "text", nearGroup: (code) => continents[code] ?? null } },
    { key: "position", label: "POS", kind: { type: "text", nearOverlap: true } },
    { key: "club", label: "CLUB", kind: { type: "text" } },
    debut,
    clubsCount("CLUBS"),
    rating,
  ],
  cricket: [
    { key: "team", label: "IPL", kind: { type: "text" } },
    { key: "position", label: "ROLE", kind: { type: "text" } },
    debut,
    clubsCount("TEAMS"),
    rating,
  ],
  basketball: [
    { key: "team", label: "TEAM", kind: { type: "text", nearGroup: (code) => conferences[code] ?? null } },
    { key: "position", label: "POS", kind: { type: "text", nearOverlap: true } },
    debut,
    clubsCount("TEAMS"),
    rating,
  ],
};

/* ---- Building the pool ---------------------------------------------------- */

const timelines: Record<WhoAreYaSport, GuessPlayerTimeline[]> = {
  football: footballGuessTimelines,
  cricket: cricketGuessTimelines,
  basketball: basketballGuessTimelines,
};

function athleteFrom(sport: WhoAreYaSport, timeline: GuessPlayerTimeline, card: PlayerCard): WhoAthlete {
  const clubs = [...new Set(timeline.career.map((spell) => spell.clubName))];
  const firstYear = timeline.career[0]?.startYear ?? 0;
  const values: Record<string, string | number> = {
    position: card.position,
    debut: firstYear,
    clubs: clubs.length,
    ovr: card.rating,
  };
  if (sport === "football") {
    values.nation = card.countryCode;
    values.club = timeline.career.at(-1)?.clubName ?? "";
  } else {
    // Cricket and basketball cards carry the franchise in the country fields.
    values.team = card.countryCode;
  }
  return { id: card.id, name: card.name, values, clubs };
}

const cache = new Map<WhoAreYaSport, WhoAthlete[]>();

/** Every player with both a card and a career route, in a stable order. */
export function poolFor(sport: WhoAreYaSport): WhoAthlete[] {
  const cached = cache.get(sport);
  if (cached) return cached;
  const cards = new Map(allPlayerCards.map((card) => [card.name, card]));
  const pool = timelines[sport]
    .map((timeline) => {
      const card = cards.get(timeline.playerName);
      return card && timeline.career.length > 0 ? athleteFrom(sport, timeline, card) : null;
    })
    .filter((athlete): athlete is WhoAthlete => athlete !== null)
    .sort((a, b) => a.id.localeCompare(b.id));
  cache.set(sport, pool);
  return pool;
}

/** Display text for a clue value, e.g. a team code or a year. */
export function displayValue(spec: AttributeSpec, value: string | number | undefined): string {
  if (value === undefined || value === "") return "—";
  return String(value);
}

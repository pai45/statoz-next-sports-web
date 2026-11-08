import type { PitchDuelScenario } from "../types";

/** The seven briefing cards from Flutter's live Pitch Duel pool. */
export const pitchDuelScenarios: PitchDuelScenario[] = [
  {
    id: "sc1",
    title: "Counter Attack",
    description: "Quick transition, spaces open up",
    attackBonus: 8,
    defenseBonus: 3,
    icon: "directions_run",
  },
  {
    id: "sc2",
    title: "1v1 Final Third",
    description: "Face to face with the last defender",
    attackBonus: 5,
    defenseBonus: 5,
    icon: "my_location",
  },
  {
    id: "sc3",
    title: "Set Piece Chance",
    description: "Free kick from a dangerous position",
    attackBonus: 6,
    defenseBonus: 6,
    icon: "sports_soccer",
  },
  {
    id: "sc4",
    title: "Last Minute Pressure",
    description: "Everything on the line, final push",
    attackBonus: 10,
    defenseBonus: 2,
    icon: "timer",
  },
  {
    id: "sc5",
    title: "Box Defense",
    description: "Packed defense, tight spaces",
    attackBonus: 2,
    defenseBonus: 10,
    icon: "grid_view",
  },
  {
    id: "sc6",
    title: "Wide Break",
    description: "Overlapping run down the flank",
    attackBonus: 7,
    defenseBonus: 4,
    icon: "open_in_full",
  },
  {
    id: "sc7",
    title: "Penalty Box Chaos",
    description: "Scramble in the box, anything goes",
    attackBonus: 8,
    defenseBonus: 8,
    icon: "shuffle",
  },
];

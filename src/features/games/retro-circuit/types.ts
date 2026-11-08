/** Portable runtime contracts. No app stores, navigation, React or Three.js. */
export const BUILD_VERSION = "0.3.0";
export const RULES_VERSION = 1;
export const STEP = 1 / 60;
export type TrackId = "coast" | "desert" | "city";
export type VehicleId = "vector" | "comet" | "kestrel" | "nomad";
export type RacePhase = "ready" | "countdown" | "racing" | "paused" | "finished" | "dnf";
export type RaceInput = { left: boolean; right: boolean; throttle: boolean; brake: boolean; nitro: boolean };
export const neutralInput = (): RaceInput => ({ left: false, right: false, throttle: false, brake: false, nitro: false });
export type TrackSector = { length: number; curve: number; scenery: "palms" | "rocks" | "buildings" };
export type TrackDefinition = { id: TrackId; name: string; description: string; sectors: readonly TrackSector[]; length: number; laps: 3; pit: { start: number; end: number }; sky: string; ground: string; verge: string; horizon: string };
export type VehicleDefinition = { id: VehicleId; name: string; role: string; maxSpeed: number; acceleration: number; grip: number; fuelRate: number; color: string; silhouette: "coupe" | "wedge" | "hatch" | "tourer" };
export type CarState = { id: number; vehicle: VehicleId; distance: number; x: number; speed: number; fuel: number; nitro: number; boost: number; collisionCooldown: number; finishedAt: number | null; dnf: boolean; pitStops: number; inPit: boolean; pitRequested: boolean; pitFilled: boolean; targetX: number; skill: number; checkpoint: number; lapStart: number; lapTimes: number[] };
export type RaceEvent = { type: "countdown" | "go" | "nitro" | "collision" | "pit" | "refuel" | "skid" | "low-fuel" | "lap" | "finish" | "dnf"; time: number };
export type RaceResult = { schemaVersion: 1; sessionId: string; gameId: "retro-circuit"; buildVersion: string; rulesVersion: number; trackId: TrackId; vehicleId: VehicleId; outcome: "finished" | "dnf"; position: number; fieldSize: 20; elapsed: number; laps: number[]; pitStops: number; seed: number };
export type RaceSnapshot = { phase: RacePhase; elapsed: number; countdown: number; player: CarState; cars: CarState[]; position: number; lap: number; notice: string; result: RaceResult | null };
export type RuntimeOptions = { trackId: TrackId; vehicleId: VehicleId; seed: number; sessionId: string; practice?: boolean; autoThrottle?: boolean };

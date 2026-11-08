import {BUILD_VERSION,RULES_VERSION} from "./types";
/** The artwork is embedded from the same authored source as this pinned registered pack. */
export const retroCircuitDefinition={
  gameId:"retro-circuit",sportId:"motorsport",runtimeApiVersion:1,
  gameVersion:BUILD_VERSION,rulesVersion:RULES_VERSION,saveVersion:1,
  orientation:"landscape",inputs:["keyboard","multitouch"],
  assetPack:{id:"retro-circuit-handheld-v3",version:"v-0778ba37ae229595f99a88ac",delivery:"embedded-authored-source",approval:"reference"},
} as const;

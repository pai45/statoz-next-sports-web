import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    // Generated standalone game bundle, including vendored React/Three.js.
    // Its authored TypeScript is validated in the game workspace.
    "public/games/**",
    "public/embedded-games/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;

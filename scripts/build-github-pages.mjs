import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawn } from "node:child_process";

import { normalizeStaticSegments } from "./normalize-static-segments.mjs";

const root = process.cwd();
const nextBin = join(root, "node_modules", "next", "dist", "bin", "next");
const env = {
  ...process.env,
  GITHUB_PAGES: "true",
  NEXT_PUBLIC_BASE_PATH:
    process.env.NEXT_PUBLIC_BASE_PATH && process.env.NEXT_PUBLIC_BASE_PATH !== "/"
      ? process.env.NEXT_PUBLIC_BASE_PATH
      : "/statoz-sports-web",
};

const child = spawn(process.execPath, [nextBin, "build"], {
  cwd: root,
  env,
  stdio: "inherit",
});

child.on("exit", async (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  if (code !== 0) {
    process.exit(code ?? 1);
  }

  const outDir = join(root, "out");
  if (existsSync(outDir)) {
    try {
      const result = await normalizeStaticSegments(outDir);
      console.log(`Static segment aliases: ${result.copied} added, ${result.segments} inspected.`);
    } catch (error) {
      console.error(error);
      process.exitCode = 1;
      return;
    }
    writeFileSync(join(outDir, ".nojekyll"), "");
  }
});

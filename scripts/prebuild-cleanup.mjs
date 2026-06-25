import { rmSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, "..");
const builderOutputDir = resolve(projectRoot, "release", "build");

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

async function removeWithRetries(targetPath, retries = 6) {
  if (!existsSync(targetPath)) {
    return;
  }

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      rmSync(targetPath, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
      return;
    } catch (error) {
      if (attempt === retries) {
        console.warn(
          `[prebuild-cleanup] Failed to remove ${targetPath}; the build will continue with a staging folder if needed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        return;
      }
      await sleep(500 * attempt);
    }
  }
}

await removeWithRetries(builderOutputDir);

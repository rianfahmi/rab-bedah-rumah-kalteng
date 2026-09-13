import { copyFileSync, mkdirSync, readdirSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const volume = process.env.RAILWAY_VOLUME_MOUNT_PATH || process.env.DATA_DIR;
const persistenceRoot = volume
  ? path.join(volume, "rab-d1")
  : path.join(root, ".railway-data");
mkdirSync(persistenceRoot, { recursive: true });
const generatedMigrations = path.join(root, "dist/server/migrations");
mkdirSync(generatedMigrations, { recursive: true });
for (const entry of readdirSync(path.join(root, "migrations"))) {
  if (entry.endsWith(".sql")) {
    copyFileSync(path.join(root, "migrations", entry), path.join(generatedMigrations, entry));
  }
}

const wrangler = fileURLToPath(new URL("../node_modules/wrangler/bin/wrangler.js", import.meta.url));
const base = ["--import", "./scripts/sites-env.mjs", wrangler];
const run = (args) => {
  const result = spawnSync(process.execPath, [...base, ...args], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
};

// D1 migrations are tracked by Wrangler, so this safely initializes a new
// persistent volume and only applies new schema files on later deploys.
run([
  "d1", "migrations", "apply", "site-creator-d1",
  "--config", "dist/server/wrangler.json",
  "--local", "--persist-to", persistenceRoot,
]);

run([
  "dev", "--config", "dist/server/wrangler.json",
  "--local", "--persist-to", persistenceRoot,
  "--ip", "0.0.0.0",
  "--port", process.env.PORT || "3000",
  "--inspector-port", "0",
]);

#!/usr/bin/env node
/**
 * Fraud Radar Phase 9 — write the template-registry JSON
 * export (PHASE9 §3.2) beside the registry module:
 *   src/lib/fraud-radar/reports/report-templates.json
 *
 * The registry of record is the TS module (templates.ts);
 * this script bundles registry-export.ts with the repo's
 * esbuild and writes its registryExportJson() output. The
 * committed JSON is pinned against the builder by
 * templates.test.ts, so running (or not running) this script
 * can never let the export drift silently — a stale file
 * fails the suite.
 *
 * Usage: node scripts/fraud-radar-report-templates.mjs
 */
import { build } from "esbuild";
import { writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const entry = path.join(root, "src/lib/fraud-radar/reports/registry-export.ts");

const result = await build({
  entryPoints: [entry],
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
// Import the bundle from a data URL: no temp file is needed.
const dataUrl = `data:text/javascript;base64,${Buffer.from(
  result.outputFiles[0].text,
  "utf8",
).toString("base64")}`;
const mod = await import(dataUrl);
if (process.argv.includes("--stdout")) {
  process.stdout.write(mod.registryExportJson());
} else {
  const target = path.join(
    root,
    "src/lib/fraud-radar/reports/report-templates.json",
  );
  writeFileSync(target, mod.registryExportJson(), "utf8");
  console.log(`wrote ${target}`);
}

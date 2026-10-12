#!/usr/bin/env node
// Operator wrapper for the Studio AI (Cosmo) fulfillment endpoints.
//
// Cosmo fulfills Studio AI jobs out-of-band: affiliates order in the
// Studio, jobs wait in the queue, and the operator (a human driving
// Cosmo, or the Cosmo cron) pulls the queue and posts results back.
//
// Usage:
//   node scripts/studio-ai-fulfill.mjs queue
//   node scripts/studio-ai-fulfill.mjs complete <jobId> --text "the result"
//   node scripts/studio-ai-fulfill.mjs complete <jobId> --text-file result.txt
//   node scripts/studio-ai-fulfill.mjs complete <jobId> --image art.jpg [--text "optional caption"]
//   node scripts/studio-ai-fulfill.mjs fail <jobId> [--error "why it can't be done"]
//
// Environment:
//   STUDIO_AI_SECRET   bearer secret guarding the internal endpoints (required)
//   WORLDEYE_APP_URL   app base URL (default http://localhost:3000)
import { readFile } from "node:fs/promises";

const base = (process.env.WORLDEYE_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const secret = process.env.STUDIO_AI_SECRET;

if (!secret) {
  console.error("STUDIO_AI_SECRET is not set — the internal endpoints are guarded by it.");
  process.exit(2);
}

async function call(path, init) {
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(`HTTP ${res.status}: ${JSON.stringify(body)}`);
    process.exit(1);
  }
  return body;
}

function argValue(args, flag) {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
}

const [command, jobId, ...rest] = process.argv.slice(2);

if (command === "queue") {
  const out = await call("/api/internal/studio-ai/queue");
  console.log(JSON.stringify(out, null, 2));
} else if (command === "complete" && jobId) {
  const payload = {};
  const textFile = argValue(rest, "--text-file");
  if (textFile) payload.resultText = await readFile(textFile, "utf8");
  const text = argValue(rest, "--text");
  if (text) payload.resultText = text;
  const image = argValue(rest, "--image");
  if (image) {
    payload.resultImageBase64 = (await readFile(image)).toString("base64");
  }
  if (!payload.resultText && !payload.resultImageBase64) {
    console.error("Nothing to deliver: pass --text, --text-file, and/or --image.");
    process.exit(2);
  }
  const out = await call(`/api/internal/studio-ai/${encodeURIComponent(jobId)}/complete`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  console.log(JSON.stringify(out, null, 2));
} else if (command === "fail" && jobId) {
  const out = await call(`/api/internal/studio-ai/${encodeURIComponent(jobId)}/fail`, {
    method: "POST",
    body: JSON.stringify({ error: argValue(rest, "--error") }),
  });
  console.log(JSON.stringify(out, null, 2));
} else {
  console.error(
    "Usage: queue | complete <jobId> [--text T | --text-file F] [--image IMG] | fail <jobId> [--error E]",
  );
  process.exit(2);
}

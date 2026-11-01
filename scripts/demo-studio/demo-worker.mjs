#!/usr/bin/env node
// AI Demo Studio worker — runs on Cosmo's VM, never in the web server.
//
// Claims DemoJobs from the app (bearer-guarded internal API), records
// the real site with a headless browser, renders the finished video
// with ffmpeg, uploads raw + edited + poster to Vercel Blob, and
// completes the job so the video lands in the admin media library as a
// draft. Any failure is reported to the job verbatim — a demo that
// could not be produced is never replaced with substitute footage.
//
// Usage:
//   node demo-worker.mjs              claim loop (idle-polls every 20s)
//   node demo-worker.mjs --once       claim and run a single job, then exit
//   node demo-worker.mjs --local plan.json [--title "…"]
//                                     run one plan file locally, no API;
//                                     outputs land in ../output/
//
// Environment:
//   DEMO_STUDIO_SECRET   bearer for the internal endpoints (preferred)
//   STUDIO_AI_SECRET     fallback — same operator trust boundary
//   WORLDEYE_APP_URL     app base URL (default https://worldeye.app)

import { readFile, readdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { upload } from "@vercel/blob/client";
import { recordPlan } from "./engine.mjs";
import { renderDemo } from "./render.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const APP_URL = (process.env.WORLDEYE_APP_URL ?? "https://worldeye.app").replace(/\/+$/, "");
const SECRET = process.env.DEMO_STUDIO_SECRET || process.env.STUDIO_AI_SECRET;
const log = (...a) => console.log(new Date().toISOString(), ...a);

async function api(path, init) {
  const res = await fetch(`${APP_URL}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${SECRET}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`HTTP ${res.status} ${path}: ${JSON.stringify(body).slice(0, 300)}`);
  return body;
}

async function uploadForJob(jobId, pathname, filePath, contentType) {
  const data = await readFile(filePath);
  const blob = await upload(pathname, data, {
    access: "public",
    contentType,
    handleUploadUrl: `${APP_URL}/api/internal/demo-studio/upload-token`,
    headers: { Authorization: `Bearer ${SECRET}` },
    multipart: data.length > 4_500_000,
  });
  return blob.url;
}

async function runJob(job) {
  const workDir = join(HERE, "work", job.id);
  const videoDir = join(workDir, "video");
  log(`job ${job.id}: recording — ${job.plan.title}`);
  await api(`/api/internal/demo-studio/${job.id}/progress`, {
    method: "POST", body: JSON.stringify({ status: "recording", progress: "Recording the live site" }),
  }).catch(() => {});
  const { marks, state } = await recordPlan({
    appUrl: APP_URL, plan: job.plan, orientation: job.orientation, videoDir, log,
  });
  const rawName = (await readdir(videoDir)).find((f) => f.endsWith(".webm"));
  if (!rawName) throw new Error("recording produced no video file");
  const rawPath = join(videoDir, rawName);

  await api(`/api/internal/demo-studio/${job.id}/progress`, {
    method: "POST", body: JSON.stringify({ status: "rendering", progress: "Editing and rendering" }),
  }).catch(() => {});
  const { masterPath, posterPath, durationSec } = await renderDemo({
    rawPath, marks, title: job.plan.title, orientation: job.orientation, workDir, log,
  });

  log(`job ${job.id}: uploading`);
  const [videoUrl, rawUrl, posterUrl] = await Promise.all([
    uploadForJob(job.id, `demo-studio/${job.id}/master.mp4`, masterPath, "video/mp4"),
    uploadForJob(job.id, `demo-studio/${job.id}/raw.webm`, rawPath, "video/webm"),
    uploadForJob(job.id, `demo-studio/${job.id}/poster.jpg`, posterPath, "image/jpeg"),
  ]);
  const done = await api(`/api/internal/demo-studio/${job.id}/complete`, {
    method: "POST",
    body: JSON.stringify({
      title: job.plan.title,
      description: job.plan.description,
      features: job.plan.features,
      durationSec, videoUrl, rawUrl, posterUrl,
    }),
  });
  log(`job ${job.id}: complete → video ${done.videoId} (camera: ${state.cameraTitle ?? "n/a"})`);
  await rm(workDir, { recursive: true, force: true }).catch(() => {});
}

async function claimAndRun() {
  const { job } = await api("/api/internal/demo-studio/queue");
  if (!job) return false;
  try {
    await runJob(job);
  } catch (e) {
    log(`job ${job.id}: FAILED — ${e.message}`);
    await api(`/api/internal/demo-studio/${job.id}/fail`, {
      method: "POST", body: JSON.stringify({ error: String(e.message ?? e) }),
    }).catch(() => {});
  }
  return true;
}

const args = process.argv.slice(2);

if (args[0] === "--local") {
  const plan = JSON.parse(await readFile(args[1], "utf8"));
  const titleIdx = args.indexOf("--title");
  if (titleIdx >= 0) plan.title = args[titleIdx + 1];
  const outDir = join(HERE, "..", "output", "local-" + Date.now());
  const videoDir = join(outDir, "video");
  const { marks, state } = await recordPlan({ appUrl: APP_URL, plan, orientation: plan.orientation ?? "landscape", videoDir, log });
  const rawName = (await readdir(videoDir)).find((f) => f.endsWith(".webm"));
  const { masterPath, posterPath, durationSec } = await renderDemo({
    rawPath: join(videoDir, rawName), marks, title: plan.title, orientation: plan.orientation ?? "landscape", workDir: outDir, log,
  });
  log(`LOCAL DONE master=${masterPath} poster=${posterPath} duration=${durationSec.toFixed(1)}s camera=${state.cameraTitle ?? "n/a"} feedVerified=${state.feedVerified}`);
} else {
  if (!SECRET) {
    console.error("Neither DEMO_STUDIO_SECRET nor STUDIO_AI_SECRET is set — the internal endpoints are guarded by one of them.");
    process.exit(2);
  }
  if (!existsSync(join(HERE, "node_modules"))) {
    console.error("worker dependencies missing (node_modules) — run npm install in the worker directory.");
    process.exit(2);
  }
  if (args[0] === "--once") {
    const ran = await claimAndRun();
    log(ran ? "one job processed" : "queue empty");
  } else {
    log("Demo Studio worker — claim loop started");
    for (;;) {
      const ran = await claimAndRun().catch((e) => { log("claim error:", e.message); return false; });
      if (!ran) await new Promise((r) => setTimeout(r, 20000));
    }
  }
}

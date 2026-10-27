#!/usr/bin/env node
/**
 * WorldEye Ambient — YouTube relay.
 *
 * Runs on YOUR always-on machine (it cannot run on web hosting:
 * streaming is a continuous upload). It fetches your personal
 * playlist from WorldEye — your own YouTube stream key plus the
 * cameras cleared for redistribution — then pushes the Ambient show
 * to YOUR YouTube channel with ffmpeg, cycling cameras on an
 * interval, forever, restarting dead feeds as it goes.
 *
 * Config (environment):
 *   AMBIENT_RELAY_TOKEN   required — from worldeye.app/ambient/stream
 *   WORLDEYE_URL          default https://worldeye.app
 *   AMBIENT_SCENE_SECONDS default 600 — seconds per camera scene
 *   AMBIENT_MAXRATE_KBPS  default 2500 — video bitrate ceiling
 *
 * Requires: Node 18+ and ffmpeg on PATH (with libx264 + drawtext).
 */
import { spawn, spawnSync } from "node:child_process";

const BASE = (process.env.WORLDEYE_URL ?? "https://worldeye.app").replace(/\/$/, "");
const TOKEN = process.env.AMBIENT_RELAY_TOKEN ?? "";
const SCENE_SECONDS = Math.max(30, Number(process.env.AMBIENT_SCENE_SECONDS ?? 600) || 600);
const MAXRATE = Math.max(400, Number(process.env.AMBIENT_MAXRATE_KBPS ?? 2500) || 2500);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function log(...args) {
  console.log(`[ambient-relay ${new Date().toISOString()}]`, ...args);
}

if (!TOKEN) {
  console.error("AMBIENT_RELAY_TOKEN is not set — get it at https://worldeye.app/ambient/stream");
  process.exit(1);
}
const probe = spawnSync("ffmpeg", ["-hide_banner", "-version"], { encoding: "utf8" });
if (probe.status !== 0) {
  console.error("ffmpeg was not found on PATH. Install ffmpeg (with libx264) first.");
  process.exit(1);
}

/** drawtext escaping: backslash, colon, quote and % are special. */
function dt(text) {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "’")
    .replace(/%/g, "\\%");
}

/* A font drawtext can rely on, if a common one exists. fontconfig
 * builds resolve a bare font name too, so this is a preference, not
 * a requirement. */
import { existsSync } from "node:fs";
const FONT_CANDIDATES = [
  "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
  "/usr/share/fonts/TTF/DejaVuSans-Bold.ttf",
  "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
  "C:\\Windows\\Fonts\\arialbd.ttf",
];
const FONT = FONT_CANDIDATES.find((p) => existsSync(p));
const fontArg = FONT ? `fontfile='${FONT}':` : "";

function videoFilter(camera, overlay) {
  const place = [camera.name, [camera.city, camera.country].filter(Boolean).join(", ")]
    .filter(Boolean)
    .join(" — ");
  return [
    `drawtext=${fontArg}text='${dt(overlay)}':fontcolor=white:fontsize=26:borderw=2:bordercolor=black@0.6:x=w-tw-24:y=24`,
    `drawtext=${fontArg}text='${dt(place)}':fontcolor=white@0.92:fontsize=30:borderw=2:bordercolor=black@0.6:x=24:y=h-th-24`,
    "scale=1280:720:force_original_aspect_ratio=decrease",
    "pad=1280:720:(ow-iw)/2:(oh-ih)/2",
    "fps=30",
  ].join(",");
}

/** Stream one camera to YouTube for up to SCENE_SECONDS. Resolves
 *  when ffmpeg exits (dead feed) or the scene timer fires. */
function streamScene(playlist, camera) {
  return new Promise((resolve) => {
    const target = `${playlist.stream.rtmpUrl}/${playlist.stream.key}`;
    const args = [
      "-hide_banner", "-loglevel", "warning",
      "-reconnect", "1", "-reconnect_streamed", "1", "-reconnect_delay_max", "5",
      "-i", camera.url,
      "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
      "-map", "0:v:0", "-map", "1:a:0",
      "-vf", videoFilter(camera, playlist.overlay),
      "-c:v", "libx264", "-preset", "veryfast",
      "-maxrate", `${MAXRATE}k`, "-bufsize", `${MAXRATE * 2}k`,
      "-pix_fmt", "yuv420p", "-g", "60",
      "-c:a", "aac", "-b:a", "128k", "-ar", "44100",
      "-f", "flv", target,
    ];
    log(`scene: ${camera.name} (${camera.city || camera.country || "unknown"}) for up to ${SCENE_SECONDS}s`);
    const ff = spawn("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] });
    let errTail = "";
    ff.stderr.on("data", (d) => {
      errTail = (errTail + d.toString()).slice(-800);
    });
    const timer = setTimeout(() => {
      log("scene time up — rotating");
      ff.kill("SIGINT");
    }, SCENE_SECONDS * 1000);
    ff.on("exit", (code, signal) => {
      clearTimeout(timer);
      if (code !== 0 && signal !== "SIGINT") {
        log(`ffmpeg exited early (code ${code}) — feed likely dead, moving on. Tail: ${errTail.trim().split("\n").pop() ?? ""}`);
      }
      resolve();
    });
    ff.on("error", (err) => {
      clearTimeout(timer);
      log("ffmpeg spawn failed:", err.message);
      resolve();
    });
  });
}

async function fetchPlaylist() {
  const res = await fetch(`${BASE}/api/ambient/relay/playlist`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`playlist fetch failed: HTTP ${res.status} ${body.slice(0, 200)}`);
  }
  return res.json();
}

async function main() {
  for (;;) {
    let playlist;
    try {
      playlist = await fetchPlaylist();
    } catch (err) {
      log(err.message, "— retrying in 30s");
      await sleep(30_000);
      continue;
    }
    if (!playlist.cameras?.length) {
      log("playlist is empty (no cleared cameras available) — retrying in 60s");
      await sleep(60_000);
      continue;
    }
    log(`playlist: ${playlist.cameras.length} cleared cameras`);
    for (const camera of playlist.cameras) {
      await streamScene(playlist, camera);
      await sleep(1_000);
    }
    // Loop: refetch for a fresh shuffle (and a rotated key, if any).
  }
}

main().catch((err) => {
  log("fatal:", err);
  process.exit(1);
});

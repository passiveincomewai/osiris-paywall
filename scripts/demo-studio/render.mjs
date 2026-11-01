// Demo Studio render stage — turns a raw browser recording (WebM) into
// a finished demonstration video (MP4):
//   [2.2s title card: WorldEye logo + title] → [trimmed real footage]
//   → [1.8s end card: logo + worldeye.app]
// Trimming uses the engine's step marks: the cut starts just before the
// globe finished loading (the loading screen is not the demo) and ends
// as the final step completes. No footage is altered beyond trimming —
// no overlays on the product footage itself in Phase 1, nothing is
// composited into the site UI. Silent AAC track for player compat.

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const run = promisify(execFile);

const CANVASES = {
  landscape: { w: 1440, h: 810 },
  portrait: { w: 810, h: 1440 },
  square: { w: 1080, h: 1080 },
};

async function ffprobeDuration(path) {
  const { stdout } = await run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path]);
  return parseFloat(stdout.trim());
}

async function ensureLogo(dir) {
  const logoPath = join(dir, "worldeye-header-logo.png");
  if (existsSync(logoPath)) return logoPath;
  try {
    const res = await fetch("https://worldeye.app/worldeye-header-logo.png");
    if (!res.ok) throw new Error("logo fetch " + res.status);
    await writeFile(logoPath, Buffer.from(await res.arrayBuffer()));
    return logoPath;
  } catch {
    return null; // text-only cards are an honest fallback
  }
}

function drawtext(text, size, color, y) {
  const escaped = text.replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/'/g, "’").replace(/%/g, "pct");
  return `drawtext=text='${escaped}':font='DejaVu Sans':fontsize=${size}:fontcolor=${color}:x=(w-text_w)/2:y=${y}`;
}

async function makeCard({ out, seconds, canvas, logoPath, title, subtitle }) {
  const { w, h } = canvas;
  const args = ["-y", "-f", "lavfi", "-i", `color=c=0x05080e:s=${w}x${h}:r=30:d=${seconds}`];
  let filter;
  if (logoPath) {
    args.push("-i", logoPath);
    const logoW = Math.round(w * 0.34);
    filter = `[1:v]scale=${logoW}:-1[logo];[0:v][logo]overlay=(W-w)/2:${Math.round(h * 0.3)}[bg];` +
      `[bg]${drawtext(title, Math.round(w / 26), "white", Math.round(h * 0.58))}` +
      (subtitle ? `,${drawtext(subtitle, Math.round(w / 44), "0x9fd8ef", Math.round(h * 0.68))}` : "");
  } else {
    filter = `[0:v]${drawtext(title, Math.round(w / 22), "white", Math.round(h * 0.44))}` +
      (subtitle ? `,${drawtext(subtitle, Math.round(w / 40), "0x9fd8ef", Math.round(h * 0.56))}` : "");
  }
  args.push("-filter_complex", filter, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", "30", out);
  await run("ffmpeg", args, { maxBuffer: 1 << 24 });
}

export async function renderDemo({ rawPath, marks, title, orientation = "landscape", workDir, log = () => {} }) {
  const canvas = CANVASES[orientation] ?? CANVASES.landscape;
  await mkdir(workDir, { recursive: true });
  const rawDuration = await ffprobeDuration(rawPath);
  log(`raw duration ${rawDuration.toFixed(1)}s`);

  // Trim window from step marks: begin ~1.2s before the post-load
  // dismiss step (globe just revealed), end at the "done" mark.
  const tDismiss = marks.find((m) => m.action === "dismissOverlays")?.t ?? 0;
  const tDone = marks.find((m) => m.action === "done")?.t ?? rawDuration;
  const start = Math.max(0, tDismiss - 1.2);
  const end = Math.min(rawDuration, tDone + 0.4);
  const footagePath = join(workDir, "footage.mp4");
  // Network waits on the worker's proxied connection stretch the raw
  // take; compress playback so the finished demo stays watchable
  // (target ≈38s of footage, speed capped at 4x — standard practice
  // for product walkthrough edits, and the raw file is kept as-is).
  const speed = Math.min(4, Math.max(1, (end - start) / 38));
  if (speed > 1.02) log(`footage speed-normalized ${speed.toFixed(2)}x`);
  const speedFilter = speed > 1.02 ? `setpts=PTS/${speed.toFixed(3)},` : "";
  await run("ffmpeg", [
    "-y", "-ss", start.toFixed(2), "-to", end.toFixed(2), "-i", rawPath,
    "-vf", `${speedFilter}scale=${canvas.w}:${canvas.h}:force_original_aspect_ratio=decrease,pad=${canvas.w}:${canvas.h}:(ow-iw)/2:(oh-ih)/2:color=0x05080e,fps=30`,
    "-c:v", "libx264", "-preset", "medium", "-crf", "23", "-pix_fmt", "yuv420p",
    "-an", footagePath,
  ], { maxBuffer: 1 << 24 });
  const footageDuration = await ffprobeDuration(footagePath);
  log(`footage trimmed ${start.toFixed(1)}→${end.toFixed(1)} = ${footageDuration.toFixed(1)}s`);

  const logoPath = await ensureLogo(workDir);
  const titleCard = join(workDir, "title.mp4");
  const endCard = join(workDir, "end.mp4");
  await makeCard({ out: titleCard, seconds: 2.2, canvas, logoPath, title, subtitle: "A live demonstration of the real website" });
  await makeCard({ out: endCard, seconds: 1.8, canvas, logoPath, title: "WorldEye", subtitle: "worldeye.app" });

  const listPath = join(workDir, "concat.txt");
  await writeFile(listPath, [titleCard, footagePath, endCard].map((p) => `file '${p}'`).join("\n"));
  const masterPath = join(workDir, "master.mp4");
  await run("ffmpeg", [
    "-y", "-f", "concat", "-safe", "0", "-i", listPath,
    "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
    "-c:v", "copy", "-c:a", "aac", "-b:a", "96k", "-shortest", "-movflags", "+faststart",
    masterPath,
  ], { maxBuffer: 1 << 24 });
  const durationSec = await ffprobeDuration(masterPath);

  const posterPath = join(workDir, "poster.jpg");
  const posterAt = Math.min(2.2 + footageDuration * 0.45, durationSec - 0.5);
  await run("ffmpeg", ["-y", "-ss", posterAt.toFixed(2), "-i", masterPath, "-frames:v", "1", "-q:v", "3", posterPath], { maxBuffer: 1 << 24 });

  return { masterPath, posterPath, durationSec, footageDuration };
}

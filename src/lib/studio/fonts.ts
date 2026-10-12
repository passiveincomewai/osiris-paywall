// ── Studio fonts: register the bundled brand fonts with librsvg ────────
// Spike verdict: sharp/librsvg honors the FONTCONFIG_FILE env var
// in-process. At render time we point fontconfig at a generated
// fonts.conf that includes the bundled TTFs (Inter 400/700/900 +
// JetBrains Mono 700, in src/lib/studio/fonts/files/) with
// /usr/share/fonts as a system fallback. Idempotent; any failure is
// silent — renders fall back to system fonts rather than failing.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

let configured = false;

export function ensureStudioFonts(): void {
  if (configured) return;
  // Mark first so a failure never retries (or throws) on every render.
  configured = true;
  try {
    const bundledDir = path.join(process.cwd(), "src/lib/studio/fonts/files");
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "worldeye-studio-fonts-"));
    const cacheDir = path.join(tmpDir, "cache");
    fs.mkdirSync(cacheDir, { recursive: true });
    const confPath = path.join(tmpDir, "fonts.conf");
    const conf = [
      '<?xml version="1.0"?>',
      '<!DOCTYPE fontconfig SYSTEM "fonts.dtd">',
      "<fontconfig>",
      `  <dir>${bundledDir}</dir>`,
      "  <dir>/usr/share/fonts</dir>",
      `  <cachedir>${cacheDir}</cachedir>`,
      "</fontconfig>",
      "",
    ].join("\n");
    fs.writeFileSync(confPath, conf, "utf8");
    process.env.FONTCONFIG_FILE = confPath;
  } catch {
    // Silent fallback: system fonts only.
  }
}

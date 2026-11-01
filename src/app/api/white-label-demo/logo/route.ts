// POST /api/white-label-demo/logo — logo upload for the White Label
// demo generator. The visitor is a prospect, not a signed-in user, so
// unlike the avatar route this is public — bounded instead by a per-IP
// rate limit, a 2 MB cap, an image-type allowlist AND a magic-byte
// sniff (a public endpoint never trusts the declared type). The file
// goes to Vercel Blob (the same store avatars and clip shares use)
// under white-label-logos/; the URL is only ever rendered inside the
// uploader's own preview. Nothing here accepts a remote URL — no
// hotlinking, no SSRF surface.
import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { put } from "@vercel/blob";
import { isRateLimited, clientIp } from "@/lib/password-auth";

export const runtime = "nodejs";

const MAX_BYTES = 2 * 1024 * 1024;
const TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

/** First-bytes check per format — the declared type must match the file. */
function sniffMatches(buf: Buffer, ext: string): boolean {
  if (ext === "png") {
    return buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  }
  if (ext === "jpg") {
    return buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  }
  if (ext === "gif") {
    return buf.length >= 4 && buf.subarray(0, 4).toString("ascii") === "GIF8";
  }
  if (ext === "webp") {
    return (
      buf.length >= 12 &&
      buf.subarray(0, 4).toString("ascii") === "RIFF" &&
      buf.subarray(8, 12).toString("ascii") === "WEBP"
    );
  }
  return false;
}

export async function POST(req: Request) {
  if (isRateLimited(`white-label-logo:${clientIp(req)}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many uploads from this network. Try again in an hour." },
      { status: 429 },
    );
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "Logo uploads aren't configured on this deployment yet — your preview can use a text wordmark instead." },
      { status: 503 },
    );
  }
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Attach an image file." }, { status: 400 });
  }
  const ext = TYPES[file.type];
  if (!ext) {
    return NextResponse.json({ error: "Use a PNG, JPEG, WebP or GIF image." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Logo must be 2 MB or smaller." }, { status: 413 });
  }
  const buf = Buffer.from(await file.arrayBuffer());
  if (!sniffMatches(buf, ext)) {
    return NextResponse.json(
      { error: "That file's contents don't match its image type — try a different export." },
      { status: 400 },
    );
  }
  const blob = await put(`white-label-logos/${randomBytes(10).toString("hex")}.${ext}`, buf, {
    access: "public",
    addRandomSuffix: false,
    contentType: file.type,
  });
  return NextResponse.json({ url: blob.url });
}

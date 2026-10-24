// POST /api/user/avatar — profile picture upload (item 1).
// Stores the image in Vercel Blob (the same store clip shares use)
// and points User.image at it — the field the header menu, dashboard
// and leaderboards already render. If blob storage isn't configured,
// the endpoint says so honestly instead of faking a save.
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const MAX_BYTES = 2 * 1024 * 1024;
const TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "Avatar uploads aren't configured on this deployment yet." },
      { status: 503 },
    );
  }
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Attach an image file." }, { status: 400 });
  }
  const ext = TYPES[file.type];
  if (!ext) return NextResponse.json({ error: "Use a PNG, JPEG, WebP or GIF image." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Image must be 2 MB or smaller." }, { status: 413 });

  const blob = await put(`avatars/${userId}.${ext}`, file, {
    access: "public",
    addRandomSuffix: true,
    contentType: file.type,
  });
  const user = await db.user.update({
    where: { id: userId },
    data: { image: blob.url },
    select: { image: true },
  });
  return NextResponse.json({ image: user.image });
}

// DELETE /api/user/avatar — remove the picture (back to initials).
export async function DELETE() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  await db.user.update({ where: { id: userId }, data: { image: null } });
  return NextResponse.json({ image: null });
}

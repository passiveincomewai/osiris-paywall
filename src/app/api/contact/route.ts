// POST /api/contact — public contact-form submission.
// Validates via the shared parser (src/lib/contact), rate-limits per IP
// with the same helper the auth routes use, and stores the message for
// admins in /admin/contact. No email is sent — storage + admin is the
// whole flow, and the response says only what actually happened.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isRateLimited, clientIp } from "@/lib/password-auth";
import { parseContactSubmission } from "@/lib/contact";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (isRateLimited(`contact:${clientIp(req)}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many messages from this network. Try again in an hour, or email us directly." },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = parseContactSubmission(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const msg = await db.contactMessage.create({ data: parsed.data });
  return NextResponse.json({ ok: true, id: msg.id });
}

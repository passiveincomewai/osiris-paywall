// POST /api/partners/apply — public partnership application form.
// Validates via the shared parser (src/lib/partners), rate-limits per IP
// with the same helper the auth/contact routes use, stores the
// application for admins in /admin/partnerships, and notifies the owner
// by email (best-effort — the stored row is the record, exactly like the
// fire-and-forget sends in the other public routes).
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isRateLimited, clientIp } from "@/lib/password-auth";
import {
  parsePartnershipApplication,
  partnershipApplicationEmail,
  PARTNERSHIP_OWNER_EMAIL,
} from "@/lib/partners";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (isRateLimited(`partners:${clientIp(req)}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many applications from this network. Try again in an hour, or email us directly." },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = parsePartnershipApplication(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const app = await db.partnershipApplication.create({ data: parsed.data });

  const { subject, html } = partnershipApplicationEmail(parsed.data);
  void sendEmail(PARTNERSHIP_OWNER_EMAIL, subject, html).catch(() => {});

  return NextResponse.json({ ok: true, id: app.id });
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/affiliate/admin";
import { appBaseUrl } from "@/lib/app-url";

export const runtime = "nodejs";

const RESEND_BATCH = "https://api.resend.com/emails/batch";

/** Admin-only: send a newsletter broadcast to all verified subscribers. */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
  }
  const key = process.env.AUTH_RESEND_KEY;
  if (!key) return NextResponse.json({ ok: false, error: "Email not configured (AUTH_RESEND_KEY)." }, { status: 500 });

  const { subject, html } = await req.json().catch(() => ({}));
  if (!subject || !html) {
    return NextResponse.json({ ok: false, error: "Subject and content are required." }, { status: 400 });
  }
  const subs = await db.newsletterSubscriber.findMany({
    where: { verified: true },
    select: { email: true, unsubToken: true },
  });
  if (subs.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  const from = process.env.EMAIL_FROM ?? "WorldEye <onboarding@resend.dev>";
  const base = appBaseUrl();
  let sent = 0;
  // Resend batch limit: 100 per request.
  for (let i = 0; i < subs.length; i += 100) {
    const chunk = subs.slice(i, i + 100).map((s) => ({
      from,
      to: s.email,
      subject: String(subject).slice(0, 200),
      html: `${html}<br><br><p style="font-size:12px;color:#71717a;"><a href="${base}/api/newsletter/unsubscribe?token=${s.unsubToken}" style="color:#71717a;">Unsubscribe</a></p>`,
    }));
    const res = await fetch(RESEND_BATCH, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(chunk),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return NextResponse.json({ ok: false, error: `Resend rejected batch: ${res.status} ${body.slice(0, 200)}`, sent }, { status: 502 });
    }
    sent += chunk.length;
  }
  return NextResponse.json({ ok: true, sent });
}

/** Admin-only: subscriber count for the dashboard. */
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ ok: false }, { status: 403 });
  }
  const [total, verified] = await Promise.all([
    db.newsletterSubscriber.count(),
    db.newsletterSubscriber.count({ where: { verified: true } }),
  ]);
  return NextResponse.json({ ok: true, total, verified });
}

import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { sendEmail, newsletterVerifyEmail, appUrl } from "@/lib/email";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(req: NextRequest) {
  try {
    const { email, source } = await req.json().catch(() => ({}));
    const clean = String(email ?? "").trim().toLowerCase();
    if (!EMAIL_RE.test(clean)) {
      return NextResponse.json({ ok: false, error: "Enter a valid email address." }, { status: 400 });
    }
    const verifyToken = randomBytes(24).toString("hex");
    const existing = await db.newsletterSubscriber.findUnique({ where: { email: clean } });
    if (existing?.verified) {
      return NextResponse.json({ ok: true, already: true });
    }
    if (existing) {
      await db.newsletterSubscriber.update({
        where: { email: clean },
        data: { verifyToken, source: String(source ?? "").slice(0, 40) || existing.source },
      });
    } else {
      await db.newsletterSubscriber.create({
        data: { email: clean, verifyToken, source: String(source ?? "").slice(0, 40) || null },
      });
    }
    const { subject, html } = newsletterVerifyEmail(appUrl(`/api/newsletter/verify?token=${verifyToken}`));
    const sent = await sendEmail(clean, subject, html);
    return NextResponse.json({ ok: true, emailed: sent });
  } catch {
    return NextResponse.json({ ok: false, error: "Something went wrong. Try again." }, { status: 500 });
  }
}

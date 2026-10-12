import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { sendEmail, abandonedCartEmail } from "@/lib/email";

export const runtime = "nodejs";

/**
 * Vercel Cron (every 4h): remind shoppers who started a Stripe checkout
 * more than 3 hours ago and never finished. One reminder per attempt.
 * Protect with CRON_SECRET (Vercel sends it as Bearer token).
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }

  const cutoff = new Date(Date.now() - 3 * 3600_000);
  const attempts = await db.checkoutAttempt.findMany({
    where: { status: "started", remindedAt: null, createdAt: { lt: cutoff }, email: { not: null } },
    take: 50,
  });

  let reminded = 0;
  for (const a of attempts) {
    try {
      // Confirm the session is still open and grab a resume URL.
      const s = await stripe().checkout.sessions.retrieve(a.stripeSessionId);
      if (s.status !== "open" || !s.url || !a.email) {
        await db.checkoutAttempt.update({
          where: { id: a.id },
          data: { status: "expired" },
        });
        continue;
      }
      const { subject, html } = abandonedCartEmail(a.plan ?? "", s.url);
      const sent = await sendEmail(a.email, subject, html);
      await db.checkoutAttempt.update({
        where: { id: a.id },
        data: { status: sent ? "reminded" : "started", remindedAt: sent ? new Date() : null },
      });
      if (sent) reminded++;
    } catch {
      // Leave for the next run.
    }
  }
  return NextResponse.json({ ok: true, checked: attempts.length, reminded });
}

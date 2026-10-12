import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail, newsletterWelcomeEmail, appUrl } from "@/lib/email";

export const runtime = "nodejs";

/** Double opt-in confirmation link from the verification email. */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const sub = token ? await db.newsletterSubscriber.findUnique({ where: { verifyToken: token } }) : null;
  if (!sub) {
    return NextResponse.redirect(appUrl("/?newsletter=invalid"));
  }
  await db.newsletterSubscriber.update({
    where: { id: sub.id },
    data: { verified: true, verifyToken: null, verifiedAt: new Date() },
  });
  const { subject, html } = newsletterWelcomeEmail(appUrl(`/api/newsletter/unsubscribe?token=${sub.unsubToken}`));
  await sendEmail(sub.email, subject, html).catch(() => {});
  return NextResponse.redirect(appUrl("/?newsletter=confirmed"));
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyUnsubscribeToken, unsubscribeSecret } from "@/lib/lifecycle/unsubscribe";

export const runtime = "nodejs";

/**
 * Marketing unsubscribe landing for lifecycle emails. The HMAC token
 * (lib/lifecycle/unsubscribe) is the credential — no sign-in required,
 * one click from the email footer. Flips User.emailOptOut, which the
 * lifecycle guards honor for every marketing send (transactional
 * account mail — trial started/ending, affiliate activity — is not
 * marketing and is unaffected, exactly as the footer copy states).
 */
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("u") ?? "";
  const token = req.nextUrl.searchParams.get("t");
  const secret = unsubscribeSecret();

  const page = (title: string, body: string, status = 200) =>
    new NextResponse(
      `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title} — WorldEye</title></head>
<body style="margin:0;background:#050508;color:#e4e4e7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:520px;margin:0 auto;padding:64px 24px;text-align:center;">
<div style="font-size:22px;font-weight:800;letter-spacing:0.08em;margin-bottom:20px;"><span style="color:#fff;">World</span><span style="color:#D4AF37;">Eye</span></div>
<h1 style="font-size:20px;color:#fff;">${title}</h1>
<p style="color:#a1a1aa;font-size:15px;line-height:1.6;">${body}</p>
</div></body></html>`,
      { status, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );

  if (!userId || !verifyUnsubscribeToken(userId, token, secret)) {
    return page(
      "That link doesn't look right",
      "This unsubscribe link is invalid or has been altered. If you'd like to stop marketing emails, sign in and contact us — or just reply to any email we sent.",
      400,
    );
  }

  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) {
    return page(
      "Account not found",
      "We couldn't find the account this link belongs to — it may have been deleted. No emails will be sent to it either way.",
      404,
    );
  }

  await db.user.update({ where: { id: userId }, data: { emailOptOut: true } });
  return page(
    "You're unsubscribed",
    "You won't receive WorldEye marketing or offer emails anymore. Essential account emails — sign-in links, trial and billing notices — will still arrive.",
  );
}

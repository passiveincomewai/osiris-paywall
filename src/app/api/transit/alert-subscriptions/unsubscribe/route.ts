// GET|POST /api/transit/alert-subscriptions/unsubscribe?token=…
//
// One-click unsubscribe for transit route alert emails. The token is
// the subscription's unguessable unsubToken (a cuid, minted at
// creation and never rotated). GET renders a small confirmation page
// for a human clicking from a mail client; POST answers the
// List-Unsubscribe one-click contract the same way. Deactivation is
// a status flip — the row (and its sent ledger) stays, so a later
// re-subscribe reactivates the same subscription instead of minting
// a fresh free tier.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function page(title: string, bodyHtml: string, status = 200): NextResponse {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(title)} — WorldEye</title>
<style>
  body { margin:0; background:#05070d; color:#fff; font-family: system-ui, -apple-system, sans-serif;
         display:flex; min-height:100vh; align-items:center; justify-content:center; }
  main { max-width:26rem; margin:1rem; border:1px solid rgba(255,255,255,.12);
         border-radius:1rem; padding:2rem; background:rgba(255,255,255,.03); }
  h1 { font-size:1.25rem; margin:0 0 .5rem; }
  p { color:rgba(255,255,255,.6); line-height:1.5; font-size:.925rem; }
  a { color:#D4AF37; }
</style>
</head>
<body><main><h1>${esc(title)}</h1>${bodyHtml}</main></body>
</html>`;
  return new NextResponse(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

async function handle(req: Request): Promise<NextResponse> {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  if (!token || token.length > 64) {
    return page(
      "Link not recognized",
      `<p>This unsubscribe link isn't complete. Open any transit alert email and use the unsubscribe link at the bottom of that message.</p>`,
      404,
    );
  }
  const sub = await db.transitAlertSubscription.findUnique({
    where: { unsubToken: token },
  });
  if (!sub) {
    return page(
      "Link not recognized",
      `<p>This unsubscribe link doesn't match a subscription — it may already have been removed. No further alert emails will be sent to an unsubscribed address.</p>`,
      404,
    );
  }
  if (sub.status === "active") {
    await db.transitAlertSubscription.update({
      where: { id: sub.id },
      data: { status: "unsubscribed" },
    });
  }
  return page(
    "You're unsubscribed",
    `<p>WorldEye won't send <strong>${esc(sub.agency.toUpperCase())} ${esc(sub.routeName)}</strong> alert emails to ${esc(sub.email)} any more.</p>
     <p>Changed your mind? Subscribe again any time from the <a href="https://worldeye.app/transit/${esc(sub.agency)}/routes/${esc(sub.routeSlug)}">route page</a>.</p>`,
  );
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}

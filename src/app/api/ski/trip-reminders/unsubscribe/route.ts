// GET|POST /api/ski/trip-reminders/unsubscribe?token=<unsubToken>
//
// One-click unsubscribe for ski trip reminder emails. The token is the
// reminder's unguessable unsubToken (a cuid, minted at creation and
// never rotated). GET renders a small confirmation page for a human
// clicking from a mail client; POST answers the List-Unsubscribe
// one-click contract the same way. Cancelling is a status flip — the
// row (and its sent stamps) stays, so re-adding the same trip from
// the site reactivates it without re-sending an email already sent.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { formatTripDate } from "@/lib/ski/trip-reminders";

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
      `<p>This unsubscribe link isn't complete. Open any trip reminder email and use the unsubscribe link at the bottom of that message.</p>`,
      404,
    );
  }
  const reminder = await db.skiTripReminder.findUnique({
    where: { unsubToken: token },
  });
  if (!reminder) {
    return page(
      "Link not recognized",
      `<p>This unsubscribe link doesn't match a trip reminder — it may already have been deleted. No reminder emails will be sent for a deleted trip.</p>`,
      404,
    );
  }
  if (reminder.status === "active") {
    await db.skiTripReminder.update({
      where: { id: reminder.id },
      data: { status: "cancelled" },
    });
  }
  const tripStart = reminder.tripStart.toISOString().slice(0, 10);
  return page(
    "Reminders off for this trip",
    `<p>WorldEye won't send trip reminder emails for <strong>${esc(reminder.resortName)}</strong> (arriving ${esc(formatTripDate(tripStart))}) to ${esc(reminder.email)} any more.</p>
     <p>Changed your mind? Set the reminder again any time from the <a href="https://worldeye.app/ski-webcams/${esc(reminder.resortSlug)}">resort page</a>.</p>`,
  );
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}

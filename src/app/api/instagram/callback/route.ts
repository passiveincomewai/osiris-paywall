// GET /api/instagram/callback — OAuth redirect target for the fleet's
// per-account Instagram Login flow.
//
// Instagram lands here with ?code&state after the account holder consents
// (or ?error... when they don't). The state is validated against the
// handshake store by hash: an unknown, expired, or already-filled state
// gets the same generic page and nothing is stored. A valid code is
// stored once against the nonce for pickup via /api/instagram/pickup.
// The code itself is never rendered or logged.
import { db } from "@/lib/db";
import { pruneExpiredHandshakes, sha256Hex } from "@/lib/instagram-oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function page(title: string, body: string): Response {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; margin: 0;
         min-height: 100vh; display: grid; place-items: center;
         background: #0b0e13; color: #e8ecf1; }
  main { max-width: 26rem; padding: 2rem; text-align: center; }
  h1 { font-size: 1.25rem; font-weight: 600; }
  p { color: #9aa7b5; line-height: 1.5; }
</style>
</head>
<body><main><h1>${title}</h1><p>${body}</p></main></body>
</html>`;
  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

const successPage = () =>
  page("Connected", "Your Instagram account is connected. You can close this tab.");

const errorPage = () =>
  page(
    "This link is no longer valid",
    "The connection could not be completed. You can close this tab and start the connection again.",
  );

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (!state || state.length > 512) return errorPage();

  await pruneExpiredHandshakes();

  const nonceHash = sha256Hex(state);
  const row = await db.igOAuthHandshake
    .findUnique({ where: { nonceHash } })
    .catch(() => null);
  if (!row || row.pickedUpAt || row.expiresAt < new Date()) return errorPage();

  // Authorization refused or failed on Instagram's side: burn the attempt
  // so the nonce cannot be reused, and show the generic page.
  if (error || !code || code.length > 2048) {
    await db.igOAuthHandshake
      .delete({ where: { id: row.id } })
      .catch(() => undefined);
    return errorPage();
  }

  // A code was already stored against this nonce: the state has been used.
  if (row.code) return errorPage();

  const stored = await db.igOAuthHandshake.updateMany({
    where: { id: row.id, code: null, pickedUpAt: null },
    data: { code },
  });
  if (stored.count !== 1) return errorPage();

  return successPage();
}

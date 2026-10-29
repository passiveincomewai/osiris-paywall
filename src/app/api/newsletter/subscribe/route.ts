import { NextRequest, NextResponse } from "next/server";
import { subscribeToNewsletter } from "@/lib/newsletter/subscribe";

export const runtime = "nodejs";

// Thin HTTP shell over lib/newsletter/subscribe — the one subscribe
// routine every surface shares (this route, the signup opt-in, the
// /welcome claim opt-in). The outcome→response mapping is the public
// contract the footer form and capture cards depend on:
//
//   invalid     → 400 { ok:false, error, code }   (syntax / placeholder /
//                 disposable / junk pattern / domain can't receive mail)
//   suggestion  → 400 { ok:false, error, code:"typo_suggestion",
//                 suggestion } — the form offers the corrected address
//                 and a "keep mine" resubmit (body.confirmed === true)
//   unavailable → 503 { ok:false, error, retryable:true } — the DNS
//                 check itself hiccuped; the address is NOT declared
//                 invalid and a plain retry may succeed
//   already     → 200 { ok:true, already:true }
//   subscribed  → 200 { ok:true, emailed } — live on the list NOW
//                 (instant validation replaced the confirmation email);
//                 `emailed` reports the best-effort welcome message.
export async function POST(req: NextRequest) {
  try {
    const { email, source, confirmed } = await req.json().catch(() => ({}));
    const outcome = await subscribeToNewsletter(email, source, {
      confirmed: confirmed === true,
    });
    if (outcome.kind === "invalid") {
      return NextResponse.json(
        { ok: false, error: outcome.message, code: outcome.code },
        { status: 400 },
      );
    }
    if (outcome.kind === "suggestion") {
      return NextResponse.json(
        {
          ok: false,
          error: outcome.message,
          code: "typo_suggestion",
          suggestion: outcome.suggestion,
        },
        { status: 400 },
      );
    }
    if (outcome.kind === "unavailable") {
      return NextResponse.json(
        { ok: false, error: outcome.message, retryable: true },
        { status: 503 },
      );
    }
    if (outcome.kind === "already") {
      return NextResponse.json({ ok: true, already: true });
    }
    return NextResponse.json({ ok: true, emailed: outcome.emailed });
  } catch {
    return NextResponse.json({ ok: false, error: "Something went wrong. Try again." }, { status: 500 });
  }
}

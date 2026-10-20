import { NextRequest, NextResponse } from "next/server";
import { subscribeToNewsletter } from "@/lib/newsletter/subscribe";

export const runtime = "nodejs";

// Thin HTTP shell over lib/newsletter/subscribe — the one subscribe
// routine every surface shares (this route, the signup opt-in, the
// /welcome claim opt-in). The outcome→response mapping is the public
// contract the footer form and capture cards already depend on.
export async function POST(req: NextRequest) {
  try {
    const { email, source } = await req.json().catch(() => ({}));
    const outcome = await subscribeToNewsletter(email, source);
    if (outcome.kind === "invalid") {
      return NextResponse.json({ ok: false, error: "Enter a valid email address." }, { status: 400 });
    }
    if (outcome.kind === "already") {
      return NextResponse.json({ ok: true, already: true });
    }
    return NextResponse.json({ ok: true, emailed: outcome.emailed });
  } catch {
    return NextResponse.json({ ok: false, error: "Something went wrong. Try again." }, { status: 500 });
  }
}

// POST /api/white-label-demo — White Label demo request form submission.
//
// Mirrors the public contact pipeline (src/app/api/contact): same
// per-IP rate limit, same store — the request is composed into a
// ContactMessage with topic "white-label-demo" (src/lib/white-label),
// so it lands in the admin inbox and the contact-alerts forwarder like
// every other lead. No second lead store, no email sent from here.
//
// The one deliberate difference from /api/contact: a demo request is
// only useful with a reachable work email, so the address runs the
// shared full validator (src/lib/email/validate-email — the same check
// account signup uses) before anything is stored. A transient DNS
// failure answers a retryable 503, never a "fake email" verdict.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isRateLimited, clientIp } from "@/lib/password-auth";
import {
  parseWhiteLabelDemoSubmission,
  composeWhiteLabelDemoMessage,
  WHITE_LABEL_DEMO_TOPIC,
} from "@/lib/white-label";
import { validateEmailAddress } from "@/lib/email/validate-email";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (isRateLimited(`white-label-demo:${clientIp(req)}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many requests from this network. Try again in an hour, or email us directly." },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = parseWhiteLabelDemoSubmission(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const validation = await validateEmailAddress(parsed.data.email);
  if (!validation.ok) {
    return NextResponse.json(
      {
        error: validation.message,
        code: validation.code,
        ...(validation.suggestion ? { suggestion: validation.suggestion } : {}),
      },
      { status: validation.retryable ? 503 : 400 },
    );
  }

  const data = { ...parsed.data, email: validation.email };
  const msg = await db.contactMessage.create({
    data: {
      name: data.name,
      email: data.email,
      topic: WHITE_LABEL_DEMO_TOPIC,
      message: composeWhiteLabelDemoMessage(data),
    },
  });
  return NextResponse.json({ ok: true, id: msg.id });
}

import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { normalizeEmail } from "@/lib/password-auth";

export const runtime = "nodejs";

/**
 * Verify a just-completed checkout session and return the purchase email plus
 * any existing profile details (for prefilling the account setup form).
 * The session id is unguessable and verified server-side against Stripe —
 * query params alone grant nothing.
 */
export async function GET(req: Request) {
  const sessionId = new URL(req.url).searchParams.get("session_id") ?? "";
  if (!sessionId.startsWith("cs_")) {
    return NextResponse.json({ error: "Invalid session" }, { status: 400 });
  }

  let checkout: Awaited<ReturnType<ReturnType<typeof stripe>["checkout"]["sessions"]["retrieve"]>>;
  try {
    checkout = await stripe().checkout.sessions.retrieve(sessionId, {
      expand: ["customer"],
    });
  } catch {
    return NextResponse.json({ error: "Invalid session" }, { status: 400 });
  }
  if (checkout.status !== "complete" || checkout.mode !== "subscription") {
    return NextResponse.json({ error: "Payment not complete" }, { status: 402 });
  }

  const customer = checkout.customer;
  const rawEmail =
    typeof customer === "string" ? checkout.customer_email : (customer?.deleted ? null : (customer?.email ?? checkout.customer_email));
  const email = rawEmail ? normalizeEmail(rawEmail) : null;
  if (!email) {
    return NextResponse.json({ error: "No email on this purchase" }, { status: 400 });
  }

  const user = await db.user.findUnique({
    where: { email },
    select: { name: true, phone: true },
  });

  return NextResponse.json({
    email,
    name: user?.name ?? null,
    phone: user?.phone ?? null,
  });
}

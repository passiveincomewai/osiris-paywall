import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import {
  normalizeEmail,
  passwordError,
  hashPassword,
  isRateLimited,
  clientIp,
} from "@/lib/password-auth";

export const runtime = "nodejs";

/**
 * Let a guest buyer claim the account auto-created by their purchase.
 * The Stripe session is re-verified server-side (status=complete,
 * subscription mode), and claiming is only possible while the account
 * has no password — existing accounts can never be hijacked this way.
 */
export async function POST(req: Request) {
  if (isRateLimited(`claim:${clientIp(req)}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  const { session_id, password } = (await req.json().catch(() => ({}))) as {
    session_id?: string;
    password?: string;
  };
  if (!session_id?.startsWith("cs_")) {
    return NextResponse.json({ error: "Invalid session" }, { status: 400 });
  }
  const pwErr = passwordError(password ?? "");
  if (pwErr) return NextResponse.json({ error: pwErr }, { status: 400 });

  let checkout;
  try {
    checkout = await stripe().checkout.sessions.retrieve(session_id, {
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

  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    // Webhook hasn't created the account yet — the page will retry shortly.
    return NextResponse.json({ error: "Account not ready yet. Wait a moment and try again." }, { status: 409 });
  }
  if (user.passwordHash) {
    return NextResponse.json({ error: "This account already has a password. Sign in instead." }, { status: 409 });
  }

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(password!), emailVerified: user.emailVerified ?? new Date() },
  });

  return NextResponse.json({ ok: true, email });
}

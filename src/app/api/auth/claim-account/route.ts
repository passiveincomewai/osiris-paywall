import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import {
  normalizeEmail,
  passwordError,
  usernameError,
  phoneError,
  normalizePhone,
  hashPassword,
  isRateLimited,
  clientIp,
} from "@/lib/password-auth";

export const runtime = "nodejs";

/**
 * Post-purchase account setup. The buyer lands here from Stripe and fills in
 * username + phone + password. The Stripe session is re-verified server-side
 * (status=complete, subscription mode) — the unguessable session id tied to a
 * completed payment is proof of ownership of the purchase email, so this both
 * creates new accounts and finishes guest-created ones. Existing accounts
 * simply get their profile details (and password) updated.
 */
export async function POST(req: Request) {
  if (isRateLimited(`claim:${clientIp(req)}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  const { session_id, username, phone, password } = (await req.json().catch(() => ({}))) as {
    session_id?: string;
    username?: string;
    phone?: string;
    password?: string;
  };
  if (!session_id?.startsWith("cs_")) {
    return NextResponse.json({ error: "Invalid session" }, { status: 400 });
  }
  const uErr = usernameError(username ?? "");
  if (uErr) return NextResponse.json({ error: uErr }, { status: 400 });
  const phErr = phoneError(phone ?? "");
  if (phErr) return NextResponse.json({ error: phErr }, { status: 400 });
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

  const cleanUsername = username!.trim();
  const cleanPhone = normalizePhone(phone!);

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    await db.user.update({
      where: { id: existing.id },
      data: {
        name: cleanUsername,
        phone: cleanPhone,
        passwordHash: await hashPassword(password!),
        emailVerified: existing.emailVerified ?? new Date(),
      },
    });
  } else {
    // Webhook hasn't created the account yet — create it now (idempotent
    // with the webhook's own find-or-create on email).
    await db.user.create({
      data: {
        email,
        name: cleanUsername,
        phone: cleanPhone,
        passwordHash: await hashPassword(password!),
        emailVerified: new Date(),
      },
    });
  }

  return NextResponse.json({ ok: true, email });
}

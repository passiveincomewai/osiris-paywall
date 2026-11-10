// Admin account actions for ONE account: send a site template email, or
// grant a free Pro comp. The security boundary is HERE, server-side —
// the session email must be in ADMIN_EMAILS (adminEmails(), the same
// check every /admin page uses). The detail page's buttons merely call
// this route; hiding them would not be enforcement.
//
// Sends go through the site's own pipeline (sendEmail → Resend, from
// WorldEye <noreply@worldeye.app>) and every send is logged in
// LifecycleEmailLog — the codebase's email log — with template
// "admin_<key>", the kind (marketing | transactional) and the acting
// admin's email in the contextKey. The lifecycle engine's deliver() is
// built for scheduled campaign runs (once-only per user/template), so
// deliberate admin one-offs log through the same table directly
// instead; the contextKey carries a timestamp so repeat admin sends
// stay possible and each is its own log row.
//
// Marketing sends honour User.emailOptOut absolutely: opted out → 422,
// nothing sent. The trial-grant notice is transactional (it reports a
// change to the recipient's own account) and is not opt-out gated —
// the same rule the lifecycle system applies to trial-started mail.
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { adminEmails } from "@/lib/affiliate/admin";
import { sendEmail } from "@/lib/email";
import { appBaseUrl } from "@/lib/app-url";
import { grantCompProDays, isCompSubscription } from "@/lib/pro/comp";
import {
  adminCheckinEmail,
  adminCustomEmail,
  adminTrialGrantEmail,
  adminTrialInviteEmail,
} from "@/lib/lifecycle/templates";
import { buildUnsubscribeUrl, unsubscribeSecret } from "@/lib/lifecycle/unsubscribe";

export const runtime = "nodejs";

/** Default free-trial length for an admin grant when the request names
 *  none (matches the monthly/annual trial length in lib/billing/trials).
 *  The detail page offers 7 / 10 / 30; anything else is refused so a
 *  malformed request can never mint an arbitrary-length comp. */
const ADMIN_TRIAL_DAYS = 10;
const ALLOWED_GRANT_DAYS = [7, 10, 30];

/** Caps for the admin custom-email composer — a one-off personal
 *  message, not a broadcast tool. */
const CUSTOM_SUBJECT_MAX = 150;
const CUSTOM_BODY_MAX = 5000;

type ActionBody = {
  action?: string;
  template?: string;
  confirm?: boolean;
  days?: number;
  subject?: string;
  body?: string;
};

function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status });
}

async function logAdminEmail(input: {
  userId: string;
  recipientEmail: string;
  template: string;
  kind: "marketing" | "transactional";
  subject: string;
  adminEmail: string;
}): Promise<boolean> {
  try {
    await db.lifecycleEmailLog.create({
      data: {
        userId: input.userId,
        recipientEmail: input.recipientEmail,
        template: input.template,
        contextKey: `admin:${input.adminEmail}:${new Date().toISOString()}`,
        kind: input.kind,
        subject: input.subject,
        status: "sent",
      },
    });
    return true;
  } catch {
    return false;
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const session = await auth();
  const adminEmail = session?.user?.email?.toLowerCase() ?? null;
  if (!adminEmail || !adminEmails().includes(adminEmail)) {
    return json(403, { error: "forbidden" });
  }
  const { userId } = await params;
  const body = (await req.json().catch(() => null)) as ActionBody | null;
  if (!body || (body.action !== "send_email" && body.action !== "grant_trial")) {
    return json(400, { error: "unknown_action" });
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      emailOptOut: true,
      subscription: {
        select: { status: true, stripeSubscriptionId: true, currentPeriodEnd: true },
      },
    },
  });
  if (!user) return json(404, { error: "user_not_found" });

  if (body.action === "send_email") {
    if (body.template !== "trial_invite" && body.template !== "checkin" && body.template !== "custom") {
      return json(400, { error: "unknown_template" });
    }
    // Custom composer: the admin's own subject + body. Both are
    // required, non-empty after trimming, and length-capped. This is a
    // marketing send like the templates — the opt-out refusal below
    // applies to it identically.
    let custom: { subject: string; bodyText: string } | null = null;
    if (body.template === "custom") {
      const subject = typeof body.subject === "string" ? body.subject.trim() : "";
      const bodyText = typeof body.body === "string" ? body.body.trim() : "";
      if (!subject) {
        return json(400, { error: "empty_subject", message: "Write a subject line first — nothing was sent." });
      }
      if (!bodyText) {
        return json(400, { error: "empty_body", message: "Write a message body first — nothing was sent." });
      }
      if (subject.length > CUSTOM_SUBJECT_MAX || bodyText.length > CUSTOM_BODY_MAX) {
        return json(400, {
          error: "too_long",
          message: `Too long — subjects are capped at ${CUSTOM_SUBJECT_MAX} characters and bodies at ${CUSTOM_BODY_MAX}. Nothing was sent.`,
        });
      }
      custom = { subject, bodyText };
    }
    if (!user.email) {
      return json(422, { error: "no_email", message: "This account has no email address." });
    }
    if (user.emailOptOut) {
      return json(422, {
        error: "opted_out",
        message: "This user has opted out of marketing email — the send was refused.",
      });
    }
    const unsubscribeUrl = buildUnsubscribeUrl(appBaseUrl(), user.id, unsubscribeSecret());
    const rendered = custom
      ? adminCustomEmail({ name: user.name, subject: custom.subject, bodyText: custom.bodyText, unsubscribeUrl })
      : body.template === "trial_invite"
        ? adminTrialInviteEmail({ name: user.name, unsubscribeUrl })
        : adminCheckinEmail({ name: user.name, unsubscribeUrl });
    const sent = await sendEmail(user.email, rendered.subject, rendered.html);
    if (!sent) {
      return json(502, {
        error: "send_failed",
        message: "The email service refused the send — nothing was sent or logged.",
      });
    }
    const logged = await logAdminEmail({
      userId: user.id,
      recipientEmail: user.email,
      template: `admin_${body.template}`,
      kind: "marketing",
      subject: rendered.subject,
      adminEmail,
    });
    return json(200, { ok: true, logged });
  }

  // action === "grant_trial": a Pro comp through the existing comp
  // engine, recorded with source "admin". The comp engine itself never
  // touches a real Stripe row; the guards here exist to answer with a
  // clear refusal (paid) or a confirm step (active comp) instead of a
  // silent no-op.
  const days = body.days === undefined ? ADMIN_TRIAL_DAYS : body.days;
  if (typeof days !== "number" || !ALLOWED_GRANT_DAYS.includes(days)) {
    return json(400, {
      error: "invalid_days",
      message: `Grant length must be one of ${ALLOWED_GRANT_DAYS.join(", ")} days — nothing was granted.`,
    });
  }
  const existing = user.subscription;
  const now = new Date();
  if (existing && !isCompSubscription(existing)) {
    const live =
      (existing.status === "active" || existing.status === "trialing" || existing.status === "past_due") &&
      existing.currentPeriodEnd > now;
    return json(409, {
      error: live ? "paid_active" : "stripe_record",
      message: live
        ? "This account already has an active paid subscription or Stripe trial. Comp grants never touch Stripe subscriptions, so nothing was granted."
        : `A Stripe subscription record exists for this account (status: ${existing.status.replace(/_/g, " ")}). Comp grants never touch Stripe records, so nothing was granted.`,
    });
  }
  if (
    existing &&
    isCompSubscription(existing) &&
    existing.status === "active" &&
    existing.currentPeriodEnd > now &&
    body.confirm !== true
  ) {
    return json(409, {
      error: "comp_active",
      needsConfirm: true,
      currentPeriodEnd: existing.currentPeriodEnd.toISOString(),
      message:
        `This account already has free Pro (comp) running. Extending adds ${days} more days on top of the current end date — confirm to go ahead.`,
    });
  }

  const res = await grantCompProDays(user.id, "admin", days);
  if (!res.granted) {
    return json(409, {
      error: "paid_subscription_exists",
      message: "A paid subscription appeared while granting — nothing was changed.",
    });
  }

  // The grant is live; the notification email is automatic. It is a
  // service email about the recipient's own account (transactional),
  // so it is NOT gated on emailOptOut. Its end-date label is computed
  // from the grant result itself, so it always states the actual
  // granted duration's end date, whatever length was chosen.
  const endsOnLabel = res.currentPeriodEnd.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Denver",
  });
  let emailSent = false;
  if (user.email) {
    const rendered = adminTrialGrantEmail({ name: user.name, endsOnLabel });
    emailSent = await sendEmail(user.email, rendered.subject, rendered.html);
    if (emailSent) {
      await logAdminEmail({
        userId: user.id,
        recipientEmail: user.email,
        template: "admin_trial_grant",
        kind: "transactional",
        subject: rendered.subject,
        adminEmail,
      });
    }
  }
  return json(200, {
    ok: true,
    days,
    currentPeriodEnd: res.currentPeriodEnd.toISOString(),
    emailSent,
  });
}

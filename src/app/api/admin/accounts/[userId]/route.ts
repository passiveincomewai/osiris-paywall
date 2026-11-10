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
  adminTrialGrantEmail,
  adminTrialInviteEmail,
} from "@/lib/lifecycle/templates";
import { buildUnsubscribeUrl, unsubscribeSecret } from "@/lib/lifecycle/unsubscribe";

export const runtime = "nodejs";

/** The standard free-trial length for an admin grant (matches the
 *  monthly/annual trial length in lib/billing/trials). */
const ADMIN_TRIAL_DAYS = 10;

type ActionBody = { action?: string; template?: string; confirm?: boolean };

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
    if (body.template !== "trial_invite" && body.template !== "checkin") {
      return json(400, { error: "unknown_template" });
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
    const rendered =
      body.template === "trial_invite"
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
        `This account already has free Pro (comp) running. Extending adds ${ADMIN_TRIAL_DAYS} more days on top of the current end date — confirm to go ahead.`,
    });
  }

  const res = await grantCompProDays(user.id, "admin", ADMIN_TRIAL_DAYS);
  if (!res.granted) {
    return json(409, {
      error: "paid_subscription_exists",
      message: "A paid subscription appeared while granting — nothing was changed.",
    });
  }

  // The grant is live; the notification email is automatic. It is a
  // service email about the recipient's own account (transactional),
  // so it is NOT gated on emailOptOut.
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
    currentPeriodEnd: res.currentPeriodEnd.toISOString(),
    emailSent,
  });
}

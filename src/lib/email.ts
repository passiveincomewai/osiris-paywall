// Transactional email via Resend (raw fetch — no SDK needed).
// Used for signup verification and password resets. The Auth.js magic-link
// provider sends its own emails; this is for our account flows.

import { appBaseUrl } from "./app-url";

const RESEND_API = "https://api.resend.com/emails";

function resendKey(): string | null {
  return process.env.AUTH_RESEND_KEY ?? null;
}

function fromAddress(): string {
  return process.env.EMAIL_FROM ?? "WorldEye <onboarding@resend.dev>";
}

export function emailConfigured(): boolean {
  return !!resendKey();
}

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const key = resendKey();
  if (!key) {
    console.error("[email] AUTH_RESEND_KEY not set — cannot send email to", to);
    return false;
  }
  try {
    const res = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      // Every send carries a plain-text alternative derived from the
      // HTML (2026-11 design pass): multipart mail renders in clients
      // that block HTML and scores better with spam filters.
      body: JSON.stringify({ from: fromAddress(), to, subject, html, text: htmlToText(html) }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[email] Resend rejected send:", res.status, body.slice(0, 300));
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email] Resend send failed:", err);
    return false;
  }
}

/** Plain-text rendering of a shell() document: block tags become line
 * breaks, the hidden preheader is dropped, entities decoded. Good
 * enough to be faithful — it is generated FROM the HTML, never
 * maintained separately, so the two can never drift. */
export function htmlToText(html: string): string {
  return html
    .replace(/<div style="display:none[^"]*"[^>]*>[\s\S]*?<\/div>/g, "")
    .replace(/<style[\s\S]*?<\/style>/g, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h1|h2|tr|table)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
}

/** The shared branded layout (2026-11 design pass): table-based for
 * Outlook, 600px, dark-mode safe with explicit colours throughout,
 * one button style, and ONE standard footer — tagline, the CAN-SPAM
 * postal line, and an optional per-type "why you got this" line that
 * templates pass via opts.why. Signature kept from the original
 * shell so every existing caller inherits the layout unchanged;
 * visible copy is otherwise byte-equivalent to the pre-pass shell.
 * Exported for src/lib/lifecycle templates, which render in this shell. */
export function shell(
  title: string,
  preheader: string,
  bodyHtml: string,
  cta: { label: string; href: string } | null,
  opts?: { why?: string },
): string {
  const why = opts?.why
    ? `<tr><td align="center" style="font-size:12px;color:#71717a;padding:0 24px 6px;">${opts.why}</td></tr>`
    : "";
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"><style>@media only screen and (max-width:620px){.we-pad{padding:24px 16px !important}.we-card{padding:24px 18px !important}}</style></head>
<body style="margin:0;padding:0;background:#050508;color:#e4e4e7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#050508;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" class="we-pad" style="width:600px;max-width:600px;">
<tr><td align="center" style="padding:40px 24px 0;">
<div style="font-size:22px;font-weight:800;letter-spacing:0.08em;margin-bottom:28px;"><span style="color:#fff;">World</span><span style="color:#D4AF37;">Eye</span></div>
</td></tr>
<tr><td style="padding:0 24px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td class="we-card" style="background:#101013;border:1px solid rgba(212,175,55,0.25);border-radius:16px;padding:32px 28px;">
<h1 style="margin:0 0 12px;font-size:20px;color:#fff;">${title}</h1>
${bodyHtml}
${cta ? `<div style="text-align:center;margin:26px 0 8px;"><a href="${cta.href}" style="display:inline-block;background:#D4AF37;color:#000;font-weight:700;font-size:15px;padding:13px 34px;border-radius:12px;text-decoration:none;">${cta.label}</a></div>
<p style="font-size:12px;color:#71717a;word-break:break-all;">Or paste this link:<br><span style="color:#a1a1aa;">${cta.href}</span></p>` : ""}
</td></tr></table>
</td></tr>
<tr><td align="center" style="font-size:12px;color:#52525b;padding:24px 24px 0;">WorldEye — see the world live.<br>If you didn't request this, you can safely ignore it.</td></tr>
${why}
<tr><td align="center" style="font-size:12px;color:#52525b;padding:0 24px 40px;">WorldEye · 555 E 3200 N, North Ogden, UT 84414</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

export function appUrl(path: string): string {
  return `${appBaseUrl()}${path}`;
}

export function verificationEmail(name: string | null, verifyUrl: string): { subject: string; html: string } {
  const first = name?.split(" ")[0] ?? "there";
  return {
    subject: "Verify your WorldEye account",
    html: shell(
      "Confirm your email",
      "One click to activate your WorldEye account.",
      `<p style="color:#a1a1aa;font-size:15px;line-height:1.6;">Hi ${escapeHtml(first)},</p>
       <p style="color:#a1a1aa;font-size:15px;line-height:1.6;">Thanks for creating a WorldEye account. Click below to verify your email address — the link expires in 24 hours.</p>`,
      { label: "Verify my email", href: verifyUrl }
    ),
  };
}

export function resetPasswordEmail(name: string | null, resetUrl: string): { subject: string; html: string } {
  const first = name?.split(" ")[0] ?? "there";
  return {
    subject: "Reset your WorldEye password",
    html: shell(
      "Reset your password",
      "Reset your WorldEye password — link expires in 1 hour.",
      `<p style="color:#a1a1aa;font-size:15px;line-height:1.6;">Hi ${escapeHtml(first)},</p>
       <p style="color:#a1a1aa;font-size:15px;line-height:1.6;">We got a request to reset your WorldEye password. Click below to choose a new one — the link expires in 1 hour.</p>
       <p style="color:#71717a;font-size:13px;">Didn't ask for this? Your password stays as-is; just ignore this email.</p>`,
      { label: "Reset my password", href: resetUrl }
    ),
  };
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

export function newsletterVerifyEmail(verifyUrl: string): { subject: string; html: string } {
  return {
    subject: "Confirm your WorldEye newsletter subscription",
    html: shell(
      "One more click",
      "Confirm your subscription to the WorldEye newsletter.",
      `<p style="color:#a1a1aa;font-size:15px;line-height:1.6;">Thanks for your interest in WorldEye. Click below to confirm your newsletter subscription — we'll send product updates, new intel layers, and launch news. No spam, unsubscribe anytime.</p>`,
      { label: "Confirm subscription", href: verifyUrl }
    ),
  };
}

export function newsletterWelcomeEmail(unsubUrl: string): { subject: string; html: string } {
  return {
    subject: "You're on the WorldEye newsletter",
    html: shell(
      "You're in",
      "Your WorldEye newsletter subscription is confirmed.",
      `<p style="color:#a1a1aa;font-size:15px;line-height:1.6;">You're subscribed. We'll keep you posted on new layers, features, and major launches.</p>
       <p style="font-size:12px;color:#71717a;"><a href="${unsubUrl}" style="color:#71717a;">Unsubscribe anytime</a></p>`,
      { label: "Explore the live map", href: appUrl("/") }
    ),
  };
}

/**
 * The one heads-up a trial user gets before the first charge: plan, the
 * exact amount, the exact moment the trial ends, the real cancel path,
 * and the 7-day first-charge money-back guarantee (Terms §4). All figures
 * arrive pre-derived from the live Stripe price
 * (lib/billing/trial-reminders.ts) — nothing is restated here.
 */
export function trialEndingEmail(input: {
  planLabel: string;
  chargeLabel: string;
  perMonthLabel: string | null;
  endsOnLabel: string;
  manageUrl: string;
}): { subject: string; html: string } {
  const perMonth = input.perMonthLabel
    ? ` (that's ${escapeHtml(input.perMonthLabel)}, billed once a year)`
    : "";
  return {
    subject: "Your WorldEye Pro free trial is ending",
    html: shell(
      "Your free trial is ending",
      `Your WorldEye Pro trial ends on ${input.endsOnLabel}.`,
      `<p style="color:#a1a1aa;font-size:15px;line-height:1.6;">Your free trial of <strong style="color:#fff;">WorldEye Pro (${escapeHtml(input.planLabel)})</strong> ends on <strong style="color:#fff;">${escapeHtml(input.endsOnLabel)}</strong>.</p>
       <p style="color:#a1a1aa;font-size:15px;line-height:1.6;">Unless you cancel before then, your card will be charged <strong style="color:#fff;">${escapeHtml(input.chargeLabel)}</strong>${perMonth}, and your plan renews automatically until you cancel.</p>
       <p style="color:#a1a1aa;font-size:15px;line-height:1.6;">Want to keep Pro? Do nothing — it continues on its own.</p>
       <p style="color:#a1a1aa;font-size:15px;line-height:1.6;">Want to cancel? Sign in, open <strong style="color:#fff;">Settings → Manage billing</strong>, and cancel in the Stripe portal. You keep Pro until the trial ends, and you won't be charged.</p>
       <p style="color:#a1a1aa;font-size:15px;line-height:1.6;">And if the charge does go through, it's covered by a 7-day money-back guarantee on your first charge — email us at <a href="mailto:contact@worldeye.app" style="color:#fff;">contact@worldeye.app</a> within 7 days of the charge for a full refund, no questions asked.</p>`,
      { label: "Manage my subscription", href: input.manageUrl }
    ),
  };
}

export function abandonedCartEmail(plan: string, checkoutUrl: string): { subject: string; html: string } {
  const planLabel = plan ? `WorldEye Pro (${plan})` : "WorldEye Pro";
  return {
    subject: "Your WorldEye Pro checkout is waiting",
    html: shell(
      "Still thinking it over?",
      "Your WorldEye Pro checkout is still open.",
      `<p style="color:#a1a1aa;font-size:15px;line-height:1.6;">You started checking out for <strong style="color:#fff;">${escapeHtml(planLabel)}</strong> but didn't finish. Your spot is still reserved — it only takes a minute to complete.</p>`,
      { label: "Complete my checkout", href: checkoutUrl }
    ),
  };
}

export function teamInviteEmail(input: {
  orgName: string;
  inviterName: string;
  role: string;
  expiresAt: Date;
  acceptUrl: string;
}): { subject: string; html: string } {
  const expiresLabel = input.expiresAt.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  return {
    subject: "You're invited to join a team on WorldEye",
    html: shell(
      "You've been invited",
      `${input.inviterName} invited you to join ${input.orgName} on WorldEye.`,
      `<p style="color:#a1a1aa;font-size:15px;line-height:1.6;"><strong style="color:#fff;">${escapeHtml(input.inviterName)}</strong> invited you to join the <strong style="color:#fff;">${escapeHtml(input.orgName)}</strong> team on WorldEye as a <strong style="color:#fff;">${escapeHtml(input.role)}</strong>.</p>
       <p style="color:#a1a1aa;font-size:15px;line-height:1.6;">Joining gives you access to the team's shared cameras, collections and the team's plan features. This invitation expires on <strong style="color:#fff;">${escapeHtml(expiresLabel)}</strong>.</p>
       <p style="color:#71717a;font-size:13px;">You'll need to sign in with the email address this invitation was sent to in order to accept it.</p>`,
      { label: "Accept invitation", href: input.acceptUrl }
    ),
  };
}

/** New-device sign-in alert (account settings item 4). Sent when a
 * device the account has never used signs in — the honest scope is
 * "a device we haven't seen for this account", stated as such. */
export function newDeviceEmail(input: {
  name: string | null;
  deviceLabel: string;
  location: string | null;
  whenLabel: string;
}): { subject: string; html: string } {
  const first = input.name?.split(" ")[0] ?? "there";
  const where = input.location ? ` near ${escapeHtml(input.location)}` : "";
  return {
    subject: "New device signed in to your WorldEye account",
    html: shell(
      "New device sign-in",
      `A new device (${input.deviceLabel}) signed in to your WorldEye account.`,
      `<p style="color:#a1a1aa;font-size:15px;line-height:1.6;">Hi ${escapeHtml(first)},</p>
       <p style="color:#a1a1aa;font-size:15px;line-height:1.6;">A device we haven't seen on your account before — <strong style="color:#fff;">${escapeHtml(input.deviceLabel)}</strong>${where} — signed in on <strong style="color:#fff;">${escapeHtml(input.whenLabel)}</strong>.</p>
       <p style="color:#a1a1aa;font-size:15px;line-height:1.6;">If that was you, no action is needed. If it wasn't, change your password and revoke the device under <strong style="color:#fff;">Settings → Security</strong> right away.</p>`,
      { label: "Review my devices", href: appUrl("/settings") }
    ),
  };
}

export function cameraAlertEmail(input: {
  cameraName: string;
  condition: string;
  observation: string;
  /** e.g. "3:40 PM UTC" — when the checked still was captured. */
  frameTimeLabel: string;
  /** Signed URL of the exact still the check saw; null when unavailable. */
  imageUrl: string | null;
  cameraUrl: string;
  alertsUrl: string;
}): { subject: string; html: string } {
  const name = escapeHtml(input.cameraName);
  const image = input.imageUrl
    ? `<div style="margin:18px 0;"><img src="${escapeHtml(input.imageUrl)}" alt="The camera image this alert is based on" style="width:100%;border-radius:12px;border:1px solid rgba(255,255,255,0.12);display:block;"></div>`
    : "";
  return {
    subject: `Camera alert: ${input.cameraName}`,
    html: shell(
      "Your camera alert may have triggered",
      `Our check of ${input.cameraName} reports: ${input.observation}`,
      `<p style="color:#a1a1aa;font-size:15px;line-height:1.6;">Your VIP Pro alert watches <strong style="color:#fff;">${name}</strong> for “${escapeHtml(input.condition)}”.</p>
       <p style="color:#a1a1aa;font-size:15px;line-height:1.6;">Our check of the ${escapeHtml(input.frameTimeLabel)} image reports: <strong style="color:#fff;">${escapeHtml(input.observation)}</strong></p>
       ${image}
       <p style="color:#a1a1aa;font-size:15px;line-height:1.6;">This is an automated look at a single photo, not a guarantee — open the camera to see the live view and confirm for yourself.</p>
       <p style="font-size:13px;color:#71717a;">Too many alerts? Pause or change this one under <a href="${escapeHtml(input.alertsUrl)}" style="color:#a1a1aa;">Settings → Camera alerts</a>.</p>`,
      { label: "Open the camera", href: input.cameraUrl }
    ),
  };
}

// ── Security pack (2026-11 expansion, pick 15) ──────────────────────
// Account-security notices in the newDeviceEmail mould: what happened,
// when, and the recovery path if it wasn't you. Transactional — they
// are part of the account's security record, so no opt-out applies and
// none is offered. The postal line rides in the shell footer.

export function passwordChangedEmail(input: {
  name: string | null;
  /** Pre-rendered moment, UTC-labelled. */
  whenLabel: string;
}): { subject: string; html: string } {
  const first = escapeHtml(input.name?.split(" ")[0] ?? "there");
  return {
    subject: "Your WorldEye password was changed",
    html: shell(
      "Password changed",
      "Your WorldEye password was just changed. If that wasn't you, act now.",
      `<p style="color:#a1a1aa;font-size:15px;line-height:1.6;">Hi ${first},</p>
       <p style="color:#a1a1aa;font-size:15px;line-height:1.6;">The password on your WorldEye account was changed on <strong style="color:#fff;">${escapeHtml(input.whenLabel)}</strong>. If that was you, no action is needed.</p>
       <p style="color:#a1a1aa;font-size:15px;line-height:1.6;">If it wasn't you, reset your password right away from the sign-in page (choose “Forgot password”), then review your signed-in devices under <strong style="color:#fff;">Settings → Security</strong>.</p>`,
      { label: "Review my account", href: appUrl("/settings") },
      { why: "You're receiving this because the password on your WorldEye account changed." },
    ),
  };
}

export function apiKeyCreatedEmail(input: {
  name: string | null;
  keyName: string;
  /** The non-secret display prefix (e.g. "we_live_…"); the full key is
   * shown to the creator once and is NEVER emailed. */
  keyPrefix: string;
  whenLabel: string;
}): { subject: string; html: string } {
  const first = escapeHtml(input.name?.split(" ")[0] ?? "there");
  return {
    subject: "A new WorldEye API key was created on your account",
    html: shell(
      "New API key created",
      `API key “${input.keyName}” (${input.keyPrefix}) was created on your account.`,
      `<p style="color:#a1a1aa;font-size:15px;line-height:1.6;">Hi ${first},</p>
       <p style="color:#a1a1aa;font-size:15px;line-height:1.6;">A new public API key named <strong style="color:#fff;">${escapeHtml(input.keyName)}</strong> (starting <strong style="color:#fff;">${escapeHtml(input.keyPrefix)}</strong>) was created on your WorldEye account on <strong style="color:#fff;">${escapeHtml(input.whenLabel)}</strong>. The full key was shown once, to whoever created it — it is never included in email.</p>
       <p style="color:#a1a1aa;font-size:15px;line-height:1.6;">If that wasn't you, revoke the key immediately under <strong style="color:#fff;">Settings → Developer</strong> and change your password.</p>`,
      { label: "Manage my API keys", href: appUrl("/settings") },
      { why: "You're receiving this because a new API key was created on your WorldEye account." },
    ),
  };
}

// ── Account deletion pair (2026-11 expansion, pick 16) ─────────────

export function deletionScheduledEmail(input: {
  name: string | null;
  /** e.g. "November 15, 2026" — the hard-delete date. */
  scheduledForLabel: string;
  /** The honest subscription note requestDeletion already computes. */
  subscriptionNote: string | null;
}): { subject: string; html: string } {
  const first = escapeHtml(input.name?.split(" ")[0] ?? "there");
  const subLine = input.subscriptionNote
    ? `<p style="color:#a1a1aa;font-size:15px;line-height:1.6;">${escapeHtml(input.subscriptionNote)}</p>`
    : "";
  return {
    subject: "Your WorldEye account is scheduled for deletion",
    html: shell(
      "Deletion scheduled",
      `Your account will be permanently deleted on ${input.scheduledForLabel} unless you cancel.`,
      `<p style="color:#a1a1aa;font-size:15px;line-height:1.6;">Hi ${first},</p>
       <p style="color:#a1a1aa;font-size:15px;line-height:1.6;">You've asked us to delete your WorldEye account. It is scheduled for permanent deletion on <strong style="color:#fff;">${escapeHtml(input.scheduledForLabel)}</strong>. Until then your account works normally.</p>
       ${subLine}
       <p style="color:#a1a1aa;font-size:15px;line-height:1.6;">Changed your mind? Sign in and cancel the deletion from <strong style="color:#fff;">Settings</strong> any time before that date — nothing is lost if you do.</p>`,
      { label: "Review or cancel deletion", href: appUrl("/settings") },
      { why: "You're receiving this because you requested deletion of your WorldEye account." },
    ),
  };
}

export function deletionCompletedEmail(input: {
  name: string | null;
}): { subject: string; html: string } {
  const first = escapeHtml(input.name?.split(" ")[0] ?? "there");
  return {
    subject: "Your WorldEye account has been deleted",
    html: shell(
      "Account deleted",
      "Your WorldEye account and its data have been permanently deleted.",
      `<p style="color:#a1a1aa;font-size:15px;line-height:1.6;">Hi ${first},</p>
       <p style="color:#a1a1aa;font-size:15px;line-height:1.6;">As requested, your WorldEye account has now been permanently deleted, along with your saved cameras, settings and account data. Any subscription was cancelled first — you will not be charged again.</p>
       <p style="color:#a1a1aa;font-size:15px;line-height:1.6;">The free globe is still there if you ever want to look — no account needed. If you didn't request this deletion, reach us through the contact page and we'll help.</p>`,
      { label: "Contact us", href: appUrl("/contact") },
      { why: "You're receiving this to confirm a deletion you requested." },
    ),
  };
}

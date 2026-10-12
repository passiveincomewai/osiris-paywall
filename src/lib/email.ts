// Transactional email via Resend (raw fetch — no SDK needed).
// Used for signup verification and password resets. The Auth.js magic-link
// provider sends its own emails; this is for our account flows.

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
      body: JSON.stringify({ from: fromAddress(), to, subject, html }),
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

function shell(title: string, preheader: string, bodyHtml: string, cta: { label: string; href: string } | null): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#050508;color:#e4e4e7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
<div style="max-width:520px;margin:0 auto;padding:40px 24px;">
<div style="text-align:center;margin-bottom:28px;">
<div style="font-size:22px;font-weight:800;letter-spacing:0.08em;"><span style="color:#fff;">World</span><span style="color:#D4AF37;">Eye</span></div>
</div>
<div style="background:rgba(255,255,255,0.04);border:1px solid rgba(212,175,55,0.25);border-radius:16px;padding:32px 28px;">
<h1 style="margin:0 0 12px;font-size:20px;color:#fff;">${title}</h1>
${bodyHtml}
${cta ? `<div style="text-align:center;margin:26px 0 8px;"><a href="${cta.href}" style="display:inline-block;background:#D4AF37;color:#000;font-weight:700;font-size:15px;padding:13px 34px;border-radius:12px;text-decoration:none;">${cta.label}</a></div>
<p style="font-size:12px;color:#71717a;word-break:break-all;">Or paste this link:<br><span style="color:#a1a1aa;">${cta.href}</span></p>` : ""}
</div>
<p style="text-align:center;font-size:12px;color:#52525b;margin-top:24px;">WorldEye — see the world live.<br>If you didn't request this, you can safely ignore it.</p>
</div></body></html>`;
}

export function appUrl(path: string): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://worldeye.app");
  return `${base}${path}`;
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

function escapeHtml(s: string): string {
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

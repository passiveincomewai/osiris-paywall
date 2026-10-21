// Email templates for the change-email flow. The shared shell() helper in
// lib/email.ts isn't exported, so these mirror its markup and styling
// tokens exactly and send through the same lib/email sendEmail mailer.

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
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

/** Sent to the NEW address: confirming the link is what applies the change. */
export function changeEmailConfirmEmail(
  name: string | null,
  newEmail: string,
  confirmUrl: string,
): { subject: string; html: string } {
  const first = name?.split(" ")[0] ?? "there";
  return {
    subject: "Confirm your new WorldEye email address",
    html: shell(
      "Confirm your new email",
      "Confirm this address to finish changing your WorldEye account email.",
      `<p style="color:#a1a1aa;font-size:15px;line-height:1.6;">Hi ${escapeHtml(first)},</p>
       <p style="color:#a1a1aa;font-size:15px;line-height:1.6;">You asked to change your WorldEye account email to <strong style="color:#fff;">${escapeHtml(newEmail)}</strong>. Click below to confirm this address — the link expires in 24 hours.</p>
       <p style="color:#a1a1aa;font-size:15px;line-height:1.6;">Your current email stays on the account (and keeps working for sign-in) until you confirm.</p>`,
      { label: "Confirm new email", href: confirmUrl },
    ),
  };
}

/** Sent to the OLD address after a change lands, as a security heads-up. */
export function emailChangedNoticeEmail(
  name: string | null,
  newEmail: string,
): { subject: string; html: string } {
  const first = name?.split(" ")[0] ?? "there";
  return {
    subject: "Your WorldEye account email was changed",
    html: shell(
      "Your account email changed",
      "Your WorldEye account email was changed. Not you? Contact support.",
      `<p style="color:#a1a1aa;font-size:15px;line-height:1.6;">Hi ${escapeHtml(first)},</p>
       <p style="color:#a1a1aa;font-size:15px;line-height:1.6;">The email address on your WorldEye account was just changed to <strong style="color:#fff;">${escapeHtml(newEmail)}</strong>. From now on, sign in with the new address.</p>
       <p style="color:#a1a1aa;font-size:15px;line-height:1.6;">If you made this change, no action is needed. If it wasn't you, contact us right away at <a href="mailto:passiveincomewai@gmail.com" style="color:#fff;">passiveincomewai@gmail.com</a> so we can secure your account.</p>`,
      null,
    ),
  };
}

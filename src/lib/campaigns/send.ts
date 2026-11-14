// Campaign sending via the Resend API — the outreach sender identity
// (WorldEye <hello@outreach.worldeye.app>) on the verified outreach
// domain, using the site's AUTH_RESEND_KEY (same Resend account).
//
// Unlike lib/email's boolean sendEmail, campaign sends must surface
// the Resend message id (stored on the recipient row) and the exact
// provider error (stored as the recipient's failure reason), so this
// module returns a result object and never throws for provider errors.

import { escapeHtml } from "@/lib/email";
import { renderTemplate, type RecipientMeta } from "./templates";

export const POSTAL_ADDRESS = "555 E 3200 N, North Ogden, UT 84414";

export function footerText(): string {
  return `\n\n—\nWorldEye · ${POSTAL_ADDRESS}\nReply UNSUBSCRIBE to opt out.`;
}

export function footerHtml(): string {
  return `<div style="margin-top:32px;padding-top:16px;border-top:1px solid #e4e4e7;font-size:12px;color:#71717a;line-height:1.6;">WorldEye · ${POSTAL_ADDRESS}<br>Reply UNSUBSCRIBE to opt out.</div>`;
}

/** Plain-text body → simple, honest HTML: escaped paragraphs. Used
 * when a campaign has no bodyHtml of its own. */
export function textToHtml(text: string): string {
  const paras = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p style="margin:0 0 14px;">${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;line-height:1.6;color:#18181b;max-width:640px;">${paras}</div>`;
}

export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

/** Render one recipient's email: tokens resolved, CAN-SPAM footer
 * appended to both parts. The admin preview uses this same function,
 * so the preview is byte-identical to what sends. */
export function renderCampaignEmail(
  campaign: { subject: string; bodyText: string; bodyHtml: string | null },
  meta: RecipientMeta,
): RenderedEmail {
  const subject = renderTemplate(campaign.subject, meta);
  const bodyText = renderTemplate(campaign.bodyText, meta);
  const baseHtml = campaign.bodyHtml
    ? renderTemplate(campaign.bodyHtml, meta)
    : textToHtml(bodyText);
  const html = baseHtml.includes("</body>")
    ? baseHtml.replace("</body>", `${footerHtml()}</body>`)
    : `${baseHtml}${footerHtml()}`;
  return { subject, text: `${bodyText}${footerText()}`, html };
}

export type SendResult = { ok: true; id: string } | { ok: false; error: string };

export async function sendCampaignEmail(input: {
  fromName: string;
  fromEmail: string;
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<SendResult> {
  const key = process.env.AUTH_RESEND_KEY;
  if (!key) return { ok: false, error: "AUTH_RESEND_KEY is not configured on the server" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${input.fromName} <${input.fromEmail}>`,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });
    const body = (await res.json().catch(() => null)) as { id?: string; message?: string; name?: string } | null;
    if (!res.ok) {
      const msg = body?.message || body?.name || `Resend HTTP ${res.status}`;
      return { ok: false, error: String(msg).slice(0, 500) };
    }
    if (!body?.id) return { ok: false, error: "Resend returned no message id" };
    return { ok: true, id: body.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message.slice(0, 500) : "Network error sending email" };
  }
}

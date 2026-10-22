/**
 * Event-alert + brief email templates. Sent through lib/email's
 * sendEmail (Resend) — templates live here so the VIP feature owns
 * its copy end to end, the way camera alerts own theirs.
 */
import { appUrl } from "@/lib/email";

function shell(title: string, inner: string): string {
  return `<!doctype html><html><body style="margin:0;background:#050b14;color:#dbe7f3;font-family:Arial,Helvetica,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:28px 20px">
  <div style="font-size:11px;letter-spacing:3px;color:#7dd3fc;text-transform:uppercase">WorldEye · VIP Pro</div>
  <h1 style="font-size:20px;line-height:1.35;color:#ffffff;margin:12px 0 10px">${title}</h1>
  ${inner}
  <p style="margin:22px 0 0"><a href="${appUrl("/vip")}" style="display:inline-block;padding:10px 18px;border-radius:10px;background:linear-gradient(135deg,#38bdf8,#0096FF);color:#04121f;font-weight:bold;text-decoration:none">Open your VIP hub</a></p>
  <p style="font-size:11px;color:#64748b;margin:20px 0 0">You get these emails because you turned on email for a WorldEye VIP event alert or brief. Manage them in the VIP hub.</p>
</div></body></html>`;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function eventAlertEmail(input: {
  title: string;
  body: string;
}): { subject: string; html: string } {
  return {
    subject: input.title,
    html: shell(
      esc(input.title),
      `<p style="font-size:14px;line-height:1.6;color:#cbd5e1">${esc(input.body)}</p>`,
    ),
  };
}

export interface BriefEmailSection {
  heading: string;
  lines: string[];
}

export function briefEmail(input: {
  name: string | null;
  sections: BriefEmailSection[];
}): { subject: string; html: string } {
  const inner = input.sections
    .map(
      (s) => `
  <h2 style="font-size:13px;letter-spacing:2px;color:#7dd3fc;text-transform:uppercase;margin:22px 0 8px">${esc(s.heading)}</h2>
  ${s.lines.map((l) => `<p style="font-size:14px;line-height:1.55;color:#cbd5e1;margin:4px 0">${esc(l)}</p>`).join("")}`,
    )
    .join("");
  return {
    subject: "Your WorldEye brief — quakes, launches, passes and your alerts",
    html: shell(`Your brief${input.name ? `, ${esc(input.name)}` : ""}`, inner),
  };
}

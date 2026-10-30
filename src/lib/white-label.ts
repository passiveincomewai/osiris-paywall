// ── White Label demo requests ───────────────────────────────────────────
// The /white-label page is a demand-validation surface for an UPCOMING
// offering (early-access pilot — see the page copy). Its form does not
// create a second lead store: submissions are composed into a single
// ContactMessage (src/lib/contact pipeline) with the topic
// "white-label-demo", so they land in the same admin inbox and the same
// contact-alerts forwarder as every other contact message.
//
// This module holds the form's field rules and the message composer —
// pure, shared by the API route (src/app/api/white-label-demo) and the
// client form, and unit-tested like src/lib/contact.

import {
  CONTACT_MESSAGE_MAX,
  CONTACT_NAME_MAX,
  CONTACT_TOPIC_VALUES,
} from "@/lib/contact";

/** The ContactMessage topic every White Label demo request carries. */
export const WHITE_LABEL_DEMO_TOPIC = "white-label-demo";

export const WHITE_LABEL_ORG_TYPES = [
  { value: "ski-resort", label: "Ski resort" },
  { value: "tourism", label: "Tourism board / destination" },
  { value: "media", label: "Media company" },
  { value: "enterprise", label: "Enterprise / business" },
  { value: "other", label: "Other" },
] as const;

export type WhiteLabelOrgType = (typeof WHITE_LABEL_ORG_TYPES)[number]["value"];

export const WHITE_LABEL_SCALES = [
  { value: "single", label: "One location or property" },
  { value: "few", label: "A few locations (2–10)" },
  { value: "regional", label: "A region or network (10+)" },
  { value: "national-global", label: "National / global" },
] as const;

export type WhiteLabelScale = (typeof WHITE_LABEL_SCALES)[number]["value"];

export const WHITE_LABEL_COMPANY_MAX = 150;
export const WHITE_LABEL_WEBSITE_MAX = 300;
/** The visitor's own words — capped so the composed ContactMessage
 *  (field lines + this text) always fits CONTACT_MESSAGE_MAX. */
export const WHITE_LABEL_MESSAGE_MIN = 10;
export const WHITE_LABEL_MESSAGE_MAX = 3000;

export interface WhiteLabelDemoSubmission {
  name: string;
  /** Trimmed + lowercased here; full validation (syntax, disposable,
   *  junk, DNS) runs server-side via validateEmailAddress. */
  email: string;
  company: string;
  website: string;
  orgType: WhiteLabelOrgType;
  scale: WhiteLabelScale;
  message: string;
}

export type WhiteLabelDemoParse =
  | { ok: true; data: WhiteLabelDemoSubmission }
  | { ok: false; error: string };

function orgTypeLabel(value: string): string {
  return WHITE_LABEL_ORG_TYPES.find((t) => t.value === value)?.label ?? value;
}

function scaleLabel(value: string): string {
  return WHITE_LABEL_SCALES.find((s) => s.value === value)?.label ?? value;
}

/** Validate + normalize a raw demo-form body (everything except the
 *  email's full validation, which needs DNS and runs in the route). */
export function parseWhiteLabelDemoSubmission(body: unknown): WhiteLabelDemoParse {
  const b = (body ?? {}) as Record<string, unknown>;
  const name = String(b.name ?? "").trim().slice(0, CONTACT_NAME_MAX);
  const email = String(b.email ?? "").trim().toLowerCase();
  const company = String(b.company ?? "").trim().slice(0, WHITE_LABEL_COMPANY_MAX);
  const website = String(b.website ?? "").trim().slice(0, WHITE_LABEL_WEBSITE_MAX);
  const orgType = String(b.orgType ?? "");
  const scale = String(b.scale ?? "");
  const message = String(b.message ?? "").trim().slice(0, WHITE_LABEL_MESSAGE_MAX);

  if (name.length < 1) return { ok: false, error: "Enter your name." };
  if (email.length < 3 || !email.includes("@")) {
    return { ok: false, error: "Enter a valid work email address." };
  }
  if (company.length < 1) return { ok: false, error: "Enter your company or organisation." };
  if (website.length > 0 && !/^(https?:\/\/)?[^\s]+\.[^\s]+$/.test(website)) {
    return { ok: false, error: "That website doesn't look right — check it or leave it blank." };
  }
  if (!WHITE_LABEL_ORG_TYPES.some((t) => t.value === orgType)) {
    return { ok: false, error: "Choose the type of organisation." };
  }
  if (!WHITE_LABEL_SCALES.some((s) => s.value === scale)) {
    return { ok: false, error: "Choose the scale you're planning for." };
  }
  if (message.length < WHITE_LABEL_MESSAGE_MIN) {
    return {
      ok: false,
      error: `Tell us a little more about what you want to show (at least ${WHITE_LABEL_MESSAGE_MIN} characters).`,
    };
  }
  return {
    ok: true,
    data: {
      name,
      email,
      company,
      website,
      orgType: orgType as WhiteLabelOrgType,
      scale: scale as WhiteLabelScale,
      message,
    },
  };
}

/** Compose the ContactMessage body for a demo request. The field lines
 *  make the lead self-describing in the admin inbox and in the forwarded
 *  alert email, which both render the message text as-is. */
export function composeWhiteLabelDemoMessage(d: WhiteLabelDemoSubmission): string {
  const lines = [
    "White Label demo request (via worldeye.app/white-label)",
    "",
    `Company: ${d.company}`,
    `Organisation type: ${orgTypeLabel(d.orgType)}`,
    `Expected scale: ${scaleLabel(d.scale)}`,
  ];
  if (d.website) lines.push(`Website: ${d.website}`);
  lines.push("", "What they want to show:", d.message);
  return lines.join("\n").slice(0, CONTACT_MESSAGE_MAX);
}

/** Guard against drift: the topic this module writes must stay a member
 *  of the shared contact topic list (admin labels + parser). */
export function whiteLabelTopicIsRegistered(): boolean {
  return CONTACT_TOPIC_VALUES.includes(WHITE_LABEL_DEMO_TOPIC);
}

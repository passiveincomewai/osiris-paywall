// ── Partnership applications: shared types + submission validation ─────
// Used by the public form (src/components/partners/PartnershipForm), the
// public POST /api/partners/apply route, the owner notification email and
// the admin CRM (/admin/partnerships) — one source of truth for the
// partnership type list, the CRM status list and the field rules so the
// four can't drift. Mirrors the src/lib/contact.ts idiom deliberately.

import { isValidEmail, normalizeEmail } from "@/lib/password-auth";
import { appUrl, escapeHtml, shell } from "@/lib/email";

/** The sixteen partnership categories the /partners page recruits for,
 *  plus an explicit catch-all (the sixteenth category is itself for
 *  proposals that don't fit a category, but the form keeps a plain
 *  "something else" so nobody has to force-fit). */
export const PARTNERSHIP_TYPES = [
  { value: "website-app-owners", label: "Website & App Owners" },
  { value: "saas-founders", label: "SaaS & Technology Founders" },
  { value: "osint-platforms", label: "OSINT & Intelligence Platforms" },
  { value: "camera-networks", label: "Live Camera & Streaming Networks" },
  { value: "data-providers", label: "API & Data Providers" },
  { value: "developers-oss", label: "Developers & Open-Source Projects" },
  { value: "ai-companies", label: "AI Companies" },
  { value: "media-publishers", label: "Media & News Publishers" },
  { value: "travel-tourism-ski", label: "Travel, Tourism & Ski Resorts" },
  { value: "creators-communities", label: "Content Creators & Communities" },
  { value: "seo-publishers", label: "SEO & Content Publishers" },
  { value: "marketing-agencies", label: "Marketing Agencies" },
  { value: "enterprise-gov", label: "Enterprise & Government Technology" },
  { value: "education-research", label: "Education & Research Organizations" },
  { value: "investors-advisors", label: "Investors & Strategic Advisors" },
  { value: "startups-entrepreneurs", label: "Startups & Independent Entrepreneurs" },
  { value: "other", label: "Something else" },
] as const;

export type PartnershipType = (typeof PARTNERSHIP_TYPES)[number]["value"];

export const PARTNERSHIP_TYPE_VALUES: readonly string[] = PARTNERSHIP_TYPES.map((t) => t.value);

export function partnershipTypeLabel(value: string): string {
  return PARTNERSHIP_TYPES.find((t) => t.value === value)?.label ?? "Something else";
}

/** CRM lifecycle for an application, in the order an admin works it. */
export const PARTNERSHIP_STATUSES = [
  { value: "new", label: "New" },
  { value: "reviewing", label: "Reviewing" },
  { value: "contacted", label: "Contacted" },
  { value: "in-discussion", label: "In Discussion" },
  { value: "accepted", label: "Accepted" },
  { value: "declined", label: "Declined" },
] as const;

export type PartnershipStatus = (typeof PARTNERSHIP_STATUSES)[number]["value"];

export const PARTNERSHIP_STATUS_VALUES: readonly string[] = PARTNERSHIP_STATUSES.map((s) => s.value);

export function partnershipStatusLabel(value: string): string {
  return PARTNERSHIP_STATUSES.find((s) => s.value === value)?.label ?? "New";
}

/** Where new-application notifications go (the site owner). */
export const PARTNERSHIP_OWNER_EMAIL = "passiveincomewai@gmail.com";

export const PARTNER_NAME_MAX = 100;
export const PARTNER_COMPANY_MAX = 120;
export const PARTNER_WEBSITE_MAX = 300;
export const PARTNER_AUDIENCE_MAX = 80;
export const PARTNER_OPPORTUNITY_MAX = 160;
export const PARTNER_SHORT_MIN = 10;
export const PARTNER_SHORT_MAX = 2000;
export const PARTNER_PROPOSAL_MIN = 20;
export const PARTNER_PROPOSAL_MAX = 5000;
export const PARTNER_NOTES_MAX = 5000;

export interface PartnershipApplicationInput {
  name: string;
  email: string;
  company: string;
  website: string;
  type: PartnershipType;
  audienceSize: string | null;
  resources: string;
  seeking: string;
  proposal: string;
  opportunity: string | null;
}

export type PartnershipParse =
  | { ok: true; data: PartnershipApplicationInput }
  | { ok: false; error: string };

function shortField(
  raw: unknown,
  label: string,
): { ok: true; value: string } | { ok: false; error: string } {
  const value = String(raw ?? "").trim().slice(0, PARTNER_SHORT_MAX);
  if (value.length < PARTNER_SHORT_MIN) {
    return {
      ok: false,
      error: `${label} is too short — add a little more detail (at least ${PARTNER_SHORT_MIN} characters).`,
    };
  }
  return { ok: true, value };
}

/** Validate + normalize a raw application-form body. Pure — unit tested. */
export function parsePartnershipApplication(body: unknown): PartnershipParse {
  const b = (body ?? {}) as Record<string, unknown>;
  const name = String(b.name ?? "").trim().slice(0, PARTNER_NAME_MAX);
  const email = normalizeEmail(String(b.email ?? ""));
  const company = String(b.company ?? "").trim().slice(0, PARTNER_COMPANY_MAX);
  const websiteRaw = String(b.website ?? "").trim().slice(0, PARTNER_WEBSITE_MAX);
  const type = String(b.type ?? "");
  const audienceRaw = String(b.audienceSize ?? "").trim().slice(0, PARTNER_AUDIENCE_MAX);
  const opportunityRaw = String(b.opportunity ?? "").trim().slice(0, PARTNER_OPPORTUNITY_MAX);
  const proposal = String(b.proposal ?? "").trim().slice(0, PARTNER_PROPOSAL_MAX);

  if (name.length < 1) return { ok: false, error: "Enter your name." };
  if (!isValidEmail(email)) return { ok: false, error: "Enter a valid email address." };
  if (company.length < 1) return { ok: false, error: "Enter your company or project name." };
  // Website: lenient on purpose — a bare domain is fine, a full URL is
  // fine; what we reject is something that can't be a site at all.
  const websiteHost = websiteRaw.replace(/^https?:\/\//i, "").replace(/\/.*$/, "");
  if (websiteRaw.length < 4 || !websiteHost.includes(".") || /\s/.test(websiteRaw)) {
    return { ok: false, error: "Enter your website (for example, example.com)." };
  }
  if (!PARTNERSHIP_TYPE_VALUES.includes(type)) {
    return { ok: false, error: "Choose a partnership type from the list." };
  }
  const resources = shortField(b.resources, "What you can contribute");
  if (!resources.ok) return resources;
  const seeking = shortField(b.seeking, "What you're looking for");
  if (!seeking.ok) return seeking;
  if (proposal.length < PARTNER_PROPOSAL_MIN) {
    return {
      ok: false,
      error: `Tell us a little more about the collaboration you're proposing (at least ${PARTNER_PROPOSAL_MIN} characters).`,
    };
  }

  return {
    ok: true,
    data: {
      name,
      email,
      company,
      website: websiteRaw,
      type: type as PartnershipType,
      audienceSize: audienceRaw.length > 0 ? audienceRaw : null,
      resources: resources.value,
      seeking: seeking.value,
      proposal,
      opportunity: opportunityRaw.length > 0 ? opportunityRaw : null,
    },
  };
}

/** Owner notification for a stored application. Rendered in the shared
 *  branded shell; every applicant-supplied value is escaped. */
export function partnershipApplicationEmail(
  app: PartnershipApplicationInput,
): { subject: string; html: string } {
  const typeLabel = partnershipTypeLabel(app.type);
  const row = (label: string, value: string) =>
    `<p style="margin:0 0 10px;font-size:14px;line-height:1.6;color:#a1a1aa;"><span style="color:#fff;font-weight:600;">${label}:</span> ${escapeHtml(value)}</p>`;
  const body = [
    row("From", `${app.name} — ${app.email}`),
    row("Company / project", app.company),
    row("Website", app.website),
    row("Partnership type", typeLabel),
    app.audienceSize ? row("Audience size", app.audienceSize) : "",
    app.opportunity ? row("Opportunity", app.opportunity) : "",
    row("They can contribute", app.resources),
    row("They're looking for", app.seeking),
    row("Proposal", app.proposal),
  ].join("");
  return {
    subject: `New partnership application: ${app.company} (${typeLabel})`,
    html: shell(
      "New partnership application",
      `${escapeHtml(app.company)} applied via the /partners page — ${typeLabel}.`,
      body,
      { label: "Open the partnership CRM", href: appUrl("/admin/partnerships") },
      { why: "You received this because a visitor submitted the partnership application form on worldeye.app." },
    ),
  };
}

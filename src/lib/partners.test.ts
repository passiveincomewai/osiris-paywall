/* Partnership applications: the shared parser is the single gate for the
   public form, the API route and the CRM — pin its contract: valid
   submissions normalize (email lowercased, optionals → null), and every
   required field rejects with a specific, human error. */
import { describe, it, expect } from "vitest";
import {
  parsePartnershipApplication,
  partnershipTypeLabel,
  partnershipStatusLabel,
  partnershipApplicationEmail,
  PARTNERSHIP_TYPES,
  PARTNERSHIP_STATUSES,
} from "./partners";

const VALID = {
  name: "Alex Rivera",
  email: "Alex@Example.com",
  company: "Trailhead Weather",
  website: "trailheadweather.com",
  type: "data-providers",
  audienceSize: "40k monthly users",
  resources: "A hyperlocal mountain forecast API with 10 years of history.",
  seeking: "Camera context for our trail-condition pages and an API trade.",
  proposal: "We embed your eligible resort cameras in our trail pages with attribution; you integrate our forecast API into your ski pages.",
  opportunity: "Mountain weather data for ski & resort pages",
};

describe("parsePartnershipApplication", () => {
  it("accepts a complete application and normalizes it", () => {
    const parsed = parsePartnershipApplication(VALID);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.data.email).toBe("alex@example.com");
    expect(parsed.data.type).toBe("data-providers");
    expect(parsed.data.audienceSize).toBe("40k monthly users");
    expect(parsed.data.opportunity).toContain("Mountain weather");
  });

  it("treats audience size and opportunity as optional", () => {
    const parsed = parsePartnershipApplication({ ...VALID, audienceSize: "", opportunity: undefined });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.data.audienceSize).toBeNull();
    expect(parsed.data.opportunity).toBeNull();
  });

  it("accepts a full URL as the website", () => {
    const parsed = parsePartnershipApplication({ ...VALID, website: "https://trailheadweather.com/about" });
    expect(parsed.ok).toBe(true);
  });

  it("rejects a missing name, company and a bad email", () => {
    expect(parsePartnershipApplication({ ...VALID, name: " " }).ok).toBe(false);
    expect(parsePartnershipApplication({ ...VALID, company: "" }).ok).toBe(false);
    expect(parsePartnershipApplication({ ...VALID, email: "not-an-email" }).ok).toBe(false);
  });

  it("rejects a website that cannot be a site", () => {
    expect(parsePartnershipApplication({ ...VALID, website: "hello" }).ok).toBe(false);
    expect(parsePartnershipApplication({ ...VALID, website: "has spaces.com" }).ok).toBe(false);
    expect(parsePartnershipApplication({ ...VALID, website: "" }).ok).toBe(false);
  });

  it("rejects an unknown partnership type", () => {
    expect(parsePartnershipApplication({ ...VALID, type: "reseller" }).ok).toBe(false);
  });

  it("rejects too-short contribution, seeking and proposal fields", () => {
    expect(parsePartnershipApplication({ ...VALID, resources: "stuff" }).ok).toBe(false);
    expect(parsePartnershipApplication({ ...VALID, seeking: "things" }).ok).toBe(false);
    expect(parsePartnershipApplication({ ...VALID, proposal: "let's talk" }).ok).toBe(false);
  });

  it("rejects an empty body", () => {
    expect(parsePartnershipApplication(null).ok).toBe(false);
    expect(parsePartnershipApplication(undefined).ok).toBe(false);
  });
});

describe("labels", () => {
  it("labels every type and status value, with safe fallbacks", () => {
    for (const t of PARTNERSHIP_TYPES) expect(partnershipTypeLabel(t.value)).toBe(t.label);
    for (const s of PARTNERSHIP_STATUSES) expect(partnershipStatusLabel(s.value)).toBe(s.label);
    expect(partnershipTypeLabel("bogus")).toBe("Something else");
    expect(partnershipStatusLabel("bogus")).toBe("New");
  });
});

describe("partnershipApplicationEmail", () => {
  it("renders the application into the branded shell, escaped", () => {
    const parsed = parsePartnershipApplication({ ...VALID, company: "<b>Evil</b> Co" });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const { subject, html } = partnershipApplicationEmail(parsed.data);
    expect(subject).toContain("New partnership application:");
    expect(html).toContain("&lt;b&gt;Evil&lt;/b&gt;");
    expect(html).not.toContain("<b>Evil</b>");
    expect(html).toContain("/admin/partnerships");
    expect(html).toContain("API &amp; Data Providers");
  });
});

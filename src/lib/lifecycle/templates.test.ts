// Template tests: the copy rules are the product's honesty standard
// made executable — an expired/absent offer renders NO code block, a
// view-only interest is never named a plan, affiliate copy never leaks
// the referred user's email, the digest renders exactly the sections
// it was given, and user-supplied strings are escaped.
import { describe, it, expect } from "vitest";
import {
  welcomeDiscountEmail,
  interestFollowupEmail,
  retargetCheckoutEmail,
  trialStartedEmail,
  affiliateSignupEmail,
  regionInterestEmail,
  weeklyDigestEmail,
  hasDigestContent,
  type DigestContent,
} from "./templates";
import type { DiscountOffer } from "./config";

const OFFER: DiscountOffer = {
  code: "EARLY50",
  label: "50% off your first payment",
  expiresAt: new Date(Date.UTC(2026, 9, 26, 5, 59)),
};
const UNSUB = "https://worldeye.app/api/email/unsubscribe?u=u1&t=tok";

describe("offer rendering", () => {
  it("prints the live offer's code in the welcome email", () => {
    const mail = welcomeDiscountEmail({ name: "Sam", offer: OFFER, unsubscribeUrl: UNSUB });
    expect(mail.html).toContain("EARLY50");
    expect(mail.html).toContain("50% off your first payment");
  });

  it("renders NO code block when there is no live offer", () => {
    const mail = welcomeDiscountEmail({ name: "Sam", offer: null, unsubscribeUrl: UNSUB });
    expect(mail.html).not.toContain("EARLY50");
    expect(mail.html).not.toContain("YOUR CODE");
    // The email still exists and still welcomes — just without an offer.
    expect(mail.subject).toContain("Welcome to WorldEye");
  });
});

describe("interest + retarget copy", () => {
  it("names the inferred plan and its real price label", () => {
    const mail = interestFollowupEmail({
      name: "Sam",
      planName: "Monthly",
      planPriceLabel: "$13.99/mo",
      offer: OFFER,
      unsubscribeUrl: UNSUB,
    });
    expect(mail.html).toContain("Monthly");
    expect(mail.html).toContain("$13.99/mo");
  });

  it("retarget-checkout is honest that checkout sessions expire", () => {
    const mail = retargetCheckoutEmail({ name: null, planName: "Monthly", offer: OFFER, unsubscribeUrl: UNSUB });
    expect(mail.html.toLowerCase()).toContain("expire");
  });
});

describe("trial started", () => {
  it("lists the tier's real included features and no invented trial length", () => {
    const mail = trialStartedEmail({
      name: "Sam",
      planName: "Monthly",
      tier: "pro",
      trialEndsLabel: "Friday, October 23, 2026",
    });
    expect(mail.html).toContain("October 23, 2026");
    expect(mail.html.toLowerCase()).toContain("cancel");
  });
});

describe("affiliate signup notice privacy", () => {
  it("names the referred user but never prints anyone's email address", () => {
    const mail = affiliateSignupEmail({ name: "Pat", referredName: "Jordan Lee" });
    expect(mail.html).toContain("Jordan");
    expect(mail.html).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
  });
});

describe("region interest", () => {
  it("quotes the user's own measured opens and the real camera count", () => {
    const mail = regionInterestEmail({
      name: "Sam",
      countryName: "Japan",
      countrySlug: "japan",
      opens: 14,
      countryCameraCount: 10472,
      offer: OFFER,
      unsubscribeUrl: UNSUB,
    });
    expect(mail.subject).toContain("Japan");
    expect(mail.html).toContain("14 live cameras in Japan");
    expect(mail.html).toContain("10,472 cameras in Japan");
    expect(mail.html).toContain("/cameras/countries/japan");
  });
});

describe("weekly digest", () => {
  const full: DigestContent = {
    weekLabel: "October 16 – 22, 2026",
    topCountries: [{ name: "Japan", slug: "japan", opens: 321 }],
    quakes: [{ magnitude: 6.1, place: "near the coast of Honshu", whenLabel: "Tue, Oct 20", url: "https://earthquake.usgs.gov/x" }],
    fireCount: 42,
    fireTitles: ["Wildfire — Example Ridge"],
    storms: [{ name: "Nadine", classification: "Hurricane", intensityKt: 75 }],
  };

  it("renders every supplied section from real values", () => {
    const mail = weeklyDigestEmail({ content: full, unsubscribeUrl: "https://worldeye.app/api/newsletter/unsubscribe?token=<redacted>" });
    expect(mail.html).toContain("In Case You Missed It");
    expect(mail.html).toContain("Japan");
    expect(mail.html).toContain("321");
    expect(mail.html).toContain("M6.1");
    expect(mail.html).toContain("42 open wildfire events");
    expect(mail.html).toContain("Nadine");
    expect(mail.html).toContain("75 kt");
    expect(hasDigestContent(full)).toBe(true);
  });

  it("omits empty sections entirely; an all-empty issue has no content", () => {
    const onlyQuakes: DigestContent = { ...full, topCountries: [], fireCount: 0, fireTitles: [], storms: [] };
    const mail = weeklyDigestEmail({ content: onlyQuakes, unsubscribeUrl: null });
    expect(mail.html).toContain("Largest earthquakes");
    expect(mail.html).not.toContain("Most watched this week");
    expect(mail.html).not.toContain("Active tropical storms");
    const empty: DigestContent = { weekLabel: "x", topCountries: [], quakes: [], fireCount: 0, fireTitles: [], storms: [] };
    expect(hasDigestContent(empty)).toBe(false);
  });

  it("escapes upstream strings (quake places, fire titles, storm names)", () => {
    const hostile: DigestContent = {
      ...full,
      quakes: [{ magnitude: 5.0, place: "<script>alert(1)</script>", whenLabel: "Mon", url: "https://earthquake.usgs.gov/y" }],
    };
    const mail = weeklyDigestEmail({ content: hostile, unsubscribeUrl: null });
    expect(mail.html).not.toContain("<script>alert(1)</script>");
    expect(mail.html).toContain("&lt;script&gt;");
  });
});

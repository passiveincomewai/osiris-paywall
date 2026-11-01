/**
 * PREMIUM FEATURE LIST — the one list the globe's Premium section
 * (components/PremiumSection) renders under the merged Search & Route
 * section.
 *
 * Sourced from the pricing page's own plan data (the English pricing
 * dictionary, src/i18n/dictionaries/en/pricing.ts): every entry is a
 * proFeatures or vipFeatures card title verbatim, with the tier that
 * card sells it under, plus "Advanced search filters" — a premium
 * row in the pricing comparison matrix that has no card. Nothing
 * here is invented: premium-features.test.ts reads the dictionary
 * and fails if a title drifts, appears, or disappears on either
 * side. (Blurbs re-synced 2026-11-01, master repair: the intel and
 * timelapse blurbs end "Ultra only", like the current cards.)
 *
 * Blurbs are the pricing cards' descriptions, lightly shortened for
 * a panel-width row.
 */
export interface PremiumFeature {
  /** Display name — the pricing card's title, word for word. */
  name: string;
  /** The lowest tier that unlocks it (vip ⊃ pro, lib/plan-tier). */
  tier: "pro" | "vip";
  /** One-line description, from the pricing card. */
  blurb: string;
}

export const PREMIUM_FEATURES: PremiumFeature[] = [
  // ── Pro (Weekly / Monthly) — PricingClient PRO_FEATURES, in order,
  //    with COMPARE_ROWS' card-less premium row in its table position.
  {
    name: "OI AI Assistant",
    tier: "pro",
    blurb: "Talk to the map. Forecasts, analysis and recon — powered by WorldEye's built-in AI.",
  },
  {
    name: "Live Traffic Layer",
    tier: "pro",
    blurb: "Modeled traffic on the road network — vehicles modeled from road data, clearly labeled as modeled; live traffic flow is not currently available.",
  },
  {
    name: "Advanced search filters",
    tier: "pro",
    blurb: "Narrow camera results by country, type and live feeds — places are never filtered.",
  },
  {
    name: "OSINT Toolkit",
    tier: "pro",
    blurb: "Nmap scans, DNS/WHOIS, SSL analysis and threat intel — in-browser.",
  },
  {
    name: "Camera Recording Studio",
    tier: "pro",
    blurb: "Record live camera feeds right in your browser and save the clips.",
  },
  {
    name: "Camera alerts (2)",
    tier: "pro",
    blurb: "Watch up to 2 cameras and get emailed — with the photo — when a condition you describe shows up.",
  },
  {
    name: "Unlimited camera opens",
    tier: "pro",
    blurb: "The free tier's camera-open allowance is gone — open as many cameras as you like.",
  },
  // ── VIP Pro (annual) — PricingClient VIP_FEATURES, in order.
  {
    name: "Premium Intel Feeds",
    tier: "vip",
    blurb: "Cyber threats, GDELT events, maritime tracking, conflict zones, live news — Ultra only.",
  },
  {
    name: "Camera Timelapse",
    tier: "vip",
    blurb: "Capture snapshot cameras frame by frame and export the film — Ultra only.",
  },
  {
    name: "Camera alerts (10)",
    tier: "vip",
    blurb: "The alert allowance raised to 10 watched cameras — Pro includes 2.",
  },
  {
    name: "Event alerts",
    tier: "vip",
    blurb: "Earthquakes near your places, launch reminders and ISS passes — email + in-app, in the VIP hub.",
  },
  {
    name: "Personal brief",
    tier: "vip",
    blurb: "Your alert events, quakes near your watched places, the best ISS pass and the next 48 hours of launches.",
  },
  {
    name: "Saved views",
    tier: "vip",
    blurb: "Name and keep up to 25 globe setups and restore any of them in one click, in the VIP hub.",
  },
];

/** Feature names per tier — the chips the upgrade embed pitches. */
export function premiumFeatureNames(tier: "pro" | "vip"): string[] {
  return PREMIUM_FEATURES.filter((f) => f.tier === tier).map((f) => f.name);
}

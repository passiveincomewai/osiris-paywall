/**
 * PREMIUM FEATURE LIST — the one list the globe's Premium section
 * (components/PremiumSection) renders under the merged Search & Route
 * section.
 *
 * Sourced from the pricing page's own plan data (src/app/pricing/
 * PricingClient.tsx): every entry is a PRO_FEATURES or VIP_FEATURES
 * card title verbatim, with the tier that card sells it under, plus
 * "Advanced search filters" — a premium row in the pricing page's
 * COMPARE_ROWS matrix that has no card. Nothing here is invented:
 * premium-features.test.ts reads PricingClient.tsx and fails if a
 * title drifts, appears, or disappears on either side.
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
    blurb: "Live TomTom congestion flow on the road network, with simulated vehicles clearly labeled as simulated.",
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
    name: "Every Future Layer",
    tier: "pro",
    blurb: "New premium feeds land in Pro first, at no extra cost.",
  },
  // ── VIP Pro (annual) — PricingClient VIP_FEATURES, in order.
  {
    name: "Premium Intel Feeds",
    tier: "vip",
    blurb: "Cyber threats, GDELT events, maritime tracking, conflict zones, live news — VIP only.",
  },
  {
    name: "Camera Timelapse",
    tier: "vip",
    blurb: "Capture snapshot cameras frame by frame and export the film — VIP only.",
  },
  {
    name: "Camera alerts (10)",
    tier: "vip",
    blurb: "The alert allowance raised to 10 watched cameras — Pro includes 2.",
  },
];

/** Feature names per tier — the chips the upgrade embed pitches. */
export function premiumFeatureNames(tier: "pro" | "vip"): string[] {
  return PREMIUM_FEATURES.filter((f) => f.tier === tier).map((f) => f.name);
}

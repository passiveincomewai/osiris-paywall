/**
 * English pricing dictionary — the source of truth for the localized
 * pricing page (dictionaries/<locale>/pricing.ts translate THIS file).
 *
 * Extracted verbatim 2026-10-26 from src/app/pricing/page.tsx
 * (metadata + SoftwareApplication schema) and
 * src/app/pricing/PricingClient.tsx (every rendered string). The
 * English pricing page renders from this dictionary, so the English
 * text is the versioned source the manifest's sourceHash is computed
 * over. Prices, per-day figures and discount percentages are factual
 * tokens (glossary-locked): translations copy the numbers unchanged.
 * Plan facts mirror src/lib/billing: weekly $7.99 with a 3-day free
 * trial, monthly $13.99 with 10 days free, VIP Pro (annual) $74.99
 * with 10 days free, Enterprise $999/year with no trial.
 *
 * NOT covered (separate components keep their own copy; they render
 * in English on localized pricing pages until their own conversion —
 * see the build REPORT): TeamSection, CancelReassurance,
 * ProofCounters, HostedCheckoutLink, CheckoutSheet, TrialButton.
 */

export interface PricingPlanCopy {
  name: string;
  price: string;
  per: string;
  perDay: string;
  note: string;
  save?: string;
  cta: string;
  trial?: string;
}

export interface PricingCopy {
  meta: {
    title: string;
    description: string;
    ogTitle: string;
    ogDescription: string;
  };
  /** SoftwareApplication "Free" offer description (JSON-LD). */
  schemaFreeOfferDescription: string;
  backToMap: string;
  proBadge: string;
  hero: {
    h1Before: string;
    h1Accent: string;
    h1After: string;
    sub: string;
  };
  toggle: {
    mostPopular: string;
    /** Discount chips rendered inside the billing toggle. */
    discountMonthly: string;
    discountAnnual: string;
  };
  plans: {
    weekly: PricingPlanCopy;
    monthly: PricingPlanCopy;
    annual: PricingPlanCopy;
    enterprise: PricingPlanCopy;
  };
  card: {
    proLabel: string;
    vipProLabel: string;
    justPerDayBefore: string;
    justPerDayAfter: string;
    /** Suffix after the trial chip text (" — card not charged yet"). */
    trialChipSuffix: string;
    vipOnlyHeading: string;
    securedLine: string;
    guaranteeLine: string;
  };
  proFeatures: { title: string; desc: string }[];
  vipFeatures: { title: string; desc: string }[];
  enterprise: {
    eyebrow: string;
    /** Overrides for lib/enterprise/offer strings, when translated. */
    features?: string[];
    guaranteeLine?: string;
    supportLine?: string;
    dashboardLink: string;
    securedByStripe: string;
  };
  comparison: {
    h2Before: string;
    h2Accent: string;
    featureHeader: string;
    freeHeader: string;
    proHeader: string;
    vipHeader: string;
    /** Feature names in COMPARE_ROWS order (booleans stay in code). */
    rows: string[];
    noteBefore: string;
    noteLink: string;
    noteAfter: string;
    choosePro: string;
  };
  faqHeading: string;
  faqs: { q: string; a: string }[];
  /** Compare-teasers block under the FAQ (production added it after the
      original extraction; folded in by the 2026-10-27 rebase). */
  compareTeasers: {
    heading: string;
    intro: string;
    links: { label: string; href: string }[];
    allLabel: string;
  };
  trust: string[];
}

export const enPricing: PricingCopy = {
  meta: {
    title: "Pricing — Free, Pro, VIP Pro & Enterprise Plans",
    description:
      "WorldEye pricing: the live globe, 74,229 cameras and flight tracking are free forever. Pro is $7.99/week (3-day free trial), $13.99/month (10-day free trial) or VIP Pro $74.99/year (10-day free trial). Enterprise — the camera feed API and embed — is $999/year. Cancel anytime.",
    ogTitle: "Pricing — Free, Pro, VIP Pro & Enterprise Plans | WorldEye",
    ogDescription:
      "The live globe, 74,229 cameras and flight tracking are free forever. Pro from $7.99/week with a free trial; VIP Pro $74.99/year; Enterprise camera feed $999/year. Cancel anytime.",
  },
  schemaFreeOfferDescription:
    "Free forever — the live globe, 74,229 cameras, flight and satellite tracking, weather, earthquakes and basic search. No account needed.",
  backToMap: "Back to the map",
  proBadge: "PRO",
  hero: {
    h1Before: "See what the ",
    h1Accent: "free map",
    h1After: " can't show you.",
    sub: "An AI analyst that works the globe for you. Live traffic. Advanced search filters. VIP intel feeds on the top tier. Pick your level — upgrade anytime.",
  },
  toggle: {
    mostPopular: "MOST POPULAR",
    discountMonthly: "-42%",
    discountAnnual: "-71%",
  },
  plans: {
    weekly: {
      name: "Weekly",
      price: "$7.99",
      per: "/week",
      perDay: "$1.14",
      note: "3 days free, then billed weekly · cancel anytime",
      cta: "Start 3-Day Free Trial",
      trial: "3 days free",
    },
    monthly: {
      name: "Monthly",
      price: "$13.99",
      per: "/month",
      perDay: "$0.47",
      note: "10 days free, then billed monthly · cancel anytime",
      save: "Save 60%",
      cta: "Start 10-Day Free Trial",
      trial: "10 days free",
    },
    annual: {
      name: "VIP Pro",
      price: "$74.99",
      per: "/year",
      perDay: "$0.21",
      note: "10 days free, then billed annually · cancel anytime",
      save: "Save 82% · Best value",
      cta: "Start 10-Day Free Trial",
      trial: "10 days free",
    },
    enterprise: {
      name: "Enterprise",
      price: "$999",
      per: "/year",
      perDay: "$2.74",
      note: "Billed annually · cancel anytime",
      cta: "Get Enterprise",
    },
  },
  card: {
    proLabel: "PRO",
    vipProLabel: "VIP PRO",
    justPerDayBefore: "Just ",
    justPerDayAfter: " a day",
    trialChipSuffix: " — card not charged yet",
    vipOnlyHeading: "VIP PRO ONLY",
    securedLine: "Secured by Stripe · Cancel anytime · 1-click cancellation",
    guaranteeLine:
      "Covered by a 7-day money-back guarantee on your first charge — email us within 7 days of the charge for a full refund, no questions asked.",
  },
  proFeatures: [
    { title: "OI AI Assistant", desc: "Talk to the map. Forecasts, analysis and recon — powered by WorldEye's built-in AI, with nothing to set up." },
    { title: "Live Traffic Layer", desc: "Live TomTom congestion flow on the road network, with simulated vehicles clearly labeled as simulated." },
    { title: "OSINT Toolkit", desc: "Nmap scans, DNS/WHOIS, SSL analysis and threat intel — in-browser." },
    { title: "Camera Recording Studio", desc: "Record live camera feeds right in your browser and save the clips." },
    { title: "Camera alerts (2)", desc: "Watch up to 2 cameras and get emailed — with the photo — when a condition you describe, like snow or flooding, shows up." },
    { title: "Every Future Layer", desc: "New premium feeds land in Pro first, at no extra cost." },
  ],
  vipFeatures: [
    { title: "Premium Intel Feeds", desc: "Cyber threats, GDELT events, maritime tracking, conflict zones, live news — VIP only." },
    { title: "Camera Timelapse", desc: "Capture snapshot cameras frame by frame and export the film — VIP only." },
    { title: "Camera alerts (10)", desc: "The alert allowance raised to 10 watched cameras — Pro includes 2." },
  ],
  enterprise: {
    eyebrow: "ENTERPRISE",
    dashboardLink: "Already Enterprise? Open your camera feed dashboard →",
    securedByStripe: "Secured by Stripe",
  },
  comparison: {
    h2Before: "Free is generous. ",
    h2Accent: "VIP Pro is the full picture.",
    featureHeader: "FEATURE",
    freeHeader: "FREE",
    proHeader: "PRO",
    vipHeader: "VIP PRO",
    rows: [
      "Interactive 3D globe",
      "Live flight tracking & aircraft follow",
      "74,229 public CCTV cameras",
      "Satellite & space tracking",
      "Basic search — fly to any place",
      "Live transit vehicles (15 agencies)",
      "Space launch tracking & countdowns",
      "Street-level photo layer",
      "Radar, lightning, hurricanes & fire perimeters",
      "River gauges & bike-share systems",
      "Sensor effects",
      "Cinematic director (free for affiliates)",
      "Earthquakes, wildfires & weather",
      "OI AI assistant (built-in AI included)",
      "Satellite imagery view",
      "Live traffic layer (TomTom congestion)",
      "Advanced search filters",
      "OSINT toolkit (nmap, DNS, WHOIS, SSL)",
      "Camera Recording Studio",
      "Camera alerts (2 on Pro · 10 on VIP Pro)",
      "Every future Pro layer",
      "Premium intel feeds (cyber, GDELT, maritime, live news)",
      "Camera timelapse",
    ],
    noteBefore: "The Cinematic Director isn't a plan feature — it's free for members of the ",
    noteLink: "affiliate program",
    noteAfter: " on any plan, Free or Pro.",
    choosePro: "Choose Pro",
  },
  faqHeading: "Questions, answered.",
  faqs: [
    {
      q: "How much does WorldEye cost?",
      a: "The map itself is free — the globe, 74,229 cameras, flights, satellites and weather, no account needed. Pro is $7.99/week (starts with a 3-day free trial), $13.99/month (10-day free trial) or VIP Pro at $74.99/year (10-day free trial). Enterprise — the camera feed API and embed for your own platform — is $999/year and has no free trial. Every paid plan can be cancelled anytime, and first charges carry a 7-day money-back guarantee.",
    },
    {
      q: "Is the map really free?",
      a: "Yes. The 3D globe, live flights, 74,229 street cameras, satellites, transit, launch tracking, street-level photos, basic search and natural-hazard layers are free forever — no account, no credit card. Pro unlocks the intelligence-grade tools: the AI assistant, the live traffic layer and advanced search filters. VIP Pro (the yearly plan) adds the premium intel feeds and camera timelapse.",
    },
    {
      q: "Do I need my own API key for the AI assistant?",
      a: "No. OI is powered by WorldEye's built-in AI, with nothing to set up — no API key to bring, no separate provider account, nothing billed to you by a third party.",
    },
    {
      q: "Can I cancel anytime?",
      a: "Anytime, in one click. Your Pro access runs until the end of the billing period you've paid for — weekly, monthly or yearly — and then simply stops. No retention calls, no dark patterns. On a free trial you're never charged during the trial: cancel before it ends and you pay nothing.",
    },
    {
      q: "What if I forget to cancel — can I get a refund?",
      a: "We email you before your trial's first charge, so it shouldn't come as a surprise. And if it still happens: your first charge is covered by a 7-day money-back guarantee — email us at passiveincomewai@gmail.com within 7 days of the charge for a full refund, no questions asked. The guarantee covers your first charge only; renewal charges aren't refundable under it.",
    },
    {
      q: "What happens if I switch plans?",
      a: "Upgrades apply immediately with proration handled by Stripe. Downgrades take effect at the end of your current period.",
    },
    {
      q: "How is this different from the free self-hosted version?",
      a: "Same open-source engine, plus the paid tiers: an AI analyst that works the map for you, live traffic, advanced search filters and — on VIP Pro — the premium intel feeds the free site doesn't gate, because there is no gate there. Here, the tiers fund the infrastructure.",
    },
  ],
  compareTeasers: {
    heading: "Comparing your options?",
    intro:
      "Most tools in this space do one thing well. These honest, source-checked head-to-heads show where WorldEye wins — and where the specialist is the better pick.",
    links: [
      { label: "WorldEye vs Windy — forecast models vs live ground cameras", href: "/compare/windy" },
      { label: "WorldEye vs SkylineWebcams — webcam directory vs camera globe", href: "/compare/skylinewebcams" },
      { label: "WorldEye vs Flightradar24 — flight specialist vs all-in-one globe", href: "/compare/flightradar24" },
    ],
    allLabel: "All comparisons →",
  },
  trust: [
    "1-click cancellation",
    "7-day money-back guarantee on your first charge",
    "Stripe-secured checkout",
    "No ads, no data selling",
  ],
};

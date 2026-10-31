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
 *
 * Restructured 2026-10-30 for the Pricing Redesign Phase C 3-tier
 * grid: three tiers (Lite / Pro / Ultra), each sold weekly, monthly
 * and annually. The `plans` block keeps the Pro tier's period plans
 * (its prices + trial strings are glossary-pinned) plus Enterprise;
 * `plansGrid` carries the Lite/Ultra period plans in the same shape;
 * `tiers` carries the per-tier card copy. Plan facts mirror
 * src/lib/billing: trials are 3 days on every weekly plan and 10 days
 * on every monthly/annual plan (src/lib/billing/trials.ts); annual
 * savings are computed truthfully against 12 monthly payments (Lite
 * 58.3%, Pro 55.3%, Ultra 50.0%). The old weekly-equivalent discount
 * claims ("Save 60% / 82%", "-42% / -71%" toggle chips) are retired —
 * they do not appear anywhere in this dictionary.
 *
 * Amended 2026-10-31 (site-audit Wave 2, R26): `vipFeatures` gained
 * the three VIP hub features the annual plans unlock — Event alerts,
 * Personal brief and Saved views (up to 25) — previously named only
 * on /vip itself. Spanish re-synced the same day; the manifest's
 * pricing sourceHash was recomputed (its updatedAt was already
 * 2026-10-31 from the Wave 1 pass).
 *
 * Amended 2026-10-31 (site-audit Wave 3, R55): `faqs` gained three
 * entries — promo codes (the standing WELCOME50 code), code stacking
 * and what happens to recordings/saved data after cancelling — each
 * sourced from repo copy/code (terms §3–4, the affiliate terms'
 * Discount codes section, lib/recording/idb, the account export).
 * Spanish re-synced the same day; the manifest's pricing sourceHash
 * was recomputed (updatedAt already 2026-10-31).
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
  };
  /** The Pro tier's period plans + Enterprise (glossary-pinned). */
  plans: {
    weekly: PricingPlanCopy;
    monthly: PricingPlanCopy;
    annual: PricingPlanCopy;
    enterprise: PricingPlanCopy;
  };
  /** The Lite/Ultra period plans, keyed by their checkout plan keys. */
  plansGrid: {
    lite_weekly: PricingPlanCopy;
    lite_monthly: PricingPlanCopy;
    lite_annual: PricingPlanCopy;
    ultra_weekly: PricingPlanCopy;
    ultra_monthly: PricingPlanCopy;
    ultra_annual: PricingPlanCopy;
  };
  /** Per-tier card copy for the 3-tier grid. */
  tiers: {
    lite: { name: string; tagline: string };
    pro: { name: string; tagline: string };
    ultra: { name: string; tagline: string };
    /** Badge shown on the Annual toggle + annual cards: every annual
        plan carries the VIP branding (owner ruling, Phase C). */
    annualBadge: string;
    /** Pure period names for the billing toggle (the `plans` block's
        annual entry is named "VIP Pro" — a plan name, not a period). */
    periods: { weekly: string; monthly: string; annual: string };
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
  liteFeatures: { title: string; desc: string }[];
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
    liteHeader: string;
    proHeader: string;
    ultraHeader: string;
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
    title: "Pricing — Free, Lite, Pro, Ultra & Enterprise Plans",
    description:
      "WorldEye pricing: the live globe, 74,229 cameras and flight tracking are free forever. Three paid tiers — Lite ($4.99/week, $8.99/month, $44.99/year), Pro ($7.99/week, $13.99/month, $74.99/year) and Ultra ($12.99/week, $24.99/month, $149.99/year) — with a 3-day free trial on weekly plans and 10 days on monthly and annual. Enterprise — the camera feed API and embed — is $999/year. Cancel anytime.",
    ogTitle: "Pricing — Free, Lite, Pro, Ultra & Enterprise Plans | WorldEye",
    ogDescription:
      "The live globe, 74,229 cameras and flight tracking are free forever. Lite from $4.99/week, Pro from $7.99/week, Ultra from $12.99/week — every plan starts with a free trial. Enterprise camera feed $999/year. Cancel anytime.",
  },
  schemaFreeOfferDescription:
    "Free forever — the live globe, 74,229 cameras, flight and satellite tracking, weather, earthquakes and basic search. No account needed.",
  backToMap: "Back to the map",
  proBadge: "PRO",
  hero: {
    h1Before: "See what the ",
    h1Accent: "free map",
    h1After: " can't show you.",
    sub: "An AI analyst that works the globe for you. Live traffic. Advanced search filters. Premium intel feeds on the top tier. Pick your level — upgrade anytime.",
  },
  toggle: {
    mostPopular: "MOST POPULAR",
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
      cta: "Start 10-Day Free Trial",
      trial: "10 days free",
    },
    annual: {
      name: "VIP Pro",
      price: "$74.99",
      per: "/year",
      perDay: "$0.21",
      note: "10 days free, then billed annually · cancel anytime",
      save: "Save 55.3%",
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
  plansGrid: {
    lite_weekly: {
      name: "Lite",
      price: "$4.99",
      per: "/week",
      perDay: "$0.71",
      note: "3 days free, then billed weekly · cancel anytime",
      cta: "Start 3-Day Free Trial",
      trial: "3 days free",
    },
    lite_monthly: {
      name: "Lite",
      price: "$8.99",
      per: "/month",
      perDay: "$0.30",
      note: "10 days free, then billed monthly · cancel anytime",
      cta: "Start 10-Day Free Trial",
      trial: "10 days free",
    },
    lite_annual: {
      name: "Lite",
      price: "$44.99",
      per: "/year",
      perDay: "$0.12",
      note: "10 days free, then billed annually · cancel anytime",
      save: "Save 58.3%",
      cta: "Start 10-Day Free Trial",
      trial: "10 days free",
    },
    ultra_weekly: {
      name: "Ultra",
      price: "$12.99",
      per: "/week",
      perDay: "$1.86",
      note: "3 days free, then billed weekly · cancel anytime",
      cta: "Start 3-Day Free Trial",
      trial: "3 days free",
    },
    ultra_monthly: {
      name: "Ultra",
      price: "$24.99",
      per: "/month",
      perDay: "$0.83",
      note: "10 days free, then billed monthly · cancel anytime",
      cta: "Start 10-Day Free Trial",
      trial: "10 days free",
    },
    ultra_annual: {
      name: "Ultra",
      price: "$149.99",
      per: "/year",
      perDay: "$0.41",
      note: "10 days free, then billed annually · cancel anytime",
      save: "Save 50.0%",
      cta: "Start 10-Day Free Trial",
      trial: "10 days free",
    },
  },
  tiers: {
    lite: {
      name: "Lite",
      tagline: "The essentials, unlocked — every camera, the premium layers and the AI assistant.",
    },
    pro: {
      name: "Pro",
      tagline: "The full toolkit — OSINT, camera alerts and room to record.",
    },
    ultra: {
      name: "Ultra",
      tagline: "Everything in Pro, plus intel feeds, timelapse and the highest limits.",
    },
    annualBadge: "VIP",
    periods: { weekly: "Weekly", monthly: "Monthly", annual: "Annual" },
  },
  card: {
    proLabel: "PRO",
    vipProLabel: "VIP PRO",
    justPerDayBefore: "Just ",
    justPerDayAfter: " a day",
    trialChipSuffix: " — card not charged yet",
    vipOnlyHeading: "ULTRA EXTRAS",
    securedLine: "Secured by Stripe · Cancel anytime · 1-click cancellation",
    guaranteeLine:
      "Covered by a 7-day money-back guarantee on your first charge — email us within 7 days of the charge for a full refund, no questions asked.",
  },
  liteFeatures: [
    { title: "Every camera, unlimited", desc: "Watch as many of the 74,229 live cameras as you like — paid plans have no open limits." },
    { title: "Premium map layers", desc: "Live traffic flow, maritime lines, naval traffic and live news feeds on the globe." },
    { title: "OI AI Assistant", desc: "Talk to the map. Forecasts, analysis and recon — powered by WorldEye's built-in AI, with nothing to set up." },
    { title: "Advanced search filters", desc: "Narrow camera results by country, type and live feeds — places are never filtered." },
    { title: "Camera Recording Studio", desc: "Record live camera feeds right in your browser — up to 5 cameras at once — and save the clips." },
    { title: "Ambient Mode included", desc: "The Slow-TV ambient player is unlocked too — no separate Ambient plan needed." },
  ],
  proFeatures: [
    { title: "OI AI Assistant", desc: "Talk to the map. Forecasts, analysis and recon — powered by WorldEye's built-in AI, with nothing to set up." },
    { title: "Live Traffic Layer", desc: "Live TomTom congestion flow on the road network, with simulated vehicles clearly labeled as simulated." },
    { title: "OSINT Toolkit", desc: "Nmap scans, DNS/WHOIS, SSL analysis and threat intel — in-browser." },
    { title: "Camera Recording Studio", desc: "Record live camera feeds right in your browser and save the clips." },
    { title: "Camera alerts (2)", desc: "Watch up to 2 cameras and get emailed — with the photo — when a condition you describe, like snow or flooding, shows up." },
    { title: "Every Future Layer", desc: "New premium feeds land in Pro first, at no extra cost." },
  ],
  vipFeatures: [
    { title: "Premium Intel Feeds", desc: "Cyber threats, GDELT events, maritime tracking, conflict zones, live news — Ultra only." },
    { title: "Camera Timelapse", desc: "Capture snapshot cameras frame by frame and export the film — Ultra only." },
    { title: "Camera alerts (10)", desc: "The alert allowance raised to 10 watched cameras — Pro includes 2." },
    { title: "Event alerts", desc: "Earthquakes near your places, launch reminders and ISS passes — email + in-app, checked every ~15 minutes, in the VIP hub." },
    { title: "Personal brief", desc: "A brief built from your account — your alert events, quakes near your watched places, the best ISS pass and the next 48 hours of launches, in the VIP hub or your morning inbox." },
    { title: "Saved views", desc: "Name and keep up to 25 globe setups — a layer stack plus an optional camera — and restore any of them in one click, in the VIP hub." },
  ],
  enterprise: {
    eyebrow: "ENTERPRISE",
    dashboardLink: "Already Enterprise? Open your camera feed dashboard →",
    securedByStripe: "Secured by Stripe",
  },
  comparison: {
    h2Before: "Free is generous. ",
    h2Accent: "Ultra is the full picture.",
    featureHeader: "FEATURE",
    freeHeader: "FREE",
    liteHeader: "LITE",
    proHeader: "PRO",
    ultraHeader: "ULTRA",
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
      "Camera alerts (2 on Pro · 10 on Ultra)",
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
      a: "The map itself is free — the globe, 74,229 cameras, flights, satellites and weather, no account needed. Paid plans come in three tiers, each billed weekly, monthly or annually: Lite is $4.99/week, $8.99/month or $44.99/year; Pro is $7.99/week, $13.99/month or $74.99/year; Ultra is $12.99/week, $24.99/month or $149.99/year. Weekly plans start with a 3-day free trial; monthly and annual plans start with a 10-day free trial. Enterprise — the camera feed API and embed for your own platform — is $999/year and has no free trial. Every paid plan can be cancelled anytime, and first charges carry a 7-day money-back guarantee.",
    },
    {
      q: "Is the map really free?",
      a: "Yes. The 3D globe, live flights, 74,229 street cameras, satellites, transit, launch tracking, street-level photos, basic search and natural-hazard layers are free forever — no account, no credit card. Lite removes the camera-open limits and unlocks the premium layers, the AI assistant, advanced search and the recording studio. Pro adds the OSINT toolkit and camera alerts. Ultra adds the premium intel feeds and camera timelapse, with the highest alert and recording limits.",
    },
    {
      q: "Do I need my own API key for the AI assistant?",
      a: "No. OI is powered by WorldEye's built-in AI, with nothing to set up — no API key to bring, no separate provider account, nothing billed to you by a third party. If you'd rather run on your own model account, you can add your own API key in OI settings — it stays in your browser and takes over whenever it's present.",
    },
    {
      q: "Can I cancel anytime?",
      a: "Anytime, in one click. Your Pro access runs until the end of the billing period you've paid for — weekly, monthly or yearly — and then simply stops. No retention calls, no dark patterns. On a free trial you're never charged during the trial: cancel before it ends and you pay nothing.",
    },
    {
      q: "What happens to my recordings and saved data if I cancel?",
      a: "Cancelling stops future renewals — it doesn't delete your account or your data. Your paid access runs until the end of the period you've already paid for, and then your account simply returns to the free tier. The clips you record are stored in your browser, on your own device, so they stay put whatever your plan does. And you can download everything WorldEye holds for your account — profile, settings, saved cameras, alert rules and your recordings list — as JSON or CSV from the Your data section of Settings, before or after cancelling.",
    },
    {
      q: "What if I forget to cancel — can I get a refund?",
      a: "We email you before your trial's first charge, so it shouldn't come as a surprise. And if it still happens: your first charge is covered by a 7-day money-back guarantee — email us at passiveincomewai@gmail.com within 7 days of the charge for a full refund, no questions asked. The guarantee covers your first charge only; renewal charges aren't refundable under it.",
    },
    {
      q: "Do you have a promo code?",
      a: "Yes — WELCOME50 is our standing welcome code. Enter it at checkout and it takes 50% off your first payment, on any plan. It's one use per customer, on the first payment only — and free trials still start free.",
    },
    {
      q: "Can I combine promo codes or other offers?",
      a: "No — codes don't stack. A discount code can't be combined with other offers unless WorldEye states otherwise, so WELCOME50 and an affiliate's personal code can't be used together on the same purchase. Use whichever one saves you more; either way, the discount applies to your first payment only.",
    },
    {
      q: "What happens if I switch plans?",
      a: "Upgrades apply immediately with proration handled by Stripe. Downgrades take effect at the end of your current period.",
    },
    {
      q: "How is this different from the free self-hosted version?",
      a: "Same open-source engine, plus the paid tiers: an AI analyst that works the map for you, live traffic, advanced search filters and — on Ultra — the premium intel feeds the free site doesn't gate, because there is no gate there. Here, the tiers fund the infrastructure.",
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

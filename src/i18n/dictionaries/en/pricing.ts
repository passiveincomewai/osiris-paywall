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
 * Amended 2026-11-01 (Pricing Redesign v2): the hero gained the
 * reference design's eyebrow + a 4-item feature strip; the card trust
 * line became a 3-item trust row (no charge today / secured by Stripe
 * / 1-click cancellation) plus per-card plan-detail links; a
 * why-upgrade row and full per-plan detail copy (`planDetails`) were
 * added for the /pricing/lite|pro|ultra pages; and the money-back
 * guarantee sentence now appears exactly once on /pricing (the
 * under-grid line) — the bottom trust row and the cost FAQ no longer
 * repeat it. Spanish re-synced the same day; the manifest's pricing
 * sourceHash was recomputed (updatedAt stays 2026-10-31).
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
    eyebrow: string;
    h1Before: string;
    h1Accent: string;
    h1After: string;
    sub: string;
  };
  /** 4-item feature strip under the hero (reference design). */
  heroFeatures: { title: string; desc: string }[];
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
    /** 3-item trust row under each card CTA (reference design):
        no charge today / secured by Stripe / 1-click cancellation. */
    trustRow: string[];
    /** "See everything in {name} →" detail-page link, split around
        the tier name. */
    detailsBefore: string;
    detailsAfter: string;
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
  /** "Why upgrade" icon row under the plan grid (reference design). */
  whyUpgrade: {
    h2Before: string;
    h2Accent: string;
    items: { title: string; desc: string }[];
  };
  /** Per-plan detail pages (/pricing/lite|pro|ultra). */
  planDetails: {
    backToPricing: string;
    pricingHeading: string;
    includesBefore: string;
    excludesHeading: string;
    bestForHeading: string;
    allPlansLink: string;
    lite: PricingPlanDetailCopy;
    pro: PricingPlanDetailCopy;
    ultra: PricingPlanDetailCopy;
  };
}

export interface PricingPlanDetailCopy {
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  h1: string;
  intro: string;
  heroImage: { src: string; alt: string; caption: string };
  featureImages: { src: string; alt: string; caption: string }[];
  bestFor: string[];
  includes: { title: string; desc: string }[];
  excludes: { title: string; desc: string }[];
  faqs: { q: string; a: string }[];
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
    eyebrow: "GLOBAL INTELLIGENCE. REAL IMPACT.",
    h1Before: "Unlock the ",
    h1Accent: "full picture.",
    h1After: "",
    sub: "The map is free. A paid plan removes the limits: an AI analyst that works the globe for you, live traffic, advanced search, the recording studio — and, on the top tier, the premium intel feeds.",
  },
  heroFeatures: [
    { title: "74,229 live cameras", desc: "Every public camera on one globe" },
    { title: "Real-time data", desc: "Flights, satellites, ships and weather, live" },
    { title: "OI AI analysis", desc: "An analyst that works the map for you" },
    { title: "Alerts & intel", desc: "Camera alerts and premium intel feeds" },
  ],
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
    trustRow: ["No charge today", "Secured by Stripe", "1-click cancellation"],
    detailsBefore: "See everything in ",
    detailsAfter: " →",
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
      a: "The map itself is free — the globe, 74,229 cameras, flights, satellites and weather, no account needed. Paid plans come in three tiers, each billed weekly, monthly or annually: Lite is $4.99/week, $8.99/month or $44.99/year; Pro is $7.99/week, $13.99/month or $74.99/year; Ultra is $12.99/week, $24.99/month or $149.99/year. Weekly plans start with a 3-day free trial; monthly and annual plans start with a 10-day free trial. Enterprise — the camera feed API and embed for your own platform — is $999/year and has no free trial. Every paid plan can be cancelled anytime.",
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
      a: "We email you before your trial's first charge, so it shouldn't come as a surprise. And if it still happens: email us at contact@worldeye.app within 7 days of your first charge and we'll refund it in full, no questions asked. The refund covers your first charge only; renewal charges aren't refundable under it.",
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
    "Reminder email before your first charge",
    "Stripe-secured checkout",
    "No ads, no data selling",
  ],
  whyUpgrade: {
    h2Before: "Why upgrade to ",
    h2Accent: "Pro?",
    items: [
      { title: "OI AI analyst", desc: "An AI that flies the globe, reads the layers and answers — built in, nothing to set up." },
      { title: "Camera alerts", desc: "Watch up to 2 cameras on Pro, 10 on Ultra — emailed a photo when your condition appears." },
      { title: "Recording Studio", desc: "Record live camera feeds in your browser — 5 cameras at once on Lite, 20 on Pro, 40 on Ultra." },
      { title: "Premium intel feeds", desc: "Cyber threats, GDELT events, maritime and live news feeds — Ultra only." },
    ],
  },
  planDetails: {
    backToPricing: "← All plans",
    pricingHeading: "Pick your billing period",
    includesBefore: "Everything in ",
    excludesHeading: "Not in this plan",
    bestForHeading: "Best for",
    allPlansLink: "Compare all plans side by side →",
    lite: {
      metaTitle: "Lite Plan — $4.99/week | WorldEye Pricing",
      metaDescription:
        "WorldEye Lite: $4.99/week, $8.99/month or $44.99/year. Unlimited camera opens, premium layers, the OI AI assistant, advanced search and the recording studio (5 cameras at once). Free trial: 3 days weekly, 10 days monthly and annual.",
      eyebrow: "WORLDEYE LITE",
      h1: "Every camera. No open limits.",
      intro:
        "Lite is the essentials tier — the free map with its limits removed. Open as many of the 74,229 cameras as you like, turn on the premium layers, ask the OI assistant, filter search properly and record up to five cameras at once.",
      heroImage: {
        src: "/landing/osint-search.jpg",
        alt: "WorldEye search flying to a place on the live globe",
        caption: "Search that flies you anywhere — with advanced filters on every paid plan.",
      },
      featureImages: [
        {
          src: "/landing/features-globe.jpg",
          alt: "The live WorldEye globe covered in camera points",
          caption: "The live globe — a real capture of WorldEye, cameras and layers in one place.",
        },
        {
          src: "/landing/track-flights.jpg",
          alt: "Live flight tracking on the WorldEye globe",
          caption: "Live flights over the camera network — free to watch, unlimited on Lite.",
        },
      ],
      bestFor: [
        "You watch cameras daily and keep hitting the free open limit.",
        "You want the AI assistant and premium layers without the OSINT toolkit.",
        "You record a handful of cameras, not whole scenes.",
      ],
      includes: [
        { title: "Every camera, unlimited", desc: "Watch as many of the 74,229 live cameras as you like — paid plans have no open limits." },
        { title: "Premium map layers", desc: "Live traffic flow, maritime lines, naval traffic and live news feeds on the globe." },
        { title: "OI AI Assistant", desc: "Talk to the map. Forecasts, analysis and recon — powered by WorldEye's built-in AI, with nothing to set up." },
        { title: "Advanced search filters", desc: "Narrow camera results by country, type and live feeds — places are never filtered." },
        { title: "Camera Recording Studio", desc: "Record live camera feeds right in your browser — up to 5 cameras at once — and save the clips." },
        { title: "Ambient Mode included", desc: "The Slow-TV ambient player is unlocked too — no separate Ambient plan needed." },
      ],
      excludes: [
        { title: "Camera alerts", desc: "Alerts start at Pro — watch 2 cameras there, 10 on Ultra, and get emailed a photo when your condition appears." },
        { title: "Camera timelapse", desc: "Frame-by-frame timelapse export is Ultra only." },
        { title: "Premium intel feeds", desc: "Cyber, GDELT, maritime and live-news intel feeds are Ultra only." },
      ],
      faqs: [
        {
          q: "Is Lite enough if I mostly watch cameras?",
          a: "Yes — that's exactly what Lite is for. Unlimited opens, the premium layers and the assistant, with recording for up to 5 cameras at once. If you later want alerts or the OSINT toolkit, upgrading to Pro applies immediately.",
        },
        {
          q: "Does Lite include camera alerts?",
          a: "No. Camera alerts start at Pro (2 watched cameras) and rise to 10 on Ultra. Everything else in the paid base — unlimited opens, premium layers, OI, advanced search, the recording studio and Ambient — is in Lite.",
        },
        {
          q: "What does the free trial look like on Lite?",
          a: "Weekly Lite starts with 3 free days; monthly and annual Lite start with 10 free days. We email you before the first charge, and cancelling during the trial costs nothing.",
        },
      ],
    },
    pro: {
      metaTitle: "Pro Plan — $7.99/week | WorldEye Pricing",
      metaDescription:
        "WorldEye Pro: $7.99/week, $13.99/month or $74.99/year (VIP Pro annual). Everything in Lite, plus the OSINT toolkit, live traffic, camera alerts (2) and the recording studio at 20 cameras at once. Free trial: 3 days weekly, 10 days monthly and annual.",
      eyebrow: "WORLDEYE PRO",
      h1: "The complete WorldEye toolkit.",
      intro:
        "Pro is the working tier: everything in Lite, plus the OSINT toolkit, the live traffic layer, camera alerts and room to record twenty cameras at once.",
      heroImage: {
        src: "/landing/track-flights.jpg",
        alt: "A tracked flight with its route and live data on WorldEye",
        caption: "Aircraft follow with live route data — part of the free map, unlimited on Pro.",
      },
      featureImages: [
        {
          src: "/landing/osint-search.jpg",
          alt: "WorldEye search flying to a place on the live globe",
          caption: "The OSINT toolkit runs in your browser — scans, DNS, WHOIS and SSL checks.",
        },
        {
          src: "/landing/features-globe.jpg",
          alt: "The live WorldEye globe covered in camera points",
          caption: "The live globe — a real capture of WorldEye, cameras and layers in one place.",
        },
      ],
      bestFor: [
        "You investigate — scans, DNS, WHOIS and SSL checks in the browser.",
        "You need a couple of cameras watched for you around the clock.",
        "You record multi-camera sessions and 5 at once isn't enough.",
      ],
      includes: [
        { title: "Everything in Lite", desc: "Unlimited camera opens, premium layers, advanced search filters and Ambient Mode — all of it carries over." },
        { title: "OI AI Assistant", desc: "Talk to the map. Forecasts, analysis and recon — powered by WorldEye's built-in AI, with nothing to set up." },
        { title: "Live Traffic Layer", desc: "Live TomTom congestion flow on the road network, with simulated vehicles clearly labeled as simulated." },
        { title: "OSINT Toolkit", desc: "Nmap scans, DNS/WHOIS, SSL analysis and threat intel — in-browser." },
        { title: "Camera Recording Studio", desc: "Record live camera feeds right in your browser — up to 20 cameras at once — and save the clips." },
        { title: "Camera alerts (2)", desc: "Watch up to 2 cameras and get emailed — with the photo — when a condition you describe, like snow or flooding, shows up." },
        { title: "Every Future Layer", desc: "New premium feeds land in Pro first, at no extra cost." },
      ],
      excludes: [
        { title: "Premium intel feeds", desc: "Cyber, GDELT, maritime and live-news feeds are Ultra only." },
        { title: "Camera timelapse", desc: "Frame-by-frame timelapse export is Ultra only." },
        { title: "The VIP hub", desc: "Event alerts, the personal brief and saved views come with Ultra. Annual Pro carries the VIP Pro name and Pro's limits — the hub itself isn't part of Pro." },
        { title: "Ultra's higher caps", desc: "Recording 40 cameras at once and 10 camera alerts are Ultra's numbers; Pro records 20 at once with 2 alerts." },
      ],
      faqs: [
        {
          q: "Does annual Pro unlock the VIP hub?",
          a: "No — and we'd rather say so here than after you've paid. The hub (event alerts, personal brief, saved views) comes with Ultra. Annual Pro carries the VIP Pro name and Pro's limits: 20-camera recording and 2 camera alerts. Annual subscribers who joined before 30 October 2026 keep the VIP extras they started with.",
        },
        {
          q: "How do camera alerts work?",
          a: "Pick up to 2 cameras and describe the condition — snow, flooding, a crowd forming. WorldEye watches them and emails you a photo when the condition appears.",
        },
        {
          q: "Can I change billing period later?",
          a: "Yes. Upgrades apply immediately with proration handled by Stripe; downgrades take effect at the end of your current period. Switching between weekly, monthly and annual works the same way.",
        },
      ],
    },
    ultra: {
      metaTitle: "Ultra Plan — $12.99/week | WorldEye Pricing",
      metaDescription:
        "WorldEye Ultra: $12.99/week, $24.99/month or $149.99/year. Everything in Pro, plus premium intel feeds, camera timelapse, the VIP hub, 40-camera recording and 10 camera alerts. Free trial: 3 days weekly, 10 days monthly and annual.",
      eyebrow: "WORLDEYE ULTRA",
      h1: "Everything. Plus the intel layer.",
      intro:
        "Ultra is the top tier: everything in Pro, the premium intel feeds, camera timelapse, the VIP hub and the highest limits WorldEye sells — 40 cameras recording at once, 10 watched for alerts.",
      heroImage: {
        src: "/landing/track-satellites.jpg",
        alt: "Satellites tracked live over the Earth on WorldEye",
        caption: "Live satellite tracking — Ultra adds the intel feeds layered over the same globe.",
      },
      featureImages: [
        {
          src: "/landing/osint-satellite.jpg",
          alt: "Satellite detail in WorldEye's OSINT tools",
          caption: "Satellite detail and look angles from the OSINT toolkit.",
        },
        {
          src: "/landing/osint-maritime.jpg",
          alt: "The maritime and conflict layer on the WorldEye globe",
          caption: "Maritime traffic and conflict-zone labels — the intel layer, live on the globe.",
        },
        {
          src: "/landing/hazard-weather.jpg",
          alt: "Hazard and disaster alerts on the WorldEye globe",
          caption: "Hazard and disaster alerts (GDACS) alongside the weather layers.",
        },
      ],
      bestFor: [
        "You follow world events and want the intel feeds on the globe.",
        "You run big recording sessions — up to 40 cameras at once.",
        "You want the hub: event alerts, a personal brief and saved views.",
      ],
      includes: [
        { title: "Everything in Pro", desc: "The OSINT toolkit, camera alerts, advanced search and every future Pro layer — all included." },
        { title: "Premium Intel Feeds", desc: "Cyber threats, GDELT events, maritime tracking, conflict zones, live news — Ultra only." },
        { title: "Camera Timelapse", desc: "Capture snapshot cameras frame by frame and export the film — Ultra only." },
        { title: "Camera alerts (10)", desc: "The alert allowance raised to 10 watched cameras — Pro includes 2." },
        { title: "Camera Recording Studio", desc: "Record live camera feeds right in your browser — up to 40 cameras at once — and save the clips." },
        { title: "Event alerts", desc: "Earthquakes near your places, launch reminders and ISS passes — email + in-app, checked every ~15 minutes, in the VIP hub." },
        { title: "Personal brief", desc: "A brief built from your account — your alert events, quakes near your watched places, the best ISS pass and the next 48 hours of launches, in the VIP hub or your morning inbox." },
        { title: "Saved views", desc: "Name and keep up to 25 globe setups — a layer stack plus an optional camera — and restore any of them in one click, in the VIP hub." },
      ],
      excludes: [
        { title: "Enterprise team features", desc: "The camera-feed API, the embeddable player for your own site and team seats are Enterprise — $999/year." },
      ],
      faqs: [
        {
          q: "What are the premium intel feeds?",
          a: "Live cyber-threat data, GDELT global events, maritime tracking, conflict zones and live news feeds, layered on the globe. They're Ultra-only — the free site and the lower tiers don't carry them.",
        },
        {
          q: "Does Ultra include the VIP hub?",
          a: "Yes. Event alerts, your personal brief and up to 25 saved views live in the VIP hub, and Ultra includes all of it — alongside 40-camera recording and 10 camera alerts.",
        },
        {
          q: "Is Ultra overkill for casual watching?",
          a: "Honestly, it can be. If you don't need the intel feeds, timelapse or the hub, Lite or Pro will cover you — every tier starts with a free trial, so you can feel the difference before paying.",
        },
      ],
    },
  },
};

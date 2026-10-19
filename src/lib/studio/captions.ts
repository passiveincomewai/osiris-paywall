// ── Studio caption engine (deterministic — no AI, no external calls) ──
// Platform × style × feature matrices with the affiliate's real referral
// link injected. Copy uses verified product facts only: no income
// claims, no "guaranteed", no fake discounts, and a coupon line appears
// only when ctx.couponCode holds a real, Stripe-synced discount code.
//
// Standing rules baked in:
//  - Instagram: CTA + link at the TOP, disclosure as plain text above
//    the hashtags, then EXACTLY 5 hashtags.
//  - Every platform: link near the top and an affiliate disclosure line.
import type { StudioContext } from "./types";

export interface CaptionRequest {
  platform: "instagram" | "tiktok" | "x" | "facebook" | "youtube" | "linkedin" | "pinterest";
  style: "viral" | "professional" | "funny" | "educational" | "storytelling" | "curiosity" | "direct";
  feature: "globe" | "cameras" | "recording" | "flights" | "weather" | "osint" | "premium";
}

export const CAPTION_PLATFORMS: readonly CaptionRequest["platform"][] = [
  "instagram",
  "tiktok",
  "x",
  "facebook",
  "youtube",
  "linkedin",
  "pinterest",
] as const;

export const CAPTION_STYLES: readonly CaptionRequest["style"][] = [
  "viral",
  "professional",
  "funny",
  "educational",
  "storytelling",
  "curiosity",
  "direct",
] as const;

export const CAPTION_FEATURES: readonly CaptionRequest["feature"][] = [
  "globe",
  "cameras",
  "recording",
  "flights",
  "weather",
  "osint",
  "premium",
] as const;

type Platform = CaptionRequest["platform"];
type Style = CaptionRequest["style"];
type Feature = CaptionRequest["feature"];

// Verified product facts only (see marketing-studio PLAN.md / site copy).
const FEATURE_FACTS: Record<Feature, string> = {
  cameras: "76,000+ live cameras in 105 countries",
  globe:
    "one live 3D globe — cameras, flights, satellites, weather, quakes and wildfires in real time",
  recording: "record multiple live cameras from one dashboard",
  flights: "every flight, tracked live on the globe",
  weather: "live weather radar, earthquakes and wildfire maps",
  osint: "a free OSINT toolkit — intel layers, GDELT events, cyber and maritime feeds",
  premium:
    "WorldEye Pro: satellite view, global search, the AI analyst and the full OSINT toolkit",
};

const HOOKS: Record<Style, string[]> = {
  viral: [
    "This is not a simulation. It is live.",
    "You do not need the news to tell you what is happening right now.",
    "POV: the whole world is streaming and almost nobody is watching.",
  ],
  professional: [
    "Real-time situational awareness, in one dashboard.",
    "A single live view of events as they unfold worldwide.",
    "Built for people who need to see it as it happens.",
  ],
  funny: [
    "My screen time is just me watching the entire planet now.",
    "Some people check the weather. I check the whole Earth.",
    "Warning: extremely habit-forming levels of looking at things live.",
  ],
  educational: [
    "Here is a smarter way to follow what is happening in the world.",
    "Most people see headlines hours later. There is a faster way.",
    "One tool worth knowing about if you follow world events.",
  ],
  storytelling: [
    "Last night I watched a storm roll in live from three countries at once.",
    "It started as five minutes of curiosity. An hour later I was still watching.",
    "Somewhere out there, right now, all of this is happening at once.",
  ],
  curiosity: [
    "What is happening on the other side of the world at this exact second?",
    "Ever wonder what Earth looks like live, all at once?",
    "What would you check first if you could see the whole planet live?",
  ],
  direct: [
    "Watch the world live. Free to open, no install.",
    "One link. The entire planet, live.",
    "Open it and see for yourself.",
  ],
};

// Three body frames so every variant reads differently around the fact.
const BODY_FRAMES: ((fact: string) => string)[] = [
  (fact) => `What's live on WorldEye right now: ${fact}.`,
  (fact) => `Inside WorldEye you get ${fact} — all in one place.`,
  (fact) => `No downloads, no setup — just open it: ${fact}.`,
];

const CTA_LINES: ((link: string) => string)[] = [
  (link) => `Try WorldEye free here: ${link}`,
  (link) => `Start watching live: ${link}`,
  (link) => `See it for yourself: ${link}`,
];

const HASHTAG_POOLS: Record<Feature, string[]> = {
  globe: ["#WorldEye", "#LiveGlobe", "#EarthObservation", "#OSINT", "#Geopolitics", "#LiveData"],
  cameras: ["#LiveCameras", "#WorldEye", "#Webcams", "#OSINT", "#EarthObservation", "#LiveStream"],
  recording: ["#WorldEye", "#LiveCameras", "#Recording", "#OSINT", "#Webcams", "#LiveStream"],
  flights: ["#WorldEye", "#FlightTracking", "#Aviation", "#LiveFlights", "#AvGeek", "#LiveData"],
  weather: ["#WorldEye", "#Weather", "#LiveRadar", "#Earthquakes", "#Wildfires", "#StormTracking"],
  osint: ["#OSINT", "#WorldEye", "#Geopolitics", "#Intelligence", "#EarthObservation", "#LiveData"],
  premium: ["#WorldEye", "#OSINT", "#ProTools", "#EarthObservation", "#LiveData", "#Geopolitics"],
};

// Hashtags per platform. Instagram is fixed at exactly 5 by standing rule.
function hashtagCount(platform: Platform): number {
  switch (platform) {
    case "instagram":
      return 5;
    case "x":
      return 2;
    case "linkedin":
      return 3;
    case "tiktok":
      return 5; // includes "#ad" as one of the five
    default:
      return 4; // facebook | youtube | pinterest (3–5 allowed)
  }
}

function pickHashtags(feature: Feature, count: number, variant: number, includeAd: boolean): string[] {
  const pool = HASHTAG_POOLS[feature];
  const want = includeAd ? count - 1 : count;
  const picked: string[] = [];
  for (let i = 0; i < want; i++) {
    picked.push(pool[(variant + i) % pool.length]!);
  }
  return includeAd ? ["#ad", ...picked] : picked;
}

function disclosureLine(platform: Platform): string {
  // Instagram/TikTok carry "#ad" conventions; Instagram keeps the
  // disclosure as plain text ABOVE its exactly-5 hashtags (standing
  // rule), TikTok carries #ad inside its hashtag set instead.
  if (platform === "instagram") return "Ad — affiliate link, I may earn a commission.";
  return "Affiliate link — I may earn a commission.";
}

export function generateCaptions(ctx: StudioContext, req: CaptionRequest): string[] {
  const fact = FEATURE_FACTS[req.feature];
  const hooks = HOOKS[req.style];
  const count = hashtagCount(req.platform);

  const captions: string[] = [];
  for (let variant = 0; variant < 3; variant++) {
    const hook = hooks[variant % hooks.length]!;
    const body = BODY_FRAMES[variant % BODY_FRAMES.length]!(fact);
    const cta = CTA_LINES[variant % CTA_LINES.length]!(ctx.link);
    const tags = pickHashtags(req.feature, count, variant, req.platform === "tiktok");

    const lines: string[] = [
      cta,
      "",
      `${hook} ${body}`,
    ];
    // Coupon line only when a real (Stripe-synced) code exists — never
    // invent a discount.
    if (ctx.couponCode) {
      lines.push(
        ctx.discountPct != null
          ? `Use code ${ctx.couponCode} for ${ctx.discountPct}% off your first payment.`
          : `Use code ${ctx.couponCode} at checkout.`,
      );
    }
    lines.push(disclosureLine(req.platform));
    if (tags.length > 0) lines.push(tags.join(" "));

    captions.push(lines.join("\n"));
  }

  // Distinctness is by construction (hook + frame + CTA all rotate),
  // but guarantee the contract even if the matrices change later.
  return [...new Set(captions)].slice(0, 3);
}

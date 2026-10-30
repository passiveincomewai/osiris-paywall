/* ------------------------------------------------------------------ */
/* Affiliate copy templates — structured form                          */
/*                                                                     */
/* The resources page's captions, email templates, and video scripts   */
/* as structured parts (hook / feature / extra / cta) so the           */
/* deterministic revision tools in template-revise.ts can recombine    */
/* them (tone, angle, length, refresh) without any fake "AI".          */
/* Copy is the page's existing copy, split into parts; `extra` lines   */
/* are the optional block dropped by the "shorter" revision. All       */
/* claims stay within the page's truthful-claims rules (74,229 live    */
/* cameras; free globe, no signup; Pro = AI analyst, satellite view,   */
/* OSINT toolkit). {LINK} is substituted with the affiliate's own      */
/* referral link at render time, as before.                            */
/* ------------------------------------------------------------------ */

export type TemplateKind = "caption" | "email" | "script" | "banner";

export interface CaptionTemplate {
  kind: "caption";
  id: string;
  platform: string;
  color: string;
  hookIndex: number;
  hook: string;
  feature: string;
  extra: string;
  cta: string;
  hashtags: string;
}

export interface EmailTemplate {
  kind: "email";
  id: string;
  subjectIndex: number;
  subject: string;
  greeting: string;
  feature: string;
  extra: string;
  cta: string;
  signoff: string;
}

export interface ScriptBeat {
  label: string;
  text: string;
}

export interface ScriptTemplate {
  kind: "script";
  id: string;
  title: string;
  color: string;
  hookIndex: number;
  beats: ScriptBeat[];
  /** Index of the beat the angle revision rewrites. */
  featureBeat: number;
  /** Index of the beat dropped by the "shorter" revision. */
  optionalBeat: number;
}

export const CAPTION_TEMPLATES: CaptionTemplate[] = [
  {
    kind: "caption",
    id: "caption-instagram",
    platform: "Instagram",
    color: "#e879f9",
    hookIndex: 0,
    hook: "I found a site that lets you watch 74,229 LIVE cameras around the world 🌍\nTraffic cams, beaches, city squares — all streaming free on a 3D globe.",
    feature: "It's called WorldEye. The free map is honestly wild — and Pro unlocks an AI analyst + satellite view.",
    extra: "Flights and satellites move across the same globe in real time, too.",
    cta: "Link in bio 👆\n\n#ad — I earn a commission if you subscribe through my link. The free globe costs you nothing.",
    hashtags: "#LiveWebcams #OSINT #EarthFromAbove #TravelFromHome",
  },
  {
    kind: "caption",
    id: "caption-tiktok",
    platform: "TikTok",
    color: "#22d3ee",
    hookIndex: 1,
    hook: "POV: you discover you can watch the entire planet LIVE for free 🌐",
    feature: "74,229 cameras. Flights overhead. Satellites orbiting. All on one 3D globe.",
    extra: "Beaches, traffic, landmarks — pick a place and you're basically there.",
    cta: "WorldEye's free tier is actually insane. Link in bio if you want the Pro AI analyst.\n\n#ad — I earn a commission on subscriptions through my link.",
    hashtags: "#LiveWebcams #Globe #OSINT #DidYouKnow",
  },
  {
    kind: "caption",
    id: "caption-x",
    platform: "X",
    color: "#94a3b8",
    hookIndex: 2,
    hook: "WorldEye is a free 3D globe with 74,229 live cameras, flight tracking, and satellites.",
    feature: "Pro (weekly, monthly, or annual) adds an AI analyst, satellite basemap, and OSINT toolkit.",
    extra: "The map itself is free — no signup to look around.",
    cta: "Worth a look: {LINK}\n\n#ad — I earn a commission if you subscribe.",
    hashtags: "#OSINT #LiveCameras",
  },
  {
    kind: "caption",
    id: "caption-email",
    platform: "Email",
    color: "#fbbf24",
    hookIndex: 3,
    hook: "Subject: Watch the planet live (free)\n\nHey —\n\nStumbled on WorldEye: a live 3D globe with 74,229 public cameras you can watch free. Traffic, beaches, landmarks — all live.",
    feature: "The free map is genuinely fun. If you want more, Pro unlocks an AI analyst, satellite view, and OSINT tools, on weekly or monthly plans, or VIP Pro (billed yearly).",
    extra: "I keep it open in a tab like a window to the world.",
    cta: "Here's my link: {LINK}\n\nQuick note: it's my affiliate link — I earn a commission if you subscribe, at no extra cost to you.",
    hashtags: "",
  },
];

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    kind: "email",
    id: "email-window",
    subjectIndex: 0,
    subject: "The free tool I keep open all day",
    greeting: "Quick one —",
    feature: "WorldEye is a live 3D globe (free) with 74,229 public cameras, flights, and satellites. I keep it open like a window to the world.",
    extra: "Traffic, beaches, landmarks — all streaming live, and no signup is needed for the map.",
    cta: "Pro adds an AI analyst + satellite view if you want the full intel setup. Weekly or monthly plans, or VIP Pro (billed yearly).\n\nMy link: {LINK}",
    signoff: "Disclosure: affiliate link — I earn a commission if you subscribe.",
  },
  {
    kind: "email",
    id: "email-curious",
    subjectIndex: 1,
    subject: "For the endlessly curious",
    greeting: "If you like watching the world happen in real time, try WorldEye.",
    feature: "It's a free 3D globe with 74,229 live public cameras — landmarks, highways, beaches. No signup needed for the map.",
    extra: "Flights and satellites are tracked on the same globe, in real time.",
    cta: "There's a Pro tier (AI analyst, satellite view, OSINT toolkit) if you want more.\n\nMy affiliate link: {LINK} — I earn a commission if you subscribe, at no extra cost to you.",
    signoff: "",
  },
];

export const SCRIPT_TEMPLATES: ScriptTemplate[] = [
  {
    kind: "script",
    id: "script-globe-zoom",
    title: "Script 1 — “The globe zoom” (TikTok / Reels, ~30s)",
    color: "#22d3ee",
    hookIndex: 0,
    featureBeat: 1,
    optionalBeat: 2,
    beats: [
      { label: "HOOK (0–3s)", text: "“This website lets you watch the entire planet… legally.” [zoom into globe]" },
      { label: "BEAT 1 (3–10s)", text: "“74,229 live cameras. Beaches in Hawaii, streets in Tokyo — all live, right now.”" },
      { label: "BEAT 2 (10–18s)", text: "“The map is completely free. No signup, just open it.” [click a camera]" },
      { label: "BEAT 3 (18–25s)", text: "“And Pro adds an AI analyst and satellite view if you want the full setup.”" },
      { label: "CTA (25–30s)", text: "“Link in bio. #ad — I earn a commission if you subscribe.”" },
    ],
  },
  {
    kind: "script",
    id: "script-3-things",
    title: "Script 2 — “3 things” (TikTok / Reels, ~25s)",
    color: "#a78bfa",
    hookIndex: 1,
    featureBeat: 1,
    optionalBeat: 2,
    beats: [
      { label: "HOOK (0–3s)", text: "“3 things you didn't know you could watch live right now.”" },
      { label: "BEAT 1", text: "“One — live traffic cameras from around the world.”" },
      { label: "BEAT 2", text: "“Two — every flight overhead, tracked in real time.”" },
      { label: "BEAT 3", text: "“Three — satellites orbiting above you, right now.”" },
      { label: "CTA", text: "“All free on WorldEye. Link in bio for the Pro upgrade. #ad — I earn a commission on subscriptions.”" },
    ],
  },
];

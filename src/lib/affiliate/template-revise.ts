/* ------------------------------------------------------------------ */
/* Deterministic template revision engine                              */
/*                                                                     */
/* The resources page's "Revise" tools. This is a rules-based text     */
/* recombiner — NOT AI, and the UI says so. The site's existing AI     */
/* endpoints are the OI intelligence endpoints (plan-gated) and the    */
/* Studio's async job queue; neither is an interactive copywriting     */
/* endpoint, so revisions are structured controls instead:             */
/*                                                                     */
/*  - Tone: swap the hook (captions/scripts) or subject (emails)       */
/*    for a phrasing from the tone pool.                               */
/*  - Angle: swap the feature block for the cameras / flights /        */
/*    satellites / Pro version.                                        */
/*  - Length: "shorter" drops the template's optional block.           */
/*  - Refresh: cycle to the next hook/subject variant.                 */
/*  - Typed instructions: a small keyword rule set (applyInstruction)  */
/*    maps phrases like "make it funnier" or "focus on flights"        */
/*    onto the same controls, and reports exactly what it changed.     */
/*                                                                     */
/* Everything is a pure function of (template, options) so the UI is   */
/* stable, testable, and never invents claims: every pool line stays   */
/* inside the programme's truthful-claims rules.                       */
/* ------------------------------------------------------------------ */

import type { CaptionTemplate, EmailTemplate, ScriptBeat, ScriptTemplate } from "./templates";

export type Tone = "hype" | "professional" | "funny";
export type Angle = "cameras" | "flights" | "satellites" | "pro";

export interface ReviseOptions {
  tone?: Tone;
  angle?: Angle;
  short?: boolean;
  hashtags?: boolean;
  variant?: number;
  stripEmoji?: boolean;
}

export const TONE_LABELS: Record<Tone, string> = {
  hype: "Hype",
  professional: "Professional",
  funny: "Funny",
};

export const ANGLE_LABELS: Record<Angle, string> = {
  cameras: "Cameras",
  flights: "Flights",
  satellites: "Satellites",
  pro: "Pro tier",
};

/* ------------------------------ pools ------------------------------ */

const CAPTION_HOOKS: Record<Tone, string[]> = {
  hype: [
    "STOP SCROLLING — you can watch the entire planet LIVE right now 👁️",
    "This is the wildest free tool on the internet and nobody talks about it",
    "POV: you just found a live window into everywhere on Earth",
  ],
  professional: [
    "WorldEye: a real-time 3D intelligence globe, free to explore",
    "For OSINT researchers and the endlessly curious — the planet, live",
    "One dashboard for live global awareness",
  ],
  funny: [
    "Google Earth but it's happening RIGHT NOW",
    "me: I'll just check one camera. also me, 4 hours later:",
    "new personality trait: watching traffic in Tokyo at 3am",
  ],
};

const EMAIL_SUBJECTS: Record<Tone, string[]> = {
  hype: [
    "You can watch the whole planet live (free)",
    "This free globe is kind of unbelievable",
    "74,229 live cameras. One free globe.",
  ],
  professional: [
    "A real-time 3D globe worth your attention",
    "WorldEye: live global awareness, free tier",
    "For OSINT and the endlessly curious",
  ],
  funny: [
    "Google Earth, but it's happening right now",
    "My new hobby: watching Tokyo traffic at 3am",
    "I opened one camera. It's been four hours.",
  ],
};

const SCRIPT_HOOKS: Record<Tone, string[]> = {
  hype: [
    "“STOP SCROLLING — you can watch the entire planet LIVE right now.”",
    "“This is the wildest free tool on the internet and nobody talks about it.”",
    "“POV: you just found a live window into everywhere on Earth.”",
  ],
  professional: [
    "“WorldEye: a real-time 3D intelligence globe — free to explore.”",
    "“One dashboard for live global awareness. Here's how it works.”",
    "“For researchers and the endlessly curious: the planet, live.”",
  ],
  funny: [
    "“Google Earth but it's happening RIGHT NOW.”",
    "“Me: I'll check one camera. Also me, four hours later:”",
    "“New personality trait: watching traffic in Tokyo at 3am.”",
  ],
};

const CAPTION_FEATURES: Record<Angle, string> = {
  cameras: "74,229 public cameras stream live on a free 3D globe — beaches, city squares, highways. No signup to look around.",
  flights: "Every aircraft overhead, tracked live on the same free globe — then drop into a live street camera below it.",
  satellites: "Watch satellites orbit overhead in real time on a free 3D globe, alongside 74,229 live cameras.",
  pro: "Go Pro for the AI analyst, satellite basemap, live traffic, advanced search filters, and the OSINT toolkit.",
};

const EMAIL_FEATURES: Record<Angle, string> = {
  cameras: "It's a free 3D globe with 74,229 live public cameras — landmarks, highways, beaches. No signup needed for the map.",
  flights: "Every flight overhead is tracked live on a free 3D globe — and you can drop from a plane's route into a live street camera below it.",
  satellites: "Satellites pass over your house in real time — and a free 3D globe lets you watch them, next to 74,229 live cameras.",
  pro: "The free globe is the hook; Pro is the full intel setup: AI analyst, satellite basemap, live traffic, advanced search filters, and the OSINT toolkit.",
};

const SCRIPT_FEATURES: Record<Angle, string> = {
  cameras: "“74,229 live cameras — beaches, highways, landmarks — all live, right now.”",
  flights: "“Every flight overhead, tracked in real time on the same globe.”",
  satellites: "“Satellites orbiting above you right now, drawn live on the globe.”",
  pro: "“Pro switches on an AI analyst and a satellite view of the same globe.”",
};

/* ---------------------------- assembly ----------------------------- */

function pick<T>(pool: T[], index: number): T {
  return pool[((index % pool.length) + pool.length) % pool.length];
}

function hookFor<T extends { hookIndex: number }>(
  t: T,
  pools: Record<Tone, string[]>,
  original: string,
  o: ReviseOptions,
): string {
  const variant = o.variant ?? 0;
  if (o.tone) return pick(pools[o.tone], t.hookIndex + variant);
  if (variant !== 0) {
    const flat = [...pools.hype, ...pools.professional, ...pools.funny];
    return pick(flat, t.hookIndex + variant - 1);
  }
  return original;
}

export function stripEmojis(s: string): string {
  return s
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/gu, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function finish(text: string, o: ReviseOptions): string {
  return o.stripEmoji ? stripEmojis(text) : text;
}

export function assembleCaption(t: CaptionTemplate, o: ReviseOptions): string {
  const blocks = [
    hookFor(t, CAPTION_HOOKS, t.hook, o),
    o.angle ? CAPTION_FEATURES[o.angle] : t.feature,
  ];
  if (!o.short) blocks.push(t.extra);
  blocks.push(t.cta);
  if (o.hashtags && t.hashtags) blocks.push(t.hashtags);
  return finish(blocks.join("\n\n"), o);
}

export function assembleEmail(t: EmailTemplate, o: ReviseOptions): { subject: string; body: string } {
  const subject = hookFor({ hookIndex: t.subjectIndex }, EMAIL_SUBJECTS, t.subject, o);
  const blocks = [t.greeting, o.angle ? EMAIL_FEATURES[o.angle] : t.feature];
  if (!o.short) blocks.push(t.extra);
  blocks.push(t.cta);
  if (t.signoff) blocks.push(t.signoff);
  return { subject: finish(subject, o), body: finish(blocks.join("\n\n"), o) };
}

export function assembleScriptBeats(t: ScriptTemplate, o: ReviseOptions): ScriptBeat[] {
  return t.beats
    .map((beat, i) => {
      if (o.short && i === t.optionalBeat) return null;
      if (i === 0) return { ...beat, text: finish(hookFor(t, SCRIPT_HOOKS, beat.text, o), o) };
      if (i === t.featureBeat && o.angle) return { ...beat, text: finish(SCRIPT_FEATURES[o.angle], o) };
      return { ...beat, text: finish(beat.text, o) };
    })
    .filter((x): x is ScriptBeat => x !== null);
}

export function assembleScript(t: ScriptTemplate, o: ReviseOptions): string[] {
  return assembleScriptBeats(t, o).map((b) => b.text);
}

/* --------------------- typed instruction rules --------------------- */

export interface InstructionResult {
  options: ReviseOptions;
  applied: string[];
  note?: string;
}

/**
 * Map a free-text change request onto the revision controls.
 * Deliberately small and honest: it only applies changes it can name,
 * and says so when nothing matches.
 */
export function applyInstruction(instruction: string, current: ReviseOptions): InstructionResult {
  const text = ` ${instruction.toLowerCase()} `;
  const options: ReviseOptions = { ...current };
  const applied: string[] = [];

  if (/\b(shorter|shorten|short|briefer|brief|tighter)\b/.test(text)) {
    options.short = true;
    applied.push("Made it shorter (dropped the optional block)");
  } else if (/\b(longer|expand|full version|more detail)\b/.test(text)) {
    options.short = false;
    applied.push("Restored the full-length version");
  }
  // "professional" must win over the bare word "pro" in the angle rule.
  if (/\b(professional|formal|serious|business)\b/.test(text)) {
    options.tone = "professional";
    applied.push("Tone set to Professional");
  } else if (/\b(funny|funnier|humorous|humor|humour|playful|witty)\b/.test(text)) {
    options.tone = "funny";
    applied.push("Tone set to Funny");
  } else if (/\b(hype|exciting|punchy|energetic|bolder|bold)\b/.test(text)) {
    options.tone = "hype";
    applied.push("Tone set to Hype");
  }
  if (/\b(flight|flights|planes|aircraft)\b/.test(text)) {
    options.angle = "flights";
    applied.push("Angle set to Flights");
  } else if (/\b(satellite|satellites|orbit|orbits)\b/.test(text)) {
    options.angle = "satellites";
    applied.push("Angle set to Satellites");
  } else if (/\b(camera|cameras|cctv|webcam|webcams)\b/.test(text)) {
    options.angle = "cameras";
    applied.push("Angle set to Cameras");
  } else if (/\bpro\b|\bosint\b|\bpremium\b|\bupgrade\b/.test(text)) {
    options.angle = "pro";
    applied.push("Angle set to Pro tier");
  }
  if (/hashtag/.test(text)) {
    options.hashtags = true;
    applied.push("Hashtags added (where the template has them)");
  }
  if (/(no emoji|remove emoji|without emoji|drop the emoji)/.test(text)) {
    options.stripEmoji = true;
    applied.push("Emojis removed");
  }

  return {
    options,
    applied,
    note: applied.length
      ? undefined
      : "No rule matched that. Try: “shorter”, “funnier”, “more professional”, “focus on flights”, “add hashtags”, or “remove emojis”.",
  };
}

// Revision-engine pins. The engine is deterministic and rules-based
// (NOT AI — the UI says so). These tests pin: default assembly equals
// the template's own parts in order, "shorter" drops exactly the
// optional block, tone/angle swaps come from the pools, typed
// instructions map onto the same controls ("professional" must win
// over the bare word "pro"), and unmatched instructions say so.
import { describe, it, expect } from "vitest";
import { CAPTION_TEMPLATES, EMAIL_TEMPLATES, SCRIPT_TEMPLATES } from "./templates";
import {
  applyInstruction,
  assembleCaption,
  assembleEmail,
  assembleScript,
  stripEmojis,
} from "./template-revise";

const caption = CAPTION_TEMPLATES[0];
const email = EMAIL_TEMPLATES[0];
const script = SCRIPT_TEMPLATES[0];

describe("assembleCaption", () => {
  it("default assembly is hook + feature + extra + cta, no hashtags", () => {
    const out = assembleCaption(caption, {});
    expect(out).toBe([caption.hook, caption.feature, caption.extra, caption.cta].join("\n\n"));
  });

  it("short drops the extra block only", () => {
    const out = assembleCaption(caption, { short: true });
    expect(out).toBe([caption.hook, caption.feature, caption.cta].join("\n\n"));
    expect(out).not.toContain(caption.extra);
  });

  it("angle swaps the feature block; tone swaps the hook", () => {
    const out = assembleCaption(caption, { angle: "flights", tone: "hype" });
    expect(out).not.toContain(caption.feature);
    expect(out).not.toContain(caption.hook);
    expect(out.startsWith("STOP SCROLLING")).toBe(true);
  });

  it("hashtags are appended only when requested and present", () => {
    expect(assembleCaption(caption, {})).not.toContain(caption.hashtags);
    expect(assembleCaption(caption, { hashtags: true })).toContain(caption.hashtags);
  });

  it("is deterministic: same options, same output", () => {
    const o = { tone: "funny" as const, angle: "pro" as const, variant: 2 };
    expect(assembleCaption(caption, o)).toBe(assembleCaption(caption, o));
  });
});

describe("assembleEmail", () => {
  it("default subject is the template's own; body keeps signoff", () => {
    const { subject, body } = assembleEmail(email, {});
    expect(subject).toBe(email.subject);
    expect(body).toContain(email.greeting);
    expect(body).toContain(email.feature);
    expect(body).toContain(email.signoff);
  });

  it("short drops the extra block; tone swaps the subject", () => {
    const short = assembleEmail(email, { short: true });
    expect(short.body).not.toContain(email.extra);
    const toned = assembleEmail(email, { tone: "professional" });
    expect(toned.subject).not.toBe(email.subject);
  });
});

describe("assembleScript", () => {
  it("default returns every beat in order", () => {
    expect(assembleScript(script, {})).toEqual(script.beats.map((b) => b.text));
  });

  it("short drops exactly the optional beat", () => {
    const out = assembleScript(script, { short: true });
    expect(out.length).toBe(script.beats.length - 1);
    expect(out).not.toContain(script.beats[script.optionalBeat].text);
  });

  it("angle rewrites only the feature beat", () => {
    const out = assembleScript(script, { angle: "satellites" });
    expect(out[script.featureBeat]).not.toBe(script.beats[script.featureBeat].text);
    expect(out[0]).toBe(script.beats[0].text);
  });
});

describe("applyInstruction", () => {
  it("maps length + tone words onto the controls", () => {
    const r = applyInstruction("make it shorter and funnier", {});
    expect(r.options.short).toBe(true);
    expect(r.options.tone).toBe("funny");
    expect(r.applied.length).toBe(2);
    expect(r.note).toBeUndefined();
  });

  it("'professional' wins over the bare word 'pro'", () => {
    const r = applyInstruction("make it more professional", {});
    expect(r.options.tone).toBe("professional");
    expect(r.options.angle).toBeUndefined();
  });

  it("maps focus words onto the angle", () => {
    expect(applyInstruction("focus on flights", {}).options.angle).toBe("flights");
    expect(applyInstruction("talk about satellites", {}).options.angle).toBe("satellites");
    expect(applyInstruction("push the pro tier", {}).options.angle).toBe("pro");
    expect(applyInstruction("all about cameras", {}).options.angle).toBe("cameras");
  });

  it("handles hashtags + emoji requests", () => {
    const r = applyInstruction("add hashtags and remove emojis", {});
    expect(r.options.hashtags).toBe(true);
    expect(r.options.stripEmoji).toBe(true);
  });

  it("unmatched instructions change nothing and say so", () => {
    const r = applyInstruction("make it more purple", { short: true });
    expect(r.applied).toEqual([]);
    expect(r.options).toEqual({ short: true });
    expect(r.note).toMatch(/No rule matched/);
  });
});

describe("stripEmojis", () => {
  it("removes emoji and collapses the gaps", () => {
    expect(stripEmojis("watch 🌍 live 👆 now")).toBe("watch live now");
  });
});

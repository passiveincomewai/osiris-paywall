/**
 * Multi-resort pass affiliations for the ski resort pages.
 *
 * Source of truth: src/data/ski-resort-passes.json — hand-compiled in
 * Oct 2026 from each pass programme's own published destination list
 * (ikonpass.com / Alterra, epicpass.com / Vail Resorts,
 * mountaincollective.com, indyskipass.com; see the ski-scale REPORT for
 * the source list). Only affiliations those sources document are
 * included; a resort with no entry has no documented affiliation among
 * the four programmes — the pages simply show no pass chip for it.
 *
 * This is programme membership only. Access terms (days included,
 * blackout dates, reservation requirements) vary by pass product and
 * season — the pages link readers to the resort's official pages for
 * those, and never state access terms of their own.
 */
import passesJson from "@/data/ski-resort-passes.json";

export const SKI_PASS_NAMES = [
  "Epic Pass",
  "Ikon Pass",
  "Mountain Collective",
  "Indy Pass",
] as const;

export type SkiPassName = (typeof SKI_PASS_NAMES)[number];

const PASSES = passesJson as Record<string, string[]>;

/** Pass programmes a resort belongs to, in canonical display order. */
export function passesForResort(slug: string): SkiPassName[] {
  const list = PASSES[slug];
  if (!list) return [];
  return SKI_PASS_NAMES.filter((name) => list.includes(name));
}

/** Slugs of every resort with at least one documented affiliation. */
export function resortSlugsWithPasses(): string[] {
  return Object.keys(PASSES);
}

/** Distinct resorts affiliated with one programme. */
export function resortCountForPass(name: SkiPassName): number {
  return Object.values(PASSES).filter((list) => list.includes(name)).length;
}

/**
 * Normalise an incoming ?pass= query value to a canonical pass name.
 *
 * The site's own links always carry the exact canonical name
 * ("Ikon Pass"), but hand-typed, shared or externally-built URLs
 * arrive in friendlier shapes. Accepted forms:
 *   - the canonical name in any case, surrounding whitespace ignored
 *     ("ikon pass", "IKON PASS", " Mountain Collective ")
 *   - the name with its trailing " Pass" dropped, in any case
 *     ("ikon" → "Ikon Pass", "epic" → "Epic Pass", "indy" → "Indy Pass")
 *   - the distinctive last word of a name that carries no " Pass"
 *     suffix ("collective" → "Mountain Collective")
 * A short form is honoured only while it maps to exactly ONE canonical
 * name; anything else — including "mountain" on its own, which is a
 * generic word rather than a programme — returns null, and the caller
 * renders unfiltered, exactly as it always has for unknown values.
 */
export function parseSkiPassParam(raw: string | null | undefined): SkiPassName | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim().toLowerCase();
  if (!value) return null;
  for (const name of SKI_PASS_NAMES) {
    if (name.toLowerCase() === value) return name;
  }
  const matches = new Set<SkiPassName>();
  for (const name of SKI_PASS_NAMES) {
    const lower = name.toLowerCase();
    const stem = lower.endsWith(" pass") ? lower.slice(0, -" pass".length) : lower;
    const words = lower.split(" ");
    const distinctive = words[words.length - 1] === "pass" ? words[0] : words[words.length - 1];
    if (value === stem || value === distinctive) matches.add(name);
  }
  if (matches.size !== 1) return null;
  for (const match of matches) return match;
  return null;
}

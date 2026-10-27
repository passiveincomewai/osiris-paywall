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

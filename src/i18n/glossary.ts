/**
 * WorldEye internationalization — glossary.
 *
 * Terms that must survive translation intact, and approved renderings
 * that every dictionary must reuse so terminology stays consistent
 * across pages and locales (brief §6: preserve names, technical terms
 * and identifiers; §11: reusable dictionaries reduce drift).
 */

import type { LocaleCode } from "./config";

/**
 * Brand, product and technical terms that are never translated, in any
 * locale. Dictionaries reference these verbatim.
 */
export const DO_NOT_TRANSLATE: string[] = [
  "WorldEye",
  "Pro",
  "VIP Pro",
  "OSINT",
  "ADS-B",
  "AIS",
  "CCTV",
  "GDELT",
];

/**
 * Factual tokens that are locale-independent: prices, plan prices and
 * camera counts are copied from the English source as-is, never
 * re-typed per locale. (The values themselves live with the English
 * source content, not here, so they cannot drift in this file.)
 */
export const FACTUAL_TOKENS_NOTE =
  "Prices, plan names, trial terms and camera counts are glossary-locked: localized pages must render the same values as the English source.";

/**
 * Approved localized renderings for recurring source strings, seeded
 * from the brief's own §6 examples (Jameson's brief, 2026-10-14).
 * Drafts for these strings use these renderings, not fresh machine
 * translations.
 */
export const APPROVED_RENDERINGS: Record<
  string,
  Partial<Record<Exclude<LocaleCode, "en">, string>>
> = {
  "Live Traffic Cameras": {
    es: "Cámaras de Tráfico en Vivo",
    de: "Live-Verkehrskameras",
    fr: "Caméras de Circulation en Direct",
  },
};

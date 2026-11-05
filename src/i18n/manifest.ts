/**
 * WorldEye internationalization — publication manifest.
 *
 * Records, per selected page ("slug"), which locales are actually
 * published. This manifest is the single driver for hreflang maps
 * (src/lib/i18n-seo.ts), the sitemap's localized entries and the
 * language selector: a page × locale appears in any of them only when
 * an entry here says `status: "published"` (brief §5: only include
 * translated pages that actually exist).
 *
 * English needs no entry — the English page is the source and always
 * exists for a selected slug.
 *
 * Translation-maintenance fields (brief §11): `sourceHash` is the
 * SHA-256 over the page's English dictionary values at publish time
 * (stable serialization in src/i18n/source-hash.ts); when the current
 * English source no longer matches, tooling flags the entry outdated.
 * The dictionary completeness test recomputes every hash, so drift
 * fails the test suite loudly instead of rotting silently. Entries
 * with `reviewed: true` must never be overwritten by draft tooling.
 */

import { DEFAULT_LOCALE, type LocaleCode } from "./config";

export type TranslationStatus = "draft" | "published" | "outdated";

export interface ManifestEntry {
  /** Page slug without a leading slash; "" is the homepage. */
  slug: string;
  locale: Exclude<LocaleCode, "en">;
  status: TranslationStatus;
  /** True once a human (or Jameson-approved review) has signed off. */
  reviewed: boolean;
  /** SHA-256 of the English dictionary values at publish time. */
  sourceHash: string | null;
  /** ISO date the translation was published / meaningfully updated. */
  updatedAt: string | null;
}

/**
 * The Top 20 selected pages, in the refreshed 2026-10-21 rank order
 * (~/workspace/worldeye-i18n/page-selection.md). `phase` is the rollout
 * phase that localizes the page: Phase 2 = Top 10 × es/fr/de/pt-br/ja;
 * Phase 3 = ranks 11–20 × all nine translated locales.
 */
export const SELECTED_PAGES: { slug: string; phase: 2 | 3 }[] = [
  { slug: "", phase: 2 },
  { slug: "pricing", phase: 2 },
  { slug: "cameras", phase: 2 },
  { slug: "gods-eye-view", phase: 2 },
  { slug: "live-flight-tracker", phase: 2 },
  { slug: "features", phase: 2 },
  { slug: "live-webcams", phase: 2 },
  { slug: "alternatives/gods-eye-view", phase: 2 },
  { slug: "satellite-tracker", phase: 2 },
  { slug: "weather-tracker", phase: 2 },
  { slug: "europe-live-cameras", phase: 3 },
  { slug: "live-traffic-cameras", phase: 3 },
  { slug: "cameras/countries", phase: 3 },
  { slug: "ski-webcams", phase: 3 },
  { slug: "earthquake-tracker", phase: 3 },
  { slug: "world-city-webcams", phase: 3 },
  { slug: "alternatives/google-earth", phase: 3 },
  { slug: "ship-tracker", phase: 3 },
  { slug: "beach-webcams", phase: 3 },
  { slug: "faq", phase: 3 },
];

/**
 * Published translation entries.
 *
 * Spanish foundation tranche (2026-10-26): the six owner-picked top
 * pages in Spanish, as in-house DRAFT translations (reviewed: false —
 * professional review is still the owner's open question). The routes
 * live under src/app/[locale]/ and render from the dictionaries in
 * src/i18n/dictionaries/es/. Every other selected page × locale stays
 * unpublished until its own conversion lands: adding a page or a
 * language later is a data change here plus dictionary files, never
 * new routing code.
 *
 * The fr/de/pt-br/ja home + pricing dictionaries drafted in the
 * earlier Phase 1 tranche (2026-10-24, staged in
 * ~/workspace/worldeye-i18n-build) are deliberately NOT published
 * here: they predate the 2026-10-26 fact corrections (trial lengths,
 * satellite-view-is-free) and the current English extraction, so they
 * must be re-synced and re-hashed before they can be listed.
 */
const ES_TRANCHE_DATE = "2026-10-26";
// SHA-256 over each slug's English dictionary (src/i18n/source-hash.ts),
// computed at publish time; dictionaries.test.ts recomputes and pins them.
const ES_SOURCE_HASHES: Record<string, string> = {
  "": "50f38f9f755317ccc03cad2de028ea2d37654e04788d3428dfbad98f2f9c6c56",
  pricing: "baa2c2545a18d6cab0e2561cd8d13c89b09d4775492816a286680bdd3e2e07ac",
  "live-webcams": "5b6ebf74176e177bba6b13c296da76b85f2003d4bb65c15a904a7041821d1c8f",
  faq: "310dd5cf01093f128168be46d21f0f35170de1f249b0772edc15dfd97afa9ecb",
  "live-flight-tracker": "f6098a009698c4a81bbdf8d413acc89dbf3d5bce2b506ab3e4627f2c168c1cf8",
  "ship-tracker": "07aa958ab9475efa3c61062044fcfe2f3fb461b4d8dee9ad29f711b86632d99d",
};

// Rebase note (2026-10-27): the foundation was rebased onto production
// tip a3fbb3e5, which postdated the original extraction — four English
// dictionaries were re-synced to current production copy (home: drone
// rows out + trial wording; pricing: current metadata, drone compare
// row out, the added cost FAQ + compare teasers; both trackers: the
// C5 paired-asset links / ship one-map block) and their translations
// adjusted the same day, so those entries carry the rebase date. The
// faq and live-webcams dictionaries verified byte-identical to their
// publish-time hashes and keep the tranche date.
// Re-sync (2026-10-28): the ship-tracker dictionary gained the
// cruise-ships link section with the per-ship pages ship; the Spanish
// dictionary was translated the same day, so its hash and date moved.
// Re-sync (2026-10-28, SEO Phase 3): the live-flight-tracker and
// live-webcams dictionaries got title/meta/lead alignment (programme
// TOP10 items #1/#2); the Spanish dictionaries were re-translated the
// same day, so their hashes and dates moved too.
// Re-sync (2026-10-29, SEO Phase 3 build C): the live-flight-tracker
// dictionary gained the satellite-view answer section + FAQ (TOP10
// item #3); the Spanish dictionary was translated the same day, so
// its hash and date moved too.
// Re-sync (2026-10-29, SEO Phase 3 build D): the ship-tracker
// dictionary gained the "What is AIS?" related link (TOP10 item #6 —
// the AIS cluster pairing); the Spanish entry was translated the
// same day, so its hash and date moved too.
// Re-sync (2026-10-29, Keyword Gap Programme): the live-webcams
// dictionary gained the "live cams near me" direct answer + FAQ
// (GSC striking-distance cluster + Trends +170%); the Spanish
// dictionary was translated the same day, so its hash and date moved.
// Re-sync (2026-10-29, Osiris brand removal): the pricing dictionary's
// comparison FAQ swapped its osirisai.live wording for "the free
// self-hosted version"; the Spanish dictionary carries the matching
// "versión gratuita autohospedada" line, so only the hash and date
// move here — no dictionary bytes changed in this re-sync.
// Re-sync (2026-10-30, FAQ compilation): the faq dictionary was
// rebuilt from the site-wide FAQ harvest (86 questions, 11 groups)
// and the Spanish dictionary re-translated the same day, so its
// hash and date moved.
// Re-sync (2026-10-31, site-audit Wave 2 R26): the pricing
// dictionary's vipFeatures gained the VIP hub trio (Event alerts,
// Personal brief, Saved views) and the Spanish dictionary was
// re-synced the same day, so the pricing hash moved; its updatedAt
// was already 2026-10-31 from the Wave 1 copy-truth pass.
// Re-sync (2026-10-31, site-audit Wave 3 R55): the pricing
// dictionary's faqs gained three entries (promo codes / WELCOME50,
// code stacking, recordings + saved data after cancelling) and the
// Spanish dictionary was re-synced the same day, so the pricing
// hash moved; its updatedAt was already 2026-10-31.
// Re-sync (2026-10-30, Pricing Redesign Phase C): the pricing
// dictionary was restructured for the 3-tier grid (Lite / Pro / Ultra
// × weekly / monthly / annual): plansGrid + tiers + liteFeatures
// added, the comparison table gained Lite/Ultra columns, the false
// weekly-equivalent discount claims ("Save 60% / 82%", "-42% / -71%")
// were retired for the truthful annual-vs-monthly savings (58.3% /
// 55.3% / 50.0%), and the cost/free/self-hosted FAQs were rewritten
// for the grid. The Spanish dictionary was re-synced the same day.
// Re-sync (2026-11-01, Pricing Redesign v2): the pricing dictionary
// gained the reference-design hero (eyebrow + feature strip), the
// card trust row + detail links, the why-upgrade row and the
// planDetails copy for /pricing/lite|pro|ultra; the money-back
// sentence now appears once on /pricing. The Spanish dictionary was
// re-synced the same day, so the pricing hash moved; its updatedAt
// stays 2026-10-31.
// Re-sync (2026-11-01, site error audit E-06): the pricing and faq
// dictionaries' traffic copy was corrected to the E-05 standard —
// congestion is modeled from road data and labeled as modeled;
// live TomTom flow is not currently served. The Spanish dictionaries
// were re-synced the same day, so the pricing and faq hashes moved;
// their updatedAt stays 2026-10-31.
// Re-sync (2026-11-01, Pricing v3): the pricing dictionary gained
// the feature-showcase block (real site captures) and one added
// feature capture on the Lite and Pro detail copy. The Spanish
// dictionary was re-synced the same day, so the pricing hash moved;
// its updatedAt stays 2026-10-31.
// Re-sync (2026-11-01, Pricing Phase 4): the pricing dictionary's
// showcase gained the northern-lights directory and tools-hub
// captures, the Pro detail copy swapped its search capture for the
// tools hub, and the Ultra detail copy gained the globe capture
// with the flight + satellite layers on. The Spanish dictionary
// was re-synced the same day, so the pricing hash moved; its
// updatedAt stays 2026-10-31.
// Re-sync (2026-11-01, FAQ expansion B4): the pricing dictionary's
// faqs gained three entries (free-trial length, Lite/Pro/Ultra
// difference, how many cameras you can watch) from the approved
// FAQ-expansion audit; the Spanish dictionary was re-synced the
// same day, so the pricing hash moved; its updatedAt stays
// 2026-10-31.
// Re-sync (2026-11-01, FAQ expansion B5): the live-flight-tracker
// dictionary's faqs gained two entries (why positions jump or lag;
// the 3D cockpit follow view) from the approved FAQ-expansion
// audit; the Spanish dictionary was re-synced the same day, so the
// live-flight-tracker hash moved (this also clears the hash drift
// the dictionary had accumulated before this re-sync); its
// updatedAt stays 2026-10-29.
// Re-sync (2026-11-01, master repair): the pricing dictionary's
// Lite premium-layers card stopped enumerating the Ultra intel
// feeds; the Spanish dictionary was re-synced the same day, so
// the pricing hash moved; its updatedAt stays 2026-10-31.
// Re-sync (2026-11-01, master repair, FAQ pass): the faq
// dictionary's billing/feature answers were re-aligned to the
// 3-tier grid (VIP Pro = the annual Pro plan's name; Ultra is
// the top tier; legacy annual holders keep their VIP extras);
// the Spanish dictionary was re-synced the same day, so the faq
// hash moved; its updatedAt stays 2026-10-31.
// Re-sync (2026-11-01, copy accuracy sweep D1 re-land): the home
// dictionary's Ultra attributions + free-access answers, reverted
// by a stale-base push, were restored, and the faq dictionary's
// remaining free-access answers (the map-free question's camera
// clause, the NYC and aurora answers) were aligned to the camera-
// opens allowance on top of the master-repair FAQ pass; the
// Spanish dictionaries were re-synced the same day, so the home
// and faq hashes moved; their updatedAt stays 2026-10-31.
// Re-sync (2026-11-01, copy accuracy sweep D2 re-land): the
// live-webcams free-access wording (free to browse + the camera-
// opens allowance) and the ship-tracker maritime-feed Ultra
// attribution, lost when D2's original push was interrupted, were
// restored; the Spanish dictionaries were re-synced the same day,
// so the live-webcams and ship-tracker hashes moved (this also
// clears the live-webcams hash drift the dictionary had
// accumulated); their updatedAt stays 2026-10-29 / 2026-10-31.
// Re-sync (2026-11-04, question-ranking plays): the home and faq
// dictionaries gained the "can you / is it legal" camera FAQ family
// (can anyone watch public street cameras; is it legal; where the
// cameras come from; are they really live); the Spanish dictionaries
// were re-synced the same day, so the home and faq hashes moved;
// their updatedAt stays 2026-10-31.
const ES_UPDATED_AT: Record<string, string> = {
  "": "2026-10-31",
  pricing: "2026-10-31",
  "live-webcams": "2026-10-29",
  faq: "2026-10-31",
  "live-flight-tracker": "2026-10-29",
  "ship-tracker": "2026-10-31",
};

const ES_PUBLISHED_SLUGS = [
  "",
  "pricing",
  "live-webcams",
  "faq",
  "live-flight-tracker",
  "ship-tracker",
] as const;

export const MANIFEST_ENTRIES: ManifestEntry[] = ES_PUBLISHED_SLUGS.map(
  (slug): ManifestEntry => ({
    slug,
    locale: "es",
    status: "published",
    reviewed: false,
    sourceHash: ES_SOURCE_HASHES[slug],
    updatedAt: ES_UPDATED_AT[slug],
  })
);

export function isSelectedSlug(slug: string): boolean {
  return SELECTED_PAGES.some((page) => page.slug === slug);
}

/** Locales in which `slug` is published, English first (always present). */
export function publishedLocalesFor(slug: string): LocaleCode[] {
  const translated = MANIFEST_ENTRIES.filter(
    (entry) => entry.slug === slug && entry.status === "published"
  ).map((entry) => entry.locale as LocaleCode);
  return [DEFAULT_LOCALE, ...translated];
}

export function isPublished(slug: string, locale: LocaleCode): boolean {
  if (locale === DEFAULT_LOCALE) return isSelectedSlug(slug);
  return MANIFEST_ENTRIES.some(
    (entry) =>
      entry.slug === slug &&
      entry.locale === locale &&
      entry.status === "published"
  );
}

/** Translated locales with at least one published page (selector/routes). */
export function publishedTranslatedLocales(): LocaleCode[] {
  const seen = new Set<LocaleCode>();
  for (const entry of MANIFEST_ENTRIES) {
    if (entry.status === "published") seen.add(entry.locale as LocaleCode);
  }
  return [...seen];
}

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
  "": "3987311a1f1f7b5fc3e983833746da740e871cd7f755a5cb46016d4ff6b6c801",
  pricing: "52d89edee0bfe9fb5e6682d018b446d290718e34d507840006a58e155bbd8a6d",
  "live-webcams": "54a9ce1419a86b32947d625722b245bda2a93155af8c60f8fd5a8c6f2a51bd04",
  faq: "e7c967dff68f038660c58887cabe671eb2fd8dbcbba1fe4239829c0899f40f88",
  "live-flight-tracker": "3784894f1c4fce3a82800cf0d721bdd136b7590d0394e00e184056dcd179703c",
  "ship-tracker": "a2ac2cec641df42357c801e233edab00d77f58fc3bb7bb7071b3b56298709e34",
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

/**
 * Sitemap lastmod guard (SEO audit 2026-10-27, fix #2).
 *
 * A <lastmod> in the future is invalid — the artefact a page derives
 * from cannot have been modified after today — and a sitemap that
 * emits future dates teaches crawlers to distrust every legitimate
 * lastmod in the file. The 2026-10-27 audit found 55: a GTFS feed
 * validity END date parsed as a version date (fixed at the source in
 * lib/transit/seo's feedVersionDate) and blog posts carrying
 * tomorrow's date on the evening they ship.
 *
 * This is the backstop for every family: an entry whose lastModified
 * is strictly after `now` loses the field entirely. The date is
 * dropped, never clamped to "now" — stamping today on an artefact
 * that carries tomorrow's date would fabricate a modification that
 * hasn't happened. When the real date arrives, the entry carries it
 * again on the next render.
 */
export function withoutFutureLastmod<T extends { lastModified?: Date | string }>(
  entry: T,
  now: Date,
): T {
  if (entry.lastModified == null) return entry;
  const t = new Date(entry.lastModified).getTime();
  if (Number.isFinite(t) && t <= now.getTime()) return entry;
  const copy = { ...entry };
  delete copy.lastModified;
  return copy;
}

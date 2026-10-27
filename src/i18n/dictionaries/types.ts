/**
 * Shared dictionary building blocks (WorldEye multilingual).
 *
 * Page copy that contains inline markup in the components — a
 * <strong> lead-in, an internal <Link>, a highlighted heading span —
 * is modeled as an array of segments instead of a flat string, so the
 * extracted page-body components render exactly the same structure in
 * every locale. Internal links carry a page SLUG (never a finished
 * href): the renderer resolves it through localizedPath(), so a link
 * points at the locale's own version when that page is published in
 * the locale and at the English URL otherwise.
 */

export type RichSegment =
  | { t: "text"; text: string }
  | { t: "strong"; text: string }
  | { t: "link"; slug: string; text: string }
  | { t: "accent"; text: string };

/** One paragraph (or heading) of rich copy. */
export type RichText = RichSegment[];

/** Convenience constructors that keep dictionary files readable. */
export const tx = (text: string): RichSegment => ({ t: "text", text });
export const st = (text: string): RichSegment => ({ t: "strong", text });
export const lk = (slug: string, text: string): RichSegment => ({
  t: "link",
  slug,
  text,
});
export const ac = (text: string): RichSegment => ({ t: "accent", text });

/**
 * Fill {placeholders} in a dictionary template with runtime values
 * (catalogue counts, formatted totals). Values are inserted verbatim;
 * dictionaries own the surrounding punctuation and spacing.
 */
export function fill(
  template: string,
  values: Record<string, string | number>
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match
  );
}

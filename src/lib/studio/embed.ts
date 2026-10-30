// ── Studio banner embeds ───────────────────────────────────────────────
// A public, personalized banner image per (affiliate code, template
// slug), served by /api/affiliate/studio/embed/[code]/[slug] and
// rendered by the shared pipeline with the template's DEFAULT field
// values — the affiliate's code/link/QR are baked in from their real
// context at render time. The helpers here are pure so the snippet the
// UI hands to affiliates is unit-testable.

/** Path of the public embed image endpoint for a code + template. */
export function embedImagePath(code: string, slug: string): string {
  return `/api/affiliate/studio/embed/${encodeURIComponent(code)}/${encodeURIComponent(slug)}`;
}

/** Absolute embed image URL on the site's public origin. */
export function embedImageUrl(baseUrl: string, code: string, slug: string): string {
  return `${baseUrl.replace(/\/+$/, "")}${embedImagePath(code, slug)}`;
}

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Copy-ready embed HTML at the template's native dimensions. The image
 * links to the affiliate's referral link; rel="sponsored" is the
 * correct disclosure for affiliate creative.
 */
export function embedHtml(opts: {
  link: string;
  imageUrl: string;
  width: number;
  height: number;
  alt: string;
}): string {
  const { link, imageUrl, width, height, alt } = opts;
  return `<a href="${escapeAttr(link)}" target="_blank" rel="noopener sponsored"><img src="${escapeAttr(imageUrl)}" width="${width}" height="${height}" alt="${escapeAttr(alt)}" loading="lazy" style="border:0"></a>`;
}

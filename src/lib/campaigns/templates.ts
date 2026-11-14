// Campaign template rendering — pure, unit-tested.
//
// Tokens are {{key}} placeholders resolved against a recipient's meta:
// the well-known keys name / first_name / org / role are served from
// meta (first_name is derived from meta.name when not set explicitly),
// and ANY other key present in meta works too ({{segment}}, {{city}}…).
// Unknown tokens render as an empty string so a typo can never leak a
// raw {{placeholder}} into a sent email — the admin preview renders
// through this exact code path, so what the owner sees is what sends.

export type RecipientMeta = Record<string, unknown>;

export function metaString(meta: RecipientMeta | null | undefined, key: string): string {
  const v = meta?.[key];
  if (v == null) return "";
  return String(v);
}

export function firstNameOf(meta: RecipientMeta | null | undefined): string {
  const explicit = metaString(meta, "first_name") || metaString(meta, "firstName");
  if (explicit) return explicit;
  const name = metaString(meta, "name").trim();
  if (!name) return "";
  return name.split(/\s+/)[0] ?? "";
}

/** The full token context for one recipient: every meta key, plus the
 * derived first_name. Keys are matched case-insensitively at render. */
export function tokenContext(meta: RecipientMeta | null | undefined): Record<string, string> {
  const ctx: Record<string, string> = {};
  for (const [k, v] of Object.entries(meta ?? {})) {
    if (v == null) continue;
    ctx[k.toLowerCase()] = String(v);
  }
  ctx["first_name"] = firstNameOf(meta);
  if (!ctx["name"]) ctx["name"] = metaString(meta, "name");
  return ctx;
}

export function renderTemplate(template: string, meta: RecipientMeta | null | undefined): string {
  const ctx = tokenContext(meta);
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key: string) => {
    return ctx[key.toLowerCase()] ?? "";
  });
}

/** List the distinct token keys a template references (for the palette /
 * validation hints in the admin UI). */
export function templateTokens(template: string): string[] {
  const out = new Set<string>();
  for (const m of template.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)) {
    out.add(m[1].toLowerCase());
  }
  return [...out].sort();
}

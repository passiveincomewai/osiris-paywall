/**
 * Related searches (INTENT-AND-CLUSTERS §6, chunk C9).
 *
 * After a place page's camera grid, offer the searches a visitor to
 * THIS place plausibly runs next. Every suggestion is a real page,
 * derived from the place's own catalogue data — never a keyword
 * list. This module is the pure sequencer: callers (the city and
 * country templates) extract the place's facts (kind mix, areas,
 * neighbours, parent) and this module applies the §6 rules —
 * priority order, the ≥8 kind gate, per-rule caps, the max-6 /
 * min-3 render gate, and anchor de-duplication against the anchors
 * the page already carries (its related block and cluster links,
 * §6.2: the §5.3 cap counts them together).
 *
 * De-duplication is by anchor TEXT against the page (the spec's
 * rule) and by href within the suggestion list itself (rule 1's
 * place-anchored target beats rule 5's wall when both name the
 * same kind; two rules never emit the same destination twice).
 */

export type RelatedKind = "traffic" | "coast" | "transport" | "mountains";

export interface KindCandidate {
  kind: RelatedKind;
  /** Cameras of this kind in THIS place (the place's own mix data). */
  count: number;
  /** Place-anchored target where one exists (e.g. a country traffic
   *  page for a city in that country) — wins over the wall. */
  localHref?: string;
  /** Anchor for the local target, composed by the caller from the
   *  place's own facts (e.g. "Tokyo's road and river cameras"). */
  localAnchor?: string;
  /** The evergreen wall for this kind. */
  wallHref: string;
}

export interface AreaCandidate {
  name: string;
  href: string;
  count: number;
}

export interface NeighbourCandidate {
  name: string;
  href: string;
  distanceKm: number;
  /** Compass direction of the neighbour FROM this place ("south-east"). */
  direction: string;
}

export interface ParentCandidate {
  anchor: string;
  href: string;
  subtext: string;
}

export interface RelatedSearchesInput {
  placeName: string;
  kinds: KindCandidate[];
  areas: AreaCandidate[];
  neighbours: NeighbourCandidate[];
  /** Rule 4: the parent directory (country page / region hub). */
  parent: ParentCandidate | null;
  /** Rule 4b: US cities also offer the state hub. */
  extraParent?: ParentCandidate | null;
  /** Anchors already rendered elsewhere on the page. */
  usedAnchors: readonly string[];
}

export interface RelatedSuggestion {
  anchor: string;
  href: string;
  subtext: string;
  rule: 1 | 2 | 3 | 4 | 5;
}

export const KIND_MIN_COUNT = 8;
export const RELATED_MIN = 3;
export const RELATED_MAX = 6;

const fmt = (n: number) => n.toLocaleString("en-US");

/** "Seattle" → "Seattle's"; "Las Vegas" → "Las Vegas'". Local copy of
 *  the place-neighbours rule so this module stays dependency-free. */
function possessive(name: string): string {
  const trimmed = name.trim();
  return /s$/i.test(trimmed) ? `${trimmed}'` : `${trimmed}'s`;
}

/** 8-wind compass direction of `to` seen from `from`, from raw
 *  coordinates — a data fact, used to make neighbour anchors unique
 *  by construction (§6.2). */
export function compassDirection(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): string {
  const bearing =
    (Math.atan2(to.lng - from.lng, to.lat - from.lat) * 180) / Math.PI;
  const winds = [
    "north",
    "north-east",
    "east",
    "south-east",
    "south",
    "south-west",
    "west",
    "north-west",
  ];
  const idx = Math.round(((bearing + 360) % 360) / 45) % 8;
  return winds[idx];
}

/** Rule-1 anchor for a kind aimed at its wall (no local target). */
function wallKindAnchor(kind: RelatedKind, placeName: string): string {
  switch (kind) {
    case "traffic":
      return `Road cameras beyond ${placeName}`;
    case "coast":
      return `Beaches and harbour cameras around ${placeName}`;
    case "transport":
      return `Airports serving ${placeName}`;
    case "mountains":
      return `Ski and mountain cameras near ${placeName}`;
  }
}

/** Rule-1 subtext: the kind's own count in this place — the fact
 *  that earned the suggestion. */
function kindSubtext(kind: RelatedKind, count: number, placeName: string): string {
  switch (kind) {
    case "traffic":
      return `${fmt(count)} road cameras are indexed in ${placeName}`;
    case "coast":
      return `${fmt(count)} coastal cameras are indexed in ${placeName}`;
    case "transport":
      return `${fmt(count)} airport and station cameras are indexed in ${placeName}`;
    case "mountains":
      return `${fmt(count)} mountain and ski cameras are indexed in ${placeName}`;
  }
}

/** Rule-5 anchor: the evergreen wall for the dominant kind. */
function wallAnchor(kind: RelatedKind): string {
  switch (kind) {
    case "traffic":
      return "Live traffic cameras worldwide";
    case "coast":
      return "Beach webcams worldwide";
    case "transport":
      return "Airport webcams worldwide";
    case "mountains":
      return "Ski webcams worldwide";
  }
}

const normalizeAnchor = (a: string) =>
  a.toLowerCase().replace(/\s+/g, " ").trim();

export function buildRelatedSearches(
  input: RelatedSearchesInput,
): RelatedSuggestion[] {
  const used = new Set(input.usedAnchors.map(normalizeAnchor));
  const seenHrefs = new Set<string>();
  const out: RelatedSuggestion[] = [];

  const push = (s: RelatedSuggestion) => {
    const key = normalizeAnchor(s.anchor);
    if (used.has(key) || seenHrefs.has(s.href)) return;
    used.add(key);
    seenHrefs.add(s.href);
    out.push(s);
  };

  const kinds = [...input.kinds]
    .filter((k) => k.count >= KIND_MIN_COUNT)
    .sort((a, b) => b.count - a.count);

  /* Rule 1 — same place, different kind (max 3). The place-anchored
     target wins; the wall is the fallback target. */
  for (const k of kinds.slice(0, 3)) {
    if (k.localHref) {
      push({
        anchor:
          k.localAnchor ?? `${possessive(input.placeName)} ${k.kind === "traffic" ? "road" : k.kind} cameras`,
        href: k.localHref,
        subtext: kindSubtext(k.kind, k.count, input.placeName),
        rule: 1,
      });
    } else {
      push({
        anchor: wallKindAnchor(k.kind, input.placeName),
        href: k.wallHref,
        subtext: kindSubtext(k.kind, k.count, input.placeName),
        rule: 1,
      });
    }
  }

  /* Rule 2 — sub-places / areas of this place (max 2, largest first). */
  for (const a of [...input.areas]
    .sort((x, y) => y.count - x.count)
    .slice(0, 2)) {
    push({
      anchor: `Cameras in ${a.name}`,
      href: a.href,
      subtext: `${fmt(a.count)} cameras in this part of ${input.placeName}`,
      rule: 2,
    });
  }

  /* Rule 3 — geographic neighbours (max 2, nearest first). */
  for (const n of [...input.neighbours]
    .sort((x, y) => x.distanceKm - y.distanceKm)
    .slice(0, 2)) {
    push({
      anchor: `Live cameras in ${n.name}`,
      href: n.href,
      subtext: `${fmt(Math.round(n.distanceKm))} km ${n.direction} of ${input.placeName}`,
      rule: 3,
    });
  }

  /* Rule 4 — the parent directory (+ the state hub for US cities). */
  if (input.parent) push({ ...input.parent, rule: 4 });
  if (input.extraParent) push({ ...input.extraParent, rule: 4 });

  /* Rule 5 — same kind, bigger stage: the dominant kind's evergreen
     wall (max 1). Skipped when rule 1 already sent that kind to the
     same wall (href dedupe) — the wall then appears once, as the
     rule-1 suggestion. */
  const dominant = kinds[0];
  if (dominant) {
    push({
      anchor: wallAnchor(dominant.kind),
      href: dominant.wallHref,
      subtext: `${possessive(input.placeName)} biggest camera kind, on the world wall`,
      rule: 5,
    });
  }

  const capped = out.slice(0, RELATED_MAX);
  /* Min-3 gate (§6.1): fewer than three honest suggestions means the
     block does not render at all — never pad to reach the floor. */
  return capped.length >= RELATED_MIN ? capped : [];
}

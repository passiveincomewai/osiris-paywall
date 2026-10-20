/**
 * OSIRIS — what a place field offers, in order.
 *
 * One composition for every field in the directions panel (start,
 * stops, destination — they share the PlaceInput component): the
 * operator's own position pinned first when a fix exists, then the
 * recent places while the field is empty, or the geocoder's results
 * for what was typed. A one-shot fix and a live tracking fix pin the
 * same way; only the context line differs ('Position fix' vs 'Live
 * position') so the list never claims a captured fix is live.
 */

export interface SuggestionPlace {
  label: string;
  lat: number;
  lng: number;
  kind?: string;
  context?: string;
}

export interface SuggestionOption extends SuggestionPlace {
  recent?: boolean;
}

export function buildSuggestionOptions(args: {
  /** The operator's position, when one is known. `live` distinguishes
   *  the tracking watch's fix from a captured one-shot fix. */
  fix: { lat: number; lng: number; live: boolean } | null;
  /** True while the field holds less than a searchable query. */
  empty: boolean;
  recent: SuggestionPlace[];
  results: SuggestionPlace[];
}): SuggestionOption[] {
  const you: SuggestionOption[] = args.fix
    ? [{
        label: 'Your location',
        lat: args.fix.lat,
        lng: args.fix.lng,
        kind: 'current',
        context: args.fix.live ? 'Live position' : 'Position fix',
      }]
    : [];
  return [
    ...you,
    ...(args.empty
      ? args.recent.map((r) => ({ ...r, recent: true }))
      : args.results),
  ];
}

/**
 * True when typed text has diverged from the picked place's label —
 * the pick no longer stands behind the field, so anything plotted
 * from it must not survive on the strength of the old pick.
 */
export function typedOverPick(
  pickedLabel: string | null | undefined,
  text: string,
): boolean {
  return (
    typeof pickedLabel === 'string' &&
    pickedLabel.length > 0 &&
    text !== pickedLabel
  );
}

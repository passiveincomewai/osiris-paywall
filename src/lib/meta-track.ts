// Browser-side Meta event helper: the client twin of lib/meta-capi.ts.
// Conversion events fired through trackMetaEvent carry the SAME eventID
// as the server-side Conversions API event for the same action, so Meta
// deduplicates the pair. The fbq global itself is installed by
// components/MetaPixel.tsx (base code in the root layout).

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export type MetaClientEventName =
  | "CompleteRegistration"
  | "InitiateCheckout"
  | "Purchase"
  | "StartTrial";

/**
 * Fire a browser conversion event. `eventId` is the dedup key shared
 * with the CAPI twin. Safe to call before fbq finishes loading — the
 * base snippet queues calls until the library arrives — and a no-op
 * during SSR.
 */
export function trackMetaEvent(
  name: MetaClientEventName,
  params?: Record<string, unknown>,
  eventId?: string,
) {
  if (typeof window === "undefined") return;
  window.fbq?.(
    "track",
    name,
    params ?? {},
    eventId ? { eventID: eventId } : undefined,
  );
}

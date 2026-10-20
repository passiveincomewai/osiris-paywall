"use client";

/**
 * Near You strip — the globe-arrival camera suggestions (rules in
 * lib/near-you.ts, location in lib/visitor-geo.ts).
 *
 * Renders one compact row over the globe once the splash has gone:
 * the cameras nearest the visitor's approximate area ("Near you —
 * <city>", distances labelled approximate because the location is
 * city-level), or — when nothing is honestly near — the curated
 * featured set under its own name. Tapping a camera dispatches the
 * shipped first-camera bridge (we:open-camera), so the open goes
 * through findCameraById → handleEntityClick with the free-camera
 * gate and counting unchanged.
 *
 * The X retires the strip on this device permanently (localStorage);
 * it never re-nags. Analytics: near_you_shown:<near|featured> once
 * per kind per mount, near_you_open:<kind> per tap — the mode only,
 * never the place, so the funnel stays measurable without logging
 * where anyone is.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Sparkles, X } from "lucide-react";
import { trackAnalyticsEvent } from "@/components/AnalyticsTracker";
import {
  dispatchOpenCamera,
  parseShowcaseCameras,
  type FirstCamera,
} from "@/lib/onboarding/first-camera";
import {
  dismissNearYou,
  isNearYouDismissed,
  planNearYou,
} from "@/lib/near-you";
import type { CameraCandidate } from "@/lib/nearby-cameras";
import type { VisitorLocation } from "@/lib/visitor-geo";

interface NearYouStripProps {
  /** Globe arrived: splash gone and no camera deep link owns the view. */
  active: boolean;
  location: VisitorLocation | null;
  cameras: CameraCandidate[] | undefined;
  catalogueSettled: boolean;
}

export default function NearYouStrip({ active, location, cameras, catalogueSettled }: NearYouStripProps) {
  // null = device storage not read yet: render nothing rather than
  // flash the strip at a visitor who already retired it.
  const [dismissed, setDismissed] = useState<boolean | null>(null);
  const [showcase, setShowcase] = useState<FirstCamera[]>([]);
  const shownKinds = useRef<Set<string>>(new Set());

  useEffect(() => {
    setDismissed(isNearYouDismissed());
  }, []);

  /* The featured set is fetched lazily, only when the strip is in
     play, and sanitized by the first-camera module's own parser —
     the same curated feed the welcome panel's offer uses. */
  useEffect(() => {
    if (!active || dismissed !== false) return;
    let cancelled = false;
    fetch("/api/cctv/showcase")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!cancelled && json) setShowcase(parseShowcaseCameras(json));
      })
      .catch(() => { /* no featured set — the strip just stays hidden */ });
    return () => { cancelled = true; };
  }, [active, dismissed]);

  const plan = useMemo(
    () => planNearYou({ location, cameras, catalogueSettled, showcase }),
    [location, cameras, catalogueSettled, showcase],
  );

  const visible = active && dismissed === false && (plan.kind === "near" || plan.kind === "featured");

  useEffect(() => {
    if (!visible || (plan.kind !== "near" && plan.kind !== "featured")) return;
    if (shownKinds.current.has(plan.kind)) return;
    shownKinds.current.add(plan.kind);
    trackAnalyticsEvent(`near_you_shown:${plan.kind}`);
  }, [visible, plan]);

  if (!visible || (plan.kind !== "near" && plan.kind !== "featured")) return null;

  const dismiss = () => {
    dismissNearYou();
    setDismissed(true);
  };

  const open = (id: string) => {
    trackAnalyticsEvent(`near_you_open:${plan.kind}`);
    dispatchOpenCamera(id);
  };

  return (
    <div
      data-hud
      className="absolute left-1/2 -translate-x-1/2 bottom-[118px] md:bottom-[84px] z-[320] w-[min(94vw,720px)] pointer-events-auto"
    >
      <section
        aria-label={plan.kind === "near" ? `Cameras near ${plan.areaLabel}` : "Featured cameras"}
        className="rounded-xl border border-[var(--border-primary)] bg-[rgba(10,12,22,0.9)] backdrop-blur-xl px-3 py-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.6)]"
      >
        <div className="flex items-center gap-2 pr-6">
          {plan.kind === "near" ? (
            <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--gold-primary)]" aria-hidden />
          ) : (
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-[var(--gold-primary)]" aria-hidden />
          )}
          <h2 className="font-mono text-[10px] font-bold tracking-[0.22em] text-[var(--text-heading)] uppercase truncate">
            {plan.kind === "near" ? `Near you — ${plan.areaLabel}` : "Featured cameras"}
          </h2>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss camera suggestions"
            className="absolute right-1.5 top-1.5 rounded-full p-1.5 text-white/40 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="mt-2 flex gap-2 overflow-x-auto pb-0.5 styled-scrollbar">
          {plan.items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => open(item.id)}
              className="group shrink-0 max-w-[210px] rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-left transition hover:border-[var(--gold-primary)]/60 hover:bg-white/[0.08] focus:outline-none focus-visible:ring-1 focus-visible:ring-white/60"
            >
              <span className="block truncate text-[11.5px] font-medium leading-snug text-[var(--text-heading)]">
                {item.name}
              </span>
              <span className="mt-0.5 block truncate font-mono text-[9px] tracking-[0.14em] text-[var(--text-muted)] uppercase">
                {plan.kind === "near"
                  ? [item.city, item.distanceLabel].filter(Boolean).join(" · ")
                  : item.city ?? ""}
              </span>
            </button>
          ))}
        </div>

        {plan.kind === "near" && (
          <p className="mt-1.5 text-[9.5px] leading-snug text-[var(--text-muted)]">
            Distances are approximate — measured from your general area, not your exact location.
          </p>
        )}
      </section>
    </div>
  );
}

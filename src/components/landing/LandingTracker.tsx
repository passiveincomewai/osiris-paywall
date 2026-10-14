"use client";

import { useEffect } from "react";
import { trackAnalyticsEvent } from "@/components/AnalyticsTracker";

/**
 * Landing analytics island — the only new event family this page adds.
 *
 * Delegated clicks: any element inside the shell carrying
 * data-landing-event="family:detail" fires `landing_family:detail`
 * through the app's existing trackAnalyticsEvent pipeline (same ingest
 * route, same storage — the events sit alongside pageview/globe_reached
 * in the admin panel). Section views: sections carrying
 * data-landing-view="<name>" fire landing_section_view:<name> once when
 * they first become 20% visible. Scroll depth: shell-relative quartiles
 * fire landing_scroll:<25|50|75|100> once each.
 *
 * Mounted behind the shell's root IoGate, so none of this code is in the
 * homepage's initial JS and nothing fires for a visitor who never
 * approaches the sections.
 */
export default function LandingTracker() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest?.("[data-landing-event]");
      if (!el) return;
      const value = el.getAttribute("data-landing-event");
      if (value) trackAnalyticsEvent(`landing_${value}`);
    };
    document.addEventListener("click", onClick);

    const seen = new Set<string>();
    const io =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(
            (entries) => {
              for (const en of entries) {
                if (!en.isIntersecting) continue;
                const name = (en.target as HTMLElement).dataset.landingView;
                if (name && !seen.has(name)) {
                  seen.add(name);
                  trackAnalyticsEvent(`landing_section_view:${name}`);
                }
              }
            },
            { threshold: 0.2 },
          )
        : null;
    if (io) {
      document
        .querySelectorAll("[data-landing-view]")
        .forEach((el) => io.observe(el));
    }

    const shell = document.querySelector<HTMLElement>(".home-seo-shell");
    const quartiles = new Set<number>();
    const onScroll = () => {
      if (!shell) return;
      const rect = shell.getBoundingClientRect();
      const total = shell.offsetHeight - window.innerHeight;
      if (total <= 0) return;
      const done = Math.min(1, Math.max(0, -rect.top / total));
      for (const q of [25, 50, 75, 100]) {
        if (done * 100 >= q && !quartiles.has(q)) {
          quartiles.add(q);
          trackAnalyticsEvent(`landing_scroll:${q}`);
        }
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("scroll", onScroll);
      io?.disconnect();
    };
  }, []);

  return null;
}

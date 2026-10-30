"use client";

/**
 * Email capture at the highest-intent free moments (rules live in
 * lib/newsletter/capture.ts): right after a device's first camera open
 * (placement "camera", a small card docked bottom-left — under the
 * viewer's z-index, never over the feed), inside the checkout-cancel
 * recovery strip on /pricing (placement "pricing", inline variant),
 * and as a static end-of-content section on reading pages (placement
 * "page": blog posts, comparisons, camera directories, tool pages).
 *
 * The timed asks (camera/pricing) fire once per device, ever:
 * subscribing or dismissing writes a local record that retires them.
 * The page placement is page furniture like the footer form — it
 * always renders and has no dismiss — but a subscribe through it
 * writes the same record, retiring the timed asks. No modal, no
 * pre-ticked anything, and the form is the site's existing
 * NewsletterForm posting to the subscribe endpoint, which validates
 * the address instantly — subscribing takes effect on the spot,
 * no confirmation email.
 */

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import NewsletterForm from "./NewsletterForm";
import { trackAnalyticsEvent } from "./AnalyticsTracker";
import { getCameraClickCount } from "@/lib/cameraGate";
import {
  CAPTURE_IMPRESSION_EVENT,
  CAPTURE_SUBSCRIBE_EVENT,
  browserStorage,
  captureDetailFor,
  captureSourceFor,
  readCaptureRecord,
  shouldShowCameraCapture,
  shouldShowPricingCapture,
  writeCaptureRecord,
  type CapturePlacement,
} from "@/lib/newsletter/capture";

const COPY: Record<CapturePlacement, { heading: string; body: string }> = {
  camera: {
    heading: "One email when the sky does something big",
    body: "Rocket launches, storms overhead and new camera drops — plus major WorldEye news. Rare, and no spam, ever.",
  },
  pricing: {
    heading: "Not ready to decide?",
    body: "Get one email when something big happens — launches, storms, new camera drops. No spam.",
  },
  page: {
    heading: "One email when the sky does something big",
    body: "Rocket launches, storms overhead and new camera drops — plus major WorldEye news. Rare, and no spam, ever.",
  },
};

export default function EmailCaptureCard({
  placement,
  variant = "card",
}: {
  placement: CapturePlacement;
  variant?: "card" | "inline";
}) {
  // Timed placements start at null (storage not read yet — render
  // nothing rather than flash the ask at devices that already answered
  // it). The page placement is static page furniture: it renders
  // immediately, server-side included, like the footer form does.
  const [visible, setVisible] = useState<boolean | null>(() =>
    placement === "page" ? true : null,
  );
  const impressionFired = useRef(false);
  const sectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (placement === "page") {
      // A static section only earns an "impression" when it actually
      // reaches the viewport — fire once, when it first scrolls in.
      const el = sectionRef.current;
      const fire = () => {
        if (impressionFired.current) return;
        impressionFired.current = true;
        trackAnalyticsEvent(CAPTURE_IMPRESSION_EVENT, captureDetailFor(placement));
      };
      if (!el || typeof IntersectionObserver === "undefined") {
        fire();
        return;
      }
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            fire();
            observer.disconnect();
          }
        },
        { threshold: 0.25 },
      );
      observer.observe(el);
      return () => observer.disconnect();
    }
    const record = readCaptureRecord(browserStorage());
    const show =
      placement === "camera"
        ? shouldShowCameraCapture(record, getCameraClickCount())
        : shouldShowPricingCapture(record);
    setVisible(show);
    if (show && !impressionFired.current) {
      impressionFired.current = true;
      trackAnalyticsEvent(CAPTURE_IMPRESSION_EVENT, captureDetailFor(placement));
    }
  }, [placement]);

  if (!visible) return null;

  const dismiss = () => {
    writeCaptureRecord(browserStorage(), "dismissed");
    setVisible(false);
  };

  const subscribed = () => {
    writeCaptureRecord(browserStorage(), "subscribed");
    trackAnalyticsEvent(CAPTURE_SUBSCRIBE_EVENT, captureDetailFor(placement));
    // Stay mounted: NewsletterForm swaps itself to its success
    // message ("You're subscribed…") — that message IS the feedback.
  };

  const copy = COPY[placement];

  if (placement === "page") {
    return (
      <section
        ref={sectionRef}
        aria-label="Email updates"
        className="relative rounded-3xl border border-white/12 bg-white/[0.03] p-6 md:p-8"
      >
        <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">
          {copy.heading}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-white/55">{copy.body}</p>
        <div className="mt-4 max-w-md">
          <NewsletterForm source={captureSourceFor(placement)} onSuccess={subscribed} />
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-white/35">
          Instant subscribe — no confirmation email. We check the address as you type it in.
        </p>
      </section>
    );
  }

  const inner = (
    <>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute right-1.5 top-1.5 rounded-full p-2 text-white/40 transition hover:bg-white/10 hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
      <h3 className="pr-8 text-sm font-bold tracking-tight text-white">{copy.heading}</h3>
      <p className="mt-1 text-xs leading-relaxed text-white/55">{copy.body}</p>
      <div className="mt-3">
        <NewsletterForm source={captureSourceFor(placement)} compact onSuccess={subscribed} />
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-white/35">
        Instant subscribe — no confirmation email. We check the address as you type it in.
      </p>
    </>
  );

  if (variant === "inline") {
    return (
      <section aria-label="Email updates" className="relative">
        {inner}
      </section>
    );
  }

  return (
    <section
      aria-label="Email updates"
      className="fixed bottom-[4.5rem] left-4 z-[350] w-[calc(100%-2rem)] max-w-xs rounded-2xl border border-white/15 bg-[#0a0a12]/95 p-4 shadow-2xl shadow-black/50 backdrop-blur md:bottom-6"
    >
      <div className="relative">{inner}</div>
    </section>
  );
}

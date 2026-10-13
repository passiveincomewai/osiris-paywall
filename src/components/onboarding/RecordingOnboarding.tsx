"use client";

/**
 * §3 — First-visit guide for the Camera Recording Studio (/recording).
 *
 * Mounted once from the recording layout. Shows the 3-step recording
 * micro-tutorial the first time a visitor arrives — never on
 * /recording/live itself (a live wall / active recording must never be
 * interrupted; if the visitor navigates there while the card is up, the
 * card closes and still counts as seen).
 */

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { assignGroup, loadState, maybeResetOnboarding, saveState } from "@/lib/onboarding/storage";
import { emitFeatureFirstUse } from "@/lib/onboarding/events";
import { MICROS } from "@/lib/onboarding/steps";
import { OnbStyles } from "./shared";
import MicroCard from "./MicroCard";

export default function RecordingOnboarding() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const isMobile =
    typeof window !== "undefined" ? window.matchMedia("(max-width: 768px)").matches : false;
  const shownRef = useRef(false);

  useEffect(() => {
    maybeResetOnboarding();
    assignGroup(); // keep the visitor's group assignment consistent across surfaces
    const state = loadState();
    if (state.micros.includes("recording")) return;
    if (!state.features.includes("recording")) {
      emitFeatureFirstUse("recording");
      saveState({ ...state, features: [...state.features, "recording"] });
    }
    if (pathname?.startsWith("/recording/live")) return;
    const t = window.setTimeout(() => {
      shownRef.current = true;
      setShow(true);
    }, 1400);
    return () => window.clearTimeout(t);
    // Run once on first mount of the recording surface.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Navigating to the live wall closes the card without a fight.
  useEffect(() => {
    if (show && pathname?.startsWith("/recording/live")) {
      setShow(false);
      markSeen();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, show]);

  const markSeen = () => {
    const state = loadState();
    if (!state.micros.includes("recording")) {
      saveState({ ...state, micros: [...state.micros, "recording"] });
    }
  };

  if (!show) return null;
  return (
    <>
      <OnbStyles />
      <MicroCard
        micro={MICROS.recording}
        isMobile={isMobile}
        onDone={() => {
          markSeen();
          setShow(false);
        }}
      />
    </>
  );
}

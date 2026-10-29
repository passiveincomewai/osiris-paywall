"use client";

/**
 * OnboardingRoot — the client orchestrator for WorldEye onboarding.
 *
 * Mounted lazily (next/dynamic, ssr:false) from the homepage with a small
 * set of primitive props describing live app state (globe readiness,
 * which camera is open, the active-layer signature, which panel is open).
 * It owns:
 *   §1 welcome panel (group B only, after globe-ready + real engagement)
 *   §2 the 4-step tour, completed ONLY by real app signals
 *   §3 contextual micro-tutorials (first-use, persisted, queued if busy)
 *   §4 the conversion card (cadence in lib/onboarding/storage.ts)
 *   §5 the persistent help button + panel (all groups)
 *   §8 A/B assignment (persisted localStorage + cookie via storage.ts)
 *
 * Signals come from props (camera, layers, panels — all driven by the
 * page's real state) plus two window CustomEvents dispatched by fenced
 * one-liners in OsirisMap (we:flight-selected, we:satellite-selected)
 * and the app's existing analytics events are NOT re-fired here — feature
 * first-use goes out through lib/onboarding/events.ts on the same path.
 */

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  assignGroup,
  conversionEligible,
  loadState,
  maybeResetOnboarding,
  saveState,
  type OnbGroup,
  type OnbState,
} from "@/lib/onboarding/storage";
import {
  emitOnboarding,
  emitStepComplete,
  emitStepSkip,
  emitDropoff,
  emitFeatureFirstUse,
  ONB_EVENT,
  type FeatureId,
} from "@/lib/onboarding/events";
import {
  CAMERA_STEP_N,
  EVENT_LAYERS,
  MICROS,
  TOUR_STEPS,
  isCameraOpenedSignal,
  layersTurnedOn,
  shouldCompleteCameraStep,
  watchOfferAction,
  CONVERSION_FEATURES,
} from "@/lib/onboarding/steps";
import {
  dispatchOpenCamera,
  fetchFirstCamera,
  firstCameraPlace,
  type FirstCamera,
} from "@/lib/onboarding/first-camera";
import { OnbStyles } from "./shared";
import WelcomePanel from "./WelcomePanel";
import TourOverlay from "./TourOverlay";
import MicroCard from "./MicroCard";
import ConversionCard from "./ConversionCard";
import HelpPanel, { HelpButton } from "./HelpPanel";

type UiMode = "none" | "welcome" | "tour" | "micro" | "conversion" | "help";

/**
 * How long after first engagement the welcome panel appears. This was
 * 3.5s when the tour was designed; the measured session shape (Oct 2026:
 * median ~2s of activity, most sessions over within ~5s) meant most
 * group-B visitors had already left before the panel could appear.
 * 1.2s is still earned by a real interaction — the panel never fires on
 * load alone — it just arrives while the visitor is still here.
 */
const WELCOME_DELAY_MS = 1200;

export interface OnboardingRootProps {
  /** Map loaded + splash lifted: the globe is interactive. */
  globeReady: boolean;
  isMobile: boolean;
  isPremium: boolean;
  /** Non-null while a camera viewer is open (id/name token, transitions matter). */
  cameraId: string | null;
  /** Comma-joined keys of currently-on layers. */
  layersSig: string;
  /** Which panel is open: 'recon' | 'oi' | 'alerts' | 'search' | others | null. */
  panel: string | null;
  /** Camera signup nudge visible — suppress onboarding surfaces meanwhile. */
  signupOpen: boolean;
  /** Reports whether any onboarding surface is currently up, so the
   *  parent can keep sibling prompts (the first-camera prompt) from
   *  stacking on top of it — the same visibility-reporting pattern
   *  TimedTrialPopup already uses. */
  onUiChange?: (active: boolean) => void;
  /** Tour step 3 (the data-layer step) became active or stopped being
   *  active. The parent opens the Layers panel for the step's duration
   *  and highlights a real layer toggle inside it (Item 7, 2026-10-29). */
  onLayersStepActive?: (active: boolean) => void;
}

function OnboardingRootInner({
  globeReady,
  isMobile,
  isPremium,
  cameraId,
  layersSig,
  panel,
  signupOpen,
  onUiChange,
  onLayersStepActive,
}: OnboardingRootProps) {
  const [group, setGroup] = useState<OnbGroup>("a");
  const [onb, setOnb] = useState<OnbState>(() => loadState());
  const [ui, setUi] = useState<UiMode>("none");
  const [tourStep, setTourStep] = useState(1);
  const [tourPhase, setTourPhase] = useState<"waiting" | "success">("waiting");
  const [microId, setMicroId] = useState<string | null>(null);
  const [firstCamera, setFirstCamera] = useState<FirstCamera | null>(null);
  const firstCameraTriedRef = useRef(false);

  const stateRef = useRef(onb);
  stateRef.current = onb;
  const uiRef = useRef(ui);
  uiRef.current = ui;

  /* Surface-visibility reporting for the parent's prompt arbitration. */
  const uiChangeRef = useRef(onUiChange);
  uiChangeRef.current = onUiChange;
  useEffect(() => {
    uiChangeRef.current?.(ui !== "none");
  }, [ui]);
  const stepRef = useRef(tourStep);
  stepRef.current = tourStep;
  const signupRef = useRef(signupOpen);
  signupRef.current = signupOpen;
  const pendingMicroRef = useRef<string | null>(null);
  const advanceTimer = useRef<number | null>(null);

  const isTouch = useMemo(
    () =>
      isMobile ||
      (typeof window !== "undefined" &&
        ("ontouchstart" in window || (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0))),
    [isMobile],
  );

  const update = useCallback((mut: (s: OnbState) => OnbState) => {
    setOnb((prev) => {
      const next = mut({ ...prev, features: [...prev.features], micros: [...prev.micros] });
      saveState(next);
      return next;
    });
  }, []);

  /* ── Boot: reset hook, A/B assignment, persisted state ── */
  useEffect(() => {
    maybeResetOnboarding();
    setGroup(assignGroup());
    setOnb(loadState());
  }, []);

  /* ── Feature first-use recording (both groups — it is the A/B yardstick) ── */
  const recordFeature = useCallback(
    (f: FeatureId) => {
      if (stateRef.current.features.includes(f)) return;
      emitFeatureFirstUse(f);
      update((s) => ({ ...s, features: [...s.features, f] }));
    },
    [update],
  );

  /* ── Micro-tutorials: show, queue, flush ── */
  const showMicro = useCallback(
    (id: string) => {
      if (!MICROS[id]) return;
      if (!stateRef.current.micros.includes(id)) {
        update((s) => ({ ...s, micros: [...s.micros, id] }));
      }
      setMicroId(id);
      setUi("micro");
    },
    [update],
  );

  const maybeMicro = useCallback(
    (id: string) => {
      if (group === "a") return; // control group: no proactive UI at all
      if (uiRef.current === "tour") return;
      if (stateRef.current.micros.includes(id)) return;
      if (uiRef.current !== "none" || signupRef.current) {
        pendingMicroRef.current = id;
        return;
      }
      showMicro(id);
    },
    [group, showMicro],
  );

  useEffect(() => {
    if (ui !== "none") return;
    const pending = pendingMicroRef.current;
    if (pending && !stateRef.current.micros.includes(pending)) {
      pendingMicroRef.current = null;
      const t = window.setTimeout(() => showMicro(pending), 350);
      return () => window.clearTimeout(t);
    }
    pendingMicroRef.current = null;
  }, [ui, showMicro]);

  /* ── First-camera offer: lazily fetch the featured camera the welcome
     panel and the tour's camera step can open in one tap. Fetched at most
     once per mount, only when a surface that can offer it is about to
     show; any failure simply leaves those surfaces as they were. ── */
  const ensureFirstCamera = useCallback(() => {
    if (firstCameraTriedRef.current) return;
    firstCameraTriedRef.current = true;
    void fetchFirstCamera().then((cam) => {
      if (cam) setFirstCamera(cam);
    });
  }, []);

  const watchCamera = useCallback(() => {
    if (!firstCamera) return;
    emitOnboarding(ONB_EVENT.watchCamera);
    dispatchOpenCamera(firstCamera.id);
    if (watchOfferAction(uiRef.current === "welcome" ? "welcome" : "tour") === "enter-tour-at-camera-step") {
      // The welcome panel presents itself as the tutorial, so watching
      // the featured camera must not end it (the old behaviour persisted
      // welcome "done" here and closed every onboarding surface at the
      // click). Hand off into the tour at the camera step instead: the
      // camera already opening completes that step through the ordinary
      // camera-opened signal, and the tour carries on to the layers step.
      update((s) => ({
        ...s,
        welcome: s.welcome === "done" ? "done" : "tour",
        tourStep: CAMERA_STEP_N,
      }));
      setTourStep(CAMERA_STEP_N);
      setTourPhase("waiting");
      setUi("tour");
    }
    // In the tour, nothing else to do here: the camera-opened signal
    // completes the camera step through the ordinary path.
  }, [firstCamera, update]);

  /* ── Tour control ── */
  const clearAdvance = () => {
    if (advanceTimer.current) {
      window.clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }
  };

  const startTour = useCallback(() => {
    clearAdvance();
    ensureFirstCamera();
    emitOnboarding(ONB_EVENT.start);
    update((s) => ({ ...s, welcome: s.welcome === "done" ? "done" : "tour", tourStep: 1 }));
    setTourStep(1);
    setTourPhase("waiting");
    setUi("tour");
  }, [update, ensureFirstCamera]);

  const exitTour = useCallback(() => {
    clearAdvance();
    emitDropoff(stepRef.current);
    update((s) => ({ ...s, welcome: s.welcome === "tour" ? "dismissed" : s.welcome }));
    setTourPhase("waiting");
    setUi("none");
  }, [update]);

  const succeedStep = useCallback(() => {
    const n = stepRef.current;
    setTourPhase((phase) => {
      if (phase === "success") return phase;
      emitStepComplete(n);
      advanceTimer.current = window.setTimeout(() => {
        setTourStep(n + 1);
        setTourPhase("waiting");
        update((s) => ({ ...s, tourStep: n + 1 }));
      }, 950);
      return "success";
    });
  }, [update]);

  const skipStep = useCallback(() => {
    clearAdvance();
    const n = stepRef.current;
    emitStepSkip(n);
    setTourPhase("waiting");
    if (n < TOUR_STEPS.length) {
      setTourStep(n + 1);
      update((s) => ({ ...s, tourStep: n + 1 }));
    }
  }, [update]);

  const backStep = useCallback(() => {
    clearAdvance();
    setTourPhase("waiting");
    setTourStep((n) => Math.max(1, n - 1));
  }, []);

  const nextInfoStep = useCallback(() => {
    const n = stepRef.current;
    emitStepComplete(n);
    setTourPhase("waiting");
    if (n < TOUR_STEPS.length) {
      setTourStep(n + 1);
      update((s) => ({ ...s, tourStep: n + 1 }));
    }
  }, [update]);

  const finishTour = useCallback(
    (explore: boolean) => {
      clearAdvance();
      emitOnboarding(ONB_EVENT.complete);
      update((s) => ({ ...s, welcome: "done", tourStep: TOUR_STEPS.length }));
      setUi("none");
      if (!explore) {
        window.location.href = "/pricing";
      }
    },
    [update],
  );

  /* ── §1 Welcome: group B, globe ready, ~1.2s of real engagement ──
     Engagement is timestamped whenever it happens — including while the
     visitor scrolls the intro before the globe finishes loading — and
     the panel appears once BOTH conditions hold: globe interactive AND
     WELCOME_DELAY_MS elapsed since first engagement. Listeners exist only while a
     welcome is still pending, and are removed the moment it resolves. */
  const engagedAtRef = useRef(0);
  const globeReadyRef = useRef(globeReady);
  globeReadyRef.current = globeReady;
  useEffect(() => {
    if (group !== "b" || onb.welcome !== "pending") return;
    let timer: number | null = null;
    const show = () => {
      ensureFirstCamera();
      emitOnboarding(ONB_EVENT.impression);
      setUi("welcome");
    };
    const schedule = () => {
      if (timer !== null || !engagedAtRef.current) return;
      const wait = Math.min(WELCOME_DELAY_MS, Math.max(400, WELCOME_DELAY_MS - (Date.now() - engagedAtRef.current)));
      timer = window.setTimeout(() => {
        timer = null;
        if (globeReadyRef.current && uiRef.current === "none" && stateRef.current.welcome === "pending") {
          show();
        }
        // If the globe wasn't ready yet, the effect re-runs on the
        // globeReady flip and schedules again with the same timestamp.
      }, wait);
    };
    const onEngage = () => {
      if (!engagedAtRef.current) engagedAtRef.current = Date.now();
      schedule();
    };
    const opts: AddEventListenerOptions = { passive: true };
    window.addEventListener("pointerdown", onEngage, opts);
    window.addEventListener("wheel", onEngage, opts);
    window.addEventListener("touchstart", onEngage, opts);
    window.addEventListener("keydown", onEngage);
    // If the visitor already scrolled deep into the intro before this
    // lazy chunk mounted, that scroll WAS the engagement — start the
    // clock from now rather than missing it entirely.
    if (!engagedAtRef.current && window.scrollY > 120) {
      engagedAtRef.current = Date.now();
    }
    schedule();
    return () => {
      if (timer) window.clearTimeout(timer);
      window.removeEventListener("pointerdown", onEngage);
      window.removeEventListener("wheel", onEngage);
      window.removeEventListener("touchstart", onEngage);
      window.removeEventListener("keydown", onEngage);
    };
  }, [globeReady, group, onb.welcome, ui, ensureFirstCamera]);

  const dismissWelcome = useCallback(() => {
    emitOnboarding(ONB_EVENT.dismiss);
    update((s) => ({ ...s, welcome: "dismissed" }));
    setUi("none");
  }, [update]);

  /* ── Signal: camera opened ── */
  const prevCameraRef = useRef<string | null>(null);
  useEffect(() => {
    const prev = prevCameraRef.current;
    prevCameraRef.current = cameraId;
    if (isCameraOpenedSignal(prev, cameraId)) {
      recordFeature("camera");
      if (!shouldCompleteCameraStep(uiRef.current === "tour", stepRef.current, cameraId)) {
        maybeMicro("camera");
      }
    }
    if (shouldCompleteCameraStep(uiRef.current === "tour", stepRef.current, cameraId)) {
      succeedStep();
    }
  }, [cameraId, recordFeature, succeedStep, maybeMicro]);

  /* Arriving at the camera step with a camera already open completes it
     too — the real action already happened (a camera opened during the
     globe step, or the welcome hand-off's camera landing as the step is
     entered). succeedStep's phase guard keeps repeat calls idempotent. */
  useEffect(() => {
    if (shouldCompleteCameraStep(ui === "tour", tourStep, cameraId)) succeedStep();
  }, [ui, tourStep, cameraId, succeedStep]);

  /* ── Tour step 3 (data layer): tell the parent while it is the active
     step, so it can open the Layers panel and spotlight a real toggle.
     The step still completes only through the layers-toggled signal
     below — opening the panel is presentation, not completion. ── */
  const layersStepCbRef = useRef(onLayersStepActive);
  layersStepCbRef.current = onLayersStepActive;
  const layersStepWasActiveRef = useRef(false);
  useEffect(() => {
    const active = ui === "tour" && tourStep === 3;
    if (active !== layersStepWasActiveRef.current) {
      layersStepWasActiveRef.current = active;
      layersStepCbRef.current?.(active);
    }
  }, [ui, tourStep]);

  /* ── Signal: layers toggled ── */
  const prevLayersRef = useRef<string | null>(null);
  useEffect(() => {
    const prev = prevLayersRef.current;
    prevLayersRef.current = layersSig;
    if (prev === null || prev === layersSig) return;
    const turnedOn = layersTurnedOn(prev, layersSig);
    if (turnedOn.length === 0) return;
    recordFeature("layer");
    if (
      uiRef.current === "tour" &&
      stepRef.current === 3 &&
      turnedOn.some((k) => (EVENT_LAYERS as readonly string[]).includes(k))
    ) {
      succeedStep();
    }
  }, [layersSig, recordFeature, succeedStep]);

  /* ── Signals: flight / satellite selected (fenced OsirisMap dispatches) ──
     No longer a tour step (the 4-step tour dropped entity selection);
     these still record the first-use feature + fire the micro-tutorial
     outside the tour, exactly as before. */
  useEffect(() => {
    const onFlight = () => {
      recordFeature("flight");
      maybeMicro("flight");
    };
    const onSatellite = () => {
      recordFeature("satellite");
      maybeMicro("satellite");
    };
    window.addEventListener("we:flight-selected", onFlight);
    window.addEventListener("we:satellite-selected", onSatellite);
    return () => {
      window.removeEventListener("we:flight-selected", onFlight);
      window.removeEventListener("we:satellite-selected", onSatellite);
    };
  }, [recordFeature, maybeMicro]);

  /* ── Signals: panels opened ── */
  const prevPanelRef = useRef<string | null>(null);
  useEffect(() => {
    const prev = prevPanelRef.current;
    prevPanelRef.current = panel;
    if (!panel || panel === prev) return;
    if (panel === "recon") {
      recordFeature("recon");
      maybeMicro("recon");
    } else if (panel === "oi") {
      recordFeature("oi");
      maybeMicro("oi");
    } else if (panel === "alerts") {
      recordFeature("alerts");
    } else if (panel === "search") {
      recordFeature("search");
    }
  }, [panel, recordFeature, maybeMicro]);

  /* ── Signal: step 1 — real globe interaction ── */
  useEffect(() => {
    if (ui !== "tour" || tourStep !== 1) return;
    const el = document.querySelector("[data-globe-section]");
    if (!el) return;
    let down: { x: number; y: number } | null = null;
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        succeedStep();
      }
    };
    const onDown = (e: PointerEvent) => {
      down = { x: e.clientX, y: e.clientY };
    };
    const onMove = (e: PointerEvent) => {
      if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 10) finish();
    };
    const onWheel = () => finish();
    const onTouchMove = () => finish();
    el.addEventListener("pointerdown", onDown as EventListener, { passive: true });
    el.addEventListener("pointermove", onMove as EventListener, { passive: true });
    el.addEventListener("wheel", onWheel as EventListener, { passive: true });
    el.addEventListener("touchmove", onTouchMove as EventListener, { passive: true });
    return () => {
      el.removeEventListener("pointerdown", onDown as EventListener);
      el.removeEventListener("pointermove", onMove as EventListener);
      el.removeEventListener("wheel", onWheel as EventListener);
      el.removeEventListener("touchmove", onTouchMove as EventListener);
    };
  }, [ui, tourStep, succeedStep]);

  /* ── §4 Conversion: evaluate whenever the stage is clear ── */
  useEffect(() => {
    if (group !== "b" || ui !== "none" || isPremium || cameraId || signupOpen) return;
    const freeCount = onb.features.filter((f) =>
      (CONVERSION_FEATURES as readonly string[]).includes(f),
    ).length;
    if (!conversionEligible(onb, freeCount)) return;
    const t = window.setTimeout(() => {
      if (uiRef.current !== "none") return;
      update((s) => ({ ...s, convShows: s.convShows + 1, convLast: Date.now() }));
      emitOnboarding(ONB_EVENT.conversionShown);
      setUi("conversion");
    }, 1200);
    return () => window.clearTimeout(t);
  }, [group, ui, isPremium, cameraId, signupOpen, onb, update]);

  const conversionPro = useCallback(() => {
    emitOnboarding(ONB_EVENT.conversionClickPro);
    update((s) => ({ ...s, convMuted: true }));
    setUi("none");
    window.location.href = "/pricing";
  }, [update]);

  const conversionDismiss = useCallback(() => {
    emitOnboarding(ONB_EVENT.conversionDismiss);
    setUi("none");
  }, []);

  if (!globeReady) return null;

  const step = TOUR_STEPS[tourStep - 1];

  return (
    <>
      <OnbStyles />
      {ui !== "tour" && ui !== "welcome" && (
        <HelpButton isMobile={isMobile} onClick={() => setUi(ui === "help" ? "none" : "help")} />
      )}
      {ui === "help" && (
        <HelpPanel
          isMobile={isMobile}
          onClose={() => setUi("none")}
          onStartTour={startTour}
          onMicro={(id) => showMicro(id)}
        />
      )}
      {ui === "welcome" && (
        <WelcomePanel
          isMobile={isMobile}
          onTour={startTour}
          onDismiss={dismissWelcome}
          onWatchCamera={firstCamera ? watchCamera : undefined}
          watchLabel={
            firstCamera
              ? `Watch a Live Camera${firstCameraPlace(firstCamera) ? ` — ${firstCameraPlace(firstCamera)}` : ""}`
              : undefined
          }
        />
      )}
      {ui === "tour" && step && (
        <TourOverlay
          step={step}
          phase={tourPhase}
          isMobile={isMobile}
          isTouch={isTouch}
          drawerOpen={!!panel}
          onBack={backStep}
          onNext={nextInfoStep}
          onSkip={skipStep}
          onExit={exitTour}
          onFinish={finishTour}
          onWatchCamera={firstCamera ? watchCamera : undefined}
        />
      )}
      {ui === "micro" && microId && MICROS[microId] && (
        <MicroCard micro={MICROS[microId]} isMobile={isMobile} onDone={() => setUi("none")} />
      )}
      {ui === "conversion" && (
        <ConversionCard isMobile={isMobile} onPro={conversionPro} onDismiss={conversionDismiss} />
      )}
    </>
  );
}

const OnboardingRoot = memo(OnboardingRootInner);
export default OnboardingRoot;

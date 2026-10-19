/**
 * Onboarding content + tour logic (pure data — no DOM, no React).
 *
 * Anchors are resolved at runtime by the overlay against REAL elements:
 *   globe          → [data-globe-section] (the map wrapper; never modified)
 *   layers         → [data-tour="layers"] (LayerPanel root, desktop + mobile),
 *                    falling back to the mobile LAYERS nav button
 *   tools          → the desktop right tool strip buttons (aria-labels),
 *                    falling back to the mobile bottom nav
 *   camera-viewer  → [data-tour="camera-viewer"] (CameraViewer root)
 *
 * A tour step is marked complete ONLY when its real action signal arrives
 * (globe interaction, camera opened, layer activated) or the visitor
 * explicitly skips — see OnboardingRoot for the signal wiring.
 */

export type AnchorId = "globe" | "layers" | "tools" | "camera-viewer";
export type StepAction = "globe-interact" | "camera-open" | "event-layer" | "info";

export interface TourStep {
  n: number;
  title: string;
  body: string;
  bodyTouch: string;
  anchor: AnchorId;
  action: StepAction;
  /** Shown while waiting for the visitor to perform the action. */
  hint: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    n: 1,
    title: "Spin the Globe",
    body: "Drag to rotate the planet, and scroll to zoom in on any place.",
    bodyTouch: "Drag to rotate the planet, and pinch to zoom in on any place.",
    anchor: "globe",
    action: "globe-interact",
    hint: "Try it now — drag the globe.",
  },
  {
    n: 2,
    title: "Open a Live Camera",
    body: "The glowing dots are live cameras — 76,000+ of them, all over the world. Tap one to look through it.",
    bodyTouch: "The glowing dots are live cameras — 76,000+ of them, all over the world. Tap one to look through it.",
    anchor: "layers",
    action: "camera-open",
    hint: "Tap a glowing dot on the globe to open a camera.",
  },
  {
    n: 3,
    title: "Turn On a Data Layer",
    body: "Layers put live data on the globe. Open the layer panel and switch on Weather or Fires to see it appear.",
    bodyTouch: "Layers put live data on the globe. Open LAYERS and switch on Weather or Fires to see it appear.",
    anchor: "layers",
    action: "event-layer",
    hint: "Switch on Weather or Fires in the layer panel.",
  },
  {
    n: 4,
    title: "The Pro Tools",
    body: "OI, the AI analyst, Recon and the locked intel layers are WorldEye Pro. Cameras, layers and live alerts stay free for everyone.",
    bodyTouch: "OI, the AI analyst, Recon and the locked intel layers are WorldEye Pro. Cameras, layers and live alerts stay free for everyone.",
    anchor: "tools",
    action: "info",
    hint: "",
  },
];

/** Layer keys that count as "events" activation for tour step 3 (all off by default). */
export const EVENT_LAYERS = ["weather", "fires", "radiation", "war_alerts"] as const;

/** Features that count toward the conversion moment's "≥3 distinct free features". */
export const CONVERSION_FEATURES = [
  "camera",
  "flight",
  "satellite",
  "layer",
  "recon",
  "alerts",
  "search",
] as const;

/** Parse the comma-joined active-layer signature passed down from the page. */
export function parseLayerSig(sig: string): Set<string> {
  return new Set(sig.split(",").map((s) => s.trim()).filter(Boolean));
}

/** Layers that turned ON between two signatures. */
export function layersTurnedOn(prevSig: string, nextSig: string): string[] {
  const prev = parseLayerSig(prevSig);
  const next = parseLayerSig(nextSig);
  return [...next].filter((k) => !prev.has(k));
}

/* ── Contextual micro-tutorials (§3) ─────────────────────────────────────── */

export interface MicroStep {
  title: string;
  body: string;
}

export interface MicroDef {
  id: string;
  steps: MicroStep[];
}

export const MICROS: Record<string, MicroDef> = {
  camera: {
    id: "camera",
    steps: [
      {
        title: "You're watching a live camera",
        body: "This feed is live from a publicly available camera. Use the controls to refresh the feed, fly the globe to its location, go fullscreen, or save it to My Cameras.",
      },
      {
        title: "Free opens & Pro",
        body: "Free exploring includes a set of camera opens. WorldEye Pro watches cameras without limits — and unlocks the full intelligence toolkit.",
      },
    ],
  },
  flight: {
    id: "flight",
    steps: [
      {
        title: "That's a live aircraft",
        body: "Its card shows the callsign, route, altitude and speed, with links to the full flight record. Positions update in real time as new reports arrive.",
      },
    ],
  },
  satellite: {
    id: "satellite",
    steps: [
      {
        title: "That's a live satellite",
        body: "The panel shows its name, NORAD ID, altitude and orbital period — and the line drawn on the globe is its actual orbit track, from current orbital data.",
      },
    ],
  },
  recon: {
    id: "recon",
    steps: [
      {
        title: "Recon — OSINT on the globe",
        body: "Recon gives you IP lookup, network sweeps and geolocation. Run a lookup and the results land on the globe as scan targets you can fly to.",
      },
    ],
  },
  oi: {
    id: "oi",
    steps: [
      {
        title: "Meet OI, your AI analyst",
        body: "Ask OI to fly you somewhere, brief you on a region, or run a forecast — it works the globe while it answers. OI is part of WorldEye Pro and runs on WorldEye AI; there's nothing to set up.",
      },
    ],
  },
  recording: {
    id: "recording",
    steps: [
      {
        title: "Your own camera wall",
        body: "Save cameras from the globe, watch them together on the Live wall, and record clips of what matters.",
      },
      {
        title: "Private by design",
        body: "Recording happens in your browser: clips are captured on your device and stored in your browser's local storage. Nothing is uploaded, and there is no cloud recording.",
      },
      {
        title: "A WorldEye Pro feature",
        body: "The Recording Studio is part of WorldEye Pro. Please only record feeds you have the right to use, and respect the privacy of people on camera.",
      },
    ],
  },
  navigate: {
    id: "navigate",
    steps: [
      {
        title: "Moving around the globe",
        body: "Drag to rotate, scroll or pinch to zoom. Press R anytime to reset to the global view, and ESC closes panels and popups.",
      },
      {
        title: "Selecting things",
        body: "The dots and icons on the globe are live things — cameras, aircraft, satellites, ships and events. Select any of them to see what it is doing right now.",
      },
    ],
  },
  "cameras-guide": {
    id: "cameras-guide",
    steps: [
      {
        title: "76,000+ live cameras",
        body: "Every glowing dot on the globe is a publicly available live camera — landmarks, cities, traffic, volcanoes and more. Zoom in and the dots multiply.",
      },
      {
        title: "Inside the viewer",
        body: "Open a camera to refresh its feed, fly to its location, go fullscreen, or save it to My Cameras for later.",
      },
    ],
  },
  "tracking-guide": {
    id: "tracking-guide",
    steps: [
      {
        title: "Aircraft in real time",
        body: "Switch on the Flights layer in the layer panel, then select any aircraft for its callsign, route, altitude and speed.",
      },
      {
        title: "Satellites overhead",
        body: "Satellites orbit the globe continuously from live orbital data. Select one to see its name, altitude, period and orbit track.",
      },
    ],
  },
  "layers-guide": {
    id: "layers-guide",
    steps: [
      {
        title: "Layers are your dashboard",
        body: "The layer panel groups everything WorldEye watches — air, sea, cameras, weather, fires, events and more. Toggle groups on and off to build the view you want; your choices are remembered.",
      },
      {
        title: "Premium layers",
        body: "Layers marked with a lock are part of WorldEye Pro. Everything unmarked is free to explore.",
      },
    ],
  },
  "oi-guide": {
    id: "oi-guide",
    steps: [
      {
        title: "OI, the AI analyst",
        body: "OI reads the live globe for you: ask it to fly somewhere, brief a region, watch for changes, or run a forecast. It's part of WorldEye Pro and runs on WorldEye AI — no setup, no keys.",
      },
    ],
  },
  shortcuts: {
    id: "shortcuts",
    steps: [
      {
        title: "Keyboard shortcuts",
        body: "? — show shortcuts · F — fullscreen · S — share view · L — layer panel · M — markets · O — ask OI · I — intel feed · R — reset view · ESC — close panels. Press ? anytime to see the full list on screen.",
      },
    ],
  },
};

/* ── Help panel entries (§5) ─────────────────────────────────────────────── */

export type HelpEntry =
  | { kind: "tour"; label: string }
  | { kind: "micro"; label: string; microId: string }
  | { kind: "link"; label: string; href: string };

export const HELP_ENTRIES: HelpEntry[] = [
  { kind: "tour", label: "Take the Full Tour" },
  { kind: "micro", label: "How to Navigate the Globe", microId: "navigate" },
  { kind: "micro", label: "Live Camera Guide", microId: "cameras-guide" },
  { kind: "micro", label: "Flight & Satellite Tracking", microId: "tracking-guide" },
  { kind: "micro", label: "Intelligence Layers", microId: "layers-guide" },
  { kind: "micro", label: "OI AI Guide", microId: "oi-guide" },
  { kind: "micro", label: "Keyboard Shortcuts", microId: "shortcuts" },
  { kind: "link", label: "Help & FAQ", href: "/faq" },
  { kind: "link", label: "Compare Free vs. Pro", href: "/pricing" },
];

// AI Demo Studio — scene planner (Phase 1: template library).
//
// A prompt becomes a scene plan: an ordered list of steps the recording
// worker executes against the REAL site. Phase 1 ships a small library
// of hand-verified templates; a prompt that matches none is refused at
// creation with an explanation — never silently turned into a generic
// fake. Phase 2 replaces template matching with free-form Cosmo AI
// planning over the same step vocabulary.
//
// Step vocabulary (worker/demo engine):
//   goto        { path }                        open a site path
//   waitGlobe                                   wait until the globe is interactive
//   dismissOverlays                             close toasts/popups that would block the view
//   searchPlace { query, pick }                 open Search & Route, type query, click the result whose label starts with `pick`
//   openCameraNearCenter { maxTries }           click a camera marker/card near the map centre; verify a feed renders; try alternatives
//   closeCamera                                 close the camera viewer
//   enableLayer { layer }                       open Layers & Stats and switch a layer on ("flights")
//   zoomOut     { }                             return to the whole-Earth view
//   hold        { seconds }                     keep the current shot (cinematic beat)

export interface DemoStep {
  action: string;
  [key: string]: unknown;
}

export interface DemoPlan {
  template: string;
  title: string;
  description: string;
  features: string[];
  steps: DemoStep[];
}

interface Template {
  id: string;
  // All of `all` must appear, and at least one of `any` (when given).
  all?: string[];
  any?: string[];
  build: (prompt: string) => DemoPlan;
}

function tokyoPlan(): DemoPlan {
  return {
    template: "tokyo-globe-tour",
    title: "WorldEye in action: Tokyo by globe",
    description:
      "Opens the WorldEye globe, searches for Tokyo, zooms in, opens a live public camera, turns on the flight tracking layer, and zooms back out to Earth.",
    features: ["globe", "search", "cameras", "flights"],
    steps: [
      { action: "goto", path: "/" },
      { action: "waitGlobe" },
      { action: "dismissOverlays" },
      { action: "hold", seconds: 3 },
      { action: "searchPlace", query: "Tokyo", pick: "Tokyo" },
      { action: "hold", seconds: 3 },
      { action: "openCameraNearCenter", maxTries: 5 },
      { action: "hold", seconds: 6 },
      { action: "closeCamera" },
      { action: "enableLayer", layer: "flights" },
      { action: "hold", seconds: 4 },
      { action: "zoomOut" },
      { action: "hold", seconds: 3 },
    ],
  };
}

function liveCamerasPlan(): DemoPlan {
  return {
    template: "live-cameras-tour",
    title: "WorldEye live cameras: a world tour",
    description:
      "Opens the WorldEye globe and opens a live public camera from the featured cameras near the map, showing real feeds only.",
    features: ["globe", "cameras"],
    steps: [
      { action: "goto", path: "/" },
      { action: "waitGlobe" },
      { action: "dismissOverlays" },
      { action: "hold", seconds: 3 },
      { action: "openCameraNearCenter", maxTries: 5 },
      { action: "hold", seconds: 7 },
      { action: "closeCamera" },
      { action: "zoomOut" },
      { action: "hold", seconds: 3 },
    ],
  };
}

const TEMPLATES: Template[] = [
  { id: "tokyo-globe-tour", all: ["tokyo"], build: tokyoPlan },
  { id: "live-cameras-tour", any: ["live camera", "live cameras", "cameras"], build: liveCamerasPlan },
];

export function planForPrompt(prompt: string): DemoPlan | null {
  const text = ` ${prompt.toLowerCase()} `;
  for (const t of TEMPLATES) {
    if (t.all && !t.all.every((k) => text.includes(k))) continue;
    if (t.any && !t.any.some((k) => text.includes(k))) continue;
    return t.build(prompt);
  }
  return null;
}

export const SUPPORTED_STYLES = [
  "cinematic",
  "viral-social",
  "professional",
  "educational",
  "minimalist",
  "enterprise",
  "product-tutorial",
] as const;

export const SUPPORTED_ORIENTATIONS = ["landscape", "portrait", "square"] as const;

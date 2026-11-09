/**
 * WebGL capability probe — classifies what the visitor's browser can
 * actually do BEFORE the globe tries to start, so a browser that cannot
 * run the map engine gets the designed fallback panel (GlFallbackPanel)
 * instead of MapLibre's raw library error thrown into the error
 * boundary ("⚠ MAP ERROR / WebGL2 is required to display this map…"
 * over a black globe — the 2026-11-09 incident).
 *
 * Three classes:
 *  - 'webgl2' — a WebGL2 context can be created. The current engine
 *    (MapLibre 6, WebGL2-only) runs.
 *  - 'webgl1' — only a WebGL1 context. The v6 engine cannot use this
 *    browser; a dual-mode engine (MapLibre 5) can.
 *  - 'none'   — no WebGL at all (GPU blocklisted with no software path,
 *    hardware acceleration fully off, private-mode anti-fingerprinting
 *    that blocks WebGL entirely). No WebGL globe can run here; the
 *    panel is the only honest surface.
 *
 * The probe requests the weakest attributes the map ladder ends on
 * (low-power, no major-performance-caveat refusal, no antialias) so it
 * never reports a browser incapable when a plain context would have
 * been granted. Probe contexts are released immediately via
 * WEBGL_lose_context — browsers cap live WebGL contexts, and the map
 * needs its own.
 */

export type WebGLClass = 'webgl2' | 'webgl1' | 'none';

const PROBE_ATTRIBUTES: WebGLContextAttributes = {
  powerPreference: 'low-power',
  failIfMajorPerformanceCaveat: false,
  antialias: false,
};

type ProbeCanvas = Pick<HTMLCanvasElement, 'getContext'>;

function tryContext(canvas: ProbeCanvas, type: 'webgl2' | 'webgl'): boolean {
  try {
    const ctx = canvas.getContext(type, PROBE_ATTRIBUTES) as
      | (WebGLRenderingContext | WebGL2RenderingContext)
      | null;
    if (!ctx) return false;
    try {
      const lose = ctx.getExtension('WEBGL_lose_context');
      lose?.loseContext();
    } catch {
      /* releasing is best-effort */
    }
    return true;
  } catch {
    return false;
  }
}

let cached: WebGLClass | null = null;

/**
 * Classify this browser. Result is cached for the page lifetime —
 * context availability does not change mid-session. `makeCanvas` is
 * injectable for tests.
 */
export function classifyWebGL(
  makeCanvas: () => ProbeCanvas = () => document.createElement('canvas'),
): WebGLClass {
  if (cached) return cached;
  // A FRESH canvas per context-type attempt: a canvas locks its context
  // mode on the first getContext call, so reusing one canvas for the
  // webgl attempt after a failed webgl2 attempt can return null in
  // browsers where WebGL1 actually exists (probe false negative —
  // Push 3 hardening, 2026-11-09).
  const attempt = (type: 'webgl2' | 'webgl'): boolean => {
    let canvas: ProbeCanvas;
    try {
      canvas = makeCanvas();
    } catch {
      return false;
    }
    return tryContext(canvas, type);
  };
  if (attempt('webgl2')) cached = 'webgl2';
  else if (attempt('webgl')) cached = 'webgl1';
  else cached = 'none';
  return cached;
}

/** Test-only reset for the cached classification. */
export function resetWebGLProbeCache(): void {
  cached = null;
}

/**
 * Test-only override: ?glctx=webgl1 forces the map onto a WebGL1
 * context even on a WebGL2-capable browser, so the WebGL1 behaviour
 * (dual-mode engine rendering, WebGL2-only shader layers skipped) can
 * be verified in a normal browser.
 */
export function glContextOverride(
  search: string | undefined = typeof window !== 'undefined' ? window.location.search : undefined,
): 'webgl1' | null {
  if (!search) return null;
  try {
    return new URLSearchParams(search).get('glctx') === 'webgl1' ? 'webgl1' : null;
  } catch {
    return null;
  }
}

/**
 * Whether WebGL2-only features can run — specifically the custom
 * shader layers (GLSL 300 es + vertex arrays: satellites 3D, live
 * clouds, OI globe). True only when the map will really receive a
 * WebGL2 context: the probe found WebGL2 AND the ?glctx=webgl1 test
 * override is not forcing WebGL1.
 */
export function webgl2Available(
  search: string | undefined = typeof window !== 'undefined' ? window.location.search : undefined,
): boolean {
  if (glContextOverride(search) === 'webgl1') return false;
  return classifyWebGL() === 'webgl2';
}

/**
 * Test/support override: ?glfallback=panel forces the fallback panel
 * regardless of capability, so the panel can be verified in a normal
 * WebGL2 browser (and a user can be talked through it on support).
 */
export function glPanelOverride(
  search: string | undefined = typeof window !== 'undefined' ? window.location.search : undefined,
): boolean {
  if (!search) return false;
  try {
    return new URLSearchParams(search).get('glfallback') === 'panel';
  } catch {
    return false;
  }
}

/**
 * Whether the error thrown by map construction is a WebGL
 * initialization failure (the class the fallback panel exists for), as
 * opposed to a genuine code error that should reach the error boundary.
 * MapLibre 6 throws "WebGL2 is required to display this map…";
 * MapLibre 5 throws "Failed to initialize WebGL".
 */
export function isWebGLInitError(e: unknown): boolean {
  const text = (e instanceof Error ? `${e.name} ${e.message}` : String(e ?? '')).toLowerCase();
  if (!text.includes('webgl')) return false;
  return (
    text.includes('required') ||
    text.includes('initiali') ||
    text.includes('not supported') ||
    text.includes('failed')
  );
}

/**
 * OSIRIS — what a geolocation failure actually means, in words the
 * operator can act on.
 *
 * The navigation banner used to say "navigation needs HTTPS or
 * localhost" for EVERY position failure: the watch's error callback
 * was a no-op, the fix stayed null forever, and the view's only
 * no-fix message blamed the protocol — on the production site, which
 * is HTTPS. A denied permission, a cold GPS and a slow first fix all
 * wore the same wrong explanation, and none of them mentioned the
 * remedy (turn location on for the site, then retry).
 *
 * This module is the one place that classifies a GeolocationPositionError
 * (or the environment itself) into an issue with a title and a remedy.
 * The HTTPS explanation survives ONLY where it is true: when the page
 * itself is not in a secure context, which the classifier is told
 * explicitly — it is never inferred from an error code.
 */

export type GeoIssueKind =
  | 'denied'
  | 'unavailable'
  | 'timeout'
  | 'insecure'
  | 'unsupported'
  | 'unknown';

export interface GeoIssue {
  kind: GeoIssueKind;
  /** One line naming the problem. */
  title: string;
  /** One or two lines: what to do about it. */
  remedy: string;
  /** Whether asking the browser again can plausibly help. Retry is
   *  pointless for the environment problems (insecure / unsupported):
   *  the same call fails the same way until the context changes. */
  retryable: boolean;
}

export interface GeoEnvironment {
  /** `navigator.geolocation` exists at all. */
  hasGeolocation?: boolean;
  /** `window.isSecureContext`. Only an explicit false counts — an
   *  unknown context never earns the HTTPS explanation. */
  secureContext?: boolean;
}

/** The subset of GeolocationPositionError this module reads. */
export interface GeoErrorLike {
  code?: number;
}

// W3C GeolocationPositionError codes.
const PERMISSION_DENIED = 1;
const POSITION_UNAVAILABLE = 2;
const TIMEOUT = 3;

const ISSUES: Record<GeoIssueKind, GeoIssue> = {
  denied: {
    kind: 'denied',
    title: 'Location is off for this site',
    remedy:
      'Turn location on for worldeye.app in your browser’s site settings — on iPhone, Settings → Privacy & Security → Location Services → Safari Websites — then tap Try again.',
    retryable: true,
  },
  unavailable: {
    kind: 'unavailable',
    title: 'Your position isn’t available right now',
    remedy:
      'Your device couldn’t find itself — the GPS may still be warming up, or buildings are blocking it. Head toward open sky and tap Try again.',
    retryable: true,
  },
  timeout: {
    kind: 'timeout',
    title: 'Position is taking a long time',
    remedy:
      'Your device hasn’t produced a fix yet. Tap Try again — guidance picks up on its own as soon as a fix lands.',
    retryable: true,
  },
  insecure: {
    kind: 'insecure',
    title: 'Location needs a secure connection',
    remedy:
      'Browsers only share your position on secure pages. Open worldeye.app over HTTPS (or localhost) and try again.',
    retryable: false,
  },
  unsupported: {
    kind: 'unsupported',
    title: 'This browser can’t share your location',
    remedy:
      'Live navigation needs a browser with geolocation. You can still preview the route from its start point.',
    retryable: false,
  },
  unknown: {
    kind: 'unknown',
    title: 'Location isn’t available',
    remedy: 'Something interrupted the position feed. Tap Try again.',
    retryable: true,
  },
};

/**
 * Classify a geolocation failure. Environment problems outrank error
 * codes: on an insecure page or a browser without geolocation, the
 * error code (when the call is even allowed to fail with one) is a
 * symptom, not the cause.
 */
export function classifyGeoError(
  err: GeoErrorLike | null | undefined,
  env: GeoEnvironment = {},
): GeoIssue {
  if (env.hasGeolocation === false) return ISSUES.unsupported;
  if (env.secureContext === false) return ISSUES.insecure;
  switch (err?.code) {
    case PERMISSION_DENIED:
      return ISSUES.denied;
    case POSITION_UNAVAILABLE:
      return ISSUES.unavailable;
    case TIMEOUT:
      return ISSUES.timeout;
    default:
      return ISSUES.unknown;
  }
}

/**
 * The environment half of the classification, for callers about to
 * start a watch: returns the issue that makes the call pointless, or
 * null when the browser deserves the chance to answer for itself.
 */
export function geoEnvironmentIssue(env: GeoEnvironment): GeoIssue | null {
  if (env.hasGeolocation === false) return ISSUES.unsupported;
  if (env.secureContext === false) return ISSUES.insecure;
  return null;
}

/** Read the live environment (browser only; SSR gets the benefit of the doubt). */
export function currentGeoEnvironment(): GeoEnvironment {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return {};
  return {
    hasGeolocation: Boolean(navigator.geolocation),
    secureContext: window.isSecureContext,
  };
}

/** The position-source surface requestCurrentPosition drives. */
export interface GeolocationLike {
  getCurrentPosition: Geolocation['getCurrentPosition'];
}

export type CurrentPositionResult =
  | { ok: true; lat: number; lng: number }
  | { ok: false; issue: GeoIssue };

/**
 * One position fix, honestly reported — the single-shot counterpart of
 * the navigation watch, for the directions panel's "Use my location".
 * The caller gets coordinates, or the classified issue to show. A
 * failure is NEVER silently downgraded to a coarser location behind
 * the caller's back: denied means denied, and the origin stays
 * untouched until a real fix lands.
 */
export function requestCurrentPosition(
  geo: GeolocationLike | null | undefined,
  env: GeoEnvironment = currentGeoEnvironment(),
): Promise<CurrentPositionResult> {
  if (!geo) {
    return Promise.resolve({
      ok: false,
      issue: classifyGeoError(null, { ...env, hasGeolocation: false }),
    });
  }
  const envIssue = geoEnvironmentIssue(env);
  if (envIssue) return Promise.resolve({ ok: false, issue: envIssue });
  return new Promise((resolve) => {
    try {
      geo.getCurrentPosition(
        (pos) => resolve({ ok: true, lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => resolve({ ok: false, issue: classifyGeoError(err, env) }),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
      );
    } catch {
      resolve({ ok: false, issue: classifyGeoError(null, env) });
    }
  });
}

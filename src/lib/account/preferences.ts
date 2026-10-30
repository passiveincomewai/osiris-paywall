// ── User preferences: the one store (UserPreference row) ────────────
// Every account-settings control persists here and is honored by its
// feature. Users who never opened settings have no row — getPreferences
// returns the same defaults the Prisma schema declares, so consumers
// never branch on "row missing".

import { db } from "@/lib/db";
import { sanitizeSidebarToolIds } from "@/lib/sidebar-tools";

export const UNITS = ["imperial", "metric"] as const;
export const CLOCK_FORMATS = ["12", "24"] as const;
export const MAP_STYLES = ["standard", "tactical-dark", "night-vision"] as const;
export const GRID_DENSITIES = ["comfortable", "compact"] as const;
export const ALERT_CHANNELS = ["email", "push", "both", "none"] as const;
export const RECORDING_QUALITIES = ["efficient", "balanced", "high"] as const;
export const SHARE_VISIBILITIES = ["public", "unlisted"] as const;

export interface Preferences {
  homeLabel: string | null;
  homeLat: number | null;
  homeLng: number | null;
  defaultLayers: string[];
  units: string;
  timezone: string | null;
  clockFormat: string;
  defaultMapStyle: string;
  performanceMode: boolean;
  showStatusTicker: boolean;
  cameraGridDensity: string;
  cameraPreviewRefreshSeconds: number;
  cameraAutoplay: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  cameraAlertChannel: string;
  eventAlertChannel: string;
  recordingClipSeconds: number;
  recordingQuality: string;
  emailTrialReminders: boolean;
  emailWeeklyDigest: boolean;
  emailProductNews: boolean;
  emailAffiliateUpdates: boolean;
  digestEnabled: boolean;
  digestRegions: string[];
  publicProfile: boolean;
  shareVisibility: string;
  billingEmail: string | null;
  sidebarToolOrder: string[];
  sidebarToolHidden: string[];
}

export const PREFERENCE_DEFAULTS: Preferences = {
  homeLabel: null,
  homeLat: null,
  homeLng: null,
  defaultLayers: [],
  units: "imperial",
  timezone: null,
  clockFormat: "12",
  defaultMapStyle: "standard",
  performanceMode: false,
  showStatusTicker: false,
  cameraGridDensity: "comfortable",
  cameraPreviewRefreshSeconds: 30,
  cameraAutoplay: true,
  quietHoursEnabled: false,
  quietHoursStart: "22:00",
  quietHoursEnd: "07:00",
  cameraAlertChannel: "email",
  eventAlertChannel: "email",
  recordingClipSeconds: 60,
  recordingQuality: "balanced",
  emailTrialReminders: true,
  emailWeeklyDigest: false,
  emailProductNews: true,
  emailAffiliateUpdates: true,
  digestEnabled: false,
  digestRegions: [],
  publicProfile: true,
  shareVisibility: "public",
  billingEmail: null,
  sidebarToolOrder: [],
  sidebarToolHidden: [],
};

const FIELDS = Object.keys(PREFERENCE_DEFAULTS) as (keyof Preferences)[];

export async function getPreferences(userId: string): Promise<Preferences> {
  const row = await db.userPreference.findUnique({ where: { userId } });
  if (!row) return { ...PREFERENCE_DEFAULTS };
  const out = { ...PREFERENCE_DEFAULTS };
  for (const f of FIELDS) {
    const v = (row as unknown as Record<string, unknown>)[f];
    if (v !== undefined && v !== null) (out as Record<string, unknown>)[f] = v;
    else if (v === null) (out as Record<string, unknown>)[f] = null;
  }
  return out;
}

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate + normalize a partial preferences patch. Returns either the
 * clean data to persist or an error message. Unknown keys are dropped.
 * Recording clip length is clamped to the recording API's own ceiling
 * (the clips endpoint rejects >3600s) — master defines no per-plan clip
 * length, so there is no tighter plan clamp to apply (see REPORT).
 */
export function validatePreferencesPatch(
  input: Record<string, unknown>,
): { data: Partial<Preferences> } | { error: string } {
  const data: Record<string, unknown> = {};
  const str = (v: unknown) => (typeof v === "string" ? v : null);
  const bool = (v: unknown) => (typeof v === "boolean" ? v : null);
  const oneOf = (v: unknown, set: readonly string[]) => {
    const s = str(v);
    return s !== null && set.includes(s) ? s : undefined;
  };

  if ("homeLabel" in input) {
    const s = str(input.homeLabel);
    if (s === null && input.homeLabel !== null) return { error: "Home label must be text." };
    data.homeLabel = s === null ? null : s.slice(0, 80) || null;
  }
  if ("homeLat" in input || "homeLng" in input) {
    const lat = input.homeLat, lng = input.homeLng;
    if (lat === null && lng === null) {
      data.homeLat = null; data.homeLng = null;
    } else if (
      typeof lat === "number" && typeof lng === "number" &&
      lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
    ) {
      data.homeLat = lat; data.homeLng = lng;
    } else {
      return { error: "Home location needs a valid latitude and longitude." };
    }
  }
  if ("defaultLayers" in input) {
    const v = input.defaultLayers;
    if (!Array.isArray(v) || v.some((x) => typeof x !== "string" || x.length > 40) || v.length > 24) {
      return { error: "Default layers must be a list of layer names." };
    }
    data.defaultLayers = [...new Set(v as string[])];
  }
  if ("units" in input) {
    const v = oneOf(input.units, UNITS);
    if (v === undefined) return { error: "Units must be imperial or metric." };
    data.units = v;
  }
  if ("timezone" in input) {
    const s = str(input.timezone);
    if (input.timezone !== null && (s === null || !isValidTimezone(s))) {
      return { error: "Unknown timezone." };
    }
    data.timezone = s || null;
  }
  if ("clockFormat" in input) {
    const v = oneOf(input.clockFormat, CLOCK_FORMATS);
    if (v === undefined) return { error: "Clock format must be 12 or 24." };
    data.clockFormat = v;
  }
  if ("defaultMapStyle" in input) {
    const v = oneOf(input.defaultMapStyle, MAP_STYLES);
    if (v === undefined) return { error: "Unknown map style." };
    data.defaultMapStyle = v;
  }
  if ("performanceMode" in input) {
    const b = bool(input.performanceMode);
    if (b === null) return { error: "Performance mode must be on or off." };
    data.performanceMode = b;
  }
  if ("showStatusTicker" in input) {
    const b = bool(input.showStatusTicker);
    if (b === null) return { error: "Status ticker must be on or off." };
    data.showStatusTicker = b;
  }
  if ("cameraGridDensity" in input) {
    const v = oneOf(input.cameraGridDensity, GRID_DENSITIES);
    if (v === undefined) return { error: "Unknown grid density." };
    data.cameraGridDensity = v;
  }
  if ("cameraPreviewRefreshSeconds" in input) {
    const n = input.cameraPreviewRefreshSeconds;
    if (typeof n !== "number" || !Number.isFinite(n)) return { error: "Preview refresh must be a number of seconds." };
    data.cameraPreviewRefreshSeconds = Math.max(5, Math.min(300, Math.round(n)));
  }
  if ("cameraAutoplay" in input) {
    const b = bool(input.cameraAutoplay);
    if (b === null) return { error: "Autoplay must be on or off." };
    data.cameraAutoplay = b;
  }
  if ("quietHoursEnabled" in input) {
    const b = bool(input.quietHoursEnabled);
    if (b === null) return { error: "Quiet hours must be on or off." };
    data.quietHoursEnabled = b;
  }
  for (const f of ["quietHoursStart", "quietHoursEnd"] as const) {
    if (f in input) {
      const s = str(input[f]);
      if (s === null || !HHMM.test(s)) return { error: "Quiet hours must be HH:MM times." };
      data[f] = s;
    }
  }
  for (const f of ["cameraAlertChannel", "eventAlertChannel"] as const) {
    if (f in input) {
      const v = oneOf(input[f], ALERT_CHANNELS);
      if (v === undefined) return { error: "Alert channel must be email, push, both or none." };
      data[f] = v;
    }
  }
  if ("recordingClipSeconds" in input) {
    const n = input.recordingClipSeconds;
    if (typeof n !== "number" || !Number.isFinite(n)) return { error: "Clip length must be a number of seconds." };
    data.recordingClipSeconds = Math.max(10, Math.min(3600, Math.round(n)));
  }
  if ("recordingQuality" in input) {
    const v = oneOf(input.recordingQuality, RECORDING_QUALITIES);
    if (v === undefined) return { error: "Unknown recording quality." };
    data.recordingQuality = v;
  }
  for (const f of [
    "emailTrialReminders", "emailWeeklyDigest", "emailProductNews",
    "emailAffiliateUpdates", "digestEnabled", "publicProfile",
  ] as const) {
    if (f in input) {
      const b = bool(input[f]);
      if (b === null) return { error: `${f} must be on or off.` };
      data[f] = b;
    }
  }
  if ("digestRegions" in input) {
    const v = input.digestRegions;
    if (!Array.isArray(v) || v.some((x) => typeof x !== "string" || x.length > 60) || v.length > 20) {
      return { error: "Digest regions must be a list of region names." };
    }
    data.digestRegions = [...new Set((v as string[]).map((s) => s.trim()).filter(Boolean))];
  }
  if ("shareVisibility" in input) {
    const v = oneOf(input.shareVisibility, SHARE_VISIBILITIES);
    if (v === undefined) return { error: "Share visibility must be public or unlisted." };
    data.shareVisibility = v;
  }
  for (const f of ["sidebarToolOrder", "sidebarToolHidden"] as const) {
    if (f in input) {
      const v = input[f];
      if (!Array.isArray(v)) return { error: "Sidebar tools must be a list." };
      if (v.length > 16) return { error: "Sidebar tools list is too long." };
      // Unknown ids / duplicates are dropped, never fatal: a stale
      // client (or a tool renamed since) must not fail the whole save.
      data[f] = sanitizeSidebarToolIds(v);
    }
  }
  if ("billingEmail" in input) {
    const s = str(input.billingEmail);
    if (input.billingEmail !== null && (s === null || !EMAIL_RE.test(s))) {
      return { error: "Billing email must be a valid email address." };
    }
    data.billingEmail = s || null;
  }
  return { data: data as Partial<Preferences> };
}

export async function updatePreferences(
  userId: string,
  patch: Record<string, unknown>,
): Promise<{ preferences: Preferences } | { error: string }> {
  const validated = validatePreferencesPatch(patch);
  if ("error" in validated) return validated;
  if (Object.keys(validated.data).length === 0) return { error: "Nothing to update." };
  await db.userPreference.upsert({
    where: { userId },
    create: { userId, ...(validated.data as object) },
    update: validated.data as object,
  });
  return { preferences: await getPreferences(userId) };
}

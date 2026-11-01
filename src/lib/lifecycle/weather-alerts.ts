// ── Severe-weather alerts for followed places (2026-11, R2 pick R8) ─
// The non-ski generalisation of the storm-watch machinery: the places
// a user follows here are the cameras they SAVED (SavedCamera rows
// carry the camera's lat/lng in cameraData). For each distinct saved
// location inside NWS coverage (the US), the runner reads the active
// National Weather Service alerts for that point and emails the owner
// when a Severe or Extreme warning covers a place they saved.
//
// Honesty + discipline: only official NWS alert objects are relayed
// (event/headline/area/expiry verbatim), the source is named, and the
// bar is Severe/Extreme only — no watches, no advisories, no modelled
// weather. One aggregated email per user per run; once per (user, NWS
// alert id) via LifecycleEmailLog; marketing guards (excluded,
// opt-out, 48h cap) exactly as the lifecycle engine applies them.

import { db } from "../db";
import { sendEmail } from "../email";
import { appBaseUrl } from "../app-url";
import { isExcludedEmail, MARKETING_CAP_WINDOW_MS } from "./config";
import { buildUnsubscribeUrl, unsubscribeSecret } from "./unsubscribe";
import { weatherAlertEmail } from "./templates";

export const WEATHER_ALERT_TEMPLATE = "weather_alert";
const NWS_ALERTS = "https://api.weather.gov/alerts/active";
const FETCH_UA = "WorldEye-WeatherAlerts/1.0 (worldeye.app)";
const SEVERE_ENOUGH = new Set(["Severe", "Extreme"]);
const MAX_LOCATIONS_PER_RUN = 300;

/** US-ish bounds for NWS coverage (CONUS + AK + HI + PR/Guam edges). */
export function inNwsCoverage(lat: number, lng: number): boolean {
  return lat >= 15 && lat <= 72 && lng >= -172 && lng <= -60;
}

/** Coordinates out of a SavedCamera.cameraData snapshot, defensively. */
export function cameraCoords(cameraData: unknown): { lat: number; lng: number } | null {
  if (typeof cameraData !== "object" || cameraData === null) return null;
  const d = cameraData as Record<string, unknown>;
  const lat = typeof d.lat === "number" ? d.lat : typeof d.latitude === "number" ? d.latitude : null;
  const lng =
    typeof d.lng === "number" ? d.lng
    : typeof d.lon === "number" ? d.lon
    : typeof d.longitude === "number" ? d.longitude
    : null;
  if (lat === null || lng === null) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

export interface NwsAlert {
  id: string;
  event: string;
  headline: string;
  areaDesc: string;
  severity: string;
  expiresLabel: string | null;
}

/** Pure: the Severe/Extreme, actually-in-effect alerts from an NWS
 * /alerts/active response. */
export function selectNwsAlerts(payload: unknown): NwsAlert[] {
  const features = (payload as { features?: unknown[] })?.features ?? [];
  const out: NwsAlert[] = [];
  for (const f of features) {
    const props = (f as { properties?: Record<string, unknown> })?.properties;
    if (!props) continue;
    if (props.status !== "Actual" || props.messageType === "Cancel") continue;
    const severity = typeof props.severity === "string" ? props.severity : "";
    if (!SEVERE_ENOUGH.has(severity)) continue;
    const id = typeof props.id === "string" ? props.id : null;
    const event = typeof props.event === "string" ? props.event : null;
    if (!id || !event) continue;
    const expiresRaw = typeof props.expires === "string" ? props.expires : typeof props.ends === "string" ? props.ends : null;
    const expires = expiresRaw ? new Date(expiresRaw) : null;
    out.push({
      id,
      event,
      headline: typeof props.headline === "string" ? props.headline : event,
      areaDesc: typeof props.areaDesc === "string" ? props.areaDesc : "",
      severity,
      expiresLabel:
        expires && Number.isFinite(expires.getTime())
          ? expires.toLocaleString("en-US", { timeZone: "UTC", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) + " UTC"
          : null,
    });
  }
  return out;
}

async function fetchNwsAlerts(lat: number, lng: number): Promise<NwsAlert[]> {
  const res = await fetch(`${NWS_ALERTS}?point=${lat},${lng}`, {
    headers: { "User-Agent": FETCH_UA, Accept: "application/geo+json" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`NWS → ${res.status}`);
  return selectNwsAlerts(await res.json());
}

export interface WeatherAlertsSummary {
  users: number;
  locations: number;
  sent: number;
  skipped: Record<string, number>;
}

export async function runWeatherAlerts(
  opts: { now?: Date; fetchAlerts?: (lat: number, lng: number) => Promise<NwsAlert[]> } = {},
): Promise<WeatherAlertsSummary> {
  const now = opts.now ?? new Date();
  const fetchAlerts = opts.fetchAlerts ?? fetchNwsAlerts;
  const summary: WeatherAlertsSummary = { users: 0, locations: 0, sent: 0, skipped: {} };
  const skip = (reason: string) => {
    summary.skipped[reason] = (summary.skipped[reason] ?? 0) + 1;
  };

  // Group saved cameras into user → distinct rounded locations.
  interface Place { lat: number; lng: number; names: string[] }
  const byUser = new Map<string, Map<string, Place>>();
  const rows = await db.savedCamera.findMany({
    select: { userId: true, name: true, cameraData: true },
    take: 10000,
  });
  for (const row of rows) {
    const coords = cameraCoords(row.cameraData);
    if (!coords || !inNwsCoverage(coords.lat, coords.lng)) continue;
    const key = `${coords.lat.toFixed(2)},${coords.lng.toFixed(2)}`;
    let places = byUser.get(row.userId);
    if (!places) {
      places = new Map();
      byUser.set(row.userId, places);
    }
    const place = places.get(key) ?? { lat: coords.lat, lng: coords.lng, names: [] };
    if (!place.names.includes(row.name)) place.names.push(row.name);
    places.set(key, place);
  }
  summary.users = byUser.size;

  // One fetch per distinct location across ALL users.
  const alertCache = new Map<string, Promise<NwsAlert[]>>();
  const alertsFor = (place: Place): Promise<NwsAlert[]> => {
    const key = `${place.lat.toFixed(2)},${place.lng.toFixed(2)}`;
    let pending = alertCache.get(key);
    if (!pending) {
      pending = fetchAlerts(place.lat, place.lng).catch(() => []);
      alertCache.set(key, pending);
    }
    return pending;
  };

  const capSince = new Date(now.getTime() - MARKETING_CAP_WINDOW_MS);
  let locationsFetched = 0;

  for (const [userId, places] of byUser) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, emailOptOut: true },
    });
    if (!user?.email) {
      skip("no_email");
      continue;
    }
    if (isExcludedEmail(user.email)) {
      skip("excluded");
      continue;
    }
    if (user.emailOptOut) {
      skip("opted_out");
      continue;
    }
    const recentMarketing = await db.lifecycleEmailLog.findFirst({
      where: { userId: user.id, createdAt: { gt: capSince } },
      select: { id: true },
    });
    if (recentMarketing) {
      skip("cap_48h");
      continue;
    }

    // Gather this user's NEW alerts across their places.
    const fresh: (NwsAlert & { placeNames: string[] })[] = [];
    const seenAlertIds = new Set<string>();
    for (const place of places.values()) {
      if (locationsFetched >= MAX_LOCATIONS_PER_RUN && !alertCache.has(`${place.lat.toFixed(2)},${place.lng.toFixed(2)}`)) {
        skip("location_budget");
        continue;
      }
      const alerts = await alertsFor(place);
      locationsFetched++;
      for (const alert of alerts) {
        if (seenAlertIds.has(alert.id)) {
          const existing = fresh.find((a) => a.id === alert.id);
          if (existing) {
            for (const n of place.names) {
              if (!existing.placeNames.includes(n)) existing.placeNames.push(n);
            }
          }
          continue;
        }
        seenAlertIds.add(alert.id);
        const already = await db.lifecycleEmailLog.findUnique({
          where: {
            userId_template_contextKey: {
              userId: user.id,
              template: WEATHER_ALERT_TEMPLATE,
              contextKey: alert.id,
            },
          },
          select: { id: true },
        });
        if (already) continue;
        fresh.push({ ...alert, placeNames: [...place.names] });
      }
    }
    if (fresh.length === 0) {
      skip("no_new_alerts");
      continue;
    }

    const secret = unsubscribeSecret();
    const rendered = weatherAlertEmail({
      name: user.name,
      alerts: fresh.slice(0, 3).map((a) => ({
        event: a.event,
        headline: a.headline,
        areaDesc: a.areaDesc,
        expiresLabel: a.expiresLabel,
        placeNames: a.placeNames,
      })),
      unsubscribeUrl: secret ? buildUnsubscribeUrl(appBaseUrl(), user.id, secret) : null,
    });
    const ok = await sendEmail(user.email, rendered.subject, rendered.html);
    if (!ok) {
      skip("send_failed");
      continue;
    }
    for (const a of fresh) {
      await db.lifecycleEmailLog.create({
        data: { userId: user.id, recipientEmail: user.email, template: WEATHER_ALERT_TEMPLATE, contextKey: a.id, kind: "marketing", subject: rendered.subject, status: "sent" },
      });
    }
    summary.sent++;
  }
  summary.locations = alertCache.size;
  return summary;
}

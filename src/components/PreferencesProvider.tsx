"use client";

// ── PreferencesProvider (account settings items 6–12 client wiring) ─
// Loads the signed-in user's preferences once and:
//   * exposes them via usePreferences() to any client surface;
//   * seeds the localStorage keys other systems already read
//     (we_basemap_mode for the globe's day/night basemap; we_map_style
//     for the theme system; we_home_location + we_default_layers for
//     the homepage globe defaults; we_camera_view for camera grids);
//   * flags performance mode on <html data-performance-mode> + the
//     we_performance_mode key so animation-heavy systems can back off.
// Anonymous visitors get pure defaults — nothing is fetched or stored.

import { createContext, useContext, useEffect, useState } from "react";
import type { Preferences } from "@/lib/account/preferences";
import { PREFERENCE_DEFAULTS } from "@/lib/account/preferences";

const Ctx = createContext<Preferences>(PREFERENCE_DEFAULTS);

export function usePreferences(): Preferences {
  return useContext(Ctx);
}

export const LS_KEYS = {
  mapStyle: "we_map_style",
  homeLocation: "we_home_location",
  defaultLayers: "we_default_layers",
  cameraView: "we_camera_view",
  performanceMode: "we_performance_mode",
  units: "we_units",
} as const;

export function applyPreferenceSideEffects(p: Preferences): void {
  try {
    localStorage.setItem(LS_KEYS.mapStyle, p.defaultMapStyle);
    localStorage.setItem(LS_KEYS.units, p.units);
    localStorage.setItem(LS_KEYS.performanceMode, p.performanceMode ? "1" : "0");
    if (p.homeLat !== null && p.homeLng !== null) {
      localStorage.setItem(
        LS_KEYS.homeLocation,
        JSON.stringify({ lat: p.homeLat, lng: p.homeLng, label: p.homeLabel }),
      );
    } else {
      localStorage.removeItem(LS_KEYS.homeLocation);
    }
    localStorage.setItem(LS_KEYS.defaultLayers, JSON.stringify(p.defaultLayers));
    localStorage.setItem(
      LS_KEYS.cameraView,
      JSON.stringify({
        density: p.cameraGridDensity,
        refreshSeconds: p.cameraPreviewRefreshSeconds,
        autoplay: p.cameraAutoplay,
      }),
    );
    document.documentElement.dataset.performanceMode = p.performanceMode ? "on" : "off";
    document.documentElement.dataset.units = p.units;
  } catch {
    // Storage unavailable (private mode) — preferences still apply via context.
  }
}

export default function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<Preferences>(PREFERENCE_DEFAULTS);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const s = await fetch("/api/auth/session", { cache: "no-store" });
        const session = s.ok ? await s.json() : null;
        if (!session?.user?.id) return;
        const r = await fetch("/api/account/preferences", { cache: "no-store" });
        if (!r.ok) return;
        const d = await r.json();
        if (live && d.preferences) {
          setPrefs(d.preferences as Preferences);
          applyPreferenceSideEffects(d.preferences as Preferences);
          // The homepage globe listens for this to honour home
          // location + default layers on a first-ever load, before
          // its own mount effect could see the localStorage seed.
          window.dispatchEvent(new CustomEvent("we:preferences-loaded", { detail: d.preferences }));
        }
      } catch {
        // Preferences are an enhancement; defaults stand on any failure.
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  return <Ctx.Provider value={prefs}>{children}</Ctx.Provider>;
}

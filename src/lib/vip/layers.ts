/**
 * The globe's layer catalogue (pure data — safe for client bundles).
 *
 * Keys are the globe's own `layers` URL keys (src/app/page.tsx
 * activeLayers state). A key the globe no longer knows is dropped at
 * save time rather than stored as dead weight in every future restore.
 */
export const KNOWN_LAYERS: Record<string, string> = {
  flights: "Flights",
  private: "Private aviation",
  jets: "Business jets",
  military: "Military aviation",
  maritime: "Ships (AIS)",
  satellites: "Satellites",
  sat_comms: "Comms satellites",
  sat_military: "Military satellites",
  sat_navigation: "Navigation satellites",
  sat_earth: "Earth-observation satellites",
  sat_science: "Science satellites",
  space_missions: "Space missions",
  street_level: "Street level",
  balloons: "Balloons",
  cctv: "Live cameras",
  cctv_previews: "Camera previews",
  alert_cams: "Alert cameras",
  live_news: "Live news",
  earthquakes: "Earthquakes",
  fires: "Wildfires",
  fire_perimeters: "Fire perimeters",
  weather: "Weather",
  hurricanes: "Hurricanes",
  river_gauges: "River gauges",
  transit: "Transit",
  gbfs: "Bike share",
  traffic: "Traffic",
  traffic_vehicles: "Traffic vehicles",
  traffic_congestion: "Traffic congestion",
  radiation: "Radiation",
  infrastructure: "Infrastructure",
  global_incidents: "Global incidents",
  alert_pins: "Alert pins",
  war_alerts: "War alerts",
  day_night: "Day / night",
  cables: "Subsea cables",
  sdk_sea: "Sea (SDK)",
  sdk_air: "Air (SDK)",
  sdk_naval: "Naval (SDK)",
  live_clouds: "Live clouds",
  noaa_radar: "NOAA radar",
  lightning: "Lightning",
  terrain_3d: "3D terrain",
  terrain_elevation: "Terrain elevation",
  malware: "Malware",
  cyber_attacks: "Cyber attacks",
  gdelt_events: "GDELT events",
  cf_outages: "Internet outages",
  cf_attacks: "Internet attacks",
};

export function isKnownLayer(key: string): boolean {
  return Object.prototype.hasOwnProperty.call(KNOWN_LAYERS, key);
}

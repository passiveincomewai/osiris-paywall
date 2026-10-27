'use client';

import { Fragment, memo, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plane, Satellite, Sun, Camera, Cctv,
  CloudLightning, Ship, Network, Database, Ghost,
  Flame, Tv, Radio, Mountain, Anchor, SlidersHorizontal, Lock, Bus, Crown,
  Snowflake, ChevronDown, ChevronRight, X, Layers, Car, TramFront, Building2,
  TriangleAlert, Radiation, Palette
} from 'lucide-react';
import StyleStudio from './StyleStudio';
import TrialPicker from './TrialPicker';
import ProUpgradeEmbed from './ProUpgradeEmbed';

import { TERRAIN_MIN_ZOOM, type TerrainStatus } from '@/lib/map-terrain';
import { SENSOR_EFFECT_OPTIONS, sensorModeNeedsAccount, type SensorEffectState } from '@/lib/sensor-effects';
import { readSessionIdentity, type SessionIdentityState } from '@/lib/premium-entitlement';
import AccountGatePrompt from './AccountGatePrompt';

interface LayerPanelProps {
  data: any;
  activeLayers: any;
  setActiveLayers: React.Dispatch<React.SetStateAction<any>>;
  isMobile?: boolean;
  theme?: 'core' | 'ghost';
  setTheme?: (theme: 'core' | 'ghost') => void;
  /** Server-side capabilities, e.g. { cloudflare: true }. Layers declaring a
   *  `requires` key stay hidden until the matching capability is present. */
  capabilities?: Record<string, boolean>;
  terrainStatus?: TerrainStatus;
  onTerrainRetry?: () => void;
  onTerrainFocus?: () => void;
  on3DModeSelected?: () => void;
  /** False while the splash is up; the rail slides in when it turns true. */
  revealed?: boolean;
  /** True when the viewer holds an active Weekly Pass. Premium layers render
   *  with a lock instead of toggling; clicking one opens the trial picker. */
  isPremiumUser?: boolean;
  /** Simulated sensor-effect state (DISPLAY group) — owned by the page,
   *  applied by OsirisMap to the map canvas only. */
  sensorEffect?: SensorEffectState;
  onSensorEffectChange?: (next: SensorEffectState) => void;
  /** Closes the host container (the mobile drawer). Desktop ignores it —
   *  the sheet has its own open state and collapses back to the pill. */
  onClose?: () => void;
}

interface LayerDef {
  key: string;
  label: string;
  dataKey: string;
  description?: string;
  /** Reads a bucket out of data.category_counts instead of a top-level array. */
  catKey?: string;
  /** Capability that must be configured server-side for this layer to appear. */
  requires?: string;
  /** Key of the layer this one modifies. Renders indented beneath it, and reads
   *  as inert while that parent is off — it has nothing to act on. */
  parent?: string;
  /** Premium (Weekly Pass) layer. Free users see a lock and an upgrade prompt
   *  instead of the toggle. Must match the PREMIUM_API_PREFIXES split in
   *  src/middleware.ts — the API is the real gate, this is just the UI. */
  premium?: boolean;
}

interface LayerGroupDef {
  label: string;
  fullLabel: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  layers: LayerDef[];
}

export const LAYER_GROUPS: LayerGroupDef[] = [
  {
    label: 'SDK',
    fullLabel: 'OSIRIS SDK',
    icon: Network,
    layers: [
      { key: 'sdk_sea', label: 'Maritime Lines', dataKey: 'sdk_entities', premium: true },
      { key: 'live_clouds', label: 'Live Clouds', description: 'NOAA satellites · lit in 3D · hourly', dataKey: '' },
      { key: 'noaa_radar', label: 'NOAA Radar', description: 'NOAA nowCOAST · NEXRAD mosaic · ~5 min', dataKey: '' },
      { key: 'lightning', label: 'Lightning Density', description: 'NOAA nowCOAST · LDN strike density', dataKey: '' },
    ],
  },
  {
    label: 'AVIATION',
    fullLabel: 'AVIATION',
    icon: Plane,
    layers: [
      { key: 'flights', label: 'Commercial', dataKey: 'commercial_flights' },
      { key: 'private', label: 'Private', dataKey: 'private_flights' },
      { key: 'jets', label: 'Private Jets', dataKey: 'private_jets' },
      { key: 'military', label: 'Military', dataKey: 'military_flights' },
      { key: 'drones', label: 'Drone Tracking', description: 'Live Remote ID drones from connected receivers', dataKey: 'drones' },
      { key: 'drone_airspace', label: 'FAA Airspace', description: 'LAANC grid ceilings + UAS restrictions (FAA)', dataKey: 'drone-airspace', parent: 'drones' },
    ],
  },
  {
    label: 'MARITIME',
    fullLabel: 'MARITIME',
    icon: Ship,
    layers: [
      { key: 'maritime', label: 'Maritime / Naval', dataKey: 'maritime_ships,maritime_ports,maritime_chokepoints', premium: true },
    ],
  },
  {
    label: 'SPACE',
    fullLabel: 'SPACE TRACKING',
    icon: Satellite,
    layers: [
      { key: 'satellites', label: 'All Satellites', dataKey: 'satellites' },
      { key: 'sat_comms', label: 'Starlink / Comms', dataKey: 'satellites', catKey: 'comms' },
      { key: 'sat_military', label: 'Military / Intel', dataKey: 'satellites', catKey: 'military' },
      { key: 'sat_navigation', label: 'GPS / Navigation', dataKey: 'satellites', catKey: 'navigation' },
      { key: 'sat_earth', label: 'Earth Observation', dataKey: 'satellites', catKey: 'earth_obs' },
      { key: 'sat_science', label: 'Stations / Telescopes', dataKey: 'satellites', catKey: 'science' },
      { key: 'space_missions', label: 'Space Missions', description: 'Rocket launches & pads · Launch Library 2 · The Space Devs', dataKey: '' },
    ],
  },
  {
    label: 'SURVEIL',
    fullLabel: 'SURVEILLANCE',
    icon: Camera,
    layers: [
      { key: 'cctv', label: 'CCTV Cameras', dataKey: 'cameras' },
      { key: 'cctv_previews', label: 'Live Previews', dataKey: '', parent: 'cctv' },
      { key: 'alert_cams', label: 'ALERT Fire Cameras', description: 'ALERTCalifornia · ALERTWest · live images', dataKey: '' },
      { key: 'street_level', label: 'Street Level', description: 'Community street-level photos · Panoramax · dated imagery, never live · street zoom', dataKey: '' },
      { key: 'live_news', label: 'Live News Feeds', dataKey: 'live_feeds', premium: true },
    ],
  },
  {
    label: 'HAZARD',
    fullLabel: 'NATURAL HAZARDS',
    icon: CloudLightning,
    layers: [
      { key: 'earthquakes', label: 'Earthquakes', dataKey: 'earthquakes' },
      { key: 'fires', label: 'Active Fires', dataKey: 'fires' },
      { key: 'fire_perimeters', label: 'Fire Perimeters', description: 'NIFC WFIGS · ~5 min', dataKey: 'fire_perimeters' },
      { key: 'weather', label: 'Severe Weather', dataKey: 'weather_events' },
      { key: 'hurricanes', label: 'Hurricanes', description: 'NOAA NHC · tracks & forecast cones', dataKey: 'hurricanes' },
      { key: 'river_gauges', label: 'Rivers & Floods', description: 'USGS · real-time stream gauges', dataKey: '' },
    ],
  },
  {
    label: 'WINTER',
    fullLabel: 'WINTER & ROADS',
    icon: Snowflake,
    layers: [
      { key: 'plows', label: 'Snow Plows', description: 'Iowa DOT · live plow AVL · ~2 min', dataKey: 'plows' },
    ],
  },
  /* The intel groups (THREATS & INTEL, NETWORK INTEL, NET & EVENT INTEL)
     are GONE from this panel on the owner's order (2026-10-20), replaced
     in their slot by the Pro upgrade embed below. Only the panel section
     was removed — the features, their APIs and the middleware gate all
     remain, and the same intel stays reachable from the IntelFeed tab,
     the OSINT toolkit and the cyber-threat-map page. One consequence to
     know: global_incidents defaults ON in the page state, so GDELT
     incidents still render — they just have no panel toggle any more. */
  {
    label: 'TRANSIT',
    fullLabel: 'TRANSIT & MOBILITY',
    icon: Bus,
    layers: [
      { key: 'transit', label: 'Live Transit', description: 'Live buses, trains & ferries · Salt Lake City · Seattle · Denver · Boston · Austin · Minneapolis–St. Paul · Toronto area · Netherlands · Norway · Queensland', dataKey: '' },
      { key: 'gbfs', label: 'Bike & Scooter Share', description: 'GBFS · systems worldwide', dataKey: '' },
      { key: 'traffic', label: 'Traffic', description: 'Simulated vehicles on real roads · congestion overlay · city zoom', dataKey: '', premium: true },
      { key: 'traffic_vehicles', label: 'Simulated Vehicles', dataKey: '', parent: 'traffic', premium: true },
      { key: 'traffic_congestion', label: 'Congestion Overlay', dataKey: '', parent: 'traffic', premium: true },
    ],
  },
  {
    label: 'DISPLAY',
    fullLabel: 'DISPLAY',
    icon: Sun,
    layers: [
      { key: 'day_night', label: 'Day / Night Cycle', dataKey: '' },
      { key: 'terrain_3d', label: '3D Buildings', description: 'City detail · zoom 14.5+', dataKey: '' },
      { key: 'terrain_elevation', label: '3D Terrain', description: 'Mountains · zoom 10+', dataKey: '' },
    ],
  },
];

/**
 * The premium layers the panel's locks gate, as display labels — top-level
 * layers only (a sub-layer rides its parent's unlock). Derived from
 * LAYER_GROUPS so the Pro upgrade embed pitches exactly what the panel
 * locks, never a second list that could drift from it.
 */
export function premiumLayerLabels(): string[] {
  return LAYER_GROUPS.flatMap((g) =>
    g.layers.filter((l) => l.premium && !l.parent).map((l) => l.label),
  );
}

/**
 * The state a layer's switch DISPLAYS. A sub-layer's stored value is only a
 * preference for when its parent runs: while the parent is off the feature
 * renders nothing, so the switch must read OFF even though the stored value
 * still says on (it comes back untouched when the parent is re-enabled).
 * Deriving it in one place keeps the desktop and mobile rows from drifting
 * apart on this — showing ON for an inert sub-layer reads as "it's running".
 */
export function layerShownActive(layer: Pick<LayerDef, 'key' | 'parent'>, activeLayers: any): boolean {
  if (!activeLayers?.[layer.key]) return false;
  if (layer.parent && !activeLayers[layer.parent]) return false;
  return true;
}

/**
 * A premium layer is locked for everyone who isn't a subscriber: the row
 * shows a lock instead of a switch, and clicking it opens the trial
 * picker (components/TrialPicker) right in the panel. One definition for
 * both panel layouts so desktop and mobile can never disagree about who
 * is locked out.
 */
export function layerLocked(layer: Pick<LayerDef, 'premium'>, isPremiumUser: boolean): boolean {
  return !!layer.premium && !isPremiumUser;
}

/**
 * What a group's ALL / NONE switch may change. Switching a group OFF turns
 * every layer off; switching ON skips layers locked for this viewer — the
 * group switch must not do what the locked row itself refuses to do.
 */
export function groupTogglePatch(
  layers: Pick<LayerDef, 'key' | 'premium'>[],
  activeLayers: any,
  isPremiumUser: boolean,
): Record<string, boolean> {
  const anyOn = layers.some((l) => !!activeLayers?.[l.key]);
  const patch: Record<string, boolean> = {};
  for (const l of layers) {
    if (!anyOn && layerLocked(l, isPremiumUser)) continue;
    patch[l.key] = !anyOn;
  }
  return patch;
}

/* ── Minimal Toggle Switch ── */
/**
 * Presentational only. The row around it is the button, and a button inside a
 * button is invalid HTML — the browser reparents it, which breaks hydration and
 * silently drops the click handler on the inner control.
 */
function ToggleSwitch({ active }: { active: boolean }) {
  return (
    <span
      role="presentation"
      className="relative flex-shrink-0 block"
      style={{ width: 28, height: 14 }}
    >
      <div
        className="absolute inset-0 rounded-full transition-all duration-300"
        style={{
          background: active ? 'rgba(255,255,255,0.2)' : 'transparent',
          border: active ? '1px solid rgba(255,255,255,0.35)' : '1px solid rgba(255,255,255,0.12)',
          boxShadow: active ? '0 0 8px rgba(255,255,255,0.1)' : 'none',
        }}
      />
      <motion.div
        className="absolute top-[2px] rounded-full"
        style={{
          width: 10,
          height: 10,
          background: active ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.2)',
          boxShadow: active ? '0 0 6px rgba(255,255,255,0.4)' : 'none',
        }}
        animate={{ left: active ? 16 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </span>
  );
}

/**
 * The elbow that ties a sub-layer row to the layer above it. Indentation alone
 * reads as a typo at this size; the line is what says "this belongs to that".
 */
function SubLayerStem() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute left-[6px] top-0 h-1/2 w-[8px] rounded-bl-[3px] border-b border-l border-white/[0.14]"
    />
  );
}

/* ── "LAYERS & STATS" presentation (owner's redesign, 2026-10-26) ──────────
   LAYER_GROUPS above stays the data contract — every layer key, premium
   flag and parent link lives there and nowhere else. The categories below
   are presentation only: each names layer KEYS, resolved against
   LAYER_GROUPS, so a category can never invent a layer the map doesn't
   have, and the helpers/tests built on LAYER_GROUPS never see the
   redesign. Categories follow the owner's reference board; two rows are
   adaptations the reference doesn't cover, taken under his "adjust
   accordingly" instruction rather than by dropping features:
   · WINTER & ROADS keeps its own row (it shipped as one, 2026-10-26).
   · OSIRIS SDK keeps its own row — its layers span maritime + weather
     overlays and fit no single board category.
   The old DISPLAY group splits across two board rows: terrain/buildings
   (+ day/night) under 3D ENVIRONMENT, the sensor-effect presets under
   SENSOR EFFECTS. */
const LAYER_BY_KEY = new Map(LAYER_GROUPS.flatMap((g) => g.layers.map((l) => [l.key, l] as const)));

interface PanelCategory {
  id: string;
  title: string;
  /** Short pitch lines under the title, '\n' separated (rendered pre-line). */
  blurb: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  /** Neon accent for the chip, border tint and chevron. */
  accent: string;
  /** Scenic strip cropped from the owner's reference board. CSS gradient
   *  + icon watermark is the fallback for categories the board lacks. */
  thumb?: string;
  thumbGradient: string;
  /** Layer keys into LAYER_GROUPS (kind 'layers'). */
  keys?: string[];
  /** 'sensor' renders the sensor-effect preset block instead of toggles. */
  kind: 'layers' | 'sensor';
}

const PANEL_CATEGORIES: PanelCategory[] = [
  {
    id: 'aviation', title: 'AVIATION', icon: Plane, accent: '#38BDF8',
    blurb: 'Commercial · Private · Military\nDrones · Airspace',
    thumb: '/images/layers/aviation.webp',
    thumbGradient: 'linear-gradient(120deg, #0B2A4A, #123E6E 55%, #B45309)',
    keys: ['flights', 'private', 'jets', 'military', 'drones', 'drone_airspace'],
    kind: 'layers',
  },
  {
    id: 'maritime', title: 'MARITIME / NAVAL', icon: Ship, accent: '#38BDF8',
    blurb: 'Ships · Boats · Ports · AIS',
    thumb: '/images/layers/maritime.webp',
    thumbGradient: 'linear-gradient(120deg, #082238, #0E4A6E 60%, #7C2D12)',
    keys: ['maritime'],
    kind: 'layers',
  },
  {
    id: 'space', title: 'SPACE TRACKING', icon: Satellite, accent: '#38BDF8',
    blurb: 'Satellites · Starlink · Comms\nMissions · Stations',
    thumb: '/images/layers/space.webp',
    thumbGradient: 'linear-gradient(120deg, #060B26, #14315E 60%, #0EA5E9)',
    keys: ['satellites', 'sat_comms', 'sat_military', 'sat_navigation', 'sat_earth', 'sat_science', 'space_missions'],
    kind: 'layers',
  },
  {
    id: 'surveillance', title: 'SURVEILLANCE', icon: Cctv, accent: '#FFB300',
    blurb: 'CCTV · Live Previews · Alert Cameras\nStreet Level · Panoramax',
    thumb: '/images/layers/surveillance.webp',
    thumbGradient: 'linear-gradient(120deg, #2A1A04, #6E4A12 55%, #0F2B46)',
    keys: ['cctv', 'cctv_previews', 'alert_cams', 'street_level'],
    kind: 'layers',
  },
  {
    id: 'news', title: 'LIVE NEWS FEEDS', icon: Radio, accent: '#B388FF',
    blurb: 'Breaking News · Global Events\nLive Streams',
    thumb: '/images/layers/news.webp',
    thumbGradient: 'linear-gradient(120deg, #1D0B36, #4A1470 55%, #7C2D12)',
    keys: ['live_news'],
    kind: 'layers',
  },
  {
    id: 'hazards', title: 'NATURAL HAZARDS', icon: TriangleAlert, accent: '#FF5252',
    blurb: 'Earthquakes · Active Fires · Hurricanes\nSevere Weather · Floods',
    thumb: '/images/layers/hazards.webp',
    thumbGradient: 'linear-gradient(120deg, #2B0B0B, #6E1414 55%, #334155)',
    keys: ['earthquakes', 'fires', 'fire_perimeters', 'weather', 'hurricanes', 'river_gauges'],
    kind: 'layers',
  },
  {
    id: 'traffic', title: 'TRAFFIC', icon: Car, accent: '#00E676',
    blurb: 'Live Traffic · Simulated Vehicles\nCongestion · City Zoom',
    thumb: '/images/layers/traffic.webp',
    thumbGradient: 'linear-gradient(120deg, #06281A, #0E5E3A 55%, #164E63)',
    keys: ['traffic', 'traffic_vehicles', 'traffic_congestion'],
    kind: 'layers',
  },
  {
    id: 'transit', title: 'TRANSIT & MOBILITY', icon: TramFront, accent: '#38BDF8',
    blurb: 'Buses · Trains · Ferries · Bike/Scooter Share\nMajor Cities · Global Transit',
    thumb: '/images/layers/transit.webp',
    thumbGradient: 'linear-gradient(120deg, #0A1E3C, #14406E 55%, #155E75)',
    keys: ['transit', 'gbfs'],
    kind: 'layers',
  },
  {
    id: 'winter', title: 'WINTER & ROADS', icon: Snowflake, accent: '#4DD0E1',
    blurb: 'Snow Plows · Live AVL',
    thumbGradient: 'linear-gradient(120deg, #0A2530, #155E75 55%, #1E40AF)',
    keys: ['plows'],
    kind: 'layers',
  },
  {
    id: 'env3d', title: '3D ENVIRONMENT', icon: Building2, accent: '#B388FF',
    blurb: '3D Buildings · Terrain\nDay / Night Cycle',
    thumb: '/images/layers/env3d.webp',
    thumbGradient: 'linear-gradient(120deg, #1D0B36, #3B1470 55%, #7C2D12)',
    keys: ['terrain_3d', 'terrain_elevation', 'day_night'],
    kind: 'layers',
  },
  {
    id: 'sensor', title: 'SENSOR EFFECTS', icon: SlidersHorizontal, accent: '#2EE6A8',
    blurb: 'Night Vision · Thermal · Monochrome\nHigh Contrast · Simulated',
    thumb: '/images/layers/sensor.webp',
    thumbGradient: 'linear-gradient(120deg, #06281A, #0B5138 55%, #14532D)',
    kind: 'sensor',
  },
  {
    id: 'sdk', title: 'OSIRIS SDK', icon: Network, accent: '#22D3EE',
    blurb: 'Maritime Lines · Live Clouds\nNOAA Radar · Lightning Density',
    thumbGradient: 'linear-gradient(120deg, #08222E, #0E4A5E 55%, #1E3A5F)',
    keys: ['sdk_sea', 'live_clouds', 'noaa_radar', 'lightning'],
    kind: 'layers',
  },
];

function resolveCategoryLayers(cat: PanelCategory): LayerDef[] {
  return (cat.keys ?? [])
    .map((k) => LAYER_BY_KEY.get(k))
    .filter((l): l is LayerDef => !!l);
}

function LayerPanel({ data, activeLayers, setActiveLayers, isMobile, theme = 'core', setTheme, capabilities = {}, terrainStatus = 'idle', onTerrainRetry, onTerrainFocus, on3DModeSelected, revealed = true, isPremiumUser = false, sensorEffect, onSensorEffectChange, onClose }: LayerPanelProps) {
  const [studioOpen, setStudioOpen] = useState(false);
  /** The locked layer whose trial picker is expanded, if any. One at a
   *  time: the picker replaces the old bounce to /premium, so intent is
   *  answered where it showed up. */
  const [trialLayerKey, setTrialLayerKey] = useState<string | null>(null);
  /** Desktop sheet open state. The reference board's default state is the
   *  closed pill ("Layers & Stats"); the sheet opens from it. Mobile has
   *  no pill — the page drawer is the open/close state there. */
  const [sheetOpen, setSheetOpen] = useState(false);
  /** Accordion state. Categories with something live start expanded, so
   *  the board opens onto the viewer's actual setup, not a closed list. */
  const [openCats, setOpenCats] = useState<Set<string>>(() => {
    const init = new Set<string>();
    for (const cat of PANEL_CATEGORIES) {
      if (cat.kind === 'sensor') {
        if ((sensorEffect?.mode ?? 'off') !== 'off') init.add(cat.id);
        continue;
      }
      if (resolveCategoryLayers(cat).some((l) => !l.parent && activeLayers?.[l.key])) init.add(cat.id);
    }
    return init;
  });
  const toggleCat = (id: string) =>
    setOpenCats((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  const openTrialFor = (layerKey: string) => {
    setTrialLayerKey((cur) => (cur === layerKey ? null : layerKey));
    const cat = PANEL_CATEGORIES.find((c) => (c.keys ?? []).includes(layerKey));
    if (cat) setOpenCats((prev) => new Set(prev).add(cat.id));
  };

  /* Escape unwinds one step at a time: trial picker first, then the
     desktop sheet (the old rail's Escape closed its pinned flyout). */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (trialLayerKey) setTrialLayerKey(null);
      else if (!isMobile) setSheetOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [trialLayerKey, isMobile]);

  const toggle = (key: string) => {
    if ((key === 'terrain_elevation' || key === 'terrain_3d') && !activeLayers[key]) on3DModeSelected?.();
    setActiveLayers((prev: any) => ({ ...prev, [key]: !prev[key] }));
  };
  const terrainDetails = activeLayers.terrain_elevation ? (
    <div className="mt-2 rounded-lg border border-white/10 bg-white/[0.03] p-2.5 text-[10px] text-white/60">
      <p role="status">{terrainStatus === 'idle' ? `Terrain at zoom ${TERRAIN_MIN_ZOOM}+ · zoom in` : terrainStatus === 'waiting' ? 'Terrain starts when you stop moving' : terrainStatus === 'loading' ? 'Loading nearby terrain…' : terrainStatus === 'error' ? 'Terrain unavailable; the map is still usable.' : 'Terrain on'}</p>
      {terrainStatus === 'idle' && <button type="button" onClick={onTerrainFocus} className="mt-2 min-h-8 rounded border border-white/15 px-2 text-[var(--gold-primary)] hover:bg-white/10">Zoom to terrain</button>}
      {terrainStatus === 'error' && <button type="button" onClick={onTerrainRetry} className="mt-2 min-h-8 rounded border border-white/15 px-2 text-[var(--gold-primary)] hover:bg-white/10">Retry terrain</button>}
      <p className="mt-2 text-white/35">Nearby detail only · cached tiles</p>
      <a className="mt-1 inline-block underline underline-offset-2" href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md" target="_blank" rel="noopener noreferrer">Terrain credits</a>
    </div>
  ) : null;

  /* Sensor effects are radio-style presets, not toggles: exactly one look
     at a time (or off). They are SIMULATED visual effects — the copy says
     so here and an on-map tag repeats it while one is active — and they
     apply to the map canvas only, never to camera feeds or panels. */
  /* Wave 2 F15: the exclusive themes (Tactical Dark, Night Vision)
     are free-account features. Identity is read the house way
     (lib/premium-entitlement). The panel fails closed while identity
     is unknown or anonymous — selecting a gated theme shows the
     account prompt instead of applying it; the page separately
     coerces a persisted gated mode off for anonymous viewers. */
  const [gateIdentity, setGateIdentity] = useState<SessionIdentityState>('unknown');
  const [showThemeGate, setShowThemeGate] = useState(false);
  useEffect(() => {
    let live = true;
    readSessionIdentity()
      .then((id) => { if (live) setGateIdentity(id.state); })
      .catch(() => {});
    return () => { live = false; };
  }, []);
  const sensorMode = sensorEffect?.mode ?? 'off';
  const sensorBlock = onSensorEffectChange ? (
    <div className="rounded-lg border border-[#2EE6A8]/20 bg-white/[0.03] p-2.5">
      <div className="text-[9px] font-mono tracking-[0.18em] text-white/35 uppercase mb-1.5">Sensor Effects — Simulated</div>
      <div className="flex flex-col gap-0.5" role="radiogroup" aria-label="Sensor effects (simulated)">
        {SENSOR_EFFECT_OPTIONS.map((opt) => {
          const active = sensorMode === opt.mode;
          return (
            <button
              key={opt.mode}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => {
                if (sensorModeNeedsAccount(opt.mode) && gateIdentity !== 'free' && gateIdentity !== 'premium') {
                  setShowThemeGate(true);
                  return;
                }
                setShowThemeGate(false);
                onSensorEffectChange({ mode: opt.mode, intensity: sensorEffect?.intensity ?? 1 });
              }}
              className={`w-full flex items-center gap-2.5 py-1.5 px-1 rounded-md text-left hover:bg-white/[0.05] transition-colors ${active ? 'text-white/85' : 'text-white/40'}`}
            >
              <span
                aria-hidden
                className="flex-shrink-0 w-[11px] h-[11px] rounded-full border"
                style={{
                  borderColor: active ? 'rgba(0,229,255,0.8)' : 'rgba(255,255,255,0.25)',
                  background: active ? 'rgba(0,229,255,0.85)' : 'transparent',
                  boxShadow: active ? '0 0 6px rgba(0,229,255,0.5)' : 'none',
                }}
              />
              <span className="text-[11px] font-mono uppercase tracking-wider">{opt.label}</span>
              {sensorModeNeedsAccount(opt.mode) && gateIdentity !== 'free' && gateIdentity !== 'premium' && (
                <Lock className="w-3 h-3 ml-auto text-[#D4AF37]/80" aria-label="Free account feature" />
              )}
            </button>
          );
        })}
      </div>
      {showThemeGate && (
        <div className="mt-2">
          <AccountGatePrompt compact feature="map-theme" />
        </div>
      )}
      <p className="mt-1.5 text-[9px] leading-relaxed text-white/35">
        Simulated visual effects — not real sensor data. Applied to the map only; live camera feeds and panels are never filtered.
      </p>
      {sensorMode !== 'off' && (
        <>
          <label className="mt-2 flex items-center gap-2 text-[9px] font-mono uppercase tracking-wider text-white/40">
            Intensity
            <input
              type="range"
              min={0.2}
              max={1}
              step={0.05}
              value={sensorEffect?.intensity ?? 1}
              onChange={(e) => onSensorEffectChange({ mode: sensorMode, intensity: Number(e.target.value) })}
              className="flex-1 accent-cyan-300"
              aria-label="Sensor effect intensity"
            />
          </label>
          <button
            type="button"
            onClick={() => onSensorEffectChange({ mode: 'off', intensity: sensorEffect?.intensity ?? 1 })}
            className="mt-2 min-h-8 rounded border border-white/15 px-2 text-[10px] font-mono text-[var(--gold-primary)] hover:bg-white/10"
          >
            RESET — EFFECT OFF
          </button>
        </>
      )}
    </div>
  ) : null;

  /** Switch a whole category at once — off if any are on, otherwise all on. */
  const toggleGroup = (layers: LayerDef[]) => {
    const patch = groupTogglePatch(layers, activeLayers, isPremiumUser);
    if (patch.terrain_elevation === true || patch.terrain_3d === true) on3DModeSelected?.();
    setActiveLayers((prev: any) => ({ ...prev, ...patch }));
  };

  /* Drop layers whose backing capability is not configured, then drop any
     category left with nothing to show. */
  const visibleCategories = useMemo(
    () =>
      PANEL_CATEGORIES.map((cat) => ({
        ...cat,
        layers: resolveCategoryLayers(cat).filter((l) => !l.requires || capabilities[l.requires]),
      })).filter((cat) => (cat.kind === 'sensor' ? !!sensorBlock : cat.layers.length > 0)),
    [capabilities, sensorBlock],
  );

  const getCount = (dk: string, catKey?: string): number | null => {
    if (!dk) return null;
    if (catKey && data.category_counts) {
      return data.category_counts[catKey] || 0;
    }
    let total = 0;
    let found = false;
    for (const k of dk.split(',')) {
      if (data[k] && Array.isArray(data[k])) {
        total += data[k].length;
        found = true;
      }
    }
    return found ? total : null;
  };

  /** Sum of live records across data arrays, or null until any has loaded —
   *  the quick bar never prints a number it doesn't have. */
  const sumData = (keys: string[]): number | null => {
    let total = 0;
    let found = false;
    for (const k of keys) {
      if (data?.[k] && Array.isArray(data[k])) {
        total += data[k].length;
        found = true;
      }
    }
    return found ? total : null;
  };

  /* ── Shared pieces ── */

  const panelHeader = (
    <div className="flex items-center gap-2.5 px-3.5 pt-3.5 pb-3">
      {/* The owner's eye mark (public/worldeye-eye.png), the same asset the
          header wordmark uses. Plain img: the panel SSRs in tests and the
          old panel never routed images through next/image either. */}
      <img src="/worldeye-eye.png" alt="" width={40} height={40} className="w-10 h-10 object-contain flex-shrink-0" style={{ filter: 'drop-shadow(0 0 8px rgba(56,189,248,0.55))' }} />
      <div className="flex-1 min-w-0 leading-none">
        <div className="text-[17px] font-bold tracking-[0.08em] text-white whitespace-nowrap">
          LAYERS <span className="text-white/60 font-semibold">&</span>{' '}
          <span style={{ background: 'linear-gradient(90deg,#22D3EE,#38BDF8)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>STATS</span>
        </div>
        <div className="mt-1 text-[8.5px] font-mono tracking-[0.28em] text-cyan-200/40 uppercase">Global live board</div>
      </div>
      {(onClose || !isMobile) && (
        <button
          type="button"
          onClick={() => { if (onClose) onClose(); else setSheetOpen(false); }}
          aria-label="Close layers panel"
          title="Close"
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all hover:bg-cyan-300/10 focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-200/50"
          style={{ border: '1px solid rgba(56,189,248,0.45)', boxShadow: '0 0 10px rgba(56,189,248,0.25), inset 0 0 8px rgba(56,189,248,0.12)' }}
        >
          <X className="w-4 h-4 text-cyan-100" />
        </button>
      )}
    </div>
  );

  /* The reference board's quick bar. Same five stats the mobile drawer
     header used to print (AIR = all four flight buckets, SAT, CAM, WX,
     NUC = infrastructure) — now each is also a switch: AIR/SAT flip
     their whole category through the same group patch the category
     headers use, CAM/WX/NUC flip their single layer. A count renders
     only when its data has actually loaded. */
  const aviationCat = visibleCategories.find((c) => c.id === 'aviation');
  const spaceCat = visibleCategories.find((c) => c.id === 'space');
  const quickItems = [
    {
      id: 'AIR', icon: Plane, accent: '#38BDF8',
      count: sumData(['commercial_flights', 'private_flights', 'private_jets', 'military_flights']),
      active: ['flights', 'private', 'jets', 'military', 'drones'].some((k) => !!activeLayers?.[k]),
      label: 'Toggle aviation layers',
      onClick: () => { if (aviationCat) toggleGroup(aviationCat.layers); },
    },
    {
      id: 'SAT', icon: Satellite, accent: '#38BDF8',
      count: sumData(['satellites']),
      active: ['satellites', 'sat_comms', 'sat_military', 'sat_navigation', 'sat_earth', 'sat_science', 'space_missions'].some((k) => !!activeLayers?.[k]),
      label: 'Toggle space tracking layers',
      onClick: () => { if (spaceCat) toggleGroup(spaceCat.layers); },
    },
    {
      id: 'CAM', icon: Camera, accent: '#38BDF8',
      count: sumData(['cameras']),
      active: !!activeLayers?.cctv,
      label: 'Toggle CCTV cameras',
      onClick: () => toggle('cctv'),
    },
    {
      id: 'WX', icon: CloudLightning, accent: '#B388FF',
      count: sumData(['weather_events']),
      active: !!activeLayers?.weather,
      label: 'Toggle severe weather',
      onClick: () => toggle('weather'),
    },
    {
      id: 'NUC', icon: Radiation, accent: '#FFC400',
      count: sumData(['infrastructure']),
      active: !!activeLayers?.infrastructure,
      label: 'Toggle nuclear infrastructure',
      onClick: () => toggle('infrastructure'),
    },
  ];
  const quickBar = (
    <div
      className="mx-3 mb-3 grid grid-cols-5 rounded-xl overflow-hidden"
      style={{
        border: '1px solid rgba(56,189,248,0.35)',
        background: 'linear-gradient(180deg, rgba(8,25,48,0.85), rgba(4,12,26,0.9))',
        boxShadow: '0 0 14px rgba(56,189,248,0.15), inset 0 0 18px rgba(56,189,248,0.05)',
      }}
      role="group"
      aria-label="Quick layer toggles"
    >
      {quickItems.map((q, i) => {
        const QIcon = q.icon;
        return (
          <button
            key={q.id}
            type="button"
            onClick={q.onClick}
            aria-pressed={q.active}
            aria-label={q.label}
            title={q.label}
            className="relative flex flex-col items-center gap-0.5 py-2 transition-colors hover:bg-white/[0.05] focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-200/50"
            style={{
              borderLeft: i > 0 ? '1px solid rgba(56,189,248,0.14)' : undefined,
              background: q.active ? 'rgba(56,189,248,0.10)' : 'transparent',
              boxShadow: q.active ? 'inset 0 0 14px rgba(56,189,248,0.12)' : 'none',
            }}
          >
            <QIcon className="w-[18px] h-[18px]" style={{ color: q.accent, filter: `drop-shadow(0 0 5px ${q.accent}90)` }} />
            <span className="text-[8.5px] font-mono tracking-[0.18em] text-white/55">{q.id}</span>
            {q.count !== null && (
              <span className="absolute top-1 right-1.5 text-[8.5px] font-mono tabular-nums leading-none" style={{ color: q.accent }}>
                {q.count.toLocaleString()}
              </span>
            )}
            <span
              aria-hidden
              className="absolute bottom-1 w-3.5 h-[2px] rounded-full transition-all"
              style={{ background: q.active ? q.accent : 'rgba(255,255,255,0.14)', boxShadow: q.active ? `0 0 6px ${q.accent}` : 'none' }}
            />
          </button>
        );
      })}
    </div>
  );

  const renderLayerRow = (layer: LayerDef) => {
    /* Shown state, not stored state: a sub-layer reads OFF while its
       parent is off (see layerShownActive). The stored value and the
       click handler are untouched. */
    const isLayerActive = layerShownActive(layer, activeLayers);
    const count = getCount(layer.dataKey, layer.catKey);
    const dormant = !!layer.parent && !activeLayers[layer.parent];
    const locked = layerLocked(layer, isPremiumUser);
    return (
      <Fragment key={layer.key}>
        <button
          onClick={() => { if (locked) { openTrialFor(layer.key); } else { toggle(layer.key); } }}
          aria-pressed={isLayerActive}
          aria-expanded={locked ? trialLayerKey === layer.key : undefined}
          aria-label={locked ? `${layer.label} — premium` : layer.label}
          title={locked ? 'Weekly Pass required — start a free trial' : dormant ? 'Turn the layer above on to use this' : undefined}
          className={`relative w-full flex items-center gap-3 py-1.5 rounded-md hover:bg-white/[0.05] transition-colors cursor-pointer text-left focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-200/40 ${layer.parent ? 'pl-[22px] pr-1' : 'px-1'} ${dormant ? 'opacity-40' : ''}`}
        >
          {layer.parent && <SubLayerStem />}
          {locked ? (
            <Lock className="w-3.5 h-3.5 flex-shrink-0 text-[var(--gold-primary)]" />
          ) : (
            <ToggleSwitch active={!!isLayerActive} />
          )}
          <span className={`text-[11px] font-mono uppercase tracking-wider flex-1 transition-colors duration-200 ${isLayerActive ? 'text-white/80' : 'text-white/40'}`}>
            {layer.label}
            {layer.description && <span className="block mt-0.5 text-[9px] normal-case tracking-normal text-white/35">{layer.description}</span>}
          </span>
          {count !== null && (
            <span className={`text-[10px] font-mono tabular-nums transition-colors ${isLayerActive ? 'text-white/45' : 'text-white/20'}`}>
              {count.toLocaleString()}
            </span>
          )}
        </button>
        {locked && trialLayerKey === layer.key && (
          <div className="mb-1 rounded-lg border border-[#D4AF37]/25 bg-black/50 p-2.5">
            <TrialPicker variant="compact" onClose={() => setTrialLayerKey(null)} />
          </div>
        )}
      </Fragment>
    );
  };

  const renderCategory = (cat: (typeof visibleCategories)[number]) => {
    const expanded = openCats.has(cat.id);
    const CatIcon = cat.icon;
    const counted = cat.layers.filter((l) => !l.parent);
    const activeCount = counted.filter((l) => activeLayers[l.key]).length;
    const anyOn = counted.some((l) => !!activeLayers[l.key]);
    return (
      <Fragment key={cat.id}>
        <section
          aria-label={cat.title}
          className="rounded-xl overflow-hidden"
          style={{
            border: `1px solid ${cat.accent}59`,
            background: 'linear-gradient(180deg, rgba(6,16,32,0.88), rgba(3,8,18,0.92))',
            boxShadow: expanded ? `0 0 16px ${cat.accent}26, inset 0 0 22px rgba(0,0,0,0.35)` : `0 0 8px ${cat.accent}14`,
          }}
        >
          <button
            type="button"
            onClick={() => toggleCat(cat.id)}
            aria-expanded={expanded}
            aria-label={`${cat.title}${activeCount ? ` — ${activeCount} active` : ''}`}
            className="relative w-full flex items-center gap-2.5 px-2.5 py-2 text-left overflow-hidden focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-200/50"
          >
            {/* Scenic strip (cropped from the owner's board) fading in from
                the right; categories without a crop keep the gradient. */}
            <span aria-hidden className="absolute inset-0 pointer-events-none" style={{ background: `linear-gradient(90deg, rgba(4,10,22,0.97) 46%, rgba(4,10,22,0.55) 68%, rgba(4,10,22,0.25)), ${cat.thumbGradient}` }} />
            {cat.thumb && (
              <img
                src={cat.thumb}
                alt=""
                aria-hidden
                loading="lazy"
                className="absolute right-0 top-0 h-full w-[52%] object-cover pointer-events-none"
                style={{ maskImage: 'linear-gradient(90deg, transparent, black 42%)', WebkitMaskImage: 'linear-gradient(90deg, transparent, black 42%)', opacity: 0.85 }}
              />
            )}
            <span
              className="relative z-10 w-[42px] h-[42px] rounded-[10px] flex items-center justify-center flex-shrink-0"
              style={{
                border: `1px solid ${cat.accent}80`,
                background: 'rgba(2,8,18,0.72)',
                boxShadow: `0 0 10px ${cat.accent}40, inset 0 0 10px ${cat.accent}1F`,
              }}
            >
              <CatIcon className="w-5 h-5" style={{ color: cat.accent, filter: `drop-shadow(0 0 5px ${cat.accent}B0)` }} />
            </span>
            <span className="relative z-10 flex-1 min-w-0">
              <span className="block text-[12.5px] font-bold tracking-[0.12em] text-white leading-tight" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.9)' }}>
                {cat.title}
              </span>
              <span className="block mt-0.5 text-[9px] leading-snug text-white/55 whitespace-pre-line" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>
                {cat.blurb}
              </span>
            </span>
            {activeCount > 0 && (
              <span
                className="relative z-10 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-[9px] font-mono tabular-nums leading-none flex-shrink-0"
                style={{ background: cat.accent, color: '#04070D', boxShadow: `0 0 7px ${cat.accent}` }}
              >
                {activeCount}
              </span>
            )}
            <span
              className="relative z-10 w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
              style={{ border: `1px solid ${cat.accent}55`, background: 'rgba(2,8,18,0.6)' }}
            >
              <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.22 }} className="flex">
                <ChevronDown className="w-3.5 h-3.5" style={{ color: cat.accent }} />
              </motion.span>
            </span>
          </button>
          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="overflow-hidden"
              >
                <div className="px-2.5 pb-2.5 pt-1" style={{ borderTop: `1px solid ${cat.accent}22` }}>
                  {cat.kind === 'sensor' ? (
                    sensorBlock
                  ) : (
                    <>
                      <div className="flex items-start gap-2.5">
                        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                          {cat.layers.map(renderLayerRow)}
                        </div>
                        {/* Expanded-state preview, as on the reference board. */}
                        <div
                          aria-hidden
                          className="hidden min-[420px]:block w-[104px] flex-shrink-0 rounded-lg overflow-hidden relative"
                          style={{ border: `1px solid ${cat.accent}33`, aspectRatio: '4 / 3', background: cat.thumbGradient }}
                        >
                          {cat.thumb ? (
                            <img src={cat.thumb} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                          ) : (
                            <CatIcon className="absolute inset-0 m-auto w-9 h-9 opacity-40" style={{ color: cat.accent }} />
                          )}
                        </div>
                      </div>
                      <div className="flex justify-end mt-1.5">
                        <button
                          onClick={() => toggleGroup(cat.layers)}
                          className="px-1.5 py-0.5 rounded text-[10px] font-mono tracking-wider text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                        >
                          {anyOn ? 'NONE' : 'ALL'}
                        </button>
                      </div>
                      {cat.id === 'env3d' && terrainDetails}
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
        {/* The Pro upgrade embed sits where the intel groups used to —
            right after Natural Hazards. Free viewers only; Pro users
            have nothing to unlock here. */}
        {cat.id === 'hazards' && !isPremiumUser && (
          <ProUpgradeEmbed premiumLabels={premiumLayerLabels()} />
        )}
      </Fragment>
    );
  };

  const categoriesList = (
    <div className="flex flex-col gap-2 px-3">
      {visibleCategories.map(renderCategory)}
    </div>
  );

  /* Panel utilities that aren't layers: Style Studio (the map's look)
     and Ghost Protocol (the UI theme). Same rows in both layouts. */
  const utilities = (
    <div className="flex flex-col gap-2 px-3 mt-3">
      <button
        type="button"
        onClick={() => { setStudioOpen((o) => !o); if (!isMobile) setSheetOpen(false); }}
        aria-pressed={studioOpen}
        aria-label="Style Studio"
        title="Style Studio"
        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-colors hover:bg-white/[0.04] focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-200/40"
        style={{ border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(4,10,22,0.6)' }}
      >
        <span className="w-[30px] h-[30px] rounded-lg flex items-center justify-center flex-shrink-0" style={{ border: '1px solid rgba(212,175,55,0.4)', background: 'rgba(2,8,18,0.7)' }}>
          <Palette className="w-4 h-4" style={{ color: studioOpen ? 'var(--gold-primary)' : 'rgba(255,255,255,0.45)', filter: studioOpen ? 'drop-shadow(0 0 6px var(--gold-glow))' : 'none' }} />
        </span>
        <span className="flex-1 text-[10px] font-mono tracking-[0.2em] uppercase text-white/50">Style Studio</span>
        <ChevronRight className="w-3.5 h-3.5 text-white/30" />
      </button>
      {setTheme && (
        <button
          type="button"
          onClick={() => setTheme(theme === 'core' ? 'ghost' : 'core')}
          aria-pressed={theme === 'ghost'}
          aria-label="Ghost Protocol"
          title="Ghost Protocol"
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-colors hover:bg-white/[0.04] focus:outline-none focus-visible:ring-1 focus-visible:ring-purple-200/40"
          style={{ border: '1px solid rgba(179,136,255,0.25)', background: 'rgba(4,10,22,0.6)' }}
        >
          <span className="w-[30px] h-[30px] rounded-lg flex items-center justify-center flex-shrink-0" style={{ border: '1px solid rgba(179,136,255,0.4)', background: 'rgba(2,8,18,0.7)' }}>
            <Ghost className="w-4 h-4" style={{ color: theme === 'ghost' ? '#B388FF' : 'rgba(255,255,255,0.45)', filter: theme === 'ghost' ? 'drop-shadow(0 0 6px rgba(179,136,255,0.5))' : 'none' }} />
          </span>
          <span className="flex-1 text-[10px] font-mono tracking-[0.2em] uppercase text-white/50">Ghost Protocol</span>
          <span className="text-[9px] font-mono tracking-wider" style={{ color: theme === 'ghost' ? '#B388FF' : 'rgba(255,255,255,0.3)' }}>
            {theme === 'ghost' ? 'ON' : 'OFF'}
          </span>
        </button>
      )}
    </div>
  );

  /* The board's gold footer row — a link, as drawn. Upsell surfaces are
     free-viewer only (Pro users never saw the embed either). */
  const proFooter = !isPremiumUser ? (
    <div className="px-3 mt-3 pb-1">
      <a
        href="/pricing"
        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all hover:brightness-125 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#D4AF37]/70"
        style={{
          border: '1px solid rgba(212,175,55,0.65)',
          background: 'linear-gradient(100deg, rgba(42,30,4,0.92), rgba(16,10,2,0.95) 60%, rgba(58,40,6,0.9))',
          boxShadow: '0 0 16px rgba(212,175,55,0.25), inset 0 0 18px rgba(212,175,55,0.08)',
        }}
      >
        <Crown className="w-6 h-6 flex-shrink-0 text-[#D4AF37]" style={{ filter: 'drop-shadow(0 0 6px rgba(212,175,55,0.6))' }} />
        <span className="flex-1 min-w-0">
          <span className="block text-[13px] font-bold tracking-[0.14em] text-[#F3C84B] leading-tight">WORLDEYE PRO</span>
          <span className="block mt-0.5 text-[9.5px] text-[#E8D9A8]/75 leading-snug">One pass unlocks every premium layer on this board.</span>
        </span>
        <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ border: '1px solid rgba(212,175,55,0.55)', background: 'rgba(212,175,55,0.10)' }}>
          <ChevronRight className="w-4 h-4 text-[#F3C84B]" />
        </span>
      </a>
    </div>
  ) : null;

  /* ── MOBILE ──
     The page drawer is the sheet: it provides the frame, the scroll and
     (through onClose) the close. The panel renders the board itself —
     header, quick bar, accordion — exactly as the reference's mobile
     view. The drawer's old stats strip is gone: the quick bar carries
     the same five counts and toggles them. */
  if (isMobile) {
    return (
      <div data-tour="layers" className="flex flex-col py-1">
        {panelHeader}
        {quickBar}
        {categoriesList}
        {utilities}
        {proFooter}
        <AnimatePresence>
          {studioOpen && <StyleStudio isMobile onClose={() => setStudioOpen(false)} />}
        </AnimatePresence>
      </div>
    );
  }

  /* ── DESKTOP ──
     Closed state (the board's default): the "Layers & Stats" pill.
     Open: the full board as a left sheet. The page's showLayers state
     still mounts/unmounts the whole control (the 'L' key and the panel
     router behave exactly as they did for the rail). */
  const totalActive = visibleCategories.reduce(
    (n, cat) => n + cat.layers.filter((l) => !l.parent && activeLayers[l.key]).length,
    0,
  );
  return (
    <motion.div
      data-tour="layers"
      initial={{ x: -60, opacity: 0 }}
      animate={revealed ? { x: 0, opacity: 1 } : { x: -60, opacity: 0 }}
      transition={{ type: 'spring', damping: 30, stiffness: 200, delay: 0.25 }}
      className="absolute top-0 left-0 h-full z-50 pointer-events-none"
    >
      <AnimatePresence mode="wait" initial={false}>
        {sheetOpen ? (
          <motion.div
            key="sheet"
            role="dialog"
            aria-label="Layers & Stats"
            initial={{ x: -40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -30, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="pointer-events-auto absolute left-0 top-0 h-full w-[352px] max-w-[92vw] flex flex-col rounded-r-[18px] overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, rgba(5,14,30,0.94), rgba(2,6,16,0.97))',
              backdropFilter: 'blur(28px) saturate(1.4)',
              WebkitBackdropFilter: 'blur(28px) saturate(1.4)',
              borderRight: '1px solid rgba(56,189,248,0.5)',
              boxShadow: '0 0 34px rgba(56,189,248,0.20), 18px 0 48px rgba(0,0,0,0.55), inset 0 0 60px rgba(56,189,248,0.04)',
            }}
          >
            <div className="flex-shrink-0">
              {panelHeader}
              {quickBar}
            </div>
            <div className="flex-1 overflow-y-auto styled-scrollbar pb-4">
              {categoriesList}
              {utilities}
              {proFooter}
            </div>
          </motion.div>
        ) : (
          <motion.button
            key="pill"
            type="button"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            onClick={() => setSheetOpen(true)}
            aria-expanded={false}
            aria-label="Open Layers & Stats panel"
            title="Layers & Stats"
            className="layers-pill pointer-events-auto absolute left-3 top-[92px] flex items-center gap-2 pl-3 pr-2.5 py-2 rounded-full cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-200/60"
            style={{
              border: '1px solid rgba(56,189,248,0.55)',
              background: 'linear-gradient(180deg, rgba(7,20,40,0.88), rgba(3,9,20,0.92))',
              backdropFilter: 'blur(18px) saturate(1.3)',
              WebkitBackdropFilter: 'blur(18px) saturate(1.3)',
              boxShadow: '0 0 16px rgba(56,189,248,0.25), inset 0 0 14px rgba(56,189,248,0.07)',
            }}
          >
            <Layers className="w-4 h-4 text-cyan-200" style={{ filter: 'drop-shadow(0 0 5px rgba(56,189,248,0.7))' }} />
            <span className="text-[11px] font-semibold tracking-[0.14em] text-white/90 uppercase whitespace-nowrap">Layers & Stats</span>
            {totalActive > 0 && (
              <span
                className="min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-[9px] font-mono tabular-nums leading-none"
                style={{ background: 'rgba(0,229,255,0.9)', color: '#04040A', boxShadow: '0 0 6px rgba(0,229,255,0.5)' }}
              >
                {totalActive}
              </span>
            )}
            <ChevronDown className="w-3.5 h-3.5 text-cyan-200/70" />
          </motion.button>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {studioOpen && <StyleStudio onClose={() => setStudioOpen(false)} />}
      </AnimatePresence>
      {/* The pill's hover glow (the reference's hover state) — a soft
          pulse ring rather than the mockup's particle swirl. */}
      <style>{`
        .layers-pill { transition: box-shadow 0.25s ease, border-color 0.25s ease; }
        .layers-pill:hover {
          border-color: rgba(125,211,252,0.9) !important;
          box-shadow: 0 0 26px rgba(56,189,248,0.5), 0 0 8px rgba(56,189,248,0.35), inset 0 0 16px rgba(56,189,248,0.12) !important;
        }
      `}</style>
    </motion.div>
  );
}

export default memo(LayerPanel);

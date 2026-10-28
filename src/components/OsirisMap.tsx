'use client';

import { buildGeometry, closeRing, drawReducer, initialDrawState, measure, type DrawAction, type DrawMode, type DrawProgress, type DrawResult, type DrawState } from '@/lib/draw';
import { useEffect, useRef, useState, useCallback, memo } from 'react';
import * as maplibregl from 'maplibre-gl';
import { installTerrainTileProtocol } from '@/lib/terrain-tiles';
import { CLOUDS_ATTRIBUTION, CLOUDS_CREDIT, CLOUDS_LAYER, frameTime } from '@/lib/live-clouds';
import { createCloudLayer } from '@/lib/live-clouds-layer';
import {
  LIGHTNING_ATTRIBUTION, LIGHTNING_LAYER, LIGHTNING_SOURCE, lightningTiles,
  RADAR_ATTRIBUTION, RADAR_LAYER, RADAR_REFRESH_MS, RADAR_SOURCE,
  radarFrameIso, radarTiles,
} from '@/lib/noaa-radar';
import {
  TRAFFIC_MIN_ZOOM, CAMERA_SEARCH_RADIUS_M,
  targetVehicleCount, congestionBand, BAND_COLORS, trafficChipText, type TrafficFlowState, } from '@/lib/traffic/config';
import { adaptBasemapRoadFeatures, buildRoadNetwork, type RoadNetwork } from '@/lib/traffic/roads';
import { effectiveRatio } from '@/lib/traffic/congestion';
import {
  createRng, reconcileVehicles, advanceVehicles, vehicleFeature, type SimVehicle,
} from '@/lib/traffic/sim';
import { matchFlowToRoads } from '@/lib/traffic/flow';
import { FlightBlend, flightIconImage, flightIconSize, flightsToFeatures, type FlightBuckets } from '@/lib/flights/render';
import { featureMatchesFlightShareId, FLIGHT_SHARE_OPEN_DEADLINE_MS } from '@/lib/share/links';
import { findFlightFeatureInBuckets, flightShareCameraSettledOn, flightShareFlyToTarget } from '@/lib/share/flight-open';
import { groupStormFeatures, stormChangeSummary, compassDirection, STORM_SIZE_MEANING, type StormGroup } from '@/lib/events/hurricanes';
import {
  IDLE_FLIGHT_FOLLOW, FOLLOW_MAX_PITCH, aircraftFollowPreset, describeFix, followCameraTarget,
  followLostExpired, headingOf, noteFollowSeen, setFollowMode as setFollowModeState, startFollow,
  type FlightFollowState, type FollowHudData, type FollowMode, type SavedCameraState,
} from '@/lib/flights/follow';
import { basemapView, syncDayOverlay, terminatorVisible, type BasemapMode } from '@/lib/basemap-mode';
import {
  createSatelliteOverlayState, syncSatelliteOverlay, LATEST_SELECTION,
  type SatelliteImagerySelection,
} from '@/lib/wayback-imagery';
import {
  beginRouteFetch, createFlightPath, flightPathAccess, flightPathFeatures, flightPathHudData,
  noteFlightPathFix, parseFlightRouteResponse, resolveFlightPathRoute,
  type FlightPathAccess, type FlightPathHudData, type FlightPathState,
} from '@/lib/flights/path';
import FlightFollowHud from '@/components/FlightFollowHud';
import FlightCockpitOverlay from '@/components/FlightCockpitOverlay';
import { collectCameraCandidates, findNearestCameras } from '@/lib/nearby-cameras';
import { selectAgenciesForView, agencyIntersectsView, padView } from '@/lib/transit/relevance';
import { gbfsCacheEntryAfterFetch, gbfsLoadCandidates, visibleGbfsItems } from '@/lib/gbfs/viewport';
import { TransitBlend } from '@/lib/transit/motion';
import {
  TRANSIT_SUB, transitSubOn, transitLabelsOn, vehicleModeVisible, lineModeVisible, anyLineFamilyOn,
} from '@/lib/transit/subdivisions';
import { nearestOf } from '@/lib/transit/explorer';
import {
  isLowPowerDevice, sensorEffectLabel, sensorEffectPlan, supportsSvgFilterReference,
  thermalTableValues, THERMAL_FILTER_ID, type SensorEffectState,
} from '@/lib/sensor-effects';
import { attachOi, type OiGlobe, type OiHover } from '@/lib/oi/globe';
import { attachHighlights, type Highlighter } from '@/lib/oi/highlights';
import type { Highlight } from '@/lib/oi/assist/tools';
import { createSatelliteLayer, parseColor, SAT_MAX_ZOOM, type SatPoint } from '@/lib/satellite-layer';
import { MAP_DEFAULTS, MAP_PALETTE_KEYS, readMapPalette, satColorFor, type MapPalette } from '@/lib/map-palette';
import { STYLE_EVENT } from '@/lib/style-tokens';
import { arrivalBeacons } from '@/lib/malware-intel';
import { ALERT_KINDS, timeAgo, type AlertKind } from '@/lib/alert-digest';
import SatelliteCard, { type SatelliteDetail } from '@/components/SatelliteCard';
import CctvPreviews, { type PreviewCamera } from '@/components/CctvPreviews';
import MapControls from '@/components/MapControls';
import SatelliteTimeSlider from '@/components/SatelliteTimeSlider';
import CinematicDirector from '@/components/CinematicDirector';
import SpaceMissionsPanel from '@/components/SpaceMissionsPanel';
import TransitExplorer, { type TransitExplorerInit } from '@/components/TransitExplorer';
import TransitSelectionCard, { type TransitSelection, type TransitVehicleSelection } from '@/components/TransitSelectionCard';
import { launchStatusKind, type LaunchRecord } from '@/lib/launches/types';
import StreetLevelViewer from '@/components/StreetLevelViewer';
import { STREET_LEVEL_MAX_SPAN_DEG, STREET_LEVEL_MIN_ZOOM, type StreetPicture } from '@/lib/streetlevel/types';
import { launchPadKey } from '@/lib/launches/normalize';
import { nextLaunch } from '@/lib/launches/countdown';
import { spaceMissionPreset } from '@/lib/launches/preset';
import LiveNewsPreviews, { type PreviewFeed } from '@/components/LiveNewsPreviews';
import { attachTerrain, type TerrainStatus } from '@/lib/map-terrain';

import { applyMapProjection } from '@/lib/map-projection';

/** The catalogue fields the satellite layer and its popup actually read. */
interface SatelliteRow {
  name: string;
  lat: number;
  lng: number;
  alt: number;
  color?: string;
  mission?: string;
  category?: string;
  noradId?: string;
}
import 'maplibre-gl/dist/maplibre-gl.css';

interface OsirisMapProps {
  data: any;
  activeLayers: Record<string, boolean>;
  onEntityClick?: (entity: any) => void;
  onMouseCoords?: (coords: { lat: number; lng: number }) => void;
  onRightClick?: (coords: { lat: number; lng: number }) => void;
  onViewStateChange?: (vs: { zoom: number; latitude: number }) => void;
  /** `alertId` also opens that Live Alert's pin once the camera arrives.
   *  `duration` overrides the default 2 s flight. */
  flyToLocation?: { lat: number; lng: number; zoom?: number; alertId?: string; duration?: number; ts: number } | null;
  /** Fires once, when the map has drawn its first complete frame. */
  onReady?: () => void;
  /** Which Live Alerts to pin — the reports the feed is showing. Null pins them all. */
  alertPinIds?: string[] | null;
  projection?: 'mercator' | 'globe';
  terrainEnabled?: boolean;
  terrainRetry?: number;
  terrainFocus?: number;
  onTerrainStatusChange?: (status: TerrainStatus) => void;

  mapStyle?: string;
  /** Day/auto/night basemap choice (persisted by the page; free for all). */
  basemapMode?: BasemapMode;
  onBasemapModeChange?: (mode: BasemapMode) => void;
  /** Satellite basemap switch state for the map chrome (page owns it).
   *  Satellite view is free for everyone — there is no lock. */
  satelliteOn?: boolean;
  onSatelliteToggle?: () => void;
  /** Satellite imagery time selection for the Wayback slider (page
   *  owns it; free for everyone, like the satellite view itself).
   *  `latest` = the live World Imagery service; a `wayback` selection
   *  swaps the basemap tiles to that dated archive release. */
  satelliteSelection?: SatelliteImagerySelection;
  onSatelliteSelectionChange?: (selection: SatelliteImagerySelection) => void;
  sweepData?: any;
  scanTargets?: any[];
  demoMode?: boolean;
  theme?: 'core' | 'ghost';
  drawnPolygons?: Array<{ id: string; name: string; geojson: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.LineString>; color: string }>;
  arcgisLayers?: Array<{ id: string; title: string; geojson: any; color?: string; opacity?: number }>;
  /** Active draw mode, or null when not drawing. */
  drawMode?: DrawMode | null;
  onDrawProgress?: (p: DrawProgress | null) => void;
  onDrawCancel?: () => void;
  /**
   * Undo / finish / cancel driven from a button rather than the keyboard.
   * Carries a seq so pressing the same button twice still registers.
   */
  drawCommand?: { action: DrawAction["type"]; seq: number } | null;
  onDrawComplete?: (result: DrawResult) => void;
  onMapCenter?: (coords: { lat: number; lng: number; bounds?: { west: number; south: number; east: number; north: number } }) => void;
  /** Active turn-by-turn route drawn as a line with origin/destination pins. */
  route?: {
    geometry: { type: 'LineString'; coordinates: [number, number][] };
    from: { lat: number; lng: number };
    to: { lat: number; lng: number };
    /** Unselected alternatives, drawn dimmed behind the active line. */
    alternates?: Array<{ type: 'LineString'; coordinates: [number, number][] }>;
    /** Highlighted portion for the step the operator has selected. */
    activeSegment?: [number, number][] | null;
  } | null;
  /** Live position from the browser — drawn as a pulsing dot with accuracy ring. */
  userLocation?: { lat: number; lng: number; accuracy?: number; heading?: number | null } | null;
  /** Keep the camera centred on userLocation as it moves. */
  followUser?: boolean;
  /** Fired when the operator pans/zooms/rotates while follow mode is on. */
  onFollowInterrupt?: () => void;
  /** Live navigation: tighter zoom and the map turned to face travel direction. */
  navigating?: boolean;
  /** Corroborated endpoint airports for watched aircraft, keyed by icao24. */
  aircraftAirports?: Record<string, Array<{ icao: string; iata?: string; city?: string; lat: number; lng: number }>>;
  /** Hands the page OI's globe layer, so a run draws without re-rendering the map. Null when it goes. */
  onOiGlobe?: (globe: OiGlobe | null) => void;
  /** A piece of OI's analysis was clicked: an arc ("link:<id>") or a point ("a:<actor>", "e:<event>"…); null for empty map. */
  onOiSelect?: (key: string | null) => void;
  /** The pointer is over a piece of OI's analysis, or has left it. */
  onOiHover?: (hover: OiHover | null) => void;
  /** OI's camera started or stopped following the run. */
  onOiFollow?: (following: boolean) => void;
  /** Simulated sensor effect (DISPLAY group) — applied to the map canvas only. */
  sensorEffect?: SensorEffectState;
  onSensorEffectChange?: (next: SensorEffectState) => void;
  /** What OI Assist has marked on the map: found things, named places, a searched area. */
  oiHighlight?: Highlight | null;
}

function computeSolarTerminator(): [number, number][] {
  const now = new Date();
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
  const declination = -23.44 * Math.cos((2 * Math.PI / 365) * (dayOfYear + 10));
  const decRad = declination * Math.PI / 180;
  const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60;
  const subsolarLng = (12 - utcHours) * 15;
  const points: [number, number][] = [];
  for (let lng = -180; lng <= 180; lng += 2) {
    const lngRad = (lng - subsolarLng) * Math.PI / 180;
    const lat = Math.atan(-Math.cos(lngRad) / Math.tan(decRad)) * 180 / Math.PI;
    points.push([lng, lat]);
  }
  const darkSide = declination >= 0 ? -90 : 90;
  points.push([180, darkSide]);
  points.push([-180, darkSide]);
  points.push(points[0]);
  return points;
}

const EMPTY_FC = { type: 'FeatureCollection' as const, features: [] };

/** A colour, or an expression for one, as addLayer takes it. */
type LayerColor = NonNullable<Extract<Parameters<maplibregl.Map['addLayer']>[0], { type: 'circle' }>['paint']>['circle-color'];

/** A Live Alerts report as /api/news sends it — only the fields a pin reads. */
interface PinnedReport {
  id: string;
  alert_kind?: string;
  title: string;
  source_name: string;
  lean?: string | null;
  published: string;
  link?: string | null;
  coords?: [number, number] | null;
  place?: { name: string; label: string; precision: string } | null;
  media?: { kind?: string; video?: string | null; thumb?: string | null; duration?: string | null } | null;
}

/** A report posted this recently gets the pulsing ring. */
const ALERT_FRESH_MS = 15 * 60_000;

/** Two right-clicks count as one double right-click this close in time… */
const DOUBLE_RIGHT_MS = 500;
/** …and this close on screen, so a second click elsewhere starts afresh. */
const DOUBLE_RIGHT_SLOP_PX = 12;

/** What a pin carries: flat, as map feature properties must be. */
interface AlertPinProps {
  id: string;
  kind: AlertKind;
  /** Reports pinned to this same place, this one included. */
  stack: number;
  /** Posted in the last quarter of an hour. */
  fresh: boolean;
  title: string;
  source_name: string;
  lean: string;
  published: string;
  link: string;
  place_name: string;
  place_label: string;
  precision: string;
  media_kind: string;
  video: string;
  thumb: string;
  duration: string;
}

interface AlertPinFeature {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: AlertPinProps;
}

/** Escape a value for interpolation into popup HTML. Module scope so the
 *  shared nearby-cameras popup (below) can use it outside the map-init
 *  closure, which keeps its own copy for its many existing popups. */
function escHtml(v: any): string {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* ── Flight glyphs (v2) ───────────────────────────────────────────────
   Canvas painters for the flight symbol layers, shared by the boot-time
   image registration and the theme-switch recolour so the two can never
   drift. Both draw a top view pointing "up" (north) at rotation 0; the
   layers rotate them by heading. */

/** Fixed-wing, top view: long nose taper, one swept mid wing, small
 *  tailplane — a sleeker silhouette than the v1 dart. */
function drawPlaneGlyph(ctx: CanvasRenderingContext2D, color: string, size: number) {
  const cx = size / 2, cy = size / 2;
  const x = (f: number) => cx + size * f;
  const y = (f: number) => cy + size * f;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x(0), y(-0.46));          // nose
  ctx.lineTo(x(0.09), y(0.02));        // fuselage → wing root (leading)
  ctx.lineTo(x(0.44), y(0.24));        // wing tip (leading)
  ctx.lineTo(x(0.44), y(0.31));        // wing tip (trailing)
  ctx.lineTo(x(0.09), y(0.16));        // wing root (trailing)
  ctx.lineTo(x(0.07), y(0.30));        // fuselage → tailplane root
  ctx.lineTo(x(0.22), y(0.40));        // tailplane tip (leading)
  ctx.lineTo(x(0.22), y(0.44));        // tailplane tip (trailing)
  ctx.lineTo(x(0), y(0.38));           // tail cone
  ctx.lineTo(x(-0.22), y(0.44));
  ctx.lineTo(x(-0.22), y(0.40));
  ctx.lineTo(x(-0.07), y(0.30));
  ctx.lineTo(x(-0.09), y(0.16));
  ctx.lineTo(x(-0.44), y(0.31));
  ctx.lineTo(x(-0.44), y(0.24));
  ctx.lineTo(x(-0.09), y(0.02));
  ctx.closePath();
  ctx.fill();
}

/** Helicopter, top view: oval fuselage, a long main-rotor bar across
 *  the front third, and a thin tail boom ending in a tail-rotor tick.
 *  The rotor bar is the read at small sizes — nothing like the plane's
 *  winged wedge, so a heli never reads as a plane. */
function drawHeliGlyph(ctx: CanvasRenderingContext2D, color: string, size: number) {
  const c = size / 2;
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  // Tail boom — thin spine from the fuselage to the tail rotor.
  ctx.fillRect(c - size * 0.022, c + size * 0.04, size * 0.044, size * 0.37);
  // Fuselage — top-view oval, nose up.
  ctx.beginPath();
  ctx.ellipse(c, c - size * 0.07, size * 0.125, size * 0.20, 0, 0, Math.PI * 2);
  ctx.fill();
  // Tail rotor — short tick across the end of the boom.
  ctx.lineWidth = Math.max(1, size * 0.045);
  ctx.beginPath();
  ctx.moveTo(c - size * 0.10, c + size * 0.42);
  ctx.lineTo(c + size * 0.10, c + size * 0.42);
  ctx.stroke();
  // Main rotor — the long bar that makes it a helicopter at a glance.
  ctx.lineWidth = Math.max(1.1, size * 0.05);
  ctx.beginPath();
  ctx.moveTo(c - size * 0.47, c - size * 0.10);
  ctx.lineTo(c + size * 0.47, c - size * 0.10);
  ctx.stroke();
}

/* ── Photo aircraft icons (owner's order, 2026-10-26) ──────────────────
 * Top-down photo artwork replaces the vector glyphs for: commercial
 * planes (airliner photo), private planes AND business jets (private-jet
 * photo), and EVERY helicopter class (helicopter photo). Military and
 * unknown-class planes keep their glyphs — no photo was supplied for
 * them. The glyphs are still drawn first at boot as an instant fallback;
 * the photos swap in over the same image ids when they load, and are
 * re-applied after theme switches (photos don't recolour). Registered
 * at 96px with pixelRatio 4 so the logical footprint stays the glyphs'
 * 24px and the layers' icon-size interpolation is unchanged. */
const AIRCRAFT_PHOTO_BY_ICON: Record<string, string> = {
  'plane-cyan': '/icons/aircraft-commercial.png',
  'plane-green': '/icons/aircraft-private.png',
  'plane-pink': '/icons/aircraft-private.png',
  'heli-cyan': '/icons/aircraft-heli.png',
  'heli-green': '/icons/aircraft-heli.png',
  'heli-pink': '/icons/aircraft-heli.png',
  'heli-red': '/icons/aircraft-heli.png',
  'heli-grey': '/icons/aircraft-heli.png',
};
const AIRCRAFT_PHOTO_PX = 96;
const aircraftPhotoCache = new Map<string, Promise<HTMLImageElement | null>>();

function loadAircraftPhoto(url: string): Promise<HTMLImageElement | null> {
  let p = aircraftPhotoCache.get(url);
  if (!p) {
    p = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = url;
    });
    aircraftPhotoCache.set(url, p);
  }
  return p;
}

function aircraftPhotoData(img: HTMLImageElement): { width: number; height: number; data: Uint8Array } {
  const s = AIRCRAFT_PHOTO_PX;
  const canvas = document.createElement('canvas');
  canvas.width = s; canvas.height = s;
  const ctx = canvas.getContext('2d')!;
  const scale = Math.min(s / img.naturalWidth, s / img.naturalHeight);
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  ctx.drawImage(img, (s - w) / 2, (s - h) / 2, w, h);
  return { width: s, height: s, data: new Uint8Array(ctx.getImageData(0, 0, s, s).data) };
}

const FLIGHT_FOLLOW_PRESETS = [aircraftFollowPreset()];

/** Director presets owned by other systems: Aircraft Follow (Wave 2) and
 *  Space Mission (Phase 7 — flies to the selected/next launch's pad, and
 *  is honestly unavailable until launch data is loaded). */
const DIRECTOR_PRESETS = [...FLIGHT_FOLLOW_PRESETS, spaceMissionPreset()];

function OsirisMap({ data, activeLayers, onEntityClick, onMouseCoords, onRightClick, onViewStateChange, onReady, flyToLocation, alertPinIds = null, projection = 'globe', terrainEnabled = false, terrainRetry = 0, terrainFocus = 0, onTerrainStatusChange, mapStyle = 'dark', basemapMode = 'night', onBasemapModeChange, satelliteOn = false, onSatelliteToggle, satelliteSelection = LATEST_SELECTION, onSatelliteSelectionChange, sweepData, scanTargets = [], demoMode = false, theme = 'core', drawnPolygons = [], arcgisLayers = [], drawMode = null, onDrawComplete, onDrawProgress, onDrawCancel, drawCommand = null, onMapCenter, route = null, userLocation = null, followUser = false, onFollowInterrupt, navigating = false, aircraftAirports = {}, onOiGlobe, onOiSelect, onOiHover, onOiFollow, oiHighlight = null, sensorEffect, onSensorEffectChange }: OsirisMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  // GBFS + transit layers keep their data in-map (toggle-gated fetches).
  const gbfsSystemsRef = useRef<any[]>([]);
  const gbfsCacheRef = useRef(new Map<string, { at: number; items: any[] }>());
  const transitAgenciesRef = useRef<any[]>([]);
  // Snapshot-pair motion state (lib/transit/motion): polls push, the
  // render loop samples — vehicles glide between real fixes instead
  // of teleporting on each poll (the flights FlightBlend pattern).
  const transitBlendRef = useRef<TransitBlend | null>(null);
  // Coverage honesty: when Live Transit is on but the viewport holds no
  // covered agency, the layer would otherwise be silently empty. The
  // notice names the covered regions instead; dismissal lasts until the
  // layer is toggled off and on again.
  const [transitNotice, setTransitNotice] = useState<string | null>(null);
  const transitNoticeDismissedRef = useRef(false);
  // Transit network (routes/stops) per agency, fetched once per session
  // from /api/transit/network + /api/transit/stops; failures are stamped
  // so a dead feed is retried on moveend at most once a minute, never
  // in a hot loop, and never at the vehicles' expense.
  const transitNetworkRef = useRef(new Map<string, { lines: any; stops: any[]; credit: string }>());
  const transitNetworkFailRef = useRef(new Map<string, number>());
  // The route the Transit Explorer has selected (internal GTFS
  // route_id); drives the highlight layer over the network lines.
  const [transitRouteSel, setTransitRouteSel] = useState<string | null>(null);
  // Transit redesign (2026-10-26): enabling the layer no longer opens
  // anything. A tapped vehicle/stop shows the small selection card;
  // the Explorer is a separate full-screen workspace opened on
  // purpose (Layers section, card actions); Follow Vehicle follows
  // the follow pattern (a ref the render loop chases, drag releases).
  const [transitSel, setTransitSel] = useState<TransitSelection | null>(null);
  const [transitExplorer, setTransitExplorer] = useState<{ init: TransitExplorerInit; seq: number } | null>(null);
  const transitFollowRef = useRef<{ agencyId: string; vehId: string; label: string; lastSeenMs: number } | null>(null);
  const [transitFollowUi, setTransitFollowUi] = useState<{ label: string } | null>(null);
  const [transitFollowNotice, setTransitFollowNotice] = useState<string | null>(null);
  const transitFollowNoticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The last rendered vehicle features — "Show Nearby Transit"
  // searches exactly what is on the globe, nothing synthetic.
  const transitRenderedRef = useRef<any[]>([]);
  const showTransitFollowNotice = useCallback((msg: string) => {
    setTransitFollowNotice(msg);
    if (transitFollowNoticeTimer.current) clearTimeout(transitFollowNoticeTimer.current);
    transitFollowNoticeTimer.current = setTimeout(() => setTransitFollowNotice(null), 7000);
  }, []);
  const endTransitFollow = useCallback((notice?: string) => {
    transitFollowRef.current = null;
    setTransitFollowUi(null);
    if (notice) showTransitFollowNotice(notice);
  }, [showTransitFollowNotice]);
  const startTransitFollow = useCallback((t: { agencyId: string; vehId: string; route: string; label?: string }) => {
    const label = (t.label || '').trim() || (t.route ? `ROUTE ${t.route}` : 'VEHICLE');
    transitFollowRef.current = { agencyId: t.agencyId, vehId: t.vehId, label, lastSeenMs: Date.now() };
    setTransitFollowUi({ label });
  }, []);
  const openTransitExplorer = useCallback((init: TransitExplorerInit) => {
    setTransitExplorer((prev) => ({ init, seq: (prev?.seq ?? 0) + 1 }));
  }, []);
  // Traffic layer keeps its simulation in-map like transit/GBFS: the road
  // network rebuilt from the basemap's own tiles, the fleet, the latest
  // TomTom flow sample, and the honest-labeling chip (always visible
  // while the layer is on — it carries the simulation disclaimer).
  const [trafficChip, setTrafficChip] = useState<string | null>(null);
  // Space Missions keeps its LL2 board in-map: the latest
  // /api/launches payload plus the pad/launch selection the panel and the
  // Director's Space Mission preset read. The replay drawing itself is
  // driven by SpaceMissionsPanel through setGeo.
  const [launchData, setLaunchData] = useState<{ upcoming: LaunchRecord[]; previous: LaunchRecord[]; stale: boolean; error: boolean } | null>(null);
  const [selectedPadKey, setSelectedPadKey] = useState<string | null>(null);
  const [selectedLaunchId, setSelectedLaunchId] = useState<string | null>(null);
  // Street Level keeps its Panoramax picture in-map: the
  // coverage chip (always visible while the layer is on — it is what
  // makes "no coverage here" a readable state instead of an empty map),
  // the records behind the dots for click lookup, and the picture open
  // in the viewer panel.
  const [streetLevelChip, setStreetLevelChip] = useState<string | null>(null);
  const [streetPicture, setStreetPicture] = useState<StreetPicture | null>(null);
  const [streetPictureLoading, setStreetPictureLoading] = useState(false);
  const streetLevelPicsRef = useRef(new Map<string, StreetPicture>());
  // Sequence prev/next in the viewer goes through /api/streetlevel
  // (server-cached) and glides the globe to the neighbouring photo.
  const navigateStreetPicture = useCallback(async (id: string) => {
    setStreetPictureLoading(true);
    try {
      const r = await fetch(`/api/streetlevel?picture=${encodeURIComponent(id)}`);
      const j = await r.json();
      if (j.picture) {
        setStreetPicture(j.picture as StreetPicture);
        mapRef.current?.easeTo({ center: [j.picture.lng, j.picture.lat], duration: 600 });
      }
    } catch { /* keep the current photo on screen */ }
    setStreetPictureLoading(false);
  }, []);
  const trafficNetRef = useRef<RoadNetwork | null>(null);
  const trafficVehiclesStateRef = useRef<SimVehicle[]>([]);
  const trafficFlowRef = useRef<{ ratios: Map<string, number>; at: number } | null>(null);
  // ── Nearby cameras — ONE handoff for every "cameras near X" surface ──
  // The search itself lives in src/lib/nearby-cameras.ts (shared with the
  // region dossier in page.tsx); this block owns only the popup + the
  // selection bridge. Opening a result goes through the shared
  // onEntityClick → CameraViewer path, so the free-camera gate and every
  // other access rule stay exactly the viewer's own.
  const nearbyCamerasRef = useRef<any[]>([]);
  const dataRef = useRef(data);
  useEffect(() => { dataRef.current = data; });
  const entityClickRef = useRef(onEntityClick);
  useEffect(() => { entityClickRef.current = onEntityClick; });
  const activeLayersRef = useRef(activeLayers);
  useEffect(() => { activeLayersRef.current = activeLayers; });

  const openNearbyCameras = useCallback((here: [number, number], opts: {
    title: string;
    honestyWithResults: string;
    honestyEmpty: string;
    listLead: (n: number) => string;
    emptyText: string;
  }) => {
    const map = mapRef.current;
    if (!map) return;
    let features: any[] = [];
    try { features = map.querySourceFeatures('cctv') as any[]; } catch { features = []; }
    const candidates = collectCameraCandidates(features, (dataRef.current as any)?.cameras);
    const near = findNearestCameras(candidates, here);
    nearbyCamerasRef.current = near.map(x => x.camera);
    const pStyle = `background:rgba(12,14,26,0.95);backdrop-filter:blur(16px);border-radius:10px;padding:16px;font-family:'JetBrains Mono',monospace;`;
    let html: string;
    if (near.length) {
      const rows = near.map((x, i) => `<button onclick="window.__weNearbyCam&&window.__weNearbyCam(${i})" style="display:block;width:100%;text-align:left;margin-top:6px;padding:7px 10px;background:rgba(0,229,255,0.08);border:1px solid rgba(0,229,255,0.3);color:#BFEFFF;font-family:'JetBrains Mono',monospace;font-size:10px;border-radius:5px;cursor:pointer;">📷 ${escHtml(x.camera.name || x.camera.city || 'Camera')} · ${(x.distanceM / 1000).toFixed(2)} km</button>`).join('');
      html = `<div style="${pStyle}border:1px solid rgba(255,255,255,0.08);"><div style="color:#E8E6E0;font-size:12px;font-weight:700;letter-spacing:0.08em;">${escHtml(opts.title)}</div><div style="color:#5C5A54;font-size:9px;margin-top:4px;letter-spacing:0.08em;">${escHtml(opts.honestyWithResults)}</div><div style="color:#B0BEC5;font-size:10px;margin-top:8px;">${escHtml(opts.listLead(near.length))}</div>${rows}</div>`;
    } else {
      const hint = (activeLayersRef.current as any)?.cctv ? '' : ' Turn on the CCTV Cameras layer to load the camera index.';
      html = `<div style="${pStyle}border:1px solid rgba(255,255,255,0.08);"><div style="color:#E8E6E0;font-size:12px;font-weight:700;letter-spacing:0.08em;">${escHtml(opts.title)}</div><div style="color:#5C5A54;font-size:9px;margin-top:4px;letter-spacing:0.08em;">${escHtml(opts.honestyEmpty)}</div><div style="color:#B0BEC5;font-size:10px;margin-top:8px;line-height:1.5;">${escHtml(opts.emptyText)}${escHtml(hint)}</div></div>`;
    }
    popupRef.current?.remove();
    popupRef.current = new maplibregl.Popup({ closeButton: true, maxWidth: '380px', offset: 14 }).setLngLat(here).setHTML(html).addTo(map);
  }, []);
  const openNearbyCamerasRef = useRef(openNearbyCameras);
  useEffect(() => { openNearbyCamerasRef.current = openNearbyCameras; }, [openNearbyCameras]);

  // Popup buttons are static HTML, so they reach React through window
  // bridges — the same pattern as osirisWatchFlight and the entity follow
  // toggle. __weFlightCams carries the aircraft handoff's honesty rule in
  // its copy: these are GROUND cameras near the aircraft's position; the
  // aircraft is not visible in them and the copy never implies otherwise.
  useEffect(() => {
    (window as any).__weNearbyCam = (i: number) => {
      const cam = nearbyCamerasRef.current[i];
      const map = mapRef.current;
      if (!cam || !map) return;
      popupRef.current?.remove();
      entityClickRef.current?.({
        type: 'cctv', id: cam.id, name: cam.name, city: cam.city, country: cam.country,
        source: cam.source, feed_url: cam.feed_url, stream_url: cam.stream_url,
        stream_type: cam.stream_type, external_url: cam.external_url, lat: cam.lat, lng: cam.lng,
      });
      map.flyTo({ center: [cam.lng, cam.lat], zoom: Math.max(map.getZoom(), 13), duration: 1000 });
    };
    (window as any).__weFlightCams = (lng: number, lat: number) => {
      const radiusKm = (CAMERA_SEARCH_RADIUS_M / 1000).toFixed(1);
      const honesty = "GROUND CAMERAS NEAR THE AIRCRAFT'S CURRENT POSITION — THE AIRCRAFT IS NOT VISIBLE IN THESE FEEDS";
      openNearbyCamerasRef.current([lng, lat], {
        title: 'CAMERAS NEAR THIS AIRCRAFT',
        honestyWithResults: honesty,
        honestyEmpty: honesty,
        listLead: (n) => `${n} live camera${n > 1 ? 's' : ''} within ${radiusKm} km of the aircraft:`,
        emptyText: `No live cameras in the loaded index within ${radiusKm} km of this aircraft.`,
      });
    };
    return () => {
      if ((window as any).__weNearbyCam) delete (window as any).__weNearbyCam;
      if ((window as any).__weFlightCams) delete (window as any).__weFlightCams;
    };
  }, []);
  const flightBlendRef = useRef<FlightBlend | null>(null);

  // ── Aircraft follow camera (Phase 3.1, lib/flights/follow) ──
  // The state machine and camera maths are pure (lib/flights/follow);
  // this block owns the MapLibre side: engage/exit, the maxPitch raise
  // (forward view pitches past the terrain manager's 60° cap), the
  // popup/panel/Director bridge, and the per-tick drive inside the
  // existing flight render loop — no second interval, no second position
  // pipeline: the camera consumes the same FlightBlend output the
  // markers draw. Interaction contract mirrors the follow contract: drag
  // releases (camera stays), the HUD's Exit restores the pre-follow view.
  const flightFollowRef = useRef<FlightFollowState>(IDLE_FLIGHT_FOLLOW);
  const flightFollowHudRef = useRef<FollowHudData | null>(null);
  const flightFollowPrevMaxPitchRef = useRef<number | null>(null);
  const [flightFollowUi, setFlightFollowUi] = useState<{ icao24: string; callsign: string; mode: FollowMode } | null>(null);
  const [flightFollowNotice, setFlightFollowNotice] = useState<string | null>(null);
  const flightFollowNoticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Last aircraft clicked on the globe — the Director preset's target. */
  const [selectedFlight, setSelectedFlight] = useState<{ icao24: string; callsign: string } | null>(null);

  // ── Premium flight path (lib/flights/path) ──
  // While a Pro user follows an aircraft, the globe also draws its whole
  // path: the scheduled great-circle route (ROUTE — PLANNED, from
  // /api/flight-route) and the trail of reported fixes recorded since
  // this follow began (FLOWN — LIVE TRACK). Follow itself stays free;
  // only the path is gated, by the same session-JWT check the globe uses
  // everywhere else (subscriptionStatus === 'active', trials included).
  const flightPathRef = useRef<FlightPathState | null>(null);
  /** The flight popup currently open, so fresh snapshots can refresh
   *  its readouts (lib: the snapshot effect below). Cleared on close. */
  const openFlightPopupRef = useRef<{ icao24: string } | null>(null);
  /** Last time the flown-track layer was re-synced mid-interval (3d). */
  const lastPathTipSyncRef = useRef(0);
  const flightPathAccessRef = useRef<FlightPathAccess>('unknown');
  const [flightPathAccessState, setFlightPathAccessState] = useState<FlightPathAccess>('unknown');
  const [flightPathUi, setFlightPathUi] = useState<FlightPathHudData | null>(null);

  useEffect(() => {
    let live = true;
    fetch('/api/auth/session', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => {
        if (!live) return;
        const a = flightPathAccess(s);
        flightPathAccessRef.current = a;
        setFlightPathAccessState(a);
      })
      .catch(() => {
        if (!live) return;
        flightPathAccessRef.current = 'signed-out';
        setFlightPathAccessState('signed-out');
      });
    return () => { live = false; };
  }, []);

  const syncFlightPathUi = useCallback(() => {
    if (flightFollowRef.current.phase === 'idle' || !flightPathRef.current) {
      setFlightPathUi(null);
      return;
    }
    const hud = flightFollowHudRef.current;
    setFlightPathUi(flightPathHudData(
      flightPathRef.current,
      flightPathAccessRef.current,
      hud ? { lng: hud.lng, lat: hud.lat } : null,
    ));
  }, []);

  // Access resolving (or upgrading) mid-follow: the HUD catches up here;
  // the drive loop's fetch trigger does the rest.
  useEffect(() => { syncFlightPathUi(); }, [flightPathAccessState, syncFlightPathUi]);

  /** Push the current path state into the map's GeoJSON source, creating
   *  source + layers on first use. Lines update on poll cadence (trail
   *  sampling, route resolution) — never per render frame. */
  const syncFlightPathLayer = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const SRC = 'flight-path';
    const state = flightPathRef.current;
    const show = !!state && flightPathAccessRef.current === 'pro';
    const hud = flightFollowHudRef.current;
    const features = show && state
      ? flightPathFeatures(state, hud ? { lng: hud.lng, lat: hud.lat } : null)
      : [];
    const fc = { type: 'FeatureCollection' as const, features };
    const src = map.getSource(SRC) as maplibregl.GeoJSONSource | undefined;
    if (!src) {
      if (!show || !map.isStyleLoaded()) return;
      map.addSource(SRC, { type: 'geojson', data: fc as never });
      const beforeId = map.getLayer('fl-commercial') ? 'fl-commercial' : undefined;
      map.addLayer({
        id: 'flight-path-route', type: 'line', source: SRC,
        filter: ['==', ['get', 'kind'], 'route'],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#FFB300', 'line-width': 2, 'line-opacity': 0.8, 'line-dasharray': [2, 2] },
      }, beforeId);
      map.addLayer({
        id: 'flight-path-flown', type: 'line', source: SRC,
        filter: ['==', ['get', 'kind'], 'flown'],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#00E5FF', 'line-width': 2.5, 'line-opacity': 0.9 },
      }, beforeId);
      map.addLayer({
        id: 'flight-path-endpoints', type: 'circle', source: SRC,
        filter: ['match', ['get', 'kind'], ['origin', 'destination'], true, false],
        paint: {
          'circle-radius': 4.5, 'circle-color': '#FFFFFF',
          'circle-stroke-width': 2, 'circle-stroke-color': '#FFB300',
        },
      }, beforeId);
      map.addLayer({
        id: 'flight-path-progress', type: 'circle', source: SRC,
        filter: ['==', ['get', 'kind'], 'progress'],
        paint: {
          'circle-radius': 4, 'circle-color': '#00E5FF',
          'circle-stroke-width': 1.5, 'circle-stroke-color': '#FFFFFF',
        },
      }, beforeId);
      map.addLayer({
        id: 'flight-path-endpoint-labels', type: 'symbol', source: SRC,
        filter: ['match', ['get', 'kind'], ['origin', 'destination'], true, false],
        layout: {
          'text-field': ['get', 'label'], 'text-size': 10,
          'text-font': ['Open Sans Bold'], 'text-offset': [0, 1.5],
          'text-allow-overlap': true,
        },
        paint: { 'text-color': '#FFB300', 'text-halo-color': '#0C0E1A', 'text-halo-width': 1.5 },
      }, beforeId);
      return;
    }
    src.setData(fc as never);
  }, []);

  const showFlightFollowNotice = useCallback((text: string) => {
    setFlightFollowNotice(text);
    if (flightFollowNoticeTimer.current) clearTimeout(flightFollowNoticeTimer.current);
    flightFollowNoticeTimer.current = setTimeout(() => setFlightFollowNotice(null), 7000);
  }, []);

  const endFlightFollow = useCallback((opts?: { restore?: boolean; notice?: string }) => {
    const map = mapRef.current;
    const st = flightFollowRef.current;
    flightFollowRef.current = IDLE_FLIGHT_FOLLOW;
    flightFollowHudRef.current = null;
    setFlightFollowUi(null);
    // Exiting follow clears the premium path with it.
    flightPathRef.current = null;
    setFlightPathUi(null);
    syncFlightPathLayer();
    if (st.phase === 'idle') return;
    if (map) {
      // Restore the pitch limit follow raised — but only if it is still
      // the value follow set (the terrain manager may have re-claimed it).
      if (flightFollowPrevMaxPitchRef.current != null) {
        if (map.getMaxPitch() === FOLLOW_MAX_PITCH) map.setMaxPitch(flightFollowPrevMaxPitchRef.current);
        flightFollowPrevMaxPitchRef.current = null;
      }
      if (opts?.restore && st.savedCamera) {
        const s = st.savedCamera;
        map.easeTo({ center: s.center, zoom: s.zoom, pitch: s.pitch, bearing: s.bearing, duration: 1400 });
      }
    }
    if (opts?.notice) showFlightFollowNotice(opts.notice);
  }, [showFlightFollowNotice, syncFlightPathLayer]);

  const engageFlightFollow = useCallback((icao24: string, callsign?: string, mode?: FollowMode) => {
    const map = mapRef.current;
    if (!map || !icao24) return;
    const cs = (callsign || '').trim() || icao24.toUpperCase();
    setSelectedFlight({ icao24, callsign: cs });
    const cur = flightFollowRef.current;
    if (cur.phase !== 'idle' && cur.target?.icao24 === icao24) return; // already riding this one
    const c = map.getCenter();
    const fresh: SavedCameraState = {
      center: [c.lng, c.lat], zoom: map.getZoom(), pitch: map.getPitch(), bearing: map.getBearing(),
    };
    // Switching targets mid-follow keeps the ORIGINAL pre-follow camera
    // as the restore point — Exit should take the user back to where
    // they started following, not to the previous aircraft.
    const savedCamera = cur.phase !== 'idle' && cur.savedCamera ? cur.savedCamera : fresh;
    // An explicit mode wins: the popup's COCKPIT VIEW asks for
    // 'forward' even when a follow is already riding another aircraft
    // in a different mode. Without one, the historic default holds —
    // carry the current mode across a target switch, 'chase' fresh.
    const startMode: FollowMode = mode ?? (cur.phase !== 'idle' ? cur.mode : 'chase');
    if (flightFollowPrevMaxPitchRef.current == null) {
      flightFollowPrevMaxPitchRef.current = map.getMaxPitch();
      map.setMaxPitch(FOLLOW_MAX_PITCH);
    }
    flightFollowRef.current = startFollow({ icao24, callsign: cs }, savedCamera, Date.now(), startMode);
    flightFollowHudRef.current = null;
    setFlightFollowUi({ icao24, callsign: cs, mode: startMode });
    // A fresh path per followed aircraft: switching targets swaps the
    // path (the route fetch + trail start over for the new aircraft).
    flightPathRef.current = createFlightPath(icao24, cs);
    syncFlightPathLayer();
    syncFlightPathUi();
    popupRef.current?.remove();
  }, [syncFlightPathLayer, syncFlightPathUi]);

  const setFlightFollowMode = useCallback((mode: FollowMode) => {
    const st = flightFollowRef.current;
    if (st.phase === 'idle') return;
    flightFollowRef.current = setFollowModeState(st, mode, Date.now());
    setFlightFollowUi((prev) => (prev ? { ...prev, mode } : prev));
  }, []);

  /** COCKPIT VIEW — ride the aircraft in forward mode. From the popup:
   *  a fresh engage goes straight to forward; if follow is already
   *  riding THIS aircraft in another mode, just turn the camera
   *  forward (no re-engage, no stop). */
  const engageFlightCockpit = useCallback((icao24: string, callsign?: string) => {
    const st = flightFollowRef.current;
    if (st.phase !== 'idle' && st.target?.icao24 === icao24) {
      setFlightFollowMode('forward');
      popupRef.current?.remove();
      return;
    }
    engageFlightFollow(icao24, callsign, 'forward');
  }, [engageFlightFollow, setFlightFollowMode]);

  // Popup buttons, Watch-panel rows and the Director preset all reach
  // follow through this one bridge — the osirisWatchFlight pattern.
  useEffect(() => {
    (window as any).__weFlightFollowToggle = (icao24: string, callsign?: string) => {
      const st = flightFollowRef.current;
      if (st.phase !== 'idle' && st.target?.icao24 === icao24) endFlightFollow();
      else engageFlightFollow(icao24, callsign);
    };
    (window as any).__weFlightCockpitView = (icao24: string, callsign?: string) => {
      engageFlightCockpit(icao24, callsign);
    };
    return () => {
      if ((window as any).__weFlightFollowToggle) delete (window as any).__weFlightFollowToggle;
      if ((window as any).__weFlightCockpitView) delete (window as any).__weFlightCockpitView;
    };
  }, [engageFlightFollow, endFlightFollow, engageFlightCockpit]);

  // Dragging the map releases the follow (the follow contract): the
  // camera stays where the user put it; only the HUD Exit restores.
  useEffect(() => {
    if (!flightFollowUi) return;
    const map = mapRef.current;
    if (!map) return;
    const release = () => endFlightFollow();
    map.on('dragstart', release);
    return () => { map.off('dragstart', release); };
  }, [flightFollowUi, endFlightFollow]);

  /**
   * One tick of the follow drive, called from the flight render loop
   * with that loop's own blended buckets — the camera follows exactly
   * the positions the markers show. Ends the follow (with a plain
   * notice) when the target's layer is off or the target has been
   * missing past the grace window.
   */
  const driveFlightFollow = useCallback((cur: FlightBuckets | undefined, now: number) => {
    const map = mapRef.current;
    const st = flightFollowRef.current;
    if (!map || st.phase === 'idle' || !st.target) return;
    const targetRef = st.target;
    const hex = targetRef.icao24;
    const layers = activeLayersRef.current as any;
    const search: Array<[any[] | undefined, boolean]> = [
      [cur?.commercial_flights, !!layers.flights],
      [cur?.private_flights, !!layers.private],
      [cur?.private_jets, !!layers.jets],
      [cur?.military_flights, !!layers.military],
    ];
    let fix: any = null;
    let bucketOn = true;
    for (const [arr, on] of search) {
      const hit = arr?.find((f: any) => f.icao24 === hex);
      if (hit) { fix = hit; bucketOn = on; break; }
    }
    if (fix && !bucketOn) {
      endFlightFollow({ notice: 'FLIGHT LAYER OFF — FOLLOW ENDED' });
      return;
    }
    if (fix) {
      flightFollowRef.current = noteFollowSeen(st, fix, now);
      // Premium path: resolve the scheduled route once per follow (Pro
      // only — free users get the lock in the HUD, not the API spend),
      // and re-create the layers if a basemap switch wiped the source.
      const ps = flightPathRef.current;
      if (ps && ps.icao24 === hex) {
        if (ps.routeStatus === 'idle' && flightPathAccessRef.current === 'pro') {
          flightPathRef.current = beginRouteFetch(ps);
          syncFlightPathUi();
          const routeParams = new URLSearchParams({
            callsign: (fix.callsign || targetRef.callsign || '').replace(/\s+/g, ''),
            icao24: hex,
            lat: String(fix.lat),
            lng: String(fix.lng),
            speed: String(fix.speed_knots || 0),
          });
          fetch(`/api/flight-route?${routeParams}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((json) => {
              const curPath = flightPathRef.current;
              if (!curPath || curPath.icao24 !== hex) return; // follow moved on
              flightPathRef.current = resolveFlightPathRoute(curPath, parseFlightRouteResponse(json));
              syncFlightPathLayer();
              syncFlightPathUi();
            })
            .catch(() => {
              const curPath = flightPathRef.current;
              if (!curPath || curPath.icao24 !== hex) return;
              flightPathRef.current = resolveFlightPathRoute(curPath, null);
              syncFlightPathLayer();
              syncFlightPathUi();
            });
        } else if (flightPathAccessRef.current === 'pro' && !map.getSource('flight-path')) {
          syncFlightPathLayer();
        }
      }
      const s2 = flightFollowRef.current;
      const target = followCameraTarget(s2.mode, fix, now - s2.modeSince, map.getBearing());
      map.easeTo({
        center: target.center, zoom: target.zoom, pitch: target.pitch, bearing: target.bearing,
        duration: s2.phase === 'engaging' ? 1500 : 500, // == the render tick: each ease completes as the next blended target lands (650ms perpetually restarted mid-ease and pulsed)
      });
      if (s2.phase === 'engaging') flightFollowRef.current = { ...s2, phase: 'following' };
      flightFollowHudRef.current = {
        callsign: fix.callsign || targetRef.callsign,
        icao24: hex,
        lat: fix.lat,
        lng: fix.lng,
        alt: typeof fix.alt === 'number' ? fix.alt : null,
        speedKnots: typeof fix.speed_knots === 'number' ? fix.speed_knots : null,
        headingDeg: headingOf(fix, target.bearing),
        fix: describeFix(flightBlendRef.current?.timing(now) ?? null, now),
        missing: false,
      };
      // Between polls the marker glides on the blend, but the flown
      // line is drawn from the path state — re-sync it against the
      // fresh HUD position every couple of seconds so its tip keeps
      // tracking the aircraft while following, not just on snapshots.
      const psNow = flightPathRef.current;
      if (
        psNow && psNow.icao24 === hex &&
        flightPathAccessRef.current === 'pro' &&
        now - lastPathTipSyncRef.current > 2000
      ) {
        lastPathTipSyncRef.current = now;
        syncFlightPathLayer();
      }
    } else {
      // Not in the blended output: hold the camera, flag the HUD, and
      // let the grace window decide whether this was a hiccup or a
      // departure from coverage.
      if (flightFollowHudRef.current) {
        flightFollowHudRef.current = {
          ...flightFollowHudRef.current,
          missing: true,
          fix: describeFix(flightBlendRef.current?.timing(now) ?? null, now),
        };
      }
      if (followLostExpired(st, now)) {
        endFlightFollow({ notice: `${targetRef.callsign} LEFT LIVE COVERAGE — FOLLOW ENDED` });
      }
    }
  }, [endFlightFollow, syncFlightPathLayer, syncFlightPathUi]);
  /* The Live Alert pins currently drawn, and the opener for one of them, so
     the feed's locate button can land on a pin and open it. */
  const alertPinsRef = useRef<AlertPinFeature[]>([]);
  const openAlertPinRef = useRef<((id: string) => void) | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Do not replay an earlier explicit zoom request after theme/retry remounts.
  const lastTerrainFocus = useRef(terrainFocus);
  const wasNavigating = useRef(false);
  /**
   * What the map's own layers draw with, mirrored out of the `--map-*` custom
   * properties. Held in state rather than read at each use so a change re-runs
   * the recolour effects; held in a ref as well for the click handlers, which
   * are registered once on load and would otherwise close over the first value.
   */
  const [palette, setPalette] = useState<MapPalette>(MAP_DEFAULTS);
  const paletteRef = useRef(palette);
  useEffect(() => { paletteRef.current = palette; }, [palette]);
  const onReadyRef = useRef(onReady);
  useEffect(() => { onReadyRef.current = onReady; }, [onReady]);

  // ── Sensor effects (SIMULATED visual effects) ──
  // A CSS filter on the map CANVAS element only. In MapLibre's DOM the
  // popups, controls and attribution are siblings of the canvas, so the
  // interface stays unfiltered and readable; CameraViewer is a separate
  // component and structurally out of reach — live camera footage is never
  // filtered. The CRT scanline overlay sits between the canvas container
  // and the control container: above the canvas, below controls and below
  // any popup (popups append after it). On a low-power device (small
  // viewport AND very few cores) the effect refuses rather than taxing the
  // map, and the chip says so instead of silently doing nothing.
  const [sensorRefused, setSensorRefused] = useState(false);
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || !sensorEffect) return;
    const lowPower = typeof window !== 'undefined' && isLowPowerDevice({
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      hardwareConcurrency: typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : undefined,
    });
    const plan = sensorEffectPlan(sensorEffect, {
      lowPower,
      svgFilters: typeof navigator !== 'undefined' ? supportsSvgFilterReference(navigator.userAgent) : true,
    });
    setSensorRefused(plan.result === 'refused');
    // Apply to the canvas CONTAINER, not the canvas element: iOS
    // Safari/WebKit does not composite CSS filters onto a full-screen WebGL
    // canvas (the effect silently never painted on iPhones while desktop
    // Chrome worked), while a plain HTML element is filtered reliably by
    // every engine. Popups, controls and attribution are siblings of the
    // canvas container inside the map container, so the interface stays
    // unfiltered. (globals.css already filters this same element for the
    // map-focus dim; the inline style wins while an effect is on and is
    // cleared back to '' when off/refused.)
    const surface = typeof map.getCanvasContainer === 'function' ? map.getCanvasContainer() : map.getCanvas();
    surface.style.filter = plan.filterCss;
    const container = map.getContainer();
    let overlay = container.querySelector<HTMLDivElement>('[data-we-crt-overlay]');
    if (plan.crtOverlay) {
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.dataset.weCrtOverlay = '1';
        overlay.style.cssText = 'position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg, rgba(0,0,0,0.22) 0px, rgba(0,0,0,0.22) 1px, transparent 1px, transparent 3px);';
        container.insertBefore(overlay, container.children[1] ?? null);
      }
      overlay.style.display = '';
      overlay.style.opacity = String(plan.crtOpacity);
    } else if (overlay) {
      overlay.style.display = 'none';
    }
  }, [mapReady, sensorEffect]);

  const sensorActive = !!sensorEffect && sensorEffect.mode !== 'off';
  const sensorChipText = !sensorActive
    ? null
    : sensorRefused
      ? 'DISABLED ON THIS DEVICE TO PROTECT MAP PERFORMANCE'
      : `${sensorEffectLabel(sensorEffect.mode).toUpperCase()} · SIMULATED VISUAL EFFECT — NOT SENSOR DATA`;
  const thermalTables = thermalTableValues(sensorEffect?.intensity ?? 1);
  const prevDrawnPolygonsRef = useRef<string[]>([]);
  const prevArcgisLayersRef = useRef<string[]>([]);
  const satLayerRef = useRef<ReturnType<typeof createSatelliteLayer> | null>(null);
  const cloudLayerRef = useRef<ReturnType<typeof createCloudLayer> | null>(null);
  const onOiGlobeRef = useRef(onOiGlobe);
  const onOiSelectRef = useRef(onOiSelect);
  const onOiHoverRef = useRef(onOiHover);
  const onOiFollowRef = useRef(onOiFollow);
  const oiGlobeRef = useRef<OiGlobe | null>(null);
  useEffect(() => {
    onOiGlobeRef.current = onOiGlobe;
    onOiSelectRef.current = onOiSelect;
    onOiHoverRef.current = onOiHover;
    onOiFollowRef.current = onOiFollow;
  }, [onOiGlobe, onOiSelect, onOiHover, onOiFollow]);
  // pick() returns an index into the array last handed to setPoints, so the
  // matching catalogue rows are kept in the same order to resolve it.
  const satRowsRef = useRef<SatelliteRow[]>([]);
  /** Index of the selected satellite in the array last handed to setPoints. */
  const satPickedRef = useRef<number | null>(null);
  /** The selection's NORAD id. The index moves whenever the catalogue is
   *  re-polled and re-filtered; the id does not, so it is what identifies the
   *  selection across a refresh and what discards a late orbit reply. */
  const satSelectedIdRef = useRef<string | null>(null);
  /** When the catalogue positions were propagated for, so an orbit can be drawn
   *  around the marker rather than around the moment it was clicked. */
  const satEpochRef = useRef<number | null>(null);
  const [selectedSat, setSelectedSat] = useState<SatelliteDetail | null>(null);

  /** Drops the selection: the ring, the orbit track and the readout together.
   *  Leaving any one of them behind is what made a closed popup look like a
   *  still-selected satellite. */
  const clearSat = useCallback(() => {
    if (satPickedRef.current === null && satSelectedIdRef.current === null) return;
    satPickedRef.current = null;
    satSelectedIdRef.current = null;
    satLayerRef.current?.setSelected(null);
    satLayerRef.current?.setOrbit(null);
    setSelectedSat(null);
  }, []);
  const drawingCoordsRef = useRef<number[][]>([]);

  // Create aircraft icons on canvas (for WebGL symbol layers). The glyph
  // shapes live in drawPlaneGlyph / drawHeliGlyph (module scope), shared
  // with the theme-switch recolour so boot and recolour can't drift.
  const createIcon = useCallback((map: maplibregl.Map, id: string, color: string, size: number) => {
    if (map.hasImage(id)) return;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    drawPlaneGlyph(ctx, color, size);
    map.addImage(id, { width: size, height: size, data: new Uint8Array(ctx.getImageData(0, 0, size, size).data) });
  }, []);

  const createHeliIcon = useCallback((map: maplibregl.Map, id: string, color: string, size: number) => {
    if (map.hasImage(id)) return;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    drawHeliGlyph(ctx, color, size);
    map.addImage(id, { width: size, height: size, data: new Uint8Array(ctx.getImageData(0, 0, size, size).data) });
  }, []);

  const createDot = useCallback((map: maplibregl.Map, id: string, color: string, size: number) => {
    if (map.hasImage(id)) return;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(size/2, size/2, size/2 - 1, 0, Math.PI * 2);
    ctx.fill();
    map.addImage(id, { width: size, height: size, data: new Uint8Array(ctx.getImageData(0, 0, size, size).data) });
  }, []);

  /* Swap the photo artwork in over the glyph image ids (see
   * AIRCRAFT_PHOTO_BY_ICON). Safe to call repeatedly: each call re-adds
   * the same photo data under the same ids. A failed load leaves the
   * glyph fallback untouched. */
  const installPhotoIcons = useCallback((map: maplibregl.Map) => {
    // The camera eye (owner's artwork): every CCTV marker on the map.
    void loadAircraftPhoto('/icons/camera-eye.png').then((img) => {
      if (!img) return;
      try {
        const data = aircraftPhotoData(img);
        if (map.hasImage('camera-eye')) map.removeImage('camera-eye');
        map.addImage('camera-eye', data, { pixelRatio: AIRCRAFT_PHOTO_PX / 24 });
      } catch { /* a later call (boot/theme) retries */ }
    });
    // The earthquake pin (owner's artwork): every quake marker. Wider
    // canvas footprint than the planes — the pin + ripple base is the
    // marker, anchored at its bottom so the ripples sit on the epicentre.
    void loadAircraftPhoto('/icons/earthquake-pin.png').then((img) => {
      if (!img) return;
      try {
        const data = aircraftPhotoData(img);
        if (map.hasImage('earthquake-pin')) map.removeImage('earthquake-pin');
        map.addImage('earthquake-pin', data, { pixelRatio: AIRCRAFT_PHOTO_PX / 34 });
      } catch { /* a later call (boot/theme) retries */ }
    });
    // The wildfire pin (owner's artwork): every fire marker.
    void loadAircraftPhoto('/icons/wildfire-pin.png').then((img) => {
      if (!img) return;
      try {
        const data = aircraftPhotoData(img);
        if (map.hasImage('wildfire-pin')) map.removeImage('wildfire-pin');
        map.addImage('wildfire-pin', data, { pixelRatio: AIRCRAFT_PHOTO_PX / 34 });
      } catch { /* a later call (boot/theme) retries */ }
    });
    // The hurricane pin (owner's artwork): every active storm's
    // current position.
    void loadAircraftPhoto('/icons/hurricane-pin.png').then((img) => {
      if (!img) return;
      try {
        const data = aircraftPhotoData(img);
        if (map.hasImage('hurricane-pin')) map.removeImage('hurricane-pin');
        map.addImage('hurricane-pin', data, { pixelRatio: AIRCRAFT_PHOTO_PX / 34 });
      } catch { /* a later call (boot/theme) retries */ }
    });
    // The snow plow pin (owner's artwork): every live plow marker.
    void loadAircraftPhoto('/icons/snowplow-pin.png').then((img) => {
      if (!img) return;
      try {
        const data = aircraftPhotoData(img);
        if (map.hasImage('snowplow-pin')) map.removeImage('snowplow-pin');
        map.addImage('snowplow-pin', data, { pixelRatio: AIRCRAFT_PHOTO_PX / 34 });
      } catch { /* a later call (boot/theme) retries */ }
    });
    // The maritime pin (owner's artwork): ports and naval bases.
    void loadAircraftPhoto('/icons/maritime-pin.png').then((img) => {
      if (!img) return;
      try {
        const data = aircraftPhotoData(img);
        if (map.hasImage('maritime-pin')) map.removeImage('maritime-pin');
        map.addImage('maritime-pin', data, { pixelRatio: AIRCRAFT_PHOTO_PX / 34 });
      } catch { /* a later call (boot/theme) retries */ }
    });
    // The weather-hazard pins (owner's artwork): tornado warnings,
    // severe storms and tsunami alerts in the weather-events source.
    for (const [id, url] of Object.entries({
      'tornado-pin': '/icons/tornado-pin.png',
      'lightning-pin': '/icons/lightning-pin.png',
      'tsunami-pin': '/icons/tsunami-pin.png',
    })) {
      void loadAircraftPhoto(url).then((img) => {
        if (!img) return;
        try {
          const data = aircraftPhotoData(img);
          if (map.hasImage(id)) map.removeImage(id);
          map.addImage(id, data, { pixelRatio: AIRCRAFT_PHOTO_PX / 34 });
        } catch { /* a later call (boot/theme) retries */ }
      });
    }
    for (const [id, url] of Object.entries(AIRCRAFT_PHOTO_BY_ICON)) {
      void loadAircraftPhoto(url).then((img) => {
        if (!img) return;
        try {
          const data = aircraftPhotoData(img);
          if (map.hasImage(id)) map.removeImage(id);
          map.addImage(id, data, { pixelRatio: AIRCRAFT_PHOTO_PX / 24 });
        } catch { /* a later call (boot/theme) retries */ }
      });
    }
    // The transit mode artwork (the owner's staged bus / train
    // graphics): real per-mode markers at street zoom. A plain dot is
    // registered under each id at layer setup so the symbol layers
    // never point at a missing image; the artwork swaps in over it
    // the moment it loads (the camera-eye pattern).
    for (const [id, url] of Object.entries({
      'transit-bus': '/icons/transit-bus.png',
      'transit-train': '/icons/transit-train.png',
    })) {
      void loadAircraftPhoto(url).then((img) => {
        if (!img) return;
        try {
          const data = aircraftPhotoData(img);
          if (map.hasImage(id)) map.removeImage(id);
          map.addImage(id, data, { pixelRatio: AIRCRAFT_PHOTO_PX / 30 });
        } catch { /* a later call (boot/theme) retries */ }
      });
    }
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // ── DEMO MODE SPINNING ──
    let spinReq: number | undefined = undefined;
    let isSpinning = false;
    
    const startSpinning = () => {
      if (!map) return;
      isSpinning = true;
      let lastTime = performance.now();
      
      const frame = (time: number) => {
        if (!isSpinning) return;
        
        // Only spin if the user is not actively dragging or zooming the map
        if (!map.isMoving() && !map.isZooming()) {
          const dt = time - lastTime;
          const center = map.getCenter();
          // Adjust spin speed: 0.5 degrees per second
          center.lng += (0.5 * dt) / 1000;
          map.setCenter(center);
        }
        
        lastTime = time;
        spinReq = requestAnimationFrame(frame);
      };
      
      spinReq = requestAnimationFrame(frame);
    };

    if (demoMode) {
      startSpinning();
    } else {
      isSpinning = false;
      if (spinReq) cancelAnimationFrame(spinReq);
    }

    return () => {
      isSpinning = false;
      if (spinReq) cancelAnimationFrame(spinReq);
      if (typeof window !== 'undefined' && (window as any)._globeSpinTimer) {
        clearInterval((window as any)._globeSpinTimer);
      }
    };
  }, [mapReady, demoMode]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    
    // Select basemap style
    const styleUrl = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

    const container = containerRef.current;
    maplibregl.setWorkerUrl(`/vendor/maplibre/${maplibregl.getVersion()}/maplibre-gl-worker.mjs`);
    /* Open on the whole globe, turned to the viewer's side of it. The UTC
       offset is a free, instant stand-in for longitude (15° an hour), so the
       fly-in to their city after the splash is a dive, not a spin round the
       planet. This used to open on Bulgaria at zoom 6.5 for everyone. */
    const facingLng = Math.max(-180, Math.min(180, -new Date().getTimezoneOffset() / 4));
    const baseOptions = {
      container,
      style: styleUrl,
      center: [facingLng, 20] as [number, number], zoom: 1.8, minZoom: 1.5, maxZoom: 18,
      /* The basemap is CARTO's, drawn from OpenStreetMap, and the places on it
         are searched and named through OpenStreetMap too. Both have to be
         credited on the map itself; this was switched off, which is half of
         what Nominatim's operators asked us to put right (issue #16). It is
         collapsed by default so it costs a corner icon, not the view. */
      attributionControl: {
        compact: true,
        // The style credits CARTO and OSM for the map; this credits OSM for the
        // search results, place names and pins that come from Nominatim.
        customAttribution: 'Geocoding © OpenStreetMap contributors',
      } as const,
      maxPitch: 85,
      transformRequest: (url: string) => {
        // Route all CARTO CDN requests through the internal Next.js proxy API
        if (url.includes('cartocdn.com')) {
          const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
          return { url: `${baseUrl}/api/proxy-tiles?url=${encodeURIComponent(url)}` };
        }
        return { url };
      },
    };

    // MapLibre asks for a high-performance WebGL2 context and throws outright if it
    // cannot get one. Some machines refuse that exact request while still granting a
    // plainer one, so walk down to weaker requests before giving up. The WebGL1 rung
    // this used to have cannot come back: MapLibre 6's ContextType is 'webgl2' alone,
    // so machines that only ever managed WebGL1 are now out of reach either way.
    // Dropping antialias is the last rung left for a struggling GPU.
    const attributeFallbacks: maplibregl.MapOptions['canvasContextAttributes'][] = [
      undefined,
      { powerPreference: 'low-power', failIfMajorPerformanceCaveat: false },
      { powerPreference: 'low-power', failIfMajorPerformanceCaveat: false, antialias: false },
    ];

    let map: maplibregl.Map | undefined;
    for (const canvasContextAttributes of attributeFallbacks) {
      try {
        map = new maplibregl.Map(
          canvasContextAttributes ? { ...baseOptions, canvasContextAttributes } : baseOptions
        );
        break;
      } catch (e) {
        // A failed constructor leaves its canvas behind; the next attempt needs a clean container.
        container.innerHTML = '';
        if (canvasContextAttributes === attributeFallbacks[attributeFallbacks.length - 1]) throw e;
        console.warn('[OSIRIS] WebGL context rejected, retrying with weaker attributes:', e instanceof Error ? e.message : e);
      }
    }
    if (!map) return;

    map.on('load', () => {
      mapRef.current = map;

      /* Measure the container once the layout has settled. The constructor
         may have read it before it had a size, and a map that starts at the
         400x300 fallback never recovers on its own. */
      map.resize();

      // Theme colors
      const isGhost = theme === 'ghost';
      const phantomPurple = '#B388FF';
      const phantomDark = '#1A0040';
      /* The first paint reads the same `--map-*` properties the recolour
         effects below push in later. Deriving them from `theme` here as well
         is what let the two drift: the effect's ghost palette was four
         distinct violets, this block's was one, and whichever ran last won. */
      const bootStyle = getComputedStyle(document.body);
      const boot = readMapPalette(name => bootStyle.getPropertyValue(name));
      const cameraColor = boot.cctv;
      const flightCom = boot.flightCivil;
      const flightPriv = boot.flightPrivate;
      const flightGov = boot.flightGov;
      const flightMil = boot.flightMilitary;

      // Create icons — OSIRIS Unified Palette
      createIcon(map, 'plane-cyan', flightCom, 24);   
      createIcon(map, 'plane-green', flightPriv, 24);   
      createIcon(map, 'plane-pink', flightGov, 24);    
      createIcon(map, 'plane-red', flightMil, 24);     
      createIcon(map, 'plane-grey', boot.flightUnknown, 24);
      createHeliIcon(map, 'heli-cyan', flightCom, 24);
      createHeliIcon(map, 'heli-green', flightPriv, 24);
      createHeliIcon(map, 'heli-pink', flightGov, 24);
      createHeliIcon(map, 'heli-red', flightMil, 24);
      createHeliIcon(map, 'heli-grey', boot.flightUnknown, 24);
      // Photo artwork swaps in over the commercial / private / jet /
      // helicopter glyph ids once loaded (glyphs stay as fallback).
      installPhotoIcons(map);
      // Transit artwork placeholders: plain dots under the bus/train
      // image ids until the real graphics swap in (and forever, if an
      // image ever failed to load) — the transit symbol layers must
      // never reference a missing image.
      createDot(map, 'transit-bus', '#FFA726', 48);
      createDot(map, 'transit-train', '#AB47BC', 48);
      // Until the camera-eye photo registers (and forever, if it ever
      // failed to load), a plain dot stands in under the same image id —
      // installPhotoIcons replaces it the moment the photo arrives.
      map.on('styleimagemissing', (e) => {
        if (e.id === 'camera-eye') createDot(map, 'camera-eye', '#34d399', 48);
      });
      createDot(map, 'dot-gold', isGhost ? phantomPurple : '#D4AF37', 8);
      createDot(map, 'dot-red', isGhost ? phantomPurple : '#D32F2F', 10);
      createDot(map, 'dot-orange', isGhost ? phantomPurple : '#E65100', 10);
      createDot(map, 'dot-green', isGhost ? phantomPurple : '#26A69A', 10);
      createDot(map, 'dot-fire', isGhost ? phantomPurple : '#E65100', 10);
      createDot(map, 'dot-cctv', cameraColor, 10);

      const sources = ['flights','military','jets','private-fl','satellites','earthquakes','gdelt','day-night','cctv','fires','weather','infrastructure','maritime','maritime-choke','maritime-ships','live-news','conflict-zones', 'war-alerts-targets', 'war-alerts-lines', 'balloons', 'radiation', 'ip-sweep-devices', 'ip-sweep-pulse', 'ip-sweep-connections', 'scan-targets', 'sdk-entities', 'sdk-links', 'malware-nodes', 'malware-new', 'network-mesh', 'cyber-heads', 'gdelt-events', 'cf-outages', 'cf-attacks', 'alert-pins', 'fire-perimeters', 'hurricanes', 'plows', 'river-gauges', 'alert-cams', 'gbfs', 'transit', 'transit-routes', 'transit-stops', 'traffic-roads', 'traffic-vehicles', 'launches', 'launch-replay', 'street-level'];
      sources.forEach(s => map.addSource(s, { type: 'geojson', data: EMPTY_FC }));
      // Clustered twin of the transit vehicle source: at globe /
      // regional zoom the vehicles collapse into count bubbles instead
      // of thousands of dots. The vehicles render loop feeds both
      // sources the same subdivision-filtered features.
      map.addSource('transit-clusters', { type: 'geojson', data: EMPTY_FC, cluster: true, clusterRadius: 56, clusterMaxZoom: 9 } as any);

      // US state + territory outlines — a bold double line (dark casing,
      // bright core) so state borders are unmistakable while searching.
      // Static asset generated from Census cartographic boundaries plus
      // the vendored state rings (public/geo/us-boundaries.geojson).
      map.addSource('us-boundaries', { type: 'geojson', data: '/geo/us-boundaries.geojson' });
      map.addLayer({ id: 'us-boundaries-casing', type: 'line', source: 'us-boundaries', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: {
        'line-color': '#000000', 'line-opacity': 0.55,
        'line-width': ['interpolate', ['linear'], ['zoom'], 1, 2.0, 5, 3.6, 10, 5.5],
      }});
      map.addLayer({ id: 'us-boundaries-line', type: 'line', source: 'us-boundaries', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: {
        'line-color': '#F5F2E8', 'line-opacity': 0.92,
        'line-width': ['interpolate', ['linear'], ['zoom'], 1, 1.1, 5, 2.3, 10, 3.8],
      }});

      // ── FLIGHT ROUTE VISUALIZATION SOURCES & LAYERS ──

      // Warning icon generator (parameterized — eliminates 3x copy-paste)
      const createWarningIcon = (id: string, color: string) => {
        const s = 20;
        const c = document.createElement('canvas');
        c.width = s; c.height = s;
        const ctx = c.getContext('2d')!;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(s/2, 1);
        ctx.lineTo(s - 1, s - 1);
        ctx.lineTo(1, s - 1);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('!', s/2, s - 4);
        map.addImage(id, { width: s, height: s, data: new Uint8Array(ctx.getImageData(0, 0, s, s).data) });
      };
      createWarningIcon('warn-icon', '#D32F2F');
      createWarningIcon('warn-orange', '#E65100');
      createWarningIcon('warn-yellow', '#F9A825');

      map.addLayer({ id: 'conflict-icons', type: 'symbol', source: 'conflict-zones', layout: {
        'icon-image': ['match', ['get','severity'], 'war','warn-icon', 'high','warn-orange', 'warn-yellow'],
        'icon-size': ['interpolate',['linear'],['zoom'], 1,0.6, 4,0.8, 8,1],
        'icon-allow-overlap': true,
        'text-field': ['get','label'],
        'text-size': ['interpolate',['linear'],['zoom'], 1,7, 4,9, 8,11],
        'text-font': ['Open Sans Bold'],
        'text-offset': [0, 1.4],
        'text-allow-overlap': false,
      }, paint: {
        'text-color': ['match', ['get','severity'], 'war','#D32F2F', 'high','#E65100', '#F9A825'],
        'text-halo-color': '#000', 'text-halo-width': 1.5, 'text-opacity': 0.9,
      }});


      // Day/Night
      map.addLayer({ id: 'day-night-fill', type: 'fill', source: 'day-night', paint: { 'fill-color': isGhost ? '#0D0030' : '#000022', 'fill-opacity': 0.35 }});

      // Earthquakes — amber threat spectrum
      map.addLayer({ id: 'eq-circles', type: 'circle', source: 'earthquakes', paint: {
        'circle-radius': ['interpolate',['linear'],['get','magnitude'], 2.5,4, 5,12, 7,24],
        'circle-color': ['interpolate',['linear'],['get','magnitude'], 2.5,'#F9A825', 4,'#E65100', 6,'#D32F2F'],
        'circle-opacity': 0.30, 'circle-blur': 0.3, 'circle-stroke-width': 1, 'circle-stroke-color': '#F9A825', 'circle-stroke-opacity': 0.25,
      }});
      // Earthquake pins — the owner's seismograph-pin artwork, sized by
      // magnitude, anchored at the bottom so the ripple base lands on
      // the epicentre. The circle above stays as the magnitude halo.
      map.addLayer({ id: 'eq-icons', type: 'symbol', source: 'earthquakes', layout: {
        'icon-image': 'earthquake-pin',
        'icon-size': ['interpolate', ['linear'], ['get', 'magnitude'], 2.5, 0.45, 4.5, 0.7, 6, 1.0, 7.5, 1.35],
        'icon-anchor': 'bottom', 'icon-allow-overlap': true, 'icon-ignore-placement': true,
      }, paint: { 'icon-opacity': 0.96 }});
      map.addLayer({ id: 'eq-label', type: 'symbol', source: 'earthquakes', filter: ['>=',['get','magnitude'],4.5], layout: {
        'text-field': ['concat','M',['to-string',['get','magnitude']]], 'text-size': 9, 'text-font': ['Open Sans Regular'], 'text-offset': [0,1.5],
      }, paint: { 'text-color': '#F9A825', 'text-halo-color': '#000', 'text-halo-width': 1 }});

      // Fires — burnt sienna
      map.addLayer({ id: 'fires-heat', type: 'circle', source: 'fires', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,2, 5,4, 10,8],
        'circle-color': '#E65100', 'circle-opacity': 0.30, 'circle-blur': 0.5,
      }});
      // Wildfire pins — the owner's flame-pin artwork, sized by the
      // detection's brightness, from regional zoom up (hotspots are far
      // too dense for pins on the world view; the heat glow carries it).
      map.addLayer({ id: 'fires-icons', type: 'symbol', source: 'fires', minzoom: 3, layout: {
        'icon-image': 'wildfire-pin',
        'icon-size': ['interpolate', ['linear'], ['get', 'brightness'], 300, 0.45, 375, 0.7, 450, 0.95, 550, 1.2],
        'icon-anchor': 'bottom', 'icon-allow-overlap': true, 'icon-ignore-placement': true,
      }, paint: { 'icon-opacity': 0.96 }});

      // Fire Perimeters (NIFC WFIGS) — translucent fill + hot edge
      map.addLayer({ id: 'fire-perim-fill', type: 'fill', source: 'fire-perimeters', paint: {
        'fill-color': '#FF3D00', 'fill-opacity': 0.22,
      }});
      map.addLayer({ id: 'fire-perim-line', type: 'line', source: 'fire-perimeters', paint: {
        'line-color': '#FF6B00', 'line-width': 1.6, 'line-opacity': 0.9,
      }});

      // Snow Plows (IA · UT · VT · ON · MB · SK · AK AVL) — the owner's plow-pin artwork on
      // every live truck; positions republish about every 2 minutes.
      map.addLayer({ id: 'plow-icons', type: 'symbol', source: 'plows', layout: {
        'icon-image': 'snowplow-pin',
        'icon-size': ['interpolate', ['linear'], ['zoom'], 3, 0.5, 7, 0.65, 11, 0.8],
        'icon-anchor': 'bottom', 'icon-allow-overlap': true, 'icon-ignore-placement': true,
      }, paint: { 'icon-opacity': 0.96 }});

      // Hurricanes (NOAA NHC) — cone, past track, forecast track, points
      map.addLayer({ id: 'hurricane-cone', type: 'fill', source: 'hurricanes', filter: ['==', ['get', 'kind'], 'cone'], paint: {
        'fill-color': '#4DD0E1', 'fill-opacity': 0.15,
      }});
      map.addLayer({ id: 'hurricane-cone-line', type: 'line', source: 'hurricanes', filter: ['==', ['get', 'kind'], 'cone'], paint: {
        'line-color': '#4DD0E1', 'line-width': 1, 'line-opacity': 0.5, 'line-dasharray': [3, 2],
      }});
      map.addLayer({ id: 'hurricane-past', type: 'line', source: 'hurricanes', filter: ['==', ['get', 'kind'], 'past'], paint: {
        'line-color': '#90A4AE', 'line-width': 1.5, 'line-opacity': 0.7, 'line-dasharray': [2, 2],
      }});
      map.addLayer({ id: 'hurricane-track', type: 'line', source: 'hurricanes', filter: ['==', ['get', 'kind'], 'track'], paint: {
        'line-color': '#00E5FF', 'line-width': 2, 'line-opacity': 0.9,
      }});
      map.addLayer({ id: 'hurricane-points', type: 'circle', source: 'hurricanes', filter: ['==', ['get', 'kind'], 'point'], paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, 2, 6, 4, 10, 6],
        'circle-color': '#B2EBF2', 'circle-opacity': 0.9, 'circle-stroke-color': '#006064', 'circle-stroke-width': 1,
      }});
      map.addLayer({ id: 'hurricane-current', type: 'circle', source: 'hurricanes', filter: ['==', ['get', 'kind'], 'current'], paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, 5, 6, 8, 10, 12],
        'circle-color': '#FF5252', 'circle-opacity': 0.95, 'circle-stroke-color': '#FFFFFF', 'circle-stroke-width': 1.5,
      }});
      // Hurricane pins — the owner's cyclone artwork on each storm's
      // current position; the red circle stays as the centre marker
      // under the pin tip, cone/track/points unchanged.
      map.addLayer({ id: 'hurricane-icons', type: 'symbol', source: 'hurricanes', filter: ['==', ['get', 'kind'], 'current'], layout: {
        'icon-image': 'hurricane-pin',
        'icon-size': ['interpolate', ['linear'], ['zoom'], 1, 0.65, 6, 0.95, 10, 1.3],
        'icon-anchor': 'bottom', 'icon-allow-overlap': true, 'icon-ignore-placement': true,
      }, paint: { 'icon-opacity': 0.96 }});
      map.addLayer({ id: 'hurricane-label', type: 'symbol', source: 'hurricanes', filter: ['==', ['get', 'kind'], 'current'], layout: {
        'text-field': ['upcase', ['get', 'name']], 'text-size': 10, 'text-font': ['Open Sans Regular'], 'text-offset': [0, 1.6],
      }, paint: { 'text-color': '#FF8A80', 'text-halo-color': '#000', 'text-halo-width': 1 }});
      // Selected-storm highlight (share links + card selection): a
      // pulsing ring + halo on the storm, its past track emphasised,
      // its best-track points shown. Filters start match-nothing and
      // are pointed at the selected storm by applyStormSelection.
      map.addLayer({ id: 'hurricane-selected-past', type: 'line', source: 'hurricanes', filter: ['==', ['get', 'name'], '__none__'], paint: {
        'line-color': '#FF5252', 'line-width': 3.5, 'line-opacity': 0.95,
      }}, 'hurricane-icons');
      map.addLayer({ id: 'hurricane-past-points', type: 'circle', source: 'hurricanes', filter: ['==', ['get', 'name'], '__none__'], paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, 2.5, 6, 4, 10, 6],
        'circle-color': '#FF8A80', 'circle-opacity': 0.9, 'circle-stroke-color': '#4A0E0E', 'circle-stroke-width': 1,
      }}, 'hurricane-icons');
      map.addLayer({ id: 'hurricane-selected-halo', type: 'circle', source: 'hurricanes', filter: ['==', ['get', 'stormId'], '__none__'], paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, 22, 6, 34, 10, 44],
        'circle-color': '#FF5252', 'circle-opacity': 0.13,
      }}, 'hurricane-icons');
      map.addLayer({ id: 'hurricane-selected-ring', type: 'circle', source: 'hurricanes', filter: ['==', ['get', 'stormId'], '__none__'], paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, 16, 6, 25, 10, 34],
        'circle-color': 'rgba(0,0,0,0)', 'circle-opacity': 0,
        'circle-stroke-color': '#FFD54F', 'circle-stroke-width': 3, 'circle-stroke-opacity': 0.95,
      }}, 'hurricane-icons');

      // River Gauges (USGS) — stream-blue dots
      map.addLayer({ id: 'gauge-dots', type: 'circle', source: 'river-gauges', paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, 2, 5, 4, 9, 7],
        'circle-color': '#29B6F6', 'circle-opacity': 0.85, 'circle-stroke-color': '#01579B', 'circle-stroke-width': 0.8,
      }});

      // ALERT Fire Cameras — amber, distinct from the white CCTV mesh
      map.addLayer({ id: 'alert-glow', type: 'circle', source: 'alert-cams', paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, 5, 5, 8, 10, 14, 14, 20],
        'circle-color': '#FF8F00', 'circle-opacity': 0.3, 'circle-blur': 1,
      }});
      map.addLayer({ id: 'alert-dots', type: 'circle', source: 'alert-cams', paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, 3, 5, 5, 10, 8, 14, 12],
        'circle-color': '#FFB300', 'circle-opacity': 0.95, 'circle-stroke-color': '#4E2600', 'circle-stroke-width': 1,
      }});
      map.addLayer({ id: 'alert-label', type: 'symbol', source: 'alert-cams', minzoom: 9, layout: {
        'text-field': ['get', 'name'], 'text-size': 9, 'text-font': ['Open Sans Regular'], 'text-offset': [0, 1.4],
      }, paint: { 'text-color': '#FFCA28', 'text-halo-color': '#000', 'text-halo-width': 1 }});

      // GBFS micromobility — system pins, then station / vehicle dots on zoom
      map.addLayer({ id: 'gbfs-systems', type: 'circle', source: 'gbfs', filter: ['==', ['get', 'kind'], 'system'], paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, 3, 6, 5, 10, 8],
        'circle-color': '#26A69A', 'circle-opacity': 0.9, 'circle-stroke-color': '#004D40', 'circle-stroke-width': 1,
      }});
      map.addLayer({ id: 'gbfs-label', type: 'symbol', source: 'gbfs', filter: ['==', ['get', 'kind'], 'system'], minzoom: 5, layout: {
        'text-field': ['get', 'name'], 'text-size': 9, 'text-font': ['Open Sans Regular'], 'text-offset': [0, 1.3],
      }, paint: { 'text-color': '#80CBC4', 'text-halo-color': '#000', 'text-halo-width': 1 }});
      map.addLayer({ id: 'gbfs-stations', type: 'circle', source: 'gbfs', filter: ['==', ['get', 'kind'], 'station'], paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 3, 12, 6, 16, 9],
        'circle-color': '#66BB6A', 'circle-opacity': 0.95, 'circle-stroke-color': '#1B5E20', 'circle-stroke-width': 1,
      }});
      map.addLayer({ id: 'gbfs-vehicles', type: 'circle', source: 'gbfs', filter: ['==', ['get', 'kind'], 'vehicle'], paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 2, 12, 5, 16, 8],
        'circle-color': '#9CCC65', 'circle-opacity': 0.9, 'circle-stroke-color': '#33691E', 'circle-stroke-width': 1,
      }});

      // Transit NETWORK — the operational layer under the vehicles for
      // agencies with a static GTFS (UTA in v1): route lines in the
      // agency's own route colors (lib/transit/network, served by
      // /api/transit/network) and stop dots, zoom-gated — thousands of
      // stops would be noise below street level. The network effect
      // below pushes the data; any failure leaves these sources empty
      // and the vehicles completely unaffected.
      // Lines paint from city zoom up: at globe zoom one metro's
      // network is sub-pixel noise, and the subdivision filters in
      // lib/transit/subdivisions decide which families show at all.
      map.addLayer({ id: 'transit-routes-line', type: 'line', source: 'transit-routes', minzoom: 8, layout: {
        'line-cap': 'round', 'line-join': 'round',
      }, paint: {
        'line-color': ['get', 'color'],
        'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.8, 10, 1.6, 14, 3],
        'line-opacity': 0.55,
      }});
      // The route picked in the Transit Explorer, drawn over the
      // network (the base lines dim while a selection is active — see
      // the highlight effect).
      map.addLayer({ id: 'transit-route-highlight', type: 'line', source: 'transit-routes', minzoom: 8,
        filter: ['==', ['get', 'routeId'], '__none__'], layout: {
          'line-cap': 'round', 'line-join': 'round',
        }, paint: {
          'line-color': ['get', 'color'],
          'line-width': ['interpolate', ['linear'], ['zoom'], 6, 2, 10, 3.4, 14, 5.5],
          'line-opacity': 0.95,
        }});
      // Route labels ride the lines — an opt-in subdivision
      // (Layers → Route Labels), street zoom only.
      map.addLayer({ id: 'transit-route-labels', type: 'symbol', source: 'transit-routes', minzoom: 13, layout: {
        'symbol-placement': 'line', 'text-field': ['get', 'short'], 'text-size': 9,
        'text-font': ['Open Sans Regular'], 'text-allow-overlap': false,
      }, paint: { 'text-color': '#E8F6FF', 'text-halo-color': '#000000', 'text-halo-width': 1.5, 'text-opacity': 0.9 }});
      map.addLayer({ id: 'transit-stops-dots', type: 'circle', source: 'transit-stops', minzoom: 12.5, paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 12.5, 2.5, 15, 4.5, 17, 6],
        'circle-color': '#ECEFF1', 'circle-opacity': 0.95,
        'circle-stroke-color': '#10222E', 'circle-stroke-width': 1.2,
      }});
      // Stop names only at street zoom, where they stop colliding.
      map.addLayer({ id: 'transit-stops-label', type: 'symbol', source: 'transit-stops', minzoom: 15, layout: {
        'text-field': ['get', 'name'], 'text-size': 9, 'text-font': ['Open Sans Regular'],
        'text-offset': [0, 1.1], 'text-anchor': 'top', 'text-max-width': 14, 'text-allow-overlap': false,
      }, paint: { 'text-color': '#ECEFF1', 'text-halo-color': '#000000', 'text-halo-width': 1.5, 'text-opacity': 0.85 }});

      // Live Transit vehicles, two zoom bands. Below city zoom the
      // cluster bubbles carry the picture (a count, honestly — not
      // fabricated positions). From city zoom up, buses ARE the
      // owner's bus artwork and rail vehicles the train pin (symbol
      // layers below) — the old orange bus dot survives only as the
      // placeholder image registered under the artwork's id, shown
      // if the artwork itself ever fails to load. Modes without
      // artwork (ferries, neutral) keep mode-colored dots at every
      // zoom. Opacity is per-feature (the render
      // loop sets `op`): a vehicle whose newest GPS fix is > 3 min
      // old fades, so a stale marker never reads as live.
      map.addLayer({ id: 'transit-cluster-circles', type: 'circle', source: 'transit-clusters', maxzoom: 10,
        filter: ['has', 'point_count'], paint: {
          'circle-radius': ['step', ['get', 'point_count'], 13, 25, 17, 100, 22, 300, 27],
          'circle-color': 'rgba(56,189,248,0.88)', 'circle-opacity': 0.92,
          'circle-stroke-color': 'rgba(224,242,254,0.9)', 'circle-stroke-width': 1.2,
        }});
      map.addLayer({ id: 'transit-cluster-count', type: 'symbol', source: 'transit-clusters', maxzoom: 10,
        filter: ['has', 'point_count'], layout: {
          'text-field': ['get', 'point_count_abbreviated'], 'text-size': 10, 'text-font': ['Open Sans Regular'],
        }, paint: { 'text-color': '#06283D' }});
      map.addLayer({ id: 'transit-dots', type: 'circle', source: 'transit', minzoom: 10,
        filter: ['in', ['get', 'mode'], ['literal', ['ferry', 'transit']]], paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 3, 8, 5, 12, 8],
        'circle-color': ['match', ['get', 'mode'],
          'bus', '#FFA726', 'tram', '#66BB6A', 'metro', '#42A5F5', 'train', '#AB47BC', 'ferry', '#26C6DA', '#B0BEC5'],
        'circle-opacity': ['coalesce', ['get', 'op'], 0.92], 'circle-stroke-color': '#000000', 'circle-stroke-width': 0.7,
      }});
      map.addLayer({ id: 'transit-icons-bus', type: 'symbol', source: 'transit', minzoom: 10,
        filter: ['==', ['get', 'mode'], 'bus'], layout: {
          'icon-image': 'transit-bus', 'icon-anchor': 'center',
          'icon-size': ['interpolate', ['linear'], ['zoom'], 10, 0.5, 12.5, 0.75, 16, 1.1],
          'icon-allow-overlap': true, 'icon-ignore-placement': true,
        }});
      map.addLayer({ id: 'transit-icons-rail', type: 'symbol', source: 'transit', minzoom: 10,
        filter: ['in', ['get', 'mode'], ['literal', ['tram', 'metro', 'train']]], layout: {
          'icon-image': 'transit-train', 'icon-anchor': 'bottom',
          'icon-size': ['interpolate', ['linear'], ['zoom'], 10, 0.5, 12.5, 0.75, 16, 1.1],
          'icon-allow-overlap': true, 'icon-ignore-placement': true,
        }});
      // Traffic — simulated congestion overlay on real OSM road geometry
      // (roads extracted from the basemap's own tiles; see lib/traffic).
      // Only drawn when TomTom flow isn't supplying the overlay itself.
      map.addLayer({ id: 'traffic-flow', type: 'line', source: 'traffic-roads', layout: {
        'line-cap': 'round', 'line-join': 'round', visibility: 'none',
      }, paint: {
        'line-color': ['match', ['get', 'band'], 'free', BAND_COLORS.free, 'slow', BAND_COLORS.slow, 'jam', BAND_COLORS.jam, BAND_COLORS.free],
        'line-width': ['interpolate', ['linear'], ['zoom'],
          11, ['match', ['get', 'roadClass'], 'motorway', 2.4, 'trunk', 2.2, 'primary', 1.8, 1.2],
          14, ['match', ['get', 'roadClass'], 'motorway', 4.5, 'trunk', 4, 'primary', 3.2, 'secondary', 2.6, 1.8],
          17, ['match', ['get', 'roadClass'], 'motorway', 8, 'trunk', 7, 'primary', 5.5, 'secondary', 4.5, 'tertiary', 3.5, 2.6]],
        'line-opacity': 0.8,
      }});
      // Traffic — the simulated vehicles themselves, dots riding the roads,
      // colored by the speed band of the road they're on.
      map.addLayer({ id: 'traffic-vehicles', type: 'circle', source: 'traffic-vehicles', layout: {
        visibility: 'none',
      }, paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 2.2, 14, 3.4, 17, 5.2],
        'circle-color': ['match', ['get', 'band'], 'free', BAND_COLORS.free, 'slow', BAND_COLORS.slow, 'jam', BAND_COLORS.jam, '#B0BEC5'],
        'circle-opacity': 0.95, 'circle-stroke-color': '#04140A', 'circle-stroke-width': 0.8,
      }});

      // Space Missions — launch pads (LL2 via /api/launches). One marker
      // per pad, coloured by the pad's next-launch status (or its last
      // outcome when nothing is scheduled). Violet family — no other
      // layer owns it; status colours reuse the panel's chips.
      map.addLayer({ id: 'launch-pads-glow', type: 'circle', source: 'launches', paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, 7, 6, 11, 12, 18],
        'circle-color': ['match', ['get', 'statusKind'],
          'go', '#69F0AE', 'tbd', '#FFC107', 'success', '#40C4FF', 'failure', '#FF5252', '#B388FF'],
        'circle-opacity': 0.22, 'circle-blur': 1,
      }});
      map.addLayer({ id: 'launch-pads', type: 'circle', source: 'launches', paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, 3.2, 6, 5, 12, 7.5],
        'circle-color': ['match', ['get', 'statusKind'],
          'go', '#69F0AE', 'tbd', '#FFC107', 'success', '#40C4FF', 'failure', '#FF5252', '#B388FF'],
        'circle-opacity': 0.95, 'circle-stroke-color': '#0B0714', 'circle-stroke-width': 1.2,
      }});
      map.addLayer({ id: 'launch-pads-label', type: 'symbol', source: 'launches', minzoom: 3.5, layout: {
        'text-field': ['get', 'label'], 'text-size': 9, 'text-font': ['Open Sans Regular'], 'text-offset': [0, 1.6],
        'text-allow-overlap': false,
      }, paint: { 'text-color': '#D1C4E9', 'text-halo-color': '#000', 'text-halo-width': 1 }});

      // Space Missions — replay drawing: the full reconstructed ground
      // track (dim), the flown portion (amber), and the vehicle marker.
      // Fed only while a replay runs; the permanent RECONSTRUCTED
      // ESTIMATE banner is rendered by SpaceMissionsPanel.
      map.addLayer({ id: 'launch-replay-path', type: 'line', source: 'launch-replay', filter: ['==', ['get', 'kind'], 'path'], layout: {
        'line-cap': 'round', 'line-join': 'round',
      }, paint: { 'line-color': '#FFB300', 'line-width': 1.2, 'line-opacity': 0.3, 'line-dasharray': [2, 2] }});
      map.addLayer({ id: 'launch-replay-flown', type: 'line', source: 'launch-replay', filter: ['==', ['get', 'kind'], 'flown'], layout: {
        'line-cap': 'round', 'line-join': 'round',
      }, paint: { 'line-color': '#FFB300', 'line-width': 2.4, 'line-opacity': 0.9 }});
      map.addLayer({ id: 'launch-replay-glow', type: 'circle', source: 'launch-replay', filter: ['==', ['get', 'kind'], 'rocket'], paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, 8, 6, 13, 12, 20],
        'circle-color': '#FFB300', 'circle-opacity': 0.3, 'circle-blur': 1,
      }});
      map.addLayer({ id: 'launch-replay-dot', type: 'circle', source: 'launch-replay', filter: ['==', ['get', 'kind'], 'rocket'], paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, 3.5, 6, 5.5, 12, 8],
        'circle-color': '#FFD54F', 'circle-opacity': 1, 'circle-stroke-color': '#FFF8E1', 'circle-stroke-width': 1.4,
      }});
      map.addLayer({ id: 'launch-replay-label', type: 'symbol', source: 'launch-replay', filter: ['==', ['get', 'kind'], 'rocket'], layout: {
        'text-field': ['get', 'label'], 'text-size': 9, 'text-font': ['Open Sans Regular'], 'text-offset': [0, 1.7],
        'text-allow-overlap': true,
      }, paint: { 'text-color': '#FFE082', 'text-halo-color': '#000', 'text-halo-width': 1 }});

      // Street Level — Panoramax photo positions (via /api/streetlevel).
      // Teal family — no other layer owns it. Dots only ever exist at
      // street zooms; the effect below owns loading and the chip.
      map.addLayer({ id: 'street-level-glow', type: 'circle', source: 'street-level', paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 14, 5, 18, 10, 22, 16],
        'circle-color': '#26C6DA', 'circle-opacity': 0.25, 'circle-blur': 1,
      }});
      map.addLayer({ id: 'street-level-dots', type: 'circle', source: 'street-level', paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 14, 2.5, 18, 4.5, 22, 7],
        'circle-color': '#4DD0E1', 'circle-opacity': 0.95,
        'circle-stroke-color': '#062A30', 'circle-stroke-width': 1.1,
      }});
      // Invisible hit target. The visible marker is a 2.5–7px core inside
      // a blurred glow up to ~16px wide, and MapLibre hit-tests a click
      // against the painted circle of the layer the listener hangs on —
      // so a click landing in the glow (most of what a user perceives as
      // "the marker") silently missed the dots layer, and only a second
      // click, recentred by double-click zoom, ever opened the viewer.
      // This layer paints nothing and exists to be clicked: it gives the
      // marker a hit footprint as wide as the marker looks.
      map.addLayer({ id: 'street-level-hit', type: 'circle', source: 'street-level', paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 14, 11, 18, 14, 22, 18],
        'circle-color': '#4DD0E1', 'circle-opacity': 0,
      }});
      // CCTV — outer glow disc: a soft dark ground under the eye photo so
      // the detailed artwork stays readable over bright basemap patches.
      map.addLayer({ id: 'cctv-glow', type: 'circle', source: 'cctv', minzoom: 4, paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,7, 5,11, 10,18, 14,26],
        'circle-color': '#000000', 'circle-opacity': 0.35, 'circle-blur': 1,
      }});
      // CCTV — the owner's eye photo for every camera (was a green dot).
      // Same layer id: click handlers, cursor wiring and visibility
      // toggles all key off 'cctv-dots' and keep working on a symbol layer.
      map.addLayer({ id: 'cctv-dots', type: 'symbol', source: 'cctv', minzoom: 4, layout: {
        'icon-image': 'camera-eye',
        'icon-size': ['interpolate',['linear'],['zoom'], 1,0.55, 5,0.7, 10,0.95, 14,1.25],
        'icon-allow-overlap': true, 'icon-ignore-placement': true,
      }, paint: { 'icon-opacity': 0.95 }});
      // CCTV — labels at zoom 10+
      map.addLayer({ id: 'cctv-label', type: 'symbol', source: 'cctv', minzoom: 10, layout: {
        'text-field': ['get','name'], 'text-size': 9, 'text-font': ['Open Sans Regular'],
        'text-offset': [0, 1.8], 'text-max-width': 12, 'text-allow-overlap': false,
      }, paint: { 'text-color': cameraColor, 'text-halo-color': '#000000', 'text-halo-width': 1.5, 'text-opacity': 0.8 }});

      // GDELT



      // ══ NETWORK INTEL — Live Malware (abuse.ch) — crimson threat ══
      map.addLayer({ id: 'malware-glow', type: 'circle', source: 'malware-nodes', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,6, 5,12, 10,20],
        'circle-color': '#D32F2F', 'circle-opacity': 0.06, 'circle-blur': 0.5,
      }});
      /* Sized by how many live malicious URLs the host serves. A box running
         forty payloads and one running a single sample were the same dot
         before, and they are not the same thing. */
      map.addLayer({ id: 'malware-dots', type: 'circle', source: 'malware-nodes', paint: {
        /* A zoom expression has to be the top-level input to the interpolate,
           so the activity scaling lives in the output stops rather than
           multiplying two curves together. sqrt keeps a host serving 80 URLs
           from dwarfing the map — it reads about three times the single-URL
           dot, not eighty. */
        'circle-radius': ['interpolate',['linear'],['zoom'],
          1,  ['interpolate',['linear'],['sqrt',['max',['get','url_count'],1]], 1,1.6, 3,2.4, 9,4],
          5,  ['interpolate',['linear'],['sqrt',['max',['get','url_count'],1]], 1,3.2, 3,4.8, 9,8],
          10, ['interpolate',['linear'],['sqrt',['max',['get','url_count'],1]], 1,4.8, 3,7.2, 9,12],
        ],
        'circle-color': '#D32F2F',
        'circle-opacity': 0.9,
        'circle-stroke-width': 1, 'circle-stroke-color': '#000000', 'circle-stroke-opacity': 0.8,
      }});
      /* Arrival beacon — expands and fades over the minute after a detection
         is pushed, then the feature drops out of the source entirely. */
      map.addLayer({ id: 'malware-new-ring', type: 'circle', source: 'malware-new', paint: {
        'circle-radius': 8,
        'circle-color': 'transparent',
        'circle-stroke-color': '#FF1744',
        'circle-stroke-width': 2,
        'circle-stroke-opacity': ['interpolate',['linear'],['get','age'], 0,0.9, 1,0],
      }});
      map.addLayer({ id: 'malware-label', type: 'symbol', source: 'malware-nodes', minzoom: 5, layout: {
        'text-field': ['get','malware'], 'text-size': 8, 'text-font': ['JetBrains Mono Bold', 'Open Sans Bold'],
        'text-offset': [0, 1.5], 'text-max-width': 10, 'text-allow-overlap': false,
      }, paint: { 'text-color': '#D32F2F', 'text-halo-color': '#111', 'text-halo-width': 1.5, 'text-opacity': 0.85 }});

      // ── NETWORK INTEL MESH (SDK STYLE) ──
      map.addLayer({ id: 'network-mesh-atmo', type: 'line', source: 'network-mesh', paint: {

        'line-width': ['interpolate',['linear'],['zoom'], 1, 2, 5, 4, 10, 8],
        'line-opacity': 0.08,
        'line-blur': 4,
      }});
      map.addLayer({ id: 'network-mesh-glow', type: 'line', source: 'network-mesh', paint: {

        'line-width': ['interpolate',['linear'],['zoom'], 1, 1, 5, 2, 10, 4],
        'line-opacity': 0.2,
        'line-blur': 1.5,
      }});
      map.addLayer({ id: 'network-mesh-core', type: 'line', source: 'network-mesh', paint: {

        'line-width': ['interpolate',['linear'],['zoom'], 1, 0.2, 5, 0.5, 10, 1.5],
        'line-opacity': 0.4,
      }});

      /* ══ BOTNET C2 INFRASTRUCTURE — one dot per listed server ══
         Feodo Tracker lists where a C2 is hosted and whether it still
         answers. It records no attacker, no victim and no attack, so there is
         nothing here to draw an arc between: a dot at the hosting country,
         coloured by the reported status, is the whole of what is observed. */
      map.addLayer({ id: 'cyber-heads', type: 'circle', source: 'cyber-heads', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,2.5, 5,4, 10,6],
        'circle-color': ['case', ['==', ['get','status'], 'online'], '#FF6D00', '#555555'],
        'circle-opacity': 0.95,
        'circle-stroke-width': 1.5, 'circle-stroke-color': '#333', 'circle-stroke-opacity': 0.9,
      }});
      map.addLayer({ id: 'cyber-labels', type: 'symbol', source: 'cyber-heads', minzoom: 3, layout: {
        'text-field': ['get','malware'], 'text-size': 9, 'text-font': ['JetBrains Mono Bold', 'Open Sans Bold'],
        'text-offset': [0, 1.5], 'text-max-width': 10, 'text-allow-overlap': false,
      }, paint: { 'text-color': '#333333', 'text-halo-color': '#000', 'text-halo-width': 1.5, 'text-opacity': 0.85 }});

      map.addLayer({ id: 'gdelt-dots', type: 'circle', source: 'gdelt', paint: {
        'circle-radius': 4, 'circle-color': '#D32F2F', 'circle-opacity': 0.5, 'circle-stroke-width': 1, 'circle-stroke-color': '#D32F2F', 'circle-stroke-opacity': 0.25,
      }});

      /* ── GDELT 2.0 Events — coloured by CAMEO QuadClass so cooperation and
         conflict are separable at a glance, sized by article volume. ── */
      map.addLayer({ id: 'gdelt-events-dots', type: 'circle', source: 'gdelt-events', paint: {
        'circle-radius': ['interpolate',['linear'],['get','articles'], 1,3, 10,5, 50,8, 200,12],
        'circle-color': ['match',['get','quad'],
          1,'#00E676',   // verbal cooperation
          2,'#00E5FF',   // material cooperation
          3,'#FF9500',   // verbal conflict
          4,'#FF3D3D',   // material conflict
          '#9B978E'],
        'circle-opacity': 0.75,
        'circle-stroke-width': 1,
        'circle-stroke-color': '#000000',
        'circle-stroke-opacity': 0.6,
      }});

      /* ── Cloudflare Radar — internet outages (country-scoped) ── */
      map.addLayer({ id: 'cf-outage-halo', type: 'circle', source: 'cf-outages', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,14, 5,26, 10,40],
        'circle-color': '#FFB300', 'circle-opacity': 0.12, 'circle-blur': 0.9,
      }});
      map.addLayer({ id: 'cf-outage-dots', type: 'circle', source: 'cf-outages', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,4, 5,6, 10,9],
        // Resolved outages read cooler than ongoing ones.
        'circle-color': ['case',['get','ongoing'],'#FFB300','#8B7325'],
        'circle-opacity': 0.9,
        'circle-stroke-width': 1.5, 'circle-stroke-color': '#000000', 'circle-stroke-opacity': 0.7,
      }});
      map.addLayer({ id: 'cf-outage-label', type: 'symbol', source: 'cf-outages', minzoom: 3, layout: {
        'text-field': ['get','country_name'], 'text-size': 9, 'text-font': ['JetBrains Mono Bold', 'Open Sans Bold'],
        'text-offset': [0, 1.4], 'text-max-width': 12, 'text-allow-overlap': false,
      }, paint: { 'text-color': '#FFB300', 'text-halo-color': '#000', 'text-halo-width': 1.5, 'text-opacity': 0.85 }});

      /* ── Cloudflare Radar — layer-3 attack origin share ── */
      map.addLayer({ id: 'cf-attack-dots', type: 'circle', source: 'cf-attacks', paint: {
        'circle-radius': ['interpolate',['linear'],['get','share'], 0,4, 5,9, 20,16, 50,24],
        'circle-color': '#FF3D3D', 'circle-opacity': 0.35, 'circle-blur': 0.3,
        'circle-stroke-width': 1, 'circle-stroke-color': '#FF3D3D', 'circle-stroke-opacity': 0.7,
      }});
      map.addLayer({ id: 'cf-attack-label', type: 'symbol', source: 'cf-attacks', minzoom: 2, layout: {
        'text-field': ['concat',['get','country'],' ',['to-string',['get','share']],'%'],
        'text-size': 9, 'text-font': ['JetBrains Mono Bold', 'Open Sans Bold'],
        'text-offset': [0, 1.6], 'text-allow-overlap': false,
      }, paint: { 'text-color': '#FF6B6B', 'text-halo-color': '#000', 'text-halo-width': 1.5, 'text-opacity': 0.9 }});

      // Weather Events (NASA EONET) — deep violet
      map.addLayer({ id: 'weather-glow', type: 'circle', source: 'weather', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,12, 5,20, 10,30],
        'circle-color': '#7E57C2', 'circle-opacity': 0.08, 'circle-blur': 1,
      }});
      map.addLayer({ id: 'weather-dots', type: 'circle', source: 'weather', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,5, 5,8, 10,14],
        'circle-color': ['match', ['get','icon'], 'cyclone','#7E57C2', 'volcano','#D32F2F', '#7E57C2'],
        'circle-opacity': 0.75,
        'circle-stroke-width': 1.5, 'circle-stroke-color': '#7E57C2', 'circle-stroke-opacity': 0.35,
      }});
      // Weather-hazard pins — the owner's artwork matched to the
      // alert type the feeds already carry: NWS event names verbatim
      // ("Tornado Warning", "Severe Thunderstorm Warning", "Tsunami
      // Warning") plus EONET's "Severe Storm". The purple dot stays
      // beneath each pin.
      map.addLayer({ id: 'weather-tsunami-icons', type: 'symbol', source: 'weather', filter: ['in', 'Tsunami', ['get', 'type']], layout: {
        'icon-image': 'tsunami-pin',
        'icon-size': ['interpolate', ['linear'], ['zoom'], 1, 0.6, 6, 0.9, 10, 1.25],
        'icon-anchor': 'bottom', 'icon-allow-overlap': true, 'icon-ignore-placement': true,
      }, paint: { 'icon-opacity': 0.96 }});
      map.addLayer({ id: 'weather-storm-icons', type: 'symbol', source: 'weather', filter: ['any', ['in', 'Thunderstorm', ['get', 'type']], ['==', ['get', 'type'], 'Severe Storm']], layout: {
        'icon-image': 'lightning-pin',
        'icon-size': ['interpolate', ['linear'], ['zoom'], 1, 0.6, 6, 0.9, 10, 1.25],
        'icon-anchor': 'bottom', 'icon-allow-overlap': true, 'icon-ignore-placement': true,
      }, paint: { 'icon-opacity': 0.96 }});
      map.addLayer({ id: 'weather-tornado-icons', type: 'symbol', source: 'weather', filter: ['in', 'Tornado', ['get', 'type']], layout: {
        'icon-image': 'tornado-pin',
        'icon-size': ['interpolate', ['linear'], ['zoom'], 1, 0.6, 6, 0.9, 10, 1.25],
        'icon-anchor': 'bottom', 'icon-allow-overlap': true, 'icon-ignore-placement': true,
      }, paint: { 'icon-opacity': 0.96 }});
      map.addLayer({ id: 'weather-label', type: 'symbol', source: 'weather', layout: {
        'text-field': ['get','title'], 'text-size': 9, 'text-font': ['Open Sans Regular'],
        'text-offset': [0, 2], 'text-max-width': 14, 'text-allow-overlap': false,
      }, paint: { 'text-color': '#7E57C2', 'text-halo-color': '#000', 'text-halo-width': 1, 'text-opacity': 0.8 }});

      // Nuclear Infrastructure — teal / amber risk
      map.addLayer({ id: 'infra-glow', type: 'circle', source: 'infrastructure', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,8, 5,14, 10,22],
        'circle-color': ['case', ['in', 'SEISMIC RISK', ['get', 'status']], '#E65100', '#26A69A'],
        'circle-opacity': 0.08, 'circle-blur': 1,
      }});
      map.addLayer({ id: 'infra-dots', type: 'circle', source: 'infrastructure', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,4, 5,6, 10,10],
        'circle-color': ['case', 
          ['in', 'SEISMIC RISK', ['get', 'status']], '#E65100',
          ['==', ['get','status'], 'Active Conflict Zone'], '#D32F2F', 
          ['in', 'Decommission', ['get', 'status']], '#546E7A', 
          ['==', ['get','status'], 'Under Construction'], '#FFA726', 
          '#26A69A'
        ],
        'circle-opacity': 0.75,
        'circle-stroke-width': 1.5, 'circle-stroke-color': ['case', ['in', 'SEISMIC RISK', ['get', 'status']], '#E65100', '#26A69A'], 'circle-stroke-opacity': 0.35,
      }});
      map.addLayer({ id: 'infra-label', type: 'symbol', source: 'infrastructure', minzoom: 5, layout: {
        'text-field': ['get','name'], 'text-size': 9, 'text-font': ['Open Sans Regular'],
        'text-offset': [0, 2], 'text-max-width': 14, 'text-allow-overlap': false,
      }, paint: { 'text-color': ['case', ['in', 'SEISMIC RISK', ['get', 'status']], '#E65100', '#26A69A'], 'text-halo-color': '#000', 'text-halo-width': 1, 'text-opacity': 0.7 }});

      // Satellites.
      // Every satellite is drawn once, by the custom 3D layer below, at its
      // altitude. These two circle layers are kept defined — the source feeds
      // the 3D layer and other code refers to them — but hidden: drawing the
      // same satellite both flat on the ground and again up at altitude is
      // what made the map read as half 2D and half 3D.
      // Hit-testing is handled by the 3D layer's own GPU pick pass, since
      // queryRenderedFeatures cannot see into a custom WebGL layer.
      map.addLayer({ id: 'sat-glow', type: 'circle', source: 'satellites', layout: { visibility: 'none' }, paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,3, 5,6], 'circle-color': ['get','color'], 'circle-opacity': 0.3, 'circle-blur': 1,
      }});
      map.addLayer({ id: 'sat-dots', type: 'circle', source: 'satellites', layout: { visibility: 'none' }, paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,1.5, 5,3], 'circle-color': ['get','color'], 'circle-opacity': 1.0,
      }});
      // The spacecraft themselves, lifted to their orbit.
      if (!map.getLayer('sat-3d')) {
        satLayerRef.current = createSatelliteLayer('sat-3d');
        map.addLayer(satLayerRef.current as any);
      }

      // Maritime — ports & naval bases — ocean teal
      map.addLayer({ id: 'maritime-glow', type: 'circle', source: 'maritime', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,6, 5,12, 10,20],
        'circle-color': ['match', ['get','type'], 'naval','#D32F2F', 'energy','#E65100', '#26C6DA'],
        'circle-opacity': 0.08, 'circle-blur': 1,
      }});
      map.addLayer({ id: 'maritime-dots', type: 'circle', source: 'maritime', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,3, 5,5, 10,9],
        'circle-color': ['match', ['get','type'], 'naval','#D32F2F', 'energy','#E65100', '#26C6DA'],
        'circle-opacity': 0.8,
        'circle-stroke-width': 1.5, 'circle-stroke-color': ['match', ['get','type'], 'naval','#D32F2F', 'energy','#E65100', '#26C6DA'], 'circle-stroke-opacity': 0.35,
      }});
      // Maritime pins — the owner's warship artwork on every port /
      // naval base; the coloured dot stays as the point marker under
      // the pin tip, labels unchanged.
      map.addLayer({ id: 'maritime-icons', type: 'symbol', source: 'maritime', layout: {
        'icon-image': 'maritime-pin',
        'icon-size': ['interpolate', ['linear'], ['zoom'], 1, 0.5, 5, 0.7, 10, 1.0],
        'icon-anchor': 'bottom', 'icon-allow-overlap': true, 'icon-ignore-placement': true,
      }, paint: { 'icon-opacity': 0.96 }});
      map.addLayer({ id: 'maritime-label', type: 'symbol', source: 'maritime', minzoom: 4, layout: {
        'text-field': ['get','name'], 'text-size': 9, 'text-font': ['Open Sans Regular'],
        'text-offset': [0, 1.8], 'text-max-width': 12, 'text-allow-overlap': false,
      }, paint: { 'text-color': '#26C6DA', 'text-halo-color': '#000', 'text-halo-width': 1, 'text-opacity': 0.7 }});

      // Maritime chokepoints — amber threat spectrum
      map.addLayer({ id: 'choke-glow', type: 'circle', source: 'maritime-choke', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,10, 5,18, 10,28],
        'circle-color': '#E65100', 'circle-opacity': 0.1, 'circle-blur': 1,
      }});
      map.addLayer({ id: 'choke-dots', type: 'circle', source: 'maritime-choke', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,4, 5,7, 10,12],
        'circle-color': ['match', ['get','risk'], 'CRITICAL','#D32F2F', 'HIGH','#E65100', 'ELEVATED','#F9A825', '#26A69A'],
        'circle-opacity': 0.85,
        'circle-stroke-width': 1.5, 'circle-stroke-color': '#E65100', 'circle-stroke-opacity': 0.4,
      }});
      map.addLayer({ id: 'choke-label', type: 'symbol', source: 'maritime-choke', minzoom: 3, layout: {
        'text-field': ['get','name'], 'text-size': 10, 'text-font': ['Open Sans Bold'],
        'text-offset': [0, 2], 'text-max-width': 14, 'text-allow-overlap': false,
      }, paint: { 'text-color': '#E65100', 'text-halo-color': '#000', 'text-halo-width': 1, 'text-opacity': 0.9 }});

      // Live News — muted rose
      map.addLayer({ id: 'news-glow', type: 'circle', source: 'live-news', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,8, 5,14, 10,22],
        'circle-color': '#EC407A', 'circle-opacity': 0.08, 'circle-blur': 1,
      }});
      map.addLayer({ id: 'news-dots', type: 'circle', source: 'live-news', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,4, 5,6, 10,10],
        'circle-color': '#EC407A', 'circle-opacity': 0.8,
        'circle-stroke-width': 1.5, 'circle-stroke-color': '#EC407A', 'circle-stroke-opacity': 0.4,
      }});
      map.addLayer({ id: 'news-label', type: 'symbol', source: 'live-news', minzoom: 4, layout: {
        'text-field': ['get','name'], 'text-size': 9, 'text-font': ['Open Sans Regular'],
        'text-offset': [0, 1.8], 'text-max-width': 12, 'text-allow-overlap': false,
      }, paint: { 'text-color': '#EC407A', 'text-halo-color': '#000', 'text-halo-width': 1, 'text-opacity': 0.8 }});

      // Live Alert pins — a report at the place it names, coloured by what it describes
      const alertColor: LayerColor = ['match', ['get','kind'], 'rocket', ALERT_KINDS.rocket.color, 'event', ALERT_KINDS.event.color, ALERT_KINDS.news.color];
      map.addLayer({ id: 'alert-pin-glow', type: 'circle', source: 'alert-pins', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,7, 6,14, 10,22],
        'circle-color': alertColor, 'circle-opacity': 0.16, 'circle-blur': 0.8,
      }});
      map.addLayer({ id: 'alert-pin-dots', type: 'circle', source: 'alert-pins', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,3.5, 6,6, 10,8],
        'circle-color': alertColor,
        // A region is placed less exactly than a town, so it is drawn as a ring.
        'circle-opacity': ['case', ['==', ['get','precision'], 'region'], 0.15, 0.95],
        'circle-stroke-width': 1.5,
        'circle-stroke-color': ['match', ['get','precision'], 'region', alertColor, '#0A0A0A'] as LayerColor,
      }});
      // A report just in, and the pin a popup is open on, each get a ring.
      map.addLayer({ id: 'alert-pin-pulse', type: 'circle', source: 'alert-pins', filter: ['==', ['get','fresh'], true], paint: {
        'circle-radius': 9, 'circle-color': 'transparent',
        'circle-stroke-color': alertColor as never, 'circle-stroke-width': 1.5, 'circle-stroke-opacity': 0.7,
      }});
      map.addLayer({ id: 'alert-pin-selected', type: 'circle', source: 'alert-pins', filter: ['==', ['get','id'], ''], paint: {
        'circle-radius': 13, 'circle-color': 'transparent',
        'circle-stroke-color': '#FFFFFF', 'circle-stroke-width': 1.5, 'circle-stroke-opacity': 0.85,
      }});
      map.addLayer({ id: 'alert-pin-label', type: 'symbol', source: 'alert-pins', minzoom: 5, layout: {
        // "Riyadh ·3" when three reports name the same town.
        'text-field': ['case', ['>', ['get','stack'], 1],
          ['concat', ['get','place_name'], ' ·', ['to-string', ['get','stack']]],
          ['get','place_name']],
        'text-size': 10, 'text-font': ['Open Sans Bold'],
        'text-offset': [0, 1.2], 'text-anchor': 'top', 'text-max-width': 12, 'text-allow-overlap': false,
      }, paint: { 'text-color': alertColor, 'text-halo-color': '#000', 'text-halo-width': 1.2, 'text-opacity': 0.9 }});

      // ══ IP SWEEP — Neighborhood device visualization ══
      map.addLayer({ id: 'sweep-connections', type: 'line', source: 'ip-sweep-connections', paint: {
        'line-color': ['get', 'color'], 'line-width': 1, 'line-opacity': 0.3, 'line-dasharray': [2, 4],
      }});
      map.addLayer({ id: 'sweep-pulse-ring', type: 'circle', source: 'ip-sweep-pulse', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 8,40, 12,80, 16,160],
        'circle-color': 'transparent', 'circle-opacity': 0.6,
        'circle-stroke-width': 2, 'circle-stroke-color': '#FF3D3D', 'circle-stroke-opacity': 0.4,
      }});
      map.addLayer({ id: 'sweep-device-glow', type: 'circle', source: 'ip-sweep-devices', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 8,8, 12,16, 16,30],
        'circle-color': ['get', 'color'], 'circle-opacity': 0.15, 'circle-blur': 1,
      }});
      map.addLayer({ id: 'sweep-device-dots', type: 'circle', source: 'ip-sweep-devices', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 8,3, 12,6, 16,10],
        'circle-color': ['get', 'color'], 'circle-opacity': 0.95,
        'circle-stroke-width': 1.5, 'circle-stroke-color': '#FFFFFF', 'circle-stroke-opacity': 0.6,
      }});
      map.addLayer({ id: 'sweep-device-labels', type: 'symbol', source: 'ip-sweep-devices', minzoom: 13, layout: {
        'text-field': ['concat', ['get', 'device_type'], '\n', ['get', 'ip']],
        'text-size': 9, 'text-font': ['Open Sans Regular'],
        'text-offset': [0, 2.2], 'text-max-width': 12, 'text-allow-overlap': false,
      }, paint: {
        'text-color': ['get', 'color'], 'text-halo-color': '#000', 'text-halo-width': 1.5, 'text-opacity': 0.9,
      }});

      // ══ SCAN TARGETS — Geolocated individual scans ══
      map.addLayer({ id: 'scan-targets-glow', type: 'circle', source: 'scan-targets', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,12, 5,25, 10,40],
        'circle-color': '#D32F2F', 'circle-opacity': 0.15, 'circle-blur': 1,
      }});
      map.addLayer({ id: 'scan-targets-dots', type: 'circle', source: 'scan-targets', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,5, 5,8, 10,12],
        'circle-color': '#D32F2F', 'circle-opacity': 0.9,
        'circle-stroke-width': 1.5, 'circle-stroke-color': '#ECEFF1', 'circle-stroke-opacity': 0.7,
      }});
      map.addLayer({ id: 'scan-targets-label', type: 'symbol', source: 'scan-targets', layout: {
        'text-field': ['get', 'id'], 'text-size': 11, 'text-font': ['Open Sans Bold'],
        'text-offset': [0, 2], 'text-max-width': 14, 'text-allow-overlap': false,
      }, paint: { 'text-color': '#D32F2F', 'text-halo-color': '#000', 'text-halo-width': 1.5, 'text-opacity': 0.9 }});

      // Flight layers (WebGL symbol — GPU rendered, handles 50K+ smooth)
      const flightLayers = [
        { id: 'fl-commercial', src: 'flights', icon: 'plane-cyan', heliIcon: 'heli-cyan' },
        { id: 'fl-private', src: 'private-fl', icon: 'plane-green', heliIcon: 'heli-green' },
        { id: 'fl-jets', src: 'jets', icon: 'plane-pink', heliIcon: 'heli-pink' },
        { id: 'fl-military', src: 'military', icon: 'plane-red', heliIcon: 'heli-red' },
      ];
      flightLayers.forEach(l => {
        map.addLayer({ id: l.id, type: 'symbol', source: l.src, layout: {
          // Per-feature glyph: helicopters (aircraft_category 'heli')
          // get the rotor glyph, everything else the plane glyph.
          // Size is per-feature too: the heli photo's readable core
          // is ~half a plane's at the same size (see flightIconSize).
          'icon-image': flightIconImage(l.icon, l.heliIcon), 'icon-size': flightIconSize(),
          'icon-rotate': ['get','heading'], 'icon-rotation-alignment': 'map', 'icon-allow-overlap': true, 'icon-ignore-placement': true,
        }, paint: { 'icon-opacity': 0.85 }});
      });

      // Route layers are added later (after setMapReady) so they render on top of everything.

      // Balloons (moving entities)
      map.addLayer({ id: 'balloon-dots', type: 'circle', source: 'balloons', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,3, 5,5, 10,7],
        'circle-color': ['get', 'color'],
        'circle-opacity': 0.8,
        'circle-stroke-width': 1, 'circle-stroke-color': '#fff', 'circle-stroke-opacity': 0.5,
      }});
      map.addLayer({ id: 'balloon-label', type: 'symbol', source: 'balloons', minzoom: 4, layout: {
        'text-field': ['get','callsign'], 'text-size': 9, 'text-font': ['Open Sans Regular'],
        'text-offset': [0, 1.2], 'text-max-width': 12, 'text-allow-overlap': false,
      }, paint: { 'text-color': ['get', 'color'], 'text-halo-color': '#000', 'text-halo-width': 1 }});

      // Radiation — violet base, threat spectrum for danger/warning
      map.addLayer({ id: 'rad-glow', type: 'circle', source: 'radiation', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,10, 5,20, 10,40],
        'circle-color': ['match', ['get','status'], 'DANGER','#D32F2F', 'WARNING','#E65100', '#7E57C2'],
        'circle-opacity': 0.12, 'circle-blur': 1,
      }});
      map.addLayer({ id: 'rad-dots', type: 'circle', source: 'radiation', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,4, 5,6, 10,8],
        'circle-color': ['match', ['get','status'], 'DANGER','#D32F2F', 'WARNING','#E65100', '#7E57C2'],
        'circle-opacity': 0.85,
        'circle-stroke-width': 1.5, 'circle-stroke-color': ['match', ['get','status'], 'DANGER','#D32F2F', 'WARNING','#E65100', '#7E57C2'], 'circle-stroke-opacity': 0.35,
      }});
      map.addLayer({ id: 'rad-label', type: 'symbol', source: 'radiation', minzoom: 5, layout: {
        'text-field': ['concat', ['to-string', ['get','reading']], ' nSv/h'], 'text-size': 9, 'text-font': ['Open Sans Bold'],
        'text-offset': [0, 1.5], 'text-allow-overlap': false,
      }, paint: { 'text-color': ['match', ['get','status'], 'DANGER','#D32F2F', 'WARNING','#E65100', '#7E57C2'], 'text-halo-color': '#000', 'text-halo-width': 1 }});

      // ══ OSIRIS SDK — Lattice Intelligence Mesh ══
      // Polybolos Style: Delicate, translucent, steel-blue splined mesh

      // ── SEA domain (Distinct Solid Lines) ──
      // Removed glow to match the clean, diagrammatic look of submarinecablemap.com
      map.addLayer({ id: 'sdk-sea', type: 'line', source: 'sdk-links', filter: ['==',['get','domain'],'SEA'], paint: {
        'line-color': ['coalesce', ['get', 'color'], '#1976D2'], // Single solid color from properties
        'line-width': ['interpolate',['linear'],['zoom'], 1, 0.8, 5, 1.5, 10, 2.5],
        'line-opacity': ['interpolate',['linear'],['zoom'], 1, 0.3, 5, 0.5, 10, 0.7],
      }});

      // ── AIR domain (Steel Gray / Cyan) ──
      map.addLayer({ id: 'sdk-air-atmo', type: 'line', source: 'sdk-links', filter: ['==',['get','domain'],'AIR'], paint: {
        'line-color': '#4DD0E1',
        'line-width': ['interpolate',['linear'],['zoom'], 1, 1.5, 5, 5, 10, 8],
        'line-opacity': 0.04,
        'line-blur': 3,
      }});
      map.addLayer({ id: 'sdk-air-glow', type: 'line', source: 'sdk-links', filter: ['==',['get','domain'],'AIR'], paint: {
        'line-color': '#80DEEA',
        'line-width': ['interpolate',['linear'],['zoom'], 1, 0.8, 5, 2, 10, 4],
        'line-opacity': ['interpolate',['linear'],['zoom'], 1, 0.08, 5, 0.12, 10, 0.18],
        'line-blur': 1,
      }});
      map.addLayer({ id: 'sdk-air', type: 'line', source: 'sdk-links', filter: ['==',['get','domain'],'AIR'], paint: {
        'line-color': '#B2EBF2',
        'line-width': ['interpolate',['linear'],['zoom'], 1, 0.15, 5, 0.6, 10, 1.2],
        'line-opacity': ['interpolate',['linear'],['zoom'], 1, 0.2, 5, 0.35, 10, 0.5],
      }});

      // ── INTEL domain (Deep Steel / Violet) ──
      map.addLayer({ id: 'sdk-intel-atmo', type: 'line', source: 'sdk-links', filter: ['==',['get','domain'],'INTEL'], paint: {
        'line-color': '#7986CB',
        'line-width': ['interpolate',['linear'],['zoom'], 1, 2.5, 5, 7, 10, 12],
        'line-opacity': 0.06,
        'line-blur': 5,
      }});
      map.addLayer({ id: 'sdk-intel-glow', type: 'line', source: 'sdk-links', filter: ['==',['get','domain'],'INTEL'], paint: {
        'line-color': '#9FA8DA',
        'line-width': ['interpolate',['linear'],['zoom'], 1, 1.2, 5, 3, 10, 6],
        'line-opacity': ['interpolate',['linear'],['zoom'], 1, 0.12, 5, 0.18, 10, 0.25],
        'line-blur': 2,
      }});
      map.addLayer({ id: 'sdk-intel', type: 'line', source: 'sdk-links', filter: ['==',['get','domain'],'INTEL'], paint: {
        'line-color': '#C5CAE9',
        'line-width': ['interpolate',['linear'],['zoom'], 1, 0.3, 5, 1, 10, 2],
        'line-opacity': ['interpolate',['linear'],['zoom'], 1, 0.3, 5, 0.45, 10, 0.7],
      }});

      // Maritime Ships (moving entities) — ocean teal family
      map.addLayer({ id: 'ship-dots', type: 'circle', source: 'maritime-ships', paint: {
        'circle-radius': ['interpolate',['linear'],['zoom'], 1,2, 5,4, 10,6],
        'circle-color': ['match', ['get','type'], 'military','#D32F2F', 'tanker','#E65100', 'cargo','#26C6DA', '#B0BEC5'],
        'circle-opacity': 0.75,
      }});
      map.addLayer({ id: 'ship-label', type: 'symbol', source: 'maritime-ships', minzoom: 5, layout: {
        'text-field': ['get','name'], 'text-size': 9, 'text-font': ['Open Sans Regular'],
        'text-offset': [0, 1.2], 'text-allow-overlap': false,
      }, paint: { 'text-color': ['match', ['get','type'], 'military','#D32F2F', 'tanker','#E65100', 'cargo','#26C6DA', '#B0BEC5'], 'text-halo-color': '#000', 'text-halo-width': 1 }});


      setMapReady(true);
      // 'load' means the style parsed; 'idle' means the tiles are drawn.
      // The splash waits for the second, so it lifts onto a finished globe.
      map.once('idle', () => onReadyRef.current?.());
      // Dev-only handle. The map is otherwise unreachable from the console,
      // which makes interaction bugs guesswork rather than diagnosis.
      if (process.env.NODE_ENV === 'development') (window as any).__osirisMap = map;
    });

    // Events
    let lastMove = 0;
    map.on('mousemove', e => {
      const now = Date.now();
      if (now - lastMove > 100) {
        lastMove = now;
        onMouseCoords?.({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      }
    });
    /* The region dossier opens on a double right-click: two within
       DOUBLE_RIGHT_MS and a few pixels of each other. A single right-click
       was too easy to make by accident — it opened a panel and set off a
       place lookup and a country's worth of Wikidata requests. A touch
       long-press is already deliberate, so on a phone one still opens it;
       asking for two there would make it all but unreachable. */
    let lastRightClick: { at: number; x: number; y: number } | null = null;
    map.on('contextmenu', e => {
      e.preventDefault();
      const open = () => onRightClick?.({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      if ((e.originalEvent as PointerEvent).pointerType === 'touch') { open(); return; }

      const now = performance.now();
      const { x, y } = e.point;
      const isSecond = lastRightClick !== null
        && now - lastRightClick.at < DOUBLE_RIGHT_MS
        && Math.hypot(x - lastRightClick.x, y - lastRightClick.y) < DOUBLE_RIGHT_SLOP_PX;
      if (isSecond) {
        lastRightClick = null;
        open();
      } else {
        lastRightClick = { at: now, x, y };
      }
    });
    const reportViewState = () => { const c = map.getCenter(); onViewStateChange?.({ zoom: map.getZoom(), latitude: c.lat }); };
    map.on('load', reportViewState);
    map.on('moveend', reportViewState);
    // Lightweight settled-view diagnostics for camera/terrain regressions.
    const reportCamera = () => {
      const center = map.getCenter();
      container.dataset.mapCamera = JSON.stringify({ zoom: map.getZoom(), pitch: map.getPitch(), bearing: map.getBearing(), lat: center.lat, lng: center.lng });
    };
    map.on('load', reportCamera);
    map.on('moveend', reportCamera);
    map.on('idle', reportCamera);
    reportCamera();

    // ── POPUP HELPER ──
    const popup = (coords: any, html: string, maxWidth = '420px') => {
      popupRef.current?.remove();
      popupRef.current = new maplibregl.Popup({ closeButton: true, maxWidth, offset: 14 }).setLngLat(coords).setHTML(html).addTo(map);
    };
    const pStyle = `background:rgba(12,14,26,0.95);backdrop-filter:blur(16px);border-radius:10px;padding:16px;font-family:'JetBrains Mono',monospace;`;
    const linkStyle = `display:inline-block;margin-top:8px;padding:5px 12px;font-size:10px;letter-spacing:0.12em;text-decoration:none;border-radius:5px;font-family:'JetBrains Mono',monospace;`;
    const shareBtnStyle = `display:inline-block;margin-top:8px;margin-left:6px;padding:5px 12px;font-size:10px;letter-spacing:0.12em;border-radius:5px;font-family:'JetBrains Mono',monospace;background:rgba(255,255,255,0.06);color:#E8E6E0;border:1px solid rgba(255,255,255,0.25);cursor:pointer;`;

    // ── XSS PROTECTION HELPERS ──
    const htmlEsc = (s: any): string => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
    const idSafe = (s: any): string => String(s ?? '').replace(/[^a-zA-Z0-9_\.\-]/g, '');
    const urlSafe = (s: any): string => { const u = String(s ?? ''); return /^https?:\/\//i.test(u) ? u : '#'; };

    const formatTime = (iso: string | null) => {
      if (!iso) return '—';
      try {
        const d = new Date(iso);
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZoneName: 'short' });
      } catch { return '—'; }
    };

    // ── Flights (with FlightAware + ADS-B Exchange links + ROUTE VISUALIZATION) ──
    const showFlightPopup = (feature: any) => {
        // Onboarding first-use signal — see src/lib/onboarding (Build A).
        try { window.dispatchEvent(new CustomEvent('we:flight-selected')); } catch { /* noop */ }
        const p = feature.properties as any;
        const coords = (feature.geometry as any).coordinates;
        const cs = (p.callsign||'').trim();
        // The last selected aircraft is the Cinematic Director's follow
        // target; the popup's own FOLLOW button reads the live follow
        // state so it can offer STOP for the aircraft being ridden.
        if (p.icao24) setSelectedFlight({ icao24: String(p.icao24), callsign: cs || String(p.icao24).toUpperCase() });
        const followingThis = flightFollowRef.current.phase !== 'idle'
          && flightFollowRef.current.target?.icao24 === (p.icao24 || '');

        // Show initial popup immediately (without route data)
        const routeLoadingId = `route-info-${Date.now()}`;
        popup(coords, `<div style="background:rgba(12,14,26,0.95);backdrop-filter:blur(16px);border-radius:10px;padding:12px;font-family:'JetBrains Mono',monospace;border:1px solid rgba(255,255,255,0.08);max-height:54vh;overflow-y:auto;">
          <div id="acphoto-${idSafe(p.icao24||'')}" style="position:relative;width:100%;aspect-ratio:2/1;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:6px;overflow:hidden;margin-bottom:8px;display:flex;align-items:center;justify-content:center;">
            <span id="acphoto-label-${idSafe(p.icao24||'')}" style="color:#5C5A54;font-size:9px;letter-spacing:0.12em;padding:0 8px;text-align:center;">\u2708 ${htmlEsc(p.model_name || p.model || 'AIRCRAFT')}</span>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
            <span style="color:#E8E6E0;font-size:13px;font-weight:700;letter-spacing:0.08em;">${htmlEsc(cs)}</span>
            <span style="color:#5C5A54;font-size:9px;">${htmlEsc(p.icao24||'')}</span>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;font-size:10px;">
            <div><span style="color:#5C5A54;font-size:8px;">MODEL</span><br/><span style="color:#B0BEC5;">${htmlEsc(p.model_name || p.model||'\u2014')}</span></div>
            <div><span style="color:#5C5A54;font-size:8px;">ALT</span><br/><span id="acstat-alt-${idSafe(p.icao24||'')}" style="color:#B0BEC5;">${p.alt?Math.round(p.alt)+'m':'\u2014'}</span></div>
            <div><span style="color:#5C5A54;font-size:8px;">SPEED</span><br/><span id="acstat-spd-${idSafe(p.icao24||'')}" style="color:#B0BEC5;">${p.speed_knots?Math.round(p.speed_knots)+'kt':'\u2014'}</span></div>
            <div><span style="color:#5C5A54;font-size:8px;">HDG</span><br/><span id="acstat-hdg-${idSafe(p.icao24||'')}" style="color:#B0BEC5;">${Math.round(p.heading||0)}\u00b0</span></div>
            <div><span style="color:#5C5A54;font-size:8px;">REG</span><br/><span style="color:#B0BEC5;">${htmlEsc(p.registration||'\u2014')}</span></div>
            <div><span style="color:#5C5A54;font-size:8px;">POS</span><br/><span id="acstat-pos-${idSafe(p.icao24||'')}" style="color:#B0BEC5;">${coords[1].toFixed(2)},${coords[0].toFixed(2)}</span></div>
          </div>
          <div id="acstat-age-${idSafe(p.icao24||'')}" style="margin-top:6px;color:#5C5A54;font-size:8px;letter-spacing:0.08em;">FROM THE LIVE FEED \u2014 VALUES UPDATE AS NEW FIXES ARRIVE</div>
          <div id="ac-${idSafe(p.icao24||'')}" style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.06);">
            <span style="color:#5C5A54;font-size:9px;letter-spacing:0.1em;">IDENTIFYING AIRFRAME\u2026</span>
          </div>
          <button onclick="window.osirisWatchFlight && window.osirisWatchFlight({ icao24: '${idSafe(p.icao24||'')}', callsign: '${idSafe(cs)}' })" style="width:100%;margin-top:8px;padding:5px 10px;background:rgba(0,229,255,0.10);border:1px solid rgba(0,229,255,0.35);color:#7FE9FF;font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:bold;letter-spacing:0.1em;border-radius:4px;cursor:pointer;">+ WATCH THIS AIRCRAFT</button>
          ${p.icao24 ? `<button onclick="window.__weFlightFollowToggle && window.__weFlightFollowToggle('${idSafe(p.icao24||'')}','${idSafe(cs)}')" style="width:100%;margin-top:6px;padding:5px 10px;background:rgba(255,180,0,0.10);border:1px solid rgba(255,180,0,0.40);color:#FFD54F;font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:bold;letter-spacing:0.1em;border-radius:4px;cursor:pointer;">${followingThis ? '\u25a0 STOP FOLLOWING' : '\u2708 FOLLOW AIRCRAFT \u2014 CHASE CAMERA'}</button>` : ''}
          ${p.icao24 ? `<button onclick="window.__weFlightCockpitView && window.__weFlightCockpitView('${idSafe(p.icao24||'')}','${idSafe(cs)}')" style="width:100%;margin-top:6px;padding:5px 10px;background:rgba(0,255,170,0.08);border:1px solid rgba(0,255,170,0.35);color:#7DFFC4;font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:bold;letter-spacing:0.1em;border-radius:4px;cursor:pointer;">\u25B8 COCKPIT VIEW</button>` : ''}
          ${p.icao24 ? `<button onclick="window.__weShareEntity&&window.__weShareEntity('flight','${idSafe(p.icao24||'')}')" style="width:100%;margin-top:6px;padding:5px 10px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.25);color:#E8E6E0;font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:bold;letter-spacing:0.1em;border-radius:4px;cursor:pointer;">\U0001F517 SHARE THIS FLIGHT</button>` : ''}
${p.icao24 ? (flightPathAccessRef.current === 'pro'
            ? `<div style="margin-top:6px;padding:5px 10px;border:1px dashed rgba(255,179,0,0.45);color:#FFD54F;font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:bold;letter-spacing:0.1em;border-radius:4px;text-align:center;">\u2726 FLIGHT PATH \u2014 PRO \u00b7 ROUTE \u2014 PLANNED + FLOWN \u2014 LIVE TRACK, DRAWN WHILE FOLLOWING</div>`
            : `<button onclick="window.location.href='/pricing#pro-card'" style="width:100%;margin-top:6px;padding:5px 10px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.18);color:#B0BEC5;font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:bold;letter-spacing:0.1em;border-radius:4px;cursor:pointer;">\ud83d\udd12 FLIGHT PATH \u2014 PRO \u00b7 SEE THE WHOLE FLIGHT PATH</button>`) : ''}
          <div id="${routeLoadingId}" style="margin-top:8px;padding:6px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
            <span style="color:#5C5A54;font-size:9px;letter-spacing:0.1em;">RESOLVING ROUTE\u2026</span>
          </div>
          <div style="margin-top:8px;display:flex;gap:4px;flex-wrap:wrap;">
            <a href="https://www.flightaware.com/live/flight/${encodeURIComponent(cs)}" target="_blank" style="${linkStyle}color:#78909C;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.03);">FLIGHTAWARE</a>
            <a href="https://globe.adsbexchange.com/?icao=${encodeURIComponent(p.icao24||'')}" target="_blank" style="${linkStyle}color:#78909C;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.03);">ADS-B</a>
            <a href="https://www.radarbox.com/data/flights/${encodeURIComponent(cs)}" target="_blank" style="${linkStyle}color:#78909C;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.03);">RADARBOX</a>
          </div>
        </div>`, '320px');

        // Track the open panel so each new feed snapshot refreshes its
        // readouts (snapshot effect), and clear the tracking on close.
        if (p.icao24) {
          const hex = String(p.icao24);
          openFlightPopupRef.current = { icao24: hex };
          popupRef.current?.on('close', () => {
            if (openFlightPopupRef.current?.icao24 === hex) openFlightPopupRef.current = null;
          });
          // Photo of this exact airframe (Planespotters — tail-specific:
          // hex, then registration). Best-effort and async: a miss or a
          // slow lookup leaves the labeled placeholder, never a block.
          const photoParams = new URLSearchParams({ hex });
          if (p.registration) photoParams.set('reg', String(p.registration));
          fetch(`/api/aircraft-photo?${photoParams}`)
            .then(r => (r.ok ? r.json() : null))
            .then((ph) => {
              const slot = document.getElementById(`acphoto-${idSafe(hex)}`);
              if (!slot || !ph?.found) return;
              slot.innerHTML =
                `<img src="${urlSafe(ph.src)}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;"/>` +
                `<div style="position:absolute;left:0;right:0;bottom:0;padding:2px 6px;background:rgba(0,0,0,0.6);font-size:8px;color:#B0BEC5;font-family:'JetBrains Mono',monospace;">THIS AIRCRAFT \u00b7 \ud83d\udcf7 ${htmlEsc(ph.photographer)} \u00b7 <a href="${urlSafe(ph.link)}" target="_blank" rel="noopener noreferrer" style="color:#7FE9FF;">PLANESPOTTERS.NET</a></div>`;
            })
            .catch(() => {});
        }

        // The transponder only reports a type code (often nothing at all), so
        // resolve the real manufacturer/model and registration out of band.
        if (p.icao24) {
          fetch(`/api/aircraft?icao24=${encodeURIComponent(p.icao24)}`)
            .then(r => (r.ok ? r.json() : null))
            .then((d) => {
              const el = document.getElementById(`ac-${p.icao24}`);
              if (!el || !d || d.error) {
                // The registry missed it, but the feed itself usually
                // knows the type code and registration — show those
                // instead of declaring the airframe unknown.
                if (el) {
                  const fbName = p.model_name || p.model;
                  const fbBits = [p.registration, p.model].filter((x: any) => x && x !== 'N/A' && x !== 'Unknown')
                    .map((x: string) => htmlEsc(String(x))).join(' · ');
                  el.innerHTML = fbName
                    ? `<div style="color:#E8E6E0;font-size:11px;line-height:1.35;">${htmlEsc(fbName)}</div>` +
                      (fbBits ? `<div style="color:#78909C;font-size:9px;margin-top:2px;">${fbBits}</div>` : '')
                    : '<span style="color:#5C5A54;font-size:9px;">AIRFRAME NOT IN REGISTRY</span>';
                }
                return;
              }
              const bits = [d.registration, d.typeCode, d.operator].filter(Boolean)
                .map((x: string) => htmlEsc(String(x))).join(' · ');
              const photoLabel = document.getElementById(`acphoto-label-${idSafe(p.icao24)}`);
              if (photoLabel && d.model) photoLabel.textContent = `\u2708 ${d.model}`;
              el.innerHTML =
                `<div style="color:#E8E6E0;font-size:11px;line-height:1.35;">${htmlEsc(d.model || 'Unidentified type')}</div>` +
                (bits ? `<div style="color:#78909C;font-size:9px;margin-top:2px;">${bits}</div>` : '');
            })
            .catch(() => {});
        }

        // Resolve origin/destination for the readout only. The line this used
        // to draw was a straight hop between two airports, which is not the
        // path flown — watched aircraft draw their real reported track instead.
        const cleanCallsign = cs.replace(/\s+/g, '');
        const routeParams = new URLSearchParams({
          callsign: cleanCallsign,
          icao24: p.icao24 || '',
          lat: String(coords[1]),
          lng: String(coords[0]),
          speed: String(p.speed_knots || 0),
        });
        fetch(`/api/flight-route?${routeParams}`)
          .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
          .then(routeData => {
            const el = document.getElementById(routeLoadingId);
            if (!el) return;
            if (routeData.found && routeData.origin && routeData.destination) {
              const depTime = formatTime(routeData.departureTime);
              const arrTime = formatTime(routeData.arrivalTime);
              const pct = Math.round((routeData.progress || 0) * 100);
              const distKm = routeData.totalDistanceKm || 0;
              el.innerHTML = `
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
                  <div><span style="color:#5C5A54;font-size:8px;">FROM</span><br/><span style="color:#E8E6E0;font-size:13px;font-weight:700;">${htmlEsc(routeData.origin.iata || routeData.origin.icao)}</span> <span style="color:#5C5A54;font-size:9px;">${htmlEsc(routeData.origin.city)}</span></div>
                  <span style="color:#5C5A54;font-size:11px;">&rarr;</span>
                  <div style="text-align:right;"><span style="color:#5C5A54;font-size:8px;">TO</span><br/><span style="color:#E8E6E0;font-size:13px;font-weight:700;">${htmlEsc(routeData.destination.iata || routeData.destination.icao)}</span> <span style="color:#5C5A54;font-size:9px;">${htmlEsc(routeData.destination.city)}</span></div>
                </div>
                <div style="height:2px;background:rgba(255,255,255,0.06);border-radius:1px;margin:6px 0;"><div style="width:${pct}%;height:100%;background:rgba(255,255,255,0.35);border-radius:1px;"></div></div>
                <div style="display:flex;justify-content:space-between;font-size:10px;color:#78909C;">
                  <span>DEP ${depTime}</span>
                  <span>${pct}% &middot; ${distKm.toLocaleString()}km</span>
                  <span>ARR ${arrTime}</span>
                </div>
              `;
            } else {
              el.innerHTML = `<span style="color:#5C5A54;font-size:9px;">NO SCHEDULED ROUTE</span>`;
            }
          })
          .catch(() => {
            const el = document.getElementById(routeLoadingId);
            if (el) el.innerHTML = `<span style="color:#5C5A54;font-size:9px;">ROUTE UNAVAILABLE</span>`;
          });
    };
    ['fl-commercial','fl-private','fl-jets','fl-military'].forEach(layer => {
      map.on('click', layer, e => {
        if (!e.features?.length) return;
        showFlightPopup(e.features[0]);
      });
      map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = ''; });
    });

    // ── CCTV (opens CameraViewer panel) ──
    map.on('click', 'cctv-dots', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      // Emit the camera data so the CameraViewer opens
      onEntityClick?.({
        type: 'cctv',
        id: p.id,
        name: p.name,
        city: p.city,
        country: p.country,
        source: p.source,
        feed_url: p.feed_url,
        stream_url: p.stream_url,
        stream_type: p.stream_type,
        external_url: p.external_url,
        lat: coords[1],
        lng: coords[0],
      });
      // Also fly to the camera
      map.flyTo({ center: coords, zoom: Math.max(map.getZoom(), 13), duration: 1000 });
    });

    // ── Earthquakes (with USGS link) ──
    const openQuakePopup = (feature: any) => {
      const p = feature.properties as any;
      const coords = (feature.geometry as any).coordinates;
      popup(coords, `<div style="${pStyle}border:1px solid rgba(255,149,0,0.3);">
        <div style="color:#FF9500;font-size:14px;font-weight:700;margin-bottom:4px;">M${p.magnitude} EARTHQUAKE</div>
        <div style="font-size:9px;color:#E8E6E0;margin-bottom:8px;">${htmlEsc(p.place||'Unknown location')}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:9px;">
          <div><span style="color:#5C5A54;">DEPTH</span><br/><span style="color:#E8E6E0;">${p.depth||'—'}km</span></div>
          <div><span style="color:#5C5A54;">COORDS</span><br/><span style="color:#E8E6E0;">${coords[1].toFixed(3)}, ${coords[0].toFixed(3)}</span></div>
        </div>
        <a href="${p.source === 'NIGGG-BAS' ? 'https://ndc.niggg.bas.bg/' : `https://earthquake.usgs.gov/earthquakes/eventpage/${encodeURIComponent(p.id||'')}`}" target="_blank" style="${linkStyle}color:#FF9500;border:1px solid rgba(255,149,0,0.4);background:rgba(255,149,0,0.1);">📊 ${p.source === 'NIGGG-BAS' ? 'NIGGG-BAS' : 'USGS DETAILS'}</a>
        ${p.id ? `<button onclick="window.__weShareEntity&&window.__weShareEntity('quake','${idSafe(p.id)}')" style="${shareBtnStyle}">\U0001F517 SHARE</button>` : ''}
      </div>`);
    };
    map.on('click', 'eq-circles', e => { if (e.features?.length) openQuakePopup(e.features[0]); });
    map.on('click', 'eq-icons', e => { if (e.features?.length) openQuakePopup(e.features[0]); });

    // ── Satellites (SatNOGS powered) ──
    // Layers with their own click handlers. The satellite pick defers to
    // these, and to nothing else — the basemap is not a click target.
    const CLICKABLE_LAYERS = new Set(['conflict-icons','cctv-dots','eq-circles','eq-icons','fires-heat','fires-icons','plow-icons',
      'fire-perim-fill','hurricane-current','hurricane-icons','hurricane-points','hurricane-cone','gauge-dots','alert-dots','gbfs-systems','gbfs-stations','gbfs-vehicles','transit-dots','transit-icons-bus','transit-icons-rail','transit-stops-dots','transit-cluster-circles','traffic-flow','tomtom-flow-lines','gdelt-dots','weather-dots','weather-tsunami-icons','weather-storm-icons','weather-tornado-icons','infra-dots','maritime-dots','maritime-icons','choke-dots','news-dots',
      'balloon-dots','rad-dots','ship-dots','sweep-device-dots','scan-targets-dots',
      'sdk-sea','sdk-air','sdk-intel','sdk-air-glow','sdk-intel-glow','malware-dots','cyber-heads','gdelt-events-dots',
      'cf-outage-dots','cf-attack-dots','fl-commercial','fl-private','fl-jets','fl-military','launch-pads','alert-pin-dots','street-level-dots','street-level-hit']);

    // Satellites are picked on the GPU: the pick pass runs the same vertex
    // shader as the visible one, so the target is always exactly where the
    // marker was drawn — including its altitude. A ground-projected hit test
    // would put the target under the satellite instead of on it.
    map.on('click', e => {
      const layer = satLayerRef.current;
      if (!layer) return;
      // Defer to any layer that has its own click handler, so a camera or an
      // aircraft under the cursor is not stolen by a satellite behind it.
      // Only those layers count: querying every feature matches the basemap
      // land and water fills at essentially any point on the globe, which
      // made this bail out every single time.
      const hits = map.queryRenderedFeatures(e.point);
      if (hits.some(f => f.layer?.id && CLICKABLE_LAYERS.has(f.layer.id))) return;
      // An OI arc or point is picked on the GPU too, and it is in front: the click is OI's.
      if (oiGlobeRef.current?.hit(e.point)) return;
      const idx = layer.pick(e.point.x, e.point.y);
      const p = idx == null ? null : satRowsRef.current[idx];
      // Clicking past every satellite is how a selection is dismissed, so an
      // empty click has to clear the ring and the track rather than leave them
      // lit over nothing.
      if (idx == null || !p) { clearSat(); return; }

      // The readout is a panel, not a MapLibre popup: a popup can only anchor
      // to a ground coordinate, and these markers are drawn at altitude. Any
      // other layer's popup is still welcome to the screen, but not on top of
      // this selection.
      popupRef.current?.remove();
      layer.setOrbit(null);
      satPickedRef.current = idx;
      satSelectedIdRef.current = p.noradId ?? null;
      layer.setSelected(idx);
      setSelectedSat({ ...p, periodMinutes: null, track: p.noradId ? 'loading' : 'unavailable' });
      // Onboarding first-use signal — see src/lib/onboarding (Build A).
      try { window.dispatchEvent(new CustomEvent('we:satellite-selected')); } catch { /* noop */ }

      // Draw the selected satellite's orbit. Fetched per click rather than
      // bundled with the catalogue: that payload is already megabytes, and an
      // operator looks at one orbit at a time.
      if (p.noradId) {
        const wanted = p.noradId;
        // A slower reply for a satellite the operator has already moved on
        // from must not draw over the one they are looking at now.
        const stale = () => satSelectedIdRef.current !== wanted;
        const mark = (track: SatelliteDetail['track'], periodMinutes: number | null = null) =>
          setSelectedSat(prev => (prev && prev.noradId === wanted ? { ...prev, track, periodMinutes } : prev));
        const at = satEpochRef.current;
        fetch(`/api/satellites/orbit?id=${encodeURIComponent(wanted)}${at ? `&t=${at}` : ''}`)
          .then(r => (r.ok ? r.json() : null))
          .then(d => {
            if (stale()) return;
            if (!d?.segments?.length) { mark('unavailable'); return; }
            layer.setOrbit(
              d.segments.map((seg: number[][]) => seg.map(([lng, lat, altKm]) => ({ lng, lat, altKm }))),
              parseColor(satColorFor(p.category, p.color, paletteRef.current)),
            );
            mark('ready', typeof d.periodMinutes === 'number' ? d.periodMinutes : null);
          })
          // No track is fine; the satellite still shows — but the readout says so
          // rather than sitting on 'plotting' forever.
          .catch(() => { if (!stale()) mark('unavailable'); });
      }
    });

    // The cursor should say a satellite is clickable, like every other layer.
    // Picking re-renders the entire catalogue and reads back from the GPU.
    // Keep that work out of camera gestures and limit hover checks to 10/sec.
    // Click selection above remains immediate and full precision.
    let hoverFrame = 0;
    let lastHoverPick = -Infinity;
    let satCursorOwned = false;
    map.on('mousemove', e => {
      const layer = satLayerRef.current;
      if (!layer || hoverFrame || map.isMoving() || performance.now() - lastHoverPick < 100) return;
      hoverFrame = requestAnimationFrame(() => {
        hoverFrame = 0;
        if (map.isMoving()) return;
        const canvas = map.getCanvas();
        // Never fight another layer that has already claimed the cursor.
        if (canvas.style.cursor && canvas.style.cursor !== 'pointer') return;
        lastHoverPick = performance.now();
        const over = layer.pick(e.point.x, e.point.y) != null;
        if (over) { canvas.style.cursor = 'pointer'; satCursorOwned = true; }
        else if (satCursorOwned) { canvas.style.cursor = ''; satCursorOwned = false; }
      });
    });

    // ── Fires (with NASA FIRMS link) ──
    const openFirePopup = (feature: any) => {
      const p = feature.properties as any;
      const coords = (feature.geometry as any).coordinates;
      popup(coords, `<div style="${pStyle}border:1px solid rgba(255,107,0,0.3);">
        <div style="color:#FF6B00;font-size:12px;font-weight:700;margin-bottom:6px;">🔥 ACTIVE FIRE DETECTED</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:9px;margin-bottom:8px;">
          <div><span style="color:#5C5A54;">BRIGHTNESS</span><br/><span style="color:#FF6B00;">${p.brightness||'—'}K</span></div>
          <div><span style="color:#5C5A54;">COORDS</span><br/><span style="color:#E8E6E0;">${coords[1].toFixed(3)}°, ${coords[0].toFixed(3)}°</span></div>
        </div>
        <a href="https://firms.modaps.eosdis.nasa.gov/map/#d:24hrs;l:noaa20-viirs,viirs,modis_a,modis_t;@${coords[0]},${coords[1]},10z" target="_blank" style="${linkStyle}color:#FF6B00;border:1px solid rgba(255,107,0,0.4);background:rgba(255,107,0,0.1);">🛰️ NASA FIRMS MAP</a>
        <button onclick="window.__weShareEntity&&window.__weShareEntity('fire','${coords[1].toFixed(3)},${coords[0].toFixed(3)}')" style="${shareBtnStyle}">\U0001F517 SHARE</button>
      </div>`);
    };
    map.on('click', 'fires-heat', e => { if (e.features?.length) openFirePopup(e.features[0]); });
    map.on('click', 'fires-icons', e => { if (e.features?.length) openFirePopup(e.features[0]); });

    // ── Hurricanes (NOAA NHC) ──
    const CLASS_LABEL: Record<string, string> = { HU: 'HURRICANE', TS: 'TROPICAL STORM', TD: 'TROPICAL DEPRESSION', STS: 'SUBTROPICAL STORM', SD: 'SUBTROPICAL DEPRESSION', EX: 'EXTRATROPICAL', PT: 'POST-TROPICAL', LO: 'LOW', DB: 'DISTURBANCE' };
    const ssCategory = (kt: number | null) => kt == null ? null : kt >= 137 ? 5 : kt >= 113 ? 4 : kt >= 96 ? 3 : kt >= 83 ? 2 : kt >= 64 ? 1 : 0;
    // ── Storm selection state (highlight + re-center) ──
    // The hurricanes source is the freshest storm data the client
    // holds; both the card's origin/change sections and the re-center
    // control read from it at click time, never from stale closures.
    const allStormFeatures = (): any[] => {
      try { return map.querySourceFeatures('hurricanes') as any[]; } catch { return []; }
    };
    const NUMERIC_STORM_PROPS = ['intensityKt', 'pressureMb', 'category', 'maxWindKt', 'gustKt', 'fcstHrs', 'radiiKt', 'neNm', 'seNm', 'swNm', 'nwNm', 'advNum', 'movementDir', 'movementSpeedKt'];
    const stormGroupFor = (stormId: string): StormGroup | null => {
      const feats = allStormFeatures().map((f: any) => {
        const p = { ...(f?.properties ?? {}) };
        for (const k of NUMERIC_STORM_PROPS) {
          if (typeof p[k] === 'string' && p[k].trim() !== '' && Number.isFinite(Number(p[k]))) p[k] = Number(p[k]);
        }
        return { ...f, properties: p };
      });
      return groupStormFeatures(feats).find(g => g.current.stormId === stormId) ?? null;
    };
    let stormPulseTimer: ReturnType<typeof setInterval> | null = null;
    const clearStormSelection = () => {
      if (stormPulseTimer) { clearInterval(stormPulseTimer); stormPulseTimer = null; }
      for (const id of ['hurricane-selected-ring', 'hurricane-selected-halo']) {
        if (map.getLayer(id)) map.setFilter(id, ['==', ['get', 'stormId'], '__none__'] as any);
      }
      for (const id of ['hurricane-selected-past', 'hurricane-past-points']) {
        if (map.getLayer(id)) map.setFilter(id, ['==', ['get', 'name'], '__none__'] as any);
      }
    };
    const applyStormSelection = (stormId: string, name: string) => {
      clearStormSelection();
      // GIS features (past track / past points) key on the storm NAME
      // as the GIS feed spells it — resolve that exact spelling here.
      const norm = (s: string) => s.trim().toLowerCase();
      const gisName = allStormFeatures().find(f =>
        (f.properties?.kind === 'past' || f.properties?.kind === 'pastpoint') &&
        norm(String(f.properties?.name ?? '')) === norm(name))?.properties?.name ?? name;
      if (map.getLayer('hurricane-selected-ring')) map.setFilter('hurricane-selected-ring', ['all', ['==', ['get', 'kind'], 'current'], ['==', ['get', 'stormId'], stormId]] as any);
      if (map.getLayer('hurricane-selected-halo')) map.setFilter('hurricane-selected-halo', ['all', ['==', ['get', 'kind'], 'current'], ['==', ['get', 'stormId'], stormId]] as any);
      if (map.getLayer('hurricane-selected-past')) map.setFilter('hurricane-selected-past', ['all', ['==', ['get', 'kind'], 'past'], ['==', ['get', 'name'], gisName]] as any);
      if (map.getLayer('hurricane-past-points')) map.setFilter('hurricane-past-points', ['all', ['==', ['get', 'kind'], 'pastpoint'], ['==', ['get', 'name'], gisName]] as any);
      let on = true;
      stormPulseTimer = setInterval(() => {
        on = !on;
        if (map.getLayer('hurricane-selected-ring')) {
          map.setPaintProperty('hurricane-selected-ring', 'circle-stroke-opacity', on ? 0.95 : 0.3);
        }
      }, 850);
    };
    // Re-center reads the storm's CURRENT position from the source at
    // click time — storms move, the popup's coordinates go stale.
    (window as any).__weStormRecenter = (stormId: string) => {
      const f = allStormFeatures().find(f => f.properties?.kind === 'current' && String(f.properties?.stormId ?? '') === stormId);
      const c = f?.geometry?.coordinates;
      if (Array.isArray(c)) map.flyTo({ center: c as any, zoom: Math.max(map.getZoom(), 6), duration: 1100 });
    };
    const openStormPopup = (feature: any, opts?: { shared?: boolean }) => {
      const p = feature.properties as any;
      const coords = (feature.geometry as any).coordinates;
      const cat = ssCategory(p.intensityKt != null ? Number(p.intensityKt) : null);
      const mph = p.intensityKt != null ? Math.round(Number(p.intensityKt) * 1.151) : null;
      const grp = p.stormId ? stormGroupFor(String(p.stormId)) : null;
      const sum = grp ? stormChangeSummary(grp) : null;
      const fmtDay = (iso: string | null) => iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }) : null;
      const signed = (n: number) => (n > 0 ? '+' : '') + n;
      const secHead = (t: string) => `<div style="font-size:8px;color:#5C5A54;letter-spacing:0.14em;margin:10px 0 4px;border-top:1px solid rgba(255,255,255,0.07);padding-top:8px;">${t}</div>`;
      const row = (label: string, value: string) => `<div><span style="color:#5C5A54;">${label}</span><br/><span style="color:#E8E6E0;">${value}</span></div>`;
      let originHtml = '';
      if (sum?.genesis) {
        const day = fmtDay(sum.genesis.timeIso);
        const trackHrs = sum.genesis.timeIso && grp?.current.lastUpdate
          ? Math.round((Date.parse(grp.current.lastUpdate) - Date.parse(sum.genesis.timeIso)) / 3_600_000) : null;
        originHtml = `${secHead('ORIGIN & TRACK')}<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:9px;">
          ${row('FORMED', `${day ? day + ' · ' : ''}${sum.genesis.lat.toFixed(1)}°, ${sum.genesis.lng.toFixed(1)}°`)}
          ${row('BEST TRACK', `${sum.historyPoints > 0 ? sum.historyPoints + ' positions' : 'track line'}${trackHrs && trackHrs > 0 ? ' · ~' + trackHrs + 'h' : ''}`)}
          ${row('MOVING', `${p.movementDir != null ? (compassDirection(Number(p.movementDir)) ?? p.movementDir + '°') : '—'}${p.movementSpeedKt != null ? ' at ' + p.movementSpeedKt + ' kt' : ''}`)}
          ${row('NOW', `${coords[1].toFixed(1)}°, ${coords[0].toFixed(1)}°`)}
        </div>`;
      }
      let changeHtml = '';
      if (sum && (sum.windDeltaKt !== null || (sum.catThen !== null && sum.catNow !== null) || sum.sizeNowNm !== null)) {
        const parts: string[] = [];
        if (sum.windDeltaKt !== null) parts.push(row('WINDS SINCE FORMATION', `${sum.windThenKt} → ${sum.windNowKt} kt (${signed(sum.windDeltaKt)})`));
        if (sum.catThen !== null && sum.catNow !== null && sum.catThen !== sum.catNow) parts.push(row('CATEGORY', `${sum.catThen === 0 ? 'Below Cat 1' : 'Cat ' + sum.catThen} → Cat ${sum.catNow}`));
        if (sum.sizeNowNm !== null) parts.push(row('SIZE — 34KT WINDS REACH', `${sum.sizeThenNm !== null && sum.sizeDeltaNm !== null ? sum.sizeThenNm + ' → ' : ''}${sum.sizeNowNm} nm${sum.sizeDeltaNm ? ' (' + signed(sum.sizeDeltaNm) + ')' : ''}`));
        changeHtml = `${secHead('WHAT CHANGED')}<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:9px;">${parts.join('')}</div>` +
          (sum.sizeDeltaNm !== null && sum.sizeDeltaNm > 0 ? `<div style="font-size:8.5px;color:#B8B4AA;line-height:1.5;margin-top:5px;">${STORM_SIZE_MEANING}</div>` : '');
      }
      popup(coords, `<div style="${pStyle}border:1px solid rgba(255,82,82,0.35);">
        <div style="color:#FF5252;font-size:13px;font-weight:700;margin-bottom:4px;">🌀 ${htmlEsc((p.name || 'TROPICAL CYCLONE').toUpperCase())}</div>
        <div style="font-size:9px;color:#E8E6E0;margin-bottom:8px;">${CLASS_LABEL[p.classification] || htmlEsc(p.classification || '')}${cat ? ' · CATEGORY ' + cat : ''}</div>
        ${opts?.shared ? '<div style="display:inline-block;font-size:8px;font-weight:700;letter-spacing:0.12em;color:#FFD54F;border:1px solid rgba(255,213,79,0.5);border-radius:3px;padding:2px 6px;margin-bottom:8px;">🔗 OPENED FROM A SHARED LINK</div>' : ''}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:9px;margin-bottom:8px;">
          <div><span style="color:#5C5A54;">MAX WINDS</span><br/><span style="color:#E8E6E0;">${p.intensityKt != null ? p.intensityKt + ' kt (' + mph + ' mph)' : '—'}</span></div>
          <div><span style="color:#5C5A54;">PRESSURE</span><br/><span style="color:#E8E6E0;">${p.pressureMb != null ? p.pressureMb + ' mb' : '—'}</span></div>
          <div><span style="color:#5C5A54;">MOVEMENT</span><br/><span style="color:#E8E6E0;">${p.movementDir != null ? p.movementDir + '° at ' + (p.movementSpeedKt ?? '—') + ' kt' : '—'}</span></div>
          <div><span style="color:#5C5A54;">POSITION</span><br/><span style="color:#E8E6E0;">${coords[1].toFixed(2)}°, ${coords[0].toFixed(2)}°</span></div>
        </div>
        ${originHtml}
        ${changeHtml}
        <div style="font-size:8px;color:#5C5A54;letter-spacing:0.08em;margin-top:8px;">NOAA · NATIONAL HURRICANE CENTER</div>
        ${p.stormId ? `<button onclick="window.__weStormRecenter&&window.__weStormRecenter('${idSafe(p.stormId)}')" style="${shareBtnStyle}">◎ RE-CENTER ON STORM</button>` : ''}
        ${p.stormId ? `<button onclick="window.__weShareEntity&&window.__weShareEntity('storm','${idSafe(p.stormId)}')" style="${shareBtnStyle}">\U0001F517 SHARE</button>` : ''}
      </div>`);
      if (p.stormId) {
        applyStormSelection(String(p.stormId), String(p.name ?? ''));
        popupRef.current?.on('close', () => clearStormSelection());
      }
    };

    map.on('click', 'hurricane-current', e => { if (e.features?.length) openStormPopup(e.features[0]); });
    map.on('click', 'hurricane-icons', e => { if (e.features?.length) openStormPopup(e.features[0]); });
    map.on('click', 'hurricane-points', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      popup(coords, `<div style="${pStyle}border:1px solid rgba(77,208,225,0.35);">
        <div style="color:#4DD0E1;font-size:12px;font-weight:700;margin-bottom:4px;">🌀 ${htmlEsc((p.name || 'FORECAST POINT').toUpperCase())}</div>
        <div style="font-size:9px;color:#E8E6E0;margin-bottom:8px;">FORECAST${p.validLabel ? ' · ' + htmlEsc(p.validLabel) : ''}${p.fcstHrs != null ? ' · +' + p.fcstHrs + 'H' : ''}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:9px;margin-bottom:8px;">
          <div><span style="color:#5C5A54;">MAX WINDS</span><br/><span style="color:#E8E6E0;">${p.maxWindKt != null ? p.maxWindKt + ' kt' : '—'}</span></div>
          <div><span style="color:#5C5A54;">GUSTS</span><br/><span style="color:#E8E6E0;">${p.gustKt != null ? p.gustKt + ' kt' : '—'}</span></div>
          <div><span style="color:#5C5A54;">PRESSURE</span><br/><span style="color:#E8E6E0;">${p.pressureMb != null ? p.pressureMb + ' mb' : '—'}</span></div>
          <div><span style="color:#5C5A54;">CATEGORY</span><br/><span style="color:#E8E6E0;">${p.category != null && p.category > 0 ? p.category : '—'}</span></div>
        </div>
        <div style="font-size:8px;color:#5C5A54;letter-spacing:0.08em;">NOAA · NATIONAL HURRICANE CENTER</div>
      </div>`);
    });
    map.on('click', 'hurricane-cone', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      popup(e.lngLat, `<div style="${pStyle}border:1px solid rgba(77,208,225,0.35);">
        <div style="color:#4DD0E1;font-size:12px;font-weight:700;margin-bottom:4px;">🌀 ${htmlEsc((p.name || 'FORECAST CONE').toUpperCase())}</div>
        <div style="font-size:9px;color:#E8E6E0;margin-bottom:8px;">FORECAST CONE OF UNCERTAINTY${p.advisory ? ' · ADVISORY ' + htmlEsc(p.advisory) : ''} — the storm center is expected to remain within this area about 2 times out of 3.</div>
        <div style="font-size:8px;color:#5C5A54;letter-spacing:0.08em;">NOAA · NATIONAL HURRICANE CENTER</div>
      </div>`);
    });

    // ── River Gauges (USGS) ──
    map.on('click', 'gauge-dots', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      popup(coords, `<div style="${pStyle}border:1px solid rgba(41,182,246,0.35);">
        <div id="gauge-name-${htmlEsc(p.id)}" style="color:#29B6F6;font-size:12px;font-weight:700;margin-bottom:4px;">💧 USGS GAUGE ${htmlEsc(p.id)}</div>
        <div style="font-size:9px;color:#E8E6E0;margin-bottom:8px;">REAL-TIME STREAM GAUGE</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:9px;margin-bottom:8px;">
          <div><span style="color:#5C5A54;">GAGE HEIGHT</span><br/><span style="color:#E8E6E0;">${p.gh != null ? p.gh + ' ft' : '—'}</span></div>
          <div><span style="color:#5C5A54;">DISCHARGE</span><br/><span style="color:#E8E6E0;">${p.flow != null ? Number(p.flow).toLocaleString('en-US') + ' ft³/s' : '—'}</span></div>
          <div><span style="color:#5C5A54;">UPDATED</span><br/><span style="color:#E8E6E0;">${p.t ? formatTime(p.t) : '—'}</span></div>
          <div><span style="color:#5C5A54;">COORDS</span><br/><span style="color:#E8E6E0;">${coords[1].toFixed(3)}, ${coords[0].toFixed(3)}</span></div>
        </div>
        <a href="https://waterdata.usgs.gov/monitoring-location/USGS-${encodeURIComponent(p.id || '')}/" target="_blank" style="${linkStyle}color:#29B6F6;border:1px solid rgba(41,182,246,0.4);background:rgba(41,182,246,0.1);">📈 USGS GAUGE PAGE</a>
        <div style="font-size:8px;color:#5C5A54;letter-spacing:0.08em;margin-top:8px;">DATA — USGS WATERDATA</div>
      </div>`);
      // The bulk feed carries no names — resolve this gauge's name in place.
      fetch(`/api/river-gauges?site=${encodeURIComponent(p.id || '')}`)
        .then(r => r.json())
        .then(j => {
          const el = document.getElementById(`gauge-name-${p.id}`);
          if (el && j?.name) el.textContent = '💧 ' + j.name;
        })
        .catch(() => { /* keep the site-id heading */ });
    });

    // ── ALERT Fire Cameras (ALERTCalifornia / ALERTWest) ──
    map.on('click', 'alert-dots', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      const bust = Math.floor(Date.now() / 15000);
      popup(coords, `<div style="${pStyle}border:1px solid rgba(255,179,0,0.35);">
        <div style="color:#FFB300;font-size:12px;font-weight:700;margin-bottom:2px;">📷 ${htmlEsc((p.name || 'ALERT CAMERA').toUpperCase())}</div>
        <div style="font-size:9px;color:#E8E6E0;margin-bottom:8px;">${htmlEsc(p.county ? p.county.toUpperCase() + ' COUNTY' : '')}${p.online ? ' · ONLINE' : ' · OFFLINE'}</div>
        <img src="${urlSafe(p.img)}?t=${bust}" alt="Latest frame from ${htmlEsc(p.name || 'ALERT camera')}" style="width:100%;border-radius:6px;display:block;background:#000;" loading="lazy" />
        <div style="font-size:8px;color:#5C5A54;letter-spacing:0.08em;margin-top:8px;">LIVE IMAGE — REFRESHES ~15 SECONDS · ALERTCALIFORNIA / ALERTWEST NETWORK</div>
        ${p.url ? `<a href="${urlSafe(p.url)}" target="_blank" style="${linkStyle}color:#FFB300;border:1px solid rgba(255,179,0,0.4);background:rgba(255,179,0,0.1);">🎥 CAMERA PAGE</a>` : ''}
      </div>`);
    });

    // ── GBFS micromobility ──
    map.on('click', 'gbfs-systems', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      const zoomed = map.getZoom() >= 9.5;
      popup(coords, `<div style="${pStyle}border:1px solid rgba(38,166,154,0.35);">
        <div style="color:#26A69A;font-size:12px;font-weight:700;margin-bottom:4px;">🚲 ${htmlEsc((p.name || 'SHARED MOBILITY').toUpperCase())}</div>
        <div style="font-size:9px;color:#E8E6E0;margin-bottom:8px;">${htmlEsc(p.city || '')}${p.country ? ' · ' + htmlEsc(p.country) : ''}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:9px;margin-bottom:8px;">
          <div><span style="color:#5C5A54;">${p.type === 'free' ? 'VEHICLES' : 'STATIONS'}</span><br/><span style="color:#E8E6E0;">${p.n ?? '—'}</span></div>
          <div><span style="color:#5C5A54;">NETWORK</span><br/><span style="color:#E8E6E0;">${p.type === 'free' ? 'Free-floating' : 'Docked'}</span></div>
        </div>
        ${zoomed ? '' : '<div style="font-size:9px;color:#80CBC4;margin-bottom:4px;">Zoom in to load live bike &amp; dock availability.</div>'}
        <div style="font-size:8px;color:#5C5A54;letter-spacing:0.08em;">DATA — GBFS · MOBILITYDATA DIRECTORY</div>
      </div>`);
    });
    map.on('click', 'gbfs-stations', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      popup(coords, `<div style="${pStyle}border:1px solid rgba(102,187,106,0.35);">
        <div style="color:#66BB6A;font-size:12px;font-weight:700;margin-bottom:4px;">🚲 ${htmlEsc((p.name || 'STATION').toUpperCase())}</div>
        <div style="font-size:9px;color:#E8E6E0;margin-bottom:8px;">${htmlEsc(p.sysName || '')}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:9px;margin-bottom:8px;">
          <div><span style="color:#5C5A54;">BIKES AVAILABLE</span><br/><span style="color:#E8E6E0;">${p.bikes != null ? p.bikes : '—'}${p.ebikes != null ? ' (' + p.ebikes + ' e-bikes)' : ''}</span></div>
          <div><span style="color:#5C5A54;">DOCKS FREE</span><br/><span style="color:#E8E6E0;">${p.docks != null ? p.docks : '—'}</span></div>
        </div>
        <div style="font-size:8px;color:#5C5A54;letter-spacing:0.08em;">DATA — GBFS · ${htmlEsc((p.sysName || 'OPERATOR').toUpperCase())}</div>
      </div>`);
    });
    map.on('click', 'gbfs-vehicles', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      popup(coords, `<div style="${pStyle}border:1px solid rgba(156,204,101,0.35);">
        <div style="color:#9CCC65;font-size:12px;font-weight:700;margin-bottom:4px;">🛴 FREE-FLOATING VEHICLE</div>
        <div style="font-size:9px;color:#E8E6E0;margin-bottom:8px;">${htmlEsc(p.sysName || '')}${p.vt ? ' · ' + htmlEsc(p.vt) : ''}</div>
        <div style="font-size:8px;color:#5C5A54;letter-spacing:0.08em;">DATA — GBFS · ${htmlEsc((p.sysName || 'OPERATOR').toUpperCase())}</div>
      </div>`);
    });

    // ── Live Transit (GTFS-Realtime) ──
    // Transit redesign (2026-10-26): taps no longer open MapLibre
    // popups. They set the React selection state, and the small
    // dismissible TransitSelectionCard renders the same feed-provided
    // fields (a row exists only when the feed — or the agency's
    // static GTFS join — actually provided it), plus the actions a
    // popup could never carry: View Route, Follow Vehicle, expand
    // into the Explorer. Close restores the unobstructed globe.
    const openTransitVehicle = (e: any) => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      popupRef.current?.remove();
      setTransitSel({
        kind: 'vehicle',
        agencyId: p.agencyId || '',
        coords: [coords[0], coords[1]],
        p,
      } satisfies TransitVehicleSelection);
    };
    map.on('click', 'transit-dots', openTransitVehicle);
    map.on('click', 'transit-icons-bus', openTransitVehicle);
    map.on('click', 'transit-icons-rail', openTransitVehicle);

    // Cluster bubbles zoom into their vehicles — never a selection.
    map.on('click', 'transit-cluster-circles', e => {
      const f = e.features?.[0] as any;
      if (!f) return;
      const src = map.getSource('transit-clusters') as any;
      if (src?.getClusterExpansionZoom) {
        src.getClusterExpansionZoom(f.properties.cluster_id, (err: any, zoom: number) => {
          if (!err) map.easeTo({ center: f.geometry.coordinates, zoom });
        });
      }
    });

    // ── Transit stops (network layer) ──
    // The card fetches /api/transit/stop itself: timetable departures
    // upgraded by TripUpdates wherever the feed carries a fresh
    // prediction for that trip at this stop; every row is labeled
    // REALTIME or SCHEDULED so a timetable time never reads as live.
    map.on('click', 'transit-stops-dots', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      popupRef.current?.remove();
      setTransitSel({
        kind: 'stop',
        agencyId: p.agency || '',
        coords: [coords[0], coords[1]],
        p,
      });
    });

    // ── Fire Perimeters (NIFC WFIGS) ──
    map.on('click', 'fire-perim-fill', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      popup(e.lngLat, `<div style="${pStyle}border:1px solid rgba(255,107,0,0.3);">
        <div style="color:#FF6B00;font-size:12px;font-weight:700;margin-bottom:6px;">🔥 ${htmlEsc((p.name || 'FIRE PERIMETER').toUpperCase())}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:9px;margin-bottom:8px;">
          <div><span style="color:#5C5A54;">ACRES</span><br/><span style="color:#E8E6E0;">${p.acres != null ? Number(p.acres).toLocaleString('en-US') : '—'}</span></div>
          <div><span style="color:#5C5A54;">CONTAINED</span><br/><span style="color:#E8E6E0;">${p.contained != null ? p.contained + '%' : '—'}</span></div>
          <div><span style="color:#5C5A54;">STATE</span><br/><span style="color:#E8E6E0;">${htmlEsc(p.state || '—')}</span></div>
          <div><span style="color:#5C5A54;">UPDATED</span><br/><span style="color:#E8E6E0;">${p.updated ? formatTime(p.updated) : '—'}</span></div>
        </div>
        <div style="font-size:8px;color:#5C5A54;letter-spacing:0.08em;">PERIMETER — NIFC WFIGS</div>
      </div>`);
    });

    // ── Malware Threats (Abuse.ch) ──
    map.on('click', 'malware-dots', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      const tType = (p.threat_type || 'malware').replace(/_/g, ' ').toUpperCase();
      const statusColor = p.status === 'online' ? '#39FF14' : '#FF1744';
      const place = [p.city, p.country].filter(Boolean).join(', ') || 'UNKNOWN';
      const host = p.as_name ? `AS${p.asn} ${p.as_name}` : '';
      const urls = Number(p.url_count) || 1;
      // Every field below is observed. Where the old popup linked to a generic
      // browse page, this links to the specific URLhaus report behind the node.
      const ref = urlSafe(p.reference);

      popup(coords, `<div style="${pStyle}border:1px solid rgba(255,23,68,0.4);box-shadow:inset 0 0 12px rgba(255,23,68,0.1);min-width:250px;">
        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(255,23,68,0.3);padding-bottom:6px;margin-bottom:8px;">
          <div style="color:#FF1744;font-size:12px;font-weight:700;letter-spacing:0.1em;text-shadow:0 0 4px rgba(255,23,68,0.5);">[ ${htmlEsc(tType)} ]</div>
          <div style="color:#5C5A54;font-size:9px;">${htmlEsc(place)}</div>
        </div>
        <div style="color:#E8E6E0;font-size:11px;font-weight:bold;margin-bottom:2px;">${htmlEsc(p.malware || 'Unclassified payload')}</div>
        ${host ? `<div style="color:#5C5A54;font-size:9px;margin-bottom:10px;">${htmlEsc(host)}</div>` : '<div style="margin-bottom:10px;"></div>'}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:9px;margin-bottom:8px;background:rgba(0,0,0,0.3);padding:6px;border-radius:4px;">
          <div><span style="color:#5C5A54;">HOST</span><br/><span style="color:#00E5FF;font-family:monospace;">${htmlEsc(p.ip)}:${htmlEsc(String(p.port ?? 0))}</span></div>
          <div><span style="color:#5C5A54;">STATUS</span><br/><span style="color:${statusColor};">${htmlEsc((p.status||'unknown').toUpperCase())}</span></div>
          <div><span style="color:#5C5A54;">LIVE URLS</span><br/><span style="color:#E8E6E0;">${urls}</span></div>
          <div><span style="color:#5C5A54;">LAST REPORT</span><br/><span style="color:#E8E6E0;">${htmlEsc((p.last_seen || '').split(' ')[0] || '—')}</span></div>
        </div>
        <div style="color:#5C5A54;font-size:9px;margin-bottom:10px;">First seen ${htmlEsc((p.first_seen || '').split(' ')[0] || '—')}${p.reporter ? ` · reported by ${htmlEsc(p.reporter)}` : ''}</div>
        <div style="display:flex;gap:6px;">
          ${ref ? `<a href="${ref}" target="_blank" style="${linkStyle}flex:1;text-align:center;color:#E8E6E0;border:1px solid rgba(255,255,255,0.2);background:rgba(255,255,255,0.05);">URLHAUS REPORT ↗</a>` : ''}
        </div>
      </div>`);
    });


    // ── GDELT 2.0 Events ──
    const QUAD_COLOR: Record<string, string> = { '1': '#00E676', '2': '#00E5FF', '3': '#FF9500', '4': '#FF3D3D' };
    const openGdeltEventPopup = (feature: any) => {
      const p = feature.properties as any;
      const coords = (feature.geometry as any).coordinates;
      const accent = QUAD_COLOR[String(p.quad)] ?? '#9B978E';
      const src = urlSafe(p.url);
      const tone = Number(p.tone);
      popup(coords, `
      <div style="${pStyle}border:1px solid ${accent}66;min-width:250px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
          <span style="width:7px;height:7px;border-radius:50%;background:${accent};box-shadow:0 0 8px ${accent};"></span>
          <span style="color:${accent};font-size:10px;font-weight:700;letter-spacing:0.15em;">${htmlEsc(p.quad_label)}</span>
        </div>
        <div style="color:#E8E6E0;font-size:12px;font-weight:700;margin-bottom:8px;">${htmlEsc(p.name)}</div>
        <div style="display:grid;grid-template-columns:auto 1fr;gap:3px 10px;font-size:10px;color:#9B978E;">
          <span style="opacity:0.6;">Goldstein</span><span style="color:${Number(p.goldstein) < 0 ? '#FF3D3D' : '#00E676'};">${htmlEsc(p.goldstein)}</span>
          <span style="opacity:0.6;">Avg tone</span><span style="color:${tone < 0 ? '#FF9500' : '#00E676'};">${htmlEsc(p.tone)}</span>
          <span style="opacity:0.6;">Articles</span><span style="color:#E8E6E0;">${htmlEsc(p.articles)}</span>
          <span style="opacity:0.6;">Country</span><span style="color:#E8E6E0;">${htmlEsc(p.country || '—')}</span>
        </div>
        <div style="margin-top:8px;font-size:9px;color:#5C5A54;">GDELT 2.0 · ${htmlEsc(String(p.date).slice(0, 16).replace('T', ' '))}Z</div>
        ${src !== '#' ? `<a href="${src}" target="_blank" rel="noopener noreferrer" style="${linkStyle}color:${accent};border:1px solid ${accent}66;background:${accent}1a;">SOURCE ARTICLE</a>` : ''}
        <button onclick="window.__weShareEntity&&window.__weShareEntity('event','${coords[1].toFixed(3)},${coords[0].toFixed(3)}')" style="${shareBtnStyle}">\U0001F517 SHARE</button>
      </div>`);
    };
    map.on('click', 'gdelt-events-dots', e => { if (e.features?.length) openGdeltEventPopup(e.features[0]); });

    // ── Cloudflare Radar: internet outage ──
    map.on('click', 'cf-outage-dots', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      // MapLibre serialises feature properties, so booleans can arrive as strings.
      const ongoing = p.ongoing === true || p.ongoing === 'true';
      const accent = ongoing ? '#FFB300' : '#8B7325';
      const src = urlSafe(p.url);
      popup(coords, `
      <div style="${pStyle}border:1px solid ${accent}66;min-width:250px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
          <span style="width:7px;height:7px;border-radius:50%;background:${accent};box-shadow:0 0 8px ${accent};"></span>
          <span style="color:${accent};font-size:10px;font-weight:700;letter-spacing:0.15em;">
            ${ongoing ? 'ONGOING OUTAGE' : 'RESOLVED OUTAGE'}
          </span>
        </div>
        <div style="color:#E8E6E0;font-size:12px;font-weight:700;margin-bottom:8px;">${htmlEsc(p.country_name)}</div>
        ${p.description ? `<div style="color:#9B978E;font-size:10px;line-height:1.6;margin-bottom:8px;">${htmlEsc(p.description)}</div>` : ''}
        <div style="display:grid;grid-template-columns:auto 1fr;gap:3px 10px;font-size:10px;color:#9B978E;">
          <span style="opacity:0.6;">Cause</span><span style="color:#E8E6E0;">${htmlEsc(p.cause || 'Unspecified')}</span>
          <span style="opacity:0.6;">Scope</span><span style="color:#E8E6E0;">${htmlEsc(p.scope || 'Nationwide')}</span>
          <span style="opacity:0.6;">Started</span><span style="color:#E8E6E0;">${htmlEsc(String(p.start).slice(0, 16).replace('T', ' '))}</span>
          ${p.end ? `<span style="opacity:0.6;">Ended</span><span style="color:#E8E6E0;">${htmlEsc(String(p.end).slice(0, 16).replace('T', ' '))}</span>` : ''}
        </div>
        <div style="margin-top:8px;font-size:9px;color:#5C5A54;">Cloudflare Radar</div>
        ${src !== '#' ? `<a href="${src}" target="_blank" rel="noopener noreferrer" style="${linkStyle}color:${accent};border:1px solid ${accent}66;background:${accent}1a;">RADAR DETAIL</a>` : ''}
      </div>`);
    });

    // ── Cloudflare Radar: attack origin share ──
    map.on('click', 'cf-attack-dots', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      popup(coords, `
      <div style="${pStyle}border:1px solid rgba(255,61,61,0.4);min-width:230px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
          <span style="width:7px;height:7px;border-radius:50%;background:#FF3D3D;box-shadow:0 0 8px #FF3D3D;"></span>
          <span style="color:#FF3D3D;font-size:10px;font-weight:700;letter-spacing:0.15em;">L3 ATTACK ORIGIN</span>
        </div>
        <div style="color:#E8E6E0;font-size:12px;font-weight:700;margin-bottom:8px;">${htmlEsc(p.country_name)}</div>
        <div style="display:grid;grid-template-columns:auto 1fr;gap:3px 10px;font-size:10px;color:#9B978E;">
          <span style="opacity:0.6;">Share</span><span style="color:#FF6B6B;font-weight:700;">${htmlEsc(p.share)}%</span>
          <span style="opacity:0.6;">Code</span><span style="color:#E8E6E0;">${htmlEsc(p.country)}</span>
        </div>
        <div style="margin-top:8px;font-size:9px;color:#5C5A54;line-height:1.5;">
          Share of observed layer-3 attack traffic by origin · Cloudflare Radar
        </div>
      </div>`);
    });

    // ── GDELT Conflicts (with source article) ──
    const openGdacsPopup = (feature: any) => {
      const p = feature.properties as any;
      const coords = (feature.geometry as any).coordinates;
      
      // These are GDACS alerts and each one carries its own report URL. This
      // used to guess a Liveuamap regional war map from the coordinates
      // instead, which sent every event outside the six hardcoded boxes — all
      // of the Americas, Asia and Oceania among them — to the Ukraine map.
      const src = urlSafe(p.url);
      // GDACS is a natural-disaster feed. Every event here was headed
      // "CONFLICT EVENT" — on a live sample that mislabelled 342 of 369
      // events, nearly all of them wildfires.
      const KIND: Record<string, [string, string]> = {
        earthquake: ['🌐 EARTHQUAKE',   '#FF9500'],
        wildfire:   ['🔥 WILDFIRE',     '#FF6B1A'],
        flood:      ['🌊 FLOOD',        '#00B0FF'],
        weather:    ['🌀 TROPICAL CYCLONE', '#00E5FF'],
        volcano:    ['🌋 VOLCANO',      '#FF3D3D'],
        drought:    ['☀️ DROUGHT',      '#FFD500'],
      };
      const [kindLabel, kindColor] = KIND[String(p.kind)] ?? ['⚠️ GLOBAL INCIDENT', '#FF3D3D'];

      popup(coords, `<div style="${pStyle}border:1px solid ${kindColor}4d;">
        <div style="color:${kindColor};font-size:12px;font-weight:700;margin-bottom:6px;">${kindLabel}</div>
        <div style="font-size:9px;color:#E8E6E0;margin-bottom:8px;line-height:1.4;">${htmlEsc(p.name||'Unclassified incident')}</div>
        ${src !== '#' ? `<a href="${src}" target="_blank" rel="noopener noreferrer" style="${linkStyle}flex:1;text-align:center;color:${kindColor};border:1px solid ${kindColor}66;background:${kindColor}26;display:inline-block;width:100%;box-sizing:border-box;margin-top:4px;">[ OPEN SOURCE ↗ ]</a>` : ''}
        <button onclick="window.__weShareEntity&&window.__weShareEntity('event','${coords[1].toFixed(3)},${coords[0].toFixed(3)}')" style="${shareBtnStyle}">\U0001F517 SHARE</button>
      </div>`);
    };
    map.on('click', 'gdelt-dots', e => { if (e.features?.length) openGdacsPopup(e.features[0]); });

    // ── Global Event / Conflict Markers ──
    const openConflictPopup = (feature: any) => {
      const p = feature.properties as any;
      const coords = (feature.geometry as any).coordinates;
      const color = p.severity === 'war' ? '#FF1744' : p.severity === 'high' ? '#FF9500' : '#FFD500';
      popup(coords, `<div style="${pStyle}border:1px solid ${color}40;">
        <div style="color:${color};font-size:12px;font-weight:700;margin-bottom:6px;">⚠️ ${htmlEsc(p.label || 'WARNING EVENT')}</div>
        <div style="font-size:10px;color:#E8E6E0;margin-bottom:8px;line-height:1.4;">${htmlEsc(p.description || 'Global event detected at this location.')}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:9px;margin-bottom:8px;">
          <div><span style="color:#5C5A54;">SEVERITY</span><br/><span style="color:${color};">${(p.severity||'unknown').toUpperCase()}</span></div>
          <div><span style="color:#5C5A54;">COORDS</span><br/><span style="color:#E8E6E0;">${coords[1].toFixed(3)}°, ${coords[0].toFixed(3)}°</span></div>
        </div>
        ${p.sourceUrl ? `<a href="${urlSafe(p.sourceUrl)}" target="_blank" style="${linkStyle}flex:1;text-align:center;color:${color};border:1px solid ${color}40;background:${color}15;display:inline-block;width:100%;box-sizing:border-box;margin-top:4px;">[ OPEN SOURCE ↗ ]</a>` : ''}
        <button onclick="window.__weShareEntity&&window.__weShareEntity('event','${coords[1].toFixed(3)},${coords[0].toFixed(3)}')" style="${shareBtnStyle}">\U0001F517 SHARE</button>
      </div>`);
    };
    map.on('click', 'conflict-icons', e => { if (e.features?.length) openConflictPopup(e.features[0]); });


    // ── Shared entity deep links (lib/share) ──
    // page.tsx resolves what it can from its own datasets and hands
    // every kind here; the map reopens the entity's own popup from
    // the live sources (flights and conflict markers exist only
    // map-side). Retries briefly while sources populate; an id that
    // never matches is stale and simply never opens — the visitor
    // keeps the plain globe, exactly like a stale camera link.
    const openedShareKeys = new Map<string, number>();
    // Flight share links: on a cold load the aircraft's data does not
    // exist yet (the /api/flights build takes ~11 s to its first
    // partial, ~50 s worst case) and the flight sources only carry
    // features while their layers are lit — page.tsx lights all four
    // for a flight link. A fixed handful of retries over ~4 s cannot
    // span that, so a flight request stays pending and re-attempts
    // whenever a flight source (re)loads, until the aircraft appears
    // or the window closes; an aircraft that landed meanwhile simply
    // never opens — the stale-link contract.
    let pendingFlightShare: { id: string; until: number } | null = null;
    const FLIGHT_SHARE_SOURCES = ['flights', 'military', 'jets', 'private-fl'];
    const attemptOpenFlight = (id: string): boolean => {
      const openedAt = openedShareKeys.get(`flight:${id}`);
      if (openedAt && Date.now() - openedAt < 20000) return true;
      let feature: any;
      for (const s of FLIGHT_SHARE_SOURCES) {
        try {
          feature = (map.querySourceFeatures(s) as any[]).find(f => featureMatchesFlightShareId(f, id));
        } catch { feature = undefined; }
        if (feature) break;
      }
      let fromDataset = false;
      if (!feature) {
        // querySourceFeatures only sees features inside the tiles the
        // map currently renders — a shared aircraft outside the
        // opening view (the app dives to the viewer's city on load)
        // can never be found that way, however long the retries run.
        // Fall back to the in-memory snapshot blend, which holds the
        // full dataset regardless of viewport.
        const cur = flightBlendRef.current?.current(Date.now());
        if (cur) {
          feature = findFlightFeatureInBuckets(cur, id) ?? undefined;
          fromDataset = !!feature;
        }
      }
      if (!feature) return false;
      openedShareKeys.set(`flight:${id}`, Date.now());
      const target = flightShareFlyToTarget(feature, map.getZoom());
      if (target) map.flyTo({ center: target.center, zoom: target.zoom, duration: 1200, essential: true });
      showFlightPopup(feature);
      if (fromDataset && target) {
        // A dataset open can resolve the moment the first snapshot
        // lands — while the load sequence is still moving the camera
        // (the opening dive settles after the data arrives) — so its
        // flight can be superseded before the visitor ever sees the
        // aircraft: the card opens, the map stays behind (measured on
        // the /?flight= landing, 2026-10-26). Once this flight has had
        // time to land, check where the camera actually settled and
        // fly once more if it never arrived — but only while this
        // aircraft's card is still open, so a visitor who has already
        // moved on is never yanked back. Source-feature opens cannot
        // resolve until the aircraft is already inside the rendered
        // tiles, so they never need the second flight.
        const { center, zoom } = target;
        setTimeout(() => {
          if (openFlightPopupRef.current?.icao24?.toLowerCase() !== id.toLowerCase()) return;
          if (!flightShareCameraSettledOn(map.getCenter(), center)) {
            map.flyTo({ center, zoom, duration: 1200, essential: true });
          }
        }, 1600);
      }
      return true;
    };
    map.on('sourcedata', (e: any) => {
      if (!pendingFlightShare) return;
      if (Date.now() > pendingFlightShare.until) { pendingFlightShare = null; return; }
      if (!FLIGHT_SHARE_SOURCES.includes(e.sourceId) || !e.isSourceLoaded) return;
      if (attemptOpenFlight(pendingFlightShare.id)) pendingFlightShare = null;
    });
    const shareCoordKey = (f: any): string | null => {
      const c = f?.geometry?.coordinates;
      return Array.isArray(c) ? `${Number(c[1]).toFixed(3)},${Number(c[0]).toFixed(3)}` : null;
    };
    const openSharedEntity = (ev: Event) => {
      const detail: any = (ev as CustomEvent).detail ?? {};
      const kind = String(detail.kind ?? '');
      const id = String(detail.id ?? '');
      if (!kind || !id) return;
      const key = `${kind}:${id}`;
      const attempt = (triesLeft: number) => {
        if (kind === 'flight') {
          // Not the generic retry chain: register (or refresh) the
          // pending request — sourcedata re-attempts own the timing.
          if (!attemptOpenFlight(id)) {
            pendingFlightShare = { id, until: Date.now() + FLIGHT_SHARE_OPEN_DEADLINE_MS };
          }
          return;
        }
        const openedAt = openedShareKeys.get(key);
        if (openedAt && Date.now() - openedAt < 20000) return;
        const findIn = (source: string, pred: (f: any) => boolean) => {
          try { return (map.querySourceFeatures(source) as any[]).find(pred); } catch { return undefined; }
        };
        let feature: any;
        let opener: ((f: any) => void) | null = null;
        let zoom = 7;
        if (kind === 'quake') {
          feature = findIn('earthquakes', f => String(f.properties?.id ?? '') === id);
          opener = openQuakePopup; zoom = 7;
        } else if (kind === 'fire') {
          feature = findIn('fires', f => shareCoordKey(f) === id);
          opener = openFirePopup; zoom = 9;
        } else if (kind === 'storm') {
          feature = findIn('hurricanes', f => f.properties?.kind === 'current' && String(f.properties?.stormId ?? '') === id);
          opener = (f: any) => openStormPopup(f, { shared: true }); zoom = 6;
        } else if (kind === 'event') {
          feature = findIn('gdelt', f => shareCoordKey(f) === id); opener = openGdacsPopup;
          if (!feature) { feature = findIn('gdelt-events', f => shareCoordKey(f) === id); opener = openGdeltEventPopup; }
          if (!feature) { feature = findIn('conflict-zones', f => shareCoordKey(f) === id); opener = openConflictPopup; }
          zoom = 6;
        }
        if (feature && opener) {
          openedShareKeys.set(key, Date.now());
          const c = feature.geometry?.coordinates;
          if (Array.isArray(c)) map.flyTo({ center: c as any, zoom: Math.max(map.getZoom(), zoom), duration: 1200 });
          opener(feature);
          return;
        }
        if (triesLeft > 0) setTimeout(() => attempt(triesLeft - 1), 700);
      };
      attempt(6);
    };
    window.addEventListener('we:open-entity', openSharedEntity);

    // ── OSIRIS SDK link click ──
    const SDK_SOURCE_URLS: Record<string, string> = {
      'AIS Maritime': 'https://www.marinetraffic.com',
      'AIS Stream': 'https://aisstream.io',
      'AIS → Lattice': 'https://aisstream.io',
      'ADS-B / OpenSky': 'https://opensky-network.org',
      'ADS-B → Lattice': 'https://opensky-network.org',
      'Naval Intelligence': 'https://www.odni.gov',
    };
    ['sdk-sea','sdk-sea-glow','sdk-air','sdk-air-glow','sdk-intel','sdk-intel-glow'].forEach(layer => {
      map.on('click', layer, e => {
        if (!e.features?.length) return;
        const p = e.features[0].properties as any;
        const coords = e.lngLat;
        const srcUrl = p.url || SDK_SOURCE_URLS[p.source] || 'https://osirisai.live';
        const domainLabel = p.domain === 'SEA' ? '⚓ MARITIME' : p.domain === 'AIR' ? '✈ AIR CORRIDOR' : '🛡 NAVAL INTEL';
        const domainColor = p.domain === 'SEA' ? '#4FC3F7' : p.domain === 'AIR' ? '#B3E5FC' : '#81D4FA';
        const linkStyle = 'text-decoration:none;padding:3px 8px;border-radius:4px;font-size:9px;font-weight:700;letter-spacing:0.05em;';
        popup([coords.lng, coords.lat], `<div style="${pStyle}border:1px solid ${domainColor}40;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">
            <div style="width:8px;height:8px;border-radius:50%;background:${domainColor};box-shadow:0 0 8px ${domainColor};"></div>
            <span style="color:${domainColor};font-size:11px;font-weight:700;letter-spacing:0.1em;">${domainLabel}</span>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:9px;margin-bottom:8px;">
            <div><span style="color:#5C5A54;">FROM</span><br/><span style="color:#E8E6E0;">${htmlEsc(p.fromName || 'Origin')}</span></div>
            <div><span style="color:#5C5A54;">TO</span><br/><span style="color:#E8E6E0;">${htmlEsc(p.toName || 'Destination')}</span></div>
            <div><span style="color:#5C5A54;">DOMAIN</span><br/><span style="color:${domainColor};">${p.domain}</span></div>
            <div><span style="color:#5C5A54;">SOURCE</span><br/><a href="${urlSafe(srcUrl)}" target="_blank" style="color:${domainColor};text-decoration:underline;cursor:pointer;">${htmlEsc(p.source || 'OSIRIS')}</a></div>
          </div>
          <a href="${urlSafe(srcUrl)}" target="_blank" style="${linkStyle}color:${domainColor};border:1px solid ${domainColor}40;background:${domainColor}18;display:inline-block;margin-top:4px;">OPEN SOURCE ↗</a>
        </div>`);
      });
    });

    /* ── Botnet C2 infrastructure (abuse.ch Feodo Tracker) ──
       Every field below is read off the blocklist row. The popup used to lead
       with a randomly chosen attack verb and a fabricated attacker origin;
       what a row actually supports is an address, a family, a hosting
       country and two observation timestamps. */
    map.on('click', 'cyber-heads', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      const online = p.status === 'online';
      const c = online ? '#FF6D00' : '#8A8880';
      const row = (label: string, value: string, color = '#E8E6E0', mono = false) =>
        `<div><span style="color:#5C5A54;font-size:7px;letter-spacing:0.1em;">${label}</span><br/><span style="color:${color};${mono ? 'font-family:monospace;' : ''}">${value}</span></div>`;
      popup(coords, `<div style="${pStyle}border:1px solid ${c}40;">
        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid ${c}30;padding-bottom:6px;margin-bottom:8px;">
          <div style="color:${c};font-size:12px;font-weight:700;letter-spacing:0.12em;">BOTNET C2 SERVER</div>
          <div style="font-size:8px;padding:2px 6px;border-radius:3px;font-weight:700;letter-spacing:0.1em;background:${c}20;color:${c};border:1px solid ${c}50;">${htmlEsc((p.status || 'unknown').toUpperCase())}</div>
        </div>
        <div style="color:#E8E6E0;font-size:11px;font-weight:bold;margin-bottom:10px;">${htmlEsc(p.malware || 'Family not reported')}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:9px;margin-bottom:8px;background:rgba(0,0,0,0.35);padding:8px;border-radius:4px;border:1px solid rgba(255,255,255,0.04);">
          ${row('C2 ADDRESS', htmlEsc(p.ip || '—'), '#00E5FF', true)}
          ${row('PORT', htmlEsc(String(p.port ?? '—')), '#FFD600', true)}
          ${row('HOSTED IN', htmlEsc(p.country || 'Not reported'))}
          ${row('AS', htmlEsc(p.as_number ? `AS${p.as_number}` : '—'), '#E8E6E0', true)}
          ${row('FIRST SEEN', htmlEsc(p.first_seen || 'Not reported'))}
          ${row('LAST ONLINE', htmlEsc(p.last_online || 'Not reported'))}
        </div>
        ${p.hostname ? `<div style="font-size:9px;color:#8A8880;margin-bottom:8px;font-family:monospace;word-break:break-all;">${htmlEsc(p.hostname)}</div>` : ''}
        <div style="font-size:8px;color:#5C5A54;line-height:1.5;margin-bottom:8px;">Blocklist entry, not an observed attack. Marker sits at the hosting country's centroid, not the host's location.</div>
        <div style="font-size:7px;color:#5C5A54;text-align:center;letter-spacing:0.1em;">SOURCE: <a href="${urlSafe(p.source_url || 'https://feodotracker.abuse.ch/browse/')}" target="_blank" style="color:${c};text-decoration:underline;">ABUSE.CH FEODO TRACKER ↗</a></div>
      </div>`);
    });

    // ── Generic hover for clickables ──
    ['conflict-icons','cctv-dots','eq-circles','eq-icons','fires-heat','fires-icons','gdelt-dots','weather-dots','weather-tsunami-icons','weather-storm-icons','weather-tornado-icons','infra-dots','maritime-dots','maritime-icons','choke-dots','news-dots','balloon-dots','rad-dots','ship-dots','sweep-device-dots','scan-targets-dots','fire-perim-fill','hurricane-current','hurricane-icons','plow-icons','hurricane-points','hurricane-cone','gauge-dots','alert-dots','gbfs-systems','gbfs-stations','gbfs-vehicles','transit-dots','transit-icons-bus','transit-icons-rail','transit-stops-dots','transit-cluster-circles','sdk-sea','sdk-sea-glow','sdk-sea-atmo','sdk-air','sdk-air-glow','sdk-air-atmo','sdk-intel','sdk-intel-glow','sdk-intel-atmo','malware-dots','cyber-heads','gdelt-events-dots','cf-outage-dots','cf-attack-dots','alert-pin-dots'].forEach(layer => {
      map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = ''; });
    });

    // ── Scan Targets click ──
    map.on('click', 'scan-targets-dots', (e: any) => {
      const p = e.features?.[0]?.properties;
      if (!p) return;
      const coords = e.features[0].geometry.coordinates.slice();
      popup(coords, `<div style="${pStyle}border:1px solid rgba(255,61,61,0.5);">
        <div style="color:#FF3D3D;font-size:12px;font-weight:700;margin-bottom:6px;">🎯 TARGET: ${htmlEsc(p.id)}</div>
        <div style="font-size:9px;color:#E8E6E0;margin-bottom:8px;">${htmlEsc(p.city || 'Unknown')}, ${htmlEsc(p.country || 'Unknown')} — ${htmlEsc(p.isp || 'Unknown ISP')}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:9px;">
          <div><span style="color:#5C5A54;">TYPE</span><br/><span style="color:#00E5FF;">${(p.type || 'UNKNOWN').toUpperCase()}</span></div>
          <div><span style="color:#5C5A54;">COORDS</span><br/><span style="color:#E8E6E0;">${coords[1].toFixed(3)}°, ${coords[0].toFixed(3)}°</span></div>
        </div>
      </div>`);
    });

    // ── SCM Suppliers ──
    map.on('click', 'scm-dots', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      const color = p.risk_level === 'CRITICAL' ? '#FF1744' : p.risk_level === 'HIGH' ? '#FF9500' : '#00BCD4';
      const activeThreats = p.active_threats ? JSON.parse(p.active_threats) : [];
      
      let threatsHtml = '';
      if (activeThreats.length > 0) {
        threatsHtml = `<div style="margin-top:8px;padding-top:6px;border-top:1px solid ${color}40;color:${color};font-size:9px;font-weight:bold;">
          ACTIVE THREATS:<br/>${activeThreats.map((t: string) => `⚠ ${htmlEsc(t)}`).join('<br/>')}
        </div>`;
      }

      popup(coords, `<div style="${pStyle}border:1px solid ${color}40;">
        <div style="color:${color};font-size:12px;font-weight:700;margin-bottom:4px;">🏢 ${htmlEsc(p.name)}</div>
        <div style="font-size:9px;color:#aaa;margin-bottom:8px;">${htmlEsc(p.category)} | ${htmlEsc(p.city)}, ${htmlEsc(p.country)}</div>
        <div style="display:grid;grid-template-columns:1fr;gap:4px;font-size:11px;">
          <div><span style="color:#5C5A54;font-size:9px;">SCM RISK LEVEL</span><br/><span style="color:${color};font-weight:bold;">${p.risk_level}</span></div>
        </div>
        ${threatsHtml}
      </div>`);
    });

    // ── IP Sweep device click ──
    map.on('click', 'sweep-device-dots', (e: any) => {
      const p = e.features?.[0]?.properties;
      if (!p) return;
      const coords = e.features[0].geometry.coordinates.slice();
      const ports = JSON.parse(p.ports || '[]');
      const vulns = JSON.parse(p.vulns || '[]');
      const hostnames = JSON.parse(p.hostnames || '[]');
      const riskColors: Record<string, string> = { CRITICAL: '#FF3D3D', HIGH: '#FF6B00', MEDIUM: '#FFD700', LOW: '#76FF03', INFO: '#5C5A54' };
      popup(coords, `<div style="font-family:monospace;font-size:11px;color:#E8E6E0;">
        <div style="font-size:13px;font-weight:bold;margin-bottom:6px;color:${p.color};">${p.device_type}</div>
        <div style="font-size:12px;margin-bottom:8px;color:#fff;">${p.ip}</div>
        ${hostnames.length > 0 ? `<div style="font-size:9px;color:#8A8880;margin-bottom:6px;">${hostnames.join(', ')}</div>` : ''}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px;">
          <div><span style="color:#5C5A54;">PORTS</span><br/><span style="color:#E8E6E0;">${ports.length}</span></div>
          <div><span style="color:#5C5A54;">RISK</span><br/><span style="color:${riskColors[p.risk_level] || '#666'};">${p.risk_level}</span></div>
        </div>
        <div style="font-size:9px;color:#8A8880;margin-bottom:6px;">Open: ${ports.slice(0, 12).join(', ')}${ports.length > 12 ? ' ...' : ''}</div>
        ${vulns.length > 0 ? `<div style="font-size:9px;color:#FF3D3D;margin-bottom:6px;">⚠ CVEs: ${vulns.slice(0, 5).join(', ')}${vulns.length > 5 ? ` +${vulns.length - 5} more` : ''}</div>` : ''}
      </div>`);
    });

    // ── Balloons / Sondes ──
    map.on('click', 'balloon-dots', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      popup(coords, `<div style="${pStyle}border:1px solid ${p.color}40;">
        <div style="color:${p.color};font-size:12px;font-weight:700;letter-spacing:0.1em;margin-bottom:4px;">🎈 ${p.callsign}</div>
        <div style="font-size:9px;color:#aaa;margin-bottom:8px;">${p.type.toUpperCase()} / STATUS: ${p.status.toUpperCase()}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:9px;">
          <div><span style="color:#5C5A54;">ALTITUDE</span><br/><span style="color:#E8E6E0;">${p.altitude} m</span></div>
          <div><span style="color:#5C5A54;">SPEED</span><br/><span style="color:#E8E6E0;">${Math.round(p.speed)} km/h</span></div>
          <div><span style="color:#5C5A54;">VERT RATE</span><br/><span style="color:${p.verticalRate > 0 ? '#00E676' : '#FF3D3D'};">${p.verticalRate.toFixed(1)} m/s</span></div>
          <div><span style="color:#5C5A54;">TEMP</span><br/><span style="color:#E8E6E0;">${p.temperature}°C</span></div>
        </div>
      </div>`);
    });

    // ── Radiation ──
    map.on('click', 'rad-dots', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      const color = p.status === 'DANGER' ? '#FF1744' : p.status === 'WARNING' ? '#FF9500' : '#AB47BC';
      popup(coords, `<div style="${pStyle}border:1px solid ${color}40;">
        <div style="color:${color};font-size:12px;font-weight:700;margin-bottom:4px;">☢️ ${p.name}</div>
        <div style="font-size:9px;color:#aaa;margin-bottom:8px;">${p.city}, ${p.country}</div>
        <div style="display:grid;grid-template-columns:1fr;gap:4px;font-size:11px;">
          <div><span style="color:#5C5A54;font-size:9px;">READING</span><br/><span style="color:${color};font-weight:bold;">${p.reading} nSv/h</span></div>
          <div><span style="color:#5C5A54;font-size:9px;">STATUS</span><br/><span style="color:${color};">${p.status}</span></div>
          <div><span style="color:#5C5A54;font-size:9px;">NETWORK</span><br/><span style="color:#E8E6E0;">${p.network}</span></div>
        </div>
      </div>`);
    });

    // ── Maritime Ships ──
    map.on('click', 'ship-dots', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      const color = p.type === 'military' ? '#FF1744' : p.type === 'tanker' ? '#FF9500' : '#00E5FF';
      const icon = p.type === 'military' ? '⚔️' : p.type === 'tanker' ? '🛢️' : '🚢';
      
      popup(coords, `<div style="${pStyle}border:1px solid ${color}60;box-shadow:inset 0 0 12px ${color}15;">
        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid ${color}40;padding-bottom:6px;margin-bottom:8px;">
          <div style="color:${color};font-size:12px;font-weight:700;letter-spacing:0.1em;">${icon} [ ${(p.type||'VESSEL').toUpperCase()} ]</div>
          <div style="color:#5C5A54;font-size:9px;">FLAG: ${p.flag||'UNK'}</div>
        </div>
        <div style="color:#E8E6E0;font-size:11px;font-weight:bold;margin-bottom:10px;">${p.name || 'UNIDENTIFIED VESSEL'}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:9px;margin-bottom:8px;background:rgba(0,0,0,0.3);padding:6px;border-radius:4px;">
          <div><span style="color:#5C5A54;">SPEED</span><br/><span style="color:${color};font-family:monospace;">${Number(p.speed).toFixed(1)} kn</span></div>
          <div><span style="color:#5C5A54;">HEADING</span><br/><span style="color:${color};font-family:monospace;">${Number(p.heading).toFixed(0)}°</span></div>
          <div><span style="color:#5C5A54;">LATITUDE</span><br/><span style="color:#E8E6E0;font-family:monospace;">${coords[1].toFixed(4)}°</span></div>
          <div><span style="color:#5C5A54;">LONGITUDE</span><br/><span style="color:#E8E6E0;font-family:monospace;">${coords[0].toFixed(4)}°</span></div>
        </div>
        <div><span style="color:#5C5A54;font-size:9px;">DESTINATION: </span><span style="color:#E8E6E0;font-size:9px;">${p.destination || 'UNKNOWN'}</span></div>
        <a href="https://www.marinetraffic.com/en/ais/details/ships/mmsi:${p.mmsi}" target="_blank" style="${linkStyle}flex:1;text-align:center;color:${color};border:1px solid ${color}40;background:${color}15;display:inline-block;width:100%;box-sizing:border-box;margin-top:4px;">[ OPEN SOURCE ↗ ]</a>
      </div>`);
    });

    // ── Weather Events (NASA EONET + NOAA/NWS + GDACS) ──
    // ── Snow Plows (IA · UT · VT · ON · MB · SK · AK AVL) ──
    // Only what the feed reports: agency, blade status when the truck
    // sends a real reading, ground speed, and the ping time.
    const openPlowPopup = (feature: any) => {
      const p = feature.properties as any;
      const coords = (feature.geometry as any).coordinates;
      const pingMs = p.updatedAt ? Date.parse(p.updatedAt) : NaN;
      const agoMin = Number.isFinite(pingMs) ? Math.max(0, Math.round((Date.now() - pingMs) / 60000)) : null;
      const updated = agoMin == null ? '—' : agoMin < 1 ? 'just now' : agoMin < 60 ? agoMin + ' min ago' : Math.round(agoMin / 60) + ' h ago';
      popup(coords, `<div style="${pStyle}border:1px solid rgba(255,167,38,0.35);">
        <div style="color:#FFA726;font-size:12px;font-weight:700;margin-bottom:4px;">❄️ SNOW PLOW${p.label ? ' · ' + htmlEsc(p.label) : ''}</div>
        <div style="font-size:9px;color:#E8E6E0;margin-bottom:8px;">${htmlEsc(p.agency || 'Iowa DOT')}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:9px;margin-bottom:8px;">
          <div><span style="color:#5C5A54;">STATUS</span><br/><span style="color:#E8E6E0;">${p.status ? htmlEsc(p.status) : '—'}</span></div>
          <div><span style="color:#5C5A54;">SPEED</span><br/><span style="color:#E8E6E0;">${p.speed != null ? p.speed + ' mph' : '—'}</span></div>
          <div><span style="color:#5C5A54;">HEADING</span><br/><span style="color:#E8E6E0;">${p.heading != null ? p.heading + '°' : '—'}</span></div>
          <div><span style="color:#5C5A54;">LAST UPDATE</span><br/><span style="color:#E8E6E0;">${updated}</span></div>
        </div>
        <div style="font-size:8px;color:#5C5A54;letter-spacing:0.08em;">${htmlEsc(p.agency || 'Iowa DOT').toUpperCase()} · SNOW PLOW AVL</div>
      </div>`);
    };
    map.on('click', 'plow-icons', e => { if (e.features?.length) openPlowPopup(e.features[0]); });

    const onWeatherClick = (e: any) => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      const iconEmoji = p.icon === 'cyclone' ? '🌀' : p.icon === 'volcano' ? '🌋' : p.icon === 'flood' ? '🌊' : p.icon === 'drought' ? '🏜️' : p.icon === 'ice' ? '🧊' : p.icon === 'weather' ? '⚠️' : '⚡';
      popup(coords, `<div style="${pStyle}border:1px solid rgba(224,64,251,0.3);">
        <div style="color:#E040FB;font-size:14px;font-weight:700;margin-bottom:6px;">${iconEmoji} ${p.type || 'Weather Event'}</div>
        <div style="font-size:10px;color:#E8E6E0;margin-bottom:8px;line-height:1.4;">${p.title || 'Unknown event'}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:9px;margin-bottom:8px;">
          <div><span style="color:#5C5A54;">SEVERITY</span><br/><span style="color:${p.severity === 'high' ? '#FF1744' : '#FFD700'};">${(p.severity||'low').toUpperCase()}</span></div>
          <div><span style="color:#5C5A54;">COORDS</span><br/><span style="color:#E8E6E0;">${coords[1].toFixed(3)}°, ${coords[0].toFixed(3)}°</span></div>
        </div>
        <div style="display:flex;gap:6px;">
          ${p.source ? `<a href="${p.source}" target="_blank" style="${linkStyle}color:#E040FB;border:1px solid rgba(224,64,251,0.4);background:rgba(224,64,251,0.1);">📡 SOURCE</a>` : ''}
        </div>
      </div>`);
    };
    map.on('click', 'weather-dots', onWeatherClick);
    map.on('click', 'weather-tsunami-icons', onWeatherClick);
    map.on('click', 'weather-storm-icons', onWeatherClick);
    map.on('click', 'weather-tornado-icons', onWeatherClick);

    // ── Nuclear Infrastructure ──
    map.on('click', 'infra-dots', e => {
      if (!e.features?.length) return;
      const p = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates;
      const status = String(p.status ?? '');

      // Same order and colours as the infra-dots paint expression above, so the
      // popup's accent always matches the dot the user just clicked.
      const accent =
        status.includes('SEISMIC RISK') ? '#E65100' :
        status === 'Active Conflict Zone' ? '#D32F2F' :
        status.includes('Decommission') ? '#546E7A' :
        status === 'Under Construction' ? '#FFA726' :
        '#26A69A';

      // A facility with no reactor (waste storage, enrichment) and a research
      // reactor rated in thermal MW both carry 0 here — neither is an electrical
      // figure, so both render as "—" rather than as a real 0 MWe.
      const row = (label: string, value: string, color = '#E8E6E0') =>
        `<div><span style="color:#5C5A54;">${label}</span><br/><span style="color:${color};">${value}</span></div>`;

      const ref = p.sourceUrl
        ? `<a href="${htmlEsc(p.sourceUrl)}" target="_blank" rel="noopener noreferrer" style="${linkStyle}color:${accent};border:1px solid ${accent}66;background:${accent}1A;">REFERENCE</a>`
        : '';

      popup(coords, `<div style="${pStyle}border:1px solid ${accent}4D;">
        <div style="color:${accent};font-size:14px;font-weight:700;margin-bottom:2px;">☢️ ${htmlEsc(p.name || 'Nuclear Facility')}</div>
        <div style="color:#5C5A54;font-size:9px;letter-spacing:0.1em;margin-bottom:10px;">${htmlEsc([p.city, p.country].filter(Boolean).join(', ')) || '—'}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 6px;font-size:9px;">
          ${row('STATUS', htmlEsc(status) || '—', accent)}
          ${row('OWNER', htmlEsc(p.owner) || '—')}
          ${row('REACTORS', p.reactors ? htmlEsc(p.reactors) : '—', accent)}
          ${row('CAPACITY', p.capacityMW ? `${Number(p.capacityMW).toLocaleString()} MWe` : '—')}
        </div>
        <div style="margin-top:10px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.08);font-size:9px;color:#5C5A54;">
          ${coords[1].toFixed(3)}°, ${coords[0].toFixed(3)}°
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          ${ref}
          <a href="https://www.google.com/maps/@${coords[1]},${coords[0]},14z/data=!3m1!1e3" target="_blank" rel="noopener noreferrer" style="${linkStyle}color:#8A8880;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.04);">SATELLITE</a>
        </div>
      </div>`);
    });

    // ── Maritime Ports & Naval Bases ──
    const onMaritimeClick = (e: any) => {
      const p = e.features?.[0]?.properties;
      if (!p) return;
      const coords = (e.features![0].geometry as any).coordinates;
      const typeColor = p.type === 'naval' ? '#FF3D3D' : p.type === 'energy' ? '#FF9500' : '#00BCD4';
      const typeLabel = p.type === 'naval' ? 'NAVAL BASE' : p.type === 'energy' ? 'ENERGY PORT' : 'CONTAINER PORT';
      
      const congestionHtml = p.congestion ? `
        <div style="margin-top:8px;padding-top:6px;border-top:1px solid rgba(255,255,255,0.1);">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;">
            <div><span style="color:#5C5A54;font-size:9px;">CONGESTION</span><br/><span style="color:${p.congestion === 'SEVERE' ? '#FF1744' : p.congestion === 'CONGESTED' ? '#FF9500' : '#00E676'};font-weight:bold;font-size:10px;">${p.congestion}</span></div>
            <div><span style="color:#5C5A54;font-size:9px;">EST. DWELL TIME</span><br/><span style="color:#E8E6E0;font-weight:bold;font-size:10px;">${p.dwell_time || 'Unknown'}</span></div>
          </div>
        </div>` : '';

      popup(coords, `<div style="${pStyle}border:1px solid ${typeColor}40;">
        <div style="color:${typeColor};font-weight:bold;font-size:11px;margin-bottom:4px;">${p.name}</div>
        <div style="color:#999;font-size:9px;margin-bottom:6px;">${typeLabel} — ${p.country}</div>
        ${p.volume ? `<div style="font-size:9px;color:#aaa;">Volume: <span style="color:${typeColor};font-weight:bold;">${p.volume}</span></div>` : ''}
        ${p.fleet ? `<div style="font-size:9px;color:#aaa;">Fleet: <span style="color:${typeColor};font-weight:bold;">${p.fleet}</span></div>` : ''}
        ${p.rank ? `<div style="font-size:9px;color:#aaa;">Global Rank: <span style="color:${typeColor};font-weight:bold;">#${p.rank}</span></div>` : ''}
        ${congestionHtml}
      </div>`);
    };
    map.on('click', 'maritime-dots', onMaritimeClick);
    map.on('click', 'maritime-icons', onMaritimeClick);

    // ── Maritime Chokepoints ──
    map.on('click', 'choke-dots', e => {
      const p = e.features?.[0]?.properties;
      if (!p) return;
      const coords = (e.features![0].geometry as any).coordinates;
      const riskCol = p.risk === 'CRITICAL' ? '#FF1744' : p.risk === 'HIGH' ? '#FF9500' : p.risk === 'ELEVATED' ? '#FFD700' : '#00E676';
      popup(coords, `<div style="${pStyle}border:1px solid ${riskCol}40;">
        <div style="color:#FF9500;font-weight:bold;font-size:11px;margin-bottom:4px;">${p.name}</div>
        <div style="font-size:9px;color:#aaa;">Traffic: <span style="color:#fff;">${p.traffic}</span></div>
        <div style="font-size:9px;color:#aaa;">Risk: <span style="color:${riskCol};font-weight:bold;">${p.risk}</span></div>
      </div>`);
    });

    // ── Live News (opens feed viewer) ──
    map.on('click', 'news-dots', e => {
      const p = e.features?.[0]?.properties;
      if (!p) return;
      onEntityClick?.({
        type: 'live_news',
        name: p.name,
        city: p.city,
        country: p.country,
        url: p.url,
        category: p.category,
        embed_allowed: p.embed_allowed !== false && p.embed_allowed !== 'false',
      });
    });

    // ── Live Alert pins: the report, the place it names, and its footage ──
    const alertPopupHtml = (reports: AlertPinProps[]) => {
      const [p, ...rest] = reports;
      const c = (ALERT_KINDS[p.kind as AlertKind] ?? ALERT_KINDS.news).color;
      const label = (ALERT_KINDS[p.kind as AlertKind] ?? ALERT_KINDS.news).label;
      const link = urlSafe(p.link);
      const video = urlSafe(p.video);
      const thumb = urlSafe(p.thumb);
      /* Footage plays in place where Telegram serves the file; a video it
         only shows in the app gets its preview and a way through to it. */
      const media = video !== '#'
        ? `<video src="${htmlEsc(video)}"${thumb !== '#' ? ` poster="${htmlEsc(thumb)}"` : ''} controls playsinline preload="none" style="display:block;width:100%;max-height:180px;margin-top:10px;border-radius:6px;background:#000;"></video>`
        : thumb !== '#'
          ? `<a href="${htmlEsc(link)}" target="_blank" rel="noopener noreferrer" style="display:block;position:relative;margin-top:10px;">
              <img src="${htmlEsc(thumb)}" referrerpolicy="no-referrer" alt="" style="display:block;width:100%;max-height:180px;object-fit:cover;border-radius:6px;">
              ${p.media_kind === 'video' ? `<span style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.75);color:#fff;font-size:9px;letter-spacing:0.1em;padding:4px 10px;border-radius:12px;">▶ WATCH ON TELEGRAM${p.duration ? ` · ${htmlEsc(p.duration)}` : ''}</span>` : ''}
            </a>`
          : '';
      const more = rest.slice(0, 4).map(r => {
        const rc = (ALERT_KINDS[r.kind as AlertKind] ?? ALERT_KINDS.news).color;
        return `<a href="${htmlEsc(urlSafe(r.link))}" target="_blank" rel="noopener noreferrer" style="display:flex;gap:6px;align-items:baseline;color:#C9C5BC;text-decoration:none;font-size:10px;line-height:1.35;margin-top:5px;">
          <span style="flex:none;width:6px;height:6px;border-radius:50%;background:${rc};transform:translateY(-1px);"></span>
          <span>${htmlEsc(r.title)} <span style="color:#5C5A54;">· ${htmlEsc(r.source_name)} · ${htmlEsc(timeAgo(r.published))}</span></span>
        </a>`;
      }).join('');
      return `
      <div style="${pStyle}border:1px solid ${c}66;width:300px;max-width:100%;padding:14px;max-height:min(44vh,440px);overflow-y:auto;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:9.5px;letter-spacing:0.12em;">
          <span style="width:7px;height:7px;border-radius:50%;background:${c};box-shadow:0 0 8px ${c};"></span>
          <span style="color:${c};font-weight:700;">${label}</span>
          <span style="color:#8A8880;margin-left:auto;">${htmlEsc(timeAgo(p.published))}</span>
        </div>
        <div style="color:#F2EFE8;font-family:Inter,system-ui,sans-serif;font-size:12.5px;font-weight:600;line-height:1.35;">${htmlEsc(p.title)}</div>
        <div style="margin-top:6px;font-size:9.5px;color:#8A8880;">${htmlEsc(p.source_name)}${p.lean ? ` · <span style="color:#9B978E;">${htmlEsc(p.lean)}</span>` : ''}</div>
        <div style="margin-top:6px;font-size:9.5px;color:${c};" title="The place the post names, resolved against OpenStreetMap. Town-level: a post names a place, not an exact spot.">📍 ${htmlEsc(p.place_label)}<span style="color:#5C5A54;"> · ${p.precision === 'region' ? 'region' : 'place'} named in the post · © OpenStreetMap</span></div>
        ${media}
        ${link !== '#' ? `<a href="${htmlEsc(link)}" target="_blank" rel="noopener noreferrer" style="${linkStyle}color:${c};border:1px solid ${c}66;background:${c}1a;">OPEN POST ↗</a>` : ''}
        ${more ? `<div style="margin-top:10px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.06);"><div style="font-size:8.5px;letter-spacing:0.14em;color:#5C5A54;">ALSO HERE</div>${more}</div>` : ''}
      </div>`;
    };

    /* Several reports can name the same town; they stack, newest first. */
    const reportsAt = (coords: [number, number], leadId?: string) => {
      const seen = new Set<string>();
      return alertPinsRef.current
        .filter(f => f.geometry.coordinates[0] === coords[0] && f.geometry.coordinates[1] === coords[1])
        .map(f => f.properties)
        .filter(p => !seen.has(p.id) && seen.add(p.id))
        .sort((a, b) => (a.id === leadId ? -1 : b.id === leadId ? 1 : Date.parse(b.published) - Date.parse(a.published)));
    };

    /** Rings the pin a popup is open on, and clears the ring when it closes. */
    const markSelected = (id: string) => {
      try { map.setFilter('alert-pin-selected', ['==', ['get','id'], id]); } catch { /* style not settled */ }
    };
    const openAlertPopup = (feature: AlertPinFeature, leadId?: string) => {
      popup(feature.geometry.coordinates, alertPopupHtml(reportsAt(feature.geometry.coordinates, leadId)));
      markSelected(feature.properties.id);
      popupRef.current?.once('close', () => markSelected(''));
    };

    map.on('click', 'alert-pin-dots', e => {
      // Matched by id: a rendered feature's geometry is tile-quantised, so it
      // does not equal the coordinates the pin was placed at.
      const ids = new Set((e.features ?? []).map(f => f.properties?.id));
      const lead = alertPinsRef.current.find(f => ids.has(f.properties.id));
      if (lead) openAlertPopup(lead);
    });

    openAlertPinRef.current = (id: string) => {
      const f = alertPinsRef.current.find(x => x.properties.id === id);
      if (f) openAlertPopup(f, id);
    };

    /*
     * Keep the canvas the size of its container.
     *
     * MapLibre reads the container once, when it is constructed, and falls
     * back to 400x300 if the container has no size yet. Its own trackResize
     * watches the window, which never fires when the container is what
     * changed — so a map built a frame too early stayed 400x300 inside a full
     * screen container for the rest of the session, which is what the live
     * site was serving: a small square of map in the corner of a black page.
     * A window resize did not recover it; one resize() call did.
     */
    const sizeToContainer = new ResizeObserver(() => map.resize());
    sizeToContainer.observe(container);

    return () => {
      sizeToContainer.disconnect();
      window.removeEventListener('we:open-entity', openSharedEntity);
      cancelAnimationFrame(hoverFrame);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Day/Night
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    const update = () => {
      const src = map.getSource('day-night') as any;
      if (!src) return;
      if (!terminatorVisible(basemapMode, activeLayers.day_night)) { src.setData(EMPTY_FC); return; }
      src.setData({ type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'Polygon', coordinates: [computeSolarTerminator()] }, properties: {} }] });
    };
    update();
    const iv = setInterval(update, 300000); // 5 min (was 1 min — shadow barely moves)
    return () => clearInterval(iv);
  }, [mapReady, activeLayers.day_night, basemapMode]);

  // Helper to set GeoJSON
  const setGeo = useCallback((source: string, features: any[]) => {
    const src = mapRef.current?.getSource(source) as any;
    if (src) src.setData({ type: 'FeatureCollection', features });
  }, []);

  const setVis = useCallback((ids: string[], visible: boolean) => {
    const map = mapRef.current;
    if (!map) return;
    ids.forEach(id => { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none'); });
  }, []);

  // Flight snapshots → blend state (lib/flights/render). A poll lands here
  // and only updates the snapshot pair; the render loop below owns the
  // cadence, so a data change by itself never redraws the sources.
  useEffect(() => {
    if (
      !Array.isArray(data.commercial_flights) &&
      !Array.isArray(data.private_flights) &&
      !Array.isArray(data.private_jets) &&
      !Array.isArray(data.military_flights)
    ) return;
    if (!flightBlendRef.current) flightBlendRef.current = new FlightBlend();
    // Fix-age base for the follow HUD: when the FEED generated this
    // snapshot (the /api/flights payload timestamp), so a server-cached
    // snapshot reads honestly old instead of "just arrived". Absurd
    // values (clock skew either way) fall back to arrival time.
    const arrivedAt = Date.now();
    const routeTs = Date.parse((data as any)?.timestamp ?? '');
    const fixAt = Number.isFinite(routeTs) && routeTs <= arrivedAt + 60_000 && routeTs >= arrivedAt - 15 * 60_000
      ? routeTs
      : arrivedAt;
    flightBlendRef.current.push({
      commercial_flights: data.commercial_flights || [],
      private_flights: data.private_flights || [],
      private_jets: data.private_jets || [],
      military_flights: data.military_flights || [],
    }, arrivedAt, fixAt);
    // Premium path trail: sample the followed aircraft's RAW reported fix
    // out of this snapshot — never the interpolated render output — and
    // stamp it with the feed's own generation time (fixAt).
    const pathState = flightPathRef.current;
    const followState = flightFollowRef.current;
    if (
      pathState && followState.phase !== 'idle' &&
      followState.target?.icao24 === pathState.icao24 &&
      flightPathAccessRef.current === 'pro'
    ) {
      const buckets = [data.commercial_flights, data.private_flights, data.private_jets, data.military_flights];
      for (const bucket of buckets) {
        const hit = (bucket || []).find((f: any) => f.icao24 === pathState.icao24);
        if (hit) {
          const next = noteFlightPathFix(pathState, hit, fixAt);
          if (next !== pathState) {
            flightPathRef.current = next;
            syncFlightPathLayer();
            syncFlightPathUi();
          }
          break;
        }
      }
    }
    // Aircraft panel live refresh: while a flight popup is open, its
    // readouts take THIS snapshot's raw fix — never the blended render
    // position; the numbers stay the reported ones and the fix's age is
    // stated. The popup's anchor follows the blended marker instead,
    // which is the position the user is actually looking at.
    const openPop = openFlightPopupRef.current;
    if (openPop && popupRef.current) {
      const hex = openPop.icao24;
      const safeHex = hex.replace(/[^a-zA-Z0-9_.\-]/g, '');
      let rawFix: any = null;
      for (const bucket of [data.commercial_flights, data.private_flights, data.private_jets, data.military_flights]) {
        rawFix = (bucket || []).find((f: any) => f.icao24 === hex) ?? null;
        if (rawFix) break;
      }
      if (rawFix) {
        const setStat = (suffix: string, text: string) => {
          const el = document.getElementById(`acstat-${suffix}-${safeHex}`);
          if (el) el.textContent = text;
        };
        setStat('alt', rawFix.alt ? `${Math.round(rawFix.alt)}m` : '\u2014');
        setStat('spd', rawFix.speed_knots ? `${Math.round(rawFix.speed_knots)}kt` : '\u2014');
        setStat('hdg', `${Math.round(rawFix.heading || 0)}\u00b0`);
        setStat('pos', `${Number(rawFix.lat).toFixed(2)},${Number(rawFix.lng).toFixed(2)}`);
        const ageS = Math.max(0, Math.round((Date.now() - fixAt) / 1000));
        setStat('age', `FEED FIX ${ageS}s OLD \u2014 VALUES UPDATE WITH THE FEED`);
        const cur = flightBlendRef.current?.current(Date.now());
        if (cur) {
          for (const bucket of [cur.commercial_flights, cur.private_flights, cur.private_jets, cur.military_flights]) {
            const blended = (bucket || []).find((f: any) => f.icao24 === hex);
            if (blended) { popupRef.current.setLngLat([blended.lng, blended.lat]); break; }
          }
        }
      }
    }
  }, [data.commercial_flights, data.private_flights, data.private_jets, data.military_flights, syncFlightPathLayer, syncFlightPathUi]);

  // Flight data → GeoJSON (GPU rendered). FULL sets — no decimation: every
  // record the route classified becomes a feature (received == rendered;
  // lib/flights/render pins that in tests). A 500ms loop interpolates
  // between the last two 30s snapshots — render one interval behind and
  // blend the bracketing fixes (GEV pattern, lib/flights/motion) — so
  // aircraft glide instead of teleporting between polls. The interval is
  // cleared when every flight layer is off and on unmount.
  useEffect(() => {
    if (!mapReady) return;
    const anyOn = activeLayers.flights || activeLayers.private || activeLayers.jets || activeLayers.military;
    if (!anyOn) {
      setGeo('flights', []);
      setGeo('private-fl', []);
      setGeo('jets', []);
      setGeo('military', []);
      if (flightFollowRef.current.phase !== 'idle') {
        endFlightFollow({ notice: 'FLIGHT LAYERS OFF — FOLLOW ENDED' });
      }
      return;
    }
    const render = () => {
      const now = Date.now();
      const cur = flightBlendRef.current?.current(now);
      setGeo('flights', activeLayers.flights ? flightsToFeatures(cur?.commercial_flights) : []);
      setGeo('private-fl', activeLayers.private ? flightsToFeatures(cur?.private_flights) : []);
      setGeo('jets', activeLayers.jets ? flightsToFeatures(cur?.private_jets) : []);
      setGeo('military', activeLayers.military ? flightsToFeatures(cur?.military_flights) : []);
      // The follow camera rides THIS loop's blended output — no second
      // interval, no second position pipeline (lib/flights/follow).
      driveFlightFollow(cur, now);
    };
    render();
    const iv = setInterval(render, 500);
    return () => clearInterval(iv);
  }, [mapReady, activeLayers.flights, activeLayers.private, activeLayers.jets, activeLayers.military, setGeo, driveFlightFollow, endFlightFollow]);

  /**
   * Pull the palette out of the document whenever it can have changed.
   *
   * Two triggers, and they need different timing. The Style Studio writes the
   * properties and then dispatches, so reading straight away is correct. A
   * theme switch flips a class on <body> from an effect in the page component
   * — a parent, so it runs *after* this one — and reading now would return the
   * outgoing theme. The extra frame covers that case.
   */
  useEffect(() => {
    const read = () => {
      const cs = getComputedStyle(document.body);
      const next = readMapPalette(name => cs.getPropertyValue(name));
      setPalette(prev => (MAP_PALETTE_KEYS.every(k => prev[k] === next[k]) ? prev : next));
    };
    read();
    const raf = requestAnimationFrame(read);
    window.addEventListener(STYLE_EVENT, read);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener(STYLE_EVENT, read);
    };
  }, [theme]);

    // Update aircraft icon colors dynamically on theme switch
    useEffect(() => {
      if (!mapReady || !mapRef.current) return;
      const map = mapRef.current;

      const updateMapIcon = (id: string, color: string, size: number, draw: (ctx: CanvasRenderingContext2D, color: string, size: number) => void = drawPlaneGlyph) => {
        if (!map.hasImage(id)) return;
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d')!;
        draw(ctx, color, size);
        map.updateImage(id, { width: size, height: size, data: new Uint8Array(ctx.getImageData(0, 0, size, size).data) });
      };

      // Only the glyph classes recolour: military + unknown planes.
      // Commercial / private / jet planes and every helicopter wear the
      // photo artwork, which is re-applied instead (it doesn't recolour).
      updateMapIcon('plane-red', palette.flightMilitary, 24);
      updateMapIcon('plane-grey', palette.flightUnknown, 24);
      installPhotoIcons(map);
    }, [mapReady, palette, installPhotoIcons]);

  // OI's arcs take their three tones from the Style Studio (violet, magenta, indigo unless changed).
  useEffect(() => {
    oiGlobeRef.current?.setColors({ support: palette.oiSupport, oppose: palette.oiOppose, neutral: palette.oiNeutral });
  }, [palette.oiSupport, palette.oiOppose, palette.oiNeutral]);

    /* Cameras render as the owner's eye photo (cctv-dots is a symbol layer
       now — no circle colour to repaint); only their labels follow the
       palette. */
    useEffect(() => {
      if (!mapReady || !mapRef.current) return;
      const map = mapRef.current;
      if (map.getLayer('cctv-label')) map.setPaintProperty('cctv-label', 'text-color', palette.cctv);
    }, [mapReady, palette.cctv]);

  // ── DECOUPLED LAYER RENDERERS (Performance Optimized) ──

  useEffect(() => {
    if (!mapReady) return;
    setGeo('earthquakes', activeLayers.earthquakes && data.earthquakes ? data.earthquakes.map((eq: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [eq.lng, eq.lat] }, properties: { id: eq.id, magnitude: eq.magnitude, place: eq.place, depth: eq.depth, source: eq.source } })) : []);
  }, [mapReady, data.earthquakes, activeLayers.earthquakes, setGeo]);

  /** Catalogue rows -> the packed form the 3D layer draws. */
  const toSatPoints = useCallback((rows: SatelliteRow[]): SatPoint[] => rows.map((s) => ({
    lng: s.lng,
    lat: s.lat,
    altKm: s.alt,
    color: parseColor(satColorFor(s.category, s.color, palette)),
    // Stations are the ones an operator is usually looking for, so they get
    // to be findable in a field of several hundred identical dots.
    size: s.category === 'science' || /ISS|TIANGONG/i.test(s.name || '') ? 2.2 : 1,
  })), [palette]);

  /**
   * Re-points the selection at the same satellite after a refresh.
   *
   * pick() returns an index into the last setPoints() array, and every poll
   * rebuilds that array — a filtered one changes length as well as order. Left
   * as a bare index the highlight ring quietly slides onto whichever satellite
   * now sits at that slot, taking the readout with it.
   */
  const resyncSatSelection = useCallback((rows: SatelliteRow[]) => {
    const id = satSelectedIdRef.current;
    if (!id) return;
    const i = rows.findIndex(r => r.noradId === id);
    // Filtered out, or gone from the catalogue: there is nothing to point at.
    if (i < 0) { clearSat(); return; }
    satPickedRef.current = i;
    satLayerRef.current?.setSelected(i);
    // The satellite has moved since it was clicked; the readout should say where
    // it is now, not where it was.
    setSelectedSat(prev => (prev ? { ...prev, lat: rows[i].lat, lng: rows[i].lng, alt: rows[i].alt } : prev));
  }, [clearSat]);

  useEffect(() => {
    if (!mapReady) return;
    const sats = data.satellites || [];
    const al = activeLayers as any;
    const at = Date.parse(data.satellites_at ?? '');
    satEpochRef.current = Number.isFinite(at) ? at : null;
    
    // If 'All Satellites' is on, show everything
    if (al.satellites) {
      setGeo('satellites', sats.map((s: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [s.lng, s.lat] }, properties: { name: s.name, color: satColorFor(s.category, s.color, palette), mission: s.mission, alt: s.alt, noradId: s.noradId, category: s.category } })));
      satRowsRef.current = sats;
      satLayerRef.current?.setPoints(toSatPoints(sats));
      resyncSatSelection(sats);
      return;
    }
    
    // Otherwise filter by enabled sub-layers
    const enabledCategories: string[] = [];
    if (al.sat_comms) enabledCategories.push('comms');
    if (al.sat_military) enabledCategories.push('military');
    if (al.sat_navigation) enabledCategories.push('navigation');
    if (al.sat_earth) enabledCategories.push('earth_obs');
    if (al.sat_science) enabledCategories.push('science');
    
    if (enabledCategories.length === 0) {
      setGeo('satellites', []);
      satRowsRef.current = [];
      satLayerRef.current?.setPoints([]);
      clearSat();
      return;
    }
    
    const filtered = sats.filter((s: any) => enabledCategories.includes(s.category));
    setGeo('satellites', filtered.map((s: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [s.lng, s.lat] }, properties: { name: s.name, color: satColorFor(s.category, s.color, palette), mission: s.mission, alt: s.alt, noradId: s.noradId, category: s.category } })));
    satRowsRef.current = filtered;
    satLayerRef.current?.setPoints(toSatPoints(filtered));
    resyncSatSelection(filtered);
  }, [mapReady, data.satellites, activeLayers.satellites, (activeLayers as any).sat_comms, (activeLayers as any).sat_military, (activeLayers as any).sat_navigation, (activeLayers as any).sat_earth, (activeLayers as any).sat_science, data.satellites_at, setGeo, toSatPoints, resyncSatSelection, clearSat]);

  useEffect(() => {
    if (!mapReady) return;
    // url has to travel with the feature: /api/gdelt gives every event its own
    // GDACS report link, and dropping it here is what left the popup with
    // nothing to link to.
    setGeo('gdelt', activeLayers.global_incidents && data.gdelt ? data.gdelt.map((e: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [e.lng, e.lat] }, properties: { name: e.name, url: e.url, kind: e.type } })) : []);
  }, [mapReady, data.gdelt, activeLayers.global_incidents, setGeo]);

  /* ── GDELT 2.0 Events ── */
  useEffect(() => {
    if (!mapReady) return;
    const al = activeLayers as any;
    setGeo('gdelt-events', al.gdelt_events && data.gdelt_events ? data.gdelt_events.map((e: any) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [e.lng, e.lat] },
      properties: {
        name: e.name, country: e.country, quad: e.quad, quad_label: e.quad_label,
        tone: e.tone, goldstein: e.goldstein, articles: e.articles, url: e.url, date: e.date,
      },
    })) : []);
  }, [mapReady, data.gdelt_events, (activeLayers as any).gdelt_events, setGeo]);

  /* ── Cloudflare Radar: outages ── */
  useEffect(() => {
    if (!mapReady) return;
    const al = activeLayers as any;
    setGeo('cf-outages', al.cf_outages && data.cf_outages ? data.cf_outages.map((o: any) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [o.lng, o.lat] },
      properties: {
        country: o.country, country_name: o.country_name, scope: o.scope, cause: o.cause,
        event_type: o.event_type, description: o.description, start: o.start, end: o.end,
        ongoing: !!o.ongoing, url: o.url,
      },
    })) : []);
  }, [mapReady, data.cf_outages, (activeLayers as any).cf_outages, setGeo]);

  /* ── Cloudflare Radar: attack origins ── */
  useEffect(() => {
    if (!mapReady) return;
    const al = activeLayers as any;
    setGeo('cf-attacks', al.cf_attacks && data.cf_attack_origins ? data.cf_attack_origins.map((a: any) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [a.lng, a.lat] },
      properties: { country: a.country, country_name: a.country_name, share: a.share },
    })) : []);
  }, [mapReady, data.cf_attack_origins, (activeLayers as any).cf_attacks, setGeo]);

  // Malware Threats
  useEffect(() => {
    if (!mapReady) return;
    setGeo('malware-nodes', activeLayers.malware && data.malware_threats ? data.malware_threats.map((t: any) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [t.lng, t.lat] },
      properties: {
        ip: t.ip, malware: t.malware, status: t.status, threat_type: t.threat_type,
        country: t.country, city: t.city, port: t.port,
        asn: t.asn, as_name: t.as_name,
        // How many live malicious URLs this host serves — the dot is sized by
        // it, so a box distributing forty payloads reads bigger than one.
        url_count: t.url_count ?? 1,
        first_seen: t.first_seen, last_seen: t.last_seen,
        reference: t.reference, reporter: t.reporter,
        detected_at: t.detected_at ?? 0,
      },
    })) : []);
  }, [mapReady, data.malware_threats, activeLayers.malware, setGeo]);

  /* Detections that landed while the operator was watching get a ring for a
     minute. Without it a pushed feed is indistinguishable from a static one —
     nodes simply appear, and the thing that makes it live goes unseen. */
  useEffect(() => {
    if (!mapReady || !mapRef.current || !activeLayers.malware) return;
    const map = mapRef.current;

    /* Arrivals are rare — a handful an hour — so the common case is that there
       is nothing to draw. Tracking whether the last tick drew anything keeps
       this from pushing an empty collection into the source five times a
       second for the entire time the layer is on. */
    let drawing = false;

    const tick = () => {
      const now = Date.now();
      const beacons = arrivalBeacons(data.malware_threats ?? [], now);

      if (beacons.length === 0) {
        if (drawing) { setGeo('malware-new', []); drawing = false; }
        return;
      }

      setGeo('malware-new', beacons.map(b => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [b.lng, b.lat] },
        properties: { age: b.age },
      })));
      drawing = true;

      try {
        // One shared pulse, so the ring reads as a beacon rather than each
        // node breathing on its own schedule.
        map.setPaintProperty('malware-new-ring', 'circle-radius',
          ['interpolate', ['linear'], ['get', 'age'], 0, 6 + Math.sin(now / 200) * 2, 1, 26]);
      } catch { /* style not settled yet */ }
    };

    tick();
    const timer = setInterval(tick, 200);
    return () => { clearInterval(timer); setGeo('malware-new', []); };
  }, [mapReady, data.malware_threats, activeLayers.malware, setGeo]);

  // Network Mesh Generation (Nearest Neighbor Lattice)
  useEffect(() => {
    if (!mapReady) return;
    const meshLinks: any[] = [];
    
    // Generate Malware Botnet Mesh
    if (activeLayers.malware && data.malware_threats && data.malware_threats.length > 1) {
      const nodes = data.malware_threats;
      for (let i = 0; i < nodes.length; i++) {
        // Connect each to next 2 for a global web
        for (let j = 1; j <= 2; j++) {
          const target = nodes[(i + j) % nodes.length];
          meshLinks.push({
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: [[nodes[i].lng, nodes[i].lat], [target.lng, target.lat]] },
            properties: { threat_type: 'malware' }
          });
        }
      }
    }
    setGeo('network-mesh', meshLinks);
  }, [mapReady, activeLayers.malware, data.malware_threats, setGeo]);

  /* ══ BOTNET C2 INFRASTRUCTURE ══
     Static dots, no animation. The arcs that used to fly across this layer
     were drawn between a fabricated attacker origin and the C2's country, and
     the marching-ants animation read as traffic that no source had observed.
     A blocklist has no motion in it. */
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const al = activeLayers as any;
    const indicators = data.cyber_attacks;

    if (!al.cyber_attacks || !indicators?.length) {
      setGeo('cyber-heads', []);
      return;
    }

    // A C2 whose hosting country is unknown has no honest position on a map.
    const dots = indicators
      .filter((c: any) => typeof c.lng === 'number' && typeof c.lat === 'number')
      .map((c: any) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [c.lng, c.lat] },
        properties: {
          id: c.id, ip: c.ip, port: c.port, malware: c.malware, status: c.status,
          hostname: c.hostname, country: c.country, as_number: c.as_number, as_name: c.as_name,
          first_seen: c.first_seen, last_online: c.last_online,
        },
      }));

    setGeo('cyber-heads', dots);
  }, [mapReady, (activeLayers as any).cyber_attacks, data.cyber_attacks, setGeo]);



  useEffect(() => {
    if (!mapReady) return;
    setGeo('cctv', activeLayers.cctv && data.cameras ? data.cameras.map((c: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [c.lng, c.lat] }, properties: { id: c.id, name: c.name, city: c.city, country: c.country, source: c.source, feed_url: c.feed_url, stream_url: c.stream_url, stream_type: c.stream_type, external_url: c.external_url } })) : []);
  }, [mapReady, data.cameras, activeLayers.cctv, setGeo]);

  useEffect(() => {
    if (!mapReady) return;
    setGeo('fires', activeLayers.fires && data.fires ? data.fires.map((f: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [f.lng, f.lat] }, properties: { brightness: f.brightness } })) : []);
  }, [mapReady, data.fires, activeLayers.fires, setGeo]);

  // GBFS — systems snapshot on toggle; station loads follow the viewport
  // (zoom ≥ 9.5, up to 6 nearest systems, 90 s freshness) via /api/gbfs.
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    if (!(activeLayers as any).gbfs) { setGeo('gbfs', []); return; }
    let live = true;
    const render = () => {
      if (!live) return;
      const feats: any[] = gbfsSystemsRef.current.map((s: any) => ({
        type: 'Feature', geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
        properties: { kind: 'system', id: s.id, name: s.name, city: s.city, country: s.country, n: s.n, type: s.type },
      }));
      if (map.getZoom() >= 9.5) {
        const b = map.getBounds();
        const view = { west: b.getWest(), south: b.getSouth(), east: b.getEast(), north: b.getNorth() };
        // Per-item culling (lib/gbfs/viewport): a station/vehicle is drawn
        // when its own coordinates are in view — the system centre no
        // longer gates it, so zooming into one neighbourhood of a large
        // system keeps that neighbourhood's dots on screen.
        for (const { system: s, item: it } of visibleGbfsItems(gbfsSystemsRef.current, gbfsCacheRef.current, view)) {
          feats.push({
            type: 'Feature', geometry: { type: 'Point', coordinates: [it.lng, it.lat] },
            properties: { kind: it.kind, id: it.id, name: it.name ?? '', sysName: s.name, bikes: it.bikes ?? null, ebikes: it.ebikes ?? null, docks: it.docks ?? null, vt: it.vt ?? '' },
          });
        }
      }
      setGeo('gbfs', feats);
    };
    const loadVisible = async () => {
      if (!live || map.getZoom() < 9.5 || !gbfsSystemsRef.current.length) return;
      const b = map.getBounds();
      const c = map.getCenter();
      // Candidacy (lib/gbfs/viewport): centre inside the generously padded
      // viewport, or cached items already in view — never the raw-bounds
      // centre test that starved large systems at street zoom.
      const candidates = gbfsLoadCandidates(
        gbfsSystemsRef.current,
        gbfsCacheRef.current,
        { west: b.getWest(), south: b.getSouth(), east: b.getEast(), north: b.getNorth() },
        { lat: c.lat, lng: c.lng },
        Date.now(),
      );
      await Promise.all(candidates.map(async (s: any) => {
        try {
          const r = await fetch(`/api/gbfs/stations?url=${encodeURIComponent(s.url)}`);
          const j = await r.json().catch(() => null);
          // The API reports failure as an empty item list (429, or 200
          // on an upstream error) — gbfsCacheEntryAfterFetch decides
          // what may replace the cached entry; a failed fetch leaves
          // the previous items AND their timestamp untouched, so the
          // dots stay on screen and a later move retries.
          const entry = gbfsCacheEntryAfterFetch(gbfsCacheRef.current.get(s.id), r.ok, j?.items, Date.now());
          if (entry) gbfsCacheRef.current.set(s.id, entry);
        } catch { /* a later move retries */ }
      }));
      render();
    };
    const onMove = () => { render(); void loadVisible(); };
    (async () => {
      if (!gbfsSystemsRef.current.length) {
        try {
          const r = await fetch('/data/gbfs-systems.json');
          const j = await r.json();
          if (live) gbfsSystemsRef.current = j.systems ?? [];
        } catch { /* layer stays empty */ }
      }
      render();
      void loadVisible();
    })();
    map.on('moveend', onMove);
    return () => { live = false; map.off('moveend', onMove); };
  }, [mapReady, (activeLayers as any).gbfs, setGeo]);

  // Live Transit — agencies load by viewport relevance; vehicles poll
  // 10 s and render through the TransitBlend (lib/transit/motion):
  // polls only push snapshots, a 500 ms loop samples the blend, so
  // dots glide between the last two real fixes instead of teleporting
  // (the flights pattern). Measured feed cadence (2026-10-19): UTA
  // republishes ~5 s with per-vehicle GPS every ~10 s, MBTA GPS ~6 s,
  // RTD everything every 30 s — the poll is no longer the bottleneck
  // for the fast feeds, and slow feeds are bounded by their own
  // cadence, which the popup's UPDATED fix age states honestly.
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    if (!(activeLayers as any).transit) { setGeo('transit', []); setGeo('transit-clusters', []); transitRenderedRef.current = []; setTransitSel(null); endTransitFollow(); setTransitNotice(null); transitNoticeDismissedRef.current = false; transitBlendRef.current = null; return; }
    let live = true;
    if (!transitBlendRef.current) transitBlendRef.current = new TransitBlend();
    const blend = transitBlendRef.current;
    const render = () => {
      if (!live) return;
      const nowMs = Date.now();
      const nowS = nowMs / 1000;
      // Subdivision gates (lib/transit/subdivisions): Live Vehicles
      // off renders nothing; the bus/rail toggles filter by mode
      // family — ferries and neutral "transit" modes follow the
      // master Live Vehicles switch only.
      if (!transitSubOn(activeLayers, TRANSIT_SUB.vehicles)) {
        setGeo('transit', []);
        setGeo('transit-clusters', []);
        transitRenderedRef.current = [];
        return;
      }
      const feats: any[] = [];
      for (const agencyId of blend.agencies()) {
        const ag = transitAgenciesRef.current.find((a: any) => a.id === agencyId);
        for (const v of blend.current(agencyId, nowMs) as any[]) {
          if (v.ts && nowS - v.ts > 900) continue; // silent > 15 min
          if (!vehicleModeVisible(v.mode, activeLayers)) continue;
          feats.push({
            type: 'Feature', geometry: { type: 'Point', coordinates: [v.lng, v.lat] },
            properties: {
              agencyId, agency: ag?.name ?? agencyId, attribution: ag?.attribution ?? '',
              vehId: v.id ?? '', ts: v.ts ?? null,
              // Stale fixes fade (layer paint reads `op`): past 3 min
              // the dot is visibly not-live instead of silently old.
              op: v.ts && nowS - v.ts > 180 ? 0.4 : 0.92,
              route: v.route ?? '', routeName: v.routeName ?? '', headsign: v.headsign ?? '',
              stopName: v.stopName ?? '',
              mode: v.mode, dir: v.dir ?? null, bearing: v.bearing ?? null,
              speedKmh: v.speedKmh ?? null, label: v.label ?? '', status: v.status ?? null,
              occ: v.occ ?? null, delay: v.delay ?? null,
            },
          });
        }
      }
      setGeo('transit', feats);
      setGeo('transit-clusters', feats);
      transitRenderedRef.current = feats;
      // Follow Vehicle: chase the followed vehicle's blended (real,
      // interpolated) position. The camera only moves once the
      // vehicle has meaningfully outrun the centre (~25 m), so the
      // 500 ms loop glides instead of fighting the user; a drag
      // releases the follow (see the dragstart effect), and a
      // vehicle silent for 30 s ends it with a notice.
      const fol = transitFollowRef.current;
      if (fol) {
        const target = (blend.current(fol.agencyId, nowMs) as any[]).find((v: any) => v.id === fol.vehId);
        if (target) {
          fol.lastSeenMs = nowMs;
          const c = map.getCenter();
          if (Math.abs(c.lng - target.lng) > 0.00022 || Math.abs(c.lat - target.lat) > 0.00022) {
            map.easeTo({ center: [target.lng, target.lat], duration: 480 });
          }
        } else if (nowMs - fol.lastSeenMs > 30000) {
          endTransitFollow('Vehicle stopped reporting — follow ended');
        }
      }
    };    const load = async () => {
      if (!live) return;
      const b = map.getBounds();
      // Relevance = service-area bounds ∩ viewport (lib/transit/
      // relevance). The old center-point test collapsed its padding
      // as the user zoomed in, evicted the agency, and its vehicle
      // dots vanished at street level — bounds intersection keeps an
      // agency loaded at every zoom inside its service area.
      const ags = selectAgenciesForView(
        transitAgenciesRef.current,
        { south: b.getSouth(), west: b.getWest(), north: b.getNorth(), east: b.getEast() },
        6,
      );
      if (transitAgenciesRef.current.length) {
        if (ags.length === 0) {
          if (!transitNoticeDismissedRef.current) {
            setTransitNotice(transitAgenciesRef.current.map((a: any) => a.region).join(' · '));
          }
        } else {
          setTransitNotice(null);
        }
      }
      await Promise.all(ags.map(async (a: any) => {
        try {
          const r = await fetch(`/api/transit/vehicles?agency=${a.id}`);
          const j = await r.json();
          // Push only — the blend dedupes re-served fixes and the
          // render loop owns drawing (a data change never redraws).
          blend.push(a.id, j.vehicles ?? [], Date.now());
        } catch { /* keep the last good set */ }
      }));
      const keep = new Set(ags.map((a: any) => a.id));
      for (const k of blend.agencies()) if (!keep.has(k)) blend.forget(k);
      render();
    };
    (async () => {
      if (!transitAgenciesRef.current.length) {
        try {
          const r = await fetch('/api/transit/agencies');
          const j = await r.json();
          if (live) transitAgenciesRef.current = j.agencies ?? [];
        } catch { /* layer stays empty */ }
      }
      await load();
    })();
    const iv = setInterval(load, 10000);
    const renderIv = setInterval(render, 500);
    const onMove = () => { void load(); };
    map.on('moveend', onMove);
    return () => { live = false; clearInterval(iv); clearInterval(renderIv); map.off('moveend', onMove); };
  }, [mapReady, (activeLayers as any).transit, (activeLayers as any).transit_vehicles, (activeLayers as any).transit_bus_routes, (activeLayers as any).transit_rail_routes, setGeo, endTransitFollow]);

  // Transit NETWORK — routes + stops for agencies whose directory entry
  // carries a static GTFS (UTA in v1). Networks load once per session
  // per agency, only while the agency's service area intersects the
  // viewport (the same relevance rule as the vehicles); stops are
  // viewport-filtered client-side and the stop layer is zoom-gated, so
  // the full stop list never paints at globe zoom. Graceful by design:
  // any failure leaves the network absent and the vehicles untouched,
  // retried on a later moveend at most once a minute per agency.
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    if (!(activeLayers as any).transit) {
      setGeo('transit-routes', []);
      setGeo('transit-stops', []);
      setTransitRouteSel(null);
      return;
    }
    let live = true;
    const STOP_MIN_ZOOM = 12.5;
    const apply = () => {
      if (!live) return;
      const b = map.getBounds();
      const view = { south: b.getSouth(), west: b.getWest(), north: b.getNorth(), east: b.getEast() };
      const lineFeats: any[] = [];
      const stopFeats: any[] = [];
      const zoom = map.getZoom();
      for (const a of transitAgenciesRef.current as any[]) {
        if (!a.network) continue;
        const entry = transitNetworkRef.current.get(a.id);
        if (!entry || !agencyIntersectsView(a, view)) continue;
        for (const f of entry.lines?.features ?? []) {
          if (lineModeVisible(f.properties?.mode, activeLayers)) lineFeats.push(f);
        }
        if (zoom >= STOP_MIN_ZOOM && transitSubOn(activeLayers, TRANSIT_SUB.stops)) {
          const v = padView(view, 0.1);
          for (const s of entry.stops) {
            if (s.lat < v.south || s.lat > v.north || s.lng < v.west || s.lng > v.east) continue;
            stopFeats.push({
              type: 'Feature', geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
              properties: { agency: a.id, stopId: s.id, name: s.name, routes: (s.routes ?? []).join(' · ') },
            });
            if (stopFeats.length >= 6000) break;
          }
        }
      }
      setGeo('transit-routes', lineFeats);
      setGeo('transit-stops', stopFeats);
    };
    const load = async () => {
      if (!live) return;
      if (!transitAgenciesRef.current.length) {
        try {
          const r = await fetch('/api/transit/agencies');
          const j = await r.json();
          if (live) transitAgenciesRef.current = j.agencies ?? [];
        } catch { /* the vehicles effect retries the directory too */ }
      }
      const b = map.getBounds();
      const view = { south: b.getSouth(), west: b.getWest(), north: b.getNorth(), east: b.getEast() };
      const wanted = (transitAgenciesRef.current as any[])
        .filter(a => a.network && agencyIntersectsView(a, view));
      await Promise.all(wanted.map(async (a: any) => {
        if (transitNetworkRef.current.has(a.id)) return;
        if (Date.now() - (transitNetworkFailRef.current.get(a.id) ?? 0) < 60_000) return;
        try {
          const [nr, sr] = await Promise.all([
            fetch(`/api/transit/network?agency=${a.id}`),
            fetch(`/api/transit/stops?agency=${a.id}`),
          ]);
          if (!nr.ok || !sr.ok) throw new Error('network fetch failed');
          const nj = await nr.json();
          const sj = await sr.json();
          if (!live) return;
          transitNetworkRef.current.set(a.id, {
            lines: nj.lines ?? { type: 'FeatureCollection', features: [] },
            stops: sj.stops ?? [],
            credit: nj.credit ?? '',
          });
        } catch {
          transitNetworkFailRef.current.set(a.id, Date.now());
        }
      }));
      apply();
    };
    void load();
    const onMove = () => { void load(); };
    map.on('moveend', onMove);
    return () => { live = false; map.off('moveend', onMove); };
  }, [mapReady, (activeLayers as any).transit, (activeLayers as any).transit_bus_routes, (activeLayers as any).transit_rail_routes, (activeLayers as any).transit_stops, setGeo]);

  // The Transit Explorer's selected route rides the highlight layer.
  // The same effect owns the bus/rail family filters on the line
  // layers and the selection dimming: while a route is selected the
  // unselected network drops to a whisper so the pick reads first.
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    const fams: string[] = [];
    if (transitSubOn(activeLayers, TRANSIT_SUB.busRoutes)) fams.push('bus');
    if (transitSubOn(activeLayers, TRANSIT_SUB.railRoutes)) fams.push('tram', 'metro', 'train');
    const famFilter = ['in', ['get', 'mode'], ['literal', fams]] as any;
    if (map.getLayer('transit-route-highlight')) {
      map.setFilter('transit-route-highlight', ['all', ['==', ['get', 'routeId'], transitRouteSel ?? '__none__'], famFilter] as any);
    }
    if (map.getLayer('transit-routes-line')) {
      map.setFilter('transit-routes-line', famFilter);
      map.setPaintProperty('transit-routes-line', 'line-opacity', transitRouteSel ? 0.16 : 0.55);
    }
    if (map.getLayer('transit-route-labels')) map.setFilter('transit-route-labels', famFilter);
  }, [mapReady, transitRouteSel, activeLayers]);

  // Transit Explorer open requests arrive from the Layers section
  // (window CustomEvent — the cross-component pattern this codebase
  // uses, cf. we:open-entity). Opening the Explorer changes nothing
  // about the camera, the zoom or the layer state, so Back to Globe
  // restores the exact view by construction.
  useEffect(() => {
    const onOpen = (e: Event) => {
      openTransitExplorer(((e as CustomEvent).detail ?? {}) as TransitExplorerInit);
    };
    window.addEventListener('we:open-transit-explorer', onOpen);
    return () => window.removeEventListener('we:open-transit-explorer', onOpen);
  }, [openTransitExplorer]);

  // "Show Nearby Transit" (Layers) is answered here: this component
  // owns the camera and the loaded points. The search runs over what
  // is actually loaded — the rendered live vehicles and the network
  // stops on hand — nearest to the map centre, then flies there and
  // opens the point's selection card. Nothing is synthesized.
  useEffect(() => {
    const reply = (message: string) =>
      window.dispatchEvent(new CustomEvent('we:transit-nearby-result', { detail: { message } }));
    const onNearby = () => {
      const map = mapRef.current;
      if (!map) return;
      if (!(activeLayersRef.current as any)?.transit) {
        reply('Turn on Live Transit first — then Nearby can search what the layer loads.');
        return;
      }
      const c = map.getCenter();
      type Pt = { lat: number; lng: number; label: string; open: () => void };
      const pts: Pt[] = [];
      for (const f of transitRenderedRef.current) {
        const [lng, lat] = f.geometry.coordinates;
        const p = f.properties;
        pts.push({
          lat, lng,
          label: `${p.route ? `Route ${p.route}` : 'A transit vehicle'} (${p.agency ?? 'transit'})`,
          open: () => setTransitSel({ kind: 'vehicle', agencyId: p.agencyId || '', coords: [lng, lat], p }),
        });
      }
      for (const [agencyId, entry] of transitNetworkRef.current) {
        for (const s of entry.stops ?? []) {
          pts.push({
            lat: s.lat, lng: s.lng,
            label: `Stop "${s.name}"`,
            open: () => setTransitSel({
              kind: 'stop', agencyId, coords: [s.lng, s.lat],
              p: { agency: agencyId, stopId: s.id, name: s.name, routes: (s.routes ?? []).join(' · ') },
            }),
          });
        }
      }
      const hit = nearestOf({ lat: c.lat, lng: c.lng }, pts);
      if (!hit) {
        reply('No transit is loaded near the map centre yet — zoom into a covered city (Salt Lake City · Seattle · Denver · Boston…) and try again.');
        return;
      }
      const { point, distKm } = hit;
      reply(`Nearest: ${point.label} · ${distKm < 1 ? `${Math.round(distKm * 1000)} m` : `${distKm.toFixed(1)} km`} from the map centre — flying there.`);
      map.flyTo({ center: [point.lng, point.lat], zoom: Math.max(map.getZoom(), 13.5), essential: true });
      window.setTimeout(() => point.open(), 900);
    };
    window.addEventListener('we:transit-nearby', onNearby);
    return () => window.removeEventListener('we:transit-nearby', onNearby);
  }, []);

  // Dragging the map releases a vehicle follow (the follow pattern).
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    const onDragStart = () => { if (transitFollowRef.current) endTransitFollow(); };
    map.on('dragstart', onDragStart);
    return () => { map.off('dragstart', onDragStart); };
  }, [mapReady, endTransitFollow]);

  // Space Missions — rocket launches from Launch Library 2, proxied and
  // quota-cached by /api/launches (lib/launches). Pad markers render from
  // the board; the selection lives in React state for SpaceMissionsPanel
  // and the Director's Space Mission preset. The client polls every 5 min
  // — the server-side cache is what protects the 15 calls/hour quota.
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    const on = !!(activeLayers as any).space_missions;
    if (!on) {
      setGeo('launches', []);
      setGeo('launch-replay', []);
      setLaunchData(null);
      setSelectedPadKey(null);
      setSelectedLaunchId(null);
      return;
    }
    let live = true;
    const render = (upcoming: LaunchRecord[], previous: LaunchRecord[]) => {
      const pads = new Map<string, { lat: number; lon: number; name: string; next?: LaunchRecord; last?: LaunchRecord }>();
      const add = (l: LaunchRecord, slot: 'next' | 'last') => {
        const key = launchPadKey(l);
        if (!key || l.padLat === null || l.padLon === null) return;
        let pad = pads.get(key);
        if (!pad) { pad = { lat: l.padLat, lon: l.padLon, name: l.padName ?? 'Launch pad' }; pads.set(key, pad); }
        if (slot === 'next' && !pad.next) pad.next = l;
        if (slot === 'last' && !pad.last) pad.last = l;
      };
      upcoming.forEach((l) => add(l, 'next'));
      previous.forEach((l) => add(l, 'last'));
      setGeo('launches', [...pads.entries()].map(([key, pad]) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [pad.lon, pad.lat] },
        properties: {
          padKey: key,
          label: pad.name,
          statusKind: launchStatusKind((pad.next ?? pad.last) as LaunchRecord),
        },
      })));
    };
    const load = async () => {
      try {
        const r = await fetch('/api/launches');
        const j = await r.json();
        if (!live) return;
        if (!r.ok || j.error) {
          setLaunchData({ upcoming: [], previous: [], stale: false, error: true });
          return;
        }
        const upcoming: LaunchRecord[] = j.upcoming ?? [];
        const previous: LaunchRecord[] = j.previous ?? [];
        setLaunchData({ upcoming, previous, stale: !!j.stale, error: false });
        render(upcoming, previous);
      } catch {
        if (!live) return;
        setLaunchData((prev) => prev ?? { upcoming: [], previous: [], stale: false, error: true });
      }
    };
    const onPadClick = (e: any) => {
      const props = e.features?.[0]?.properties;
      if (!props?.padKey) return;
      setSelectedLaunchId(null);
      setSelectedPadKey(props.padKey);
    };
    map.on('click', 'launch-pads', onPadClick);
    void load();
    const iv = setInterval(load, 300_000);
    return () => {
      live = false;
      clearInterval(iv);
      map.off('click', 'launch-pads', onPadClick);
    };
  }, [mapReady, (activeLayers as any).space_missions, setGeo]);
  // Street Level — community street-level photos from Panoramax,
  // proxied + cached by /api/streetlevel (lib/streetlevel). Viewport
  // discipline per the brief: NOTHING loads below street zoom (the chip
  // says why), and at street zoom the request is the exact viewport —
  // the server guards the span and caches on a quantized grid. An empty
  // result is a real provider answer and renders as the no-coverage
  // chip; a provider failure keeps the last good dots and the chip says
  // Panoramax did not answer. The imagery is dated community photos —
  // never live — and the chip + viewer both say so.
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    const on = !!(activeLayers as any).street_level;
    if (!on) {
      setGeo('street-level', []);
      setStreetLevelChip(null);
      setStreetPicture(null);
      streetLevelPicsRef.current = new Map();
      return;
    }
    let live = true;
    const load = async () => {
      if (!live) return;
      if (map.getZoom() < STREET_LEVEL_MIN_ZOOM) {
        setGeo('street-level', []);
        streetLevelPicsRef.current = new Map();
        setStreetLevelChip('ZOOM IN TO STREET LEVEL — PHOTO COVERAGE LOADS AT ZOOM 15+');
        return;
      }
      const b = map.getBounds();
      if (b.getEast() - b.getWest() > STREET_LEVEL_MAX_SPAN_DEG || b.getNorth() - b.getSouth() > STREET_LEVEL_MAX_SPAN_DEG) {
        setGeo('street-level', []);
        streetLevelPicsRef.current = new Map();
        setStreetLevelChip('AREA TOO WIDE FOR STREET LEVEL — ZOOM IN');
        return;
      }
      try {
        const r = await fetch(`/api/streetlevel?bbox=${b.getWest()},${b.getSouth()},${b.getEast()},${b.getNorth()}`);
        const j = await r.json();
        if (!live) return;
        if (!r.ok || j.error) {
          setStreetLevelChip('STREET-LEVEL DATA UNAVAILABLE — PANORAMAX DID NOT ANSWER');
          return; // keep the last good dots on screen
        }
        const pics: StreetPicture[] = j.pictures ?? [];
        streetLevelPicsRef.current = new Map(pics.map((p) => [p.id, p]));
        setGeo('street-level', pics.map((p) => ({
          type: 'Feature', geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
          properties: { id: p.id },
        })));
        if (!pics.length) {
          setStreetLevelChip('NO STREET-LEVEL COVERAGE IN THIS AREA — PANORAMAX IS COMMUNITY-CONTRIBUTED, STRONGEST IN FRANCE');
        } else {
          let text = `${pics.length} STREET-LEVEL PHOTO${pics.length === 1 ? '' : 'S'} IN VIEW · PANORAMAX · COMMUNITY IMAGERY — NOT LIVE`;
          if (j.truncated) text += ' · FIRST 300 SHOWN';
          if (j.stale) text += ' · CACHED COPY — PANORAMAX UNREACHABLE';
          setStreetLevelChip(text);
        }
      } catch {
        if (!live) return;
        setStreetLevelChip('STREET-LEVEL DATA UNAVAILABLE — PANORAMAX DID NOT ANSWER');
      }
    };
    const onPicClick = (e: any) => {
      // Where hit circles overlap, e.features carries several pictures;
      // the one whose position is nearest the click point is the marker
      // the user meant.
      const feats: any[] = e.features ?? [];
      let best: any = null;
      let bestD = Infinity;
      for (const f of feats) {
        const c = f?.geometry?.coordinates;
        if (!Array.isArray(c)) continue;
        const p = map.project(c as [number, number]);
        const d = (p.x - e.point.x) ** 2 + (p.y - e.point.y) ** 2;
        if (d < bestD) { bestD = d; best = f; }
      }
      const id = best?.properties?.id;
      const pic = id ? streetLevelPicsRef.current.get(id) : undefined;
      if (pic) setStreetPicture(pic);
    };
    const onEnter = () => { map.getCanvas().style.cursor = 'pointer'; };
    const onLeave = () => { map.getCanvas().style.cursor = ''; };
    // The hit layer is registered first so the core dot's own handler —
    // the precise hit — has the final word when a click lands on both.
    map.on('click', 'street-level-hit', onPicClick);
    map.on('click', 'street-level-dots', onPicClick);
    map.on('mouseenter', 'street-level-hit', onEnter);
    map.on('mouseleave', 'street-level-hit', onLeave);
    map.on('mouseenter', 'street-level-dots', onEnter);
    map.on('mouseleave', 'street-level-dots', onLeave);
    map.on('moveend', load);
    void load();
    return () => {
      live = false;
      map.off('click', 'street-level-hit', onPicClick);
      map.off('click', 'street-level-dots', onPicClick);
      map.off('mouseenter', 'street-level-hit', onEnter);
      map.off('mouseleave', 'street-level-hit', onLeave);
      map.off('mouseenter', 'street-level-dots', onEnter);
      map.off('mouseleave', 'street-level-dots', onLeave);
      map.off('moveend', load);
    };
  }, [mapReady, (activeLayers as any).street_level, setGeo]);

  // Traffic — SIMULATED vehicles on the basemap's own OSM road geometry.
  // Roads are extracted from the CARTO `transportation` source-layer of
  // the tiles the basemap already loaded (querySourceFeatures — no second
  // tile source, zero extra network, no Overpass). The engine is pure
  // (lib/traffic); this effect owns the clock, rebuild triggers, the
  // optional TomTom flow overlay, road-click camera lookup, and the
  // always-visible honesty chip. Vehicles are simulated — never real
  // tracked cars — and the chip says so for as long as the layer is on.
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    const on = !!(activeLayers as any).traffic;
    const showVehicles = on && (activeLayers as any).traffic_vehicles !== false;
    const showCongestion = on && (activeLayers as any).traffic_congestion !== false;
    if (!on) {
      setGeo('traffic-roads', []);
      setGeo('traffic-vehicles', []);
      setVis(['traffic-flow', 'traffic-vehicles'], false);
      trafficNetRef.current = null;
      trafficVehiclesStateRef.current = [];
      trafficFlowRef.current = null;
      setTrafficChip(null);
      return;
    }

    let live = true;
    let raf = 0;
    let rebuildTimer: ReturnType<typeof setTimeout> | undefined;
    let tomtomConfigured = false;
    let tomtomAdded = false;
    let flowError = false;
    const rng = createRng(20261018);
    const mobileLike = typeof window !== 'undefined'
      && (window.innerWidth < 768 || (window.innerHeight < 500 && window.innerWidth < 1024));
    const ratioFor = (road: any) => effectiveRatio(road, new Date(), trafficFlowRef.current?.ratios);

    // Where the basemap keeps its roads. CARTO's current dark-matter
    // style is Protomaps-based: source `protomaps`, source-layer
    // `roads` (properties translated by adaptBasemapRoadFeatures). The
    // legacy OpenMapTiles pairing (`carto` / `transportation`) is kept
    // as a fallback so an upstream style change in either direction
    // degrades to "whichever source actually exists" instead of the
    // silent empty extraction that killed this layer: querying a
    // missing source throws into rebuild's catch and reads as "no
    // roads in view" forever.
    const roadSourceCandidates = [
      { source: 'protomaps', sourceLayer: 'roads' },
      { source: 'carto', sourceLayer: 'transportation' },
    ];
    const roadSource = roadSourceCandidates.find((c) => {
      try { return !!map.getSource(c.source); } catch { return false; }
    }) ?? roadSourceCandidates[0];

    const setChip = () => {
      if (!live) return;
      // The chip text is pinned in lib/traffic/config (trafficChipText):
      // flow is live TomTom where configured; vehicles are modeled from
      // road data in every state — the line says both, never more.
      const flowState: TrafficFlowState = tomtomConfigured && !flowError ? 'live' : 'unavailable';
      setTrafficChip(trafficChipText(flowState, map.getZoom() < TRAFFIC_MIN_ZOOM));
    };

    const setRoadFeatures = () => {
      const net = trafficNetRef.current;
      if (!net) { setGeo('traffic-roads', []); return; }
      setGeo('traffic-roads', net.roads.map(road => {
        const ratio = ratioFor(road);
        return {
          type: 'Feature', geometry: { type: 'LineString', coordinates: road.coords },
          properties: { band: congestionBand(ratio), ratio: Math.round(ratio * 100) / 100, roadClass: road.roadClass, name: road.name },
        };
      }));
    };

    const setVehicleFeatures = () => {
      const net = trafficNetRef.current;
      if (!net) { setGeo('traffic-vehicles', []); return; }
      const feats: any[] = [];
      for (const v of trafficVehiclesStateRef.current) {
        const f = vehicleFeature(v, net, ratioFor);
        if (f) { (f.properties as any).band = congestionBand((f.properties as any).ratio); feats.push(f); }
      }
      setGeo('traffic-vehicles', feats);
    };

    const applyVisibility = () => {
      setVis(['traffic-vehicles'], showVehicles);
      // Congestion overlay: TomTom's own flow lines when its source is
      // live, otherwise our extracted roads colored by the model.
      setVis(['traffic-flow'], showCongestion && !tomtomAdded);
      if (tomtomAdded && map.getLayer('tomtom-flow-lines')) {
        map.setLayoutProperty('tomtom-flow-lines', 'visibility', showCongestion ? 'visible' : 'none');
      }
    };

    const sampleFlow = () => {
      if (!tomtomAdded || !trafficNetRef.current) return;
      let feats: any[] = [];
      try { feats = map.querySourceFeatures('tomtom-flow', { sourceLayer: 'Traffic flow' }) as any[]; } catch { return; }
      if (!feats.length) return;
      const ratios = matchFlowToRoads(trafficNetRef.current.roads, feats as any);
      if (ratios.size) {
        trafficFlowRef.current = { ratios, at: Date.now() };
        flowError = false;
        setRoadFeatures();
        setChip();
      }
    };

    const rebuild = () => {
      if (!live) return;
      const zoom = map.getZoom();
      if (zoom < TRAFFIC_MIN_ZOOM) {
        trafficNetRef.current = null;
        trafficVehiclesStateRef.current = [];
        setGeo('traffic-roads', []);
        setGeo('traffic-vehicles', []);
        setChip();
        return;
      }
      const b = map.getBounds();
      const padLat = (b.getNorth() - b.getSouth()) * 0.15;
      const padLng = (b.getEast() - b.getWest()) * 0.15;
      let raw: any[] = [];
      try { raw = map.querySourceFeatures(roadSource.source, { sourceLayer: roadSource.sourceLayer }) as any[]; } catch { raw = []; }
      const net = buildRoadNetwork(adaptBasemapRoadFeatures(raw as any), zoom, {
        west: b.getWest() - padLng, south: b.getSouth() - padLat,
        east: b.getEast() + padLng, north: b.getNorth() + padLat,
      });
      // Tiles may still be loading on first activation; an empty result
      // keeps the previous network and is retried by the periodic pass.
      if (net.roads.length) trafficNetRef.current = net;
      const active = trafficNetRef.current;
      if (!active) { setChip(); return; }
      // Fleet density follows measured congestion: the network's
      // length-weighted mean ratio (TomTom where matched, the class
      // model elsewhere) scales the target — gridlock packs, 3 AM
      // free flow thins out.
      let weighted = 0;
      for (const road of active.roads) weighted += ratioFor(road) * road.lengthM;
      const meanRatio = active.totalLengthM > 0 ? weighted / active.totalLengthM : undefined;
      trafficVehiclesStateRef.current = reconcileVehicles(
        trafficVehiclesStateRef.current, active,
        targetVehicleCount(active.totalLengthM, zoom, mobileLike, meanRatio), rng, ratioFor,
      );
      sampleFlow();
      setRoadFeatures();
      setVehicleFeatures();
      applyVisibility();
      setChip();
    };

    const scheduleRebuild = () => {
      if (rebuildTimer) clearTimeout(rebuildTimer);
      rebuildTimer = setTimeout(rebuild, 250);
    };

    // ── Road click → nearby REAL cameras from the globe's own catalogue ──
    // The search + popup are the shared handoff (src/lib/nearby-cameras.ts,
    // openNearbyCameras above) — the same one the aircraft popup and the
    // region dossier use, so there is exactly one nearest-camera behaviour.
    const onRoadClick = (e: any) => {
      const here: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      const roadName = e.features?.[0]?.properties?.name || e.features?.[0]?.properties?.ref || '';
      const radiusKm = (CAMERA_SEARCH_RADIUS_M / 1000).toFixed(1);
      openNearbyCamerasRef.current?.(here, {
        title: roadName ? `TRAFFIC — ${String(roadName).toUpperCase()}` : 'TRAFFIC — ROAD SEGMENT',
        honestyWithResults: 'VEHICLES HERE ARE MODELED FROM ROAD DATA · CAMERAS BELOW ARE REAL',
        honestyEmpty: 'VEHICLES HERE ARE MODELED FROM ROAD DATA',
        listLead: (n) => `${n} live camera${n > 1 ? 's' : ''} within ${radiusKm} km:`,
        emptyText: `No live cameras in the loaded index within ${radiusKm} km of this road.`,
      });
    };

    const setupTomtom = () => {
      if (!tomtomConfigured || tomtomAdded || !live) return;
      if (!map.getSource('tomtom-flow')) {
        map.addSource('tomtom-flow', {
          type: 'vector',
          tiles: [`${window.location.origin}/api/traffic/flow/{z}/{x}/{y}`],
          minzoom: 9, maxzoom: 19,
        });
        map.addLayer({ id: 'tomtom-flow-lines', type: 'line', source: 'tomtom-flow', 'source-layer': 'Traffic flow', layout: {
          'line-cap': 'round', 'line-join': 'round', visibility: showCongestion ? 'visible' : 'none',
        }, paint: {
          'line-color': ['step', ['number', ['get', 'relative_speed'], ['get', 'traffic_level'], 1],
            BAND_COLORS.jam, 0.4, BAND_COLORS.slow, 0.7, BAND_COLORS.free],
          'line-width': ['interpolate', ['linear'], ['zoom'],
            11, ['match', ['get', 'road_category'], 'motorway', 2.4, 'trunk', 2.2, 'primary', 1.8, 1.2],
            14, ['match', ['get', 'road_category'], 'motorway', 4.5, 'trunk', 4, 'primary', 3.2, 'secondary', 2.6, 1.8],
            17, ['match', ['get', 'road_category'], 'motorway', 8, 'trunk', 7, 'primary', 5.5, 'secondary', 4.5, 'tertiary', 3.5, 2.6]],
          'line-opacity': 0.85,
        }});
        map.on('click', 'tomtom-flow-lines', onRoadClick);
      }
      tomtomAdded = true;
      applyVisibility();
      scheduleRebuild();
    };

    const onSourceData = (e: any) => {
      if (e.sourceId === 'tomtom-flow' && e.isSourceLoaded) scheduleRebuild();
      else if (e.sourceId === roadSource.source && e.isSourceLoaded && !trafficNetRef.current) scheduleRebuild();
    };
    const onMapError = (e: any) => {
      if (e?.sourceId === 'tomtom-flow' || /traffic\/flow/.test(String(e?.error?.message ?? ''))) {
        if (!flowError) { flowError = true; applyVisibility(); setChip(); }
      }
    };
    const onMoveEnd = () => { map.once('idle', scheduleRebuild); scheduleRebuild(); };

    map.on('click', 'traffic-flow', onRoadClick);
    map.on('sourcedata', onSourceData);
    map.on('error', onMapError);
    map.on('moveend', onMoveEnd);

    (async () => {
      try {
        const r = await fetch('/api/traffic/status');
        const j = await r.json();
        if (live && j?.tomtom) { tomtomConfigured = true; setupTomtom(); }
      } catch { /* no key / offline → simulated mode */ }
      rebuild();
      applyVisibility();
      setChip();
    })();

    // Periodic pass: late tile arrivals, time-of-day drift, chip freshness.
    const iv = setInterval(() => { rebuild(); setChip(); }, 20000);

    let last = performance.now();
    let lastPush = 0;
    const tick = (nowMs: number) => {
      if (!live) return;
      const dt = Math.min(0.1, Math.max(0, (nowMs - last) / 1000));
      last = nowMs;
      const net = trafficNetRef.current;
      if (net && trafficVehiclesStateRef.current.length) {
        advanceVehicles(trafficVehiclesStateRef.current, net, dt, rng, ratioFor);
        if (nowMs - lastPush >= 33) { lastPush = nowMs; setVehicleFeatures(); }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      live = false;
      cancelAnimationFrame(raf);
      clearInterval(iv);
      if (rebuildTimer) clearTimeout(rebuildTimer);
      map.off('click', 'traffic-flow', onRoadClick);
      if (tomtomAdded) map.off('click', 'tomtom-flow-lines', onRoadClick);
      map.off('sourcedata', onSourceData);
      map.off('error', onMapError);
      map.off('moveend', onMoveEnd);
      if ((window as any).__weTrafficCam) delete (window as any).__weTrafficCam;
      if (map.getLayer('tomtom-flow-lines')) map.removeLayer('tomtom-flow-lines');
      if (map.getSource('tomtom-flow')) map.removeSource('tomtom-flow');
      setGeo('traffic-roads', []);
      setGeo('traffic-vehicles', []);
      setVis(['traffic-flow', 'traffic-vehicles'], false);
      trafficNetRef.current = null;
      trafficVehiclesStateRef.current = [];
      trafficFlowRef.current = null;
      setTrafficChip(null);
    };
  }, [mapReady, (activeLayers as any).traffic, (activeLayers as any).traffic_vehicles, (activeLayers as any).traffic_congestion, setGeo, setVis]);

  // ALERT Fire Cameras — fetched in-map on toggle; server route is cached,
  // frames themselves load straight from ALERTCalifornia in the popup.
  useEffect(() => {
    if (!mapReady) return;
    if (!(activeLayers as any).alert_cams) { setGeo('alert-cams', []); return; }
    let live = true;
    const load = async () => {
      try {
        const r = await fetch('/api/alert-cameras');
        const j = await r.json();
        if (!live) return;
        setGeo('alert-cams', (j.cameras ?? []).map((c: any) => ({
          type: 'Feature', geometry: { type: 'Point', coordinates: [c.lng, c.lat] },
          properties: { id: c.id, name: c.name, county: c.county, org: c.org, img: c.img, url: c.url, online: c.online },
        })));
      } catch { /* keep the last good set */ }
    };
    load();
    const iv = setInterval(load, 600000); // 10m — positions are fixed
    return () => { live = false; clearInterval(iv); };
  }, [mapReady, (activeLayers as any).alert_cams, setGeo]);

  // River Gauges — fetched in-map on toggle (page state stays untouched);
  // /api/river-gauges is server-cached, this just polls it while visible.
  useEffect(() => {
    if (!mapReady) return;
    if (!(activeLayers as any).river_gauges) { setGeo('river-gauges', []); return; }
    let live = true;
    const load = async () => {
      try {
        const r = await fetch('/api/river-gauges');
        const j = await r.json();
        if (!live) return;
        setGeo('river-gauges', (j.gauges ?? []).map((g: any) => ({
          type: 'Feature', geometry: { type: 'Point', coordinates: [g.lng, g.lat] },
          properties: { id: g.id, gh: g.gh ?? null, flow: g.flow ?? null, t: g.t },
        })));
      } catch { /* keep the last good set */ }
    };
    load();
    const iv = setInterval(load, 600000); // 10m
    return () => { live = false; clearInterval(iv); };
  }, [mapReady, (activeLayers as any).river_gauges, setGeo]);

  useEffect(() => {
    if (!mapReady) return;
    // Hurricane features arrive as GeoJSON from /api/hurricanes.
    setGeo('hurricanes', (activeLayers as any).hurricanes && data.hurricane_features ? data.hurricane_features : []);
  }, [mapReady, data.hurricane_features, (activeLayers as any).hurricanes, setGeo]);

  useEffect(() => {
    if (!mapReady) return;
    // Perimeter features arrive as GeoJSON from /api/fire-perimeters.
    setGeo('fire-perimeters', (activeLayers as any).fire_perimeters && data.fire_perimeters ? data.fire_perimeters : []);
  }, [mapReady, data.fire_perimeters, (activeLayers as any).fire_perimeters, setGeo]);

  useEffect(() => {
    if (!mapReady) return;
    setGeo('weather', activeLayers.weather && data.weather_events ? data.weather_events.map((w: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [w.lng, w.lat] }, properties: { title: w.title, type: w.type, icon: w.icon, severity: w.severity, source: w.source, id: w.id } })) : []);
  }, [mapReady, data.weather_events, activeLayers.weather, setGeo]);

  useEffect(() => {
    if (!mapReady) return;
    setGeo('infrastructure', activeLayers.infrastructure && data.infrastructure ? data.infrastructure.map((i: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [i.lng, i.lat] }, properties: { name: i.name, city: i.city, country: i.country, status: i.status, reactors: i.reactors, capacityMW: i.capacityMW, owner: i.owner, sourceUrl: i.sourceUrl ?? null } })) : []);
  }, [mapReady, data.infrastructure, activeLayers.infrastructure, setGeo]);

  useEffect(() => {
    if (!mapReady) return;
    setGeo('maritime', activeLayers.maritime && data.maritime_ports ? data.maritime_ports.map((p: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [p.lng, p.lat] }, properties: { name: p.name, country: p.country, type: p.type, volume: p.volume, fleet: p.fleet, rank: p.rank } })) : []);
    setGeo('maritime-choke', activeLayers.maritime && data.maritime_chokepoints ? data.maritime_chokepoints.map((c: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [c.lng, c.lat] }, properties: { name: c.name, traffic: c.traffic, risk: c.risk } })) : []);
    setGeo('maritime-ships', activeLayers.maritime && data.maritime_ships ? data.maritime_ships.map((s: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [s.lng, s.lat] }, properties: { name: s.name || s.mmsi?.toString(), type: s.type || 'cargo', speed: s.speed, heading: s.heading, destination: s.destination, flag: s.flag } })) : []);
  }, [mapReady, data.maritime_ports, data.maritime_chokepoints, data.maritime_ships, activeLayers.maritime, setGeo]);

  useEffect(() => {
    if (!mapReady) return;
    setGeo('plows', (activeLayers as any).plows && data.plows ? data.plows.map((p: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [p.lng, p.lat] }, properties: { id: p.id, label: p.label ?? null, agency: p.agency, status: p.status ?? null, speed: p.speed ?? null, heading: p.heading ?? null, updatedAt: p.updatedAt } })) : []);
  }, [mapReady, data.plows, (activeLayers as any).plows, setGeo]);

  useEffect(() => {
    if (!mapReady) return;
    setGeo('balloons', activeLayers.balloons && data.balloons ? data.balloons.map((b: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [b.lng, b.lat] }, properties: { callsign: b.callsign, type: b.type, status: b.status, altitude: b.altitude, speed: b.speed, verticalRate: b.verticalRate, temperature: b.temperature, color: b.color } })) : []);
  }, [mapReady, data.balloons, activeLayers.balloons, setGeo]);

  useEffect(() => {
    if (!mapReady) return;
    setGeo('radiation', activeLayers.radiation && data.radiation ? data.radiation.map((r: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [r.lng, r.lat] }, properties: { name: r.name, city: r.city, country: r.country, reading: r.reading, status: r.status, network: r.network } })) : []);
  }, [mapReady, data.radiation, activeLayers.radiation, setGeo]);

  // ══ OSIRIS SDK — Lattice Sensor Mesh ══
  // Uses real submarine cable data for SEA domain, curated routes for AIR/INTEL
  useEffect(() => {
    if (!mapReady) return;
    setGeo('sdk-entities', []);

    const anySDK = activeLayers.sdk_sea || activeLayers.sdk_air || activeLayers.sdk_naval;
    if (!anySDK) {
      setGeo('sdk-links', []);
      return;
    }

    const links: any[] = [];

    // ── SEA DOMAIN: Real submarine cable data (1-for-1 Match) ──
    if (activeLayers.sdk_sea && data.submarine_cables) {
      const ignoredColors = new Set(['#9BB5CC', '#A0B8CD', '#8EABC2', '#9bb5cc', '#a0b8cd', '#8eabc2']);
      for (const cable of data.submarine_cables) {
        if (!cable.geometry) continue;
        
        // Remove the light blue background arcs
        if (cable.properties?.color && ignoredColors.has(cable.properties.color)) continue;
        
        links.push({
          type: 'Feature',
          geometry: cable.geometry, // Raw topographic paths exactly from Submarine Map
          properties: {
            domain: 'SEA',
            fromName: cable.properties?.name || 'Submarine Cable',
            toName: cable.properties?.landing_points || '',
            source: 'Global Subsea Cable Network',
            url: 'https://www.submarinecablemap.com/',
            ...cable.properties,
            color: '#1976D2', // Darker blue as requested, more transparent in layer paint
          },
        });
      }
    }

    setGeo('sdk-links', links);
  }, [mapReady, activeLayers.sdk_sea, activeLayers.sdk_air, activeLayers.sdk_naval, data.submarine_cables, setGeo]);

  useEffect(() => {
    if (!mapReady) return;
    setGeo('live-news', activeLayers.live_news && data.live_feeds ? data.live_feeds.map((f: any) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [f.lng, f.lat] }, properties: { name: f.name, city: f.city, country: f.country, url: f.url, category: f.category, embed_allowed: f.embed_allowed !== false } })) : []);
  }, [mapReady, data.live_feeds, activeLayers.live_news, setGeo]);

  // Live Alert pins. Kept whole in the ref even when the layer is off, so the
  // feed's locate button can still open a report's pin.
  useEffect(() => {
    if (!mapReady) return;
    const reports: PinnedReport[] = Array.isArray(data.alert_pins) ? data.alert_pins : [];
    /* The feed hides what its filters exclude; the map follows it, so a search
       or a theatre filter narrows the pins to the reports being read. */
    const shown = alertPinIds ? new Set(alertPinIds) : null;
    const now = Date.now();

    const placed = reports.flatMap((n): { n: PinnedReport; lat: number; lng: number }[] => {
      if (!n?.place || !Array.isArray(n.coords)) return [];
      const [lat, lng] = n.coords;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
      if (shown && !shown.has(n.id)) return [];
      return [{ n, lat, lng }];
    });

    // How many reports name each place, so a town can say it carries several.
    const perPlace = new Map<string, number>();
    for (const { lat, lng } of placed) {
      const key = `${lat},${lng}`;
      perPlace.set(key, (perPlace.get(key) ?? 0) + 1);
    }

    alertPinsRef.current = placed.map(({ n, lat, lng }): AlertPinFeature => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lng, lat] },
      properties: {
        id: n.id,
        kind: n.alert_kind === 'rocket' || n.alert_kind === 'event' ? n.alert_kind : 'news',
        stack: perPlace.get(`${lat},${lng}`) ?? 1,
        fresh: now - Date.parse(n.published) < ALERT_FRESH_MS,
        title: n.title,
        source_name: n.source_name,
        lean: n.lean ?? '',
        published: n.published,
        link: n.link ?? '',
        place_name: n.place!.name,
        place_label: n.place!.label,
        precision: n.place!.precision,
        media_kind: n.media?.kind ?? '',
        video: n.media?.video ?? '',
        thumb: n.media?.thumb ?? '',
        duration: n.media?.duration ?? '',
      },
    }));
    setGeo('alert-pins', activeLayers.alert_pins ? alertPinsRef.current : []);
  }, [mapReady, data.alert_pins, activeLayers.alert_pins, alertPinIds, setGeo]);

  /* The newest reports pulse, so something that just landed catches the eye
     without the other pins moving. Same 200ms tick the malware ring uses. */
  useEffect(() => {
    if (!mapReady || !mapRef.current || !activeLayers.alert_pins) return;
    const map = mapRef.current;
    const tick = () => {
      try {
        map.setPaintProperty('alert-pin-pulse', 'circle-radius', 9 + Math.sin(Date.now() / 260) * 3.5);
        map.setPaintProperty('alert-pin-pulse', 'circle-stroke-opacity', 0.55 + Math.sin(Date.now() / 260) * 0.25);
      } catch { /* style not settled yet */ }
    };
    tick();
    const timer = setInterval(tick, 200);
    return () => clearInterval(timer);
  }, [mapReady, activeLayers.alert_pins]);


  useEffect(() => {
    if (!mapReady) return;
    // 🔴 CONFLICT ZONES - Live from /api/conflicts 🔴
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/conflicts');
        if (cancelled) return;
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const conflictData = await res.json();
        if (cancelled) return;

        // Zone anchor markers (war/high/elevated labels)
        const zoneFeatures = (conflictData.zones || []).map((z: any) => ({
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [z.lng, z.lat] },
          properties: { 
            label: z.label, 
            severity: z.severity, 
            description: `${z.description}${z.eventCount > 0 ? ` [${z.eventCount} live events detected]` : ''}`,
            sourceUrl: z.sourceUrl,
            eventCount: z.eventCount,
          },
        }));

        // Individual live conflict events (scatter dots across conflict zones)
        const eventFeatures = (conflictData.liveEvents || [])
          .filter((e: any) => e.lat && e.lng)
          .map((e: any) => ({
            type: 'Feature' as const,
            geometry: { type: 'Point' as const, coordinates: [e.lng, e.lat] },
            properties: { 
              label: (e.title || 'CONFLICT EVENT').substring(0, 60).toUpperCase(),
              severity: 'war',
              description: e.title || 'Live conflict event detected by GDELT.',
              sourceUrl: e.url || '',
            },
          }));

        setGeo('conflict-zones', [...zoneFeatures, ...eventFeatures]);
      } catch (e) {
        // Fallback: if API fails, use minimal known zones
        const FALLBACK_ZONES = [
          { label: 'UKRAINE WAR', severity: 'war', lat: 48.5, lng: 31.2, description: 'Ongoing Russian invasion of Ukraine.', sourceUrl: 'https://liveuamap.com/' },
          { label: 'GAZA CONFLICT', severity: 'war', lat: 31.35, lng: 34.35, description: 'Active military operations in Gaza.', sourceUrl: 'https://israelpalestine.liveuamap.com/' },
          { label: 'SUDAN CIVIL WAR', severity: 'war', lat: 15.0, lng: 30.0, description: 'SAF vs RSF armed conflict.', sourceUrl: 'https://sudan.liveuamap.com/' },
          { label: 'YEMEN WAR', severity: 'war', lat: 15.5, lng: 48.0, description: 'Houthi operations and Red Sea threats.', sourceUrl: 'https://yemen.liveuamap.com/' },
          { label: 'MYANMAR CONFLICT', severity: 'war', lat: 19.5, lng: 96.5, description: 'Military junta vs opposition forces.', sourceUrl: 'https://myanmar.liveuamap.com/' },
          { label: 'SYRIA', severity: 'high', lat: 35.0, lng: 38.5, description: 'Ongoing civil conflict.', sourceUrl: 'https://syria.liveuamap.com/' },
        ];
        const fallbackFeatures = FALLBACK_ZONES.map(z => ({
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [z.lng, z.lat] },
          properties: { label: z.label, severity: z.severity, description: z.description, sourceUrl: z.sourceUrl },
        }));
        setGeo('conflict-zones', fallbackFeatures);
      }
    })();
    return () => { cancelled = true; };
  }, [mapReady, setGeo]);


  // Visibility
  useEffect(() => {
    if (!mapReady) return;
    setVis(['eq-circles','eq-label','eq-icons'], activeLayers.earthquakes);
    const anySat = activeLayers.satellites || (activeLayers as any).sat_comms || (activeLayers as any).sat_military || (activeLayers as any).sat_navigation || (activeLayers as any).sat_earth || (activeLayers as any).sat_science;
    // The circle layers stay hidden whatever the toggles say — the 3D layer
    // is the single representation, and showing both drew every satellite
    // twice, once flat on the ground and once at altitude.
    setVis(['sat-glow','sat-dots'], false);
    // Clearing the 3D layer is what actually turns satellites off.
    if (!anySat) { satRowsRef.current = []; satLayerRef.current?.setPoints([]); }
    setVis(['gdelt-dots'], activeLayers.global_incidents);
    setVis(['gdelt-events-dots'], (activeLayers as any).gdelt_events);
    setVis(['cf-outage-halo','cf-outage-dots','cf-outage-label'], (activeLayers as any).cf_outages);
    setVis(['cf-attack-dots','cf-attack-label'], (activeLayers as any).cf_attacks);

    setVis(['malware-glow','malware-dots','malware-label','malware-new-ring'], activeLayers.malware);
    setVis(['network-mesh-atmo', 'network-mesh-glow', 'network-mesh-core'], activeLayers.internet_outages || activeLayers.malware);
    setVis(['cyber-heads','cyber-labels'], (activeLayers as any).cyber_attacks);
    setVis(['day-night-fill'], terminatorVisible(basemapMode, activeLayers.day_night));
    setVis(['fl-commercial'], activeLayers.flights);
    setVis(['fl-private'], activeLayers.private);
    setVis(['fl-jets'], activeLayers.jets);
    setVis(['fl-military'], activeLayers.military);
    setVis(['cctv-glow','cctv-dots','cctv-label'], activeLayers.cctv);
    setVis(['fires-heat','fires-icons'], activeLayers.fires);
    setVis(['fire-perim-fill','fire-perim-line'], (activeLayers as any).fire_perimeters);
    setVis(['hurricane-cone','hurricane-cone-line','hurricane-past','hurricane-track','hurricane-points','hurricane-current','hurricane-label','hurricane-icons','hurricane-selected-past','hurricane-past-points','hurricane-selected-halo','hurricane-selected-ring'], (activeLayers as any).hurricanes);
    setVis(['gauge-dots'], (activeLayers as any).river_gauges);
    setVis(['alert-glow','alert-dots','alert-label'], (activeLayers as any).alert_cams);
    setVis(['gbfs-systems','gbfs-label','gbfs-stations','gbfs-vehicles'], (activeLayers as any).gbfs);
    setVis(['transit-dots', 'transit-icons-bus', 'transit-icons-rail', 'transit-cluster-circles', 'transit-cluster-count'], !!(activeLayers as any).transit && transitSubOn(activeLayers, TRANSIT_SUB.vehicles));
    setVis(['transit-routes-line', 'transit-route-highlight'], !!(activeLayers as any).transit && anyLineFamilyOn(activeLayers));
    setVis(['transit-route-labels'], !!(activeLayers as any).transit && anyLineFamilyOn(activeLayers) && transitLabelsOn(activeLayers));
    setVis(['transit-stops-dots', 'transit-stops-label'], !!(activeLayers as any).transit && transitSubOn(activeLayers, TRANSIT_SUB.stops));
    setVis(['plow-icons'], (activeLayers as any).plows);
    setVis(['weather-glow','weather-dots','weather-label','weather-tsunami-icons','weather-storm-icons','weather-tornado-icons'], activeLayers.weather);
    setVis(['infra-glow','infra-dots','infra-label'], activeLayers.infrastructure);
    setVis(['maritime-glow','maritime-dots','maritime-label','maritime-icons'], activeLayers.maritime);
    setVis(['choke-glow','choke-dots','choke-label'], activeLayers.maritime);
    setVis(['ship-dots','ship-label'], activeLayers.maritime);
    setVis(['news-glow','news-dots','news-label'], activeLayers.live_news);
    setVis(['alert-pin-glow','alert-pin-dots','alert-pin-label','alert-pin-pulse','alert-pin-selected'], activeLayers.alert_pins);
    setVis(['conflict-icons'], activeLayers.conflict_zones !== false);

    setVis(['balloon-dots','balloon-label'], activeLayers.balloons);
    setVis(['rad-glow','rad-dots','rad-label'], activeLayers.radiation);
    setVis(['sdk-sea','sdk-sea-glow','sdk-sea-atmo'], activeLayers.sdk_sea !== false);
    setVis(['sdk-air','sdk-air-glow','sdk-air-atmo'], activeLayers.sdk_air !== false);
    setVis(['sdk-intel','sdk-intel-glow','sdk-intel-atmo'], activeLayers.sdk_naval !== false);
    // Sweep layers always visible when data is present (controlled by useEffect)
    setVis(['sweep-connections','sweep-pulse-ring','sweep-device-glow','sweep-device-dots','sweep-device-labels'], true);
  }, [mapReady, activeLayers, setVis, basemapMode]);

  // IP Sweep visualization
  useEffect(() => {
    if (!mapReady) return;
    if (!sweepData?.devices?.length) {
      setGeo('ip-sweep-devices', []);
      setGeo('ip-sweep-pulse', []);
      setGeo('ip-sweep-connections', []);
      return;
    }

    const map = mapRef.current;
    if (!map) return;

    const { center, devices } = sweepData;
    const centerCoord: [number, number] = [center.lng, center.lat];

    // Switch to globe and fly to the sweep location
    try {
      applyMapProjection(map, 'globe');
      map.setSky({ 'sky-color': '#0A0A0F', 'sky-horizon-blend': 0.02, 'horizon-color': '#0A0A0F', 'horizon-fog-blend': 0.02 });
    } catch { /* projection may not be supported */ }

    map.flyTo({ center: centerCoord, zoom: 14, pitch: 50, bearing: -20, duration: 3000, essential: true });

    // Set center pulse
    setGeo('ip-sweep-pulse', [{
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: centerCoord },
      properties: { ip: sweepData.target_ip },
    }]);

    // Build device features spread in a circle around center
    const allDeviceFeatures = devices.map((d: any, i: number) => {
      const angle = (i / devices.length) * Math.PI * 2;
      const radius = 0.001 + ((i % 7 + 1) * 0.0004);
      const dLng = centerCoord[0] + Math.cos(angle) * radius * (1 / Math.cos(center.lat * Math.PI / 180));
      const dLat = centerCoord[1] + Math.sin(angle) * radius;
      return {
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [dLng, dLat] },
        properties: {
          ip: d.ip, device_type: d.device_type, device_icon: d.device_icon,
          color: d.device_color, risk_level: d.risk_level,
          ports: JSON.stringify(d.ports), hostnames: JSON.stringify(d.hostnames),
          vulns: JSON.stringify(d.vulns), cpes: JSON.stringify(d.cpes), tags: JSON.stringify(d.tags),
        },
      };
    });

    // Connection lines from center to each device
    const connectionFeatures = allDeviceFeatures.map((f: any) => ({
      type: 'Feature' as const,
      geometry: { type: 'LineString' as const, coordinates: [centerCoord, f.geometry.coordinates] },
      properties: { color: f.properties.color },
    }));

    // Stagger the appearance after 3s flyTo completes
    const timer = setTimeout(() => {
      setGeo('ip-sweep-connections', connectionFeatures);
      const batchSize = 5;
      const batches = Math.ceil(allDeviceFeatures.length / batchSize);
      for (let b = 0; b < batches; b++) {
        setTimeout(() => {
          setGeo('ip-sweep-devices', allDeviceFeatures.slice(0, (b + 1) * batchSize));
        }, b * 100);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [mapReady, sweepData, setGeo]);

  // Scan Targets visualization
  useEffect(() => {
    if (!mapReady || !mapRef.current || !scanTargets) return;
    const map = mapRef.current;
    
    const features = scanTargets.map(t => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [t.lng, t.lat] },
      properties: { ...t }
    }));
    
    const src = map.getSource('scan-targets') as maplibregl.GeoJSONSource;
    if (src) src.setData({ type: 'FeatureCollection', features });
  }, [scanTargets, mapReady]);

  // Projection changes are independent of terrain. Toggling elevation must not
  // zoom, tilt, or reposition the camera the user has already chosen.
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    try {
      const projectionChanged = applyMapProjection(map, projection, terrainEnabled);
      const configureSky = projectionChanged || !containerRef.current?.dataset.mapProjection;
      if (containerRef.current) containerRef.current.dataset.mapProjection = projection;
      if (projection === 'globe') {
        // The overview globe's resting tilt, which used to be the initial
        // pitch. Only on a real projection change, so toggling terrain never
        // re-tilts a camera the user has already placed.
        if (configureSky && map.getPitch() < 0.5) map.easeTo({ pitch: 20, duration: 1200 });
        try {
          if (configureSky) map.setSky({
            'sky-color': '#04040A',
            'sky-horizon-blend': 0.5,
            'horizon-color': '#0a0a1a',
            'horizon-fog-blend': 0.3,
            'fog-color': '#04040A',
            'fog-ground-blend': 0.9,
          });
        } catch (e) { console.warn('[OSIRIS] Suppressed error:', e instanceof Error ? e.message : e); }
      } else {
        if (map.getPitch() > 0.5) map.easeTo({ pitch: 0, duration: 350 });
      }
    } catch (e) {
      console.warn('Projection switch failed:', e);
    }
  }, [mapReady, projection, terrainEnabled]);

  // Terrain loads only at regional zooms; globe overview stays inexpensive.
  useEffect(() => {
    if (!mapReady || !mapRef.current || !terrainEnabled) return;
    const map = mapRef.current;
    installTerrainTileProtocol(maplibregl.addProtocol);
    const dispose = attachTerrain(map, status => onTerrainStatusChange?.(status));
    return () => {
      // The map constructor effect removes the entire map first on unmount.
      if (mapRef.current === map) dispose();
    };
  }, [mapReady, terrainEnabled, terrainRetry, onTerrainStatusChange]);

  // A user-requested close-up keeps the current location and avoids a fly-out arc.
  useEffect(() => {
    if (!mapReady || !mapRef.current || !terrainFocus || !terrainEnabled || lastTerrainFocus.current === terrainFocus) return;
    lastTerrainFocus.current = terrainFocus;
    const map = mapRef.current;
    map.easeTo({ zoom: Math.max(10.5, map.getZoom()), pitch: 45, duration: 650 });
  }, [mapReady, terrainFocus, terrainEnabled]);

  // Fly-to
  useEffect(() => {
    if (!mapReady || !mapRef.current || !flyToLocation) return;
    const map = mapRef.current;
    map.flyTo({ center: [flyToLocation.lng, flyToLocation.lat], zoom: flyToLocation.zoom ?? 8, duration: flyToLocation.duration ?? 2000 });
    const alertId = flyToLocation.alertId;
    if (!alertId) return;
    const open = () => openAlertPinRef.current?.(alertId);
    map.once('moveend', open);
    return () => { map.off('moveend', open); };
  }, [mapReady, flyToLocation]);

  // 3D buildings are independent of the elevation renderer.
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    const enabled = activeLayers.terrain_3d;

    try {
      if (enabled) {
        // CARTO's already-loaded vector tiles include the building footprints
        // and render heights. No second worldwide vector source is needed.

        // ── 3D BUILDING EXTRUSION LAYER ──
        if (!map.getLayer('osiris-3d-buildings')) {
          map.addLayer({
            id: 'osiris-3d-buildings',
            source: 'carto',
            'source-layer': 'building',
            type: 'fill-extrusion',
            minzoom: 14.5,
            paint: {
              'fill-extrusion-color': [
                'interpolate', ['linear'], ['get', 'render_height'],
                0, '#1a1a2e',
                20, '#16213e',
                50, '#0f3460',
                120, '#533483',
                300, '#e94560',
              ],
              'fill-extrusion-height': [
                'interpolate', ['linear'], ['zoom'],
                14.5, 0,
                15.5, ['get', 'render_height']
              ],
              'fill-extrusion-base': [
                'interpolate', ['linear'], ['zoom'],
                14.5, 0,
                15.5, ['get', 'render_min_height']
              ],
              'fill-extrusion-opacity': [
                'interpolate', ['linear'], ['zoom'],
                14.5, 0,
                15, 0.7,
              ],
            },
          });
        }

        // Pitch the camera to reveal the 3D skyline
        if (map.getPitch() < 40) {
          map.easeTo({ pitch: 50, duration: 1200 });
        }

      } else {
        // ── DISABLE 3D ──
        if (map.getLayer('osiris-3d-buildings')) map.removeLayer('osiris-3d-buildings');
      }
    } catch (e) {
      console.warn('[OSIRIS] 3D terrain toggle error:', e);
    }
  }, [mapReady, activeLayers.terrain_3d]);

  // Satellite / Dark switching + the Wayback time slider's tile
  // swaps. lib/wayback-imagery owns the overlay: the satellite raster
  // rides as a source on the CARTO style (never a style swap), the
  // layer's visibility follows the switch, and a slider step is a
  // setTiles swap of the same source — `latest` is the live World
  // Imagery service this view has always used, a `wayback` selection
  // is that release's archive tiles.
  const satelliteOverlayStateRef = useRef(createSatelliteOverlayState());
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    try {
      syncSatelliteOverlay(
        mapRef.current as never,
        satelliteOverlayStateRef.current,
        mapStyle !== 'dark',
        satelliteSelection,
      );
    } catch (e) {
      console.warn('Style switch failed:', e);
    }
  }, [mapReady, mapStyle, satelliteSelection]);

  // Day / Night basemap — the light CARTO raster rides as an overlay on
  // the exact pattern the satellite view above established (this map
  // never setStyle-swaps; a swap would wipe the custom sources built at
  // load). Satellite view overrides it while active; turning satellite
  // off returns to the chosen day/night. lib/basemap-mode owns the rule.
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    try {
      syncDayOverlay(mapRef.current as never, basemapMode, mapStyle !== 'dark');
    } catch (e) {
      console.warn('Day overlay switch failed:', e);
    }
  }, [mapReady, basemapMode, mapStyle]);

  // Day mode's white backdrop (owner's order, 2026-10-26): while the
  // resolved view is DAY, the space behind the globe — the GL style's
  // background layer, plus the map container behind the canvas — goes
  // white; any other view restores the style's own colour. The style
  // never swaps, so its original background is captured once, before
  // the first override.
  const styleBgRef = useRef<{ captured: boolean; color: unknown }>({ captured: false, color: undefined });
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current as any;
    try {
      const bgLayers = (map.getStyle()?.layers ?? []).filter((l: any) => l.type === 'background');
      const rec = styleBgRef.current;
      if (basemapView(basemapMode, mapStyle !== 'dark') === 'day') {
        if (!rec.captured && bgLayers.length) {
          rec.color = map.getPaintProperty(bgLayers[0].id, 'background-color');
          rec.captured = true;
        }
        for (const l of bgLayers) map.setPaintProperty(l.id, 'background-color', '#ffffff');
        map.getContainer().style.backgroundColor = '#ffffff';
      } else {
        if (rec.captured && rec.color !== undefined) {
          for (const l of bgLayers) map.setPaintProperty(l.id, 'background-color', rec.color);
        }
        map.getContainer().style.backgroundColor = '';
      }
    } catch { /* style not ready yet — the next mode/style change reapplies */ }
  }, [mapReady, basemapMode, mapStyle]);

  // Live Clouds — NOAA's satellite mosaic, hung at cloud altitude over the
  // ground; see lib/live-clouds-layer. Under the night shade and every marker.
  // On the map they also sit under the place names, as on any weather map, so
  // a storm never hides a city's name; on SAT they go above the imagery, which
  // covers those names anyway. Nothing is fetched until the layer is first
  // switched on, and switching it off frees what it held on the GPU.
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    if (!activeLayers.live_clouds) {
      if (map.getLayer(CLOUDS_LAYER)) map.removeLayer(CLOUDS_LAYER);
      if (map.getLayer(CLOUDS_CREDIT)) map.removeLayer(CLOUDS_CREDIT);
      cloudLayerRef.current = null;
      return;
    }
    if (!cloudLayerRef.current || !map.getLayer(CLOUDS_LAYER)) {
      cloudLayerRef.current = createCloudLayer(CLOUDS_LAYER);
      map.addLayer(cloudLayerRef.current, 'day-night-fill');
    }
    const clouds = cloudLayerRef.current;
    clouds.setFrame(frameTime());
    // MapLibre credits the sources its visible layers draw from. The clouds
    // come from no source of its own, so an empty one carries NOAA's credit.
    if (!map.getSource(CLOUDS_CREDIT)) map.addSource(CLOUDS_CREDIT, { type: 'geojson', data: EMPTY_FC, attribution: CLOUDS_ATTRIBUTION });
    if (!map.getLayer(CLOUDS_CREDIT)) map.addLayer({ id: CLOUDS_CREDIT, type: 'circle', source: CLOUDS_CREDIT });
    const satellite = map.getLayer('satellite-layer') && map.getLayoutProperty('satellite-layer', 'visibility') !== 'none';
    const firstLabel = map.getStyle().layers.find(layer => layer.type === 'symbol')?.id;
    map.moveLayer(CLOUDS_LAYER, satellite || !firstLabel ? 'day-night-fill' : firstLabel);
    // A new frame lands every hour; move to it once it is up.
    const refresh = setInterval(() => clouds.setFrame(frameTime()), 5 * 60_000);
    return () => clearInterval(refresh);
  }, [mapReady, activeLayers.live_clouds, mapStyle]);

  // NOAA Radar & Lightning — nowCOAST WMS tiles fetched by the map straight
  // from NOAA (see lib/noaa-radar). Same discipline as the clouds: nothing
  // exists until the layer is switched on, switching off frees the tiles,
  // and the pair sits under the night shade, the clouds and every marker.
  // The tile URL carries the frame time, so a refresh is a source swap.
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    const defs = [
      {
        on: !!activeLayers.noaa_radar, source: RADAR_SOURCE, layer: RADAR_LAYER,
        tiles: radarTiles, attribution: RADAR_ATTRIBUTION, opacity: 0.8,
      },
      {
        on: !!activeLayers.lightning, source: LIGHTNING_SOURCE, layer: LIGHTNING_LAYER,
        tiles: lightningTiles, attribution: LIGHTNING_ATTRIBUTION, opacity: 0.85,
      },
    ];
    const apply = () => {
      const frame = radarFrameIso();
      for (const d of defs) {
        if (!d.on) {
          if (map.getLayer(d.layer)) map.removeLayer(d.layer);
          if (map.getSource(d.source)) map.removeSource(d.source);
          continue;
        }
        const tiles = d.tiles(frame);
        const src = map.getSource(d.source) as any;
        if (src && src.tiles?.[0] !== tiles[0]) {
          // New frame: swap the tile URL so the map re-requests fresh tiles.
          if (map.getLayer(d.layer)) map.removeLayer(d.layer);
          map.removeSource(d.source);
        }
        if (!map.getSource(d.source)) {
          map.addSource(d.source, { type: 'raster', tiles, tileSize: 256, attribution: d.attribution });
        }
        if (!map.getLayer(d.layer)) {
          const before = map.getLayer(CLOUDS_LAYER)
            ? CLOUDS_LAYER
            : map.getLayer('day-night-fill')
              ? 'day-night-fill'
              : map.getStyle().layers.find(l => l.type === 'symbol')?.id;
          map.addLayer(
            { id: d.layer, type: 'raster', source: d.source, paint: { 'raster-opacity': d.opacity } },
            before,
          );
        }
      }
    };
    apply();
    if (!defs.some(d => d.on)) return;
    const refresh = setInterval(apply, RADAR_REFRESH_MS);
    return () => clearInterval(refresh);
  }, [mapReady, activeLayers.noaa_radar, activeLayers.lightning, mapStyle]);

  // OSIRIS OI — a prediction drawn as it happens: actors, the events of the
  // simulated worlds and arcs through the sky (see lib/oi/globe). The page feeds it
  // run state directly, so the map does not re-render on every event; the
  // layer re-adds itself after a style change.
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const globe = attachOi(mapRef.current, {
      onSelect: key => onOiSelectRef.current?.(key),
      onHover: hover => onOiHoverRef.current?.(hover),
      onFollowChange: following => onOiFollowRef.current?.(following),
    });
    globe.setColors({ support: paletteRef.current.oiSupport, oppose: paletteRef.current.oiOppose, neutral: paletteRef.current.oiNeutral });
    oiGlobeRef.current = globe;
    onOiGlobeRef.current?.(globe);
    return () => {
      oiGlobeRef.current = null;
      onOiGlobeRef.current?.(null);
      globe.destroy();
    };
  }, [mapReady]);

  // OI Assist's marks: attached once the map is up, fed whatever the assistant marks.
  const highlighterRef = useRef<Highlighter | null>(null);
  const oiHighlightRef = useRef(oiHighlight);
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const h = attachHighlights(mapRef.current);
    h.set(oiHighlightRef.current);
    highlighterRef.current = h;
    return () => { highlighterRef.current = null; h.destroy(); };
  }, [mapReady]);
  useEffect(() => {
    oiHighlightRef.current = oiHighlight;
    highlighterRef.current?.set(oiHighlight);
  }, [oiHighlight]);

  // ── DRAWN POLYGONS ──
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    const currentPolygons = drawnPolygons || [];
    const currentIds = currentPolygons.map(p => p.id);
    
    prevDrawnPolygonsRef.current.forEach(id => {
      if (!currentIds.includes(id)) {
        if (map.getLayer(`drawn-polygon-label-${id}`)) map.removeLayer(`drawn-polygon-label-${id}`);
        if (map.getLayer(`drawn-polygon-line-${id}`)) map.removeLayer(`drawn-polygon-line-${id}`);
        if (map.getLayer(`drawn-polygon-fill-${id}`)) map.removeLayer(`drawn-polygon-fill-${id}`);
        if (map.getSource(`drawn-polygon-${id}-label`)) map.removeSource(`drawn-polygon-${id}-label`);
        if (map.getSource(`drawn-polygon-${id}`)) map.removeSource(`drawn-polygon-${id}`);
      }
    });
    prevDrawnPolygonsRef.current = currentIds;

    currentPolygons.forEach(poly => {
      const sourceId = `drawn-polygon-${poly.id}`;
      const fillLayerId = `drawn-polygon-fill-${poly.id}`;
      const lineLayerId = `drawn-polygon-line-${poly.id}`;
      const labelLayerId = `drawn-polygon-label-${poly.id}`;

      // Build a centroid point feature for the label. A Polygon nests its ring
      // one level deeper than a LineString, so the label of a path would sit at
      // 0,0 if both were read the same way.
      const geom: any = poly.geojson.geometry;
      const ring: number[][] = geom?.type === 'LineString' ? (geom.coordinates || []) : (geom?.coordinates?.[0] || []);
      const centroid = ring.length > 0 ? [
        ring.reduce((s: number, c: number[]) => s + c[0], 0) / ring.length,
        ring.reduce((s: number, c: number[]) => s + c[1], 0) / ring.length,
      ] : [0, 0];
      const labelFC = { type: 'FeatureCollection' as const, features: [{ type: 'Feature' as const, properties: { name: poly.name }, geometry: { type: 'Point' as const, coordinates: centroid } }] };

      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, { type: 'geojson', data: poly.geojson });
      } else {
        (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(poly.geojson);
      }
      if (!map.getSource(`${sourceId}-label`)) {
        map.addSource(`${sourceId}-label`, { type: 'geojson', data: labelFC as any });
      } else {
        (map.getSource(`${sourceId}-label`) as maplibregl.GeoJSONSource).setData(labelFC as any);
      }

      if (!map.getLayer(fillLayerId)) {
        map.addLayer({ id: fillLayerId, type: 'fill', source: sourceId, filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'fill-color': poly.color, 'fill-opacity': 0.12 } });
      }
      if (!map.getLayer(lineLayerId)) {
        map.addLayer({ id: lineLayerId, type: 'line', source: sourceId, paint: { 'line-color': poly.color, 'line-width': 2.5, 'line-dasharray': [6, 3] } });
      }
      if (!map.getLayer(labelLayerId)) {
        map.addLayer({ id: labelLayerId, type: 'symbol', source: `${sourceId}-label`, layout: { 'text-field': ['get', 'name'], 'text-size': 11, 'text-allow-overlap': true, 'text-ignore-placement': true }, paint: { 'text-color': poly.color, 'text-halo-color': '#000000', 'text-halo-width': 2 } });
      }
    });
  }, [mapReady, drawnPolygons]);

  // ── DIRECTIONS ROUTE ──
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;

    const SRC = 'directions-route';
    const SRC_ALT = 'directions-alternates';
    const SRC_ACTIVE = 'directions-active-step';
    const SRC_ENDS = 'directions-endpoints';
    const IDS = [
      'directions-alt-line', 'directions-line-casing', 'directions-line',
      'directions-active-line', 'directions-endpoint-halo', 'directions-endpoint',
    ];

    const teardown = () => {
      IDS.forEach(id => { if (map.getLayer(id)) map.removeLayer(id); });
      [SRC, SRC_ALT, SRC_ACTIVE, SRC_ENDS].forEach(id => { if (map.getSource(id)) map.removeSource(id); });
    };

    if (!route?.geometry?.coordinates?.length) { teardown(); return; }

    const fc = (features: GeoJSON.Feature[]) => ({ type: 'FeatureCollection' as const, features });
    const line = (coords: [number, number][]): GeoJSON.Feature => ({
      type: 'Feature', properties: {},
      geometry: { type: 'LineString', coordinates: coords },
    });
    const setData = (id: string, data: unknown) => {
      if (!map.getSource(id)) map.addSource(id, { type: 'geojson', data: data as never });
      else (map.getSource(id) as maplibregl.GeoJSONSource).setData(data as never);
    };

    setData(SRC, fc([line(route.geometry.coordinates)]));
    setData(SRC_ALT, fc((route.alternates || []).map(a => line(a.coordinates))));
    setData(SRC_ACTIVE, fc(route.activeSegment?.length ? [line(route.activeSegment)] : []));
    setData(SRC_ENDS, fc([
      { type: 'Feature', properties: { kind: 'origin' }, geometry: { type: 'Point', coordinates: [route.from.lng, route.from.lat] } },
      { type: 'Feature', properties: { kind: 'destination' }, geometry: { type: 'Point', coordinates: [route.to.lng, route.to.lat] } },
    ]));

    // Alternatives sit underneath, muted, so the chosen line stays unambiguous.
    if (!map.getLayer('directions-alt-line')) {
      map.addLayer({
        id: 'directions-alt-line', type: 'line', source: SRC_ALT,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#5C6470',
          'line-width': ['interpolate', ['linear'], ['zoom'], 5, 2.5, 14, 5],
          'line-opacity': 0.55,
        },
      });
    }
    if (!map.getLayer('directions-line-casing')) {
      map.addLayer({
        id: 'directions-line-casing', type: 'line', source: SRC,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#001014', 'line-width': ['interpolate', ['linear'], ['zoom'], 5, 5, 14, 11], 'line-opacity': 0.9 },
      });
    }
    if (!map.getLayer('directions-line')) {
      map.addLayer({
        id: 'directions-line', type: 'line', source: SRC,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#00E5FF',
          'line-width': ['interpolate', ['linear'], ['zoom'], 5, 2.5, 14, 6],
          'line-opacity': 0.95,
        },
      });
    }
    if (!map.getLayer('directions-active-line')) {
      map.addLayer({
        id: 'directions-active-line', type: 'line', source: SRC_ACTIVE,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#D4AF37',
          'line-width': ['interpolate', ['linear'], ['zoom'], 5, 4, 14, 9],
          'line-opacity': 0.95,
        },
      });
    }
    if (!map.getLayer('directions-endpoint-halo')) {
      map.addLayer({
        id: 'directions-endpoint-halo', type: 'circle', source: SRC_ENDS,
        paint: {
          'circle-radius': 9,
          'circle-color': ['match', ['get', 'kind'], 'origin', '#00FF88', '#FF3B30'],
          'circle-opacity': 0.18,
        },
      });
    }
    if (!map.getLayer('directions-endpoint')) {
      map.addLayer({
        id: 'directions-endpoint', type: 'circle', source: SRC_ENDS,
        paint: {
          'circle-radius': 5,
          'circle-color': ['match', ['get', 'kind'], 'origin', '#00FF88', '#FF3B30'],
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#001014',
        },
      });
    }
  }, [mapReady, route]);

  // ── ROUTE FRAMING ──
  // Kept apart from drawing so picking a step or an alternative redraws without
  // yanking the camera back out to the whole route.
  const routeFrameKey = route
    ? `${route.from.lat},${route.from.lng},${route.to.lat},${route.to.lng},${route.geometry.coordinates.length}`
    : null;
  useEffect(() => {
    if (!mapReady || !mapRef.current || !route?.geometry?.coordinates?.length) return;
    const coords = route.geometry.coordinates;
    let [west, south, east, north] = [coords[0][0], coords[0][1], coords[0][0], coords[0][1]];
    for (const [lng, lat] of coords) {
      if (lng < west) west = lng;
      if (lng > east) east = lng;
      if (lat < south) south = lat;
      if (lat > north) north = lat;
    }
    mapRef.current.fitBounds([[west, south], [east, north]], { padding: 90, duration: 900, maxZoom: 15 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, routeFrameKey]);

  // ── LIVE USER LOCATION ──
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;

    const SRC = 'user-location';
    const SRC_ACC = 'user-location-accuracy';
    const IDS = ['user-accuracy-fill', 'user-accuracy-line', 'user-dot-pulse', 'user-dot', 'user-dot-core'];

    if (!userLocation) {
      IDS.forEach(id => { if (map.getLayer(id)) map.removeLayer(id); });
      [SRC, SRC_ACC].forEach(id => { if (map.getSource(id)) map.removeSource(id); });
      return;
    }

    const { lat, lng, accuracy } = userLocation;

    // Accuracy is a real-world radius, so it must be a polygon in degrees
    // rather than a fixed pixel circle — it has to shrink as you zoom out.
    const ring: [number, number][] = [];
    const r = Math.min(Math.max(accuracy ?? 0, 0), 5000);
    if (r > 0) {
      const dLat = r / 111320;
      const dLng = r / (111320 * Math.cos((lat * Math.PI) / 180) || 1);
      for (let i = 0; i <= 64; i++) {
        const t = (i / 64) * 2 * Math.PI;
        ring.push([lng + dLng * Math.cos(t), lat + dLat * Math.sin(t)]);
      }
    }

    const point = {
      type: 'FeatureCollection',
      features: [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [lng, lat] } }],
    };
    const accFc = {
      type: 'FeatureCollection',
      features: ring.length
        ? [{ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring] } }]
        : [],
    };

    if (!map.getSource(SRC)) map.addSource(SRC, { type: 'geojson', data: point as never });
    else (map.getSource(SRC) as maplibregl.GeoJSONSource).setData(point as never);
    if (!map.getSource(SRC_ACC)) map.addSource(SRC_ACC, { type: 'geojson', data: accFc as never });
    else (map.getSource(SRC_ACC) as maplibregl.GeoJSONSource).setData(accFc as never);

    if (!map.getLayer('user-accuracy-fill')) {
      map.addLayer({ id: 'user-accuracy-fill', type: 'fill', source: SRC_ACC, paint: { 'fill-color': '#4285F4', 'fill-opacity': 0.12 } });
    }
    if (!map.getLayer('user-accuracy-line')) {
      map.addLayer({ id: 'user-accuracy-line', type: 'line', source: SRC_ACC, paint: { 'line-color': '#4285F4', 'line-width': 1, 'line-opacity': 0.35 } });
    }
    if (!map.getLayer('user-dot-pulse')) {
      map.addLayer({ id: 'user-dot-pulse', type: 'circle', source: SRC, paint: { 'circle-radius': 8, 'circle-color': '#4285F4', 'circle-opacity': 0.35 } });
    }
    if (!map.getLayer('user-dot')) {
      map.addLayer({ id: 'user-dot', type: 'circle', source: SRC, paint: { 'circle-radius': 7, 'circle-color': '#FFFFFF' } });
    }
    if (!map.getLayer('user-dot-core')) {
      map.addLayer({ id: 'user-dot-core', type: 'circle', source: SRC, paint: { 'circle-radius': 5, 'circle-color': '#4285F4' } });
    }
  }, [mapReady, userLocation]);

  // Pulse the halo. rAF-driven, so it stops when the tab is backgrounded.
  useEffect(() => {
    if (!mapReady || !mapRef.current || !userLocation) return;
    const map = mapRef.current;
    let raf = 0;
    const started = performance.now();
    const tick = (now: number) => {
      if (map.getLayer('user-dot-pulse')) {
        const t = ((now - started) % 2000) / 2000;
        map.setPaintProperty('user-dot-pulse', 'circle-radius', 8 + t * 22);
        map.setPaintProperty('user-dot-pulse', 'circle-opacity', 0.35 * (1 - t));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [mapReady, userLocation]);

  // ── FOLLOW MODE ──
  useEffect(() => {
    if (!mapReady || !mapRef.current || !followUser) return;
    const map = mapRef.current;
    // originalEvent is only set when a real input device drove the change, so
    // the easeTo below cannot trip this and cancel its own follow.
    const onGesture = (e: any) => { if (e?.originalEvent) onFollowInterrupt?.(); };
    map.on('dragstart', onGesture);
    map.on('zoomstart', onGesture);
    map.on('rotatestart', onGesture);
    map.on('pitchstart', onGesture);
    return () => {
      map.off('dragstart', onGesture);
      map.off('zoomstart', onGesture);
      map.off('rotatestart', onGesture);
      map.off('pitchstart', onGesture);
    };
  }, [mapReady, followUser, onFollowInterrupt]);

  // Recentering runs on every position fix, so without the handover above the
  // map fights the operator: zoom out to look ahead and the next GPS tick drags
  // the camera back to 16.5. Follow itself is unchanged and resumes on recenter.
  useEffect(() => {
    if (!mapReady || !mapRef.current || !followUser || !userLocation) return;
    // While navigating, sit close in and rotate the map so travel direction is
    // "up" — reading a turn off a north-locked map at speed does not work.
    mapRef.current.easeTo({
      center: [userLocation.lng, userLocation.lat],
      ...(navigating
        ? {
            zoom: Math.max(mapRef.current.getZoom(), 16.5),
            pitch: 50,
            ...(typeof userLocation.heading === 'number' && !Number.isNaN(userLocation.heading)
              ? { bearing: userLocation.heading }
              : {}),
          }
        : {}),
      duration: 700,
    });
  }, [mapReady, followUser, userLocation, navigating]);

  // Restore the selected view only when guidance ends, not on first map load.
  useEffect(() => {
    const ended = wasNavigating.current && !navigating;
    wasNavigating.current = navigating;
    if (!mapReady || !mapRef.current || !ended) return;
    const map = mapRef.current;
    const pitch = projection === 'mercator' ? 0 : activeLayers.terrain_3d ? 50 : terrainEnabled && map.getZoom() >= 10 ? 45 : 20;
    map.easeTo({ pitch, bearing: 0, duration: 600 });
  }, [mapReady, navigating, projection, terrainEnabled, activeLayers.terrain_3d]);

  // ── AIRPORTS FOR WATCHED AIRCRAFT ──
  // The endpoints that survived corroboration against the aircraft's reported
  // track — where the leg began and where it is booked to end.
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    const SRC = 'watched-airports';
    const IDS = ['watched-airport-glow', 'watched-airport-dot', 'watched-airport-label'];

    // The same airport can serve several watched aircraft — draw it once.
    const seen = new Set<string>();
    const features = Object.values(aircraftAirports).flat()
      .filter((a) => {
        if (!a || seen.has(a.icao)) return false;
        seen.add(a.icao);
        return true;
      })
      .map((a) => ({
        type: 'Feature' as const,
        properties: { label: a.iata || a.icao, city: a.city || '' },
        geometry: { type: 'Point' as const, coordinates: [a.lng, a.lat] },
      }));

    if (features.length === 0) {
      IDS.forEach((id) => { if (map.getLayer(id)) map.removeLayer(id); });
      if (map.getSource(SRC)) map.removeSource(SRC);
      return;
    }

    const fc = { type: 'FeatureCollection' as const, features };
    if (!map.getSource(SRC)) map.addSource(SRC, { type: 'geojson', data: fc as never });
    else (map.getSource(SRC) as maplibregl.GeoJSONSource).setData(fc as never);

    if (!map.getLayer('watched-airport-glow')) {
      map.addLayer({
        id: 'watched-airport-glow', type: 'circle', source: SRC,
        paint: { 'circle-radius': 13, 'circle-color': '#FFB300', 'circle-opacity': 0.16, 'circle-blur': 0.8 },
      });
    }
    if (!map.getLayer('watched-airport-dot')) {
      map.addLayer({
        id: 'watched-airport-dot', type: 'circle', source: SRC,
        paint: {
          'circle-radius': 5,
          'circle-color': '#FFFFFF',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#FFB300',
        },
      });
    }
    if (!map.getLayer('watched-airport-label')) {
      map.addLayer({
        id: 'watched-airport-label', type: 'symbol', source: SRC,
        layout: {
          'text-field': ['get', 'label'],
          'text-size': 11,
          'text-font': ['Open Sans Bold'],
          'text-offset': [0, 1.6],
          'text-allow-overlap': true,
        },
        paint: { 'text-color': '#FFB300', 'text-halo-color': '#0C0E1A', 'text-halo-width': 1.5 },
      });
    }
  }, [mapReady, aircraftAirports]);

  // ── ARCGIS LAYERS ──
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    const currentLayers = arcgisLayers || [];
    const currentIds = currentLayers.map(l => l.id);

    prevArcgisLayersRef.current.forEach(id => {
      if (!currentIds.includes(id)) {
        const sourceId = `arcgis-${id}`;
        if (map.getLayer(`${sourceId}-fill`)) map.removeLayer(`${sourceId}-fill`);
        if (map.getLayer(`${sourceId}-line`)) map.removeLayer(`${sourceId}-line`);
        if (map.getLayer(`${sourceId}-circle`)) map.removeLayer(`${sourceId}-circle`);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      }
    });
    prevArcgisLayersRef.current = currentIds;

    currentLayers.forEach(layer => {
      const sourceId = `arcgis-${layer.id}`;
      const c = layer.color || '#D4AF37';
      const o = layer.opacity ?? 0.8;
      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, { type: 'geojson', data: layer.geojson });
        // A fill layer with no geometry filter is applied to LineStrings too,
        // and maplibre fills an open path by closing it — which is what draws
        // the triangular wedges across a pipeline or railway dataset. Fill is
        // only ever meaningful for polygons.
        map.addLayer({ id: `${sourceId}-fill`, type: 'fill', source: sourceId, filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'fill-color': c, 'fill-opacity': o * 0.15, 'fill-outline-color': c } });
        map.addLayer({ id: `${sourceId}-line`, type: 'line', source: sourceId, filter: ['match', ['geometry-type'], ['LineString', 'Polygon'], true, false], paint: { 'line-color': c, 'line-width': ['interpolate', ['linear'], ['zoom'], 4, 0.6, 10, 1.4, 14, 2, 18, 3], 'line-opacity': o } });
        // A fixed radius does not survive a dense dataset: ~1.2k points at
        // city zoom merge into one blob. Scaling with zoom keeps them as
        // discrete stations when you are far out, and readable up close.
        map.addLayer({ id: `${sourceId}-circle`, type: 'circle', source: sourceId, filter: ['==', ['geometry-type'], 'Point'], paint: { 'circle-color': c, 'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 1.5, 8, 2.5, 11, 4, 14, 6, 18, 9], 'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 8, 0.4, 14, 1.2], 'circle-stroke-color': '#000', 'circle-opacity': ['interpolate', ['linear'], ['zoom'], 6, 0.55, 12, 0.85] } });
      } else {
        (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(layer.geojson);
        // Update paint properties for color/opacity changes
        if (map.getLayer(`${sourceId}-fill`)) {
          map.setPaintProperty(`${sourceId}-fill`, 'fill-color', c);
          map.setPaintProperty(`${sourceId}-fill`, 'fill-opacity', o * 0.15);
          map.setPaintProperty(`${sourceId}-fill`, 'fill-outline-color', c);
        }
        if (map.getLayer(`${sourceId}-line`)) {
          map.setPaintProperty(`${sourceId}-line`, 'line-color', c);
          map.setPaintProperty(`${sourceId}-line`, 'line-opacity', o);
        }
        if (map.getLayer(`${sourceId}-circle`)) {
          map.setPaintProperty(`${sourceId}-circle`, 'circle-color', c);
          map.setPaintProperty(`${sourceId}-circle`, 'circle-opacity', o);
        }
      }
    });
  }, [mapReady, arcgisLayers]);

  const drawCbRef = useRef({ onDrawComplete, onDrawProgress, onDrawCancel });
  /** Set by the drawing effect so on-screen buttons can dispatch into it. */
  const drawApplyRef = useRef<((a: DrawAction) => void) | null>(null);
  drawCbRef.current = { onDrawComplete, onDrawProgress, onDrawCancel };

  // ── DRAWING MODE ──
  // A four-mode state machine over one set of map handlers.
  //
  // Every mode collects points; what differs is how many are needed and what
  // geometry they produce. Rectangle and circle are two-click shapes, so the
  // cursor stands in for their second point until it is committed — which is
  // what makes the preview and the final shape come from the same code path
  // instead of two that can disagree.
  //
  // Escape cancels, Backspace removes the last vertex, Enter or a double click
  // finishes. Drawing without an undo is the difference between a tool and a
  // demo: a misplaced vertex twenty clicks in should not cost the whole shape.
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;

    const SRC = 'draw-temp-source';
    const IDS = ['draw-fill-temp', 'draw-line-temp', 'draw-points-temp'];

    const teardown = () => {
      IDS.forEach(id => { if (map.getLayer(id)) map.removeLayer(id); });
      if (map.getSource(SRC)) map.removeSource(SRC);
      drawingCoordsRef.current = [];
      map.getCanvas().style.cursor = '';
      map.doubleClickZoom.enable();
    };

    if (!drawMode) {
      teardown();
      drawCbRef.current.onDrawProgress?.(null);
      return;
    }

    map.doubleClickZoom.disable();
    map.getCanvas().style.cursor = 'crosshair';
    drawingCoordsRef.current = [];

    if (!map.getSource(SRC)) {
      map.addSource(SRC, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: 'draw-fill-temp', type: 'fill', source: SRC,
        filter: ['==', ['geometry-type'], 'Polygon'],
        paint: { 'fill-color': '#00E5FF', 'fill-opacity': 0.12 },
      });
      map.addLayer({
        id: 'draw-line-temp', type: 'line', source: SRC,
        filter: ['match', ['geometry-type'], ['LineString', 'Polygon'], true, false],
        paint: { 'line-color': '#00E5FF', 'line-width': 2, 'line-dasharray': [3, 2] },
      });
      map.addLayer({
        id: 'draw-points-temp', type: 'circle', source: SRC,
        filter: ['==', ['geometry-type'], 'MultiPoint'],
        paint: { 'circle-color': '#00E5FF', 'circle-radius': 4, 'circle-stroke-width': 1.5, 'circle-stroke-color': '#04040A' },
      });
    }

    // Declared before paint(), which closes over it. Leaving it below would
    // work only while no call happens in between — a temporal-dead-zone crash
    // waiting for someone to add one.
    let state: DrawState = initialDrawState(drawMode);

    /** Redraw the preview from committed points plus an optional cursor point. */
    const paint = (cursor?: [number, number]) => {
      const committed = state.points;
      const pts = cursor ? [...committed, cursor] : committed;
      const src = map.getSource(SRC) as maplibregl.GeoJSONSource;
      if (!src) return;

      drawCbRef.current.onDrawProgress?.(pts.length ? measure(drawMode, pts) : null);

      if (pts.length === 0) {
        src.setData({ type: 'FeatureCollection', features: [] });
        return;
      }

      const features: any[] = [
        { type: 'Feature', properties: {}, geometry: { type: 'MultiPoint', coordinates: committed } },
      ];

      const geom = buildGeometry(drawMode, pts);
      if (drawMode === 'line') {
        if (pts.length > 1) {
          features.push({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: geom } });
        }
      } else if (geom.length >= 3) {
        // Show the enclosed area as it will be, not just its outline.
        features.push({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [closeRing(geom)] } });
      } else if (geom.length === 2) {
        features.push({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: geom } });
      }

      src.setData({ type: 'FeatureCollection', features });
    };

    // The interaction lives in drawReducer, which is unit tested. This is the
    // adapter: map events in, reducer out, preview repainted.
    const apply = (action: DrawAction) => {
      const t = drawReducer(state, action);
      state = t.state;
      drawingCoordsRef.current = state.points;
      if (t.result) drawCbRef.current.onDrawComplete?.(t.result);
      if (t.cancelled) drawCbRef.current.onDrawCancel?.();
      paint();
    };

    let dblGuard = false;

    const onClick = (e: any) => {
      if (dblGuard) return;
      apply({ type: 'click', at: [e.lngLat.lng, e.lngLat.lat] });
    };

    const onMove = (e: any) => {
      if (state.points.length === 0) return;
      paint([e.lngLat.lng, e.lngLat.lat]);
    };

    const onDblClick = (e: any) => {
      e.preventDefault();
      dblGuard = true;
      setTimeout(() => { dblGuard = false; }, 300);
      apply({ type: 'dblclick' });
    };

    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') { ev.preventDefault(); apply({ type: 'cancel' }); }
      else if (ev.key === 'Backspace' || ev.key === 'Delete') { ev.preventDefault(); apply({ type: 'undo' }); }
      else if (ev.key === 'Enter') { ev.preventDefault(); apply({ type: 'finish' }); }
    };
    drawApplyRef.current = apply;

    map.on('click', onClick);
    map.on('mousemove', onMove);
    map.on('dblclick', onDblClick);
    window.addEventListener('keydown', onKey);

    return () => {
      map.off('click', onClick);
      map.off('mousemove', onMove);
      map.off('dblclick', onDblClick);
      window.removeEventListener('keydown', onKey);
      drawApplyRef.current = null;
      teardown();
    };
  }, [mapReady, drawMode]);

  // Buttons dispatch into the same reducer the map events use, so a shape
  // finished by clicking "Finish" is identical to one finished by Enter.
  const lastCmdSeq = useRef(-1);
  useEffect(() => {
    if (!drawCommand || drawCommand.seq === lastCmdSeq.current) return;
    lastCmdSeq.current = drawCommand.seq;
    drawApplyRef.current?.({ type: drawCommand.action } as DrawAction);
  }, [drawCommand]);

  // ── MAP CENTER REPORTING ──
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;

    const reportCenter = () => {
      const c = map.getCenter();
      const b = map.getBounds();
      onMapCenter?.({
        lat: c.lat,
        lng: c.lng,
        bounds: b ? { west: b.getWest(), south: b.getSouth(), east: b.getEast(), north: b.getNorth() } : undefined,
      });
    };

    // Fire immediately so panels get initial coordinates
    reportCenter();

    map.on('moveend', reportCenter);
    return () => { map.off('moveend', reportCenter); };
  }, [mapReady, onMapCenter]);

  // Escape clears the selection, the way it cancels a draw — an overlay that
  // can only be dismissed by hitting a 14px target is one that stays open.
  useEffect(() => {
    if (!selectedSat) return;
    const onKey = (ev: KeyboardEvent) => { if (ev.key === 'Escape') clearSat(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedSat, clearSat]);

  // Zooming past the ceiling takes the satellites off the map, so a readout
  // left over from before the zoom would be describing something no longer
  // there — and its ring and orbit are already gone.
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || !selectedSat) return;
    const onZoom = () => { if (map.getZoom() > SAT_MAX_ZOOM) clearSat(); };
    onZoom();
    map.on('zoomend', onZoom);
    return () => { map.off('zoomend', onZoom); };
  }, [mapReady, selectedSat, clearSat]);

  return (
    <>
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />
      {mapReady && mapRef.current && (
        <CctvPreviews
          mapRef={mapRef}
          active={!!activeLayers.cctv && !!activeLayers.cctv_previews}
          onOpen={(cam: PreviewCamera) => onEntityClick?.({ type: 'cctv', ...cam })}
        />
      )}
      {mapReady && (
        <LiveNewsPreviews
          mapRef={mapRef}
          active={!!activeLayers.live_news}
          feeds={data.live_feeds}
          onOpen={(feed: PreviewFeed) => onEntityClick?.({
            type: 'live_news',
            name: feed.name,
            city: feed.city,
            country: feed.country,
            url: feed.url,
            category: feed.category,
            embed_allowed: true,
          })}
        />
      )}
      {selectedSat && <SatelliteCard sat={selectedSat} onClose={clearSat} />}
      {mapReady && <MapControls mapRef={mapRef} onInteract={onFollowInterrupt} basemapMode={basemapMode} onBasemapModeChange={onBasemapModeChange} satelliteOn={satelliteOn} onSatelliteToggle={onSatelliteToggle} />}
      {mapReady && satelliteOn && onSatelliteSelectionChange && (
        <SatelliteTimeSlider selection={satelliteSelection} onSelectionChange={onSatelliteSelectionChange} />
      )}
      {mapReady && <CinematicDirector mapRef={mapRef} cameras={(data as any)?.cameras ?? []} followTarget={selectedFlight} extraPresets={DIRECTOR_PRESETS} spaceTarget={(() => {
        if (!launchData) return null;
        const sel = [...launchData.upcoming, ...launchData.previous].find((l) => l.id === selectedLaunchId);
        const cand = sel ?? nextLaunch(launchData.upcoming, Date.now());
        return cand && cand.padLat !== null && cand.padLon !== null
          ? { name: cand.missionName ?? cand.name, padName: cand.padName, lat: cand.padLat, lon: cand.padLon }
          : null;
      })()} />}
      {mapReady && !!(activeLayers as any).space_missions && (
        <SpaceMissionsPanel
          mapRef={mapRef}
          setGeo={setGeo}
          upcoming={launchData?.upcoming ?? []}
          previous={launchData?.previous ?? []}
          stale={!!launchData?.stale}
          loadError={!!launchData?.error}
          selectedPadKey={selectedPadKey}
          selectedLaunchId={selectedLaunchId}
          onSelectPad={setSelectedPadKey}
          onSelectLaunch={setSelectedLaunchId}
          chipOffsetCount={[trafficChip, transitNotice, streetLevelChip].filter(Boolean).length}
        />
      )}
      {mapReady && transitSel && (
        <TransitSelectionCard
          sel={transitSel}
          onClose={() => setTransitSel(null)}
          onViewRoute={(agencyId, routeShort) => {
            setTransitSel(null);
            openTransitExplorer({ agencyId, routeShort, tab: 'routes' });
          }}
          onFollowVehicle={(selv) => {
            setTransitSel(null);
            startTransitFollow({
              agencyId: selv.agencyId,
              vehId: String(selv.p.vehId ?? ''),
              route: String(selv.p.route ?? ''),
              label: selv.p.label ? String(selv.p.label) : undefined,
            });
            const m = mapRef.current;
            if (m) m.flyTo({ center: selv.coords, zoom: Math.max(m.getZoom(), 14), essential: true });
          }}
          onOpenExplorer={(agencyId) => {
            setTransitSel(null);
            openTransitExplorer({ agencyId });
          }}
        />
      )}
      {transitExplorer && (
        <TransitExplorer
          key={transitExplorer.seq}
          init={transitExplorer.init}
          alertsEnabled={transitSubOn(activeLayers, TRANSIT_SUB.alerts)}
          onSelectRoute={setTransitRouteSel}
          onClose={() => setTransitExplorer(null)}
          onViewRouteOnMap={(agencyId, routeInternalId) => {
            setTransitRouteSel(routeInternalId);
            setTransitExplorer(null);
            // Frame the route's real geometry when the network is on
            // hand; the highlight applies either way once it loads.
            const m = mapRef.current;
            const entry = transitNetworkRef.current.get(agencyId);
            if (m && entry) {
              const feats = (entry.lines?.features ?? []).filter((f: any) => f.properties?.routeId === routeInternalId);
              let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
              const walk = (c: any) => {
                if (typeof c[0] === 'number') {
                  w = Math.min(w, c[0]); e = Math.max(e, c[0]); s = Math.min(s, c[1]); n = Math.max(n, c[1]);
                } else c.forEach(walk);
              };
              feats.forEach((f: any) => walk(f.geometry?.coordinates ?? []));
              if (w <= e) m.fitBounds([[w, s], [e, n]], { padding: 48, maxZoom: 13.5, essential: true });
            }
          }}
          onFollowVehicle={(v) => {
            setTransitExplorer(null);
            startTransitFollow(v);
          }}
          onFocusStop={(agencyId, stop) => {
            setTransitExplorer(null);
            const m = mapRef.current;
            if (m) m.flyTo({ center: [stop.lng, stop.lat], zoom: Math.max(m.getZoom(), 15.5), essential: true });
            window.setTimeout(() => {
              setTransitSel({
                kind: 'stop', agencyId, coords: [stop.lng, stop.lat],
                p: { agency: agencyId, stopId: stop.id, name: stop.name, routes: stop.routes.join(' · ') },
              });
            }, 900);
          }}
        />
      )}
      {mapReady && transitFollowUi && (
        <div className="absolute left-1/2 z-[240] -translate-x-1/2 px-3" style={{ bottom: '6rem' }}>
          <div className="flex items-center gap-2 rounded-full border border-cyan-300/40 bg-black/75 backdrop-blur-md pl-3 pr-1.5 py-1.5 shadow-xl">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="text-[9px] font-mono tracking-[0.14em] text-white/85 whitespace-nowrap">FOLLOWING {transitFollowUi.label}</span>
            <button
              type="button"
              onClick={() => endTransitFollow()}
              className="shrink-0 px-2 py-1 rounded-full border border-white/15 text-[8.5px] font-mono tracking-wider text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              ✕ RELEASE
            </button>
          </div>
        </div>
      )}
      {transitFollowNotice && (
        <div className="absolute left-1/2 z-[130] -translate-x-1/2 px-3 pointer-events-none" style={{ bottom: '10.5rem' }}>
          <div className="rounded-lg border border-amber-300/25 bg-black/70 backdrop-blur-md px-3 py-2 shadow-xl">
            <p className="text-[11px] font-mono leading-relaxed text-white/60 whitespace-nowrap max-w-[92vw] overflow-hidden text-ellipsis">
              <span className="text-white/90 uppercase tracking-wider">Transit Follow</span>
              {' — '}
              <span className="text-amber-200/90">{transitFollowNotice}</span>
            </p>
          </div>
        </div>
      )}
      {mapReady && streetPicture && (
        <StreetLevelViewer
          picture={streetPicture}
          loading={streetPictureLoading}
          onClose={() => setStreetPicture(null)}
          onNavigate={navigateStreetPicture}
        />
      )}
      {mapReady && flightFollowUi?.mode === 'forward' && (
        <FlightCockpitOverlay hudRef={flightFollowHudRef} target={flightFollowUi} />
      )}
      {mapReady && flightFollowUi && (
        <div
          className="absolute left-1/2 z-[240] -translate-x-1/2 px-3"
          style={{ bottom: `${6 + [trafficChip, transitNotice, streetLevelChip].filter(Boolean).length * 4.5}rem` }}
        >
          <FlightFollowHud
            hudRef={flightFollowHudRef}
            target={flightFollowUi}
            mode={flightFollowUi.mode}
            onModeChange={setFlightFollowMode}
            onExit={() => endFlightFollow({ restore: true })}
            path={flightPathUi}
          />
        </div>
      )}
      {flightFollowNotice && (
        <div
          className="absolute left-1/2 z-[130] -translate-x-1/2 px-3 pointer-events-none"
          style={{ bottom: `${(flightFollowUi ? 17 : 6) + [trafficChip, transitNotice, streetLevelChip].filter(Boolean).length * 4.5}rem` }}
        >
          <div className="rounded-lg border border-amber-300/25 bg-black/70 backdrop-blur-md px-3 py-2 shadow-xl">
            <p className="text-[11px] font-mono leading-relaxed text-white/60 whitespace-nowrap max-w-[92vw] overflow-hidden text-ellipsis">
              <span className="text-white/90 uppercase tracking-wider">Flight Follow</span>
              {' — '}
              <span className="text-amber-200/90">{flightFollowNotice}</span>
            </p>
          </div>
        </div>
      )}
      {streetLevelChip && (
        <div
          className="absolute left-1/2 z-[120] -translate-x-1/2 px-3 pointer-events-none"
          style={{ bottom: `${6 + [trafficChip, transitNotice].filter(Boolean).length * 4.5}rem` }}
        >
          <div className="rounded-lg border border-white/10 bg-black/70 backdrop-blur-md px-3 py-2 shadow-xl">
            <p className="text-[11px] font-mono leading-relaxed text-white/60 whitespace-nowrap max-w-[92vw] overflow-hidden text-ellipsis">
              <span className="text-white/90 uppercase tracking-wider">Street Level</span>
              {' — '}
              <span className="text-white/80">{streetLevelChip}</span>
            </p>
          </div>
        </div>
      )}
      {trafficChip && (
        <div
          className="absolute left-1/2 z-[120] -translate-x-1/2 px-3 pointer-events-none"
          style={{ bottom: transitNotice ? '10.5rem' : '6rem' }}
        >
          <div className="rounded-lg border border-white/10 bg-black/70 backdrop-blur-md px-3 py-2 shadow-xl">
            <p className="text-[11px] font-mono leading-relaxed text-white/60 whitespace-nowrap max-w-[92vw] overflow-hidden text-ellipsis">
              <span className="text-white/90 uppercase tracking-wider">Traffic</span>
              {' — '}
              <span className="text-white/80">{trafficChip}</span>
            </p>
          </div>
        </div>
      )}
      {sensorEffect?.mode === 'thermal' && !sensorRefused && (
        <svg aria-hidden="true" style={{ position: 'absolute', width: 0, height: 0 }}>
          <defs>
            <filter id={THERMAL_FILTER_ID} x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
              <feColorMatrix type="matrix" values="0.3333 0.3333 0.3333 0 0 0.3333 0.3333 0.3333 0 0 0.3333 0.3333 0.3333 0 0 0 0 0 1 0" />
              <feComponentTransfer>
                <feFuncR type="discrete" tableValues={thermalTables.r} />
                <feFuncG type="discrete" tableValues={thermalTables.g} />
                <feFuncB type="discrete" tableValues={thermalTables.b} />
                <feFuncA type="identity" />
              </feComponentTransfer>
            </filter>
          </defs>
        </svg>
      )}
      {sensorChipText && (
        <div
          className="absolute left-1/2 z-[120] -translate-x-1/2 px-3 pointer-events-none"
          style={{ bottom: `${6 + [trafficChip, transitNotice, streetLevelChip].filter(Boolean).length * 4.5}rem` }}
        >
          <div className="pointer-events-auto flex items-start gap-2 rounded-lg border border-white/10 bg-black/70 backdrop-blur-md px-3 py-2 shadow-xl">
            <p className="text-[11px] font-mono leading-relaxed text-white/60 whitespace-nowrap max-w-[92vw] overflow-hidden text-ellipsis">
              <span className="text-white/90 uppercase tracking-wider">Sensor Effect</span>
              {' — '}
              <span className="text-white/80">{sensorChipText}</span>
            </p>
            {onSensorEffectChange && !sensorRefused && (
              <button
                type="button"
                aria-label="Turn sensor effect off"
                onClick={() => onSensorEffectChange({ mode: 'off', intensity: sensorEffect?.intensity ?? 1 })}
                className="shrink-0 w-5 h-5 rounded flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors text-sm leading-none"
              >
                ×
              </button>
            )}
          </div>
        </div>
      )}
      {transitNotice && (
        <div className="absolute left-1/2 bottom-24 z-[120] -translate-x-1/2 px-3 pointer-events-none">
          <div className="pointer-events-auto flex items-start gap-2 max-w-md rounded-lg border border-white/10 bg-black/70 backdrop-blur-md px-3 py-2 shadow-xl">
            <p className="text-[11px] font-mono leading-relaxed text-white/60">
              <span className="text-white/90 uppercase tracking-wider">Live Transit</span>
              {' — no coverage in this area yet. Covered: '}
              <span className="text-white/80">{transitNotice}</span>
            </p>
            <button
              type="button"
              aria-label="Dismiss transit coverage notice"
              onClick={() => { transitNoticeDismissedRef.current = true; setTransitNotice(null); }}
              className="shrink-0 w-5 h-5 rounded flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors text-sm leading-none"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default memo(OsirisMap);

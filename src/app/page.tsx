'use client';

import { useEffect, useLayoutEffect, useState, useRef, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, Newspaper, Search, X, Route, Radar, ExternalLink, AlertTriangle, Activity, Database, Wifi, Play, Network, Crosshair, Bluetooth, Pentagon, Radio , PenLine, Orbit } from 'lucide-react';
import { type TerrainStatus } from '@/lib/map-terrain';
import { fetchCameraById, loadCameraCatalog, mergeCameraCatalog, type CameraCatalogHandle } from '@/lib/camera-catalog';
import { applyFlightsDelta, type FlightsDelta, type FlightsPayloadLike } from '@/lib/flights/delta';
import { getCameraClickCount, recordCameraClick } from '@/lib/cameraGate';
import {
  checkPremiumEntitlement,
  applyAmbientEntitlement,
  shouldRecheckEntitlement,
  blockedCameraAction,
  readSessionIdentity,
  type SessionIdentity,
} from '@/lib/premium-entitlement';
import {
  browserLadderStorage,
  browserSessionStorage,
  ladderPromptFor,
  markEmailUnlocked,
  readLadderRecord,
  readSessionFlag,
  shareAwayShouldShow,
  writeSessionFlag,
  SHARE_PROMPT_SESSION_KEY,
  type LadderPrompt,
} from '@/lib/camera-ladder';
import { findCameraById, sharedCameraIdFromSearch } from '@/lib/camera-share';
import { entityRefFromSearch, findByCoordShareId, findQuakeByShareId, findStormFeatureByShareId } from '@/lib/share/links';
import { findNearestCameras } from '@/lib/nearby-cameras';
import { decodeSatelliteRows } from '@/lib/satellite-payload';
import type { SkyLocateTarget } from '@/lib/sky-today';
import { DEFAULT_SENSOR_EFFECT, normalizeSensorEffect, sensorModeNeedsAccount, type SensorEffectState } from '@/lib/sensor-effects';
import { readBasemapMode, writeBasemapMode, satelliteSwitchAction, type BasemapMode } from '@/lib/basemap-mode';
import { CAMERA_SEARCH_RADIUS_M } from '@/lib/traffic/config';
import { trackAnalyticsEvent } from '@/components/AnalyticsTracker';
import CinematicHero, { heroSkippedForSearch } from '@/components/CinematicHero';
import HomeSeoShell from '@/components/HomeSeoShell';
import JsonLd from '@/components/JsonLd';
import { HOME_FAQS } from '@/lib/home-faqs';

// FAQPage structured data for the homepage — built from the same Q&A list
// the visible HomeSeoShell renders, so the two can never drift apart.
const homeFaqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: HOME_FAQS.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
};
import ScmPanel from '@/components/ScmPanel';
import SearchBar from '@/components/SearchBar';
import type { RouteResult, LiveLocation } from '@/components/DirectionsBar';
import type { WatchedFlight, FlightTelemetry, AircraftDetail, Airport } from '@/components/FlightWatchPanel';
import type { NavProgress } from '@/lib/navigation';
import {
  classifyGeoError, currentGeoEnvironment, geoEnvironmentIssue, type GeoIssue,
} from '@/lib/geo-position';
import type { LiveDetection } from '@/lib/malware-intel';
import ScaleBar from '@/components/ScaleBar';
import ErrorBoundary from '@/components/ErrorBoundary';
import { applySettings, loadSavedSettings } from '@/lib/style-tokens';
import KeyboardShortcuts from '@/components/KeyboardShortcuts';
import GlobalStatusBar from '@/components/GlobalStatusBar';
const OsirisMap = dynamic(() => import('@/components/OsirisMap'), { ssr: false });
// Panels that only appear after a deliberate action (an active navigation
// session, a watched flight, an opened tool) are split out of the initial
// bundle: their chunks load on first open instead of taxing first paint and
// the main thread for every visitor.
const IntelFeed = dynamic(() => import('@/components/IntelFeed'));
const NavigationView = dynamic(() => import('@/components/NavigationView'));
const FlightWatchPanel = dynamic(() => import('@/components/FlightWatchPanel'));
const ArcGISPanel = dynamic(() => import('@/components/ArcGISPanel'));
const WorldRemote = dynamic(() => import('@/components/WorldRemote'));
const SharePanel = dynamic(() => import('@/components/SharePanel'));
const ShareLinkBlock = dynamic(() => import('@/components/share/ShareLinkBlock'));
const ViewPresets = dynamic(() => import('@/components/ViewPresets'));
const LayerPanel = dynamic(() => import('@/components/LayerPanel'));
const SpaceCam = dynamic(() => import('@/components/SpaceCam'), { ssr: false });
const TodayInTheSky = dynamic(() => import('@/components/TodayInTheSky'), { ssr: false });
const CameraViewer = dynamic(() => import('@/components/CameraViewer'));
const CameraSignupNudge = dynamic(() => import('@/components/CameraSignupNudge'));
const EmailCaptureCard = dynamic(() => import('@/components/EmailCaptureCard'));
const TimedTrialPopup = dynamic(() => import('@/components/TimedTrialPopup'));
const ShareAwayPrompt = dynamic(() => import('@/components/ShareAwayPrompt'));
const AccountHudControl = dynamic(() => import('@/components/AccountHudControl'));
const OsintPanel = dynamic(() => import('@/components/OsintPanel'));
const OiPanel = dynamic(() => import('@/components/OiPanel'));
// RESTORE 2026-10-12: the CompanionWidget dynamic import was removed with
// its mount below — the companion is unmounted from the homepage, not
// deleted; companion/** stays in the tree for a later, gated re-add.
const DrawingToolbar = dynamic(() => import('@/components/DrawingToolbar'), { ssr: false });
const DrawHud = dynamic(() => import('@/components/DrawHud'), { ssr: false });
// Onboarding (Build A): lazy + client-only; renders nothing until the
// globe signals ready, so it can never delay or disturb the map.
const OnboardingRoot = dynamic(() => import('@/components/onboarding/OnboardingRoot'), { ssr: false });
// Teaser A/B test (Conversion Wave 2, F9): lazy + client-only; renders
// nothing unless the config flag is on and this visitor is an anonymous
// treatment-arm visitor, so control and crawlers see today's homepage.
const TeaserSignupCard = dynamic(() => import('@/components/TeaserSignupCard'), { ssr: false });
// Near You strip: globe-arrival camera suggestions (lib/near-you.ts);
// lazy + client-only like onboarding — it renders nothing until the
// splash has gone, so it can never delay the map.
const NearYouStrip = dynamic(() => import('@/components/NearYouStrip'), { ssr: false });
// Speed pass (#29): four more panels that only appear after a deliberate
// action join the split set above — the route planner and its corridor
// cameras (opened explicitly, or once a route exists), the alerts rail
// (toggled), and the trial picker (opened by a gate action, and mounted
// only while open below: it renders null when closed, so gating the mount
// changes nothing visible — it is what lets the chunk actually defer).
const DirectionsBar = dynamic(() => import('@/components/DirectionsBar'));
const RouteCameras = dynamic(() => import('@/components/RouteCameras'));
const LiveAlerts = dynamic(() => import('@/components/LiveAlerts'));
const TrialPickerDialog = dynamic(() => import('@/components/TrialPicker').then((m) => m.TrialPickerDialog));
// The measurement helpers are pure functions — importing them directly keeps
// them out of the lazy chunk, so a finished polygon can be measured whether or
// not the toolbar has loaded yet.
import { toShape, queryRing, type DrawMode, type DrawnShape, type DrawProgress, type DrawResult } from '@/lib/draw';
import { selectInPolygon } from '@/lib/aoi';
import { pickLandingCity } from '@/lib/landing-cities';
import { fetchVisitorLocation, parseGeoResponse, type VisitorLocation } from '@/lib/visitor-geo';
import { diffSweep, appendEvents, type WatchBaseline, type WatchEvent } from '@/lib/watch';
import { STORAGE_KEY, serializeShapes, deserializeShapes, shapesToGeoJSON, downloadFile } from '@/lib/aoi-export';
import { useOi } from '@/lib/oi/client';
import { useAssist } from '@/lib/oi/assist/client';
import type { Highlight, Site } from '@/lib/oi/assist/tools';
import { currentAnswer } from '@/lib/oi/state';
import type { OiMode } from '@/components/OiPanel';
import { OiMark } from '@/components/oi/atoms';
import type { Stage } from '@/components/oi/Workspace';
import { searchObjects, TYPE_LABEL, objectsOf } from '@/lib/oi/objects';
import { workspaceInsets } from '@/lib/oi/layout';
import type { OiGlobe, OiHover } from '@/lib/oi/globe';
import { look } from '@/lib/vision/store';
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      // Mobile if narrow, OR landscape phone (short height + moderate width)
      setIsMobile(w < 768 || (h < 500 && w < 1024));
    };
    check();
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
    };
  }, []);
  return isMobile;
}
const UptimeClock = () => {
  const [uptime, setUptime] = useState('00:00:00');
  const startTime = useRef(0);
  if (startTime.current === 0) startTime.current = Date.now();
  useEffect(() => {
    const iv = setInterval(() => {
      const e = Math.floor((Date.now() - startTime.current) / 1000);
      setUptime(`${String(Math.floor(e/3600)).padStart(2,'0')}:${String(Math.floor((e%3600)/60)).padStart(2,'0')}:${String(e%60).padStart(2,'0')}`);
    }, 1000);
    return () => clearInterval(iv);
  }, []);
  return <span className="hidden lg:inline">UPTIME: <span className="text-[var(--gold-primary)]">{uptime}</span></span>;
};

const ZuluClock = () => {
  const [time, setTime] = useState('');
  useEffect(() => {
    const iv = setInterval(() => {
      const now = new Date();
      setTime(`ZULU ${String(now.getUTCHours()).padStart(2,'0')}:${String(now.getUTCMinutes()).padStart(2,'0')}:${String(now.getUTCSeconds()).padStart(2,'0')}Z`);
    }, 1000);
    return () => clearInterval(iv);
  }, []);
  return <span className="text-[var(--cyan-primary)] font-bold tabular-nums">{time || 'ZULU --:--:--Z'}</span>;
};

/** Real entity count — no fake throughput metrics */
const ActiveEntityCount = ({ data }: { data: Record<string, unknown[]> }) => {
  const count = useMemo(() => {
    if (!data) return 0;
    return Object.values(data).reduce((sum, v) => sum + (Array.isArray(v) ? v.length : 0), 0);
  }, [data]);
  return <span className="text-[var(--alert-green)] font-bold tabular-nums">{count.toLocaleString()}</span>;
};

/** Extracts a watchable YouTube URL from embed/channel URLs */
function getYouTubeWatchUrl(url: string): string {
  if (url.includes('channel=')) return `https://www.youtube.com/channel/${url.split('channel=')[1].split('&')[0]}/live`;
  if (url.includes('/embed/')) return `https://www.youtube.com/watch?v=${url.split('/embed/')[1].split('?')[0]}`;
  return url;
}

/* /api/news answers with its own `timestamp` and `total`; merged at the root
   they would be overwritten by the next endpoint, so the feed keeps its
   metadata under its own key. */
const newsTransform = (d: { news?: unknown[]; sources?: unknown[]; timestamp?: string }) => ({
  news: d.news,
  news_meta: { sources: d.sources ?? [], fetchedAt: d.timestamp ?? null },
  /* The reports that resolved to a place they name — the Live Alert Pins layer. */
  alert_pins: (d.news ?? []).filter(n => (n as { place?: unknown } | null)?.place),
});

/* One version label for the splash and the header, which used to disagree. */
const APP_VERSION = 'V5.0';

/* The splash reports what has actually happened. The last stage waits for
   the map's first finished frame instead of a fixed timer. */
const SPLASH_STAGES = ['ESTABLISHING SECURE CONNECTION...', 'INITIALIZING FEEDS...', 'CALIBRATING SENSORS...', 'SYSTEM READY'];
const SPLASH_PROGRESS = ['25%', '50%', '78%', '100%'];

/* The HUD enters as one sequence when the splash lifts. Each piece used to
   run its own fixed timer (2.5–3.5 s), which raced a splash that now lasts
   as long as the map takes to draw. */
const HUD_EASE = [0.22, 1, 0.36, 1] as const;
const hudIn = (delay: number) => ({ duration: 0.7, ease: HUD_EASE, delay });

export default function Dashboard() {
  // Landing on the globe without the cinematic hero. Two sources of
  // truth, both in the hero's own module (lib: components/CinematicHero):
  // the kill switch (CINEMATIC_HERO_ENABLED — parked OFF since
  // 2026-10-20, so the hero never mounts and its poster/video are never
  // downloaded) and, with the hero enabled, the URL-param skips for ad
  // traffic and camera deep links. Either way this drives the exact
  // same gate the ad-skip always did, so globe_reached fires
  // immediately and onboarding is unaffected.
  const [skipHero] = useState(() =>
    heroSkippedForSearch(typeof window !== 'undefined' ? window.location.search : ''),
  );
  const dataRef = useRef<any>({});
  const [dataVersion, setDataVersion] = useState(0);
  const data = dataRef.current;

  const [backendStatus, setBackendStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [mapView, setMapView] = useState({ zoom: 2.5, latitude: 20 });
  const [flyToLocation, setFlyToLocation] = useState<{ lat: number; lng: number; zoom?: number; alertId?: string; duration?: number; ts: number } | null>(null);
  /* The Live Alerts the feed's filters leave showing; the map pins those. */
  const [pinnedAlertIds, setPinnedAlertIds] = useState<string[] | null>(null);
  const [globalStats, setGlobalStats] = useState<any>(null);
  const mouseCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const coordsDisplayRef = useRef<HTMLDivElement>(null);
  const [locationLabel, setLocationLabel] = useState('');
  const [regionDossier, setRegionDossier] = useState<any>(null);
  const [dossierLoading, setDossierLoading] = useState(false);
  const [dossierCoords, setDossierCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [showSplash, setShowSplash] = useState(true);
  /* Radar scan: true while the camera catalogue is still loading. The splash
     shows the radar until every region lands (or retries give up). */
  const [camerasLoading, setCamerasLoading] = useState(true);
  const [splashStage, setSplashStage] = useState(0);
  const [mapReady, setMapReady] = useState(false);
  /* Data boot gate: layer feeds (satellites ~2.8 MB, the camera catalogue,
     cables, panel feeds) used to fire at mount and fight the map chunk,
     style and tiles for bandwidth and main thread — the globe's first frame
     needs none of them. They start once the map signals ready; a 6 s
     fallback keeps a failed map from ever starving the splash, which also
     lifts on the camera catalogue. */
  const [dataBoot, setDataBoot] = useState(false);
  useEffect(() => { if (mapReady) setDataBoot(true); }, [mapReady]);
  useEffect(() => {
    const t = setTimeout(() => setDataBoot(true), 6000);
    return () => clearTimeout(t);
  }, []);

  const revealed = !showSplash;
  /* True once the splash has finished fading out, not merely started to. */
  const [splashGone, setSplashGone] = useState(false);
  /* Where the viewer is, by IP. Asked for at once; the camera flies there
     once the splash has gone. */
  const [homeLocation, setHomeLocation] = useState<{ lat: number; lng: number } | null>(null);
  /* The same answer with its area label, for the Near You strip
     (lib/near-you.ts). Set only when a real location resolved — the
     landing-city fallback is a guess and is never labelled "near you". */
  const [visitorGeo, setVisitorGeo] = useState<VisitorLocation | null>(null);
  const autoLocateCancelled = useRef(false);

  const [activeCamera, setActiveCamera] = useState<any>(null);
  const [showCameraSignup, setShowCameraSignup] = useState(false);
  /* Wave 2 ladder (BRIEF F4, lib/camera-ladder): which rung's prompt
     the wall is showing; the camera the wall interrupted (re-opened
     automatically when the email step unlocks its +5); and who the
     session says this viewer is — the ladder's account rung is a
     session fact, kept fresh by the same heal cadence as the
     entitlement below. The email-unlock flag is deliberately NOT
     state: the gate reads the ladder record fresh at decision time,
     so an unlock that lands mid-interaction is never stale. */
  const [gateRung, setGateRung] = useState<LadderPrompt>('pro');
  const pendingGateCameraRef = useRef<any>(null);
  const [sessionIdentity, setSessionIdentity] = useState<SessionIdentity | null>(null);
  /* F11: the share-link loop-in card, and whether the timed trial
     popup is currently up (it reports back so prompts never stack). */
  const [showSharePrompt, setShowSharePrompt] = useState(false);
  const [timedPopupVisible, setTimedPopupVisible] = useState(false);
  /** Set on this session's first successful camera open (the gated,
   *  counted path in handleEntityClick) — mounts the once-per-device
   *  email capture card (lib/newsletter/capture). Deliberately NOT
   *  initialised from cameraGate's persisted count: the ask belongs to
   *  the moment of an open in this session, not to page load. */
  const [cameraEverOpened, setCameraEverOpened] = useState(false);
  /** Pro locks that are a lone button (OI dock/tab) open the trial picker
   *  dialog instead of bouncing to /pricing. */
  const [showTrialPicker, setShowTrialPicker] = useState(false);
  const [spaceWeather, setSpaceWeather] = useState<any>(null);
  const [showLayers, setShowLayers] = useState(true);
  const [showAlerts, setShowAlerts] = useState(false);
  const [showSpaceCam, setShowSpaceCam] = useState(false);
  const [showScmPanel, setShowScmPanel] = useState(true);
  const [showIntel, setShowIntel] = useState(false);
  const [showDrawing, setShowDrawing] = useState(false);
  const [drawMode, setDrawMode] = useState<DrawMode | null>(null);
  const [drawProgress, setDrawProgress] = useState<DrawProgress | null>(null);
  const [drawCommand, setDrawCommand] = useState<{ action: 'undo' | 'finish' | 'cancel'; seq: number } | null>(null);
  const sendDraw = useCallback((action: 'undo' | 'finish' | 'cancel') => {
    setDrawCommand(c => ({ action, seq: (c?.seq ?? 0) + 1 }));
  }, []);
  /** AOIs whose contents are being watched for arrivals and departures. */
  const [watched, setWatched] = useState<Set<string>>(new Set());
  const [watchEvents, setWatchEvents] = useState<WatchEvent[]>([]);
  const watchBaselines = useRef<Record<string, WatchBaseline>>({});
  const [selectedPolygon, setSelectedPolygon] = useState<string | null>(null);
  const [showDesktopSearch, setShowDesktopSearch] = useState(false);
  const [showDirections, setShowDirections] = useState(false);
  // A destination Search hands to Directions ("Directions to here"); its stamp remounts the planner with it.
  const [routeTarget, setRouteTarget] = useState<{ label: string; context?: string; lat: number; lng: number; kind?: string; ts: number } | null>(null);
  const [activeRoute, setActiveRoute] = useState<
    (RouteResult & {
      from: { lat: number; lng: number };
      to: { lat: number; lng: number };
      alternates?: Array<{ type: 'LineString'; coordinates: [number, number][] }>;
      activeSegment?: [number, number][] | null;
    }) | null
  >(null);
  const [liveLocation, setLiveLocation] = useState<LiveLocation | null>(null);
  const [followUser, setFollowUser] = useState(false);
  const [navSession, setNavSession] = useState<
    { route: RouteResult; label: string; key: number } | null
  >(null);
  /** Why the navigation watch has no fix, classified by lib/geo-position.
   *  Null while merely waiting — or once a fix has landed. */
  const [navGeoIssue, setNavGeoIssue] = useState<GeoIssue | null>(null);
  /** Bumped by the view's "Try again": restarts the session's watch. */
  const [navWatchNonce, setNavWatchNonce] = useState(0);
  const [navProgress, setNavProgress] = useState<NavProgress | null>(null);
  const [watchedFlights, setWatchedFlights] = useState<WatchedFlight[]>([]);
  const [aircraftAirports, setAircraftAirports] = useState<Record<string, Airport[]>>({});

  // The Space Missions panel asks the page to switch the satellites layer
  // on (the panel links out to it; it never claims a catalogued satellite
  // is a mission's payload). Same global-bridge pattern as below.
  useEffect(() => {
    (window as unknown as { __weEnableSatellites?: () => void }).__weEnableSatellites = () => {
      setActiveLayers((prev: any) => (prev.satellites ? prev : { ...prev, satellites: true }));
    };
  }, []);

  // The popup lives in raw map HTML, so it hands aircraft over through a global.
  useEffect(() => {
    (window as unknown as { osirisWatchFlight?: (f: WatchedFlight) => void }).osirisWatchFlight = (f) => {
      if (!f?.icao24) return;
      setWatchedFlights((prev) =>
        prev.some((w) => w.icao24 === f.icao24) ? prev : [...prev, f].slice(-6));
    };
  }, []);

  const removeWatched = useCallback((icao24: string) => {
    setWatchedFlights((prev) => prev.filter((w) => w.icao24 !== icao24));
    setAircraftAirports((prev) => {
      const next = { ...prev };
      delete next[icao24];
      return next;
    });
  }, []);

  const handleAircraftDetail = useCallback((icao24: string, detail: AircraftDetail | null) => {
    const ports = [detail?.origin, detail?.destination]
      .filter((a): a is Airport => Boolean(a && Number.isFinite(a.lat) && Number.isFinite(a.lng)));
    setAircraftAirports((prev) => (ports.length ? { ...prev, [icao24]: ports } : prev));
  }, []);

  // Telemetry for watched aircraft, refreshed from whatever the feed last gave us.
  const watchTelemetry = useMemo(() => {
    const out: Record<string, FlightTelemetry> = {};
    if (!watchedFlights.length) return out;
    const buckets = [
      data?.commercial_flights, data?.private_flights,
      data?.private_jets, data?.military_flights,
    ];
    const wanted = new Set(watchedFlights.map((w) => w.icao24));
    for (const bucket of buckets) {
      for (const f of bucket || []) {
        if (f?.icao24 && wanted.has(f.icao24)) {
          out[f.icao24] = {
            lat: f.lat, lng: f.lng, alt: f.alt,
            speed_knots: f.speed_knots, heading: f.heading,
            grounded: f.grounded, squawk: f.squawk,
          };
        }
      }
    }
    return out;
  }, [watchedFlights, data]);

  // A navigation session owns its own position watch. The planner's watch dies
  // with the planner when guidance takes over the panel, so guidance cannot
  // depend on it — without this the banner sits on "waiting for a fix" forever.
  // Failures are classified (lib/geo-position) and handed to the view, which
  // names the actual problem and its remedy; the previous error callback
  // swallowed them all, and the view blamed HTTPS for every one of them.
  useEffect(() => {
    if (!navSession) return;
    const envIssue = geoEnvironmentIssue(currentGeoEnvironment());
    if (envIssue) { setNavGeoIssue(envIssue); return; }
    setNavGeoIssue(null);
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setNavGeoIssue(null);
        setLiveLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          heading: pos.coords.heading,
        });
      },
      (err) => setNavGeoIssue(classifyGeoError(err, currentGeoEnvironment())),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [navSession, navWatchNonce]);
  const [showRemote, setShowRemote] = useState(false);
  const [showArcGIS, setShowArcGIS] = useState(false);
  const [arcgisLayers, setArcgisLayers] = useState<Array<{ id: string; title: string; url: string; geojson: any; color: string; visible: boolean; opacity: number }>>([]);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number; bounds?: { west: number; south: number; east: number; north: number } } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<'layers'|'intel'|'search'|'recon'|'remote'|'oi'|null>(null);

  // ── OSIRIS OI ── the run lives here, not in the panel, so the globe keeps
  // drawing it while the panel is closed. State goes to the map's OI layer
  // directly rather than through a prop, so the map does not re-render per event.
  const oi = useOi();
  const [showOi, setShowOi] = useState(false);
  const oiAnchor = useRef<HTMLDivElement>(null);
  const [oiTop, setOiTop] = useState(0);
  useLayoutEffect(() => {
    if (!showOi) return;
    const place = () => {
      const anchor = oiAnchor.current?.getBoundingClientRect();
      if (anchor) setOiTop(Math.round(64 - anchor.top));
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [showOi]);
  /** What is selected on the globe or in the panel: a point's key, or "link:<id>" for an arc. */
  const [oiSelected, setOiSelected] = useState<string | null>(null);
  const [oiHover, setOiHover] = useState<OiHover | null>(null);
  const [oiFollowing, setOiFollowing] = useState(true);
  const [oiTheater, setOiTheater] = useState(false);
  /** Assist (talk to OI, the default) or Forecast (the swarm). */
  const [oiMode, setOiMode] = useState<OiMode>('assist');
  /** What the full-screen workspace's stage shows. */
  const [oiStage, setOiStage] = useState<Stage>('globe');
  /** Whether the panel was opened from the keyboard, to type straight away. */
  const [oiAutoFocus, setOiAutoFocus] = useState(false);
  // A different run (or none) starts with nothing selected.
  const [oiSelectionRun, setOiSelectionRun] = useState(oi.runId);
  if (oiSelectionRun !== oi.runId) {
    setOiSelectionRun(oi.runId);
    setOiSelected(null);
  }
  const oiGlobe = useRef<OiGlobe | null>(null);
  const oiState = useRef(oi.state);
  const oiSelectedRef = useRef(oiSelected);
  useEffect(() => {
    oiState.current = oi.state;
    oiGlobe.current?.update(oi.state);
  }, [oi.state]);
  useEffect(() => {
    oiSelectedRef.current = oiSelected;
    oiGlobe.current?.select(oiSelected);
  }, [oiSelected]);
  const handleOiGlobe = useCallback((globe: OiGlobe | null) => {
    oiGlobe.current = globe;
    globe?.update(oiState.current);
    globe?.select(oiSelectedRef.current);
  }, []);
  // A click on the globe selects, and opens the panel to show what was clicked; empty map clears.
  const handleOiSelect = useCallback((key: string | null) => {
    setOiSelected(key);
    if (!key) return;
    setOiMode('forecast');
    if (window.matchMedia('(max-width: 767px)').matches) setMobilePanel('oi');
    else setShowOi(true);
  }, []);
  // Going somewhere on purpose takes the camera off the director.
  const handleOiLocate = useCallback((lat: number, lng: number, zoom?: number) => {
    oiGlobe.current?.follow(false);
    setFlyToLocation({ lat, lng, zoom, ts: Date.now() });
  }, []);
  const followOi = useCallback(() => oiGlobe.current?.follow(true), []);
  // Full screen: the workspace's columns sit either side, and the globe stays centred on the stage between.
  const oiTheaterOn = oiTheater;
  const oiHasRun = Boolean(oi.state);
  // On a phone the drawer covers the lower half: the globe, and anywhere OI flies to, centre in the space above it.
  const oiDrawerOpen = mobilePanel === 'oi';
  useEffect(() => {
    if (!oiDrawerOpen) return;
    const drawer = Math.round(Math.min(window.innerHeight * 0.55, window.innerHeight - 100)) + 52;
    oiGlobe.current?.setInsets({ top: 70, bottom: drawer, left: 0, right: 0 });
    return () => oiGlobe.current?.setInsets(null);
  }, [oiDrawerOpen]);
  useEffect(() => {
    const inset = () => oiGlobe.current?.setInsets(oiTheaterOn ? workspaceInsets(window.innerWidth, oiHasRun) : null);
    inset();
    // The app's own HUD (everything marked data-hud) steps back while the workspace has the screen.
    document.documentElement.toggleAttribute('data-oi-theater', oiTheaterOn);
    if (oiTheaterOn) window.addEventListener('resize', inset);
    return () => {
      window.removeEventListener('resize', inset);
      document.documentElement.removeAttribute('data-oi-theater');
    };
  }, [oiTheaterOn, oiHasRun]);
  // A shared link (?oi=<run>) opens the panel on that run, and the camera
  // goes to the run rather than to the visitor's city.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('oi');
    if (!id) return;
    autoLocateCancelled.current = true;
    setOiMode('forecast');
    if (window.matchMedia('(max-width: 767px)').matches) setMobilePanel('oi');
    else setShowOi(true);
    void oi.watch(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Once a run is under way the camera is the director's (lib/oi/camera): a late answer about the
  // visitor's city must not fly it away.
  useEffect(() => { if (oi.runId) autoLocateCancelled.current = true; }, [oi.runId]);
  const [mapProjection, setMapProjection] = useState<'globe'|'mercator'>('globe');
  const [terrainFocus, setTerrainFocus] = useState(0);
  const [terrainStatus, setTerrainStatus] = useState<TerrainStatus>('idle');
  const [terrainRetry, setTerrainRetry] = useState(0);
  const [mapStyle, setMapStyle] = useState<'dark'|'satellite'>('dark');
  // Day/night basemap (free for everyone, persisted per device; default
  // night = the long-standing dark look). Satellite view overrides it
  // while active — see lib/basemap-mode for the interaction rule.
  const [basemapMode, setBasemapMode] = useState<BasemapMode>(() => readBasemapMode());
  useEffect(() => { writeBasemapMode(basemapMode); }, [basemapMode]);
  const [sweepData, setSweepData] = useState<any>(null);
  const [scanTargets, setScanTargets] = useState<any[]>([]);
  const [drawnPolygons, setDrawnPolygons] = useState<DrawnShape[]>([]);
  const [demoMode, setDemoMode] = useState(false);
  const [osirisTheme, setOsirisTheme] = useState<'core'|'ghost'>('core');

  useEffect(() => {
    document.body.className = osirisTheme === 'core' ? '' : `theme-${osirisTheme}`;
  }, [osirisTheme]);

  /* Sensor effects (DISPLAY group): simulated visual modes for the map
     canvas only, owned here so the LayerPanel controls and OsirisMap's
     applier share one state. Persisted like other client prefs. */
  const [sensorEffect, setSensorEffect] = useState<SensorEffectState>(() => {
    try {
      const raw = localStorage.getItem('we_sensor_effect_v1');
      if (raw) return normalizeSensorEffect(JSON.parse(raw));
    } catch { /* storage unavailable — defaults apply */ }
    return { ...DEFAULT_SENSOR_EFFECT };
  });
  useEffect(() => {
    try { localStorage.setItem('we_sensor_effect_v1', JSON.stringify(sensorEffect)); } catch { /* ignore */ }
  }, [sensorEffect]);

  /* Wave 2 F15: the exclusive themes (Tactical Dark, Night Vision) are
     free-account features. If a persisted gated mode is on file but the
     viewer is definitively anonymous, it does not apply — coerce to off
     for this session (the stored choice is left alone; it takes effect
     again once the viewer signs in). An unknown read changes nothing:
     a failed session read must never strip a member's theme. */
  useEffect(() => {
    if (!sensorModeNeedsAccount(sensorEffect.mode)) return;
    let live = true;
    readSessionIdentity()
      .then((id) => {
        if (live && id.state === 'anonymous') setSensorEffect({ ...DEFAULT_SENSOR_EFFECT });
      })
      .catch(() => {});
    return () => { live = false; };
    // Mount-only: the persisted mode at load is the one being gated.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Style Studio overrides are inline on <body>, so they survive the theme
     swap above and only need reapplying once per load. */
  useEffect(() => {
    const saved = loadSavedSettings();
    if (saved) applySettings(saved);
  }, []);

  const isMobile = useIsMobile();
  const startTime = useRef(Date.now());
  const geocodeCache = useRef<Map<string, string>>(new Map());
  const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastGeocodedPos = useRef<{ lat: number; lng: number } | null>(null);

  // ── DEFAULT: Most layers OFF — fast initial load ──
  const [activeLayers, setActiveLayers] = useState({
    flights: false,
    private: false,
    jets: false,
    military: false,
    maritime: true,
    // On from the start: the orbiting fleet around the globe is the first
    // thing the splash lifts onto.
    satellites: true,
    sat_comms: false,
    sat_military: false,
    sat_navigation: false,
    sat_earth: false,
    sat_science: false,
    /* Space Missions: LL2 launch board + pads — off by default; the data
       loads only while the layer is on (see lib/launches). */
    space_missions: false,
    /* Street Level: Panoramax community photos — off by default; the
       globe only queries at street zooms, never at global zoom
       (see lib/streetlevel). */
    street_level: false,
    balloons: false,
    cctv: true,
    /* The live preview tiles over the camera dots — see CctvPreviews.
       On by default, as originally shipped (#310): past zoom 13 the nearest
       cameras in view show their live feed in a tile above the dot. It was
       flipped off as a side effect of the 8fb4a51 perf grab-bag (2026-10-10)
       and never restored; the owner asked for it back 2026-10-21. The
       component bounds itself (≤8 tiles, ≤4 decoding video), and anyone who
       does not want it can switch it off under CCTV Cameras → Live Previews. */
    cctv_previews: true,
    alert_cams: false,
    live_news: true,
    earthquakes: true,
    fires: false,
    fire_perimeters: false,
    weather: false,
    hurricanes: false,
    river_gauges: false,
    transit: false,
    gbfs: false,
    /* Traffic: simulated vehicles on real OSM roads — off by default,
       vehicles + congestion overlay on once the layer itself is enabled. */
    traffic: false,
    traffic_vehicles: true,
    traffic_congestion: true,
    /* Drones: live Remote ID detections from connected receivers only —
       off by default; the FAA airspace sub-layer rides along once the
       layer itself is enabled. With no receivers connected the layer is
       honestly empty (see lib/drones). */
    drones: false,
    drone_airspace: true,
    radiation: false,
    infrastructure: false,
    global_incidents: true,
    /* Live Alerts reports pinned to the place they name — see alert-places.
       Off until asked for, like the other threat layers: the map opens with
       what a reader has chosen to see, and the feed reads the same without it. */
    alert_pins: false,
    war_alerts: false,
    day_night: true,
    cables: true,
    sdk_sea: true,
    sdk_air: true,
    sdk_naval: true,
    /* NOAA's infrared cloud mosaic — see lib/live-clouds. Off until asked for:
       it veils everything under it. */
    live_clouds: false,
    /* NOAA nowCOAST radar + lightning WMS overlays — see lib/noaa-radar.
       Off until asked for, like the clouds they sit beside. */
    noaa_radar: false,
    lightning: false,
    terrain_3d: false,
    terrain_elevation: false,
    malware: false,
    cyber_attacks: false,
    gdelt_events: false,
    cf_outages: false,
    cf_attacks: false,
  });
  // ── OI ASSIST ── the conversation, and the page it works: the camera, the
  // layers, the panels, the live data, and what it marks on the map. It lives
  // here, so closing the panel keeps the conversation and its marks.
  const [oiHighlight, setOiHighlight] = useState<Highlight | null>(null);
  const [oiVoice, setOiVoice] = useState(() => typeof window !== 'undefined' && localStorage.getItem('osiris.oi.voice') === '1');
  const setOiVoicePersist = useCallback((on: boolean) => {
    setOiVoice(on);
    try { localStorage.setItem('osiris.oi.voice', on ? '1' : '0'); } catch { /* storage blocked */ }
    if (!on && typeof window !== 'undefined') window.speechSynthesis?.cancel();
  }, []);
  const assistView = useRef<ReturnType<Site['view']>>({ lat: 20, lng: 0, zoom: 2.5, projection: 'globe', style: 'dark' });
  const assistLayers = useRef<Record<string, boolean>>(activeLayers);
  const assistVoice = useRef(oiVoice);
  const assistOi = useRef(oi);
  useEffect(() => { assistLayers.current = activeLayers; }, [activeLayers]);
  useEffect(() => { assistVoice.current = oiVoice; }, [oiVoice]);
  useEffect(() => { assistOi.current = oi; });
  useEffect(() => {
    assistView.current = { lat: mapCenter?.lat ?? 20, lng: mapCenter?.lng ?? 0, zoom: mapView.zoom, projection: mapProjection, style: mapStyle, bounds: mapCenter?.bounds };
  }, [mapCenter, mapView.zoom, mapProjection, mapStyle]);
  /** A panel the assistant asked for, opened the way its own button opens it. */
  const openFromAssist = useCallback((panel: string) => {
    const phone = window.matchMedia('(max-width: 767px)').matches;
    const right = (show: () => void) => { setShowOi(false); setShowIntel(false); setShowAlerts(false); setShowSpaceCam(false); show(); };
    if (panel === 'alerts') right(() => setShowAlerts(true));
    else if (panel === 'intel') { if (phone) setMobilePanel('recon'); else right(() => setShowIntel(true)); }
    else if (panel === 'layers') { if (phone) setMobilePanel('layers'); else setShowLayers(true); }
    else if (panel === 'directions') setShowDirections(true);
    else if (panel === 'forecast' || panel === 'workspace') {
      setOiMode('forecast');
      if (phone) setMobilePanel('oi'); else setShowOi(true);
      if (panel === 'workspace' && assistOi.current.state && !phone) setOiTheater(true);
    }
  }, []);
  const assistTheater = useRef(oiTheater);
  const assistStage = useRef<Stage>(oiStage);
  useEffect(() => { assistTheater.current = oiTheater; }, [oiTheater]);
  useEffect(() => { assistStage.current = oiStage; }, [oiStage]);
  const assistSite = useMemo<Omit<Site, 'forecast'>>(() => ({
    data: () => dataRef.current,
    view: () => assistView.current,
    layers: () => assistLayers.current,
    flyTo: (lat, lng, zoom) => { oiGlobe.current?.follow(false); setFlyToLocation({ lat, lng, zoom, ts: Date.now() }); },
    setLayers: (on, off) => setActiveLayers(prev => {
      const next = { ...prev } as Record<string, boolean>;
      for (const k of on) if (k in next) next[k] = true;
      for (const k of off) if (k in next) next[k] = false;
      return next as typeof prev;
    }),
    highlight: h => setOiHighlight(h),
    openPanel: openFromAssist,
    setView: ({ projection, style }) => {
      if (projection) {
        if (projection === 'mercator') setActiveLayers(prev => ({ ...prev, terrain_elevation: false, terrain_3d: false }));
        setMapProjection(projection);
      }
      if (style) setMapStyle(style);
    },
    workspace: ({ open, view }) => {
      if (window.matchMedia('(max-width: 767px)').matches) return { ok: false, error: 'The full-screen workspace is for larger screens' };
      const run = assistOi.current.state;
      if (view && view !== 'globe' && !run) return { ok: false, error: `The ${view} needs a forecast: start one first` };
      if (open === false) { setOiTheater(false); return { ok: true, summary: 'Closed the workspace' }; }
      setShowOi(true);
      setOiTheater(true);
      if (view) setOiStage(view);
      return { ok: true, summary: `Opened the workspace${view ? ` on the ${view}` : ''}` };
    },
    select: name => {
      const run = assistOi.current.state;
      if (!run) return { ok: false, error: 'There is no forecast to select from' };
      const hit = searchObjects(run, name, 1)[0];
      if (!hit) return { ok: false, error: `Nothing called "${name}" in this forecast` };
      setOiSelected(hit.key);
      return { ok: true, summary: `Opened ${hit.title} (${TYPE_LABEL[hit.type].toLowerCase()})` };
    },
    geocode: async q => {
      try {
        const res = await fetch(`/api/geosearch?q=${encodeURIComponent(q)}`);
        const hit = (await res.json())?.results?.[0];
        return hit && Number.isFinite(hit.lat) && Number.isFinite(hit.lng) ? { name: hit.name, lat: hit.lat, lng: hit.lng, kind: hit.kind } : null;
      } catch { return null; }
    },
    // OI looks through the same overlay the reader uses, so its boxes appear in the open viewer.
    camera: async (cam, watch) => {
      setActiveCamera({ ...cam, type: 'cctv' });
      const out = await look(cam, { watch, by: 'oi' });
      return { analysis: out.analysis, watch: out.watch };
    },
  }), [openFromAssist]);
  const assist = useAssist({
    site: assistSite,
    startForecast: async (question, depth, auth) => {
      const id = await assistOi.current.start({ question, seed: '', depth, useFeeds: true }, auth.engine, auth.key);
      return id ? { ok: true, id } : { ok: false, error: 'The forecast did not start: check the key and try again.' };
    },
    forecastSummary: () => {
      const st = assistOi.current.state;
      return st ? {
        question: st.question, status: st.status === 'running' ? st.phaseLabel || 'running' : st.status, answer: currentAnswer(st),
        objects: objectsOf(st).filter(o => o.type === 'actor' || o.type === 'world').map(o => o.title).slice(0, 40),
      } : null;
    },
    ui: () => ({ fullscreen: assistTheater.current, stage: assistStage.current }),
    onReply: text => {
      if (!assistVoice.current || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text.replace(/^- /gm, '').replace(/\s+/g, ' ').trim());
      u.rate = 1.03;
      window.speechSynthesis.speak(u);
    },
  });

  const terrainPanelProps = {
    terrainStatus,
    on3DModeSelected: () => setMapProjection('globe'),
    onTerrainRetry: () => setTerrainRetry(value => value + 1),
    onTerrainFocus: () => setTerrainFocus(value => value + 1),
  };
  // Server-side capability flags — gate layers that need credentials.
  const [capabilities, setCapabilities] = useState<Record<string, boolean>>({});
  /* Freemium: does the viewer hold an active Weekly Pass? Drives the lock
     icons on premium layers in LayerPanel. Anonymous users are never premium. */
  const [isPremiumUser, setIsPremiumUser] = useState(false);
  /* Entitlement self-healing (lib/premium-entitlement): this state used to
     be set by ONE mount fetch — if it resolved before the session settled
     (post-sign-in landing, post-checkout return) a Pro user was "free" for
     the whole visit. Now: the mount check runs through the same helper,
     focus/visibility re-checks heal it ambiently (throttled), results only
     ever upgrade false→true (a failed fetch never downgrades Pro), and
     the camera gate re-checks once at the moment of decision. */
  const lastEntitlementCheckAt = useRef(0);
  const refreshPremium = useCallback(async () => {
    lastEntitlementCheckAt.current = Date.now();
    const check = await checkPremiumEntitlement();
    setIsPremiumUser((cur) => applyAmbientEntitlement(cur, check));
    // The ladder's account rung reads the same session — keep the
    // identity fresh on the same heal cadence.
    void readSessionIdentity().then(setSessionIdentity);
  }, []);
  useEffect(() => { void refreshPremium(); }, [refreshPremium]);
  useEffect(() => {
    const heal = () => {
      if (document.visibilityState !== 'visible') return;
      if (!shouldRecheckEntitlement(lastEntitlementCheckAt.current, Date.now())) return;
      void refreshPremium();
    };
    window.addEventListener('focus', heal);
    document.addEventListener('visibilitychange', heal);
    return () => {
      window.removeEventListener('focus', heal);
      document.removeEventListener('visibilitychange', heal);
    };
  }, [refreshPremium]);
  // The satellite switch in the map chrome. Satellite view stays Pro:
  // a non-Pro click takes the standard TrialPicker path (the same one
  // the other chrome locks use); turning it off is always allowed and
  // returns to the persisted day/night choice. lib/basemap-mode pins
  // the state machine.
  const handleSatelliteToggle = useCallback(() => {
    const action = satelliteSwitchAction(!isPremiumUser, mapStyle === 'satellite');
    if (action === 'show-trial-picker') { setShowTrialPicker(true); return; }
    setMapStyle(action === 'turn-on' ? 'satellite' : 'dark');
  }, [isPremiumUser, mapStyle]);
  /* Invite-a-friend camera bonus (lib/camera-bonus): a signed-in user's
     unspent bonus opens, fetched once at load. The server is the source
     of truth — this is only the local hint for whether a beyond-base
     open is worth asking the server to spend. null = signed out or
     unknown, and the gate then behaves exactly as it did before the
     bonus existed; signed-out visitors keep the plain per-device base. */
  const [cameraBonus, setCameraBonus] = useState<number | null>(null);
  useEffect(() => {
    fetch('/api/cameras/bonus', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (j && typeof j.balance === 'number') setCameraBonus(j.balance); })
      .catch(() => {});
  }, []);
  /* A beyond-base open for a signed-in user: the server spends one
     bonus open first, and only a yes opens the camera (recorded in
     both ledgers — the device count and the server balance). A no —
     bonus already spent, here or on another device — lands on the
     same signup nudge as the plain base limit. */
  const openWithCameraBonus = useCallback((entity: any) => {
    fetch('/api/cameras/bonus/consume', { method: 'POST' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j && typeof j.balance === 'number') setCameraBonus(j.balance);
        if (j?.consumed) {
          recordCameraClick();
          trackAnalyticsEvent('camera_open');
          setActiveCamera(entity);
          setCameraEverOpened(true);
          return;
        }
        trackAnalyticsEvent('upgrade_gate_shown');
        setGateRung('pro');
        setShowCameraSignup(true);
      })
      .catch(() => {
        trackAnalyticsEvent('upgrade_gate_shown');
        setGateRung('pro');
        setShowCameraSignup(true);
      });
  }, []);
  /* Traffic is a Pro layer: the panel shows non-subscribers a lock, and the
     map must agree — a stored "traffic on" state (from when the layer was
     free, or a lapsed subscription) never reaches the map for a
     non-subscriber. The stored state itself is untouched, so the layer
     comes back exactly as it was on subscribing. The panel keeps the raw
     state; only the map sees this gated copy. */
  const globeActiveLayers = useMemo(
    () => (isPremiumUser ? activeLayers : { ...activeLayers, traffic: false, traffic_vehicles: false, traffic_congestion: false }),
    [activeLayers, isPremiumUser],
  );
  const [liveFeedUrl, setLiveFeedUrl] = useState<string | null>(null);
  const [liveFeedName, setLiveFeedName] = useState('');
  const [liveFeedEmbedAllowed, setLiveFeedEmbedAllowed] = useState(true);

  /* Splash: it lifts once the map has drawn its first frame AND the camera
     catalogue lands (the radar scans until then). It never lifts before the
     intro has played (about 2.2 s), and never later than 25 s, so a slow feed
     never traps the user on the splash. */
  useEffect(() => {
    const timers = [
      setTimeout(() => setSplashStage(s => Math.max(s, 1)), 1100),
      setTimeout(() => setSplashStage(s => Math.max(s, 2)), 1700),
      setTimeout(() => setShowSplash(false), 25000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);
  /* When the camera catalogue lands, lift the splash (intro already played). */
  useEffect(() => {
    if (!camerasLoading) {
      const t = setTimeout(() => setShowSplash(false), 600);
      return () => clearTimeout(t);
    }
  }, [camerasLoading]);
  useEffect(() => {
    if (!mapReady || splashStage !== 2) return;
    const t = setTimeout(() => setSplashStage(3), 500);
    return () => clearTimeout(t);
  }, [mapReady, splashStage]);
  useEffect(() => {
    if (splashStage !== 3) return;
    // Long enough to read SYSTEM READY before the splash goes.
    const t = setTimeout(() => setShowSplash(false), 550);
    return () => clearTimeout(t);
  }, [splashStage]);

  /* Fly from the globe down to the viewer's city once the splash has gone.
     Starting as it began to fade meant a busy first load (the satellite
     catalogue is ~19k objects) could hold the fade until the camera was
     nearly at street level, and the globe was never seen. */
  useEffect(() => {
    if (!splashGone || !homeLocation || autoLocateCancelled.current) return;
    setFlyToLocation({ ...homeLocation, zoom: 8, duration: 3500, ts: Date.now() });
  }, [splashGone, homeLocation]);

  // On mount: restore layers, probe optional feeds, and geolocate by IP
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Restore active layers from URL if present
    const p = new URLSearchParams(window.location.search);
    const layers = p.get('layers');
    if (layers) {
      const active = layers.split(',');
      setActiveLayers(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(k => { (next as any)[k] = active.includes(k); });
        return next;
      });
    }

    // A camera deep link names its destination: the catalogue must load
    // even if a layers param switched CCTV off, and the IP auto-locate
    // flight below must not steal the view from the linked camera.
    if (p.get('camera')) {
      autoLocateCancelled.current = true;
      setActiveLayers(prev => ({ ...prev, cctv: true }));
    }

    // Probe which credential-gated feeds this deployment has configured, so the
    // layer panel can hide toggles that could never return data.
    fetch('/api/cloudflare-radar?probe=1')
      .then(r => (r.ok ? r.json() : null))
      .then(p => { if (p) setCapabilities(c => ({ ...c, cloudflare: !!p.configured })); })
      .catch(() => { /* leave the layer hidden */ });

    // Once the user interacts, a late IP-location response must not steal the
    // camera back. The request is also cancelled when this page unmounts.
    const geoController = new AbortController();
    const cancelAutoLocate = () => { autoLocateCancelled.current = true; };
    window.addEventListener('pointerdown', cancelAutoLocate, { once: true });
    window.addEventListener('keydown', cancelAutoLocate, { once: true });
    /* Asked for at once rather than after a fixed 3 s wait, so the answer is
       in hand when the splash lifts; the effect above does the flying. When
       the visitor's city can't be found (no public address, every provider
       failed, or no answer within 6 s) the fly-in still happens, to a random
       well-covered city, rather than stopping on the globe. */
    let located = false;
    const landSomewhere = () => {
      if (located || geoController.signal.aborted) return;
      located = true;
      const city = pickLandingCity();
      setHomeLocation({ lat: city.lat, lng: city.lng });
    };
    const geoGiveUp = setTimeout(landSomewhere, 6000);
    /* The legacy IP-lookup flow, unchanged: it runs only when the
       platform headers provided nothing (off-Vercel, local dev). Its
       answer also feeds the Near You strip, via the same parser. */
    const legacyLocate = () => {
      fetch('/api/geo', { signal: geoController.signal })
        .then(r => r.json())
        .then(geo => {
          if (located || geoController.signal.aborted) return;
          const loc = parseGeoResponse(geo);
          if (loc) {
            located = true;
            setVisitorGeo(loc);
            setHomeLocation({ lat: loc.lat, lng: loc.lng });
          } else {
            landSomewhere();
          }
        })
        .catch(landSomewhere);
    };
    /* Platform geo headers first (lib/visitor-geo.ts, via
       /api/geo/visitor): on Vercel the edge stamps the visitor's
       approximate city on the request itself — no third-party lookup,
       no waiting on an outside provider. Map and strip share this one
       answer, so the globe never centres somewhere the strip calls
       somewhere else. Any failure degrades to the legacy flow, and
       from there to the landing-city pick, exactly as before. */
    fetchVisitorLocation((input, init) => fetch(input, init), geoController.signal)
      .then(loc => {
        if (located || geoController.signal.aborted) return;
        if (loc) {
          located = true;
          setVisitorGeo(loc);
          setHomeLocation({ lat: loc.lat, lng: loc.lng });
        } else {
          legacyLocate();
        }
      })
      .catch(() => { if (!located && !geoController.signal.aborted) legacyLocate(); });

    /* Account preferences (settings items 6+7): a signed-in user's
       saved home location beats IP geolocation, and their default
       layers start on. PreferencesProvider seeds both into
       localStorage on every load; returning visitors are covered
       synchronously right here. A deep link (?camera=…) still wins —
       autoLocateCancelled is already set in that case. An explicit
       ?layers= URL param also wins over the saved default layers. */
    const applyDefaultLayers = (layers: unknown) => {
      if (!Array.isArray(layers) || layers.length === 0 || p.get('layers')) return;
      setActiveLayers(prev => {
        const next = { ...prev };
        for (const k of layers) {
          if (typeof k === 'string' && k in next) (next as any)[k] = true;
        }
        return next;
      });
    };
    try {
      const homeRaw = localStorage.getItem('we_home_location');
      if (homeRaw && !autoLocateCancelled.current) {
        const home = JSON.parse(homeRaw) as { lat?: number; lng?: number };
        if (typeof home.lat === 'number' && typeof home.lng === 'number') {
          located = true;
          setHomeLocation({ lat: home.lat, lng: home.lng });
        }
      }
      applyDefaultLayers(JSON.parse(localStorage.getItem('we_default_layers') ?? '[]'));
    } catch { /* preferences are an enhancement, never a blocker */ }
    /* First-ever load: the seed lands a moment later, announced by
       PreferencesProvider. Honour it unless the user has already
       taken the camera over (the cancel flag) — home flies directly,
       since the splash fly-to has already consumed homeLocation. */
    const onPrefsLoaded = (e: Event) => {
      const prefs = (e as CustomEvent).detail as { homeLat?: number | null; homeLng?: number | null; defaultLayers?: string[] } | undefined;
      if (!prefs) return;
      applyDefaultLayers(prefs.defaultLayers);
      if (
        typeof prefs.homeLat === 'number' && typeof prefs.homeLng === 'number' &&
        !autoLocateCancelled.current
      ) {
        located = true;
        setFlyToLocation({ lat: prefs.homeLat, lng: prefs.homeLng, zoom: 8, duration: 3500, ts: Date.now() });
      }
    };
    window.addEventListener('we:preferences-loaded', onPrefsLoaded);

    return () => {
      clearTimeout(geoGiveUp);
      geoController.abort();
      window.removeEventListener('pointerdown', cancelAutoLocate);
      window.removeEventListener('keydown', cancelAutoLocate);
      window.removeEventListener('we:preferences-loaded', onPrefsLoaded);
    };
  }, []);

  // URL state: persist active layers only (lat/lon comes from IP geolocation on each load)
  const urlTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (urlTimer.current) clearTimeout(urlTimer.current);
    urlTimer.current = setTimeout(() => {
      const active = Object.entries(activeLayers).filter(([,v]) => v).map(([k]) => k).join(',');
      // Merge into the live query string instead of rebuilding it from
      // scratch: the other params belong to other systems (utm_* first-touch
      // capture, the onboarding QA overrides onb_group/onb_reset, a watched
      // forecast's oi= keeping the address shareable) and must survive this
      // rewrite — rebuilding dropped them all ~1.5s after the layers changed.
      const params = new URLSearchParams(window.location.search);
      params.set('layers', active);
      const qs = params.toString();
      window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`);
    }, 1500);
  }, [activeLayers]);

  // OI focus: clear the globe of the other layers while a forecast draws,
  // and put back exactly what was on when focus ends.
  const [oiFocus, setOiFocus] = useState(false);
  const focusSaved = useRef<typeof activeLayers | null>(null);
  const toggleOiFocus = useCallback(() => {
    const saved = focusSaved.current;
    if (saved) {
      focusSaved.current = null;
      setActiveLayers(saved);
      setOiFocus(false);
      return;
    }
    const KEEP = new Set(['day_night', 'live_clouds', 'terrain_3d', 'terrain_elevation']);
    setActiveLayers(prev => {
      focusSaved.current = prev;
      return Object.fromEntries(Object.entries(prev).map(([k, v]) => [k, KEEP.has(k) ? v : false])) as typeof prev;
    });
    setOiFocus(true);
  }, []);

  // Global Stats Fetch
  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(d => {
        if (d.stats) setGlobalStats(d.stats);
      })
      .catch(console.error);
  }, []);

  /** From Search: open Directions with this place as the destination, and show where it is. */
  const openDirectionsTo = useCallback((p: { label: string; context?: string; lat: number; lng: number; kind?: string }) => {
    setRouteTarget({ ...p, ts: Date.now() });
    setActiveRoute(null);
    setShowDesktopSearch(false);
    setMobilePanel(null);
    setShowDirections(true);
    setFlyToLocation({ lat: p.lat, lng: p.lng, zoom: 14, ts: Date.now() });
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as Element)?.tagName)) return;
      if (e.key === 'f' && !e.ctrlKey) {
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen();
      }
      if (e.key === 'o' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        setOiMode('assist');
        setOiAutoFocus(true);
        if (window.matchMedia('(max-width: 767px)').matches) setMobilePanel('oi');
        else { setShowOi(true); setShowIntel(false); setShowAlerts(false); setShowSpaceCam(false); }
      }
      if (e.key === 'l') setShowLayers(p => !p);
      if (e.key === 'c') setShowScmPanel(p => !p);
      if (e.key === 'i') setShowIntel(p => !p);
      if (e.key === 's') { setShowDesktopSearch(p => !p); setShowIntel(false); setShowAlerts(false); setShowSpaceCam(false); }
      if (e.key === 'r' && !e.ctrlKey && !e.metaKey) setFlyToLocation({ lat: 20, lng: 0, zoom: 2.5, ts: Date.now() });
      if (e.key === 'g') {
        setActiveLayers(prev => ({ ...prev, terrain_elevation: false, terrain_3d: false }));
        setMapProjection(p => p === 'globe' ? 'mercator' : 'globe');
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setShowDesktopSearch(true); setShowIntel(false); setShowAlerts(false); setShowSpaceCam(false);
      }
    };
    const fsHandler = () => setIsFullscreen(!!document.fullscreenElement);
    window.addEventListener('keydown', handler);
    document.addEventListener('fullscreenchange', fsHandler);
    return () => { window.removeEventListener('keydown', handler); document.removeEventListener('fullscreenchange', fsHandler); };
  }, []);

  // Mouse coords + reverse geocode (Zero-Render)
  const handleMouseCoords = useCallback((coords: { lat: number; lng: number }) => {
    mouseCoordsRef.current = coords;
    if (coordsDisplayRef.current) {
      coordsDisplayRef.current.innerText = `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;
    }
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    geocodeTimer.current = setTimeout(async () => {
      if (lastGeocodedPos.current) {
        const d = Math.abs(coords.lat - lastGeocodedPos.current.lat) + Math.abs(coords.lng - lastGeocodedPos.current.lng);
        if (d < 0.5) return; // increased threshold — fewer geocode calls
      }
      const gk = `${coords.lat.toFixed(1)},${coords.lng.toFixed(1)}`; // coarser grid = more cache hits
      if (geocodeCache.current.has(gk)) { setLocationLabel(geocodeCache.current.get(gk)!); lastGeocodedPos.current = coords; return; }
      try {
        /* Our own route, not Nominatim directly: it rounds the coordinate,
           caches the answer for everyone, and holds the app's request budget
           for the service — see lib/nominatim.ts. */
        const res = await fetch(`/api/geo/reverse?lat=${coords.lat}&lng=${coords.lng}`);
        if (res.ok) {
          const d = await res.json();
          const label = d.label || 'Unknown';
          if (geocodeCache.current.size > 500) { const it = geocodeCache.current.keys(); for (let i=0;i<100;i++) { const k = it.next().value; if(k) geocodeCache.current.delete(k); }}
          geocodeCache.current.set(gk, label);
          setLocationLabel(label);
          lastGeocodedPos.current = coords;
        }
      } catch (e) { console.warn('[OSIRIS] Suppressed error:', e instanceof Error ? e.message : e); }
    }, 3000); // 3s debounce (was 1.5s)
  }, []);

  // Region dossier (double right-click)
  const handleRightClick = useCallback(async (coords: { lat: number; lng: number }) => {
    setDossierLoading(true); setRegionDossier(null); setDossierCoords(coords);
    try {
      const res = await fetch(`/api/region-dossier?lat=${coords.lat}&lng=${coords.lng}`);
      if (res.ok) setRegionDossier(await res.json());
    } catch (e) { console.warn('[OSIRIS] Suppressed error:', e instanceof Error ? e.message : e); } finally { setDossierLoading(false); }
  }, []);
  // "Cameras near here" for the dossier — the same shared search
  // (src/lib/nearby-cameras.ts) the traffic road-click and aircraft popups
  // use, run over the page's loaded camera catalogue. Opening a result goes
  // through handleEntityClick, so the free-camera gate applies unchanged.
  const dossierNearbyCameras = useMemo(
    () => (dossierCoords ? findNearestCameras((data as any)?.cameras ?? [], [dossierCoords.lng, dossierCoords.lat]) : []),
    [dossierCoords, data],
  );
  // Entity click handler (hoisted from JSX to comply with Rules of Hooks - Fixes #113)
  const handleEntityClick = useCallback(async (entity: any) => {
    if (entity?.type === 'cctv') {
      // Soft signup gate, Wave 2 ladder edition (BRIEF F4): active Pro
      // subscribers get unlimited cameras. Everyone else climbs the
      // ladder in lib/camera-ladder — 5 free opens, the email step
      // unlocks 10, a free account 15 — and the nudge at each wall
      // offers the next rung, never a jump straight to Pro.
      if (!isPremiumUser) {
        // Wave 2 ladder (BRIEF F4, lib/camera-ladder): the flat base
        // limit is rung 1 now — this visitor's allowance depends on
        // the email unlock (this device) and the free account (the
        // session). The prompt, when one is due, is always the NEXT
        // rung — never a jump straight to Pro.
        let signedIn =
          sessionIdentity?.state === 'free' || sessionIdentity?.state === 'premium';
        const emailUnlocked =
          readLadderRecord(browserLadderStorage())?.emailUnlockedAt != null;
        const prompt = ladderPromptFor({
          opens: getCameraClickCount(),
          signedIn,
          emailUnlocked,
        });
        if (prompt !== null) {
          // Blocked at this rung — but heal before walling: the mount
          // fetch may have raced the session and stranded a Pro user
          // as "free". ONE fresh check at the moment of decision; if
          // it now says Pro, the camera opens with no wall, no click
          // consumed, no bonus spent. An unknown identity heals the
          // same way before it may decide which rung's prompt shows.
          lastEntitlementCheckAt.current = Date.now();
          const check = await checkPremiumEntitlement();
          if (check !== 'active' && (sessionIdentity === null || sessionIdentity.state === 'unknown')) {
            const fresh = await readSessionIdentity();
            setSessionIdentity(fresh);
            signedIn = fresh.state === 'free' || fresh.state === 'premium';
          }
          const action = blockedCameraAction(check, cameraBonus !== null && cameraBonus > 0);
          if (action === 'open') {
            setIsPremiumUser(true);
            trackAnalyticsEvent('camera_open');
            setActiveCamera(entity);
            setCameraEverOpened(true);
            return;
          }
          // Past this visitor's allowance. A signed-in user with
          // bonus opens banked (invite-a-friend, lib/camera-bonus)
          // gets one spent server-side instead — openWithCameraBonus
          // falls back to the Pro-rung wall when the server says the
          // bonus is gone.
          if (action === 'bonus') {
            openWithCameraBonus(entity);
            return;
          }
          // Recompute with the healed identity, so a visitor who just
          // signed in meets the prompt for the rung they actually
          // hold. The interrupted camera is remembered: an email
          // unlock re-opens it (see handleLadderEmailUnlocked).
          const rung =
            ladderPromptFor({ opens: getCameraClickCount(), signedIn, emailUnlocked }) ?? prompt;
          pendingGateCameraRef.current = entity;
          setGateRung(rung);
          if (rung === 'pro') trackAnalyticsEvent('upgrade_gate_shown');
          setShowCameraSignup(true);
          return;
        }
        recordCameraClick();
      }
      trackAnalyticsEvent('camera_open');
      setActiveCamera(entity);
      setCameraEverOpened(true);
      return;
    }
    if (entity?.type === 'live_news' && entity.url) {
      setLiveFeedUrl(entity.url);
      setLiveFeedName(entity.name);
      setLiveFeedEmbedAllowed(entity.embed_allowed !== false);
    }
  }, [isPremiumUser, cameraBonus, openWithCameraBonus, sessionIdentity]);

  /* Ladder email step succeeded: the +5 unlock applies instantly
     (the device-local record — written BEFORE the retry, and the
     gate reads that record fresh, so the retry cannot see a stale
     flag), the wall closes, and the camera it interrupted opens
     right away — the ladder is never a dead end. */
  const handleLadderEmailUnlocked = useCallback(() => {
    markEmailUnlocked(browserLadderStorage());
    setShowCameraSignup(false);
    const pending = pendingGateCameraRef.current;
    pendingGateCameraRef.current = null;
    if (pending) void handleEntityClick(pending);
  }, [handleEntityClick]);

  // ── Camera deep link (?camera=<id>, lib/camera-share.ts) ──
  // A shared link resolves against the catalogue as it loads — the world
  // arrives in region shards, so the linked camera's region may land in a
  // later batch than the first. Found: fly there and open it through
  // handleEntityClick, the same gated, counted path a map click takes.
  // Never found once the catalogue has finished loading: the id is stale,
  // and the honest landing is the plain globe — no error, no dead viewer.
  const sharedCameraId = useMemo(
    () => (typeof window !== 'undefined' ? sharedCameraIdFromSearch(window.location.search) : null),
    [],
  );
  const sharedCameraSettled = useRef(false);
  const sharedCameraLookupTried = useRef(false);
  useEffect(() => {
    if (!sharedCameraId || sharedCameraSettled.current) return;
    const cam: any = findCameraById(dataRef.current.cameras ?? [], sharedCameraId);
    if (cam) {
      sharedCameraSettled.current = true;
      setFlyToLocation({ lat: cam.lat, lng: cam.lng, zoom: 12, ts: Date.now() });
      handleEntityClick({
        type: 'cctv', id: cam.id, name: cam.name, city: cam.city, country: cam.country,
        source: cam.source, feed_url: cam.feed_url, stream_url: cam.stream_url,
        stream_type: cam.stream_type, external_url: cam.external_url, lat: cam.lat, lng: cam.lng,
      });
      return;
    }
    if (!camerasLoading) {
      /* The catalogue is viewport-first now, so a linked camera may sit
         in a region this visitor never loaded. Resolve it by id from the
         server (one small request) before calling the link stale. */
      if (!sharedCameraLookupTried.current) {
        sharedCameraLookupTried.current = true;
        void fetchCameraById(sharedCameraId).then(record => {
          if (sharedCameraSettled.current) return;
          if (!record) { sharedCameraSettled.current = true; return; }
          dataRef.current = {
            ...dataRef.current,
            cameras: mergeCameraCatalog(dataRef.current.cameras ?? [], [record]),
          };
          setDataVersion(value => value + 1);
        });
        return;
      }
      sharedCameraSettled.current = true;
    }
  }, [sharedCameraId, dataVersion, camerasLoading, handleEntityClick]);

  /* F11 share-link loop-in: when the camera a shared link opened is
     left behind — viewer closed, or a different camera opened — the
     visitor has started exploring on their own, and the ONE soft
     signup prompt may show (lib/camera-ladder's shareAwayShouldShow:
     once per session, anonymous only, never stacked, never on an
     excluded surface). The shared view itself is never delayed or
     interrupted: this can only fire after it was watched and left. */
  const prevActiveCameraRef = useRef<any>(null);
  useEffect(() => {
    const prev = prevActiveCameraRef.current;
    prevActiveCameraRef.current = activeCamera;
    if (!sharedCameraId || !prev) return;
    if (String(prev.id) !== sharedCameraId) return;
    if (String(activeCamera?.id ?? '') === sharedCameraId) return;
    const session = browserSessionStorage();
    const otherPromptOpen = showCameraSignup || timedPopupVisible;
    const should = shareAwayShouldShow({
      arrivedViaShare: true,
      sharedCameraOpened: true,
      navigatedAway: true,
      shownThisSession: readSessionFlag(session, SHARE_PROMPT_SESSION_KEY),
      otherPromptOpen,
      pathname: window.location.pathname,
      signedIn: sessionIdentity?.state === 'free' || sessionIdentity?.state === 'premium',
      premium: isPremiumUser,
    });
    if (should) {
      writeSessionFlag(session, SHARE_PROMPT_SESSION_KEY);
      trackAnalyticsEvent('share_link_prompt_shown');
      setShowSharePrompt(true);
    } else if (otherPromptOpen) {
      // A stronger prompt was already up at the away-moment — the
      // visitor was prompted; don't bank a second one for later.
      writeSessionFlag(session, SHARE_PROMPT_SESSION_KEY);
    }
  }, [activeCamera, sharedCameraId, showCameraSignup, timedPopupVisible, sessionIdentity, isPremiumUser]);

  // ── First-camera assist (onboarding "watch a live camera") ──
  // Onboarding's welcome panel and tour camera step dispatch
  // we:open-camera with a featured camera id (lib/onboarding/
  // first-camera.ts — the reverse of the we:flight-selected pattern).
  // The open resolves through the exact deep-link path above: fly there,
  // then handleEntityClick, so the free-camera gate, the open counting
  // and the analytics all apply as they do to a map click. An id that
  // never resolves once the catalogue has loaded is a quiet no-op —
  // the visitor keeps the plain globe, as with a stale share link.
  const [assistedCameraId, setAssistedCameraId] = useState<string | null>(null);
  const assistedCameraSettled = useRef(false);
  const assistedCameraLookupTried = useRef(false);
  useEffect(() => {
    const onOpenCamera = (e: Event) => {
      const id = (e as CustomEvent<{ id?: unknown }>).detail?.id;
      if (typeof id === 'string' && id) {
        assistedCameraSettled.current = false;
        assistedCameraLookupTried.current = false;
        setAssistedCameraId(id);
      }
    };
    window.addEventListener('we:open-camera', onOpenCamera);
    return () => window.removeEventListener('we:open-camera', onOpenCamera);
  }, []);
  useEffect(() => {
    if (!assistedCameraId || assistedCameraSettled.current) return;
    const cam: any = findCameraById(dataRef.current.cameras ?? [], assistedCameraId);
    if (cam) {
      assistedCameraSettled.current = true;
      setFlyToLocation({ lat: cam.lat, lng: cam.lng, zoom: 12, ts: Date.now() });
      handleEntityClick({
        type: 'cctv', id: cam.id, name: cam.name, city: cam.city, country: cam.country,
        source: cam.source, feed_url: cam.feed_url, stream_url: cam.stream_url,
        stream_type: cam.stream_type, external_url: cam.external_url, lat: cam.lat, lng: cam.lng,
      });
      return;
    }
    if (!camerasLoading) {
      /* Same by-id resolution as the deep link above: the featured
         camera's region may simply not be loaded on this visitor yet. */
      if (!assistedCameraLookupTried.current) {
        assistedCameraLookupTried.current = true;
        void fetchCameraById(assistedCameraId).then(record => {
          if (assistedCameraSettled.current) return;
          if (!record) { assistedCameraSettled.current = true; return; }
          dataRef.current = {
            ...dataRef.current,
            cameras: mergeCameraCatalog(dataRef.current.cameras ?? [], [record]),
          };
          setDataVersion(value => value + 1);
        });
        return;
      }
      assistedCameraSettled.current = true;
    }
  }, [assistedCameraId, dataVersion, camerasLoading, handleEntityClick]);

  // ── Entity deep links (?quake= / ?fire= / ?storm= / ?flight= / ?event=) ──
  // The universal share links (lib/share/links.ts) — sibling of the
  // camera deep link above. A shared entity lights its layer, flies
  // there, and reopens through OsirisMap's own popup (we:open-entity;
  // the map owns those popup builders and, for flights and conflict
  // markers, the only copy of the data). An id that never resolves
  // before the deadline is stale: the visitor keeps the plain globe,
  // no error — the same contract as a stale camera link.
  const sharedEntity = useMemo(
    () => (typeof window !== 'undefined' ? entityRefFromSearch(window.location.search) : null),
    [],
  );
  const sharedEntitySettled = useRef(false);
  const sharedEntityLayerLit = useRef(false);
  const sharedEntityDeadline = useRef(0);
  useEffect(() => {
    if (!sharedEntity || sharedEntity.kind === 'camera' || sharedEntitySettled.current) return;
    if (!sharedEntityDeadline.current) sharedEntityDeadline.current = Date.now() + 12000;
    const layerByKind: Record<string, string | undefined> = {
      quake: 'earthquakes', fire: 'fires', storm: 'hurricanes', event: 'global_incidents',
    };
    const layer = layerByKind[sharedEntity.kind];
    if (layer && !sharedEntityLayerLit.current) {
      sharedEntityLayerLit.current = true;
      setActiveLayers(prev => ({ ...prev, [layer]: true }));
    }
    const d: any = dataRef.current;
    let coords: { lat: number; lng: number; zoom: number } | null = null;
    if (sharedEntity.kind === 'quake') {
      const eq: any = findQuakeByShareId(d.earthquakes ?? [], sharedEntity.id);
      if (eq) coords = { lat: eq.lat, lng: eq.lng, zoom: 7 };
    } else if (sharedEntity.kind === 'fire') {
      const f: any = findByCoordShareId(d.fires ?? [], sharedEntity.id);
      if (f) coords = { lat: f.lat, lng: f.lng, zoom: 9 };
    } else if (sharedEntity.kind === 'storm') {
      const s = findStormFeatureByShareId(d.hurricane_features ?? [], sharedEntity.id);
      const c = (s as any)?.geometry?.coordinates;
      if (Array.isArray(c)) coords = { lat: c[1], lng: c[0], zoom: 6 };
    } else if (sharedEntity.kind === 'event') {
      const ev: any = findByCoordShareId(d.gdelt ?? [], sharedEntity.id)
        ?? findByCoordShareId(d.gdelt_events ?? [], sharedEntity.id);
      if (ev) coords = { lat: ev.lat, lng: ev.lng, zoom: 6 };
    }
    if (coords) {
      sharedEntitySettled.current = true;
      setFlyToLocation({ lat: coords.lat, lng: coords.lng, zoom: coords.zoom, ts: Date.now() });
      window.dispatchEvent(new CustomEvent('we:open-entity', {
        detail: { kind: sharedEntity.kind, id: sharedEntity.id },
      }));
      return;
    }
    if (sharedEntity.kind === 'flight') {
      // No page-side dataset exists for flights: offer it to the map
      // on every data tick until the deadline — the map dedupes once
      // it has opened the aircraft.
      window.dispatchEvent(new CustomEvent('we:open-entity', {
        detail: { kind: 'flight', id: sharedEntity.id },
      }));
      if (Date.now() > sharedEntityDeadline.current) sharedEntitySettled.current = true;
      return;
    }
    if (Date.now() > sharedEntityDeadline.current) {
      // Give the map one last chance (conflict markers live only in
      // the map's data), then settle — a stale link lands plainly.
      sharedEntitySettled.current = true;
      window.dispatchEvent(new CustomEvent('we:open-entity', {
        detail: { kind: sharedEntity.kind, id: sharedEntity.id },
      }));
    }
  }, [sharedEntity, dataVersion]);

  // ── Camera picked in search ──
  // Same path as the deep link above: fly there, then open through
  // handleEntityClick so the free-camera gate and counting apply exactly
  // as they do to a map click. Search matches over the catalogue state
  // itself (lib/camera-search) — the advanced filters are Pro's, the
  // results are basic search's.
  const openCameraFromSearch = useCallback((cam: any) => {
    setFlyToLocation({ lat: cam.lat, lng: cam.lng, zoom: 12, ts: Date.now() });
    handleEntityClick({
      type: 'cctv', id: cam.id, name: cam.name, city: cam.city, country: cam.country,
      source: cam.source, feed_url: cam.feed_url, stream_url: cam.stream_url,
      stream_type: cam.stream_type, external_url: cam.external_url, lat: cam.lat, lng: cam.lng,
    });
  }, [handleEntityClick]);

  // ── Today in the Sky: a panel row was picked ──
  // Light the row's layer (launches board, satellites, storms, quakes)
  // and fly to the subject — the same setFlyToLocation the alerts and
  // search rows use. On mobile the panel is a sheet over the drawer
  // stack, so any open drawer retires first.
  const locateFromSkyPanel = useCallback((t: SkyLocateTarget) => {
    if (t.layer) setActiveLayers(prev => ({ ...prev, [t.layer as string]: true }));
    setFlyToLocation({ lat: t.lat, lng: t.lng, zoom: t.zoom, ts: Date.now() });
    setMobilePanel(null);
  }, []);

  // ── Drawing / AOI ──
  // OsirisMap already owns the draw interaction and the polygon rendering;
  // this only turns a finished ring into a measured, named, coloured record.
  // Restore drawn areas on load. Work that vanishes on refresh is work the
  // operator will not trust the tool with.
  useEffect(() => {
    try {
      const restored = deserializeShapes(localStorage.getItem(STORAGE_KEY));
      if (restored.length) setDrawnPolygons(restored);
    } catch { /* storage unavailable — start empty */ }
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, serializeShapes(drawnPolygons)); } catch { /* quota or private mode */ }
  }, [drawnPolygons]);

  // ── Tripwires ──
  // Re-sweep every watched AOI whenever live data refreshes and record what
  // changed. Keyed off dataVersion rather than `data` so this runs once per
  // refresh instead of once per render.
  useEffect(() => {
    if (watched.size === 0) return;
    const now = Date.now();
    const fresh: WatchEvent[] = [];
    for (const shape of drawnPolygons) {
      if (!watched.has(shape.id)) continue;
      const ring = queryRing(shape);
      if (!ring) continue;
      const report = selectInPolygon(ring, dataRef.current as any);
      const prev = watchBaselines.current[shape.id] ?? null;
      const { baseline, events } = diffSweep(shape.id, report, prev, now);
      watchBaselines.current[shape.id] = baseline;
      fresh.push(...events);
    }
    if (fresh.length) setWatchEvents(log => appendEvents(log, fresh));
  }, [dataVersion, watched, drawnPolygons]);

  const toggleWatch = useCallback((id: string) => {
    setWatched(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        // Drop the baseline too, so re-arming starts clean rather than
        // reporting everything that moved while the watch was off.
        delete watchBaselines.current[id];
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleDrawComplete = useCallback((result: DrawResult) => {
    setDrawnPolygons(prev => [toShape(result, prev, prev.length), ...prev]);
    // One shape per arming: staying armed after a finish is how you end up
    // with an accidental second AOI from the click that dismisses the first.
    setDrawMode(null);
    setDrawProgress(null);
  }, []);

  const handleExportGeoJSON = useCallback(() => {
    downloadFile(
      `osiris-aoi-${new Date().toISOString().slice(0, 10)}.geojson`,
      JSON.stringify(shapesToGeoJSON(drawnPolygons), null, 2),
      'application/geo+json',
    );
  }, [drawnPolygons]);

  // ── SHARED FETCH UTILITY (Fixes #107 — single definition, not 3 copies) ──
  /* `skipWhenHidden` is for background polling only — skipping a *user-initiated*
     load (a layer toggle, or first paint in a background tab) leaves the caller
     believing it fetched, so the layer stays empty until a full reload.
     Returns whether data actually landed, so callers can retry. */
  const fetchEndpoint = useCallback(async (
    url: string,
    transform?: (d: any) => any,
    options?: RequestInit,
    { skipWhenHidden = false }: { skipWhenHidden?: boolean } = {},
  ): Promise<boolean> => {
    if (skipWhenHidden && typeof document !== 'undefined' && document.hidden) return false;
    try {
      // Force the browser to bypass its local disk cache for real-time data
      const res = await fetch(url, { ...options, cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        const d = transform ? transform(json) : json;
        dataRef.current = { ...dataRef.current, ...d };
        setDataVersion(v => v + 1);
        setBackendStatus('connected');
        return true;
      }
      return false;
    } catch (e) {
      console.warn('[OSIRIS] Suppressed error:', e instanceof Error ? e.message : e);
      setBackendStatus('error');
      return false;
    }
  }, []);

  // ── FLIGHTS — delta polls against the last applied snapshot ──
  // The route stamps every completed payload with a token; handing the
  // token back (?since=) earns a delta instead of the next ~2.35 MB.
  // Full payloads (first load, stale token, server restart) replace the
  // held snapshot wholesale, exactly as fetchEndpoint('/api/flights')
  // did. A first-paint partial carries no token, so the poll after a
  // partial is a full request and the completed sky replaces it. Any
  // surprise — HTTP error, an unmergeable delta — drops the token so
  // the following poll re-bases instead of compounding a bad state.
  const flightsTokenRef = useRef<string | null>(null);
  const flightsSnapshotRef = useRef<FlightsPayloadLike | null>(null);
  const fetchFlights = useCallback(async (): Promise<boolean> => {
    const held = flightsTokenRef.current;
    try {
      const res = await fetch(held ? `/api/flights?since=${encodeURIComponent(held)}` : '/api/flights', { cache: 'no-store' });
      if (!res.ok) { flightsTokenRef.current = null; setBackendStatus('error'); return false; }
      const json: any = await res.json();
      if (json?.delta === true) {
        const current = flightsSnapshotRef.current;
        const merged = current ? applyFlightsDelta(current, json as FlightsDelta) : null;
        if (!merged) { flightsTokenRef.current = null; return false; }
        flightsSnapshotRef.current = merged;
        flightsTokenRef.current = merged.token ?? null;
        dataRef.current = { ...dataRef.current, ...merged };
        setDataVersion(v => v + 1);
        setBackendStatus('connected');
        return true;
      }
      flightsSnapshotRef.current = json as FlightsPayloadLike;
      flightsTokenRef.current = json?.partial ? null : (typeof json?.token === 'string' ? json.token : null);
      dataRef.current = { ...dataRef.current, ...json };
      setDataVersion(v => v + 1);
      setBackendStatus('connected');
      return true;
    } catch (e) {
      console.warn('[OSIRIS] Flights poll failed:', e instanceof Error ? e.message : e);
      flightsTokenRef.current = null;
      setBackendStatus('error');
      return false;
    }
  }, []);

  // ── PROGRESSIVE DATA LOADING (request-optimized) ──
  useEffect(() => {
    if (!dataBoot) return;
    // Priority 1: Core feeds (always needed for panels)
    const eqUrl = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson';
    const eqTransform = (data: any) => ({ earthquakes: (data.features || []).map((f: any) => ({ id: f.id, lat: f.geometry?.coordinates?.[1] || 0, lng: f.geometry?.coordinates?.[0] || 0, depth: f.geometry?.coordinates?.[2] || 0, magnitude: f.properties?.mag, place: f.properties?.place, time: f.properties?.time, url: f.properties?.url, tsunami: f.properties?.tsunami, type: f.properties?.type, felt: f.properties?.felt, alert: f.properties?.alert })) });
    fetchEndpoint(eqUrl, eqTransform);
    fetchEndpoint('/api/news', newsTransform);
    /* Official warnings — NOAA/NWS, GDACS, NASA EONET. A core feed rather than
       a layer fetch: Live Alerts lists them whether or not the weather layer
       is on, and this is the one thing in the panel a reader may have to act on. */
    fetchEndpoint('/api/weather', d => ({ weather_events: d.events }));
    layerFetchedRef.current.add('weather');
    /* A cold start can time out every upstream quote and return an all-empty
       feed. Waiting a full poll interval to find out leaves the panel blank for
       15 minutes, so retry a few times up-front until instruments actually land. */
    const marketRetries: ReturnType<typeof setTimeout>[] = [];
    const loadMarkets = async (attempt = 0) => {
      await fetchEndpoint('/api/markets', d => ({ markets: d }));
      if ((dataRef.current.markets?.count || 0) === 0 && attempt < 3) {
        marketRetries.push(setTimeout(() => loadMarkets(attempt + 1), 15000));
      }
    };
    const marketTimer = setTimeout(() => loadMarkets(), 800);

    // Priority 2: Space Weather
    const spaceTimer = setTimeout(async () => {
      try {
        const r = await fetch('/api/space-weather');
        if (r.ok) setSpaceWeather(await r.json());
      } catch (e) { console.warn('[OSIRIS] Suppressed error:', e instanceof Error ? e.message : e); }
    }, 5000);

    // Polling — OPTIMIZED intervals to minimize edge requests
    const intervals = [
      setInterval(() => fetchEndpoint(eqUrl, eqTransform, undefined, { skipWhenHidden: true }), 900000),  // 15 min (was 5)
      // 5 min: the route caches each channel for 3, so Telegram sees at most one read per channel per window however many tabs poll.
      setInterval(() => fetchEndpoint('/api/news', newsTransform, undefined, { skipWhenHidden: true }), 300000),
      // 5 min: a warning that has just been issued is the point of the panel.
      setInterval(() => fetchEndpoint('/api/weather', d => ({ weather_events: d.events }), undefined, { skipWhenHidden: true }), 300000),
      setInterval(() => fetchEndpoint('/api/markets', d => ({ markets: d }), undefined, { skipWhenHidden: true }), 900000), // 15 min (was 5)
    ];
    return () => {
      clearTimeout(marketTimer);
      marketRetries.forEach(clearTimeout);
      clearTimeout(spaceTimer);
      intervals.forEach(clearInterval);
    };
  }, [fetchEndpoint, dataBoot]);

  // ── LAYER-AWARE DATA LOADING — only fetch when layer is toggled ON ──
  const layerFetchedRef = useRef<Set<string>>(new Set());
  const cameraCatalogRef = useRef<CameraCatalogHandle | null>(null);
  useEffect(() => {
    if (!dataBoot) return;
    if (!activeLayers.cctv) return;
    setCamerasLoading(true);
    const handle = loadCameraCatalog(cameras => {
      dataRef.current = {
        ...dataRef.current,
        cameras: mergeCameraCatalog(dataRef.current.cameras ?? [], cameras),
      };
      setDataVersion(value => value + 1);
      setBackendStatus('connected');
    }, () => console.warn('[OSIRIS] Camera catalogue load failed; bounded retry scheduled'),
    () => setCamerasLoading(false));
    cameraCatalogRef.current = handle;
    return () => {
      if (cameraCatalogRef.current === handle) cameraCatalogRef.current = null;
      handle.cancel();
    };
  }, [activeLayers.cctv, dataBoot]);

  // ── Viewport fill — the regions in view arrive as the visitor moves ──
  // First paint is the sparse worldwide sample (lib/camera-catalog). From
  // zoom 3 the dots on screen should be the real regional records, so the
  // loader fills the regions under the current bounds; below that the
  // sample carries the planet view and a fill would mostly download
  // regions the visitor is only passing over.
  useEffect(() => {
    if (!activeLayers.cctv || !mapCenter?.bounds) return;
    if (mapView.zoom < 3) return;
    cameraCatalogRef.current?.loadForBounds(mapCenter.bounds);
  }, [mapCenter, mapView.zoom, activeLayers.cctv]);

  // ── Search reach — opening search completes the catalogue index ──
  // Basic camera search matches over the loaded catalogue, so a camera
  // outside this visitor's viewport would be unfindable if loading
  // stopped at the sparse sample. Opening search (desktop panel or the
  // mobile sheet) fills every remaining region; results stream in as
  // the slices land, and the fill is a one-way door — regions stay
  // loaded for the rest of the session.
  useEffect(() => {
    if (showDesktopSearch || mobilePanel === 'search') {
      cameraCatalogRef.current?.ensureFullCatalog();
    }
  }, [showDesktopSearch, mobilePanel]);

  useEffect(() => {
    if (!dataBoot) return;

    // Flights
    if (activeLayers.flights || activeLayers.military || activeLayers.jets || activeLayers.private) {
      if (!layerFetchedRef.current.has('flights')) {
        void fetchFlights();
        layerFetchedRef.current.add('flights');
      }
    }
    // Satellites (any satellite sub-layer triggers fetch)
    const anySatLayer = activeLayers.satellites || activeLayers.sat_comms || activeLayers.sat_military || activeLayers.sat_navigation || activeLayers.sat_earth || activeLayers.sat_science;
    if (anySatLayer && !layerFetchedRef.current.has('satellites')) {
      // Keep the moment the positions were propagated for. The catalogue is
      // fetched once and never re-polled, so by the time an orbit is requested
      // these markers can be a long way out of date — the orbit route needs the
      // marker's epoch to draw a track that still passes through it.
      // The route sends dictionary-encoded v2 rows (see
      // src/lib/satellite-payload.ts); decode back to the row objects the
      // map consumes. The decoder also accepts v1 rows, so a CDN-cached
      // pre-diet body cannot break the layer during a deploy.
      fetchEndpoint('/api/satellites', d => ({ ...d, satellites: decodeSatelliteRows(d), satellites_at: d.timestamp }));
      layerFetchedRef.current.add('satellites');
    }
    // Fires
    if (activeLayers.fires && !layerFetchedRef.current.has('fires')) {
      fetchEndpoint('/api/fires');
      layerFetchedRef.current.add('fires');
    }
    // Maritime
    if (activeLayers.maritime && !layerFetchedRef.current.has('maritime')) {
      fetchEndpoint('/api/maritime', d => ({ maritime_ports: d.ports, maritime_chokepoints: d.chokepoints, maritime_ships: d.ships }));
      layerFetchedRef.current.add('maritime');
    }
    // Balloons
    if (activeLayers.balloons && !layerFetchedRef.current.has('balloons')) {
      fetchEndpoint('/api/balloons', d => ({ balloons: d.balloons }));
      layerFetchedRef.current.add('balloons');
    }
    // Radiation
    if (activeLayers.radiation && !layerFetchedRef.current.has('radiation')) {
      fetchEndpoint('/api/radiation', d => ({ radiation: d.stations }));
      layerFetchedRef.current.add('radiation');
    }
    // Live News
    if (activeLayers.live_news && !layerFetchedRef.current.has('live_news')) {
      fetchEndpoint('/api/live-news', d => ({ live_feeds: d.feeds }));
      layerFetchedRef.current.add('live_news');
    }
    // Weather
    if (activeLayers.weather && !layerFetchedRef.current.has('weather')) {
      fetchEndpoint('/api/weather', d => ({ weather_events: d.events }));
      layerFetchedRef.current.add('weather');
    }
    // Infrastructure
    if (activeLayers.infrastructure && !layerFetchedRef.current.has('infrastructure')) {
      fetchEndpoint('/api/infrastructure', d => ({ infrastructure: d.infrastructure }));
      layerFetchedRef.current.add('infrastructure');
    }
    // Global Incidents (GDELT)
    if (activeLayers.global_incidents && !layerFetchedRef.current.has('gdelt')) {
      fetchEndpoint('/api/gdelt', d => ({ gdelt: d.events }));
      layerFetchedRef.current.add('gdelt');
    }

    // Submarine Cables
    if (activeLayers.cables && !layerFetchedRef.current.has('cables')) {
      (async () => {
        try {
          const ts = Date.now();
      const res = await fetch(`/data/submarine-cables.json?v=${ts}`);
          if (res.ok) {
             const cablesData = await res.json();
             dataRef.current = { ...dataRef.current, submarine_cables: cablesData.features };
             setDataVersion(v => v + 1);
          }
        } catch (e) { console.warn('Cables fetch failed'); }
      })();
      layerFetchedRef.current.add('cables');
    }


    // Live Malware (abuse.ch) is pushed, not fetched — see the SSE subscription below.

    // Botnet C2 infrastructure (abuse.ch Feodo Tracker blocklist)
    if ((activeLayers as any).cyber_attacks && !layerFetchedRef.current.has('cyber_attacks')) {
      fetchEndpoint('/api/cyber-attacks', d => ({ cyber_attacks: d.indicators }));
      layerFetchedRef.current.add('cyber_attacks');
    }

    /* Mark before awaiting so a re-render mid-flight cannot double-fetch, then
       release the mark if nothing landed — otherwise one failed request leaves
       the layer permanently empty. */
    const loadLayerOnce = (key: string, url: string, transform: (d: any) => any) => {
      if (layerFetchedRef.current.has(key)) return;
      layerFetchedRef.current.add(key);
      fetchEndpoint(url, transform).then(ok => {
        if (!ok) layerFetchedRef.current.delete(key);
      });
    };

    // GDELT 2.0 geocoded events
    if ((activeLayers as any).gdelt_events) {
      loadLayerOnce('gdelt_events', '/api/gdelt-events?limit=600', d => ({ gdelt_events: d.events }));
    }

    // Cloudflare Radar — one request backs both layers
    if ((activeLayers as any).cf_outages || (activeLayers as any).cf_attacks) {
      loadLayerOnce('cloudflare_radar', '/api/cloudflare-radar', d => ({
        cf_outages: d.outages ?? [],
        cf_attack_origins: d.attack_origins ?? [],
      }));
    }

    // NIFC WFIGS fire perimeters — polygons beside the FIRMS fire points
    if ((activeLayers as any).fire_perimeters) {
      loadLayerOnce('fire_perimeters', '/api/fire-perimeters', d => ({ fire_perimeters: d.features ?? [] }));
    }

    // NOAA NHC hurricanes — one response backs the storm count + GIS features
    if ((activeLayers as any).hurricanes) {
      loadLayerOnce('hurricanes', '/api/hurricanes', d => ({
        hurricanes: d.storms ?? [],
        hurricane_features: d.features ?? [],
      }));
    }


  }, [activeLayers, dataBoot]);

  // ── LAYER-AWARE POLLING — only poll data for active layers ──
  useEffect(() => {
    if (!dataBoot) return;
    const intervals: ReturnType<typeof setInterval>[] = [];
    const stopFns: (() => void)[] = [];
    if (activeLayers.flights || activeLayers.military || activeLayers.jets || activeLayers.private) {
      intervals.push(setInterval(() => { void fetchFlights(); }, 30000)); // 30s (was 5 min — raw snapshots teleported between polls; the map now blends them, lib/flights/render)
    }

    if (activeLayers.balloons) {
      intervals.push(setInterval(() => fetchEndpoint('/api/balloons', d => ({ balloons: d.balloons })), 300000)); // 5m
    }
    if (activeLayers.radiation) {
      intervals.push(setInterval(() => fetchEndpoint('/api/radiation', d => ({ radiation: d.stations })), 300000)); // 5m
    }
    if ((activeLayers as any).fire_perimeters) {
      intervals.push(setInterval(() => fetchEndpoint('/api/fire-perimeters', d => ({ fire_perimeters: d.features ?? [] })), 300000)); // 5m
    }
    if ((activeLayers as any).hurricanes) {
      intervals.push(setInterval(() => fetchEndpoint('/api/hurricanes', d => ({
        hurricanes: d.storms ?? [],
        hurricane_features: d.features ?? [],
      })), 600000)); // 10m — advisories land every 3–6h
    }
    if (activeLayers.maritime) {
      /* Ten seconds is the cadence a moving vessel needs. The other two thirds
         of this payload — 52 ports and 10 chokepoints — are constants in the
         route, and their congestion is derived from those vessels, so with no
         AIS feed the reply is byte-identical poll after poll: 360 requests an
         hour, per reader, for a fixed document. So the fast rate is earned by
         actually carrying vessels, and otherwise falls back to the five
         minutes every other layer here uses. Rescheduled rather than fixed,
         because the count is read from a ref that no re-render announces. */
      let vesselTimer: ReturnType<typeof setTimeout>;
      let stopped = false;
      const vesselGapMs = () => ((dataRef.current.maritime_ships?.length ?? 0) > 0 ? 10_000 : 300_000);
      const pollMaritime = () => {
        if (stopped) return;
        fetchEndpoint('/api/maritime', d => ({ maritime_ports: d.ports, maritime_chokepoints: d.chokepoints, maritime_ships: d.ships }));
        vesselTimer = setTimeout(pollMaritime, vesselGapMs());
      };
      vesselTimer = setTimeout(pollMaritime, vesselGapMs());
      stopFns.push(() => { stopped = true; clearTimeout(vesselTimer); });
    }
    if ((activeLayers as any).cyber_attacks) {
      intervals.push(setInterval(() => {
        layerFetchedRef.current.delete('cyber_attacks');
        fetchEndpoint('/api/cyber-attacks', d => ({ cyber_attacks: d.indicators }));
        layerFetchedRef.current.add('cyber_attacks');
      }, 300000)); // 5m — a blocklist turns over in hours, not seconds
    }
    return () => { intervals.forEach(clearInterval); stopFns.forEach(stop => stop()); };
  }, [activeLayers, fetchEndpoint, dataBoot]);

  /* ── LIVE MALWARE — pushed over SSE while the layer is on ──
     Detections arrive when URLhaus reports them rather than on a timer, so
     there is no poll interval to tune and no request that re-downloads the
     same rows to discover nothing changed. The connection also carries the
     progressive geolocation fill, which is why a cold server paints the map in
     batches instead of staying empty and then snapping to full. */
  useEffect(() => {
    if (!dataBoot) return;
    if (!activeLayers.malware) return;

    const source = new EventSource('/api/malware/stream');
    // Keyed by address: a host re-reported with a new payload updates its node
    // rather than stacking a second dot on the same coordinates.
    const byIp = new Map<string, LiveDetection>();
    // The server sends `status` at the end of every poll, so the first one
    // marks the end of the initial fill — anything after it is genuinely new
    // and worth drawing attention to.
    let filled = false;

    const commit = () => {
      dataRef.current = { ...dataRef.current, malware_threats: [...byIp.values()] };
      setDataVersion(v => v + 1);
    };

    source.onmessage = ev => {
      try {
        const event = JSON.parse(ev.data);
        if (event.type === 'snapshot') {
          byIp.clear();
          for (const d of event.detections) byIp.set(d.ip, d);
          commit();
        } else if (event.type === 'detections') {
          // Only a first sighting is an arrival. An existing host that served
          // another payload arrives with fresh:false and keeps whatever beacon
          // state it already had, so it does not re-flag itself as new.
          const beacon = filled && event.fresh;
          for (const d of event.detections) {
            byIp.set(d.ip, beacon ? { ...d, detected_at: Date.now() } : { ...d, detected_at: byIp.get(d.ip)?.detected_at });
          }
          commit();
        } else if (event.type === 'status') {
          filled = true;
          // Hosts that have gone dark since the last poll. The store prunes
          // these; without mirroring it here the map would only ever grow.
          if (event.retired?.length) {
            for (const ip of event.retired) byIp.delete(ip);
            commit();
          }
        }
        setBackendStatus('connected');
      } catch {
        // One malformed frame must not tear down the subscription.
      }
    };

    /* EventSource reconnects on its own, firing `error` on each attempt, and
       the store replays a snapshot on connect so a drop self-heals. Only a
       readyState of CLOSED means it has given up — reporting the transient
       ones would flag the backend as down every time a connection recycles. */
    source.onopen = () => setBackendStatus('connected');
    source.onerror = () => {
      if (source.readyState === EventSource.CLOSED) setBackendStatus('error');
    };

    return () => source.close();
  }, [activeLayers.malware, dataBoot]);

  // CCTV: loaded once on layer toggle via layerFetchedRef (no viewport polling)

  // Reactive layer fetch: handled by layerFetchedRef above (no duplicate)

  // ── OSIRIS SDK — Intelligence Fusion Layer ──
  // Produces node coordinates for the SDK network mesh visualization.
  // Does NOT duplicate existing layer visuals — SDK layer is LINES ONLY.
  // Cameras are excluded — they have their own dedicated layer.
  useEffect(() => {
    const anyActive = activeLayers.sdk_sea || activeLayers.sdk_air || activeLayers.sdk_naval;
    if (!anyActive) {
      dataRef.current = { ...dataRef.current, sdk_entities: [] };
      return;
    }

    const sdkEntities: any[] = [];

    // Air domain (nodes only — no visual duplication)
    const allFlights = [
      ...(data.commercial_flights || []),
      ...(data.private_flights || []),
      ...(data.private_jets || []),
      ...(data.military_flights || []),
    ];
    // Sample flights to keep it clean (every Nth)
    const flightStep = Math.max(1, Math.floor(allFlights.length / 60));
    for (let i = 0; i < allFlights.length; i += flightStep) {
      const f = allFlights[i];
      if (!f.lat || !f.lng) continue;
      sdkEntities.push({
        type: 'Feature', geometry: { type: 'Point', coordinates: [f.lng, f.lat] },
        properties: { domain: 'AIR', name: f.callsign?.trim() || 'TRACK', source: 'ADS-B / OpenSky' },
      });
    }

    // Sea domain
    const ships = data.maritime_ships || [];
    const shipStep = Math.max(1, Math.floor(ships.length / 60));
    for (let i = 0; i < ships.length; i += shipStep) {
      const s = ships[i];
      if (!s.lat || !s.lng) continue;
      sdkEntities.push({
        type: 'Feature', geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
        properties: { domain: 'SEA', name: s.name || `MMSI-${s.mmsi}`, source: 'AIS Stream' },
      });
    }

    // Events — Earthquakes
    if (data.earthquakes?.length) {
      for (const eq of data.earthquakes) {
        if (!eq.lat || !eq.lng) continue;
        sdkEntities.push({
          type: 'Feature', geometry: { type: 'Point', coordinates: [eq.lng, eq.lat] },
          properties: { domain: 'LAND', name: `M${eq.magnitude} ${eq.place || ''}`, source: 'USGS' },
        });
      }
    }

    // GDELT events
    if (data.gdelt?.length) {
      for (const g of data.gdelt) {
        if (!g.lat || !g.lng) continue;
        sdkEntities.push({
          type: 'Feature', geometry: { type: 'Point', coordinates: [g.lng, g.lat] },
          properties: { domain: 'INTEL', name: g.name || 'GDELT Event', source: 'GDELT Project' },
        });
      }
    }

    // News intel
    if (data.news?.length) {
      for (const n of data.news) {
        if (!n.coords || n.coords.length < 2) continue;
        sdkEntities.push({
          type: 'Feature', geometry: { type: 'Point', coordinates: [n.coords[1], n.coords[0]] },
          properties: { domain: 'INTEL', name: n.title || 'SIGINT', source: n.source || 'RSS Feed' },
        });
      }
    }

    dataRef.current = { ...dataRef.current, sdk_entities: sdkEntities };
  }, [dataVersion, activeLayers.sdk_sea, activeLayers.sdk_air, activeLayers.sdk_naval]);

  const totalFlights = useMemo(() => (
    (data.commercial_flights?.length||0)+(data.private_flights?.length||0)+(data.private_jets?.length||0)+(data.military_flights?.length||0)
  ), [data.commercial_flights, data.private_flights, data.private_jets, data.military_flights]);


  return (
    <>
    {!skipHero && <CinematicHero />}
    <main className="fixed inset-0 w-full h-full bg-[var(--bg-void)] overflow-hidden">

      {/* ── SPLASH ── */}
      <AnimatePresence onExitComplete={() => setSplashGone(true)}>
        {showSplash && (
          <motion.div
            initial={{ opacity: 1 }}
            // A slight push-through as it fades: the splash gives way to the globe
            // behind it instead of just dissolving.
            exit={{ opacity: 0, scale: 1.04 }}
            transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
            className="absolute inset-0 z-[999] flex flex-col items-center justify-center overflow-hidden"
            style={{ background: 'radial-gradient(ellipse at center, #0a0a14 0%, var(--bg-void) 70%)' }}
          >
            {/* ── Scanline CRT overlay ── */}
            <div className="absolute inset-0 pointer-events-none z-[1]" style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(212,175,55,0.015) 2px, rgba(212,175,55,0.015) 4px)',
              animation: 'splashScanDrift 8s linear infinite',
            }} />

            {/* ── Version badge — top-left ── */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="absolute top-6 left-6 z-[2] font-mono text-[11px] tracking-[0.3em] text-[var(--gold-primary)]"
            >
              {APP_VERSION}
            </motion.div>



            {/* ── WorldEye logo ── */}
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="relative z-[2] mb-8"
            >
              <img
                src="/worldeye-logo.png?v=4"
                alt="WorldEye"
                width={600}
                height={570}
                className="w-64 md:w-80 h-auto"
                style={{ filter: 'drop-shadow(0 0 40px rgba(0,150,255,0.35))' }}
              />
            </motion.div>

            {/* ── Subtitle — typewriter reveal ── */}
            <div className="overflow-hidden mb-8 z-[2]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ delay: 1.2, duration: 0.8, ease: 'easeInOut' }}
                className="overflow-hidden whitespace-nowrap"
              >
                <p className="text-[11px] md:text-[10px] font-mono tracking-[0.5em] text-[var(--gold-primary)]" style={{ opacity: 0.8 }}>
                  GLOBAL INTELLIGENCE PLATFORM
                </p>
              </motion.div>
            </div>

            {/* ── Multi-stage progress bar ── */}
            <div className="w-64 md:w-80 z-[2]">
              {/* Thin progress track */}
              <div className="relative w-full h-[2px] rounded-full overflow-hidden" style={{ background: 'rgba(212,175,55,0.1)' }}>
                <motion.div
                  initial={{ width: '0%' }}
                  animate={{ width: SPLASH_PROGRESS[splashStage] }}
                  transition={{ duration: 0.55, delay: splashStage === 0 ? 0.5 : 0, ease: 'easeInOut' }}
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ background: 'linear-gradient(90deg, var(--gold-primary), var(--cyan-primary), var(--gold-primary))', boxShadow: '0 0 12px rgba(212,175,55,0.4)' }}
                />
              </div>

              {/* Status message — one line, swapped as each stage is reached */}
              <div className="mt-3 h-4 flex items-center justify-center">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={splashStage}
                    initial={{ opacity: 0, y: 3 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -3 }}
                    transition={{ duration: 0.18, delay: splashStage === 0 ? 0.5 : 0 }}
                    className="text-[10px] font-mono tracking-[0.25em]"
                    style={{ color: splashStage === 3 ? 'var(--cyan-primary)' : 'var(--text-muted)' }}
                  >
                    {SPLASH_STAGES[splashStage]}
                  </motion.span>
                </AnimatePresence>
              </div>
            </div>

            {/* ── Decorative grid lines ── */}
            <div className="absolute inset-0 pointer-events-none z-[0]" style={{ opacity: 0.03 }}>
              <div className="absolute inset-0" style={{
                backgroundImage: 'linear-gradient(rgba(212,175,55,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,55,0.5) 1px, transparent 1px)',
                backgroundSize: '60px 60px',
              }} />
            </div>

            {/* ── Corner frame accents ── */}
            {[
              { t: '10px', l: '10px', bw: '2px 0 0 2px' },
              { t: '10px', r: '10px', bw: '2px 2px 0 0' },
              { b: '10px', l: '10px', bw: '0 0 2px 2px' },
              { b: '10px', r: '10px', bw: '0 2px 2px 0' },
            ].map((pos, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.3 }}
                transition={{ delay: 0.8 + i * 0.1, duration: 0.5 }}
                className="absolute w-8 h-8 z-[2]"
                style={{ top: pos.t, bottom: pos.b, left: pos.l, right: pos.r, borderWidth: pos.bw, borderStyle: 'solid', borderColor: 'var(--gold-primary)' }}
              />
            ))}



            {/* ── Inline keyframe for scanline drift ── */}

          </motion.div>
        )}
      </AnimatePresence>



      {/* ── MAP ──
          The wrapper MUST be full-bleed positioned: the map container inside
          it is absolute inset-0 with a percentage height, and inside a static
          wrapper that percentage never resolves — the container collapses to
          0px tall, MapLibre falls back to a 400x300 canvas, and its own
          overflow:hidden clips that canvas away entirely (the black-globe
          bug: app frame renders, globe invisible, worst on iOS WebViews
          where the load-time resize rescue never lands). */}
      <div data-globe-section className="absolute inset-0">
      <ErrorBoundary name="Map">
        <OsirisMap 
          key={osirisTheme}
          data={data} 
          activeLayers={globeActiveLayers}
          projection={mapProjection === 'mercator' ? 'mercator' : 'globe'}
          terrainEnabled={activeLayers.terrain_elevation && mapProjection === 'globe'}
          terrainFocus={terrainFocus}
          terrainRetry={terrainRetry}
          onTerrainStatusChange={setTerrainStatus}
          mapStyle={mapStyle === 'satellite' ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}' : 'dark'}
          basemapMode={basemapMode}
          onBasemapModeChange={setBasemapMode}
          satelliteOn={mapStyle === 'satellite'}
          satelliteLocked={!isPremiumUser}
          onSatelliteToggle={handleSatelliteToggle}
          onEntityClick={handleEntityClick} 
          onMouseCoords={handleMouseCoords} 
          onRightClick={handleRightClick} 
          onViewStateChange={setMapView}
          onReady={() => setMapReady(true)}
          flyToLocation={flyToLocation}
          alertPinIds={pinnedAlertIds}
          sweepData={sweepData}
          scanTargets={scanTargets}
          demoMode={demoMode}
          theme={osirisTheme}
          arcgisLayers={arcgisLayers.filter(l => l.visible).map(l => ({ id: l.id, title: l.title, geojson: l.geojson, color: l.color, opacity: l.opacity }))}
          onMapCenter={setMapCenter}
          route={activeRoute}
          userLocation={
            navSession && navProgress
              ? { lat: navProgress.snapped[1], lng: navProgress.snapped[0], accuracy: liveLocation?.accuracy, heading: liveLocation?.heading }
              : liveLocation
          }
          followUser={followUser}
          onFollowInterrupt={() => setFollowUser(false)}
          navigating={Boolean(navSession)}
          drawMode={drawMode}
          onDrawProgress={setDrawProgress}
          drawCommand={drawCommand}
          onDrawCancel={() => { setDrawMode(null); setDrawProgress(null); }}
          onDrawComplete={handleDrawComplete}
          drawnPolygons={drawnPolygons}
          aircraftAirports={aircraftAirports}
          onOiGlobe={handleOiGlobe}
          onOiSelect={handleOiSelect}
          onOiHover={setOiHover}
          onOiFollow={setOiFollowing}
          oiHighlight={oiHighlight}
          sensorEffect={sensorEffect}
          onSensorEffectChange={setSensorEffect}
        />
      </ErrorBoundary>
      </div>

      {/* ── OI: what the pointer is over on the globe ── */}
      {oiHover && !isMobile && (
        <div
          className="fixed z-[950] pointer-events-none max-w-[300px] rounded-lg border border-[var(--border-primary)] bg-[rgba(12,14,26,0.94)] backdrop-blur-xl px-3 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.6)]"
          style={{ left: Math.min(oiHover.x + 14, (typeof window !== 'undefined' ? window.innerWidth : 1920) - 314), top: oiHover.y + 16 }}
        >
          <div className="text-[11.5px] font-medium leading-snug text-[var(--text-heading)]">{oiHover.title}</div>
          {oiHover.detail && <div className="mt-0.5 text-[10.5px] leading-snug text-[var(--text-secondary)]">{oiHover.detail}</div>}
          <div className="mt-1 text-[8.5px] font-mono tracking-[0.18em] text-[var(--gold-primary)]">CLICK TO OPEN</div>
        </div>
      )}

      {/* ── DIRECTIONS — opens beside the right-hand tool rail, under the top bar ── */}
      <div
        className={`absolute ${isMobile ? 'top-3' : 'top-[64px]'} z-[400] w-[min(92vw,384px)] pointer-events-auto`}
        style={isMobile ? { left: '50%', transform: 'translateX(-50%)' } : { right: '56px' }}
      >
        {navSession ? (
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
            <NavigationView
              key={navSession.key}
              route={navSession.route}
              destinationLabel={navSession.label}
              fix={liveLocation}
              positionIssue={liveLocation ? null : navGeoIssue}
              onRetryPosition={() => setNavWatchNonce((n) => n + 1)}
              onProgress={setNavProgress}
              following={followUser}
              onRecenter={() => setFollowUser(true)}
              onExit={() => { setNavSession(null); setNavProgress(null); setFollowUser(false); }}
              onReroute={async (fromPt) => {
                // Re-plan from where the driver actually is, to the same destination.
                const dest = navSession.route.geometry.coordinates.at(-1)!;
                try {
                  const res = await fetch(
                    `/api/directions?from=${fromPt.lat},${fromPt.lng}&to=${dest[1]},${dest[0]}&mode=auto`,
                  );
                  const data = await res.json();
                  if (res.ok && !data.error) {
                    setNavSession((n) => (n ? { ...n, route: data, key: Date.now() } : n));
                    setActiveRoute({ ...data, from: fromPt, to: { lat: dest[1], lng: dest[0] } });
                  }
                } catch { /* keep the old route rather than dropping guidance */ }
              }}
            />
          </motion.div>
        ) : null}

        {/* The planner stays mounted underneath a running session: unmounting it
            would discard the route you are driving, so ending guidance would
            drop you into an empty form instead of back onto your route. */}
        {showDirections && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: navSession ? 0 : 1, y: 0 }}
            className={navSession ? 'pointer-events-none h-0 overflow-hidden' : ''}
            aria-hidden={Boolean(navSession)}
          >
            <DirectionsBar
              key={routeTarget?.ts ?? 'plan'}
              initialTo={routeTarget}
              center={mapCenter ? { lat: mapCenter.lat, lng: mapCenter.lng } : null}
              onRoute={(r) => setActiveRoute(r)}
              onLiveLocation={setLiveLocation}
              onFollowChange={setFollowUser}
              onActiveSegment={(seg) => setActiveRoute((r) => (r ? { ...r, activeSegment: seg } : r))}
              onStartNavigation={(r, label) => {
                setNavSession({ route: r, label, key: Date.now() });
                setFollowUser(true);
                // No fix yet: preview the route from its own start point
                // until the session's watch lands a real one. The view
                // labels this a preview — it is never drawn as the driver.
                if (!liveLocation) {
                  const start = r.geometry?.coordinates?.[0];
                  if (start) setFlyToLocation({ lat: start[1], lng: start[0], zoom: 15, ts: Date.now() });
                }
              }}
              onLocate={(lat, lng, zoom) => setFlyToLocation({ lat, lng, zoom, ts: Date.now() })}
              onClose={() => { setShowDirections(false); setActiveRoute(null); setRouteTarget(null); }}
            />
          </motion.div>
        )}

        {/* ── CAMERAS ON THIS ROUTE — live corridor feeds (Pro), under
            the planner / guidance while a route is plotted. The panel
            asks for the full catalogue itself; the corridor maths and
            the gate live in lib/route-cameras + the component. ── */}
        {(showDirections || navSession) && activeRoute?.geometry && (
          <RouteCameras
            geometry={activeRoute.geometry}
            cameras={data.cameras}
            catalogueSettled={!camerasLoading}
            isPro={isPremiumUser}
            onNeedCatalog={() => cameraCatalogRef.current?.ensureFullCatalog()}
          />
        )}
      </div>

      {/* ── SEARCH — a spotlight at the top of the map: places, addresses, coordinates ── */}
      <AnimatePresence>
        {showDesktopSearch && !isMobile && (
          <div data-hud className="absolute top-[92px] left-1/2 -translate-x-1/2 z-[450] w-[min(560px,calc(100vw-180px))] pointer-events-auto">
            <motion.div initial={{ opacity: 0, y: -8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.98 }} transition={{ duration: 0.16 }}>
              <SearchBar center={mapCenter} onClose={() => setShowDesktopSearch(false)} onDirections={openDirectionsTo}
                cameras={data.cameras ?? []} isPro={isPremiumUser} onOpenCamera={openCameraFromSearch}
                onLocate={(lat, lng, zoom) => setFlyToLocation({ lat, lng, zoom, ts: Date.now() })} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      {/* ── FLIGHT WATCH ── */}
      {watchedFlights.length > 0 && (
        <motion.div
          initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
          className="absolute top-3 z-[380] w-[min(92vw,290px)] pointer-events-auto
                     max-h-[calc(100vh-180px)] overflow-y-auto styled-scrollbar"
          style={{ left: isMobile ? '12px' : '120px' }}
        >
          <FlightWatchPanel
            watched={watchedFlights}
            telemetry={watchTelemetry}
            onRemove={removeWatched}
            onLocate={(lat, lng) => setFlyToLocation({ lat, lng, zoom: 8, ts: Date.now() })}
            onDetail={handleAircraftDetail}
          />
        </motion.div>
      )}

      {/* ── SCALE BAR (desktop) ── */}
      <motion.div
        data-hud
        initial={{ opacity: 0, y: 20 }} animate={revealed ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }} transition={hudIn(0.45)}
        className="absolute bottom-[75px] md:bottom-[100px] z-[200] pointer-events-none"
        style={{ left: isMobile ? '12px' : '120px' }}
      >
        {!isMobile && (
          <div className="pl-0.5">
            <ScaleBar zoom={mapView.zoom} latitude={mapView.latitude} />
          </div>
        )}
      </motion.div>

      {/* ── HEADER — WorldEye brand ── */}
      <motion.div data-hud initial={{ opacity: 0, y: -20 }} animate={revealed ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }} transition={hudIn(0.15)} className="absolute top-4 z-[200] pointer-events-none" style={{ left: isMobile ? '16px' : '64px' }}>
        <Link href="/" className="pointer-events-auto flex items-center gap-2.5">
          <img
            src="/worldeye-eye.png?v=4"
            alt="WorldEye"
            width={600}
            height={432}
            className="h-9 md:h-10 w-auto"
            style={{ filter: 'drop-shadow(0 0 10px rgba(0,150,255,0.5))' }}
          />
          <span className="text-lg md:text-xl font-wordmark tracking-wide">
            <span className="text-white">World</span><span className="text-[#0096FF]">Eye</span>
          </span>
        </Link>
      </motion.div>

      {/* ── TOP-RIGHT STATUS (desktop) ── */}
      <motion.div data-hud initial={{ opacity: 0 }} animate={{ opacity: revealed ? 1 : 0 }} transition={hudIn(0.35)} className="status-bar-desktop absolute top-4 right-6 z-[200] pointer-events-none flex items-center gap-3 text-[10px] font-mono tracking-widest text-[var(--text-muted)]">

        <span className="hidden lg:inline-flex items-center gap-1.5">
          <ZuluClock />
        </span>

        <span className="flex items-center gap-1" title="Backend connection status">STATUS: <span className={backendStatus === 'connected' ? 'text-[var(--alert-green)]' : 'text-[var(--alert-red)]'}>{backendStatus === 'connected' ? 'LIVE' : backendStatus.toUpperCase()}</span></span>

        <span className="hidden lg:inline-flex items-center gap-1" title="Number of active data layers">
          <span className="text-[var(--cyan-primary)] font-bold">{Object.values(activeLayers).filter(Boolean).length}</span>
          <span className="opacity-60">LAYERS</span>
        </span>

        <span className="hidden lg:inline-flex items-center gap-1" title="Tracked entities on map">
          <ActiveEntityCount data={data} />
          <span className="opacity-60">ENTITIES</span>
        </span>

        {spaceWeather && <span className="hidden lg:inline" title={spaceWeather.kp_index == null ? 'Geomagnetic Storm Index — no reading from NOAA' : `Geomagnetic Storm Index — Kp${spaceWeather.kp_index}`}>SOLAR: <span style={{ color: spaceWeather.storm_color, fontWeight: 700 }}>{spaceWeather.kp_index == null ? 'N/A' : `Kp${spaceWeather.kp_index}`}</span></span>}

        <span className="text-[11px] font-bold tracking-[0.2em] text-[var(--text-muted)] opacity-50">{APP_VERSION}</span>

        {/* Identity-driven account slot (components/AccountHudControl):
            premium → account menu; signed-in free → Upgrade pill AND the
            account menu; anonymous → the pill alone. This used to key off
            isPremiumUser, which made signed-in free users
            indistinguishable from signed-out ones. */}
        <AccountHudControl variant="desktop" />

      </motion.div>

      {/* ── MOBILE: Compact top status ── */}
      {/* The route planner claims the top of a phone screen; leaving this in
          place would put the support badge underneath the destination field. */}
      {isMobile && !showDirections && !navSession && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: revealed ? 1 : 0 }} transition={hudIn(0.35)} className="absolute top-3 right-3 z-[200] pointer-events-auto flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-2">
            <AccountHudControl variant="mobile" />
          </div>
        </motion.div>
      )}



      {/* ── NEW SIDEBAR (Root Level) ── */}
      {showLayers && !isMobile && <div data-hud><LayerPanel {...terrainPanelProps} revealed={revealed} data={data} activeLayers={activeLayers} setActiveLayers={setActiveLayers} theme={osirisTheme} setTheme={setOsirisTheme} capabilities={capabilities} isPremiumUser={isPremiumUser} sensorEffect={sensorEffect} onSensorEffectChange={setSensorEffect} /></div>}



      {/* ── RIGHT TOOL STRIP (desktop only — mobile uses bottom nav) ── */}
      {!isMobile && <motion.div data-hud initial={{ opacity: 0, x: 12 }} animate={revealed ? { opacity: 1, x: 0 } : { opacity: 0, x: 12 }} transition={hudIn(0.3)} className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 z-[250] pointer-events-auto bg-black/40 backdrop-blur-sm p-1 rounded-full border border-white/5">
        <div className="relative group">
          <button onClick={() => { setShowIntel(!showIntel); setShowOi(false); setShowAlerts(false); }} className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white/50 ${showIntel ? 'bg-[var(--cyan-primary)]/20' : 'hover:bg-white/10'}`} title="OSINT Recon — IP lookup, network sweep, geolocation" aria-label="OSINT Recon" aria-expanded={showIntel}>
            <Radar className={`w-4 h-4 ${showIntel ? 'text-[var(--cyan-primary)]' : 'text-white/60'}`} />
            {showIntel && (
              <span
                aria-hidden="true"
                className="absolute -right-1 top-1/2 -translate-y-1/2 h-4 w-[2px] rounded-full bg-current text-[var(--cyan-primary)]"
              />
            )}
          </button>
          <span className="absolute right-11 top-1/2 -translate-y-1/2 px-2 py-1 text-[9px] font-mono tracking-wider text-white/80 bg-black/80 backdrop-blur-sm rounded whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity pointer-events-none">RECON</span>
          <AnimatePresence>
            {showIntel && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="absolute right-12 top-1/2 -translate-y-1/2 w-80">
                <OsintPanel onSweepVisualize={setSweepData} onScanGeolocate={(target, data) => {
                  setScanTargets(prev => {
                    const existing = prev.filter(t => t.id !== target);
                    return [{ id: target, timestamp: Date.now(), ...data }, ...existing].slice(0, 10);
                  });
                  setFlyToLocation({ lat: data.lat, lng: data.lng, ts: Date.now() });
                }} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative group">
          <button onClick={() => { setShowIntel(false); setShowOi(false); setShowAlerts(false); setShowSpaceCam(v => !v); }} className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white/50 ${showSpaceCam ? 'bg-[#00E5FF]/20' : 'hover:bg-white/10'}`} title="Live from Space — 24/7 video downlink from the ISS" aria-label="Live from Space" aria-expanded={showSpaceCam}>
            <Radio className={`w-4 h-4 ${showSpaceCam ? 'text-[#00E5FF]' : 'text-white/60'}`} />
            {showSpaceCam && (
              <span
                aria-hidden="true"
                className="absolute -right-1 top-1/2 -translate-y-1/2 h-4 w-[2px] rounded-full bg-current text-[#00E5FF]"
              />
            )}
          </button>
          <span className="absolute right-11 top-1/2 -translate-y-1/2 px-2 py-1 text-[9px] font-mono tracking-wider text-white/80 bg-black/80 backdrop-blur-sm rounded whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity pointer-events-none">SPACE</span>
          <AnimatePresence>
            {showSpaceCam && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="absolute right-12 top-1/2 -translate-y-1/2 w-80">
                <SpaceCam />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative group">
          <button onClick={() => { setShowAlerts(!showAlerts); setShowOi(false); setShowIntel(false); setShowDrawing(false); }} className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white/50 ${showAlerts ? 'bg-[#FF3D3D]/20' : 'hover:bg-white/10'}`} title="Live Alerts — earthquakes, conflicts, breaking news" aria-label="Live Alerts" aria-expanded={showAlerts}>
            <AlertTriangle className={`w-4 h-4 ${showAlerts ? 'text-[#FF3D3D]' : 'text-white/60'}`} />
            {showAlerts && (
              <span
                aria-hidden="true"
                className="absolute -right-1 top-1/2 -translate-y-1/2 h-4 w-[2px] rounded-full bg-current text-[#FF3D3D]"
              />
            )}
          </button>
          <span className="absolute right-11 top-1/2 -translate-y-1/2 px-2 py-1 text-[9px] font-mono tracking-wider text-white/80 bg-black/80 backdrop-blur-sm rounded whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity pointer-events-none">ALERTS</span>
          <AnimatePresence>
            {showAlerts && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="absolute right-12 top-1/2 -translate-y-1/2 w-80">
                <LiveAlerts data={data} onLocate={(lat, lng, options) => setFlyToLocation({ lat, lng, zoom: options?.zoom, alertId: options?.alertId, ts: Date.now() })} pinsOn={activeLayers.alert_pins} onTogglePins={on => setActiveLayers(prev => ({ ...prev, alert_pins: on }))} onPinnedChange={setPinnedAlertIds} onWatchFeed={(url, name) => { setLiveFeedUrl(url); setLiveFeedName(name); }} onRefresh={() => fetchEndpoint('/api/news', newsTransform)} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Today in the Sky — self-contained rail item (its own open state,
            like the checkout strip): a glanceable launches/stations/storms/
            quakes panel fed by the site's existing live data. */}
        <TodayInTheSky placement="rail" satellites={data.satellites} satellitesAt={data.satellites_at} earthquakes={data.earthquakes} onLocate={locateFromSkyPanel} />

        <div className="relative group">
          <button onClick={() => { setShowDrawing(!showDrawing); setShowIntel(false); setShowAlerts(false); setShowSpaceCam(false); }} className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white/50 ${showDrawing ? 'bg-[#00E5FF]/20' : 'hover:bg-white/10'}`} title="Draw — measure areas of interest on the map" aria-label="Draw" aria-expanded={showDrawing}>
            <PenLine className={`w-4 h-4 ${showDrawing ? 'text-[#00E5FF]' : 'text-white/60'}`} />
            {showDrawing && (
              <span
                aria-hidden="true"
                className="absolute -right-1 top-1/2 -translate-y-1/2 h-4 w-[2px] rounded-full bg-current text-[#00E5FF]"
              />
            )}
          </button>
          <span className="absolute right-11 top-1/2 -translate-y-1/2 px-2 py-1 text-[9px] font-mono tracking-wider text-white/80 bg-black/80 backdrop-blur-sm rounded whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity pointer-events-none">DRAW</span>
        </div>

        {/* A named group: the OI panel opens inside this wrapper, and an unnamed group would light every hover style in the panel at once. */}
        <div ref={oiAnchor} className="relative group/oi">
          {/* OI, the strip's main tool: bigger than the rest, in the middle of it, in its own colours. */}
          <button onClick={() => { if (!isPremiumUser) { setShowTrialPicker(true); return; } setShowOi(!showOi); setShowIntel(false); setShowAlerts(false); setShowSpaceCam(false); }}
            className={`relative w-11 h-11 rounded-full flex flex-col items-center justify-center gap-[3px] border transition-all duration-200 focus:outline-none focus-visible:ring-1 focus-visible:ring-white/50 ${showOi ? 'bg-[var(--gold-primary)]/20 border-[var(--gold-primary)]/70 shadow-[0_0_18px_rgba(var(--gold-rgb),0.35)]' : 'bg-[var(--gold-primary)]/[0.07] border-[var(--gold-primary)]/35 hover:bg-[var(--gold-primary)]/15 hover:border-[var(--gold-primary)]/60 hover:shadow-[0_0_14px_rgba(var(--gold-rgb),0.25)]'}`}
            title={isPremiumUser ? "OI — talk to it and it works the map for you, or run a forecast (O)" : "OI — Weekly Pass required"}
            aria-label="OI" aria-expanded={showOi}>
            <OiMark size={18} live={oi.state?.status === 'running' || assist.busy} />
            <span className={`text-[7.5px] font-mono font-semibold tracking-[0.2em] leading-none pl-[0.2em] ${showOi ? 'text-[var(--gold-light)]' : 'text-[var(--gold-primary)]'}`}>OI</span>
            {showOi && (
              <span
                aria-hidden="true"
                className="absolute -right-1 top-1/2 -translate-y-1/2 h-5 w-[2px] rounded-full bg-current text-[var(--gold-primary)]"
              />
            )}
            {oi.state?.status === 'running' && <span aria-hidden="true" className="absolute top-0 right-0 w-2 h-2 rounded-full bg-[var(--gold-light)] border border-black/60 animate-pulse" />}
          </button>
          {!showOi && <span className="absolute right-14 top-1/2 -translate-y-1/2 px-2 py-1 text-[9px] font-mono tracking-wider text-white/80 bg-black/80 backdrop-blur-sm rounded whitespace-nowrap opacity-0 group-hover/oi:opacity-100 group-focus-within/oi:opacity-100 transition-opacity pointer-events-none">OI · ASSIST &amp; FORECAST</span>}
          <AnimatePresence>
            {showOi && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="absolute right-[60px] w-[412px]" style={{ top: oiTop }}>
                <OiPanel oi={oi} selected={oiSelected} onSelect={setOiSelected} onClose={() => { setShowOi(false); setOiTheater(false); setOiAutoFocus(false); }}
                  focus={oiFocus} onFocus={toggleOiFocus} onLocate={handleOiLocate}
                  theater={oiTheater} onTheater={setOiTheater} following={oiFollowing} onFollow={followOi}
                  assist={assist} mode={oiMode} onMode={setOiMode} speakOn={oiVoice} onSpeak={setOiVoicePersist} autoFocus={oiAutoFocus}
                  stage={oiStage} onStage={setOiStage} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative group">
          <button onClick={() => { setShowDirections(!showDirections); setRouteTarget(null); if (showDirections) { setActiveRoute(null); } setShowDesktopSearch(false); setShowIntel(false); setShowAlerts(false); setShowSpaceCam(false); setShowDrawing(false); }} className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white/50 ${showDirections ? 'bg-[var(--gold-primary)]/20' : 'hover:bg-white/10'}`} title="Directions — turn-by-turn routing" aria-label="Directions" aria-expanded={showDirections}>
            <Route className={`w-4 h-4 ${showDirections ? 'text-[var(--gold-primary)]' : 'text-white/60'}`} />
            {showDirections && (
              <span
                aria-hidden="true"
                className="absolute -right-1 top-1/2 -translate-y-1/2 h-4 w-[2px] rounded-full bg-current text-[var(--gold-primary)]"
              />
            )}
          </button>
          <span className="absolute right-11 top-1/2 -translate-y-1/2 px-2 py-1 text-[9px] font-mono tracking-wider text-white/80 bg-black/80 backdrop-blur-sm rounded whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity pointer-events-none">ROUTE</span>
        </div>

        <div className="relative group">
          <button data-search-toggle onClick={() => { setShowDesktopSearch(!showDesktopSearch); setShowIntel(false); setShowAlerts(false); setShowSpaceCam(false); setShowDrawing(false); }} className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white/50 ${showDesktopSearch ? 'bg-[var(--gold-primary)]/20' : 'hover:bg-white/10'}`} title="Search — find locations, cities, coordinates" aria-label="Search" aria-expanded={showDesktopSearch}>
            <Search className={`w-4 h-4 ${showDesktopSearch ? 'text-[var(--gold-primary)]' : 'text-white/60'}`} />
            {showDesktopSearch && (
              <span
                aria-hidden="true"
                className="absolute -right-1 top-1/2 -translate-y-1/2 h-4 w-[2px] rounded-full bg-current text-[var(--gold-primary)]"
              />
            )}
          </button>
          <span className="absolute right-11 top-1/2 -translate-y-1/2 px-2 py-1 text-[9px] font-mono tracking-wider text-white/80 bg-black/80 backdrop-blur-sm rounded whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity pointer-events-none">SEARCH</span>
        </div>

        {/* Separator */}
        <div className="w-4 h-px bg-white/10 mx-auto" />

        {/* ── ARCGIS INTEL ── */}
        <div className="relative group">
          <button onClick={() => { setShowArcGIS(!showArcGIS); setShowRemote(false); }} className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white/50 ${showArcGIS ? 'bg-[var(--gold-primary)]/20' : 'hover:bg-white/10'}`} title="ArcGIS — search & import geospatial intel layers" aria-label="ArcGIS" aria-expanded={showArcGIS}>
            <Database className={`w-4 h-4 ${showArcGIS ? 'text-[var(--gold-primary)]' : 'text-white/60'}`} />
            {showArcGIS && (
              <span
                aria-hidden="true"
                className="absolute -right-1 top-1/2 -translate-y-1/2 h-4 w-[2px] rounded-full bg-current text-[var(--gold-primary)]"
              />
            )}
            {arcgisLayers.length > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] flex items-center justify-center rounded-full bg-[var(--gold-primary)] text-black text-[9px] font-mono font-bold leading-none px-0.5">{arcgisLayers.length}</span>}
          </button>
          <span className="absolute right-11 top-1/2 -translate-y-1/2 px-2 py-1 text-[9px] font-mono tracking-wider text-white/80 bg-black/80 backdrop-blur-sm rounded whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity pointer-events-none">ARCGIS</span>
          <AnimatePresence>
            {showArcGIS && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="absolute right-12 top-1/2 -translate-y-1/2 w-[340px]">
                <div className="glass-panel p-3 max-h-[70vh] overflow-y-auto styled-scrollbar">
                  <ArcGISPanel
                    onImportLayer={(layer) => setArcgisLayers(prev => [...prev.filter(l => l.id !== layer.id), { ...layer, color: layer.color || '#D4AF37', visible: true, opacity: layer.opacity ?? 0.8 }])}
                    onRemoveLayer={(id) => setArcgisLayers(prev => prev.filter(l => l.id !== id))}
                    onUpdateLayer={(id, updates) => setArcgisLayers(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l))}
                    importedLayers={arcgisLayers}
                    mapBounds={mapCenter?.bounds || null}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>


        {/* Separator */}
        <div className="w-4 h-px bg-white/10 mx-auto" />

        {/* ── WORLD REMOTE ── */}
        <div className="relative group">
          <button onClick={() => { setShowRemote(!showRemote); setShowArcGIS(false); setShowIntel(false); setShowAlerts(false); setShowSpaceCam(false); setShowDrawing(false); setShowDesktopSearch(false); }} className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white/50 ${showRemote ? 'bg-[var(--cyan-primary)]/20' : 'hover:bg-white/10'}`} title="World Remote — control nearby Bluetooth devices (TVs, speakers, AC)" aria-label="World Remote" aria-expanded={showRemote}>
            <Bluetooth className={`w-4 h-4 ${showRemote ? 'text-[var(--cyan-primary)]' : 'text-white/60'}`} />
            {showRemote && (
              <span
                aria-hidden="true"
                className="absolute -right-1 top-1/2 -translate-y-1/2 h-4 w-[2px] rounded-full bg-current text-[var(--cyan-primary)]"
              />
            )}
          </button>
          <span className="absolute right-11 top-1/2 -translate-y-1/2 px-2 py-1 text-[9px] font-mono tracking-wider text-white/80 bg-black/80 backdrop-blur-sm rounded whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity pointer-events-none">REMOTE</span>
          <AnimatePresence>
            {showRemote && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="absolute right-12 top-1/2 -translate-y-1/2 w-80">
                <WorldRemote onClose={() => setShowRemote(false)} onPlaceOnMap={(devs) => {
                  setScanTargets(prev => {
                    const ids = new Set(prev.map((t: any) => t.id));
                    const next = [...prev];
                    devs.forEach(d => { if (!ids.has(d.id)) next.unshift({ id: d.id, name: d.name, lat: d.lat, lng: d.lng, type: d.type, color: d.color, timestamp: Date.now(), source: 'BLE' }); });
                    return next.slice(0, 20);
                  });
                  if (devs.length > 0) setFlyToLocation({ lat: devs[0].lat, lng: devs[0].lng, ts: Date.now() });
                }} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>


      </motion.div>}

      {/* ── LIVE FEED VIEWER OVERLAY ── */}
      <AnimatePresence>
        {liveFeedUrl && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-[500] flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={() => setLiveFeedUrl(null)}
          >
            <motion.div
              initial={{ y: 20 }}
              animate={{ y: 0 }}
              className="w-[90vw] max-w-[900px] flex flex-col relative rounded-xl overflow-hidden border border-[var(--border-primary)] shadow-2xl bg-black"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-[#111] border-b border-[var(--border-primary)]">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#FF4081] animate-osiris-pulse" />
                  <span className="text-[11px] font-mono font-bold text-white tracking-wider">{liveFeedName}</span>
                  <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-mono text-[10px] font-bold">LIVE STREAM</span>
                  {!liveFeedEmbedAllowed && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono text-[10px]">EXTERNAL ONLY</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <a
                    href={getYouTubeWatchUrl(liveFeedUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[var(--border-primary)] hover:bg-[var(--gold-primary)] hover:text-black text-white transition-colors text-[10px] font-mono"
                  >
                    <span>Open in YouTube</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <button onClick={() => setLiveFeedUrl(null)} className="text-white/70 hover:text-white transition-colors p-1" aria-label="Close live feed" title="Close live feed">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Body — iframe or external card */}
              {liveFeedEmbedAllowed ? (
                <div className="w-full aspect-video relative bg-black">
                  <iframe
                    src={liveFeedUrl}
                    className="w-full h-full absolute inset-0"
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="w-full aspect-video flex items-center justify-center bg-black/95">
                  <div className="text-center px-8">
                    <div className="w-14 h-14 rounded-full bg-[#39FF14]/10 border border-[#39FF14]/20 flex items-center justify-center mx-auto mb-4">
                      <ExternalLink className="w-6 h-6 text-[#39FF14]" />
                    </div>
                    <p className="text-[12px] font-mono font-bold text-white tracking-widest mb-2">EMBED RESTRICTED</p>
                    <p className="text-[10px] font-mono text-white/50 mb-6 max-w-xs">
                      {liveFeedName} does not allow third-party embedding. Click below to open the live stream directly.
                    </p>
                    <a
                      href={getYouTubeWatchUrl(liveFeedUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded border border-[#39FF14]/40 text-[#39FF14] font-mono text-[11px] hover:bg-[#39FF14]/10 transition-colors tracking-wider"
                    >
                      <ExternalLink className="w-4 h-4" />
                      OPEN LIVE STREAM
                    </a>
                  </div>
                </div>
              )}

              {/* Footer — only show for embeddable feeds */}
              {liveFeedEmbedAllowed && (
                <div className="bg-[#111]/90 px-4 py-2.5 border-t border-[var(--border-primary)] flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-[var(--gold-primary)] shrink-0" />
                  <span className="text-[10px] font-mono text-white/70 leading-relaxed">
                    If you see &ldquo;Video unavailable&rdquo;, use <strong className="text-[var(--gold-primary)]">Open in YouTube</strong> above.
                  </span>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ MOBILE UI ═══ */}
      {isMobile && (
        <>
          {/* Mobile Bottom Navigation */}
          <div className="mobile-nav">
            <div className="glass-panel mobile-nav-inner">
              {[
                { id: 'layers' as const, icon: Layers, label: 'LAYERS' },
                { id: 'intel' as const, icon: Newspaper, label: 'INTEL' },
                { id: 'recon' as const, icon: Radar, label: 'RECON' },
                { id: 'oi' as const, icon: Orbit, label: 'OI' },
                { id: 'search' as const, icon: Search, label: 'SEARCH' },
                // Routing was reachable only from the desktop tool rail, so a
                // phone could not open it at all. It sits next to SEARCH
                // because both answer "take me somewhere".
                { id: 'route' as const, icon: Route, label: 'ROUTE' },
                { id: 'remote' as const, icon: Bluetooth, label: 'REMOTE' },
              ].map(tab => {
                // Routing opens the planner at the top of the screen rather than
                // the bottom drawer — it needs the room above the keyboard, and
                // guidance has to stay readable while you drive.
                const isRoute = tab.id === 'route';
                const active = isRoute ? showDirections || Boolean(navSession) : mobilePanel === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      if (isRoute) {
                        // Mid-drive this must not touch anything: closing the
                        // planner clears the active route, which would take the
                        // line off the map underneath a driver. Guidance is
                        // ended from the navigation view's own exit.
                        if (navSession) return;
                        setMobilePanel(null);
                        setShowDirections((open) => {
                          if (open) setActiveRoute(null);
                          return !open;
                        });
                        return;
                      }
                      // OI is a Weekly Pass feature: offer the trial in
                      // place instead of bouncing to /pricing.
                      if (tab.id === 'oi' && !isPremiumUser) { setShowTrialPicker(true); return; }
                      setMobilePanel(mobilePanel === tab.id ? null : tab.id);
                    }}
                    aria-pressed={active}
                    disabled={isRoute && Boolean(navSession)}
                    className={`mobile-nav-btn ${active ? 'active' : ''}`}
                  >
                    <tab.icon className={`w-4 h-4 ${tab.id === 'recon' ? 'text-[var(--cyan-primary)]' : ''}`} />
                    <span className={tab.id === 'recon' ? 'text-[var(--cyan-primary)]' : ''}>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Today in the Sky — floating pill + bottom sheet (mobile shape
              of the desktop rail panel). */}
          <TodayInTheSky placement="chip" satellites={data.satellites} satellitesAt={data.satellites_at} earthquakes={data.earthquakes} onLocate={locateFromSkyPanel} />

          {/* Mobile Drawer */}
          <AnimatePresence>
            {mobilePanel && (
              <motion.div
                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className={`fixed bottom-[52px] left-0 right-0 z-[400] glass-panel ${mobilePanel === 'oi' ? 'oi-glass' : ''} rounded-b-none overflow-y-auto styled-scrollbar`}
                style={{ maxHeight: 'min(55vh, calc(100dvh - 100px))', paddingBottom: 'env(safe-area-inset-bottom, 4px)' }}
              >
                <div className="mobile-drawer-handle" />
                <div className="px-3 pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="hud-text text-[10px] text-[var(--text-primary)]">
                      {mobilePanel === 'layers' ? 'LAYERS & STATS' : mobilePanel === 'intel' ? 'INTEL FEED' : mobilePanel === 'recon' ? 'OSIRIS RECON' : mobilePanel === 'remote' ? 'WORLD REMOTE' : mobilePanel === 'oi' ? 'OSIRIS OI' : 'SEARCH'}
                    </span>
                    <button onClick={() => setMobilePanel(null)} className="text-[var(--text-muted)] p-1" aria-label="Close panel" title="Close panel"><X className="w-4 h-4" /></button>
                  </div>
                  {mobilePanel === 'layers' && (
                    <>
                      <div className="glass-panel-sm p-2 mb-2">
                        <div className="grid grid-cols-5 gap-1 text-center">
                          <div><div className="hud-label" style={{fontSize:'9px'}}>AIR</div><div className="hud-value text-[10px]">{totalFlights.toLocaleString()}</div></div>
                          <div><div className="hud-label" style={{fontSize:'9px'}}>SAT</div><div className="hud-value text-[10px]">{(data.satellites?.length||0)}</div></div>
                          <div><div className="hud-label" style={{fontSize:'9px'}}>CAM</div><div className="hud-value text-[10px]">{(data.cameras?.length||0)}</div></div>
                          <div><div className="hud-label" style={{fontSize:'9px'}}>WX</div><div className="hud-value text-[10px]" style={{color:'var(--accent-weather)'}}>{(data.weather_events?.length||0)}</div></div>
                          <div><div className="hud-label" style={{fontSize:'9px'}}>NUC</div><div className="hud-value text-[10px]" style={{color:'var(--accent-nuclear)'}}>{(data.infrastructure?.length||0)}</div></div>
                        </div>
                      </div>
                      <LayerPanel {...terrainPanelProps} data={data} activeLayers={activeLayers} setActiveLayers={setActiveLayers} isMobile={true} theme={osirisTheme} setTheme={setOsirisTheme} capabilities={capabilities} isPremiumUser={isPremiumUser} sensorEffect={sensorEffect} onSensorEffectChange={setSensorEffect} />
                      <div className="mt-8">
                        <ViewPresets onNavigate={(lat, lng, zoom) => { setFlyToLocation({ lat, lng, zoom, ts: Date.now() }); setMobilePanel(null); }} />
                      </div>
                    </>
                  )}
                                    {mobilePanel === 'oi' && (
                    <OiPanel oi={oi} selected={oiSelected} onSelect={setOiSelected} embedded focus={oiFocus} onFocus={toggleOiFocus}
                      onLocate={handleOiLocate} following={oiFollowing} onFollow={followOi}
                      assist={assist} mode={oiMode} onMode={setOiMode} speakOn={oiVoice} onSpeak={setOiVoicePersist}
                      stage={oiStage} onStage={setOiStage} />
                  )}
                  {mobilePanel === 'intel' && <IntelFeed data={data} onLocate={(lat, lng) => { setFlyToLocation({ lat, lng, ts: Date.now() }); setMobilePanel(null); }} />}
                  {mobilePanel === 'search' && (
                    <div className="space-y-2">
                      <SearchBar embedded center={mapCenter} onDirections={openDirectionsTo} cameras={data.cameras ?? []} isPro={isPremiumUser} onOpenCamera={(cam) => { openCameraFromSearch(cam); setMobilePanel(null); }} onLocate={(lat, lng, zoom) => { setFlyToLocation({ lat, lng, zoom, ts: Date.now() }); setMobilePanel(null); }} />
                      <SharePanel mapView={mapView} activeLayers={activeLayers} mouseCoords={null} />
                      <ShareLinkBlock compact />
                    </div>
                  )}
                  {mobilePanel === 'recon' && (
                    <div className="space-y-2">
                      <OsintPanel isOpen={true} onClose={() => setMobilePanel(null)} isMobile={true} onSweepVisualize={setSweepData} />
                    </div>
                  )}
                  {mobilePanel === 'remote' && (
                    <WorldRemote onClose={() => setMobilePanel(null)} onPlaceOnMap={(devs) => {
                      setScanTargets(prev => {
                        const ids = new Set(prev.map((t: any) => t.id));
                        const next = [...prev];
                        devs.forEach(d => { if (!ids.has(d.id)) next.unshift({ id: d.id, name: d.name, lat: d.lat, lng: d.lng, type: d.type, color: d.color, timestamp: Date.now(), source: 'BLE' }); });
                        return next.slice(0, 20);
                      });
                      if (devs.length > 0) setFlyToLocation({ lat: devs[0].lat, lng: devs[0].lng, ts: Date.now() });
                    }} />
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* ── BOTTOM CURSOR INFO (desktop) ── */}
      {!isMobile && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: revealed ? 1 : 0 }} transition={hudIn(0.6)} className="desktop-only absolute bottom-8 z-[200] pointer-events-auto" style={{ left: '72px' }}>
          <div className="flex items-center gap-5 text-[9px] font-mono tracking-widest text-[var(--text-muted)] opacity-60">
            <div className="flex gap-2 items-center" title="Cursor coordinates (hover over map)">
              <span>CURSOR</span>
              <span ref={coordsDisplayRef} className="text-[var(--gold-primary)] font-bold tabular-nums">—</span>
            </div>
            <div className="flex gap-2 items-center" title="Reverse-geocoded location name">
              <span>LOCATION</span>
              <span className="text-[var(--cyan-primary)] truncate max-w-[200px]">{locationLabel || 'HOVER MAP'}</span>
            </div>
            <div className="flex gap-2 items-center" title="Current zoom level">
              <span>ZOOM</span>
              <span className="text-[var(--gold-primary)] font-bold tabular-nums">{mapView.zoom.toFixed(1)}</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Scale bar is now integrated into the map controls section above */}

      {/* ── Region Dossier ── */}
      {(regionDossier || dossierLoading) && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="absolute top-16 md:top-20 left-2 right-2 md:left-1/2 md:right-auto md:-translate-x-1/2 z-[300] md:w-[480px] max-h-[65vh] overflow-y-auto styled-scrollbar">
          <div className="glass-panel p-5 osiris-glow">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-mono font-bold text-[var(--gold-primary)] tracking-wider">REGION DOSSIER</h2>
              <button onClick={() => { setRegionDossier(null); setDossierLoading(false); }} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs" aria-label="Close dossier" title="Close dossier">✕</button>
            </div>
            {dossierLoading ? (
              <div className="text-center py-8">
                <div className="w-5 h-5 border-2 border-[var(--gold-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <span className="text-[9px] font-mono text-[var(--text-muted)] tracking-widest">COMPILING INTEL...</span>
              </div>
            ) : regionDossier && (
              <div className="space-y-3">
                <div><div className="hud-label mb-0.5">LOCATION</div><div className="text-xs text-[var(--text-primary)]">{regionDossier.location?.display_name}</div></div>
                {regionDossier.country && (
                  <div className="grid grid-cols-2 gap-2">
                    <div><div className="hud-label mb-0.5">COUNTRY</div><div className="text-xs text-[var(--text-primary)]">{regionDossier.country.flag} {regionDossier.country.name}</div></div>
                    <div><div className="hud-label mb-0.5">CAPITAL</div><div className="text-xs text-[var(--text-primary)]">{regionDossier.country.capital}</div></div>
                    <div><div className="hud-label mb-0.5">POPULATION</div><div className="text-xs text-[var(--text-primary)]">{regionDossier.country.population?.toLocaleString()}</div></div>
                    <div><div className="hud-label mb-0.5">REGION</div><div className="text-xs text-[var(--text-primary)]">{regionDossier.country.subregion || regionDossier.country.region}</div></div>
                    <div><div className="hud-label mb-0.5">LANGUAGES</div><div className="text-xs text-[var(--text-primary)]">{regionDossier.country.languages?.join(', ')}</div></div>
                    <div><div className="hud-label mb-0.5">AREA</div><div className="text-xs text-[var(--text-primary)]">{regionDossier.country.area?.toLocaleString()} km²</div></div>
                  </div>
                )}
                {regionDossier.head_of_state && (<div><div className="hud-label mb-0.5">HEAD OF STATE</div><div className="text-xs text-[var(--gold-primary)]">{regionDossier.head_of_state.name}</div><div className="text-[9px] text-[var(--text-muted)]">{regionDossier.head_of_state.position}</div></div>)}
                {regionDossier.wikipedia && (<div><div className="hud-label mb-1">INTELLIGENCE BRIEF</div><div className="flex gap-3">{regionDossier.wikipedia.thumbnail && <img src={regionDossier.wikipedia.thumbnail} alt="" className="w-14 h-14 rounded object-cover flex-shrink-0" />}<p className="text-[9px] text-[var(--text-secondary)] leading-relaxed">{regionDossier.wikipedia.extract}</p></div></div>)}
                <div>
                  <div className="hud-label mb-1">CAMERAS NEAR HERE</div>
                  {dossierNearbyCameras.length > 0 ? (
                    <div className="space-y-1">
                      {dossierNearbyCameras.map(({ camera, distanceM }) => (
                        <button
                          key={String(camera.id)}
                          onClick={() => handleEntityClick({ type: 'cctv', id: camera.id, name: camera.name, city: camera.city, country: camera.country, source: camera.source, feed_url: camera.feed_url, stream_url: camera.stream_url, stream_type: camera.stream_type, external_url: camera.external_url, lat: camera.lat, lng: camera.lng })}
                          className="w-full text-left px-2 py-1.5 rounded border border-[var(--border-primary)] hover:border-[var(--cyan-primary)] text-[11px] text-[var(--text-primary)] transition-colors"
                        >
                          📷 {camera.name || camera.city || 'Camera'} · {(distanceM / 1000).toFixed(2)} km
                        </button>
                      ))}
                      <p className="text-[9px] text-[var(--text-muted)]">Real feeds from the loaded WorldEye camera index — opened in the standard viewer.</p>
                    </div>
                  ) : (
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      No live cameras in the loaded index within {(CAMERA_SEARCH_RADIUS_M / 1000).toFixed(1)} km of this point.
                      {!activeLayers.cctv && ' Turn on the CCTV Cameras layer to load the camera index.'}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ── Camera Viewer ── rendered only while a camera is open: the
          viewer returns null without one, and mounting it unconditionally
          pulled its chunk (hls.js et al) into every initial page load. ── */}
      {activeCamera && (
        <CameraViewer
          camera={activeCamera}
          onClose={() => setActiveCamera(null)}
          onLocate={(lat, lng) => setFlyToLocation({ lat, lng, ts: Date.now() })}
          besideOi={showOi && !oiTheater}
        />
      )}
      {showCameraSignup && (
        <CameraSignupNudge
          onClose={() => setShowCameraSignup(false)}
          rung={gateRung}
          opensUsed={getCameraClickCount()}
          onEmailUnlocked={handleLadderEmailUnlocked}
        />
      )}
      {showSharePrompt && <ShareAwayPrompt onClose={() => setShowSharePrompt(false)} />}
      {/* F4 timed trial popup: self-gating on lib/camera-ladder's
          discipline; suppressed while the wall, the loop-in card or
          the camera viewer is up, so prompts never stack. */}
      <TimedTrialPopup
        surface="globe"
        suppressed={showCameraSignup || showSharePrompt || activeCamera !== null}
        onVisibilityChange={setTimedPopupVisible}
      />
      {/* Email capture, once per device, mounted by the session's first
          camera open; the card self-gates on lib/newsletter/capture. */}
      {cameraEverOpened && <EmailCaptureCard placement="camera" />}
      {showTrialPicker && (
        <TrialPickerDialog
          open
          onClose={() => setShowTrialPicker(false)}
          feature="OI — the AI assistant"
        />
      )}

      {/* ── Entity Graph Panel ── */}
      {/* Guidance belongs over the map, where the clicking happens. */}
      {drawMode && (
        <DrawHud
          mode={drawMode}
          progress={drawProgress}
          onUndo={() => sendDraw('undo')}
          onFinish={() => sendDraw('finish')}
          onCancel={() => { sendDraw('cancel'); setDrawMode(null); setDrawProgress(null); }}
        />
      )}

      {showDrawing && (
        <div className="absolute right-12 top-1/2 -translate-y-1/2 z-[400] w-80 pointer-events-auto">
          <DrawingToolbar
            drawMode={drawMode}
            onSetDrawMode={setDrawMode}
            progress={drawProgress}
            polygons={drawnPolygons}
            onDeletePolygon={(id) => setDrawnPolygons(p => p.filter(x => x.id !== id))}
            onClearAll={() => { setDrawnPolygons([]); setSelectedPolygon(null); }}
            onExportGeoJSON={handleExportGeoJSON}
            selectedPolygon={selectedPolygon}
            onSelectPolygon={setSelectedPolygon}
            onRenamePolygon={(id, name) => setDrawnPolygons(p => p.map(x => x.id === id ? { ...x, name } : x))}
            data={data}
            onLocateEntity={(lat, lng) => setFlyToLocation({ lat, lng, zoom: 12, ts: Date.now() })}
            watched={watched}
            onToggleWatch={toggleWatch}
            watchEvents={watchEvents}
          />
        </div>
      )}

      {/* ── OVERLAYS ── */}
      <div className="vignette absolute inset-0 pointer-events-none z-[2]" />
      <div className="crt-scanlines absolute inset-0 pointer-events-none z-[3] opacity-[0.02]" />
      {/* Corner frames — using explicit classes for Tailwind JIT compatibility */}
      {[
        { pos: 'top-0 left-0', vAnchor: 'top-0', hAnchor: 'left-0', hGrad: 'bg-gradient-to-r', vGrad: 'bg-gradient-to-b' },
        { pos: 'top-0 right-0', vAnchor: 'top-0', hAnchor: 'right-0', hGrad: 'bg-gradient-to-l', vGrad: 'bg-gradient-to-b' },
        { pos: 'bottom-0 left-0', vAnchor: 'bottom-0', hAnchor: 'left-0', hGrad: 'bg-gradient-to-r', vGrad: 'bg-gradient-to-t' },
        { pos: 'bottom-0 right-0', vAnchor: 'bottom-0', hAnchor: 'right-0', hGrad: 'bg-gradient-to-l', vGrad: 'bg-gradient-to-t' },
      ].map((c, i) => (
        <div key={i} className={`absolute ${c.pos} w-16 h-16 pointer-events-none z-[1]`}>
          <div className={`absolute ${c.vAnchor} ${c.hAnchor} w-full h-[1px] ${c.hGrad} from-[var(--gold-primary)]/30 to-transparent`} />
          <div className={`absolute ${c.vAnchor} ${c.hAnchor} w-[1px] h-full ${c.vGrad} from-[var(--gold-primary)]/30 to-transparent`} />
        </div>
      ))}

      {/* Keyboard Shortcuts Overlay */}
      <KeyboardShortcuts />

      {/* ── NEAR YOU STRIP ──
          Globe-arrival camera suggestions (components/NearYouStrip.tsx).
          Suppressed while a camera deep link owns the view: the link
          names its destination, and the strip must not compete with it. */}
      <NearYouStrip
        active={splashGone && !sharedCameraId}
        location={visitorGeo}
        cameras={data.cameras ?? []}
        catalogueSettled={!camerasLoading}
      />

      {/* ── GLOBAL STATUS TICKER (bottom) ── */}
      <div data-hud><GlobalStatusBar revealed={revealed} /></div>

      {/* Shortcut hint — more visible */}
      <div className="desktop-only absolute bottom-[26px] right-5 z-[200] pointer-events-none text-[9px] font-mono text-[var(--text-muted)] opacity-50 tracking-widest" title="Press ? to see all keyboard shortcuts">
        Press <span className="text-[var(--gold-primary)] opacity-80">?</span> for shortcuts · <span className="text-[var(--gold-primary)] opacity-80">F</span> fullscreen · <span className="text-[var(--gold-primary)] opacity-80">R</span> reset view
      </div>


      {/* ── RESTORE 2026-10-12 / RE-ADD 2026-10-13: the Companion mount
          and the HomeSeoShell content shell (+ its FAQPage JSON-LD) were
          removed from the homepage composition after the black-globe
          incident. Re-add step 1: the shell returns (mounted after </main>
          below), gated on iPhone-viewport globe parity. The Companion
          (components/companion/**) stays unmounted — it returns in a
          separate step, subscribers only. ── */}

      {/* ── ONBOARDING (Build A): mounted last, purely additive overlays.
          Receives only primitive snapshots of live state; the component
          renders nothing until the globe is ready. The map wrapper above
          is untouched. See src/components/onboarding. ── */}
      <OnboardingRoot
        globeReady={mapReady && revealed}
        isMobile={isMobile}
        isPremium={isPremiumUser}
        cameraId={activeCamera ? String(activeCamera.id ?? activeCamera.name ?? 'open') : null}
        layersSig={Object.entries(activeLayers).filter(([, v]) => v).map(([k]) => k).join(',')}
        panel={mobilePanel ?? (showOi ? 'oi' : showIntel ? 'recon' : showAlerts ? 'alerts' : showDesktopSearch ? 'search' : null)}
        signupOpen={showCameraSignup}
      />

      {/* ── TEASER A/B (Wave 2 F9): signup card over the live globe for
          anonymous treatment-arm visitors; renders nothing otherwise. ── */}
      <TeaserSignupCard globeReady={mapReady && revealed} isMobile={isMobile} />

    </main>

    {/* ── SEO / content shell — server-rendered copy below the app (H1, FAQ,
        CTAs, contact). Placement handled by .home-seo-shell in globals.css. ── */}
    <JsonLd data={homeFaqJsonLd} />
    <HomeSeoShell />
    </>
  );
}

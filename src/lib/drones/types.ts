/**
 * WorldEye — Live Drone Tracking: shared types.
 *
 * Data model for FAA Remote ID (ASTM F3411 / OpenDroneID) observations as
 * reported by CONNECTED RECEIVERS and OPTED-IN OPERATORS only. There is no
 * public global drone feed: Remote ID is a local broadcast protocol, so a
 * drone appears here only while a receiver that feeds WorldEye is within
 * radio range of it. Zero drones is an honest state, not an error.
 *
 * Privacy invariants (enforced in privacy.ts, unit-tested):
 *  - Operator / pilot location (the OpenDroneID System message) is dropped
 *    at ingest — never stored, never served.
 *  - Raw persistent identifiers (serial numbers, operator IDs) are never
 *    exposed to clients; drones are served under a session-scoped hash.
 *  - No history is kept beyond the short live trail window.
 */

/** What a receiver/operator gateway POSTs to /api/drones/ingest. */
export interface IngestBody {
  receiver?: {
    /** Receiver id — only used with the shared-token auth form; tokens
     *  bound to a receiver id in DRONE_INGEST_TOKENS override it. */
    id?: string;
    /** Optional display name for the receiver (e.g. "Ogden rooftop"). */
    name?: string;
    lat: number;
    lng: number;
    /** Detection radius the receiver claims, metres. Clamped server-side. */
    radiusM?: number;
  };
  observations?: RawObservation[];
}

/**
 * One drone observation. Accepts two shapes (see privacy.ts normalizer):
 *  - the flat shape documented in docs/drones.md, and
 *  - nested OpenDroneID message objects (BasicID / Location / System) as
 *    exported by libopendroneid-based receivers.
 * The System-message fields (operatorLat/operatorLng/operatorId) are
 * accepted so stock receivers can forward full messages unmodified — and
 * are DROPPED by the privacy filter before anything is stored.
 */
export interface RawObservation {
  /* identity (Basic ID message) */
  id?: string;
  BasicID?: { UAType?: number; IDType?: number; UASID?: string };
  uaType?: number;
  idType?: number;
  /* position (Location/Vector message) */
  lat?: number;
  lng?: number;
  Location?: {
    Latitude?: number;
    Longitude?: number;
    Direction?: number;
    SpeedHorizontal?: number;
    SpeedVertical?: number;
    AltitudeGeodetic?: number;
    Height?: number;
  };
  altitudeMslM?: number;
  heightAglM?: number;
  headingDeg?: number;
  speedMps?: number;
  verticalSpeedMps?: number;
  /* when the receiver saw it — epoch ms or ISO string */
  timestamp?: number | string;
  /* System message — SENSITIVE, dropped at ingest, never stored */
  operatorLat?: number;
  operatorLng?: number;
  operatorId?: string;
  System?: {
    OperatorLatitude?: number;
    OperatorLongitude?: number;
    OperatorID?: string;
  };
  /* Self-ID free text — often a pilot name/phone; dropped at ingest */
  selfId?: string;
  SelfID?: { Description?: string };
  /* authentication pages — dropped at ingest */
  authentication?: unknown;
}

/** The only drone shape that ever leaves the server. */
export interface PublicDrone {
  /** Session-scoped hash of the persistent id — rotates, not reversible. */
  id: string;
  lat: number;
  lng: number;
  altitudeMslM: number | null;
  heightAglM: number | null;
  headingDeg: number | null;
  speedMps: number | null;
  verticalSpeedMps: number | null;
  /** OpenDroneID UA type code (0 = none/other … 15), for iconography. */
  uaType: number | null;
  /** Epoch ms of the newest observation the receiver reported. */
  lastSeen: number;
  /** Seconds since lastSeen, computed at read time. */
  ageS: number;
  /** Short live trail, oldest → newest, [lng, lat] pairs. */
  trail: [number, number][];
}

/** A receiver that is feeding (or recently fed) the layer. */
export interface PublicReceiver {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radiusM: number;
  /** Epoch ms of its newest accepted report. */
  lastReport: number;
  /** True while it reported within RECEIVER_ACTIVE_MS. */
  active: boolean;
}

/** GET /api/drones/live response. */
export interface LiveResponse {
  drones: PublicDrone[];
  receivers: PublicReceiver[];
  count: number;
  activeReceivers: number;
  generatedAt: number;
  source: string;
}

/** Normalized FAA airspace feature served by /api/drones/airspace. */
export interface AirspaceFeature {
  kind: 'grid' | 'restriction';
  /** LAANC ceiling in feet AGL for grids; null for restrictions. */
  ceilingFt: number | null;
  airport: string;
  laanc: boolean | null;
  /** Restriction reason / facility, for restrictions. */
  reason: string;
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
}

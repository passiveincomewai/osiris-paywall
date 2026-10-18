/**
 * OSIRIS — Space Missions: shared launch record types.
 *
 * One normalized shape for a rocket launch, produced server-side from
 * Launch Library 2 (The Space Devs) detailed payloads and consumed by the
 * globe layer, the mission panel and the replay. Every field LL2 does not
 * provide stays null — nothing is invented, estimated or backfilled here.
 * (Estimates exist in exactly one place: the clearly-labeled replay
 * profile in profile.ts.)
 */

export const LAUNCH_SOURCE_LABEL = 'Launch Library 2 · The Space Devs';
export const LAUNCH_SOURCE_URL = 'https://thespacedevs.com/llapi';

export interface LaunchRecord {
  /** LL2 launch id (UUID). */
  id: string;
  /** Full LL2 launch name, e.g. "Falcon 9 Block 5 | Bandwagon 5". */
  name: string;
  missionName: string | null;
  missionDescription: string | null;
  /** Rocket configuration full name, e.g. "Falcon 9 Block 5". */
  rocketName: string | null;
  rocketFamily: string | null;
  providerName: string | null;
  providerType: string | null;
  /** LL2 status, e.g. "Go for Launch" / "Launch Successful". */
  statusName: string | null;
  statusAbbrev: string | null;
  /** Scheduled / actual liftoff time (ISO 8601), LL2 `net`. */
  net: string | null;
  windowStart: string | null;
  windowEnd: string | null;
  /** How precise the NET is ("Minute", "Hour", "Day", "Month"…). */
  netPrecision: string | null;
  /** LL2 weather/launch probability, 0–100, when published. */
  probability: number | null;
  padId: number | null;
  padName: string | null;
  padLat: number | null;
  padLon: number | null;
  /** Pad's parent location, e.g. "Cape Canaveral SFS, FL, USA". */
  padLocation: string | null;
  orbitName: string | null;
  orbitAbbrev: string | null;
  /** Programme names the mission belongs to (may be empty). */
  programs: string[];
  imageUrl: string | null;
  /** LL2 says a webcast is live right now. */
  webcastLive: boolean;
  /** First listed video/webcast URL, when any. */
  videoUrl: string | null;
  /** Outcome detail for flown launches, straight from LL2. */
  failReason: string | null;
  holdReason: string | null;
  lastUpdated: string | null;
}

export interface LaunchesPayload {
  upcoming: LaunchRecord[];
  previous: LaunchRecord[];
  source: string;
  /** When the server last heard from LL2 successfully (epoch ms). */
  fetchedAt: number;
  /** True when this payload is last-good data served after an upstream error. */
  stale: boolean;
  /** Upstream calls this server process has made (quota observability). */
  upstreamCalls: number;
}

/** Coarse status bucket used for marker colour + panel chips. */
export type LaunchStatusKind = 'go' | 'tbd' | 'success' | 'failure' | 'other';

export function launchStatusKind(l: Pick<LaunchRecord, 'statusAbbrev' | 'statusName'>): LaunchStatusKind {
  const a = (l.statusAbbrev ?? '').toLowerCase();
  const n = (l.statusName ?? '').toLowerCase();
  if (a === 'success' || n.includes('successful')) return 'success';
  if (a === 'failure' || a === 'partial failure' || n === 'launch failure' || n.includes('failure')) return 'failure';
  if (a === 'go' || n.includes('go for launch')) return 'go';
  if (a === 'tbd' || a === 'tbc' || n.includes('to be')) return 'tbd';
  return 'other';
}

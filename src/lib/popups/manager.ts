// ── Conversion popup system: the shared manager rules ───────────────
// One popup system for the whole site (owner's orders 2026-10-29:
// batches of 2026-10-29 16:52 + 17:10 MDT). Every popup registers with
// these rules; the React shell (components/popups/PopupManager) only
// gathers context and renders what arbitration decides.
//
// The discipline, mirroring lib/camera-ladder's prompt rules:
//  - At most ONE popup per session. The first eligible trigger wins;
//    any show (or the post-newsletter Google popup's claim, or the PWA
//    install bar's claim) suppresses the rest for the session.
//  - Cross-visit frequency: no popup more than once per visitor per
//    7 days (the persistent visitor record lives in localStorage; the
//    visitorId itself is lib/analytics/visitor-id's `we_vid`). The
//    exemptions are the account-state popups — trial_waiting (once
//    per user EVER), trial_ending (once per trial) and
//    affiliate_invite (once per user) — each with its own per-user
//    record (FREQ_EXEMPT_POPUPS below).
//  - Priority when several become eligible at once:
//    pricing_save > trial_ending > trial_waiting > powder_pass >
//    happening_now > welcome_back > engaged_watcher > your_camera >
//    end_of_article > tool_completion > share_view > install >
//    affiliate_invite. (Powder Pass stands
//    outside the global race in practice — it is page-scoped to ski
//    pages and server-gated by the POWDER_PASS_ENABLED flag — but it
//    still claims through here so it can never stack.)
//  - Never on /checkout (or while a checkout sheet / any modal dialog
//    is open), never on auth/account/admin surfaces, never stacked on
//    the camera ladder prompt.
//
// Everything here is a pure function of plain inputs with injectable
// storage, so the whole discipline is unit-tested without a browser.

export type PopupId =
  | "pricing_save"
  | "trial_ending"
  | "trial_waiting"
  | "powder_pass"
  | "happening_now"
  | "welcome_back"
  | "engaged_watcher"
  | "your_camera"
  | "end_of_article"
  | "tool_completion"
  | "share_view"
  | "install"
  | "affiliate_invite";

/** Arbitration priority (higher wins). */
export const POPUP_PRIORITY: Record<PopupId, number> = {
  pricing_save: 100,
  trial_ending: 95,
  trial_waiting: 90,
  powder_pass: 85,
  happening_now: 80,
  welcome_back: 70,
  engaged_watcher: 60,
  your_camera: 50,
  end_of_article: 40,
  tool_completion: 30,
  share_view: 20,
  install: 10,
  affiliate_invite: 5,
};

/** The analytics detail token for a popup (PageView events store
 *  `popup_shown:<token>` — one machine token, [a-z0-9_], ≤24 chars,
 *  per lib/analytics/ingest-fields). */
export const POPUP_EVENT_DETAIL: Record<PopupId, string> = {
  pricing_save: "pricing_save",
  trial_ending: "trial_ending",
  trial_waiting: "trial_waiting",
  powder_pass: "powder_pass",
  happening_now: "happening_now",
  welcome_back: "welcome_back",
  engaged_watcher: "engaged_watcher",
  your_camera: "your_camera",
  end_of_article: "end_of_article",
  tool_completion: "tool_completion",
  share_view: "share_view",
  install: "install",
  affiliate_invite: "affiliate_invite",
};

/** Cross-visit frequency cap: one show per popup per visitor per 7 days. */
export const POPUP_FREQ_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

// ── Storage keys ────────────────────────────────────────────────────

/** sessionStorage: the popup that claimed this session (its id). */
export const POPUP_SESSION_CLAIM_KEY = "worldeye.popups.sessionClaim";
/** sessionStorage: the GENERIC cross-system claim. The post-newsletter
 *  Google popup (newsletter build) and the PWA install bar integrate
 *  through this key + the `worldeye:popup-claimed` DOM event: whoever
 *  shows first writes it, everyone else stays silent this session. */
export const POPUP_GENERIC_CLAIM_KEY = "worldeye.popupClaimed";
/** localStorage: { [popupId]: lastShownAtMs }. */
export const POPUP_FREQ_KEY = "worldeye.popups.freq";
/** localStorage: { days: ["YYYY-MM-DD", ...] } — distinct visit days. */
export const POPUP_VISITS_KEY = "worldeye.popups.visits";
/** localStorage: { [cameraKey]: { days: [...], name: string|null } }. */
export const POPUP_CAMERA_VISITS_KEY = "worldeye.popups.cameraVisits";
/** localStorage: the user key trial_waiting has fired for (once ever). */
export const POPUP_TRIAL_WAITING_SHOWN_KEY = "worldeye.popups.trialWaitingShownFor";
/** localStorage: `${userKey}:${trialEndMs}` trial_ending fired for
 *  (once per trial — a new trial has a new end and may fire again). */
export const POPUP_TRIAL_ENDING_SHOWN_KEY = "worldeye.popups.trialEndingShownFor";
/** localStorage: the user key affiliate_invite has fired for (once per user). */
export const POPUP_AFFILIATE_SHOWN_KEY = "worldeye.popups.affiliateShownFor";
/** localStorage: the user key that dismissed affiliate_invite
 *  (dismissal is permanent for that user). */
export const POPUP_AFFILIATE_DISMISSED_KEY = "worldeye.popups.affiliateDismissedFor";
/** sessionStorage: this session completed a newsletter subscribe. */
export const POPUP_SUBSCRIBED_SESSION_KEY = "worldeye.popups.subscribed";

/** The slice of Web Storage these rules need (stubbed in tests). */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function browserLocalStorage(): StorageLike | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function browserSessionStorage(): StorageLike | null {
  try {
    return typeof window !== "undefined" ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

function safeGet(storage: StorageLike | null, key: string): string | null {
  if (!storage) return null;
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(storage: StorageLike | null, key: string, value: string): boolean {
  if (!storage) return false;
  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

// ── Session claim ───────────────────────────────────────────────────

/** The popup that claimed this session, or null. Also honors the
 *  generic cross-system claim: a session claimed by the newsletter
 *  Google popup or the install bar reads as claimed ("external"). */
export function readSessionClaim(
  session: StorageLike | null,
): PopupId | "external" | null {
  const mine = safeGet(session, POPUP_SESSION_CLAIM_KEY);
  if (mine && mine in POPUP_PRIORITY) return mine as PopupId;
  if (safeGet(session, POPUP_GENERIC_CLAIM_KEY)) return "external";
  return null;
}

/** Claim the session for `id`: writes BOTH the system key and the
 *  generic cross-system key, and broadcasts the claim event so any
 *  other surface listening in this page hears it immediately. */
export function claimSession(
  session: StorageLike | null,
  id: PopupId,
  dispatch: ((id: PopupId) => void) | null = null,
): void {
  safeSet(session, POPUP_SESSION_CLAIM_KEY, id);
  safeSet(session, POPUP_GENERIC_CLAIM_KEY, id);
  dispatch?.(id);
}

// ── Frequency record (7-day cap) ────────────────────────────────────

export type FreqRecord = Partial<Record<PopupId, number>>;

export function parseFreqRecord(raw: string | null): FreqRecord {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw) as Record<string, unknown> | null;
    if (!v || typeof v !== "object") return {};
    const out: FreqRecord = {};
    for (const id of Object.keys(POPUP_PRIORITY) as PopupId[]) {
      const t = v[id];
      if (typeof t === "number" && Number.isFinite(t) && t > 0) out[id] = t;
    }
    return out;
  } catch {
    return {};
  }
}

export function readFreqRecord(storage: StorageLike | null): FreqRecord {
  return parseFreqRecord(safeGet(storage, POPUP_FREQ_KEY));
}

/** Account-state popups key off real account state and their own
 *  per-user records instead of the 7-day visitor cap: trial_waiting
 *  (once per user ever), trial_ending (once per trial),
 *  affiliate_invite (once per user; dismissal permanent). */
export const FREQ_EXEMPT_POPUPS: ReadonlySet<PopupId> = new Set([
  "trial_waiting",
  "trial_ending",
  "affiliate_invite",
]);

/** True when the 7-day cap allows `id` to show at `now`. */
export function frequencyAllows(
  freq: FreqRecord,
  id: PopupId,
  now: number,
): boolean {
  if (FREQ_EXEMPT_POPUPS.has(id)) return true;
  const last = freq[id];
  if (last === undefined) return true;
  return now - last >= POPUP_FREQ_WINDOW_MS;
}

export function markShown(
  storage: StorageLike | null,
  id: PopupId,
  now: number,
): void {
  const next = { ...readFreqRecord(storage), [id]: now };
  safeSet(storage, POPUP_FREQ_KEY, JSON.stringify(next));
}

// ── Visit days (welcome-back / install / your-camera) ───────────────

/** A visitor-local day key, YYYY-MM-DD in the visitor's own timezone. */
export function dayKey(now: number): string {
  const d = new Date(now);
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export interface VisitsRecord {
  days: string[];
}

export function parseVisitsRecord(raw: string | null): VisitsRecord {
  if (!raw) return { days: [] };
  try {
    const v = JSON.parse(raw) as { days?: unknown } | null;
    if (!v || !Array.isArray(v.days)) return { days: [] };
    return {
      days: v.days.filter(
        (d): d is string => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d),
      ),
    };
  } catch {
    return { days: [] };
  }
}

export interface VisitOutcome {
  record: VisitsRecord;
  /** Distinct visit days BEFORE today (0 on a first-ever visit). */
  priorDays: number;
  /** Distinct visit days including today. */
  totalDays: number;
  /** True when the visitor has been here on an earlier day. */
  isReturnDay: boolean;
}

/** Record today's visit (idempotent within a day) and report how the
 *  visitor's history looked BEFORE today was added. */
export function applyVisitDay(record: VisitsRecord, today: string): VisitOutcome {
  const prior = new Set(record.days.filter((d) => d !== today));
  const next = new Set(record.days);
  next.add(today);
  return {
    record: { days: [...next].sort() },
    priorDays: prior.size,
    totalDays: next.size,
    isReturnDay: prior.size >= 1,
  };
}

export function readVisitsRecord(storage: StorageLike | null): VisitsRecord {
  return parseVisitsRecord(safeGet(storage, POPUP_VISITS_KEY));
}

export function writeVisitsRecord(
  storage: StorageLike | null,
  record: VisitsRecord,
): void {
  safeSet(storage, POPUP_VISITS_KEY, JSON.stringify(record));
}

// ── Per-camera visit days (your_camera) ─────────────────────────────

export interface CameraVisitsRecord {
  [cameraKey: string]: { days: string[]; name: string | null };
}

export function parseCameraVisitsRecord(raw: string | null): CameraVisitsRecord {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw) as Record<string, unknown> | null;
    if (!v || typeof v !== "object") return {};
    const out: CameraVisitsRecord = {};
    for (const [key, val] of Object.entries(v)) {
      if (!val || typeof val !== "object") continue;
      const rec = val as { days?: unknown; name?: unknown };
      if (!Array.isArray(rec.days)) continue;
      out[key] = {
        days: rec.days.filter(
          (d): d is string => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d),
        ),
        name: typeof rec.name === "string" && rec.name ? rec.name : null,
      };
    }
    return out;
  } catch {
    return {};
  }
}

export function readCameraVisits(storage: StorageLike | null): CameraVisitsRecord {
  return parseCameraVisitsRecord(safeGet(storage, POPUP_CAMERA_VISITS_KEY));
}

export function writeCameraVisits(
  storage: StorageLike | null,
  record: CameraVisitsRecord,
): void {
  safeSet(storage, POPUP_CAMERA_VISITS_KEY, JSON.stringify(record));
}

/** Record one open of `key` on `today`; returns the camera's distinct
 *  visit-day count including today. Bounded: keeps the 40 most recent
 *  cameras so the record can never grow without limit. */
export function applyCameraVisit(
  record: CameraVisitsRecord,
  key: string,
  name: string | null,
  today: string,
): { record: CameraVisitsRecord; distinctDays: number } {
  const existing = record[key];
  const days = new Set(existing?.days ?? []);
  days.add(today);
  const next: CameraVisitsRecord = {
    ...record,
    [key]: { days: [...days].sort(), name: name ?? existing?.name ?? null },
  };
  const keys = Object.keys(next);
  if (keys.length > 40) {
    // Drop the cameras whose most recent day is oldest.
    keys
      .sort((a, b) => {
        const da = next[a].days[next[a].days.length - 1] ?? "";
        const db = next[b].days[next[b].days.length - 1] ?? "";
        return da < db ? -1 : da > db ? 1 : 0;
      })
      .slice(0, keys.length - 40)
      .forEach((k) => delete next[k]);
  }
  return { record: next, distinctDays: days.size };
}

/** Cameras the visitor has opened on ≥ `minDays` distinct days. */
export function habitualCameras(
  record: CameraVisitsRecord,
  minDays: number,
): { key: string; name: string | null; distinctDays: number }[] {
  return Object.entries(record)
    .map(([key, rec]) => ({ key, name: rec.name, distinctDays: rec.days.length }))
    .filter((c) => c.distinctDays >= minDays)
    .sort((a, b) => b.distinctDays - a.distinctDays);
}

// ── Path discipline ─────────────────────────────────────────────────

/** Surfaces no popup in this system may interrupt: checkout and the
 *  payment sheet, auth, account management, admin. (pricing_save is
 *  the one popup that lives on /pricing; every OTHER popup treats
 *  /pricing as excluded so the two never compete.) */
export const POPUP_EXCLUDED_PREFIXES = [
  "/checkout",
  "/admin",
  "/signin",
  "/signup",
  "/welcome",
  "/settings",
] as const;

/** Strip a leading locale segment ("/es/pricing" → "/pricing") so the
 *  path rules hold in the [locale] tree too. Only strips when what
 *  follows still looks like an app path. */
export function stripLocalePrefix(pathname: string): string {
  const m = pathname.match(/^\/[a-z]{2}(?:-[a-zA-Z]{2})?(\/.*)$/);
  return m ? m[1] : pathname;
}

export function isPopupExcludedPath(pathname: string, forPopup?: PopupId): boolean {
  const p = stripLocalePrefix(pathname);
  if (POPUP_EXCLUDED_PREFIXES.some((x) => p === x || p.startsWith(`${x}/`))) {
    return true;
  }
  if (forPopup !== "pricing_save" && (p === "/pricing" || p.startsWith("/pricing/"))) {
    return true;
  }
  return false;
}

// ── Arbitration ─────────────────────────────────────────────────────

export interface ArbitrationInput {
  /** Popups whose own trigger + eligibility rules are satisfied now. */
  candidates: PopupId[];
  /** The session claim, if any (own system or external). */
  sessionClaim: PopupId | "external" | null;
  /** Cross-visit frequency record. */
  freq: FreqRecord;
  now: number;
  /** A modal dialog (ladder prompt, checkout sheet, another popup) is
   *  currently open — every popup defers. */
  modalOpen: boolean;
  pathname: string;
}

/**
 * The one decision every popup waits on. Returns the popup to show, or
 * null (with the discipline reason, for tests and debugging):
 *  - "modal-open"     — something stronger is on screen; defer.
 *  - "excluded-path"  — this surface is never interrupted.
 *  - "session-claimed"— one popup already won this session.
 *  - "none-eligible"  — nothing passed its own rules + the freq cap.
 */
export function arbitrate(input: ArbitrationInput): {
  show: PopupId | null;
  reason: "ok" | "modal-open" | "excluded-path" | "session-claimed" | "none-eligible";
} {
  if (input.modalOpen) return { show: null, reason: "modal-open" };
  if (input.sessionClaim) return { show: null, reason: "session-claimed" };
  const onPath = input.candidates.filter(
    (id) => !isPopupExcludedPath(input.pathname, id),
  );
  if (input.candidates.length > 0 && onPath.length === 0) {
    return { show: null, reason: "excluded-path" };
  }
  const allowed = onPath
    .filter((id) => frequencyAllows(input.freq, id, input.now))
    .sort((a, b) => POPUP_PRIORITY[b] - POPUP_PRIORITY[a]);
  if (allowed.length === 0) return { show: null, reason: "none-eligible" };
  return { show: allowed[0], reason: "ok" };
}

/** True when `pathname` sits under a globally excluded prefix — no
 *  popup at all may fire there (used by the shell to skip work). */
export function pathExcludesAll(pathname: string): boolean {
  const p = stripLocalePrefix(pathname);
  return POPUP_EXCLUDED_PREFIXES.some((x) => p === x || p.startsWith(`${x}/`));
}

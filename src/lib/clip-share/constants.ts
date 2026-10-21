// ── Public clip shares: shared constants ─────────────────────────────
// Client-safe (no imports) — the share dialog in the browser and the
// server routes in core.ts both read these, so the numbers the UI
// states are the numbers the API enforces.

/** Per-file ceiling for a HOSTED share (browser-local clips may be
 *  larger — the recording API registers up to 500 MB — but hosting is
 *  our storage bill, so shares cap lower). Stated in the share UI. */
export const MAX_SHARE_FILE_BYTES = 200_000_000; // 200 MB

/** Active (non-revoked) shares per user. Revoking frees a slot. */
export const MAX_ACTIVE_SHARES_PER_USER = 50;

/** Blob pathname prefix every shared file lives under. */
export const SHARE_PATH_PREFIX = "clip-shares/";

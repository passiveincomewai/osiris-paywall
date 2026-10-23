/**
 * OSIRIS — Copernicus / Sentinel Hub server-only helper.
 *
 * SERVER ONLY: reads SENTINEL_HUB_CLIENT_ID / SENTINEL_HUB_CLIENT_SECRET
 * and exchanges them for an access token — never import this from a
 * client component, and never ship the secret or a token to the browser.
 *
 * Credential boundary (honest no-op): activation requires the OWNER to
 * register a CDSE account at dataspace.copernicus.eu and create an
 * OAuth client in the Sentinel Hub dashboard — nobody registers
 * accounts on the owner's behalf. With either env var unset, every
 * entry point returns null without any network call.
 *
 * This is deliberately a server helper only (no UI wiring): it gives
 * place/event pages a `getLatestTrueColourImage(lat, lng)` call that
 * returns the latest Sentinel-2 true-colour PNG over the point, with
 * the OAuth token cached until shortly before it expires.
 */
import {
  buildTrueColourRequest,
  SENTINEL_TOKEN_URL,
  type TrueColourOptions,
} from './request';
import type { SentinelImageResult, SentinelToken } from './types';

export function isSentinelConfigured(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return Boolean(
    env.SENTINEL_HUB_CLIENT_ID?.trim() && env.SENTINEL_HUB_CLIENT_SECRET?.trim(),
  );
}

export function sentinelCredentials(
  env: Record<string, string | undefined> = process.env,
): { clientId: string; clientSecret: string } | null {
  const clientId = env.SENTINEL_HUB_CLIENT_ID?.trim();
  const clientSecret = env.SENTINEL_HUB_CLIENT_SECRET?.trim();
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

/** The form body for the CDSE client-credentials grant. */
export function buildTokenRequestBody(clientId: string, clientSecret: string): string {
  return new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  }).toString();
}

/** Parse a CDSE token response; `now` is epoch ms. Applies a 60 s skew
 *  so a token is never used right up to its expiry edge. */
export function parseTokenResponse(raw: unknown, now: number): SentinelToken | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const accessToken = typeof r.access_token === 'string' ? r.access_token : null;
  const expiresIn = typeof r.expires_in === 'number' ? r.expires_in : null;
  if (!accessToken || expiresIn === null || expiresIn <= 0) return null;
  return {
    accessToken,
    expiresAt: now + Math.max(0, expiresIn - 60) * 1000,
    tokenType: typeof r.token_type === 'string' ? r.token_type : 'Bearer',
  };
}

export interface SentinelDeps {
  /** POSTs the token form, resolves with parsed JSON. */
  postToken: (url: string, body: string) => Promise<unknown>;
  /** POSTs the Process API request with a bearer token, resolves with bytes. */
  postProcess: (
    url: string,
    body: unknown,
    accessToken: string,
  ) => Promise<{ contentType: string; bytes: Uint8Array }>;
  credentials: () => { clientId: string; clientSecret: string } | null;
  now?: () => number;
}

export function createSentinelService(deps: SentinelDeps) {
  const now = deps.now ?? (() => Date.now());
  let token: SentinelToken | null = null;
  let tokenInflight: Promise<SentinelToken | null> | null = null;

  async function getAccessToken(): Promise<string | null> {
    const creds = deps.credentials();
    if (!creds) return null; // credential boundary — clean no-op
    if (token && now() < token.expiresAt) return token.accessToken;
    if (tokenInflight) return tokenInflight.then((t) => t?.accessToken ?? null);
    tokenInflight = (async () => {
      try {
        const raw = await deps.postToken(
          SENTINEL_TOKEN_URL,
          buildTokenRequestBody(creds.clientId, creds.clientSecret),
        );
        token = parseTokenResponse(raw, now());
        return token;
      } catch {
        token = null;
        return null;
      } finally {
        tokenInflight = null;
      }
    })();
    const t = await tokenInflight;
    return t?.accessToken ?? null;
  }

  /**
   * Latest Sentinel-2 true-colour image over a point, or null when
   * unconfigured, when no pass in the window answers, or on any
   * upstream failure. Suitable for place/event pages server-side.
   */
  async function getLatestTrueColourImage(
    opts: TrueColourOptions,
  ): Promise<SentinelImageResult | null> {
    const accessToken = await getAccessToken();
    if (!accessToken) return null;
    const request = buildTrueColourRequest({ ...opts, now: new Date(now()) });
    try {
      const res = await deps.postProcess(request.url, request.body, accessToken);
      if (!res.bytes || res.bytes.length === 0) return null;
      const dataFilter = request.body.input.data[0].dataFilter.timeRange;
      return {
        contentType: res.contentType,
        bytes: res.bytes,
        bbox: request.body.input.bounds.bbox,
        from: dataFilter.from,
        to: dataFilter.to,
        fetchedAt: now(),
      };
    } catch {
      return null; // graceful failure — callers render without imagery
    }
  }

  return { getAccessToken, getLatestTrueColourImage };
}

/* ── Process-wide service (real fetch, real env, real clock) ─────── */

const singleton = createSentinelService({
  credentials: () => sentinelCredentials(),
  postToken: async (url, body) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`CDSE identity → ${res.status}`);
    return res.json();
  },
  postProcess: async (url, body, accessToken) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'image/png',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`Sentinel Hub Process → ${res.status}`);
    return {
      contentType: res.headers.get('content-type') ?? 'image/png',
      bytes: new Uint8Array(await res.arrayBuffer()),
    };
  },
});

/** Server helper for place/event pages — see module docstring. */
export function getLatestTrueColourImage(
  opts: TrueColourOptions,
): Promise<SentinelImageResult | null> {
  return singleton.getLatestTrueColourImage(opts);
}

export function getSentinelAccessToken(): Promise<string | null> {
  return singleton.getAccessToken();
}

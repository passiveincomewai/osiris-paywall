import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { planTierOf, tierSatisfies } from '@/lib/plan-tier';

/* ------------------------------------------------------------------ */
/* Freemium config                                                     */
/* ------------------------------------------------------------------ */
// The map itself (/) is free for everyone, no signup — like osirisai.live.
// These page prefixes require an ACTIVE subscription (Pro or VIP).
const PROTECTED_PREFIXES = ['/map', '/osint'];

// VIP-only data APIs: the OSINT intel layers (lib/plan-tier — the annual
// plan, sold as VIP Pro). Cyber, maritime, GDELT/conflict and live news
// moved from Pro to VIP-only in the tier split; everything else premium
// stays Pro.
const VIP_API_PREFIXES = [
  '/api/cyber-attacks', '/api/cyber-threats', '/api/malware',
  '/api/gdelt', '/api/gdelt-events',
  '/api/conflicts', '/api/frontlines',
  '/api/maritime',
  '/api/live-news', '/api/news',
];

// Premium data APIs: intel-grade / costly-to-serve endpoints. Free tier
// gets the ambient layers (flights, weather, quakes, fires, satellites).
// Everything else under /api is open (auth, checkout, webhooks, health,
// and the free data routes).
const PREMIUM_API_PREFIXES = [
  '/api/infrastructure', '/api/scm-suppliers', '/api/sentinel',
  '/api/region-dossier', '/api/entity',
  '/api/markets', '/api/crypto', '/api/chain', '/api/oi',
  '/api/country-risk',
  '/api/osint',
  '/api/ai',
  '/api/cloudflare-radar', '/api/radar', '/api/arcgis',
  '/api/scanner',
  '/api/mcp', '/api/sdk',
];
// NOTE: /api/proxy-tiles is intentionally NOT premium — the map routes every
// basemap request (style JSON, glyphs, sprites, vector tiles) through it.
// Gating it turns the whole globe black.

// Auth.js v5 session cookie names (secure variant in production).
const SESSION_COOKIE = process.env.NODE_ENV === 'production'
  ? '__Secure-authjs.session-token'
  : 'authjs.session-token';

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  );
}

function isPremiumApi(pathname: string): boolean {
  return PREMIUM_API_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  );
}

function isVipApi(pathname: string): boolean {
  return VIP_API_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  );
}

type PaywallToken = {
  sub?: string;
  subscriptionStatus?: string;
  planTier?: string;
} | null;

/**
 * The gate decision for a data API, from the JWT alone (pure — pinned by
 * tests). Tier comes from lib/plan-tier's planTierOf: the token's
 * planTier claim is authoritative; a legacy token without one can prove
 * Pro (active status) but never VIP, so intel stays closed until the
 * token refreshes (the jwt callback refills planTier when missing).
 * vip ⊃ pro: a VIP token opens every Pro gate too.
 */
export function apiGate(pathname: string, token: PaywallToken): 'open' | 'pro' | 'vip' {
  const tier = token?.sub ? planTierOf({ user: token }) : 'free';
  if (isVipApi(pathname)) return tierSatisfies(tier, 'vip') ? 'open' : 'vip';
  if (isPremiumApi(pathname)) return tierSatisfies(tier, 'pro') ? 'open' : 'pro';
  return 'open';
}

async function readPaywallToken(request: NextRequest): Promise<PaywallToken> {
  return (await getToken({
    req: request,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
    cookieName: SESSION_COOKIE,
  }).catch(() => null)) as PaywallToken;
}

async function hasActivePass(request: NextRequest): Promise<boolean> {
  const token = await readPaywallToken(request);
  // Pro or VIP (vip ⊃ pro). `trialing` is normalized to `active` in the
  // jwt claims (src/auth.ts), so trial users pass.
  return !!token?.sub && tierSatisfies(planTierOf({ user: token }), 'pro');
}

/* ------------------------------------------------------------------ */
/* Middleware                                                          */
/* ------------------------------------------------------------------ */
export async function middleware(request: NextRequest) {
  /* ---- freemium gate (JWT only — no DB round-trip on the edge) ---- */
  // NOTE: the old Umami analytics fetches were removed 2026-10-11. They fired
  // twice per request at http://umami-umami-1:3000, a hostname that only
  // resolves inside the self-hosted compose network — dead weight (two failing
  // DNS lookups) on every page load in production. First-party analytics now
  // live in <AnalyticsTracker /> → /api/analytics/track.
  const url = request.nextUrl.pathname;
  // Premium data APIs: 402 for non-subscribers (no redirect — these are
  // fetched by the map client, which shows an upgrade prompt).
  if (url.startsWith('/api/')) {
    const gate = apiGate(url, await readPaywallToken(request));
    if (gate === 'vip') {
      return NextResponse.json(
        { error: 'vip_required', message: 'This intel layer requires VIP Pro.' },
        { status: 402 }
      );
    }
    if (gate === 'pro') {
      return NextResponse.json(
        { error: 'premium_required', message: 'This layer requires WorldEye Pro.' },
        { status: 402 }
      );
    }
    return NextResponse.next();
  }

  // Premium pages redirect to /premium like a paywall.
  if (!isProtectedPath(url)) return NextResponse.next();

  if (!(await hasActivePass(request))) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = '/premium';
    redirect.search = `?from=${encodeURIComponent(url)}`;
    return NextResponse.redirect(redirect);
  }

  return NextResponse.next();
}

/* Assets are excluded, not just pages. MapLibre 6 loads its worker from
   /vendor/maplibre/<version>/ at runtime, and the basemap style from
   /dark-matter-style.json — neither is under _next/static, so both used to
   match here and pay two umami round trips before the map could start. That is
   the same starvation that 2f375dd fixed for the CCTV routes, moved onto the
   map's critical path. Analytics wants page views; asset fetches are not one.
   NOTE: /api/* DOES enter this middleware (freemium needs it to gate premium
   data APIs). Public API routes (auth, checkout, webhooks, health, free data)
   pass straight through; only PREMIUM_API_PREFIXES are gated. */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|vendor|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mjs|js|css|json|pbf|mvt|woff|woff2|ico|txt)$).*)',
  ],
}

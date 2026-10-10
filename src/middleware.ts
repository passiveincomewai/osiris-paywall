import { NextResponse } from 'next/server';
import type { NextRequest, NextFetchEvent } from 'next/server';
import { getToken } from 'next-auth/jwt';

/* ------------------------------------------------------------------ */
/* Freemium config                                                     */
/* ------------------------------------------------------------------ */
// The map itself (/) is free for everyone, no signup — like osirisai.live.
// These page prefixes require an ACTIVE weekly subscription (premium).
const PROTECTED_PREFIXES = ['/map', '/osint'];

// Premium data APIs: intel-grade / costly-to-serve endpoints. Free tier
// gets the ambient layers (flights, weather, quakes, fires, satellites).
// Everything else under /api is open (auth, checkout, webhooks, health,
// and the free data routes).
const PREMIUM_API_PREFIXES = [
  '/api/cyber-attacks', '/api/cyber-threats', '/api/malware',
  '/api/gdelt', '/api/gdelt-events', '/api/live-news', '/api/news',
  '/api/maritime',
  '/api/infrastructure', '/api/scm-suppliers', '/api/sentinel',
  '/api/region-dossier', '/api/entity',
  '/api/markets', '/api/crypto', '/api/chain', '/api/oi',
  '/api/conflicts', '/api/frontlines', '/api/country-risk',
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

type PaywallToken = { sub?: string; subscriptionStatus?: string } | null;

async function hasActivePass(request: NextRequest): Promise<boolean> {
  const token = (await getToken({
    req: request,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
    cookieName: SESSION_COOKIE,
  }).catch(() => null)) as PaywallToken;

  // Strict: only `active` grants access. Add 'trialing' here if you
  // ever attach a trial to the weekly price.
  return !!token?.sub && token.subscriptionStatus === 'active';
}

/* ------------------------------------------------------------------ */
/* Middleware                                                          */
/* ------------------------------------------------------------------ */
export async function middleware(request: NextRequest, event: NextFetchEvent) {
  /* ---- existing Umami analytics: fire-and-forget, runs for every   ----
     ---- matched request INCLUDING /pricing (marketing wants the data) ---- */
  const url = request.nextUrl.pathname;

  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || '127.0.0.1';
  const userAgent = request.headers.get('user-agent') || 'Unknown OSIRIS Client';

  const basePayload = {
    hostname: request.nextUrl.hostname,
    language: "en-US",
    referrer: request.headers.get('referer') || "",
    screen: "1920x1080",
    title: "OSIRIS",
    url: url,
    website: process.env.UMAMI_WEBSITE_ID || "cd8f216c-fc3f-45f5-ba1a-e10309a61d18"
  };

  /* Bounded, because these are fire-and-forget analytics on the critical path.
     `umami-umami-1` only resolves inside the production compose network; on a
     developer's machine it is ENOTFOUND, and two unbounded requests per page
     view accumulated against the shared connection pool until the app's own
     API routes could not get a socket. The CCTV route would then time out
     region after region and the map came up half empty — the analytics were
     starving the thing they were measuring. */
  const pageView = fetch('http://umami-umami-1:3000/api/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': userAgent, 'x-forwarded-for': ip },
    body: JSON.stringify({ payload: basePayload, type: "event" }),
    signal: AbortSignal.timeout(2000),
  }).catch(() => {});

  const ipEvent = fetch('http://umami-umami-1:3000/api/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': userAgent, 'x-forwarded-for': ip },
    body: JSON.stringify({
      payload: { ...basePayload, name: "Network Log", data: { IP: ip } },
      type: "event"
    }),
    signal: AbortSignal.timeout(2000),
  }).catch(() => {});

  event.waitUntil(Promise.all([pageView, ipEvent]));

  /* ---- freemium gate (JWT only — no DB round-trip on the edge) ---- */
  // Premium data APIs: 402 for non-subscribers (no redirect — these are
  // fetched by the map client, which shows an upgrade prompt).
  if (url.startsWith('/api/')) {
    if (isPremiumApi(url) && !(await hasActivePass(request))) {
      return NextResponse.json(
        { error: 'premium_required', message: 'This intel layer requires the Weekly Premium Pass.' },
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

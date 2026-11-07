import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  try {
    // Only allow known basemap tile hosts to prevent open proxy abuse:
    // tiles.openfreemap.org serves the globe's basemap (lib/basemap-style
    // — its assets are fetched direct by the browser today, but the
    // proxy path stays available for them); cartocdn.com remains for
    // the mini maps that still point at CARTO's style while they are
    // migrated. This route must stay UNGATED — gating it is what caused
    // the 2026-10-10 black globe.
    const targetUrl = new URL(url);
    const host = targetUrl.hostname.toLowerCase();
    const allowed =
      host === 'tiles.openfreemap.org' ||
      host === 'cartocdn.com' ||
      host.endsWith('.cartocdn.com');
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden domain' }, { status: 403 });
    }

    const response = await fetch(targetUrl.toString(), { signal: AbortSignal.timeout(15000),
      headers: {
        'Accept': '*/*',
        'User-Agent': 'Osiris-Tile-Proxy/1.0',
      },
      // Using Next.js fetch cache options to heavily cache tiles locally
      next: {
        revalidate: 31536000, // Cache for 1 year
      }
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch tile' }, { status: response.status });
    }

    const data = await response.arrayBuffer();
    
    // Forward the content-type from the upstream response
    const contentType = response.headers.get('content-type') || 'application/octet-stream';

    return new NextResponse(data, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('Tile proxy error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { describe, it, expect, vi, beforeEach } from 'vitest';

/* The catalogue stores are seams, as in frames.test: the in-memory
   payload and the disk snapshot, either present or absent per case. */
let payload: { json: Buffer; builtAt: number; total: number; complete: boolean } | undefined;
let snapshot: { builtAt: number; regions: Record<string, unknown[]> } | null = null;
vi.mock('@/lib/cctv-snapshot', () => ({
  getPayload: () => payload,
  readSnapshot: async () => snapshot,
}));

/* The in-process catalogue build is a seam of its own: by default it does
   nothing (so "no catalogue anywhere" still means none), and a test can
   make it produce the payload a real build would have. */
let builds = 0;
let buildImpl: () => Promise<void> = async () => {};
vi.mock('@/lib/vision/catalogue-build', () => ({
  buildCatalogueHere: () => { builds++; return buildImpl(); },
}));

/* The fast lane (in-repo loaders, called directly) is likewise a seam:
   empty by default, so the payload/snapshot cases mean what they meant
   before it existed. */
let staticsImpl: () => Promise<unknown[]> = async () => [];
vi.mock('@/lib/vision/catalogue-fastlane', () => ({
  fastlaneStatics: () => staticsImpl(),
  fastlaneFaa: async () => [],
}));

/* Real curated ids from the landing manifest (src/lib/landing-cameras):
   sky-it-trevi leads both "featured" and "cities". */
const TREVI = {
  id: 'sky-it-trevi', name: 'Trevi Fountain', city: 'Rome', country: 'Italy',
  source: 'SkylineWebcams', lat: 41.9, lng: 12.48,
  feed_url: 'https://cdn.example.com/trevi.jpg',
};
const TREVI_STALE = { ...TREVI, name: 'Trevi (stale copy)', feed_url: 'https://cdn.example.com/trevi-old.jpg' };
/* Embed-only: an operator page and no playable media — previewMedia
   refuses it, so it drops out of the gallery. */
const EMBED_ONLY = {
  id: 'occ-biodic-43', name: 'Embed only', city: 'Biodic', country: 'Nowhere',
  source: 'x', lat: 1, lng: 2, external_url: 'https://example.com/embed',
};

interface ShowcaseBody {
  category: string;
  label: string;
  href: string;
  cameras: Array<{ id: string; name: string; media: { kind: string; url: string } }>;
}

async function get(qs = ''): Promise<{ status: number; cacheControl: string | null; body: ShowcaseBody }> {
  const { GET } = await import('./route');
  const res = await GET(new Request(`http://localhost/api/cctv/showcase${qs}`));
  return { status: res.status, cacheControl: res.headers.get('Cache-Control'), body: (await res.json()) as ShowcaseBody };
}

const usePayload = (cams: unknown[], complete = true) => {
  payload = { json: Buffer.from(JSON.stringify({ cameras: cams })), builtAt: 1, total: cams.length, complete };
};

beforeEach(() => {
  vi.resetModules();
  payload = undefined;
  snapshot = null;
  builds = 0;
  buildImpl = async () => {};
  staticsImpl = async () => [];
});

describe('GET /api/cctv/showcase', () => {
  it('answers from a complete payload without building', async () => {
    usePayload([TREVI, EMBED_ONLY]);
    const { status, cacheControl, body } = await get();
    expect(status).toBe(200);
    expect(cacheControl).toContain('s-maxage=300');
    expect(body.category).toBe('featured');
    expect(body.label).toBe('Featured');
    expect(body.href).toBe('/cameras');
    /* The embed-only pick is dropped; the playable one keeps its media. */
    expect(body.cameras.map(c => c.id)).toEqual(['sky-it-trevi']);
    expect(body.cameras[0].media).toEqual({ kind: 'jpg', url: 'https://cdn.example.com/trevi.jpg' });
    expect(builds).toBe(0);
  });

  it('answers from the disk snapshot when there is no payload', async () => {
    snapshot = { builtAt: 5, regions: { europe: [TREVI] } };
    const { body } = await get();
    expect(body.cameras.map(c => c.id)).toEqual(['sky-it-trevi']);
    expect(builds).toBe(0);
  });

  it('merges every source when a partial snapshot and a partial payload coexist', async () => {
    /* The regression this guards: a build running in this process writes
       the snapshot region by region while it fills, so mid-build the
       route held a partial snapshot AND a partial payload. Reading the
       snapshot alone shadowed the payload and the fast lane — the
       gallery shrank below what the cold read had served (featured
       6 → 1) until the build completed. Each source below holds one
       manifest camera the others do not; all three must answer. */
    const LAS_VISTAS = {
      id: 'sky-es-las-vistas', name: 'Playa Las Vistas', city: 'Tenerife', country: 'Spain',
      source: 'SkylineWebcams', lat: 28.05, lng: -16.72,
      feed_url: 'https://cdn.example.com/las-vistas.jpg',
    };
    const AMALFI = {
      id: 'sky-it-amalfi', name: 'Amalfi Coast - Positano', city: 'Positano', country: 'Italy',
      source: 'SkylineWebcams', lat: 40.62, lng: 14.49,
      feed_url: 'https://cdn.example.com/amalfi.jpg',
    };
    staticsImpl = async () => [TREVI];
    snapshot = { builtAt: 5, regions: { europe: [LAS_VISTAS] } };
    usePayload([AMALFI], false);
    const { body } = await get();
    expect(body.cameras.map(c => c.id)).toEqual(['sky-it-trevi', 'sky-es-las-vistas', 'sky-it-amalfi']);
    expect(builds).toBe(0);
  });

  it('the live payload wins over the snapshot, and the snapshot over the fast lane', async () => {
    const SNAPSHOT_TREVI = { ...TREVI, name: 'Trevi (snapshot copy)', feed_url: 'https://cdn.example.com/trevi-snap.jpg' };
    staticsImpl = async () => [TREVI_STALE];
    snapshot = { builtAt: 5, regions: { europe: [SNAPSHOT_TREVI] } };
    usePayload([TREVI], false);
    const { body } = await get();
    expect(body.cameras).toHaveLength(1);
    expect(body.cameras[0].name).toBe('Trevi Fountain');
    expect(body.cameras[0].media.url).toBe('https://cdn.example.com/trevi.jpg');
  });

  it('builds the catalogue in this process when neither a payload nor a snapshot exists', async () => {
    /* The production failure this guards: on Vercel the showcase
       function's instance never shares memory with /api/cctv's and the
       disk snapshot is never deployed, so both older sources are absent
       forever and the route answered an empty gallery for everyone. */
    buildImpl = async () => { usePayload([TREVI]); };
    staticsImpl = async () => [TREVI_STALE];
    const { body } = await get();
    expect(builds).toBeGreaterThan(0);
    expect(body.cameras.map(c => c.id)).toEqual(['sky-it-trevi']);
    /* The built payload's record wins over the fast lane's copy. */
    expect(body.cameras[0].name).toBe('Trevi Fountain');
    expect(body.cameras[0].media.url).toBe('https://cdn.example.com/trevi.jpg');
  });

  it('answers from the fast lane when the build lands nothing here', async () => {
    staticsImpl = async () => [TREVI];
    const { body } = await get();
    expect(body.cameras.map(c => c.id)).toEqual(['sky-it-trevi']);
  }, 20_000);

  it('serves the category asked for, and featured for an unknown one', async () => {
    usePayload([TREVI]);
    const cities = await get('?category=cities');
    expect(cities.body.category).toBe('cities');
    expect(cities.body.label).toBe('Cities');
    expect(cities.body.href).toBe('/city-webcams');
    expect(cities.body.cameras[0]?.id).toBe('sky-it-trevi');
    const bogus = await get('?category=bogus');
    expect(bogus.body.category).toBe('featured');
  });

  it('answers an empty list, not an error, when no source has the catalogue', async () => {
    const { status, body } = await get();
    expect(status).toBe(200);
    expect(body.cameras).toEqual([]);
  }, 20_000);
});

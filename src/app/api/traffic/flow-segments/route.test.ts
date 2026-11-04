import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';
import { requestHasTrafficAccess } from '@/lib/traffic/access';
import { trafficPublicAccess } from '@/lib/traffic/public-access';

vi.mock('@/lib/traffic/access', () => ({
  requestHasTrafficAccess: vi.fn(),
  trafficAccessForStatus: (s: string | null | undefined) => s === 'active',
}));

vi.mock('@/lib/traffic/public-access', () => ({
  trafficPublicAccess: vi.fn(),
}));

const mockAccess = vi.mocked(requestHasTrafficAccess);
const mockPublic = vi.mocked(trafficPublicAccess);
const upstream = vi.fn();

const WSDOT_FIXTURE = JSON.stringify([{
  AverageTime: 20, CurrentTime: 40, Name: 'Test Corridor',
  StartPoint: { Latitude: 47.62, Longitude: -122.32 },
  EndPoint: { Latitude: 47.60, Longitude: -122.30 },
  TimeUpdated: '/Date(1793784000000-0800)/',
}]);

const NDW_SITES = `<roa:measurementSite id="S1" version="1"><roa:measurementSiteLocation xsi:type="loc:PointLocation"><loc:pointByCoordinates><loc:pointCoordinates><loc:latitude>52.09</loc:latitude><loc:longitude>5.12</loc:longitude></loc:pointCoordinates></loc:pointByCoordinates></roa:measurementSiteLocation></roa:measurementSite>`;
const NDW_MEAS = `<com:publicationTime>2026-11-04T08:24:00.000Z</com:publicationTime><roa:siteMeasurements><roa:measurementSiteReference targetClass="roa:MeasurementSite" id="S1" version="1"/><roa:physicalQuantity index="1"><roa:physicalQuantity><roa:basicData xsi:type="roa:TrafficSpeed"><roa:averageVehicleSpeed numberOfInputValuesUsed="5"><com:speed>42.0</com:speed></roa:averageVehicleSpeed></roa:basicData></roa:physicalQuantity></roa:physicalQuantity></roa:siteMeasurements>`;

const call = (qs: string) => GET(new NextRequest(`http://localhost/api/traffic/flow-segments?${qs}`));

/* The route keeps in-instance source caches as module state, so the
   upstream-failure case runs BEFORE any successful fetch of the same
   source in this file — exactly like the tile proxy's route tests. */
beforeEach(() => {
  vi.resetAllMocks();
  upstream.mockReset();
  vi.stubGlobal('fetch', upstream);
  mockPublic.mockReturnValue(false);
  mockAccess.mockResolvedValue(true);
  delete process.env.HERE_API_KEY;
  delete process.env.WSDOT_ACCESS_CODE;
  upstream.mockImplementation((url: string) => {
    const u = String(url);
    if (u.includes('wsdot.wa.gov')) return Promise.resolve(new Response(WSDOT_FIXTURE, { status: 200 }));
    if (u.includes('configuratie_meetlocaties')) return Promise.resolve(new Response(NDW_SITES, { status: 200 }));
    if (u.includes('meetgegevens')) return Promise.resolve(new Response(NDW_MEAS, { status: 200 }));
    return Promise.resolve(new Response('nope', { status: 404 }));
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.HERE_API_KEY;
  delete process.env.WSDOT_ACCESS_CODE;
});

describe('flow-segments route', () => {
  it('validates the bbox first: 400', async () => {
    expect((await call('')).status).toBe(400);
    expect((await call('bbox=1,2,3')).status).toBe(400);
    expect((await call('bbox=-122,47,-120,48')).status).toBe(400); // span > 1 degree
    expect(upstream).not.toHaveBeenCalled();
  });

  it('answers 403 to a non-subscriber while the public switch is off', async () => {
    mockAccess.mockResolvedValue(false);
    const res = await call('bbox=-122.4,47.55,-122.2,47.7');
    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ error: 'subscription_required' });
    expect(upstream).not.toHaveBeenCalled();
  });

  it('answers an honest 502 when the only applicable source is down', async () => {
    process.env.WSDOT_ACCESS_CODE = 'test-code';
    upstream.mockImplementation(() => Promise.resolve(new Response('down', { status: 503 })));
    const res = await call('bbox=-122.4,47.55,-122.2,47.7');
    expect(res.status).toBe(502);
  });

  it('serves WSDOT corridor features for a Washington view', async () => {
    process.env.WSDOT_ACCESS_CODE = 'test-code';
    const res = await call('bbox=-122.4,47.55,-122.2,47.7');
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.features).toHaveLength(1);
    expect(j.features[0].properties).toMatchObject({ relative_speed: 0.5, source: 'wsdot' });
    expect(j.pointSamples).toEqual([]);
    expect(j.at).toBe(new Date(1793784000000).toISOString());
  });

  it('serves NDW point samples for a Netherlands view (no key needed)', async () => {
    const res = await call('bbox=5.0,52.0,5.3,52.2');
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.pointSamples).toEqual([{ lng: 5.12, lat: 52.09, source: 'ndw', speedKmh: 42 }]);
    expect(j.features).toEqual([]);
  });

  it('answers 204 where no source applies (ocean view, nothing configured)', async () => {
    const res = await call('bbox=-150,20,-149.5,20.5');
    expect(res.status).toBe(204);
  });
});

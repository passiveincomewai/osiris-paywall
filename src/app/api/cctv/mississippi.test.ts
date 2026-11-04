import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  parseSiteViews,
  parseThumbnail,
  streamUrl,
  mapView,
  collectMississippiCameras,
  type MdotSite,
  type MdotView,
} from './mississippi';
import { stealthFetch } from '@/lib/stealthFetch';

vi.mock('@/lib/stealthFetch', () => ({ stealthFetch: vi.fn(), stealthHeaders: vi.fn(() => ({})) }));

/** Site 1 from LoadCameraData, verbatim (I-55 at Lakeland Dr, Jackson). */
const site1: MdotSite = {
  markerid: 'camsite_1',
  tooltip: 'I-55 at Lakeland Dr',
  lat: 32.33378,
  lon: -90.16269,
};

/**
 * Site 1's camerasite.aspx view list, trimmed to the two shapes that matter:
 * the lead `camimg` snapshot and the switchImage buttons (one per view).
 */
const site1Html = `
  <img id="camimg" alt='I-55 N at Lakeland Dr PTZ' src='https://streamingjxn1.mdottraffic.com/thumbnail?application=rtplive&streamname=010406.stream&size=352x240&format=jpg&fitmode=stretch' />
  <p id="camViews" class="camera-views">Camera: <a class='button_inbubble selected' title='I-55 N at Lakeland Dr PTZ' href='#' onclick="javascript:switchImage('https://streamingjxn1.mdottraffic.com/thumbnail?application=rtplive&streamname=010406.stream&size=352x240&format=jpg&fitmode=stretch', '010406', 'I-55 N at Lakeland Dr PTZ','', this, false, false,' Save Camera','true');" id='cambutton_010406'>N</a><a class='button_inbubble' title='I-55 S at Lakeland Dr PTZ' href='#' onclick="javascript:switchImage('https://streamingjxn2.mdottraffic.com/thumbnail?application=rtplive&streamname=010501.stream&size=352x240&format=jpg&fitmode=stretch', '010501', 'I-55 S at Lakeland Dr PTZ','', this, false, false,' Save Camera','true');" id='cambutton_010501'>S</a> </p>`;

const viewN: MdotView = {
  streamId: '010406',
  title: 'I-55 N at Lakeland Dr PTZ',
  host: 'https://streamingjxn1.mdottraffic.com',
  app: 'rtplive',
  streamName: '010406.stream',
  thumbnail:
    'https://streamingjxn1.mdottraffic.com/thumbnail?application=rtplive&streamname=010406.stream&size=352x240&format=jpg&fitmode=stretch',
};

describe('parseThumbnail', () => {
  it('splits a Wowza thumbnail URL into edge host, app and stream name', () => {
    expect(parseThumbnail(viewN.thumbnail)).toEqual({
      host: 'https://streamingjxn1.mdottraffic.com',
      app: 'rtplive',
      streamName: '010406.stream',
    });
  });

  it('rejects the novideo placeholder and other non-thumbnail URLs', () => {
    expect(parseThumbnail('https://www.MDOTtraffic.com/images/novideo.jpg?type=1')).toBeNull();
    expect(parseThumbnail('')).toBeNull();
  });
});

describe('streamUrl', () => {
  it('builds the HLS playlist the site player uses from the thumbnail parts', () => {
    expect(streamUrl(viewN)).toBe('https://streamingjxn1.mdottraffic.com/rtplive/010406.stream/playlist.m3u8');
  });
});

describe('parseSiteViews', () => {
  it('parses every view of a site, merging the lead image with its button', () => {
    const views = parseSiteViews(site1Html);
    expect(views.map(v => v.streamId)).toEqual(['010406', '010501']);
    expect(views[0]).toEqual(viewN);
    expect(views[1].host).toBe('https://streamingjxn2.mdottraffic.com');
  });

  it('drops views MDOT shows as down (novideo thumbnail)', () => {
    const html = `<a href='#' onclick="javascript:switchImage('https://www.MDOTtraffic.com/images/novideo.jpg?type=1', '051608', 'I-55 at Byram','', this);">x</a>`;
    expect(parseSiteViews(html)).toEqual([]);
  });

  it('keeps a lone lead image when the page has no view buttons', () => {
    const views = parseSiteViews(
      `<img id="camimg" alt='x' src='https://streaminghat1.mdottraffic.com/thumbnail?application=rtplive&streamname=120101.stream&size=352x240&format=jpg&fitmode=stretch' />`,
    );
    expect(views).toHaveLength(1);
    expect(views[0].streamId).toBe('120101');
  });
});

describe('mapView', () => {
  it('maps a site view to an HLS camera with its Wowza snapshot', () => {
    expect(mapView(site1, viewN)).toEqual({
      id: 'msdot-010406',
      lat: 32.33378,
      lng: -90.16269,
      name: 'I-55 N at Lakeland Dr PTZ',
      city: 'Mississippi',
      country: 'US',
      feed_url: viewN.thumbnail,
      stream_url: 'https://streamingjxn1.mdottraffic.com/rtplive/010406.stream/playlist.m3u8',
      stream_type: 'hls',
      external_url: 'https://mdottraffic.com/mapbubbles/camerasite.aspx?site=1',
      source: 'Mississippi DOT',
    });
  });

  it('falls back to the site tooltip when a view has no title', () => {
    expect(mapView(site1, { ...viewN, title: '' })?.name).toBe('I-55 at Lakeland Dr');
  });

  it('drops coordinates outside Mississippi', () => {
    // Same record, moved to Los Angeles.
    expect(mapView({ ...site1, lat: 34.05, lon: -118.24 }, viewN)).toBeNull();
  });

  it('drops a site with no usable marker id or coordinates', () => {
    expect(mapView({ ...site1, markerid: 'dms_9' }, viewN)).toBeNull();
    expect(mapView({ ...site1, lat: null }, viewN)).toBeNull();
  });
});

const site2: MdotSite = {
  markerid: 'camsite_2',
  tooltip: 'I-20 at State St',
  lat: 32.296,
  lon: -90.179,
};

const pageHtml = (stream: string, title: string) =>
  `<img id="camimg" alt='x' src='https://streamingjxn1.mdottraffic.com/thumbnail?application=rtplive&streamname=${stream}.stream&size=352x240&format=jpg&fitmode=stretch' />` +
  `<a href='#' onclick="javascript:switchImage('https://streamingjxn1.mdottraffic.com/thumbnail?application=rtplive&streamname=${stream}.stream&size=352x240&format=jpg&fitmode=stretch', '${stream}', '${title}','', this, false, false,' Save Camera','true');">N</a>`;

/** A fetch that behaves like the real one: answers, delays, or hangs
 *  until the caller's signal aborts it. */
function fakeFetch(behaviour: (siteId: string) => 'ok' | 'hang' | 'slow') {
  const streamFor = (siteId: string) => (siteId === '1' ? '010406' : `2${siteId}01`);
  return (url: unknown, init?: { signal?: AbortSignal }) => {
    const siteId = String(url).split('site=')[1];
    const mode = behaviour(siteId);
    if (mode === 'ok') return Promise.resolve(new Response(pageHtml(streamFor(siteId), 'Cam'), { status: 200 }));
    return new Promise((_resolve, reject) => {
      const timer = mode === 'slow' ? setTimeout(() => _resolve(new Response(pageHtml(streamFor(siteId), 'Cam'), { status: 200 })), 40) : undefined;
      init?.signal?.addEventListener('abort', () => {
        if (timer) clearTimeout(timer);
        reject(new Error('aborted'));
      });
    });
  };
}

describe('collectMississippiCameras (bounded fan-out)', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('collects the views of every site that answers', async () => {
    vi.mocked(stealthFetch).mockImplementation(fakeFetch(() => 'ok') as never);
    const cams = await collectMississippiCameras([site1, site2]);
    expect(cams.map((c) => c.id).sort()).toEqual(['msdot-010406', 'msdot-2201']);
  });

  /* The production failure this guards: pages whose bodies stall used
     to hold the loader open forever, so the region never landed. */
  it('a page that never answers loses only its site, and the load still completes', async () => {
    vi.mocked(stealthFetch).mockImplementation(fakeFetch((id) => (id === '2' ? 'hang' : 'ok')) as never);
    const cams = await collectMississippiCameras([site1, site2], { pageTimeoutMs: 60 });
    expect(cams.map((c) => c.id)).toEqual(['msdot-010406']);
  });

  it('stops dispatching at the deadline and returns what it has', async () => {
    vi.mocked(stealthFetch).mockImplementation(fakeFetch(() => 'slow') as never);
    const many = Array.from({ length: 10 }, (_, i) => ({
      markerid: `camsite_${i + 1}`,
      tooltip: `Site ${i + 1}`,
      lat: 32.3,
      lon: -90.1,
    }));
    const started = Date.now();
    const cams = await collectMississippiCameras(many, { concurrency: 1, deadlineMs: 90, pageTimeoutMs: 5_000 });
    expect(cams.length).toBeGreaterThan(0);
    expect(cams.length).toBeLessThan(10);
    expect(Date.now() - started).toBeLessThan(2_000);
  });
});

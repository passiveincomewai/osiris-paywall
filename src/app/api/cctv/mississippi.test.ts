import { describe, it, expect } from 'vitest';
import {
  parseSiteViews,
  parseThumbnail,
  streamUrl,
  mapView,
  type MdotSite,
  type MdotView,
} from './mississippi';

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

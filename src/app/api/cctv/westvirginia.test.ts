import { describe, it, expect } from 'vitest';
import { mapCamera, cameraName, streamUrl, parseCameraData, type WvCameraRecord } from './westvirginia';

/** A live camera, verbatim from wv511.org's buildCamerasJSONjs payload. */
const liveCamera: WvCameraRecord = {
  md5: 'CAM117',
  title: 'I-81',
  description:
    '<div id="camDescription">[BER]I-81 @ 0.5<span style="float:right">West Virginia DOT</span></div>' +
    '<!--<div id="staticCamHolder"><p><img class="webmapcamimg" id="imgCAM117" src="/images/cam_unavailable.jpg?nocache=20261022082823" /></p></div>-->' +
    '<!--STREAMING:1--><div id="streamingCamHolder"></div>',
  start_lat: '39.302863',
  start_lng: '-78.078892',
};

describe('mapCamera', () => {
  it('maps a live camera to an HLS stream on the DOT edge', () => {
    expect(mapCamera(liveCamera)).toEqual({
      id: 'wvdot-cam117',
      lat: 39.302863,
      lng: -78.078892,
      name: 'I-81 @ 0.5',
      city: 'West Virginia',
      country: 'US',
      stream_url: 'https://vtc1.roadsummary.com/rtplive/CAM117/playlist.m3u8',
      stream_type: 'hls',
      external_url: 'https://wv511.org/flowplayeri.aspx?CAMID=CAM117',
      source: 'West Virginia 511',
    });
  });

  it('drops a camera the feed does not flag as streaming', () => {
    expect(mapCamera({ ...liveCamera, description: '<div id="camDescription">[BER]I-81 @ 0.5</div>' })).toBeNull();
  });

  it('drops coordinates outside West Virginia', () => {
    // Same record, moved to Los Angeles.
    expect(mapCamera({ ...liveCamera, start_lat: '34.05', start_lng: '-118.24' })).toBeNull();
  });

  it('drops a record with no camera id or no usable coordinates', () => {
    expect(mapCamera({ ...liveCamera, md5: null })).toBeNull();
    expect(mapCamera({ ...liveCamera, start_lat: null })).toBeNull();
    expect(mapCamera({ ...liveCamera, start_lng: 'west' })).toBeNull();
  });
});

describe('cameraName', () => {
  it('strips the county bracket and the operator credit', () => {
    expect(cameraName(liveCamera)).toBe('I-81 @ 0.5');
    expect(cameraName({
      md5: 'CAM029',
      title: 'I-81',
      description: '<div id="camDescription">[BER]I-81 @ 13 King Street<span style="float:right">West Virginia DOT</span></div><!--STREAMING:1-->',
    })).toBe('I-81 @ 13 King Street');
  });

  it('falls back to the route title when the description names nothing', () => {
    expect(cameraName({ md5: 'CAM001', title: 'US-50', description: '<!--STREAMING:1-->' })).toBe('US-50');
  });
});

describe('streamUrl', () => {
  it('builds the playlist URL from the camera id', () => {
    expect(streamUrl('CAM082')).toBe('https://vtc1.roadsummary.com/rtplive/CAM082/playlist.m3u8');
  });
});

describe('parseCameraData', () => {
  it('extracts the cams array from the JavaScript payload', () => {
    const payload =
      'var styles = [[{ url: "/icons/people35.png" }]];\n' +
      'var camera_data = { "count": 1, "cams": [' +
      JSON.stringify({ md5: 'CAM117', title: 'I-81', description: 'a } brace in a string', start_lat: '39.302863', start_lng: '-78.078892' }) +
      '] };\nvar trailing = 1;';
    const records = parseCameraData(payload);
    expect(records).toHaveLength(1);
    expect(records[0].md5).toBe('CAM117');
  });

  it('throws when the payload has no camera_data', () => {
    expect(() => parseCameraData('var styles = [];')).toThrow('no camera_data');
  });
});

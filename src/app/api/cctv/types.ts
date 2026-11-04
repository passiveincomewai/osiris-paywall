export type CctvStreamType = 'jpg' | 'hls' | 'iframe' | 'mjpeg' | 'mp4';

export interface CctvCamera {
  id: string;
  lat: number;
  lng: number;
  name: string;
  city: string;
  country: string;
  /** Static image URL (MJPEG/JPG snapshot) */
  feed_url?: string;
  /** Live video stream (HLS .m3u8) or embed URL (YouTube/rtsp.me) */
  stream_url?: string;
  stream_type?: CctvStreamType;
  external_url?: string;
  source: string;
  /**
   * Direction the camera faces, in degrees clockwise from north. Set in
   * exactly three ways, told apart by heading_source:
   *  - 'faa' — the source itself publishes the facing direction (the FAA
   *    WeatherCams `cameraDirection`); a true, sourced facing.
   *  - 'name-derived' — the source's own camera NAME states the view
   *    direction with an explicit verb ("… Looking West", "… Facing
   *    North", "North View"): source-stated, but only at compass-point
   *    precision — the bearing is the named point's centre and the true
   *    facing may sit anywhere in that octant (see
   *    cctv/name-headings.ts for the strict parser contract).
   *  - 'road-derived' — an ESTIMATE produced offline from OpenStreetMap
   *    road geometry: the direction of travel of the one-way carriageway
   *    the camera overlooks, assigned only when the road match was
   *    unambiguous (see cctv/road-headings.ts for the contract). It is
   *    the road's direction, offered as the camera's likely facing —
   *    never presented as source-published.
   * A feed's own road-direction field ("Northbound" and friends) still
   * never sets this on its own: it describes the road, not the camera,
   * and only the geometry derivation turns road direction into an
   * explicitly-labelled estimate.
   */
  heading_deg?: number;
  /** Provenance of heading_deg — see its comment. */
  heading_source?: 'faa' | 'name-derived' | 'road-derived';
}

/*
 * Hosts whose still images a browser cannot load straight from the source.
 * infobanjirjps.selangor.gov.my — Selangor's flood cameras — serves over
 * plain http, which an https page blocks as mixed content, so the picture is
 * there in development and gone in production. The proxy re-serves it over
 * https. A host added here must also be in the proxy's own allowlist.
 * cctv.trafficwatchni.com — TrafficWatch NI (DfI) — 403s unless the request
 * carries a trafficwatchni.com Referer, which a browser on worldeye.app can
 * never send; the proxy sends it instead (see proxy/route.ts).
 */
const PROXY_IMAGE_HOSTS = ['infobanjirjps.selangor.gov.my', 'cctv.trafficwatchni.com'];

/** The URL a browser can actually load this still from. */
export function proxiedImageUrl(url: string): string {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return url;
  }
  return PROXY_IMAGE_HOSTS.some(h => host === h || host.endsWith('.' + h))
    ? `/api/cctv/proxy?url=${encodeURIComponent(url)}`
    : url;
}

export function normalizeFeedUrl(url: string): string {
  if (url.startsWith('pics/')) {
    return `http://free-webcambg.com/${url.split('?')[0]}`;
  }
  return url.split('?')[0];
}

export function inferStreamType(url: string): CctvStreamType {
  if (/\.m3u8(\?|$)/i.test(url)) return 'hls';
  if (/youtube\.com\/embed|youtube-nocookie\.com\/embed|rtsp\.me\/embed|ipcamlive\.com\/player|click2stream\.com|windy\.com\/webcams\/\d+\/embed|skylinewebcams\.com|voyage\.aprr\.fr/i.test(url)) {
    return 'iframe';
  }
  return 'jpg';
}

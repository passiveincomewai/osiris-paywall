/**
 * OSIRIS vision: the catalogue's fast lane — the loaders whose data is
 * already in this repo.
 *
 * Most of the camera catalogue is not fetched at runtime at all: the occ
 * harvest shards, the Skyline/public-webcam generations and the curated
 * regional lists are arrays in this codebase that their loaders simply
 * hand back. The catalogue route serves everything through one pooled
 * queue ordered for the map's first paint, where those instant loaders
 * wait behind dozens of slow upstream fetches; for a frame lookup that
 * ordering means a camera that exists can look missing for a minute or
 * more on a cold instance. Called directly, the same loaders answer
 * immediately, so a cold frame instance indexes them at once and lets
 * the live regions fold in from the built payload as they land.
 *
 * FAA rides along separately: it is one upstream call, fast on a real
 * network, and the only live source a frame answer regularly waits for.
 * Its promise is started early and merged whenever it lands.
 *
 * Only loaders that perform no network fetch belong in STATIC_LOADERS —
 * if one grows a fetch, it moves the cold path's latency with it.
 */
import { fetchJapanCameras } from '@/app/api/cctv/japan';
import { fetchBulgariaCameras } from '@/app/api/cctv/bulgaria';
import { fetchGreeceCameras } from '@/app/api/cctv/greece';
import { fetchSerbiaCameras } from '@/app/api/cctv/serbia';
import { fetchMacedoniaCameras } from '@/app/api/cctv/macedonia';
import { fetchTurkeyCameras } from '@/app/api/cctv/turkey';
import { fetchRomaniaCameras } from '@/app/api/cctv/romania';
import { fetchCzechiaCameras } from '@/app/api/cctv/czechia';
import { fetchSlovakiaCameras } from '@/app/api/cctv/slovakia';
import { fetchGermanyCameras } from '@/app/api/cctv/germany';
import { fetchFranceCameras } from '@/app/api/cctv/france';
import { fetchPolandCameras } from '@/app/api/cctv/poland';
import { fetchThailandCameras } from '@/app/api/cctv/thailand';
import { fetchFloridaCameras } from '@/app/api/cctv/florida';
import { fetchGeorgiaCameras } from '@/app/api/cctv/georgia';
import { fetchNorthCarolinaCameras } from '@/app/api/cctv/northcarolina';
import { fetchArizonaCameras } from '@/app/api/cctv/arizona';
import { fetchAsiaLiveCameras } from '@/app/api/cctv/asia-live';
import { fetchLatamLiveCameras, fetchAfricaLiveCameras, fetchEuropeLiveCameras } from '@/app/api/cctv/world-live';
import {
  fetchNlPublicWebcams, fetchEuropePublicWebcams, fetchAmericasPublicWebcams, fetchRestPublicWebcams,
} from '@/app/api/cctv/public-webcams';
import {
  fetchOccHarvestNorthAmerica, fetchOccHarvestLatinAmerica, fetchOccHarvestEurope,
  fetchOccHarvestAfrica, fetchOccHarvestAsiaPacific, occHarvestEnabled,
} from '@/app/api/cctv/opencctv-harvest';
import { fetchFaaCameras } from '@/app/api/cctv/faa';

type Loader = () => Promise<unknown[]>;

const STATIC_LOADERS: Loader[] = [
  fetchJapanCameras,
  fetchBulgariaCameras, fetchGreeceCameras, fetchSerbiaCameras, fetchMacedoniaCameras,
  fetchTurkeyCameras, fetchRomaniaCameras, fetchCzechiaCameras, fetchSlovakiaCameras,
  fetchGermanyCameras, fetchFranceCameras, fetchPolandCameras, fetchThailandCameras,
  fetchFloridaCameras, fetchGeorgiaCameras, fetchNorthCarolinaCameras, fetchArizonaCameras,
  fetchAsiaLiveCameras, fetchLatamLiveCameras, fetchAfricaLiveCameras, fetchEuropeLiveCameras,
  fetchNlPublicWebcams, fetchEuropePublicWebcams, fetchAmericasPublicWebcams, fetchRestPublicWebcams,
  ...(occHarvestEnabled()
    ? [fetchOccHarvestNorthAmerica, fetchOccHarvestLatinAmerica, fetchOccHarvestEurope,
       fetchOccHarvestAfrica, fetchOccHarvestAsiaPacific]
    : []),
];

let statics: Promise<unknown[]> | null = null;

/** Every record the in-repo loaders hold, flattened. Memoized per process:
 *  the data is code, so it cannot change under a running instance. */
export function fastlaneStatics(): Promise<unknown[]> {
  statics ??= (async () => {
    const lists = await Promise.allSettled(STATIC_LOADERS.map(loader => loader()));
    return lists.flatMap(r => (r.status === 'fulfilled' ? r.value : []));
  })();
  return statics;
}

let faa: Promise<unknown[]> | null = null;

/** The FAA WeatherCams records, or [] if the FAA cannot be reached.
 *  Memoized per process; the loader caches upstream for 30 minutes. */
export function fastlaneFaa(): Promise<unknown[]> {
  faa ??= fetchFaaCameras().catch(() => []);
  return faa;
}

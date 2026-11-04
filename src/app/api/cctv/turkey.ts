import type { CctvCamera } from './types';

// Turkey cameras temporarily removed due to Windy.com iframe embed restrictions (X-Frame-Options blocks).
// Re-checked 2026-11-04 (empty-regions audit): Windy was the only source and is a
// rights-excluded family; no official machine-readable replacement exists —
// Istanbul's municipal cameras are published only inside the İBB CepTrafik
// mobile apps and KGM publishes no camera feed. The region stays empty until
// an official feed appears; see ~/workspace/empty-regions/NOTES.md.
const TURKEY_CAMERAS: CctvCamera[] = [];

export async function fetchTurkeyCameras(): Promise<CctvCamera[]> {
  return TURKEY_CAMERAS;
}

export default TURKEY_CAMERAS;

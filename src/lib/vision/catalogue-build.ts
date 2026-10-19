/**
 * OSIRIS vision: build the camera catalogue inside this process.
 *
 * The vision code reads the catalogue from an in-memory payload that only
 * the /api/cctv route builds, or from a snapshot file on disk. On Vercel
 * every route is its own function instance with its own memory, and the
 * snapshot is git-ignored and never deployed — so a frame instance held
 * neither, and /api/cctv/frame answered 503 "still loading" for every
 * camera, permanently.
 *
 * The catalogue is not external state, though: /api/cctv assembles it from
 * loaders in this repo. So an instance that holds nothing builds the
 * catalogue itself, exactly as that route does at boot, and the payload it
 * produces is the one the vision code already reads. The import is dynamic
 * because the catalogue route's module graph is the whole camera tree —
 * vision's consumers should only pay for it when a build is actually
 * needed, never at module load.
 */
export async function buildCatalogueHere(): Promise<void> {
  const { warmCctvCatalog } = await import('@/app/api/cctv/route');
  await warmCctvCatalog();
}

# Globe live camera preview tiles — restoration report

**Branch:** `feature/globe-zoom-previews` (worktree `~/workspace/worldeye-zoom-preview`, base `e7c0285` — production master at time of work)
**Date:** 2026-10-21
**Status:** Built and gate-verified locally. NOT pushed, NOT deployed.

## What the old feature was (archaeology)

The feature was **never deleted** — it was switched off by a default flip.

- **Original implementation:** `2dceea9` — *feat(cctv): live camera previews on the map, and open in core again (#301)*, 2026-08-28. Past **zoom 13**, the cameras nearest the centre of the viewport stop being dots and show what they see: a small live frame (176×99, 16:9) pinned above each marker with a connector stem, captioned with the camera's name, with a LIVE badge. Clicking a tile opens the full camera viewer, same as clicking a dot. Bounded: **at most 8 tiles**, chosen nearest screen-centre and rejected if they would overlap a tile already placed; stills refreshed on staggered timers; tile positions written straight to the DOM on map `move` so panning never re-renders React.
- **Video tiles:** `447a28f` (#305) — MP4/HLS cameras get tiles too, rationed to **at most 4 simultaneously decoding** (decoding is the real frame-budget cost); past the cap a video camera stays a dot and opens on click.
- **The switch:** `4793e5c` (#310) — added the LayerPanel sub-layer switch *CCTV Cameras → Live Previews* with default **`cctv_previews: true`**. It stayed default-on through the paywall foundation and the freemium launch (`e17c953`).
- **The removal:** `8fb4a51` — *Fix pricing scroll, mobile optimize, remove OSIRIS from splash, perf*, 2026-10-10. As a side effect of that grab-bag perf commit, `src/app/page.tsx` flipped `cctv: true → false` **and** `cctv_previews: true → false`. The camera layer itself was later flipped back on by default; the previews default never was. `eec2a98` (2026-10-18) only changed how the sub-layer switch *renders* under an off parent — its own message says defaults were untouched.

Net effect for users since 2026-10-10: zoom in as far as you like, cameras stay dots, unless you happen to discover the Live Previews sub-layer switch. That matches the owner's report that the feature "was removed."

The implementation survives intact at production HEAD: `src/components/CctvPreviews.tsx` (476 lines), wired in `src/components/OsirisMap.tsx` (`active = activeLayers.cctv && activeLayers.cctv_previews`), with the `cctv` source still populating `feed_url` / `stream_url` / `stream_type` properties, the `cctv-dots` layer it queries, `previewMedia()` classification (jpg / mjpeg / mp4 / hls; embed-only cameras stay dots) in `src/lib/camera-preview.ts`, shared tile placement in `src/lib/map-tile-layout.ts`, and the LayerPanel switch (not premium-gated).

## What was restored

One change: `src/app/page.tsx` — the layer default `cctv_previews: false → true`, with the comment rewritten to record the history (originally on in #310, flipped off in `8fb4a51`, restored 2026-10-21 on the owner's request) so the next perf pass doesn't silently flip it again.

Restored behavior, exactly as originally shipped:

| Aspect | Value |
| --- | --- |
| Zoom threshold | ≥ 13 (`MIN_ZOOM` in CctvPreviews) |
| Simultaneous tiles | ≤ 8 total, ≤ 4 decoding video |
| Selection | Nearest screen-centre first, overlap-rejected |
| Media | Snapshot/MJPEG stills (refresh per kind, staggered); MP4/HLS video within the video cap; embed-only cameras stay dots |
| Below threshold | Plain dots, unchanged |
| Click on a tile | Opens the full camera viewer (same handler as clicking a dot) |
| Opt-out | LayerPanel → SURVEILLANCE → CCTV Cameras → Live Previews switch (unchanged, still works) |

No changes to clustering, other layers, or the day/night basemap. Because the default lives in page state with no localStorage override for layer defaults, this restores the feature for every visitor; users with an explicit `?layers=` URL or saved view keep their own choice.

## Files changed

- `src/app/page.tsx` — one default flipped (`cctv_previews: false → true`) + explanatory comment (8 insertions, 2 deletions).
- `REPORT.md` — this file.

## Gates (on this worktree, base e7c0285 + the change)

- `npx tsc --noEmit` — **pass** (exit 0, no output).
- Full vitest suite — **baseline-exact**: 3,008 passed, 23 skipped, only the 2 known baseline failures (`src/lib/oi/context.test.ts`, `src/app/api/cctv/route.test.ts`). Log: `.gate-logs/vitest.log` (uncommitted).
- `npm run build` — **pass** (exit 0). Log: `.gate-logs/build.log` (uncommitted).

A real-browser smoke test (zoom past 13 over a camera-dense area and watch tiles appear) still needs to happen at deploy time, per the standing render-gate rule — the sandbox cannot render the globe.

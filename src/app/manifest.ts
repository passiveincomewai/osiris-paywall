import type { MetadataRoute } from "next";

/**
 * The ONE authoritative WorldEye web app manifest (F17, 2026-10-22).
 *
 * Served by Next at /manifest.webmanifest and linked from the root layout
 * metadata. This replaces the two conflicting static manifests that used to
 * live in public/ (site.webmanifest — minimal, white theme, referenced
 * android-chrome icons that did not exist; manifest.json — richer, dark
 * theme, never linked). Both files are deleted; do not re-add a second
 * manifest.
 *
 * Icon files are generated from the verified 512×512 WorldEye globe-eye
 * master (public/osiris-icon.png artwork) and their real pixel dimensions
 * are pinned by src/app/manifest.test.ts.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "WorldEye — Live 3D Globe",
    short_name: "WorldEye",
    description:
      "Watch the world live on one 3D globe: 74,229 public cameras, live flights, satellites, weather radar, earthquakes and wildfires in real time.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#06060C",
    theme_color: "#06060C",
    categories: ["news", "weather", "travel", "reference"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

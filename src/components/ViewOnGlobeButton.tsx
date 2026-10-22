import { Globe } from "lucide-react";

/**
 * "View on globe" — the button camera cards/listings on the directory
 * pages carry. It takes the visitor to the WorldEye globe with this
 * exact camera open, via the site's canonical camera deep link
 * (`/?camera=<catalogue id>` — lib/camera-share.ts; the same link the
 * share buttons and the dashboard/alert "view" links use). The globe
 * page reads the param, flies to the camera and opens it through the
 * same gated path a map click takes.
 *
 * Styling is the directory pages' ghost button (white/15 border,
 * semibold, hover wash) in a compact card-sized variant.
 */
export default function ViewOnGlobeButton({
  cameraId,
  cameraName,
}: {
  cameraId: string;
  cameraName?: string;
}) {
  return (
    <a
      href={`/?camera=${encodeURIComponent(cameraId)}`}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/15 text-xs font-semibold text-white/80 hover:bg-white/5 hover:text-white transition"
      aria-label={
        cameraName ? `View ${cameraName} on the globe` : "View this camera on the globe"
      }
    >
      <Globe className="w-3.5 h-3.5 text-[#00E5FF] shrink-0" aria-hidden />
      View on globe
    </a>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { shareQrDataUrl } from "@/lib/share/qr";

/**
 * QR companion for a share surface. Renders a QR code whose payload
 * is `url` — the SAME canonical share URL the surface's copy and
 * share-sheet actions use (never a second URL format; lib/share/qr)
 * — with the WorldEye caption under the code and a PNG download of
 * the same data URL.
 *
 * Renders nothing without a URL, and reserves the code's box while
 * the PNG renders so the panel doesn't jump when it lands. If the
 * code can't be produced it fails closed: box and caption stay, no
 * fake code is ever shown.
 */
export default function ShareWithQR({
  url,
  size = 128,
  caption = "WorldEye",
  downloadName = "worldeye-share-qr.png",
  className,
}: {
  /** The canonical share URL to encode — exactly as displayed/copied. */
  url: string | null | undefined;
  /** On-screen size of the code in px (the PNG itself is 512px). */
  size?: number;
  caption?: string;
  downloadName?: string;
  className?: string;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setDataUrl(null);
    if (!url) return;
    shareQrDataUrl(url)
      .then(d => {
        if (live) setDataUrl(d);
      })
      .catch(() => {
        if (live) setDataUrl(null);
      });
    return () => {
      live = false;
    };
  }, [url]);

  if (!url) return null;

  return (
    <div className={className ?? "flex flex-col items-center gap-1.5"}>
      <div
        className="rounded-md bg-white p-1.5 leading-none shrink-0"
        style={{ width: size + 12, height: size + 12 }}
      >
        {dataUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={dataUrl}
            width={size}
            height={size}
            alt="QR code — scan to open this WorldEye link"
            className="block"
          />
        )}
      </div>
      <div className="text-[9px] font-mono font-bold uppercase tracking-[0.25em] text-[var(--text-muted)]">
        {caption}
      </div>
      {dataUrl && (
        <a
          href={dataUrl}
          download={downloadName}
          className="inline-flex items-center gap-1 text-[9px] font-mono font-bold tracking-widest text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
        >
          <Download className="w-3 h-3" />
          SAVE PNG
        </a>
      )}
    </div>
  );
}

"use client";

/**
 * The public collection grid: one card per camera, showing the
 * camera's current still via the site's frame route (the same
 * /api/cctv/frame resolution the embed system uses), refreshed on a
 * staggered cadence. A camera with no current frame shows the honest
 * unavailable state — never a stock or placeholder image. Cards link
 * to the camera on the globe.
 */
import { useEffect, useState } from "react";
import Link from "next/link";

export type GridCamera = {
  cameraId: string;
  name: string | null;
  location: string | null;
  /** Absolute still URL, or null when no still is resolvable. */
  snapshotUrl: string | null;
  /** True when the id is no longer in the catalogue. */
  missing: boolean;
};

function StillCard({ cam, index }: { cam: GridCamera; index: number }) {
  const [tick, setTick] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!cam.snapshotUrl) return;
    let iv: ReturnType<typeof setInterval> | undefined;
    // Stagger refreshes so a 60-camera grid doesn't burst the frame route.
    const start = setTimeout(() => {
      iv = setInterval(() => setTick((t) => t + 1), 45_000);
    }, index * 750);
    return () => {
      clearTimeout(start);
      if (iv) clearInterval(iv);
    };
  }, [cam.snapshotUrl, index]);

  const unavailable = cam.missing || !cam.snapshotUrl || failed;
  const src = cam.snapshotUrl
    ? tick === 0
      ? cam.snapshotUrl
      : `${cam.snapshotUrl}${cam.snapshotUrl.includes("?") ? "&" : "?"}_t=${tick}`
    : null;

  const inner = (
    <>
      <div className="relative aspect-video bg-black">
        {unavailable || !src ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
            <div className="text-2xl">📡</div>
            <div className="text-xs text-slate-400 max-w-[260px]">
              {cam.missing
                ? "This camera is no longer in the WorldEye catalogue."
                : "Live view unavailable right now — open it on the globe to check again."}
            </div>
          </div>
        ) : (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={cam.name ? `Latest still from ${cam.name}` : "Camera still"}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={() => setFailed(true)}
            />
            <span className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/60 border border-white/15 text-[10px] font-mono text-white">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> STILL
            </span>
          </>
        )}
      </div>
      <div className="p-3.5">
        <div className="text-sm font-bold text-white truncate">
          {cam.name ?? "Camera unavailable"}
        </div>
        {cam.location && <div className="text-[11px] font-mono text-cyan-300/70 mt-0.5 truncate">{cam.location}</div>}
      </div>
    </>
  );

  const cls = "rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden block";
  if (cam.missing) return <div className={cls}>{inner}</div>;
  return (
    <Link href={`/?camera=${encodeURIComponent(cam.cameraId)}`} className={`${cls} hover:border-cyan-400/40 transition`}>
      {inner}
    </Link>
  );
}

export default function CollectionGrid({ cameras }: { cameras: GridCamera[] }) {
  if (cameras.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
        <div className="text-4xl mb-3">📡</div>
        <div className="text-white font-bold">No cameras yet</div>
        <p className="text-sm text-slate-400 mt-2">This collection doesn&apos;t have any cameras in it yet.</p>
      </div>
    );
  }
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {cameras.map((c, i) => (
        <StillCard key={c.cameraId} cam={c} index={i} />
      ))}
    </div>
  );
}

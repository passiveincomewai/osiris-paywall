"use client";
/**
 * The Live Wall demo — a real, live taste of the premium monitoring wall
 * on /recording/live, shown to visitors who haven't upgraded (including
 * signed-out visitors, whom the page admits).
 *
 * Every tile is a real catalogue camera streaming live right now, played
 * by the same RecordableTile the premium wall uses, in its demo mode:
 * view-only, no recording controls, no path to the capture layer. The
 * cameras come from /api/recording/live-wall-demo, which resolves them
 * against the live catalogue — nothing here is a loop, a screenshot, or
 * a mock. If a stream is down at the source, the tile says OFFLINE,
 * exactly as it does on the real wall.
 *
 * Performance: at most six tiles, and a tile's player only mounts when
 * it nears the viewport, so a phone never runs six HLS streams for a
 * wall it hasn't scrolled to.
 */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import RecordableTile, { type SavedCam } from "@/components/recording/RecordableTile";

interface DemoPayload {
  cameras?: SavedCam[];
}

/** Mounts its children only once the slot approaches the viewport. */
function LazyTile({ cam }: { cam: SavedCam }) {
  const slotRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = slotRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setActive(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setActive(true);
          io.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={slotRef}>
      {active ? (
        <RecordableTile cam={cam} pro={false} demo />
      ) : (
        <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black/60">
          <div className="aspect-video flex flex-col items-center justify-center gap-2 p-4 text-center">
            <div className="w-8 h-8 rounded-full border-2 border-cyan-400/30 border-t-cyan-300 animate-spin" />
            <div className="text-xs text-slate-400 truncate max-w-full">{cam.name}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LiveWallDemo({ signedIn }: { signedIn: boolean }) {
  const [cams, setCams] = useState<SavedCam[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/recording/live-wall-demo");
        if (!r.ok) throw new Error(String(r.status));
        const j = (await r.json()) as DemoPayload;
        setCams(Array.isArray(j.cameras) ? j.cameras : []);
      } catch {
        setFailed(true);
        setCams([]);
      }
    })();
  }, []);

  return (
    <section aria-label="Live demo of the Premium Live Wall" className="space-y-5">
      <div>
        <div className="text-[11px] font-mono tracking-[0.25em] text-cyan-400 uppercase mb-1">
          Live demo
        </div>
        <h2 className="text-3xl font-bold text-white">Live demo — the Premium Live Wall</h2>
        <p className="text-sm text-slate-400 mt-2 max-w-3xl leading-relaxed">
          These cameras are streaming live, right now — this is the real monitoring wall,
          in miniature. On Pro you build your own wall from any cameras you save — up to
          20 tiles at once, 40 on VIP Pro — and record clips straight from any tile.
          Recording isn&apos;t part of the demo; everything below is view-only.
        </p>
      </div>

      {cams === null ? (
        <div className="text-slate-400 font-mono text-sm">Loading live cameras…</div>
      ) : cams.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-slate-300">
          {failed
            ? "The live demo couldn't load just now. "
            : "No live demo cameras are available right now. "}
          You can browse thousands of live cameras on the{" "}
          <Link href="/cameras" className="text-cyan-300 hover:text-white underline underline-offset-2">
            camera directory
          </Link>{" "}
          in the meantime.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cams.map((cam) => (
            <LazyTile key={cam.id} cam={cam} />
          ))}
        </div>
      )}

      <p className="text-[11px] text-slate-500 leading-relaxed">
        Demo cameras are a rotating sample from the public WorldEye catalogue.
        {!signedIn && (
          <>
            {" "}
            <Link href="/api/auth/signin?callbackUrl=/recording/live" className="text-cyan-300 hover:text-white underline underline-offset-2">
              Sign in
            </Link>{" "}
            if you already have Pro — signing in takes you straight to your own wall.
          </>
        )}
      </p>
    </section>
  );
}

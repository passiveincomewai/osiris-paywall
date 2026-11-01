"use client";

/**
 * /dashboard — My Cameras island.
 *
 * Reads the SAME tracked-camera store the recording studio uses
 * (SavedCamera rows behind /api/recording/cameras, saved from the
 * globe's camera viewer and the multi-record picker) — this is a
 * second window onto that roster, not a second roster.
 *
 * Previews use the site's own mechanisms: snapshot feeds render as a
 * refreshing still (the viewer's jpg handling); playable streams
 * render RecordableTile, the studio's live tile, REC button included.
 * "Record wall" sends the camera to the multi-record wall through the
 * wall's own localStorage selection key, then opens the wall.
 */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, LayoutGrid, Loader2, Trash2 } from "lucide-react";
import RecordableTile, { type SavedCam } from "@/components/recording/RecordableTile";
import AddToCollection from "@/components/dashboard/AddToCollection";
import {
  MULTI_SELECTION_KEY,
  globeHref,
  mergeWallSelection,
  previewKind,
  snapshotUrl,
} from "@/lib/dashboard/dashboard";

function RefreshingStill({ cam }: { cam: SavedCam }) {
  const [tick, setTick] = useState(0);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const iv = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(iv);
  }, []);
  const base = snapshotUrl(cam.cameraData);
  if (!base || failed) {
    return (
      <div className="aspect-video bg-black/60 flex flex-col items-center justify-center gap-2 p-4 text-center">
        <div className="text-2xl">📡</div>
        <div className="text-xs text-slate-400">Still image unavailable right now</div>
      </div>
    );
  }
  const src = tick === 0 ? base : `${base}${base.includes("?") ? "&" : "?"}_t=${tick}`;
  return (
    <div className="relative aspect-video bg-black">
      {/* Snapshot feed still — refreshed on the viewer's cadence. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={`Latest still from ${cam.name}`}
        className="w-full h-full object-cover"
        loading="lazy"
        onError={() => setFailed(true)}
      />
      <span className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/60 border border-white/15 text-[10px] font-mono text-white">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> STILL
      </span>
    </div>
  );
}

function CameraCard({
  cam,
  pro,
  onNeedPro,
  onRemove,
  onWall,
}: {
  cam: SavedCam;
  pro: boolean;
  onNeedPro: () => void;
  onRemove: (cam: SavedCam) => void;
  onWall: (cam: SavedCam) => void;
}) {
  const kind = previewKind(cam.cameraData);
  const d = (cam.cameraData ?? {}) as Record<string, unknown>;
  const lat = typeof d.lat === "number" ? d.lat : null;
  const lng = typeof d.lng === "number" ? d.lng : null;
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden flex flex-col">
      {kind === "stream" ? (
        <RecordableTile cam={cam} pro={pro} compact onNeedPro={onNeedPro} />
      ) : kind === "snapshot" ? (
        <RefreshingStill cam={cam} />
      ) : (
        <div className="aspect-video bg-black/60 flex flex-col items-center justify-center gap-2 p-4 text-center">
          <div className="text-2xl">📡</div>
          <div className="text-xs text-slate-400 max-w-[240px]">
            No preview for this feed — open it on the globe to watch.
          </div>
        </div>
      )}
      <div className="p-3.5 flex flex-col gap-2.5 flex-1">
        <div className="min-w-0">
          <div className="text-sm font-bold text-white truncate">{cam.name}</div>
          <div className="text-[11px] font-mono text-cyan-300/70 mt-0.5">
            {cam.group}
            {lat !== null && lng !== null && (
              <span className="text-slate-500"> · {lat.toFixed(3)}, {lng.toFixed(3)}</span>
            )}
          </div>
        </div>
        <div className="mt-auto flex flex-wrap gap-1.5">
          <Link
            href={globeHref(cam.cameraData)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono border border-white/15 text-slate-200 hover:border-cyan-400/60 hover:text-white transition"
          >
            <ExternalLink className="w-3.5 h-3.5" /> On globe
          </Link>
          <button
            onClick={() => onWall(cam)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono border border-white/15 text-slate-200 hover:border-red-400/60 hover:text-red-200 transition"
          >
            <LayoutGrid className="w-3.5 h-3.5" /> Record wall
          </button>
          <AddToCollection cameraId={typeof d.id === "string" ? d.id : null} cameraName={cam.name} />
          <button
            onClick={() => onRemove(cam)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono border border-white/15 text-slate-400 hover:border-red-400/60 hover:text-red-300 transition"
          >
            <Trash2 className="w-3.5 h-3.5" /> Remove
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DashboardCameras() {
  const router = useRouter();
  const [cams, setCams] = useState<SavedCam[] | null>(null);
  const [pro, setPro] = useState(false);
  const [filter, setFilter] = useState("All");
  const [notice, setNotice] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    try {
      const [cr, sr] = await Promise.all([
        fetch("/api/recording/cameras", { cache: "no-store" }),
        fetch("/api/recording/status", { cache: "no-store" }).catch(() => null),
      ]);
      if (!cr.ok) throw new Error("cameras");
      setCams(((await cr.json()).cameras ?? []) as SavedCam[]);
      if (sr?.ok) {
        const j = await sr.json();
        setPro(!!j.pro);
      }
    } catch {
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const remove = useCallback(
    async (cam: SavedCam) => {
      if (!confirm(`Remove "${cam.name}" from your cameras?`)) return;
      const r = await fetch(`/api/recording/cameras/${cam.id}`, { method: "DELETE" }).catch(() => null);
      if (r?.ok) {
        setNotice(null);
        await load();
      } else {
        setNotice("Couldn't remove that camera — try again.");
      }
    },
    [load],
  );

  const sendToWall = useCallback(
    (cam: SavedCam) => {
      try {
        const raw = JSON.parse(localStorage.getItem(MULTI_SELECTION_KEY) ?? "[]");
        localStorage.setItem(MULTI_SELECTION_KEY, JSON.stringify(mergeWallSelection(raw, cam.id)));
      } catch {
        /* storage unavailable — the wall still opens; the camera is saved there too */
      }
      router.push("/recording/multi");
    },
    [router],
  );

  const groups = cams ? ["All", ...Array.from(new Set(cams.map((c) => c.group)))] : ["All"];
  const shown = cams ? (filter === "All" ? cams : cams.filter((c) => c.group === filter)) : [];

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <h2 className="text-xl font-bold text-white">My cameras</h2>
        <Link href="/recording/live" className="text-xs font-mono text-cyan-300 hover:underline shrink-0">
          Open the live wall →
        </Link>
      </div>
      <p className="text-sm text-slate-400 mb-5">
        The cameras you track — the same roster as your recording studio. Watch them here, send
        one to the record wall, or jump back to it on the globe.
      </p>

      {notice && (
        <p className="text-sm text-amber-300 bg-amber-400/10 border border-amber-300/20 rounded-xl px-4 py-2.5 mb-4">
          {notice}{" "}
          <Link href="/pricing" className="underline underline-offset-2 font-semibold">
            See plans
          </Link>
        </p>
      )}

      {loadError ? (
        <p className="text-sm text-red-300">Couldn&apos;t load your cameras. Refresh to try again.</p>
      ) : !cams ? (
        <div className="flex items-center gap-2 text-slate-500 font-mono text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading your cameras…
        </div>
      ) : cams.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
          <div className="text-4xl mb-3">📡</div>
          <div className="text-white font-bold">No cameras tracked yet</div>
          <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto">
            Open any camera on the main globe and tap{" "}
            <span className="text-cyan-300 font-mono">Save to My Cameras</span> in the viewer — it
            lands here, ready to watch, record and set alerts on.
          </p>
          <Link
            href="/"
            className="inline-block mt-4 px-4 py-2 rounded-xl text-sm font-mono border border-white/20 text-slate-100 hover:bg-white/5 transition"
          >
            ＋ Find cameras on the globe
          </Link>
        </div>
      ) : (
        <>
          {groups.length > 2 && (
            <div className="flex gap-2 flex-wrap mb-4">
              {groups.map((g) => (
                <button
                  key={g}
                  onClick={() => setFilter(g)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition ${
                    filter === g
                      ? "border-cyan-400/60 text-cyan-200 bg-cyan-400/10"
                      : "border-white/10 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          )}
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {shown.map((cam) => (
              <CameraCard
                key={cam.id}
                cam={cam}
                pro={pro}
                onNeedPro={() => setNotice("Recording is a WorldEye Pro feature.")}
                onRemove={remove}
                onWall={sendToWall}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

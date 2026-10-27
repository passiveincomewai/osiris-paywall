"use client";
/**
 * Recording dashboard (VIP Pro) — the studio's control room: every
 * capture session running right now, the clip library's totals, and the
 * saved-camera roster with each camera's recording history.
 *
 * Honest shape, stated on the page too: all recordings live on this
 * device, in this browser. The session board reads the persistent
 * capture-session layer (viewer timelapses + Live-wall clips) — the
 * one store any route can read. Multi-record wall sessions run inside
 * the Multi-record page itself, so they are managed there, not here;
 * the page says exactly that rather than implying a complete list.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import UpgradeScreen from "@/components/recording/UpgradeScreen";
import {
  DashboardSignInPrompt,
  DashboardStat,
  NewestClipCard,
  RosterRow,
  SessionCard,
  VipUpsell,
} from "@/components/recording/DashboardChrome";
import type { SavedCam } from "@/components/recording/RecordableTile";
import {
  assembleLibrary,
  assembleRoster,
  dashboardGateView,
  formatBytes,
  formatClock,
  type DashboardClip,
} from "@/lib/recording/dashboard";
import { classifyMultiCam } from "@/lib/recording/multi";
import { idbGetClip, idbUsageBytes } from "@/lib/recording/idb";
import { captureSessions, useCaptureSessions } from "@/lib/recording/sessions";
import type { PlanTier } from "@/lib/recording/tier";

interface ClipsPayload {
  clips: DashboardClip[];
  totals: { count: number; durationSec: number; sizeBytes: number };
}

export default function RecordingDashboardPage() {
  const [status, setStatus] = useState<{ loaded: boolean; signedIn: boolean; tier: PlanTier }>({
    loaded: false, signedIn: false, tier: "free",
  });
  const [clipsPayload, setClipsPayload] = useState<ClipsPayload | null>(null);
  const [saved, setSaved] = useState<SavedCam[] | null>(null);
  const [deviceBytes, setDeviceBytes] = useState(0);
  const [thumbs, setThumbs] = useState<Record<string, string | null>>({});
  const [now, setNow] = useState(() => Date.now());
  const thumbUrls = useRef<string[]>([]);

  const sessions = useCaptureSessions();
  const view = dashboardGateView({
    statusLoaded: status.loaded,
    signedIn: status.signedIn,
    tier: status.tier,
  });

  /* ---------- gate ---------- */
  useEffect(() => {
    (async () => {
      const s = await fetch("/api/recording/status").catch(() => null);
      if (!s || !s.ok) { setStatus({ loaded: true, signedIn: false, tier: "free" }); return; }
      const j = await s.json();
      setStatus({
        loaded: true,
        signedIn: true,
        tier: j.tier === "vip" ? "vip" : j.pro ? "pro" : "free",
      });
    })();
  }, []);

  /* ---------- library + roster data (VIP only) ---------- */
  useEffect(() => {
    if (view !== "ready") return;
    (async () => {
      const [cr, sr] = await Promise.all([
        fetch("/api/recording/clips").catch(() => null),
        fetch("/api/recording/cameras").catch(() => null),
      ]);
      if (cr?.ok) setClipsPayload((await cr.json()) as ClipsPayload);
      if (sr?.ok) setSaved(((await sr.json()).cameras ?? []) as SavedCam[]);
      setDeviceBytes(await idbUsageBytes());
    })();
  }, [view]);

  /* ---------- thumbnails: each newest clip's own first frame ---------- */
  const library = useMemo(
    () =>
      clipsPayload
        ? assembleLibrary({ totals: clipsPayload.totals, clips: clipsPayload.clips, deviceBytes })
        : null,
    [clipsPayload, deviceBytes],
  );

  useEffect(() => {
    if (!library) return;
    let cancelled = false;
    (async () => {
      const next: Record<string, string | null> = {};
      for (const c of library.newest) {
        const blob = await idbGetClip(c.id).catch(() => null);
        if (cancelled) return;
        if (blob) {
          const url = URL.createObjectURL(blob);
          thumbUrls.current.push(url);
          next[c.id] = url;
        } else {
          next[c.id] = null;
        }
      }
      if (!cancelled) setThumbs(next);
    })();
    return () => { cancelled = true; };
  }, [library]);

  useEffect(
    () => () => {
      for (const u of thumbUrls.current) URL.revokeObjectURL(u);
      thumbUrls.current = [];
    },
    [],
  );

  /* ---------- live clock for the session board ---------- */
  useEffect(() => {
    if (sessions.length === 0) return;
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, [sessions.length]);

  const roster = useMemo(
    () =>
      saved && clipsPayload
        ? assembleRoster(
            saved.map((c) => ({ id: c.id, name: c.name, group: c.group })),
            clipsPayload.clips,
          )
        : [],
    [saved, clipsPayload],
  );
  const savedById = useMemo(
    () => new Map((saved ?? []).map((c) => [c.id, c] as const)),
    [saved],
  );

  /* ---------- render ---------- */
  if (view === "loading") return <div className="text-slate-400 font-mono text-sm">Loading…</div>;
  if (view === "signin") return <DashboardSignInPrompt />;
  if (view === "locked") {
    return <UpgradeScreen priceLine="The recording dashboard unlocks with VIP Pro · the annual plan at $74.99/year" />;
  }
  if (view === "upsell") return <VipUpsell />;

  return (
    <div className="space-y-8">
      <div>
        <div className="text-[11px] font-mono tracking-[0.25em] text-amber-400 uppercase mb-1">VIP Pro · Control room</div>
        <h1 className="text-3xl font-bold text-white">Recording dashboard</h1>
        <p className="text-sm text-slate-400 mt-1">
          All recordings live on this device — captured in this browser and stored in its local
          library. Nothing here is in the cloud.
        </p>
      </div>

      {library && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <DashboardStat label="Clips recorded" value={String(library.count)} sub="in your library" accent="#22d3ee" />
          <DashboardStat
            label="Total footage"
            value={formatClock(library.totalSecs)}
            sub="across every clip"
            accent="#818cf8"
          />
          <DashboardStat
            label="On this device"
            value={formatBytes(library.deviceBytes)}
            sub="video files in this browser"
            accent="#c084fc"
          />
          <DashboardStat
            label="Saved cameras"
            value={String(saved?.length ?? 0)}
            sub="on your roster"
            accent="#38bdf8"
          />
        </div>
      )}

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-bold text-white">Recording now</h2>
          <span className="text-[11px] font-mono text-slate-500">{sessions.length} active</span>
        </div>
        {sessions.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-slate-400">
              Nothing is recording right now. Sessions started from a camera viewer (timelapse) or
              the Live wall appear here while they run — including after you close the viewer.
            </p>
            <p className="text-xs text-slate-500 mt-2">
              Multi-record wall sessions run inside the{" "}
              <Link href="/recording/multi" className="text-cyan-300 hover:underline">Multi-record page</Link>{" "}
              and are managed there.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
            {sessions.map((s) => (
              <SessionCard
                key={s.id}
                session={s}
                elapsedSec={Math.max(0, Math.floor((now - s.startedAt) / 1000))}
                onStop={(id) => void captureSessions.stopSession(id)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-bold text-white">Newest clips</h2>
          <Link href="/recording/clips" className="text-xs font-mono text-cyan-300 hover:underline">
            Open the full library →
          </Link>
        </div>
        {!library ? (
          <div className="text-slate-500 font-mono text-sm">Loading your library…</div>
        ) : library.newest.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-slate-400">
            No clips yet — hit <span className="text-red-300 font-mono">● REC</span> on any live camera
            and the newest captures will land here.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {library.newest.map((c) => (
              <NewestClipCard key={c.id} clip={c} thumbUrl={thumbs[c.id] ?? null} onDevice={!(c.id in thumbs) || !!thumbs[c.id]} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-bold text-white">Camera roster</h2>
          <Link href="/recording/multi" className="text-xs font-mono text-cyan-300 hover:underline">
            Open the recording wall →
          </Link>
        </div>
        {roster.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-slate-400">
            No saved cameras yet — save some from any camera on the main globe and they'll roster here
            with their recording history.
          </div>
        ) : (
          <div className="space-y-2">
            {roster.map((entry) => (
              <RosterRow
                key={entry.id}
                entry={entry}
                source={classifyMultiCam(savedById.get(entry.id)?.cameraData)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

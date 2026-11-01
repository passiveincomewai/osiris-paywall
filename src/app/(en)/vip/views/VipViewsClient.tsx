"use client";
/**
 * /vip/views — VIP Pro saved globe views. A view is a layer stack +
 * optional camera, restored through the globe's own ?layers= /
 * ?camera= URL contract. Capture works two ways: paste the globe URL
 * from your address bar, or tick the layers here.
 */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import VipLock from "@/components/vip/VipLock";
import { KNOWN_LAYERS } from "@/lib/vip/layers";
import type { ViewView } from "@/lib/vip/views";

interface ViewsPayload {
  tier: string;
  vip: boolean;
  maxViews: number;
  views: ViewView[];
}

const inputCls =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-300/50 focus:outline-none";
const labelCls = "block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1";

export default function VipViewsClient() {
  const [data, setData] = useState<ViewsPayload | null>(null);
  const [state, setState] = useState<"loading" | "signin" | "ready">("loading");
  const [notice, setNotice] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [fromUrl, setFromUrl] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [cameraId, setCameraId] = useState("");
  const [cameraName, setCameraName] = useState("");
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    const r = await fetch("/api/vip/views");
    if (r.status === 401) {
      setState("signin");
      return;
    }
    if (r.ok) setData((await r.json()) as ViewsPayload);
    setState("ready");
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (state === "loading") return <p className="font-mono text-sm text-slate-400">Loading…</p>;
  if (state === "signin") {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
        <p className="text-sm text-slate-300">Sign in to manage saved views.</p>
        <Link
          href="/api/auth/signin?callbackUrl=/vip/views"
          className="mt-4 inline-block rounded-2xl px-8 py-3 font-mono font-bold text-[#04121f]"
          style={{ background: "linear-gradient(135deg,#38bdf8,#0096FF)" }}
        >
          Sign in
        </Link>
      </div>
    );
  }
  if (!data) return null;

  const submit = async () => {
    setBusy(true);
    setNotice(null);
    const body: Record<string, unknown> = { name };
    if (fromUrl.trim()) body.fromUrl = fromUrl.trim();
    else {
      body.layers = picked;
      if (cameraId.trim()) {
        body.cameraId = cameraId.trim();
        if (cameraName.trim()) body.cameraName = cameraName.trim();
      }
    }
    const r = await fetch("/api/vip/views", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (r.ok) {
      setName("");
      setFromUrl("");
      setPicked([]);
      setCameraId("");
      setCameraName("");
      setNotice("View saved.");
      void reload();
    } else {
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      setNotice(
        j.error === "url_unreadable"
          ? "That URL doesn't carry a view — copy it from the globe while the layers you want are on."
          : j.error === "view_empty"
            ? "Pick at least one layer, paste a globe URL, or add a camera id."
            : `Couldn't save the view (${j.error ?? r.status}).`,
      );
    }
  };

  return (
    <div className="space-y-10">
      {notice && (
        <p className="rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-sm text-cyan-100">
          {notice}
        </p>
      )}

      {!data.vip && (
        <VipLock
          title="Saved views are a VIP Pro feature"
          freshCopy="Saved views come with Ultra — and they're included for members whose VIP Pro annual plan started before October 30, 2026. Pick Ultra below and you can keep up to 25 named globe setups, restored in one click."
          lapsedCopy="Your VIP Pro isn't active right now, so new views are paused — the ones you saved are kept and still open. Saving resumes when VIP Pro is back."
          lapsed={data.views.length > 0}
        />
      )}

      <section>
        <h2 className="mb-3 text-xs font-mono uppercase tracking-[0.25em] text-cyan-400">
          Your views ({data.views.length} / {data.maxViews})
        </h2>
        {data.views.length === 0 ? (
          <p className="text-sm text-slate-500">No saved views yet. Build one below.</p>
        ) : (
          <ul className="space-y-2.5">
            {data.views.map((v) => (
              <li key={v.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="font-bold text-white">🔖 {v.name}</div>
                  <div className="flex shrink-0 gap-1.5">
                    <a
                      href={v.url}
                      className="rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-[#04121f]"
                      style={{ background: "linear-gradient(135deg,#38bdf8,#0096FF)" }}
                    >
                      Open view
                    </a>
                    <button
                      onClick={async () => {
                        await fetch(`/api/vip/views/${v.id}`, { method: "DELETE" });
                        void reload();
                      }}
                      className="rounded-lg border border-white/15 px-2.5 py-1.5 text-xs font-mono text-slate-400 hover:border-red-400/50 hover:text-red-300"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {v.layers.map((k) => (
                    <span key={k} className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-mono text-slate-300">
                      {KNOWN_LAYERS[k] ?? k}
                    </span>
                  ))}
                  {v.cameraId && (
                    <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-2 py-0.5 text-[11px] font-mono text-cyan-100">
                      📷 {v.cameraName ?? v.cameraId}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-[12px] text-slate-500">
          A view stores the layer setup (and a camera, if set). When it opens, the globe applies
          your plan's own access to each layer — a view never unlocks a layer by itself.
        </p>
      </section>

      {data.vip && data.views.length < data.maxViews && (
        <section>
          <h2 className="mb-3 text-xs font-mono uppercase tracking-[0.25em] text-cyan-400">Save a view</h2>
          <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div>
              <label className={labelCls}>Name</label>
              <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Pacific storm watch" />
            </div>
            <div>
              <label className={labelCls}>Fastest: paste the globe URL</label>
              <input
                className={inputCls}
                value={fromUrl}
                onChange={(e) => setFromUrl(e.target.value)}
                placeholder="https://worldeye.app/?layers=fires,hurricanes,weather…"
              />
              <p className="mt-1.5 text-[12px] text-slate-500">
                Set the globe up the way you like it, copy the address bar, paste it here — the
                layers (and camera, if one is open) are read out of the link. If you paste a URL,
                the manual picks below are ignored.
              </p>
            </div>
            <div>
              <label className={labelCls}>…or pick layers manually</label>
              <div className="flex max-h-44 flex-wrap gap-1.5 overflow-y-auto pr-1">
                {Object.entries(KNOWN_LAYERS).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() =>
                      setPicked((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
                    }
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-mono ${
                      picked.includes(key)
                        ? "border-cyan-300/60 bg-cyan-300/10 text-cyan-100"
                        : "border-white/10 text-slate-400 hover:border-white/30"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Camera id (optional)</label>
                <input className={inputCls} value={cameraId} onChange={(e) => setCameraId(e.target.value)} placeholder="From a camera's share link: ?camera=…" />
              </div>
              <div>
                <label className={labelCls}>Camera name (optional label)</label>
                <input className={inputCls} value={cameraName} onChange={(e) => setCameraName(e.target.value)} placeholder="Kabukicho, Tokyo" />
              </div>
            </div>
            <button
              onClick={submit}
              disabled={busy}
              className="rounded-xl px-4 py-2 text-sm font-mono font-bold text-[#04121f] disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,#38bdf8,#0096FF)" }}
            >
              Save view
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

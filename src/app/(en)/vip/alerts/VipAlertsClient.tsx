"use client";
/**
 * /vip/alerts — VIP Pro event alerts: watched places, quake / launch /
 * ISS-pass rules, and the event inbox. Data comes from /api/vip/*
 * (server-gated); this component renders the same lock the camera
 * alerts page uses when the tier isn't VIP.
 */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import VipLock from "@/components/vip/VipLock";
import type { EventAlertView, EventRuleView } from "@/lib/vip/events/service";
import type { PlaceView } from "@/lib/vip/places";
import {
  LAUNCH_LEAD_CHOICES,
  type IssConfig,
  type LaunchConfig,
  type QuakeConfig,
} from "@/lib/vip/events/config";

interface AlertsPayload {
  tier: string;
  vip: boolean;
  maxActive: number;
  activeCount: number;
  rules: EventRuleView[];
  events: EventAlertView[];
  unreadCount: number;
}

const KIND_META = {
  quake: { icon: "🌍", label: "Earthquake" },
  launch: { icon: "🚀", label: "Launch" },
  iss: { icon: "🛰️", label: "ISS pass" },
} as const;

function ruleSummary(rule: EventRuleView): string {
  if (rule.kind === "quake") {
    const c = rule.config as QuakeConfig;
    return `Magnitude ${c.minMag}+ ${rule.placeName ? `within the radius of ${rule.placeName}` : "anywhere in the world"}`;
  }
  if (rule.kind === "launch") {
    const c = rule.config as LaunchConfig;
    return `Remind me ${c.leadHours.map((h) => `${h}h`).join(" and ")} before liftoff`;
  }
  const c = rule.config as IssConfig;
  return `Passes over ${rule.placeName ?? "—"} reaching ${c.minElevationDeg}°+, up to ${c.leadHours}h ahead`;
}

const inputCls =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-300/50 focus:outline-none";
const labelCls = "block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1";
const btnCls =
  "rounded-xl px-4 py-2 text-sm font-mono font-bold text-[#04121f] disabled:opacity-50";
const btnStyle = { background: "linear-gradient(135deg,#38bdf8,#0096FF)" } as const;

export default function VipAlertsClient() {
  const [data, setData] = useState<AlertsPayload | null>(null);
  const [places, setPlaces] = useState<PlaceView[]>([]);
  const [state, setState] = useState<"loading" | "signin" | "ready">("loading");
  const [notice, setNotice] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const [r1, r2] = await Promise.all([
      fetch("/api/vip/event-alerts"),
      fetch("/api/vip/places"),
    ]);
    if (r1.status === 401) {
      setState("signin");
      return;
    }
    if (r1.ok) setData((await r1.json()) as AlertsPayload);
    if (r2.ok) setPlaces(((await r2.json()) as { places: PlaceView[] }).places);
    setState("ready");
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (state === "loading") return <p className="font-mono text-sm text-slate-400">Loading…</p>;
  if (state === "signin") {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
        <p className="text-sm text-slate-300">Sign in to manage event alerts.</p>
        <Link
          href="/api/auth/signin?callbackUrl=/vip/alerts"
          className="mt-4 inline-block rounded-2xl px-8 py-3 font-mono font-bold text-[#04121f]"
          style={btnStyle}
        >
          Sign in
        </Link>
      </div>
    );
  }
  if (!data) return null;

  const hadVipBefore = data.rules.length > 0 || places.length > 0;

  return (
    <div className="space-y-10">
      {notice && (
        <p className="rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-sm text-cyan-100">
          {notice}
        </p>
      )}

      {!data.vip && (
        <VipLock
          title="Event alerts are a VIP Pro feature"
          freshCopy="Event alerts come with Ultra — and they're included for members whose VIP Pro annual plan started before October 30, 2026. Pick Ultra below and WorldEye starts watching for your earthquakes, launches and ISS passes."
          lapsedCopy="Your VIP Pro isn't active right now, so your event alerts are paused — nothing was deleted. They resume on their own when VIP Pro is back."
          lapsed={hadVipBefore}
        />
      )}

      <PlacesSection
        places={places}
        vip={data.vip}
        reload={reload}
        setNotice={setNotice}
      />

      {data.vip && (
        <AddRuleSection
          places={places}
          atLimit={data.activeCount >= data.maxActive}
          maxActive={data.maxActive}
          reload={reload}
          setNotice={setNotice}
        />
      )}

      <section>
        <h2 className="mb-3 text-xs font-mono uppercase tracking-[0.25em] text-cyan-400">
          Your rules ({data.activeCount} active / {data.maxActive})
        </h2>
        {data.rules.length === 0 ? (
          <p className="text-sm text-slate-500">No rules yet. Add one above and the checks start within ~15 minutes.</p>
        ) : (
          <ul className="space-y-2.5">
            {data.rules.map((rule) => (
              <li
                key={rule.id}
                className="flex items-start justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
              >
                <div>
                  <div className="font-bold text-white">
                    {KIND_META[rule.kind].icon} {KIND_META[rule.kind].label}
                    {!rule.active && <span className="ml-2 text-xs font-mono text-slate-500">PAUSED</span>}
                    {!data.vip && rule.active && (
                      <span className="ml-2 text-xs font-mono text-amber-300">PAUSED — VIP INACTIVE</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[13px] text-slate-400">{ruleSummary(rule)}</p>
                  <p className="mt-0.5 text-[11px] font-mono text-slate-500">
                    {rule.emailEnabled ? "email" : "no email"} · {rule.inAppEnabled ? "in-app" : "no in-app"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button
                    onClick={async () => {
                      await fetch(`/api/vip/event-alerts/${rule.id}`, {
                        method: "PATCH",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({ active: !rule.active }),
                      });
                      void reload();
                    }}
                    className="rounded-lg border border-white/15 px-2.5 py-1.5 text-xs font-mono text-slate-300 hover:border-white/40"
                  >
                    {rule.active ? "Pause" : "Resume"}
                  </button>
                  <button
                    onClick={async () => {
                      await fetch(`/api/vip/event-alerts/${rule.id}`, { method: "DELETE" });
                      void reload();
                    }}
                    className="rounded-lg border border-white/15 px-2.5 py-1.5 text-xs font-mono text-slate-400 hover:border-red-400/50 hover:text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-cyan-400">
            Alert inbox {data.unreadCount > 0 && `(${data.unreadCount} unread)`}
          </h2>
          {data.unreadCount > 0 && (
            <button
              onClick={async () => {
                await fetch("/api/vip/event-alerts", { method: "PUT" });
                void reload();
              }}
              className="text-xs font-mono text-cyan-300 hover:text-cyan-200"
            >
              Mark all read
            </button>
          )}
        </div>
        {data.events.length === 0 ? (
          <p className="text-sm text-slate-500">
            Nothing yet. When a rule fires, the alert lands here (and in your email, if email is on).
          </p>
        ) : (
          <ul className="space-y-2.5">
            {data.events.map((e) => (
              <li
                key={e.id}
                className={`rounded-2xl border p-4 ${e.readAt ? "border-white/10 bg-white/[0.02]" : "border-cyan-300/30 bg-cyan-300/5"}`}
              >
                <div className="font-bold text-white">
                  {KIND_META[e.kind as keyof typeof KIND_META]?.icon ?? "🔔"} {e.title}
                </div>
                <p className="mt-1 text-[13px] leading-relaxed text-slate-400">{e.body}</p>
                <p className="mt-1.5 text-[11px] font-mono text-slate-500">
                  {new Date(e.createdAt).toLocaleString()} {e.emailSent ? "· emailed" : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function PlacesSection({
  places,
  vip,
  reload,
  setNotice,
}: {
  places: PlaceView[];
  vip: boolean;
  reload: () => Promise<void>;
  setNotice: (s: string | null) => void;
}) {
  const [name, setName] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [radius, setRadius] = useState("250");
  const [busy, setBusy] = useState(false);

  const add = async () => {
    setBusy(true);
    setNotice(null);
    const r = await fetch("/api/vip/places", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        lat: Number(lat),
        lng: Number(lng),
        radiusKm: Number(radius),
      }),
    });
    setBusy(false);
    if (r.ok) {
      setName("");
      setLat("");
      setLng("");
      setNotice("Place added.");
      void reload();
    } else {
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      setNotice(`Couldn't add the place (${j.error ?? r.status}). Check the name and coordinates.`);
    }
  };

  return (
    <section>
      <h2 className="mb-3 text-xs font-mono uppercase tracking-[0.25em] text-cyan-400">
        Watched places
      </h2>
      <p className="mb-3 max-w-xl text-[13px] leading-relaxed text-slate-400">
        Places anchor "near me" quake rules, ISS-pass rules and your brief. Coordinates are
        latitude / longitude — find them by searching the place on the map or any map app
        (right-click a spot in Google Maps to read them off).
      </p>
      {places.length > 0 && (
        <ul className="mb-4 space-y-2">
          {places.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5"
            >
              <span className="text-sm text-slate-200">
                📍 <span className="font-bold text-white">{p.name}</span>{" "}
                <span className="font-mono text-xs text-slate-500">
                  {p.lat.toFixed(3)}, {p.lng.toFixed(3)} · {p.radiusKm} km
                </span>
              </span>
              <button
                onClick={async () => {
                  await fetch(`/api/vip/places/${p.id}`, { method: "DELETE" });
                  void reload();
                }}
                className="shrink-0 rounded-lg border border-white/15 px-2.5 py-1 text-xs font-mono text-slate-400 hover:border-red-400/50 hover:text-red-300"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      {vip && (
        <div className="grid gap-2.5 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-[1fr_110px_110px_110px_auto]">
          <div>
            <label className={labelCls}>Name</label>
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Home — Ogden, UT" />
          </div>
          <div>
            <label className={labelCls}>Latitude</label>
            <input className={inputCls} value={lat} onChange={(e) => setLat(e.target.value)} placeholder="41.223" inputMode="decimal" />
          </div>
          <div>
            <label className={labelCls}>Longitude</label>
            <input className={inputCls} value={lng} onChange={(e) => setLng(e.target.value)} placeholder="-111.974" inputMode="decimal" />
          </div>
          <div>
            <label className={labelCls}>Radius (km)</label>
            <input className={inputCls} value={radius} onChange={(e) => setRadius(e.target.value)} inputMode="numeric" />
          </div>
          <div className="flex items-end">
            <button className={btnCls} style={btnStyle} disabled={busy} onClick={add}>
              Add place
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function AddRuleSection({
  places,
  atLimit,
  maxActive,
  reload,
  setNotice,
}: {
  places: PlaceView[];
  atLimit: boolean;
  maxActive: number;
  reload: () => Promise<void>;
  setNotice: (s: string | null) => void;
}) {
  const [kind, setKind] = useState<"quake" | "launch" | "iss">("quake");
  const [placeId, setPlaceId] = useState<string>("");
  const [minMag, setMinMag] = useState("5");
  const [leads, setLeads] = useState<number[]>([24]);
  const [minElev, setMinElev] = useState("25");
  const [issLead, setIssLead] = useState("12");
  const [email, setEmail] = useState(true);
  const [inApp, setInApp] = useState(true);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const config =
      kind === "quake"
        ? { minMag: Number(minMag) }
        : kind === "launch"
          ? { leadHours: leads }
          : { minElevationDeg: Number(minElev), leadHours: Number(issLead) };
    setBusy(true);
    setNotice(null);
    const r = await fetch("/api/vip/event-alerts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind,
        config,
        placeId: kind === "launch" ? null : placeId || null,
        emailEnabled: email,
        inAppEnabled: inApp,
      }),
    });
    setBusy(false);
    if (r.ok) {
      setNotice("Rule added — checks run every ~15 minutes.");
      void reload();
    } else {
      const j = (await r.json().catch(() => ({}))) as { error?: string; message?: string };
      setNotice(`Couldn't add the rule (${j.error ?? r.status}). ${j.message ?? ""}`);
    }
  };

  if (atLimit) {
    return (
      <section>
        <h2 className="mb-3 text-xs font-mono uppercase tracking-[0.25em] text-cyan-400">Add a rule</h2>
        <p className="text-sm text-slate-400">
          You have {maxActive} active event alerts — the VIP limit. Pause or delete one to add another.
        </p>
      </section>
    );
  }

  return (
    <section>
      <h2 className="mb-3 text-xs font-mono uppercase tracking-[0.25em] text-cyan-400">Add a rule</h2>
      <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(KIND_META) as ("quake" | "launch" | "iss")[]).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`rounded-xl border px-3.5 py-2 text-sm font-mono ${
                kind === k
                  ? "border-cyan-300/60 bg-cyan-300/10 text-cyan-100"
                  : "border-white/10 text-slate-400 hover:border-white/30"
              }`}
            >
              {KIND_META[k].icon} {KIND_META[k].label}
            </button>
          ))}
        </div>

        {kind === "quake" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Minimum magnitude (USGS feed, 2.5+)</label>
              <input className={inputCls} type="number" min={2.5} max={10} step={0.5} value={minMag} onChange={(e) => setMinMag(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Where</label>
              <select className={inputCls} value={placeId} onChange={(e) => setPlaceId(e.target.value)}>
                <option value="">Worldwide</option>
                {places.map((p) => (
                  <option key={p.id} value={p.id}>
                    Within {p.radiusKm} km of {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {kind === "launch" && (
          <div>
            <label className={labelCls}>Remind me before liftoff</label>
            <div className="flex flex-wrap gap-2">
              {LAUNCH_LEAD_CHOICES.map((h) => (
                <button
                  key={h}
                  onClick={() =>
                    setLeads((prev) => (prev.includes(h) ? prev.filter((x) => x !== h) : [...prev, h]))
                  }
                  className={`rounded-lg border px-3 py-1.5 text-sm font-mono ${
                    leads.includes(h)
                      ? "border-cyan-300/60 bg-cyan-300/10 text-cyan-100"
                      : "border-white/10 text-slate-400"
                  }`}
                >
                  {h}h
                </button>
              ))}
            </div>
            <p className="mt-2 text-[12px] text-slate-500">
              Covers every upcoming launch in the Launch Library 2 feed — the same board as the Space Missions layer.
            </p>
          </div>
        )}

        {kind === "iss" && (
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className={labelCls}>Over which place</label>
              <select className={inputCls} value={placeId} onChange={(e) => setPlaceId(e.target.value)}>
                <option value="">Choose a place…</option>
                {places.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Minimum peak elevation (°)</label>
              <input className={inputCls} type="number" min={10} max={90} step={5} value={minElev} onChange={(e) => setMinElev(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Alert up to (hours ahead)</label>
              <input className={inputCls} type="number" min={1} max={48} value={issLead} onChange={(e) => setIssLead(e.target.value)} />
            </div>
            {places.length === 0 && (
              <p className="text-[12px] text-amber-200 sm:col-span-3">
                Add a watched place above first — an ISS pass needs a sky to pass over.
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-300">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={email} onChange={(e) => setEmail(e.target.checked)} /> Email me
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={inApp} onChange={(e) => setInApp(e.target.checked)} /> Show in the inbox below
          </label>
          <button className={btnCls} style={btnStyle} disabled={busy} onClick={submit}>
            Add rule
          </button>
        </div>
      </div>
    </section>
  );
}

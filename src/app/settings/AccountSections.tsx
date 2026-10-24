"use client";

// Account-settings expansion sections (items 1 link, 6–22): share
// link, preferences (home, layers, display, cameras, recording),
// alerts & email, privacy, billing preferences, data export and
// account deletion. Every control writes to /api/account/preferences
// (the one store) or its dedicated endpoint — nothing here is a
// decorative form.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Check, Globe2, SlidersHorizontal, BellRing, Eye, CreditCard, Database, Link2, Trash2 } from "lucide-react";
import type { Preferences } from "@/lib/account/preferences";
import SecuritySections from "./SecuritySections";

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-6 md:p-7">
      <h2 className="flex items-center gap-2 text-base font-bold mb-5">
        <Icon className="w-4.5 h-4.5 text-[#D4AF37]" /> {title}
      </h2>
      {children}
    </section>
  );
}

const inputCls = "w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm outline-none focus:border-[#00E5FF]/60";
const labelCls = "block text-xs font-semibold tracking-wider text-white/40 mb-1.5";
const btnGold = "px-5 py-2.5 rounded-xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black text-sm font-bold hover:brightness-110 transition disabled:opacity-60";
const btnGhost = "px-4 py-2 rounded-xl border border-white/15 text-xs font-semibold text-white/80 hover:bg-white/5 transition disabled:opacity-60";

function Toggle({ value, onChange, label, hint }: { value: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div>
        <p className="text-sm text-white/85">{label}</p>
        {hint && <p className="text-xs text-white/35 mt-0.5">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`relative w-11 h-6 shrink-0 rounded-full transition ${value ? "bg-[#D4AF37]" : "bg-white/15"}`}
      >
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${value ? "left-[22px]" : "left-0.5"}`} />
      </button>
    </div>
  );
}

type GeoResult = { name: string; context?: string; lat: number; lng: number };
type PaymentMethod = { id: string; brand: string; last4: string; expMonth: number; expYear: number; isDefault: boolean };
type DeleteStatus = { requestedAt: string | null; scheduledFor: string | null; subscription: { status: string; cancelAtPeriodEnd: boolean; currentPeriodEnd: string } | null };

const TIMEZONES: string[] = (() => {
  try {
    return (Intl as any).supportedValuesOf?.("timeZone") ?? [];
  } catch {
    return [];
  }
})();

export default function AccountSections() {
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  // Home location search
  const [homeQuery, setHomeQuery] = useState("");
  const [homeResults, setHomeResults] = useState<GeoResult[]>([]);
  const [homeSearching, setHomeSearching] = useState(false);

  // Share link
  const [share, setShare] = useState<{ code: string; isCustom: boolean } | "none" | null>(null);
  const [newCode, setNewCode] = useState("");
  const [shareMsg, setShareMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [shareBusy, setShareBusy] = useState(false);

  // Billing
  const [methods, setMethods] = useState<PaymentMethod[] | "unavailable" | null>(null);
  const [methodsMsg, setMethodsMsg] = useState<string | null>(null);
  const [setupBusy, setSetupBusy] = useState(false);

  // Deletion
  const [del, setDel] = useState<DeleteStatus | null>(null);
  const [delConfirm, setDelConfirm] = useState(false);
  const [delBusy, setDelBusy] = useState(false);
  const [delMsg, setDelMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/account/preferences", { cache: "no-store" });
      if (r.ok) setPrefs((await r.json()).preferences);
      const me = await fetch("/api/affiliate/me", { cache: "no-store" });
      if (me.ok) {
        const d = await me.json();
        const code = d?.profile?.customCode ?? d?.profile?.referralCode;
        if (code) setShare({ code, isCustom: !!d.profile.customCode });
        else setShare("none");
      } else setShare("none");
      const pm = await fetch("/api/account/payment-methods", { cache: "no-store" });
      if (pm.ok) setMethods((await pm.json()).methods ?? []);
      else setMethods("unavailable");
      const ds = await fetch("/api/account/delete", { cache: "no-store" });
      if (ds.ok) setDel(await ds.json());
    })();
  }, []);

  const save = useCallback(async (patch: Partial<Preferences>) => {
    setSaveState("saving");
    setSaveError(null);
    try {
      const res = await fetch("/api/account/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't save.");
      setPrefs(data.preferences);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 1600);
    } catch (e) {
      setSaveState("error");
      setSaveError(e instanceof Error ? e.message : "Couldn't save.");
    }
  }, []);

  function set<K extends keyof Preferences>(key: K, value: Preferences[K]) {
    setPrefs((p) => (p ? { ...p, [key]: value } : p));
    void save({ [key]: value } as Partial<Preferences>);
  }

  async function searchHome() {
    if (homeQuery.trim().length < 2) return;
    setHomeSearching(true);
    try {
      const r = await fetch(`/api/geosearch?q=${encodeURIComponent(homeQuery.trim())}`);
      const d = r.ok ? await r.json() : { results: [] };
      setHomeResults((d.results ?? []).slice(0, 6));
    } catch {
      setHomeResults([]);
    } finally {
      setHomeSearching(false);
    }
  }

  async function changeShareCode() {
    setShareBusy(true);
    setShareMsg(null);
    try {
      const res = await fetch("/api/affiliate/custom-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: newCode.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't change your link.");
      setShare({ code: data.customCode, isCustom: true });
      setNewCode("");
      setShareMsg({ ok: true, text: "Link updated. Your previous link keeps working and still credits you." });
    } catch (e) {
      setShareMsg({ ok: false, text: e instanceof Error ? e.message : "Couldn't change your link." });
    } finally {
      setShareBusy(false);
    }
  }

  async function addBackupCard() {
    setSetupBusy(true);
    setMethodsMsg(null);
    try {
      const res = await fetch("/api/account/payment-methods/setup", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.error || "Couldn't open the secure card form.");
      window.location.href = data.url;
    } catch (e) {
      setMethodsMsg(e instanceof Error ? e.message : "Couldn't open the secure card form.");
      setSetupBusy(false);
    }
  }

  async function requestDeletion() {
    setDelBusy(true);
    setDelMsg(null);
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't schedule deletion.");
      setDel({ requestedAt: data.requestedAt, scheduledFor: data.scheduledFor, subscription: del?.subscription ?? null });
      setDelMsg({ ok: true, text: data.message });
    } catch (e) {
      setDelMsg({ ok: false, text: e instanceof Error ? e.message : "Couldn't schedule deletion." });
    } finally {
      setDelBusy(false);
    }
  }

  async function cancelDeletion() {
    setDelBusy(true);
    try {
      const res = await fetch("/api/account/delete", { method: "DELETE" });
      if (!res.ok) throw new Error("Couldn't cancel the deletion.");
      setDel((d) => (d ? { ...d, requestedAt: null, scheduledFor: null } : d));
      setDelConfirm(false);
      setDelMsg({ ok: true, text: "Deletion cancelled — your account stays as it is." });
    } catch (e) {
      setDelMsg({ ok: false, text: e instanceof Error ? e.message : "Couldn't cancel the deletion." });
    } finally {
      setDelBusy(false);
    }
  }

  if (!prefs) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-white/40" />
      </div>
    );
  }

  return (
    <>
      <Section icon={Link2} title="Your share link">
        {share === null ? (
          <Loader2 className="w-5 h-5 animate-spin text-white/40" />
        ) : share === "none" ? (
          <p className="text-sm text-white/55">
            Custom share links come with the free affiliate program.{" "}
            <Link href="/affiliates" className="text-[#D4AF37] font-semibold hover:brightness-110">Join the affiliate program</Link>{" "}
            to get yours — it pays commission on every subscriber you refer.
          </p>
        ) : (
          <div className="space-y-4">
            <div>
              <label className={labelCls}>YOUR LINK</label>
              <p className="text-sm font-mono text-white/85 break-all">worldeye.app/ref/{share.code}</p>
              <p className="text-xs text-white/35 mt-1">{share.isCustom ? "Custom link." : "Default link — claim a custom one below."} Every earlier link keeps working and still credits you.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                placeholder="your-custom-code"
                className={`${inputCls} flex-1 min-w-[200px]`}
                maxLength={32}
              />
              <button onClick={changeShareCode} disabled={shareBusy || newCode.trim().length < 3} className={btnGold}>
                {shareBusy ? "Saving…" : "Change link"}
              </button>
            </div>
            <p className="text-xs text-white/35">3–32 characters: letters, numbers, _ or - (no spaces). Some words are reserved.</p>
            {shareMsg && <p className={`text-sm ${shareMsg.ok ? "text-green-400" : "text-red-400"}`}>{shareMsg.text}</p>}
          </div>
        )}
      </Section>

      <Section icon={Globe2} title="Home & globe defaults">
        <div className="space-y-4">
          <div>
            <label className={labelCls}>HOME LOCATION — THE GLOBE OPENS HERE</label>
            {prefs.homeLabel ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                <span className="text-sm">{prefs.homeLabel} <span className="text-white/35 text-xs">({prefs.homeLat?.toFixed(3)}, {prefs.homeLng?.toFixed(3)})</span></span>
                <button className={btnGhost} onClick={() => save({ homeLabel: null, homeLat: null, homeLng: null })}>Clear</button>
              </div>
            ) : (
              <p className="text-sm text-white/50 mb-2">Not set — the globe opens on the whole world.</p>
            )}
            <div className="flex gap-2 mt-2">
              <input value={homeQuery} onChange={(e) => setHomeQuery(e.target.value)} placeholder="Search a city or place…" className={inputCls} />
              <button onClick={searchHome} disabled={homeSearching} className={btnGhost}>{homeSearching ? "Searching…" : "Search"}</button>
            </div>
            {homeResults.length > 0 && (
              <ul className="mt-2 space-y-1">
                {homeResults.map((r, i) => (
                  <li key={i}>
                    <button
                      className="w-full text-left rounded-lg px-3 py-2 text-sm hover:bg-white/5 transition"
                      onClick={() => { void save({ homeLabel: r.context ? `${r.name}, ${r.context}` : r.name, homeLat: r.lat, homeLng: r.lng }); setHomeResults([]); }}
                    >
                      {r.name}{r.context ? <span className="text-white/40"> — {r.context}</span> : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <label className={labelCls}>LAYERS ON AT START (COMMA-SEPARATED LAYER IDS)</label>
            <input
              key={prefs.defaultLayers.join(",")}
              defaultValue={prefs.defaultLayers.join(", ")}
              onBlur={(e) => set("defaultLayers", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
              placeholder="e.g. flights, fires, earthquakes"
              className={inputCls}
            />
            <p className="text-xs text-white/35 mt-1.5">Layer ids from the globe's layer panel. Paid layers still need the plan that unlocks them.</p>
          </div>
        </div>
      </Section>

      <Section icon={SlidersHorizontal} title="Display & cameras">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className={labelCls}>UNITS</label>
            <select value={prefs.units} onChange={(e) => set("units", e.target.value)} className={inputCls}>
              <option value="imperial">Imperial (°F, mph, miles)</option>
              <option value="metric">Metric (°C, km/h, km)</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>CLOCK</label>
            <select value={prefs.clockFormat} onChange={(e) => set("clockFormat", e.target.value)} className={inputCls}>
              <option value="12">12-hour (3:40 PM)</option>
              <option value="24">24-hour (15:40)</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>TIMEZONE</label>
            <select value={prefs.timezone ?? ""} onChange={(e) => set("timezone", e.target.value || null)} className={inputCls}>
              <option value="">Automatic (this device)</option>
              {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>DEFAULT MAP STYLE</label>
            <select value={prefs.defaultMapStyle} onChange={(e) => set("defaultMapStyle", e.target.value)} className={inputCls}>
              <option value="standard">Standard</option>
              <option value="tactical-dark">Tactical Dark</option>
              <option value="night-vision">Night Vision</option>
            </select>
            <p className="text-xs text-white/35 mt-1.5">Standard applies now; the exclusive themes apply when the theme system is on your account.</p>
          </div>
          <div>
            <label className={labelCls}>CAMERA GRID DENSITY</label>
            <select value={prefs.cameraGridDensity} onChange={(e) => set("cameraGridDensity", e.target.value)} className={inputCls}>
              <option value="comfortable">Comfortable</option>
              <option value="compact">Compact</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>CAMERA PREVIEW REFRESH (SECONDS)</label>
            <input type="number" min={5} max={300} value={prefs.cameraPreviewRefreshSeconds}
              onChange={(e) => set("cameraPreviewRefreshSeconds", Number(e.target.value))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>RECORDING CLIP LENGTH (SECONDS)</label>
            <input type="number" min={10} max={3600} value={prefs.recordingClipSeconds}
              onChange={(e) => set("recordingClipSeconds", Number(e.target.value))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>RECORDING QUALITY</label>
            <select value={prefs.recordingQuality} onChange={(e) => set("recordingQuality", e.target.value)} className={inputCls}>
              <option value="efficient">Efficient (smaller files)</option>
              <option value="balanced">Balanced</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>
        <div className="divide-y divide-white/5 mt-2">
          <Toggle value={prefs.cameraAutoplay} onChange={(v) => set("cameraAutoplay", v)} label="Autoplay camera previews" hint="Live previews start playing on their own in grids." />
          <Toggle value={prefs.performanceMode} onChange={(v) => set("performanceMode", v)} label="Performance mode" hint="Lighter globe: reduces animation and effects on slower devices." />
        </div>
      </Section>

      <Section icon={BellRing} title="Alerts & email">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className={labelCls}>CAMERA ALERTS VIA</label>
            <select value={prefs.cameraAlertChannel} onChange={(e) => set("cameraAlertChannel", e.target.value)} className={inputCls}>
              <option value="email">Email</option>
              <option value="push">Browser push</option>
              <option value="both">Email + browser push</option>
              <option value="none">Don't send</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>EVENT ALERTS VIA</label>
            <select value={prefs.eventAlertChannel} onChange={(e) => set("eventAlertChannel", e.target.value)} className={inputCls}>
              <option value="email">Email</option>
              <option value="push">Browser push</option>
              <option value="both">Email + browser push</option>
              <option value="none">Don't send</option>
            </select>
          </div>
        </div>
        <p className="text-xs text-white/35 mt-2">Browser push arrives with the WorldEye app install (PWA). Until push is active on your device, a push-only choice means alerts wait — we never silently reroute them.</p>
        <div className="divide-y divide-white/5 mt-2">
          <Toggle value={prefs.quietHoursEnabled} onChange={(v) => set("quietHoursEnabled", v)} label="Quiet hours" hint="Alert emails pause during these hours (your timezone above)." />
        </div>
        {prefs.quietHoursEnabled && (
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div>
              <label className={labelCls}>FROM</label>
              <input type="time" value={prefs.quietHoursStart} onChange={(e) => set("quietHoursStart", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>UNTIL</label>
              <input type="time" value={prefs.quietHoursEnd} onChange={(e) => set("quietHoursEnd", e.target.value)} className={inputCls} />
            </div>
          </div>
        )}
        <h3 className="text-sm font-bold mt-6 mb-1">Email preferences</h3>
        <div className="divide-y divide-white/5">
          <Toggle value={prefs.emailTrialReminders} onChange={(v) => set("emailTrialReminders", v)} label="Trial reminders" hint="A heads-up before a free trial converts to a paid plan." />
          <Toggle value={prefs.emailProductNews} onChange={(v) => set("emailProductNews", v)} label="Product news" hint="New layers, features and launches." />
          <Toggle value={prefs.emailAffiliateUpdates} onChange={(v) => set("emailAffiliateUpdates", v)} label="Affiliate updates" hint="Program changes, missions and payout news." />
          <Toggle value={prefs.digestEnabled} onChange={(v) => set("digestEnabled", v)} label="Weekly digest" hint="“In Case You Missed It” — the week's notable cameras and events." />
          <Toggle value={prefs.emailWeeklyDigest} onChange={(v) => set("emailWeeklyDigest", v)} label="Receive the digest by email" hint="Works together with the digest switch above." />
        </div>
        {prefs.digestEnabled && (
          <div className="mt-3">
            <label className={labelCls}>DIGEST REGIONS (COMMA-SEPARATED — EMPTY = EVERYWHERE)</label>
            <input
              key={prefs.digestRegions.join(",")}
              defaultValue={prefs.digestRegions.join(", ")}
              onBlur={(e) => set("digestRegions", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
              placeholder="e.g. Utah, Japan, Florida Keys"
              className={inputCls}
            />
          </div>
        )}
      </Section>

      <Section icon={Eye} title="Privacy & sharing">
        <div className="divide-y divide-white/5">
          <Toggle value={prefs.publicProfile} onChange={(v) => set("publicProfile", v)} label="Public profile" hint="Appear on leaderboards with your username and avatar. Off hides you from public rankings." />
          <div className="py-3">
            <label className={labelCls}>NEW SHARE LINKS START AS</label>
            <select value={prefs.shareVisibility} onChange={(e) => set("shareVisibility", e.target.value)} className={inputCls}>
              <option value="public">Public — listed and linkable</option>
              <option value="unlisted">Unlisted — only people with the link</option>
            </select>
          </div>
        </div>
      </Section>

      <Section icon={CreditCard} title="Billing preferences">
        <div className="space-y-4">
          <div>
            <label className={labelCls}>BILLING EMAIL (RECEIPTS & INVOICES)</label>
            <input
              key={prefs.billingEmail ?? ""}
              defaultValue={prefs.billingEmail ?? ""}
              placeholder="Leave empty to use your account email"
              onBlur={(e) => set("billingEmail", e.target.value.trim() || null)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>PAYMENT METHODS</label>
            {methods === null ? (
              <Loader2 className="w-5 h-5 animate-spin text-white/40" />
            ) : methods === "unavailable" || methods.length === 0 ? (
              <p className="text-sm text-white/50">No card on file yet — a payment method is created the first time you check out. Cards are handled by Stripe; WorldEye never sees or stores card numbers.</p>
            ) : (
              <ul className="space-y-2">
                {methods.map((m) => (
                  <li key={m.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm">
                    <span className="capitalize">{m.brand} •••• {m.last4}</span>
                    <span className="text-xs text-white/40">
                      Expires {m.expMonth}/{m.expYear}
                      {m.isDefault && <span className="ml-2 px-2 py-0.5 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#D4AF37] text-[10px] font-bold tracking-wider">DEFAULT</span>}
                      {!m.isDefault && <span className="ml-2 px-2 py-0.5 rounded-full bg-white/5 border border-white/15 text-white/60 text-[10px] font-bold tracking-wider">BACKUP</span>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <button onClick={addBackupCard} disabled={setupBusy} className={`${btnGold} mt-3`}>
              {setupBusy ? "Opening…" : methods && methods !== "unavailable" && methods.length > 0 ? "Add a backup card" : "Add a payment method"}
            </button>
            {methodsMsg && <p className="text-sm text-red-400 mt-2">{methodsMsg}</p>}
            <p className="text-xs text-white/35">Adding a card opens Stripe's secure form. Your default card stays the one charged; a backup is there if the default ever fails.</p>
          </div>
        </div>
      </Section>

      <Section icon={Database} title="Your data">
        <p className="text-sm text-white/55 mb-4">Download everything WorldEye holds for your account: profile, settings, saved cameras, alert rules, recordings list and devices.</p>
        <div className="flex flex-wrap gap-2">
          <a href="/api/account/export?format=json" className={btnGhost}>Download JSON</a>
          <a href="/api/account/export?format=csv" className={btnGhost}>Download CSV</a>
        </div>
      </Section>

      <Section icon={Trash2} title="Delete account">
        {del?.scheduledFor ? (
          <div className="space-y-3">
            <p className="text-sm text-red-300">
              Deletion scheduled for {new Date(del.scheduledFor).toLocaleDateString("en-US", { dateStyle: "long" })}.
              Until then your account works normally — cancelling keeps everything.
            </p>
            {del.subscription && (
              <p className="text-xs text-white/45">
                Your subscription ({del.subscription.status}) {del.subscription.cancelAtPeriodEnd ? "is set to end at the period end, so nothing more will be charged." : "will be cancelled when the account is deleted, so nothing more will be charged."}
              </p>
            )}
            <button onClick={cancelDeletion} disabled={delBusy} className={btnGold}>{delBusy ? "Working…" : "Cancel deletion — keep my account"}</button>
          </div>
        ) : delConfirm ? (
          <div className="space-y-3">
            <p className="text-sm text-white/65">
              This schedules your account for permanent deletion in 14 days. Nothing is deleted today, and you can cancel any time before then.
              {del?.subscription ? " Your subscription will not renew after deletion — it stays active until its current period ends." : ""}
            </p>
            <div className="flex gap-2">
              <button onClick={requestDeletion} disabled={delBusy} className="px-5 py-2.5 rounded-xl bg-red-500/90 text-white text-sm font-bold hover:bg-red-500 transition disabled:opacity-60">
                {delBusy ? "Working…" : "Yes, schedule deletion"}
              </button>
              <button onClick={() => setDelConfirm(false)} className={btnGhost}>Keep my account</button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-white/55">Permanently delete your account and its data. There's a 14-day grace period — schedule it now, change your mind any time before it runs.</p>
            <button onClick={() => setDelConfirm(true)} className="px-4 py-2 rounded-xl border border-red-400/40 text-xs font-semibold text-red-300 hover:bg-red-400/10 transition">Delete my account…</button>
          </div>
        )}
        {delMsg && <p className={`mt-3 text-sm ${delMsg.ok ? "text-green-400" : "text-red-400"}`}>{delMsg.text}</p>}
      </Section>

      <SecuritySections prefs={prefs} />

      {(saveState === "saving" || saveState === "saved" || saveState === "error") && (
        <div className="fixed bottom-5 right-5 z-50 rounded-full border border-white/15 bg-[#0a0f1c]/95 px-4 py-2 text-xs font-semibold shadow-xl">
          {saveState === "saving" ? "Saving…" : saveState === "saved" ? (
            <span className="text-green-300 inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> Saved</span>
          ) : (
            <span className="text-red-300">{saveError ?? "Couldn't save"}</span>
          )}
        </div>
      )}
    </>
  );
}

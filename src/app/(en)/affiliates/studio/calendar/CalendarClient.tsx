"use client";

// Content Calendar (spec §10): month grid + list of scheduled posts,
// scheduling form, .ics export, and the manual-publish record.
// Every post here is method "reminder" — the Studio reminds you and
// you post it; nothing here pretends to publish on your behalf.

import { useCallback, useEffect, useMemo, useState } from "react";
import { POST_PLATFORMS, REMINDER_OFFSETS, buildIcs, reminderLabel } from "@/lib/studio/calendar";

interface Post {
  id: string;
  projectId: string | null;
  variationId: string | null;
  platform: string;
  caption: string | null;
  affiliateLink: string | null;
  scheduledAt: string;
  timezone: string;
  method: string;
  status: string;
  reminderOffsetsMin: number[];
  publishedUrl: string | null;
}
interface VariationOption { id: string; label: string; caption: string | null }

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const j = (await r.json().catch(() => ({}))) as T & { error?: string };
  if (!r.ok) throw new Error((j as { error?: string }).error || `Request failed (${r.status})`);
  return j;
}

const BTN =
  "inline-flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-[13px] font-bold text-[#04121f] disabled:opacity-50";
const BTN_STYLE = { background: "linear-gradient(135deg,#38bdf8,#0096FF)" } as const;
const GHOST =
  "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/15 text-[12px] font-mono text-slate-300 hover:bg-white/5 disabled:opacity-50";
const INPUT =
  "rounded-lg bg-black/30 border border-white/10 px-2.5 py-2 text-[13px] text-white placeholder:text-slate-500";

const STATUS_COLOR: Record<string, string> = {
  scheduled: "bg-sky-500/20 text-sky-200",
  reminder_due: "bg-amber-500/20 text-amber-200",
  published: "bg-emerald-500/20 text-emerald-200",
  cancelled: "bg-white/10 text-slate-400",
};

export default function CalendarClient() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [options, setOptions] = useState<VariationOption[]>([]);
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [view, setView] = useState<"month" | "list">("month");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // form
  const [variationId, setVariationId] = useState("");
  const [platform, setPlatform] = useState<string>("tiktok");
  const [when, setWhen] = useState("");
  const [caption, setCaption] = useState("");
  const [offsets, setOffsets] = useState<number[]>([1440, 30]);
  const [publishUrl, setPublishUrl] = useState<Record<string, string>>({});

  const refresh = useCallback(async () => {
    const j = await api<{ posts: Post[] }>("/api/affiliate/studio/repurpose/posts");
    setPosts(j.posts);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await refresh();
        const pj = await api<{ projects: { id: string; title: string }[] }>("/api/affiliate/studio/repurpose/projects");
        const opts: VariationOption[] = [];
        for (const p of pj.projects.slice(0, 12)) {
          const detail = await api<{
            project: { title: string };
            variations: { id: string; title: string; creativeId: string; captionText: string | null }[];
          }>(`/api/affiliate/studio/repurpose/projects/${p.id}`).catch(() => null);
          if (!detail) continue;
          for (const v of detail.variations) {
            opts.push({ id: v.id, label: `${detail.project.title} — ${v.title} (${v.creativeId})`, caption: v.captionText });
          }
        }
        setOptions(opts);
        // Deep link from a variation's Publish & Share panel.
        const wanted = new URLSearchParams(window.location.search).get("v");
        if (wanted && opts.some((o) => o.id === wanted)) {
          setVariationId(wanted);
          const opt = opts.find((o) => o.id === wanted);
          if (opt?.caption) setCaption(opt.caption);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't load the calendar.");
      }
    })();
  }, [refresh]);

  const schedule = async () => {
    if (!when) return setError("Pick a date and time.");
    setBusy(true);
    setError(null);
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      await api("/api/affiliate/studio/repurpose/posts", {
        method: "POST",
        body: JSON.stringify({
          variationId: variationId || undefined,
          platform,
          scheduledAt: new Date(when).toISOString(),
          caption: caption || undefined,
          timezone: tz,
          reminderOffsetsMin: offsets,
        }),
      });
      setNotice("Scheduled. You'll get a dashboard + email reminder — posting itself is manual, in the platform app.");
      setWhen("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't schedule.");
    } finally {
      setBusy(false);
    }
  };

  const patch = async (id: string, body: Record<string, unknown>, msg?: string) => {
    try {
      await api(`/api/affiliate/studio/repurpose/posts/${id}`, { method: "PATCH", body: JSON.stringify(body) });
      if (msg) setNotice(msg);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed.");
    }
  };

  const remove = async (id: string) => {
    await api(`/api/affiliate/studio/repurpose/posts/${id}`, { method: "DELETE" }).catch(() => undefined);
    await refresh();
  };

  const downloadIcs = (p: Post) => {
    const ics = buildIcs({
      uid: p.id,
      title: `Post to ${p.platform} — WorldEye Studio`,
      description: p.caption ?? "Open the Studio calendar, copy the caption and post your variation.",
      start: new Date(p.scheduledAt),
      url: "https://worldeye.app/affiliates/studio/calendar",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    a.download = `worldeye-post-${p.platform}-${p.id.slice(0, 8)}.ics`;
    a.click();
  };

  const cells = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1);
    const startDay = (first.getDay() + 6) % 7; // Monday start
    const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
    const out: ({ day: number; key: string } | null)[] = [];
    for (let i = 0; i < startDay; i++) out.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      out.push({ day: d, key: `${cursor.y}-${cursor.m}-${d}` });
    }
    return out;
  }, [cursor]);

  const postsOn = (day: number) =>
    posts.filter((p) => {
      const d = new Date(p.scheduledAt);
      return d.getFullYear() === cursor.y && d.getMonth() === cursor.m && d.getDate() === day;
    });

  const monthName = new Date(cursor.y, cursor.m, 1).toLocaleString(undefined, { month: "long", year: "numeric" });
  const move = (delta: number) =>
    setCursor((c) => {
      const d = new Date(c.y, c.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  const postCard = (p: Post) => (
    <div key={p.id} className="rounded-xl border border-white/10 bg-black/20 p-3 space-y-1.5">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-bold text-white text-[13px] capitalize">{p.platform}</span>
        <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${STATUS_COLOR[p.status] ?? "bg-white/10 text-slate-300"}`}>
          {p.status.replace("_", " ")}
        </span>
        <span className="font-mono text-[11px] text-slate-500">
          {new Date(p.scheduledAt).toLocaleString()} · Reminder (manual publish)
        </span>
      </div>
      {p.caption && <p className="text-[12px] text-slate-400 whitespace-pre-line line-clamp-3">{p.caption}</p>}
      {p.publishedUrl && (
        <a href={p.publishedUrl} target="_blank" rel="noreferrer" className="text-[12px] text-sky-300 break-all">
          {p.publishedUrl}
        </a>
      )}
      <div className="flex flex-wrap gap-1.5 pt-0.5">
        <button onClick={() => downloadIcs(p)} className={GHOST}>Add to calendar (.ics)</button>
        {p.status !== "published" && p.status !== "cancelled" && (
          <>
            <input
              value={publishUrl[p.id] ?? ""}
              onChange={(e) => setPublishUrl((s) => ({ ...s, [p.id]: e.target.value }))}
              placeholder="Paste the live post URL"
              className={INPUT + " flex-1 min-w-[160px] !py-1.5"}
            />
            <button
              onClick={() =>
                patch(p.id, { status: "published", publishedUrl: publishUrl[p.id] }, "Marked published — nice work. The variation now shows it too.")
              }
              className={GHOST}
            >
              Mark published
            </button>
            <button onClick={() => patch(p.id, { status: "cancelled" })} className={GHOST}>Cancel</button>
          </>
        )}
        <button onClick={() => remove(p.id)} className="font-mono text-[11px] text-slate-500 hover:text-red-300 px-1">
          delete
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-white">Content Calendar</h1>
        <p className="text-sm text-slate-400 max-w-2xl">
          Plan when each variation goes out. Reminders land in your dashboard inbox and your email — you always post
          in the platform app yourself, then paste the live URL back here so your analytics stay truthful.
        </p>
      </div>

      {error && <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}
      {notice && <div className="rounded-xl border border-sky-400/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-200">{notice}</div>}

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
        <h2 className="font-bold text-white text-sm">Schedule a post</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <label className="block text-[12px] text-slate-400">
            Variation
            <select
              value={variationId}
              onChange={(e) => {
                setVariationId(e.target.value);
                const opt = options.find((o) => o.id === e.target.value);
                if (opt?.caption) setCaption(opt.caption);
              }}
              className={INPUT + " w-full mt-1"}
            >
              <option value="">— Any / decide later —</option>
              {options.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          </label>
          <label className="block text-[12px] text-slate-400">
            Platform
            <select value={platform} onChange={(e) => setPlatform(e.target.value)} className={INPUT + " w-full mt-1"}>
              {POST_PLATFORMS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </label>
          <label className="block text-[12px] text-slate-400">
            Date &amp; time (your timezone)
            <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className={INPUT + " w-full mt-1"} />
          </label>
          <div className="text-[12px] text-slate-400">
            Remind me
            <div className="flex flex-wrap gap-3 mt-2 text-slate-300 text-[13px]">
              {REMINDER_OFFSETS.map((o) => (
                <label key={o} className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={offsets.includes(o)}
                    onChange={(e) =>
                      setOffsets((s) => (e.target.checked ? [...s, o] : s.filter((x) => x !== o)))
                    }
                  />
                  {reminderLabel(o)}
                </label>
              ))}
            </div>
          </div>
        </div>
        <label className="block text-[12px] text-slate-400">
          Caption (post text)
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={3}
            placeholder="Filled automatically when you pick a variation — edit freely."
            className={INPUT + " w-full mt-1"}
          />
        </label>
        <button onClick={schedule} disabled={busy} className={BTN} style={BTN_STYLE}>
          {busy ? "Scheduling…" : "Schedule post"}
        </button>
      </section>

      <div className="flex items-center gap-2">
        <button onClick={() => move(-1)} className={GHOST}>← Prev</button>
        <span className="font-bold text-white">{monthName}</span>
        <button onClick={() => move(1)} className={GHOST}>Next →</button>
        <span className="ml-auto flex gap-2">
          <button onClick={() => setView("month")} className={GHOST + (view === "month" ? " !border-sky-400/50 text-sky-200" : "")}>Month</button>
          <button onClick={() => setView("list")} className={GHOST + (view === "list" ? " !border-sky-400/50 text-sky-200" : "")}>List</button>
        </span>
      </div>

      {view === "month" ? (
        <div className="grid grid-cols-7 gap-1.5">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="font-mono text-[11px] text-slate-500 text-center py-1">{d}</div>
          ))}
          {cells.map((c, i) =>
            c === null ? (
              <div key={`x${i}`} />
            ) : (
              <div key={c.key} className="min-h-[92px] rounded-xl border border-white/5 bg-white/[0.02] p-1.5 space-y-1">
                <div className="font-mono text-[11px] text-slate-500">{c.day}</div>
                {postsOn(c.day).map((p) => (
                  <div
                    key={p.id}
                    className={`rounded px-1.5 py-1 text-[11px] leading-tight ${STATUS_COLOR[p.status] ?? "bg-white/10 text-slate-200"}`}
                    title={p.caption ?? ""}
                  >
                    <span className="capitalize font-semibold">{p.platform}</span>{" "}
                    {new Date(p.scheduledAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  </div>
                ))}
              </div>
            ),
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {posts.length === 0 && <p className="text-sm text-slate-500">Nothing scheduled yet.</p>}
          {posts.map(postCard)}
        </div>
      )}

      {view === "month" && posts.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-bold text-white text-sm">All scheduled posts</h2>
          {posts.map(postCard)}
        </div>
      )}
    </div>
  );
}

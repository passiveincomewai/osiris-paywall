"use client";

// Admin: Studio campaigns — create, change status, and spot-check
// participations (verify / flag the affiliate-submitted post URLs).
// Data: GET/POST /api/admin/studio/campaigns, PATCH .../[id],
// POST /api/admin/studio/participations/[id] { reviewStatus }.
import { useCallback, useEffect, useState } from "react";

interface ParticipationRow {
  id: string;
  profileId: string;
  postUrl?: string | null;
  postedAt?: string | null;
  reviewStatus: string;
  completedAt?: string | null;
  joinedAt: string;
  profile?: { referralCode?: string; customCode?: string | null } | null;
}

interface CampaignRow {
  id: string;
  name: string;
  goal: string;
  description: string;
  startsAt: string;
  endsAt: string;
  requiredHashtags: string[];
  requiredCaptionSnippet?: string | null;
  landingUrl: string;
  xpReward: number;
  creditReward: number;
  channels: string[];
  templateSlugs: string[];
  status: string;
  participations?: ParticipationRow[];
  _count?: { participations: number };
}

const input =
  "w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-cyan-400/60 placeholder:text-white/30";
const label = "block text-[11px] font-mono uppercase tracking-[0.15em] text-white/40 mb-1";
const STATUSES = ["draft", "active", "ended"] as const;

function splitList(v: string): string[] {
  return v.split(",").map((s) => s.trim()).filter(Boolean);
}

export default function StudioCampaigns() {
  const [rows, setRows] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [landingUrl, setLandingUrl] = useState("");
  const [xpReward, setXpReward] = useState("100");
  const [creditReward, setCreditReward] = useState("10");
  const [channels, setChannels] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [templateSlugs, setTemplateSlugs] = useState("");
  const [snippet, setSnippet] = useState("");
  const [status, setStatus] = useState<string>("draft");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/studio/campaigns", { cache: "no-store" });
      const j = await res.json().catch(() => ({}));
      if (res.ok) setRows(Array.isArray(j.campaigns) ? (j.campaigns as CampaignRow[]) : []);
      else setMsg(typeof j.error === "string" ? j.error : `Couldn't load campaigns (${res.status})`);
    } catch {
      setMsg("Network error loading campaigns.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create() {
    setMsg("");
    if (!name.trim() || !goal.trim() || !startsAt || !endsAt || !landingUrl.trim()) {
      setMsg("Name, goal, start, end, and landing URL are required.");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/studio/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          goal: goal.trim(),
          description: description.trim(),
          startsAt: new Date(startsAt).toISOString(),
          endsAt: new Date(endsAt).toISOString(),
          landingUrl: landingUrl.trim(),
          xpReward: Number(xpReward) || 0,
          creditReward: Number(creditReward) || 0,
          channels: splitList(channels),
          requiredHashtags: splitList(hashtags).map((h) => (h.startsWith("#") ? h : `#${h}`)),
          templateSlugs: splitList(templateSlugs),
          requiredCaptionSnippet: snippet.trim() || null,
          status,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(typeof j.error === "string" ? j.error : `Create failed (${res.status})`);
        return;
      }
      setMsg("Campaign created.");
      setName(""); setGoal(""); setDescription(""); setStartsAt(""); setEndsAt("");
      setLandingUrl(""); setChannels(""); setHashtags(""); setTemplateSlugs(""); setSnippet("");
      await load();
    } catch {
      setMsg("Network error — try again.");
    } finally {
      setCreating(false);
    }
  }

  async function changeStatus(id: string, next: string) {
    setBusyId(id);
    setMsg("");
    try {
      const res = await fetch(`/api/admin/studio/campaigns/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(typeof j.error === "string" ? j.error : `Status update failed (${res.status})`);
        return;
      }
      setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status: next } : r)));
    } catch {
      setMsg("Network error — try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function review(participationId: string, campaignId: string, reviewStatus: "verified" | "flagged") {
    setBusyId(participationId);
    setMsg("");
    try {
      const res = await fetch(`/api/admin/studio/participations/${encodeURIComponent(participationId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewStatus }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(typeof j.error === "string" ? j.error : `Review failed (${res.status})`);
        return;
      }
      setRows((rs) =>
        rs.map((r) =>
          r.id !== campaignId
            ? r
            : {
                ...r,
                participations: (r.participations ?? []).map((p) =>
                  p.id === participationId ? { ...p, reviewStatus } : p,
                ),
              },
        ),
      );
    } catch {
      setMsg("Network error — try again.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div className="text-sm font-bold text-white">📣 Studio campaigns</div>
        <div className="text-[11px] font-mono text-white/40">{rows.length} campaigns</div>
      </div>
      {msg && <div className="text-xs font-mono text-cyan-300">{msg}</div>}

      {/* Create form */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className={label}>Name</label>
          <input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Earth Week push" />
        </div>
        <div>
          <label className={label}>Goal</label>
          <input className={input} value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="One reel about live Earth views" />
        </div>
        <div className="sm:col-span-2">
          <label className={label}>Description</label>
          <textarea className={input + " min-h-20"} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <label className={label}>Starts</label>
          <input className={input} type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
        </div>
        <div>
          <label className={label}>Ends</label>
          <input className={input} type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
        </div>
        <div>
          <label className={label}>Landing URL</label>
          <input className={input} value={landingUrl} onChange={(e) => setLandingUrl(e.target.value)} placeholder="https://worldeye.app/" />
        </div>
        <div>
          <label className={label}>Required caption snippet</label>
          <input className={input} value={snippet} onChange={(e) => setSnippet(e.target.value)} placeholder="Optional" />
        </div>
        <div>
          <label className={label}>Channels (comma-separated)</label>
          <input className={input} value={channels} onChange={(e) => setChannels(e.target.value)} placeholder="instagram, tiktok" />
        </div>
        <div>
          <label className={label}>Required hashtags (comma-separated)</label>
          <input className={input} value={hashtags} onChange={(e) => setHashtags(e.target.value)} placeholder="#WorldEye, #LiveEarth" />
        </div>
        <div className="sm:col-span-2">
          <label className={label}>Template slugs (comma-separated)</label>
          <input className={input} value={templateSlugs} onChange={(e) => setTemplateSlugs(e.target.value)} placeholder="feed-globe-hero, story-earth-live" />
        </div>
        <div>
          <label className={label}>XP reward</label>
          <input className={input} type="number" min={0} value={xpReward} onChange={(e) => setXpReward(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Credit reward</label>
            <input className={input} type="number" min={0} value={creditReward} onChange={(e) => setCreditReward(e.target.value)} />
          </div>
          <div>
            <label className={label}>Status</label>
            <select className={input} value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUSES.map((s) => (
                <option key={s} value={s} className="bg-slate-900">{s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      <button
        onClick={() => void create()}
        disabled={creating}
        className="inline-flex items-center min-h-10 px-4 py-2 rounded-lg text-xs font-mono font-bold text-[#04121f] disabled:opacity-50"
        style={{ background: "linear-gradient(135deg,#38bdf8,#0096FF)" }}
      >
        {creating ? "Creating…" : "Create campaign"}
      </button>

      {/* List */}
      {loading ? (
        <p className="text-sm text-white/40">Loading campaigns…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-white/40">No campaigns yet.</p>
      ) : (
        <div className="space-y-4">
          {rows.map((c) => (
            <div key={c.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-white">{c.name}</div>
                  <div className="text-[11px] font-mono text-white/40">
                    {new Date(c.startsAt).toLocaleDateString()} → {new Date(c.endsAt).toLocaleDateString()} ·{" "}
                    {c.xpReward} XP + {c.creditReward} cr
                    {typeof c._count?.participations === "number" ? ` · ${c._count.participations} joined` : ""}
                  </div>
                </div>
                <select
                  className="min-h-10 px-2 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs font-mono"
                  value={c.status}
                  disabled={busyId === c.id}
                  onChange={(e) => void changeStatus(c.id, e.target.value)}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s} className="bg-slate-900">{s}</option>
                  ))}
                </select>
              </div>

              {(c.participations ?? []).length > 0 && (
                <div className="overflow-x-auto mt-3">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-[0.15em] text-white/35">
                        <th className="py-1.5 pr-3 font-semibold">Affiliate</th>
                        <th className="py-1.5 pr-3 font-semibold">Post</th>
                        <th className="py-1.5 pr-3 font-semibold">Review</th>
                        <th className="py-1.5 font-semibold text-right">Spot-check</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(c.participations ?? []).map((p) => (
                        <tr key={p.id} className="border-t border-white/5">
                          <td className="py-2 pr-3 font-mono text-xs text-white/70">
                            {p.profile?.customCode ?? p.profile?.referralCode ?? p.profileId.slice(0, 8)}
                          </td>
                          <td className="py-2 pr-3">
                            {p.postUrl ? (
                              <a href={p.postUrl} target="_blank" rel="noreferrer" className="text-cyan-300 hover:underline text-xs break-all">
                                {p.postUrl}
                              </a>
                            ) : (
                              <span className="text-white/35 text-xs">not posted yet</span>
                            )}
                          </td>
                          <td className="py-2 pr-3 text-xs font-mono text-white/70">
                            {p.reviewStatus}
                            {p.completedAt ? " · completed" : ""}
                          </td>
                          <td className="py-2 text-right whitespace-nowrap">
                            <button
                              onClick={() => void review(p.id, c.id, "verified")}
                              disabled={busyId === p.id}
                              className="inline-flex items-center min-h-10 px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-[#04121f] disabled:opacity-50 mr-2"
                              style={{ background: "linear-gradient(135deg,#6ee7b7,#34d399)" }}
                            >
                              Verify
                            </button>
                            <button
                              onClick={() => void review(p.id, c.id, "flagged")}
                              disabled={busyId === p.id}
                              className="inline-flex items-center min-h-10 px-3 py-1.5 rounded-lg text-xs font-mono border border-white/15 text-slate-300 hover:border-red-400/60 disabled:opacity-50"
                            >
                              Flag
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

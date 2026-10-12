"use client";

// Admin: Daily Content Drops — publish one featured template per day
// (with an XP bonus for affiliates who claim it).
// Data: GET/POST /api/admin/studio/drops. NOTE: the admin templates API
// has no GET list route, so the template is referenced by id directly.
import { useCallback, useEffect, useState } from "react";

interface DropRow {
  id: string;
  date: string;
  templateId?: string | null;
  title: string;
  note?: string | null;
  xpBonus: number;
  createdAt: string;
  template?: { slug?: string; title?: string } | null;
  _count?: { claims: number };
}

const input =
  "w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-cyan-400/60 placeholder:text-white/30";
const label = "block text-[11px] font-mono uppercase tracking-[0.15em] text-white/40 mb-1";

export default function StudioDrops() {
  const [rows, setRows] = useState<DropRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [creating, setCreating] = useState(false);

  const [date, setDate] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [xpBonus, setXpBonus] = useState("25");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/studio/drops", { cache: "no-store" });
      const j = await res.json().catch(() => ({}));
      if (res.ok) setRows(Array.isArray(j.drops) ? (j.drops as DropRow[]) : []);
      else setMsg(typeof j.error === "string" ? j.error : `Couldn't load drops (${res.status})`);
    } catch {
      setMsg("Network error loading drops.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function publish() {
    setMsg("");
    if (!date || !title.trim()) {
      setMsg("Date and title are required.");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/studio/drops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          templateId: templateId.trim() || null,
          title: title.trim(),
          note: note.trim() || null,
          xpBonus: Number(xpBonus) || 0,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(typeof j.error === "string" ? j.error : `Publish failed (${res.status})`);
        return;
      }
      setMsg("Drop published.");
      setDate(""); setTemplateId(""); setTitle(""); setNote("");
      await load();
    } catch {
      setMsg("Network error — try again.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div className="text-sm font-bold text-white">💧 Daily content drops</div>
        <div className="text-[11px] font-mono text-white/40">{rows.length} published</div>
      </div>
      {msg && <div className="text-xs font-mono text-cyan-300">{msg}</div>}

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className={label}>Date</label>
          <input className={input} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label className={label}>Template ID</label>
          <input className={input} value={templateId} onChange={(e) => setTemplateId(e.target.value)} placeholder="MarketingTemplate id (optional)" />
        </div>
        <div>
          <label className={label}>Title</label>
          <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Today's drop: storm-chaser story" />
        </div>
        <div>
          <label className={label}>XP bonus</label>
          <input className={input} type="number" min={0} value={xpBonus} onChange={(e) => setXpBonus(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className={label}>Note</label>
          <textarea className={input + " min-h-16"} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why this template, why today (optional)" />
        </div>
      </div>
      <button
        onClick={() => void publish()}
        disabled={creating}
        className="px-4 py-2 rounded-lg text-xs font-mono font-bold text-[#04121f] disabled:opacity-50"
        style={{ background: "linear-gradient(135deg,#38bdf8,#0096FF)" }}
      >
        {creating ? "Publishing…" : "Publish drop"}
      </button>

      {loading ? (
        <p className="text-sm text-white/40">Loading drops…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-white/40">No drops published yet — days without a drop simply have none.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.15em] text-white/35">
                <th className="py-2 pr-3 font-semibold">Date</th>
                <th className="py-2 pr-3 font-semibold">Title</th>
                <th className="py-2 pr-3 font-semibold">Template</th>
                <th className="py-2 pr-3 font-semibold text-right">XP bonus</th>
                <th className="py-2 font-semibold text-right">Claims</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.id} className="border-t border-white/5">
                  <td className="py-2.5 pr-3 text-white/70 whitespace-nowrap">
                    {new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td className="py-2.5 pr-3 text-white font-semibold">{d.title}</td>
                  <td className="py-2.5 pr-3 text-white/50 font-mono text-xs">
                    {d.template?.title ?? d.template?.slug ?? d.templateId ?? "—"}
                  </td>
                  <td className="py-2.5 pr-3 text-right text-white tabular-nums">{d.xpBonus}</td>
                  <td className="py-2.5 text-right text-white/70 tabular-nums">{d._count?.claims ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

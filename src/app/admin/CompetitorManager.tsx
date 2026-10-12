"use client";

import { useEffect, useState } from "react";

type Competitor = {
  id: string; slug: string; name: string; website: string | null;
  categories: string[]; tagline: string | null; description: string;
  features: unknown; pricing: string | null; whyWorldEye: unknown;
  competitorWins: string | null; verdictWorldEye: string | null;
  verdictCompetitor: string | null; sources: unknown;
  lastReviewed: string; published: boolean;
  seoTitle: string | null; seoDescription: string | null;
};

const DAY = 86400000;
function needsReview(lastReviewed: string) {
  return Date.now() - new Date(lastReviewed).getTime() > 90 * DAY;
}

const FIELDS: { key: keyof Competitor; label: string; kind: "text" | "area" | "json" | "date" }[] = [
  { key: "name", label: "Name", kind: "text" },
  { key: "website", label: "Website URL", kind: "text" },
  { key: "tagline", label: "Tagline", kind: "text" },
  { key: "description", label: "Description (direct answer)", kind: "area" },
  { key: "pricing", label: "Pricing", kind: "area" },
  { key: "competitorWins", label: "Where competitor is stronger", kind: "area" },
  { key: "verdictWorldEye", label: "Verdict: choose WorldEye if…", kind: "area" },
  { key: "verdictCompetitor", label: "Verdict: choose competitor if…", kind: "area" },
  { key: "seoTitle", label: "SEO title", kind: "text" },
  { key: "seoDescription", label: "SEO description", kind: "area" },
  { key: "lastReviewed", label: "Last reviewed", kind: "date" },
  { key: "features", label: "Features JSON", kind: "json" },
  { key: "whyWorldEye", label: "Why WorldEye JSON (string[])", kind: "json" },
  { key: "sources", label: "Sources JSON ([{label,url}])", kind: "json" },
  { key: "categories", label: "Categories JSON (string[])", kind: "json" },
];

export default function CompetitorManager() {
  const [rows, setRows] = useState<Competitor[]>([]);
  const [editing, setEditing] = useState<Competitor | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [msg, setMsg] = useState("");

  async function seed() {
    if (!confirm("Seed competitors from the bundled research data? (Upserts by slug — safe to re-run.)")) return;
    setSeeding(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/competitors/seed", { method: "POST" });
      const d = await res.json();
      setMsg(d.ok ? `Seeded ${d.seeded} competitors.` : `Seed failed: ${d.error ?? "unknown"}`);
      if (d.ok) load();
    } catch {
      setMsg("Seed failed: network error.");
    }
    setSeeding(false);
  }

  const load = () =>
    fetch("/api/admin/competitors").then((r) => r.json()).then((d) => d.ok && setRows(d.rows)).catch(() => {});
  useEffect(() => { load(); }, []);

  function openEdit(c: Competitor) {
    setEditing(c);
    const d: Record<string, string> = {};
    for (const f of FIELDS) {
      const v = c[f.key];
      d[f.key as string] =
        f.kind === "json" ? JSON.stringify(v ?? (f.key === "categories" ? [] : f.key === "features" || f.key === "sources" ? [] : []), null, 1)
        : f.kind === "date" ? new Date(v as string).toISOString().slice(0, 10)
        : ((v as string) ?? "");
    }
    setDraft(d);
    setMsg("");
  }

  async function save() {
    if (!editing) return;
    setSaving(true);
    setMsg("");
    try {
      const payload: Record<string, unknown> = {};
      for (const f of FIELDS) {
        const raw = draft[f.key as string] ?? "";
        payload[f.key as string] = f.kind === "json" ? JSON.parse(raw || "[]") : raw || null;
      }
      const res = await fetch(`/api/admin/competitors/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (d.ok) { setMsg("Saved."); load(); } else setMsg(`Failed: ${d.error ?? "unknown"}`);
    } catch (e) {
      setMsg(`Failed: ${e instanceof Error ? e.message : "invalid JSON?"}`);
    }
    setSaving(false);
  }

  async function togglePublish(c: Competitor) {
    await fetch(`/api/admin/competitors/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !c.published }),
    });
    load();
  }

  const reviewCount = rows.filter((r) => needsReview(r.lastReviewed)).length;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="text-[11px] font-bold tracking-[0.18em] text-white/40 uppercase mb-1">Competitor comparisons</div>
      <p className="text-xs text-white/45 mb-4">
        {rows.length} competitors · {rows.filter((r) => r.published).length} published
        {reviewCount > 0 && <span className="text-amber-300"> · {reviewCount} need review (&gt;90 days)</span>}
      </p>
      <div className="mb-4">
        <button onClick={seed} disabled={seeding} className="px-4 py-2 rounded-xl border border-white/15 text-xs text-white/70 hover:text-white hover:border-white/30 transition disabled:opacity-50">
          {seeding ? "Seeding…" : "Seed from bundled research data"}
        </button>
        {msg && <span className="ml-3 text-xs text-white/60">{msg}</span>}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr className="text-left text-white/40 text-xs">
              <th className="py-2 pr-3">Name</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3">Reviewed</th>
              <th className="py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-white/5">
                <td className="py-2 pr-3 text-white/85">
                  {r.name}
                  <span className="block text-[10px] text-white/30 font-mono">/compare/{r.slug}</span>
                </td>
                <td className="py-2 pr-3">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${r.published ? "bg-emerald-400/10 text-emerald-300" : "bg-white/5 text-white/40"}`}>
                    {r.published ? "Published" : "Draft"}
                  </span>
                  {needsReview(r.lastReviewed) && (
                    <span className="ml-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-300">needs review</span>
                  )}
                </td>
                <td className="py-2 pr-3 text-xs text-white/40">{new Date(r.lastReviewed).toLocaleDateString()}</td>
                <td className="py-2 text-right whitespace-nowrap">
                  <button onClick={() => openEdit(r)} className="text-xs text-[#7cc4ff] hover:underline mr-3">Edit</button>
                  <button onClick={() => togglePublish(r)} className="text-xs text-white/60 hover:text-white hover:underline">
                    {r.published ? "Unpublish" : "Publish"}
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-white/35 text-sm">No competitors yet — run the seed script.</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-[#0a1220] border border-white/15 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white">Edit: {editing.name}</h3>
              <button onClick={() => setEditing(null)} className="text-white/40 hover:text-white">✕</button>
            </div>
            <div className="space-y-3">
              {FIELDS.map((f) => (
                <label key={f.key} className="block">
                  <span className="text-xs text-white/50">{f.label}</span>
                  {f.kind === "area" ? (
                    <textarea value={draft[f.key as string] ?? ""} onChange={(e) => setDraft({ ...draft, [f.key as string]: e.target.value })} rows={3}
                      className="mt-1 w-full px-3 py-2 rounded-lg bg-white/5 border border-white/15 text-sm text-white focus:outline-none focus:border-[#0096FF]/60" />
                  ) : f.kind === "json" ? (
                    <textarea value={draft[f.key as string] ?? ""} onChange={(e) => setDraft({ ...draft, [f.key as string]: e.target.value })} rows={4} spellCheck={false}
                      className="mt-1 w-full px-3 py-2 rounded-lg bg-white/5 border border-white/15 text-xs font-mono text-white focus:outline-none focus:border-[#0096FF]/60" />
                  ) : (
                    <input type={f.kind === "date" ? "date" : "text"} value={draft[f.key as string] ?? ""} onChange={(e) => setDraft({ ...draft, [f.key as string]: e.target.value })}
                      className="mt-1 w-full px-3 py-2 rounded-lg bg-white/5 border border-white/15 text-sm text-white focus:outline-none focus:border-[#0096FF]/60" />
                  )}
                </label>
              ))}
            </div>
            <div className="flex items-center gap-3 mt-5">
              <button onClick={save} disabled={saving} className="px-5 py-2.5 rounded-xl bg-[#0096FF] text-white text-sm font-semibold disabled:opacity-50">
                {saving ? "Saving…" : "Save changes"}
              </button>
              {msg && <span className="text-xs text-white/60">{msg}</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

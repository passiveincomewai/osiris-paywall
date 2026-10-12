"use client";

// Admin: Marketing Studio template library. Server page passes all templates;
// toggles/sort PATCH immediately to /api/admin/studio/templates/[id], the row
// editor and create form POST/PATCH the same routes, and "Seed / refresh"
// POSTs /api/admin/studio/templates/seed then refreshes the server data.
// Affiliates only ever see active templates.
import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";

export interface TemplateRow {
  id: string;
  slug: string;
  title: string;
  category: string;
  kind: string;
  format: string;
  width: number;
  height: number;
  active: boolean;
  featured: boolean;
  sortOrder: number;
  svgBody: string | null;
  editableFields: unknown;
  layers: unknown;
  tags: string[];
  publishAt: string | null; // ISO
}

const CATEGORIES = ["feed", "story", "reel", "tiktok", "short", "carousel", "banner", "discount", "feature", "email", "thumbnail"];

const inputCls = "w-full rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-cyan-400/50";
const labelCls = "block text-[11px] font-mono uppercase tracking-[0.15em] text-white/35 mb-1";

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function MarketingStudio({ initial }: { initial: TemplateRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [seeding, setSeeding] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  // Row-editor draft state (keyed by template id when expanded).
  const [draft, setDraft] = useState<{
    title: string; assetUrl: string; publishAt: string;
    svgBody: string; editableFields: string; layers: string;
  } | null>(null);

  // Create-form state.
  const [form, setForm] = useState({
    title: "", category: "feed", format: "", width: "1080", height: "1080",
    svgBody: "", editableFields: "[]", layers: "[]", tags: "",
  });
  const [creating, setCreating] = useState(false);

  async function patch(id: string, data: Record<string, unknown>): Promise<boolean> {
    try {
      const res = await fetch(`/api/admin/studio/templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(j.error ?? `Failed (${res.status})`);
        return false;
      }
      return true;
    } catch {
      setMsg("Network error — try again.");
      return false;
    }
  }

  async function toggle(id: string, field: "active" | "featured") {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    const next = !row[field];
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, [field]: next } : r)));
    setBusyId(id);
    setMsg("");
    const ok = await patch(id, { [field]: next });
    if (!ok) setRows((rs) => rs.map((r) => (r.id === id ? { ...r, [field]: !next } : r)));
    setBusyId(null);
  }

  async function saveSort(id: string, value: string) {
    const n = Number.parseInt(value, 10);
    if (!Number.isInteger(n)) return;
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, sortOrder: n } : r)));
    setMsg("");
    await patch(id, { sortOrder: n });
  }

  function openEditor(r: TemplateRow) {
    if (expandedId === r.id) {
      setExpandedId(null);
      setDraft(null);
      return;
    }
    setExpandedId(r.id);
    setDraft({
      title: r.title,
      assetUrl: "",
      publishAt: toLocalInput(r.publishAt),
      svgBody: r.svgBody ?? "",
      editableFields: JSON.stringify(r.editableFields ?? [], null, 2),
      layers: JSON.stringify(r.layers ?? [], null, 2),
    });
  }

  async function saveEditor(r: TemplateRow) {
    if (!draft) return;
    let editableFields: unknown;
    let layers: unknown;
    try { editableFields = JSON.parse(draft.editableFields); } catch { setMsg("editableFields is not valid JSON."); return; }
    try { layers = JSON.parse(draft.layers); } catch { setMsg("layers is not valid JSON."); return; }
    if (!Array.isArray(editableFields)) { setMsg("editableFields must be a JSON array."); return; }
    setBusyId(r.id);
    setMsg("");
    const ok = await patch(r.id, {
      title: draft.title,
      assetUrl: draft.assetUrl || null,
      publishAt: draft.publishAt ? new Date(draft.publishAt).toISOString() : null,
      svgBody: draft.svgBody,
      editableFields,
      layers,
    });
    setBusyId(null);
    if (ok) {
      setRows((rs) => rs.map((x) => (x.id === r.id ? {
        ...x, title: draft.title, svgBody: draft.svgBody, editableFields, layers,
        publishAt: draft.publishAt ? new Date(draft.publishAt).toISOString() : null,
      } : x)));
      setMsg(`Saved “${draft.title}”.`);
      setExpandedId(null);
      setDraft(null);
    }
  }

  async function seed() {
    setSeeding(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/studio/templates/seed", { method: "POST" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(j.error ?? `Seed failed (${res.status})`);
        return;
      }
      setMsg(`Library refreshed — ${j.count} built-in template(s) seeded.`);
      router.refresh();
    } catch {
      setMsg("Network error — try again.");
    } finally {
      setSeeding(false);
    }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    let editableFields: unknown;
    let layers: unknown;
    try { editableFields = JSON.parse(form.editableFields); } catch { setMsg("Create: editableFields is not valid JSON."); return; }
    try { layers = JSON.parse(form.layers); } catch { setMsg("Create: layers is not valid JSON."); return; }
    if (!Array.isArray(editableFields)) { setMsg("Create: editableFields must be a JSON array."); return; }
    setCreating(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/studio/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          category: form.category,
          format: form.format,
          width: Number.parseInt(form.width, 10),
          height: Number.parseInt(form.height, 10),
          svgBody: form.svgBody,
          editableFields,
          layers,
          tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(j.error ?? `Create failed (${res.status})`);
        return;
      }
      setMsg(`Created “${j.title}” (${j.slug}).`);
      setShowCreate(false);
      router.refresh();
    } catch {
      setMsg("Network error — try again.");
    } finally {
      setCreating(false);
    }
  }

  const activeCount = rows.filter((r) => r.active).length;
  const featuredCount = rows.filter((r) => r.featured).length;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-bold text-white">🎨 Marketing Studio — templates</div>
        <div className="flex items-center gap-3">
          <div className="text-[11px] font-mono text-white/40">
            {rows.length} total · {activeCount} active · {featuredCount} featured
          </div>
          <button
            onClick={seed}
            disabled={seeding}
            className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-[#04121f] disabled:opacity-50"
            style={{ background: "linear-gradient(135deg,#6ee7b7,#34d399)" }}>
            {seeding ? "Seeding…" : "Seed / refresh library"}
          </button>
        </div>
      </div>
      {msg && <div className="mb-3 text-xs font-mono text-cyan-300">{msg}</div>}

      {rows.length === 0 ? (
        <p className="text-sm text-white/40">No templates yet. Seed the built-in library or create one below.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.15em] text-white/35">
                <th className="py-2 pr-3 font-semibold">Title</th>
                <th className="py-2 pr-3 font-semibold">Category</th>
                <th className="py-2 pr-3 font-semibold">Format</th>
                <th className="py-2 pr-3 font-semibold">Active</th>
                <th className="py-2 pr-3 font-semibold">Featured</th>
                <th className="py-2 pr-3 font-semibold">Sort</th>
                <th className="py-2 font-semibold text-right">Edit</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <Fragment key={r.id}>
                  <tr className="border-t border-white/5">
                    <td className="py-2.5 pr-3">
                      <div className="text-white font-semibold">{r.title}</div>
                      <div className="text-[11px] text-white/40 font-mono">{r.slug}</div>
                    </td>
                    <td className="py-2.5 pr-3 text-white/70 capitalize">{r.category}</td>
                    <td className="py-2.5 pr-3 text-white/50 font-mono text-xs">{r.format} · {r.width}×{r.height}</td>
                    <td className="py-2.5 pr-3">
                      <button
                        onClick={() => toggle(r.id, "active")}
                        disabled={busyId === r.id}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold disabled:opacity-50 ${r.active ? "text-[#04121f]" : "border border-white/15 text-slate-300"}`}
                        style={r.active ? { background: "linear-gradient(135deg,#6ee7b7,#34d399)" } : undefined}>
                        {r.active ? "Active" : "Archived"}
                      </button>
                    </td>
                    <td className="py-2.5 pr-3">
                      <button
                        onClick={() => toggle(r.id, "featured")}
                        disabled={busyId === r.id}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold disabled:opacity-50 ${r.featured ? "text-[#04121f]" : "border border-white/15 text-slate-300"}`}
                        style={r.featured ? { background: "linear-gradient(135deg,#f7b80c,#f59e0b)" } : undefined}>
                        {r.featured ? "★ Featured" : "☆ Feature"}
                      </button>
                    </td>
                    <td className="py-2.5 pr-3">
                      <input
                        type="number"
                        defaultValue={r.sortOrder}
                        key={`${r.id}-${r.sortOrder}`}
                        onBlur={(e) => saveSort(r.id, e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                        className="w-20 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-sm text-white focus:outline-none focus:border-cyan-400/50"
                      />
                    </td>
                    <td className="py-2.5 text-right">
                      <button
                        onClick={() => openEditor(r)}
                        className="px-3 py-1.5 rounded-lg text-xs font-mono border border-white/15 text-slate-300 hover:border-cyan-400/60">
                        {expandedId === r.id ? "Close" : "Edit"}
                      </button>
                    </td>
                  </tr>
                  {expandedId === r.id && draft && (
                    <tr key={`${r.id}-editor`} className="border-t border-white/5">
                      <td colSpan={7} className="py-3 pr-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                          <div>
                            <label className={labelCls}>Title</label>
                            <input className={inputCls} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
                          </div>
                          <div>
                            <label className={labelCls}>Asset URL</label>
                            <input className={inputCls} value={draft.assetUrl} onChange={(e) => setDraft({ ...draft, assetUrl: e.target.value })} placeholder="https://… (blank clears)" />
                          </div>
                          <div>
                            <label className={labelCls}>Publish at</label>
                            <input type="datetime-local" className={inputCls} value={draft.publishAt} onChange={(e) => setDraft({ ...draft, publishAt: e.target.value })} />
                          </div>
                        </div>
                        <div className="mb-3">
                          <label className={labelCls}>SVG body</label>
                          <textarea rows={8} className={`${inputCls} font-mono text-xs`} value={draft.svgBody} onChange={(e) => setDraft({ ...draft, svgBody: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className={labelCls}>editableFields (JSON)</label>
                            <textarea rows={5} className={`${inputCls} font-mono text-xs`} value={draft.editableFields} onChange={(e) => setDraft({ ...draft, editableFields: e.target.value })} />
                          </div>
                          <div>
                            <label className={labelCls}>layers (JSON)</label>
                            <textarea rows={5} className={`${inputCls} font-mono text-xs`} value={draft.layers} onChange={(e) => setDraft({ ...draft, layers: e.target.value })} />
                          </div>
                        </div>
                        <button
                          onClick={() => saveEditor(r)}
                          disabled={busyId === r.id}
                          className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-[#04121f] disabled:opacity-50"
                          style={{ background: "linear-gradient(135deg,#6ee7b7,#34d399)" }}>
                          Save
                        </button>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 border-t border-white/5 pt-4">
        <button
          onClick={() => setShowCreate((s) => !s)}
          className="px-3 py-1.5 rounded-lg text-xs font-mono border border-white/15 text-slate-300 hover:border-cyan-400/60">
          {showCreate ? "Hide create form" : "+ New template"}
        </button>
        {showCreate && (
          <form onSubmit={create} className="mt-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <div>
                <label className={labelCls}>Title</label>
                <input className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div>
                <label className={labelCls}>Category</label>
                <select className={inputCls} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.map((c) => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Format</label>
                <input className={inputCls} value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value })} placeholder="e.g. feed-square" required />
              </div>
              <div>
                <label className={labelCls}>Width</label>
                <input type="number" min={16} max={4000} className={inputCls} value={form.width} onChange={(e) => setForm({ ...form, width: e.target.value })} required />
              </div>
              <div>
                <label className={labelCls}>Height</label>
                <input type="number" min={16} max={4000} className={inputCls} value={form.height} onChange={(e) => setForm({ ...form, height: e.target.value })} required />
              </div>
              <div>
                <label className={labelCls}>Tags (comma-separated)</label>
                <input className={inputCls} value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="globe, cameras" />
              </div>
            </div>
            <div className="mb-3">
              <label className={labelCls}>SVG body</label>
              <textarea rows={8} className={`${inputCls} font-mono text-xs`} value={form.svgBody} onChange={(e) => setForm({ ...form, svgBody: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div>
                <label className={labelCls}>editableFields (JSON)</label>
                <textarea rows={4} className={`${inputCls} font-mono text-xs`} value={form.editableFields} onChange={(e) => setForm({ ...form, editableFields: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>layers (JSON)</label>
                <textarea rows={4} className={`${inputCls} font-mono text-xs`} value={form.layers} onChange={(e) => setForm({ ...form, layers: e.target.value })} />
              </div>
            </div>
            <button
              type="submit"
              disabled={creating}
              className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-[#04121f] disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,#6ee7b7,#34d399)" }}>
              {creating ? "Creating…" : "Create template"}
            </button>
          </form>
        )}
      </div>

      <p className="text-[11px] text-white/30 mt-3">
        Affiliates only ever see active templates. Seeding refreshes design fields of built-in templates but preserves your active/featured choices. File uploads for official assets need blob storage (not configured) — templates are managed as SVG records here.
      </p>
    </div>
  );
}

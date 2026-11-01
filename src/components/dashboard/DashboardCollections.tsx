"use client";

/**
 * /dashboard — My Collections island (shareable camera collections).
 *
 * Create themed collections of catalogue cameras, order them, and
 * share each one at its public /collections/<slug> page. Any
 * signed-in account can use this (free included) — collections are a
 * growth feature, not a plan perk. All state lives behind
 * /api/collections; membership references catalogue camera ids only.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  Code2,
  ExternalLink,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import ShareButtons from "@/components/collections/ShareButtons";
import { buildEmbedSnippet, collectionEmbedUrl, publicCollectionUrl } from "@/lib/embed/snippet";

type Item = { cameraId: string; position: number };
type Collection = {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  itemCount: number;
  items: Item[];
  updatedAt: string;
};
type SavedCamLite = { id: string; name: string; group: string; catalogueId: string | null };

const CAMERA_LIMIT = 60;
const COLLECTION_LIMIT = 25;

function friendlyError(code: string | null, fallback: string): string {
  switch (code) {
    case "collection_limit":
      return `You've reached the ${COLLECTION_LIMIT}-collection limit.`;
    case "camera_limit":
      return `This collection is full (${CAMERA_LIMIT} cameras).`;
    case "unknown_camera":
      return "That camera isn't in the WorldEye catalogue.";
    case "title_required":
      return "Give the collection a title first.";
    case "title_too_long":
      return "Titles are limited to 80 characters.";
    default:
      return fallback;
  }
}

/** Accept a bare catalogue id or any WorldEye link carrying ?camera=. */
function parseCameraInput(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  const q = s.match(/[?&]camera=([^&#\s]+)/);
  if (q) {
    try {
      return decodeURIComponent(q[1]);
    } catch {
      return q[1];
    }
  }
  return /^[a-z0-9][a-z0-9-_]*$/i.test(s) ? s : null;
}

async function apiError(r: Response | null): Promise<string | null> {
  if (!r) return null;
  const j = (await r.json().catch(() => ({}))) as { error?: string };
  return j.error ?? null;
}

export default function DashboardCollections() {
  const [cols, setCols] = useState<Collection[] | null>(null);
  const [saved, setSaved] = useState<SavedCamLite[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [origin, setOrigin] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const load = useCallback(async () => {
    try {
      const [cr, sr] = await Promise.all([
        fetch("/api/collections", { cache: "no-store" }),
        fetch("/api/recording/cameras", { cache: "no-store" }).catch(() => null),
      ]);
      if (!cr.ok) throw new Error("collections");
      setCols(((await cr.json()).collections ?? []) as Collection[]);
      if (sr?.ok) {
        const cams = ((await sr.json()).cameras ?? []) as {
          id: string;
          name: string;
          group: string;
          cameraData?: Record<string, unknown> | null;
        }[];
        setSaved(
          cams.map((c) => ({
            id: c.id,
            name: c.name,
            group: c.group,
            catalogueId: typeof c.cameraData?.id === "string" ? (c.cameraData.id as string) : null,
          })),
        );
      }
    } catch {
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    if (!newTitle.trim() || creating) return;
    setCreating(true);
    const r = await fetch("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle, description: newDesc || undefined }),
    }).catch(() => null);
    setCreating(false);
    if (r?.ok) {
      setNewTitle("");
      setNewDesc("");
      setNotice(null);
      await load();
    } else {
      setNotice(friendlyError(await apiError(r), "Couldn't create that collection — try again."));
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-1">My collections</h2>
      <p className="text-sm text-slate-400 mb-5">
        Group cameras into themed collections — ski cams, a city, storm watching — and share
        each one with a public link anyone can open. Free for every account.
      </p>

      {notice && (
        <p className="text-sm text-amber-300 bg-amber-400/10 border border-amber-300/20 rounded-xl px-4 py-2.5 mb-4">
          {notice}
        </p>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void create();
            }}
            placeholder="New collection — e.g. Best Ski Cameras"
            maxLength={80}
            className="flex-1 min-w-0 bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-cyan-400/60"
          />
          <input
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Description (optional)"
            maxLength={280}
            className="flex-1 min-w-0 bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-cyan-400/60"
          />
          <button
            type="button"
            onClick={() => void create()}
            disabled={creating || !newTitle.trim()}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-mono border border-cyan-400/50 text-cyan-200 hover:bg-cyan-400/10 disabled:opacity-50 transition shrink-0"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Create
          </button>
        </div>
        <p className="text-[11px] text-slate-500 mt-2">
          Up to {COLLECTION_LIMIT} collections, {CAMERA_LIMIT} cameras each.
        </p>
      </div>

      {loadError ? (
        <p className="text-sm text-red-300">Couldn&apos;t load your collections. Refresh to try again.</p>
      ) : !cols ? (
        <div className="flex items-center gap-2 text-slate-500 font-mono text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading your collections…
        </div>
      ) : cols.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
          <div className="text-4xl mb-3">🗂️</div>
          <div className="text-white font-bold">No collections yet</div>
          <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto">
            Create one above, then add cameras from your saved list — or use the{" "}
            <span className="text-cyan-300 font-mono">Collection</span> button on any saved
            camera card.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {cols.map((c) => (
            <CollectionCard
              key={c.id}
              col={c}
              origin={origin}
              saved={saved}
              onChanged={load}
              onNotice={setNotice}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CollectionCard({
  col,
  origin,
  saved,
  onChanged,
  onNotice,
}: {
  col: Collection;
  origin: string;
  saved: SavedCamLite[];
  onChanged: () => Promise<void>;
  onNotice: (n: string | null) => void;
}) {
  const [title, setTitle] = useState(col.title);
  const [desc, setDesc] = useState(col.description ?? "");
  const [savingMeta, setSavingMeta] = useState(false);
  const [showEmbed, setShowEmbed] = useState(false);
  const [pick, setPick] = useState("");
  const [manual, setManual] = useState("");
  const [busy, setBusy] = useState(false);

  const publicUrl = `${origin}${publicCollectionUrl(col.slug)}`;
  const snippet = useMemo(
    () => buildEmbedSnippet({ embedUrl: `${origin}${collectionEmbedUrl(col.slug)}`, name: col.title }),
    [origin, col.slug, col.title],
  );
  const inCollection = useMemo(() => new Set(col.items.map((i) => i.cameraId)), [col.items]);
  const addable = saved.filter((s) => s.catalogueId && !inCollection.has(s.catalogueId));

  const addCamera = async (cameraId: string) => {
    setBusy(true);
    const r = await fetch(`/api/collections/${col.id}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cameraId }),
    }).catch(() => null);
    setBusy(false);
    if (r?.ok) {
      onNotice(null);
      setManual("");
      setPick("");
      await onChanged();
    } else {
      onNotice(friendlyError(await apiError(r), "Couldn't add that camera — try again."));
    }
  };

  const removeCamera = async (cameraId: string) => {
    setBusy(true);
    const r = await fetch(`/api/collections/${col.id}/items`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cameraId }),
    }).catch(() => null);
    setBusy(false);
    if (r?.ok) await onChanged();
    else onNotice("Couldn't remove that camera — try again.");
  };

  const move = async (idx: number, dir: -1 | 1) => {
    const ids = col.items.map((i) => i.cameraId);
    const j = idx + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[idx], ids[j]] = [ids[j], ids[idx]];
    setBusy(true);
    const r = await fetch(`/api/collections/${col.id}/items`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cameraIds: ids }),
    }).catch(() => null);
    setBusy(false);
    if (r?.ok) await onChanged();
    else onNotice("Couldn't reorder — try again.");
  };

  const saveMeta = async () => {
    setSavingMeta(true);
    const r = await fetch(`/api/collections/${col.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description: desc }),
    }).catch(() => null);
    setSavingMeta(false);
    if (r?.ok) {
      onNotice(null);
      await onChanged();
    } else {
      onNotice(friendlyError(await apiError(r), "Couldn't save those changes — try again."));
    }
  };

  const remove = async () => {
    if (!confirm(`Delete the collection “${col.title}”? Its public link will stop working.`)) return;
    const r = await fetch(`/api/collections/${col.id}`, { method: "DELETE" }).catch(() => null);
    if (r?.ok) await onChanged();
    else onNotice("Couldn't delete that collection — try again.");
  };

  const inputCls =
    "min-w-0 bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:border-cyan-400/60";
  const btnCls =
    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono border border-white/15 text-slate-200 hover:border-cyan-400/60 hover:text-white disabled:opacity-50 transition";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={publicCollectionUrl(col.slug)}
            className="text-base font-bold text-white hover:text-cyan-200 transition inline-flex items-center gap-1.5"
          >
            {col.title} <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
          </Link>
          <div className="text-[11px] font-mono text-slate-500 mt-0.5">
            {col.itemCount} {col.itemCount === 1 ? "camera" : "cameras"} · {publicCollectionUrl(col.slug)}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <ShareButtons url={publicUrl} title={col.title} compact />
          <button type="button" className={btnCls} onClick={() => setShowEmbed((v) => !v)} aria-expanded={showEmbed}>
            <Code2 className="w-3.5 h-3.5" /> Embed
          </button>
          <button type="button" className={btnCls} onClick={() => void remove()}>
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        </div>
      </div>

      {showEmbed && (
        <div className="mt-3">
          <textarea
            readOnly
            value={snippet}
            rows={5}
            onFocus={(e) => e.target.select()}
            className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-[11px] font-mono text-slate-300 outline-none"
          />
          <p className="text-[11px] text-slate-500 mt-1.5">
            Paste this into any web page. For source-protection reasons the embed shows only
            the cameras whose source allows embedding — the public page above always shows
            the full collection.
          </p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2 mt-3">
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} className={`${inputCls} flex-1`} aria-label="Collection title" />
        <input
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          maxLength={280}
          placeholder="Description (optional)"
          className={`${inputCls} flex-1`}
          aria-label="Collection description"
        />
        <button
          type="button"
          className={btnCls}
          disabled={savingMeta || (title === col.title && desc === (col.description ?? ""))}
          onClick={() => void saveMeta()}
        >
          {savingMeta ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save"}
        </button>
      </div>

      {col.items.length > 0 && (
        <ul className="mt-3 divide-y divide-white/5 rounded-xl border border-white/10 overflow-hidden">
          {col.items.map((it, idx) => (
            <li key={it.cameraId} className="flex items-center gap-2 px-3 py-2 bg-black/20">
              <span className="text-[11px] font-mono text-slate-500 w-6 shrink-0">{idx + 1}.</span>
              <span className="text-xs font-mono text-slate-200 truncate flex-1">{it.cameraId}</span>
              <button type="button" className="p-1 text-slate-400 hover:text-white disabled:opacity-30" disabled={busy || idx === 0} onClick={() => void move(idx, -1)} aria-label="Move up">
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button type="button" className="p-1 text-slate-400 hover:text-white disabled:opacity-30" disabled={busy || idx === col.items.length - 1} onClick={() => void move(idx, 1)} aria-label="Move down">
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
              <button type="button" className="p-1 text-slate-400 hover:text-red-300 disabled:opacity-30" disabled={busy} onClick={() => void removeCamera(it.cameraId)} aria-label="Remove camera">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col sm:flex-row gap-2 mt-3">
        <div className="flex gap-2 flex-1 min-w-0">
          <select
            value={pick}
            onChange={(e) => setPick(e.target.value)}
            className="flex-1 min-w-0 bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/60"
            aria-label="Add from your saved cameras"
          >
            <option value="">Add from your saved cameras…</option>
            {addable.map((s) => (
              <option key={s.id} value={s.catalogueId ?? ""}>
                {s.name} — {s.group}
              </option>
            ))}
          </select>
          <button type="button" className={btnCls} disabled={busy || !pick} onClick={() => pick && void addCamera(pick)}>
            Add
          </button>
        </div>
        <div className="flex gap-2 flex-1 min-w-0">
          <input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const id = parseCameraInput(manual);
                if (id) void addCamera(id);
                else onNotice("Paste a camera id or a WorldEye link with ?camera= in it.");
              }
            }}
            placeholder="…or paste a camera id / camera link"
            className={`${inputCls} flex-1`}
            aria-label="Add by camera id or link"
          />
          <button
            type="button"
            className={btnCls}
            disabled={busy || !manual.trim()}
            onClick={() => {
              const id = parseCameraInput(manual);
              if (id) void addCamera(id);
              else onNotice("Paste a camera id or a WorldEye link with ?camera= in it.");
            }}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

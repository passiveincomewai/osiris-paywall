"use client";

/**
 * "Add to collection" control on a saved-camera card. Lists the
 * signed-in user's shareable collections (from /api/collections),
 * adds this camera to the chosen one, and offers an inline
 * quick-create. Renders nothing when the camera has no catalogue id
 * (collections reference catalogue ids only).
 */
import { useState } from "react";
import { Check, FolderPlus, Loader2, Plus } from "lucide-react";

type CollectionSummary = {
  id: string;
  title: string;
  slug: string;
  items: { cameraId: string }[];
};

export default function AddToCollection({
  cameraId,
  cameraName,
}: {
  cameraId: string | null;
  cameraName: string;
}) {
  const [open, setOpen] = useState(false);
  const [cols, setCols] = useState<CollectionSummary[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");

  if (!cameraId) return null;

  const load = async () => {
    const r = await fetch("/api/collections", { cache: "no-store" }).catch(() => null);
    if (r?.ok) setCols(((await r.json()).collections ?? []) as CollectionSummary[]);
    else setCols([]);
  };

  const toggle = () => {
    const next = !open;
    setOpen(next);
    setNote(null);
    if (next && cols === null) void load();
  };

  const addTo = async (col: CollectionSummary) => {
    setBusy(col.id);
    const r = await fetch(`/api/collections/${col.id}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cameraId }),
    }).catch(() => null);
    setBusy(null);
    if (r?.ok) {
      setNote(`Added to “${col.title}”`);
      void load();
    } else {
      const code = r ? ((await r.json().catch(() => ({}))) as { error?: string }).error : null;
      setNote(
        code === "camera_limit"
          ? "That collection is full (60 cameras)."
          : code === "unknown_camera"
            ? "This camera isn't in the public catalogue, so it can't be added."
            : "Couldn't add — try again.",
      );
    }
  };

  const createAndAdd = async () => {
    const title = newTitle.trim();
    if (!title) return;
    setBusy("new");
    const r = await fetch("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    }).catch(() => null);
    if (!r?.ok) {
      setBusy(null);
      const code = r ? ((await r.json().catch(() => ({}))) as { error?: string }).error : null;
      setNote(
        code === "collection_limit"
          ? "You've reached the 25-collection limit."
          : "Couldn't create that collection — try again.",
      );
      return;
    }
    const col = ((await r.json()).collection ?? null) as CollectionSummary | null;
    setNewTitle("");
    if (col) await addTo(col);
    setBusy(null);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono border border-white/15 text-slate-200 hover:border-cyan-400/60 hover:text-white transition"
        aria-expanded={open}
      >
        <FolderPlus className="w-3.5 h-3.5" /> Collection
      </button>
      {open && (
        <div className="absolute z-20 left-0 mt-2 w-64 max-w-[80vw] rounded-xl border border-white/15 bg-[#0b0f1a] shadow-2xl p-3 space-y-2">
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 truncate">
            Add “{cameraName}” to…
          </div>
          {cols === null ? (
            <div className="flex items-center gap-2 text-slate-500 text-xs font-mono py-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
            </div>
          ) : (
            <>
              {cols.length === 0 && (
                <p className="text-xs text-slate-400">No collections yet — create your first below.</p>
              )}
              <ul className="space-y-1 max-h-44 overflow-y-auto">
                {cols.map((c) => {
                  const has = c.items.some((i) => i.cameraId === cameraId);
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        disabled={has || busy !== null}
                        onClick={() => void addTo(c)}
                        className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs text-slate-200 border border-white/10 hover:border-cyan-400/50 disabled:opacity-50 transition"
                      >
                        <span className="truncate">{c.title}</span>
                        {busy === c.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                        ) : has ? (
                          <Check className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                        ) : (
                          <Plus className="w-3.5 h-3.5 shrink-0" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="flex gap-1.5 pt-1">
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void createAndAdd();
                  }}
                  placeholder="New collection title"
                  maxLength={80}
                  className="flex-1 min-w-0 bg-black/40 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-cyan-400/60"
                />
                <button
                  type="button"
                  disabled={busy !== null || !newTitle.trim()}
                  onClick={() => void createAndAdd()}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-mono border border-cyan-400/50 text-cyan-200 hover:bg-cyan-400/10 disabled:opacity-50 transition"
                >
                  {busy === "new" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Create"}
                </button>
              </div>
            </>
          )}
          {note && <p className="text-[11px] text-amber-200/90 leading-snug">{note}</p>}
        </div>
      )}
    </div>
  );
}

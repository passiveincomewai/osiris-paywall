"use client";

/**
 * Enterprise dashboard: collections CRUD, camera picks with live rights
 * verdicts, the three doors (embed snippet, token feed, API keys).
 * Secrets (feed token, API key plaintext) exist client-side only in the
 * moment they're generated — the server stores hashes — so the UI shows
 * them once and says so.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, KeyRound, Link2, Plus, RefreshCw, Search, Trash2, X } from "lucide-react";

interface Collection {
  id: string;
  name: string;
  itemCount: number;
  feedActive: boolean;
  feedHits: number;
}
interface Item {
  cameraId: string;
  name: string;
  city: string;
  country: string;
  source: string;
  inCatalogue: boolean;
  eligible: boolean;
  reason: string;
}
interface SearchResult {
  id: string;
  name: string;
  city: string;
  country: string;
  source: string;
  eligible: boolean;
  reason: string;
}
interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  hits: number;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}
interface FreshToken {
  token: string;
  feedUrl: string;
  embedUrl: string;
  embedSnippet: string;
}

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.message ?? body.error ?? `Request failed (${res.status})`);
  return body;
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text).catch(() => undefined);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
      className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-white/15 text-white/70 hover:text-white hover:border-white/30 transition"
    >
      {done ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
      {done ? "Copied" : label}
    </button>
  );
}

function EligibilityChip({ eligible, reason }: { eligible: boolean; reason: string }) {
  return eligible ? (
    <span
      title={reason}
      className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-400/15 text-emerald-300 border border-emerald-400/30 shrink-0"
    >
      <Check className="w-3 h-3" /> Feed-ready
    </span>
  ) : (
    <span
      title={reason}
      className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-red-400/10 text-red-300 border border-red-400/25 shrink-0"
    >
      <X className="w-3 h-3" /> Excluded
    </span>
  );
}

export default function EnterpriseClient() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [newName, setNewName] = useState("");
  const [keyName, setKeyName] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [saved, setSaved] = useState<{ id: string; name: string }[]>([]);
  const [freshToken, setFreshToken] = useState<FreshToken | null>(null);
  const [freshKey, setFreshKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selected = collections.find((c) => c.id === selectedId) ?? null;

  const loadCollections = useCallback(async () => {
    const body = await api("/api/enterprise/collections");
    setCollections(body.collections);
    setSelectedId((prev) => prev ?? body.collections[0]?.id ?? null);
  }, []);

  const loadItems = useCallback(async (id: string) => {
    const body = await api(`/api/enterprise/collections/${id}/items`);
    setItems(body.items);
  }, []);

  const loadKeys = useCallback(async () => {
    const body = await api("/api/enterprise/keys");
    setKeys(body.keys);
  }, []);

  useEffect(() => {
    loadCollections().catch((e) => setError(e.message));
    loadKeys().catch(() => undefined);
    // The customer's saved cameras (same list the recording studio uses).
    fetch("/api/recording/cameras")
      .then((r) => (r.ok ? r.json() : { cameras: [] }))
      .then((b) =>
        setSaved(
          (b.cameras ?? []).map((c: { name: string; cameraData?: { id?: string } }) => ({
            id: c.cameraData?.id ?? "",
            name: c.name,
          })).filter((c: { id: string }) => c.id),
        ),
      )
      .catch(() => undefined);
  }, [loadCollections, loadKeys]);

  useEffect(() => {
    setFreshToken(null);
    if (selectedId) loadItems(selectedId).catch((e) => setError(e.message));
    else setItems([]);
  }, [selectedId, loadItems]);

  const runSearch = (q: string) => {
    setQuery(q);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      try {
        const body = await api(`/api/enterprise/camera-search?q=${encodeURIComponent(q.trim())}`);
        setResults(body.results);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Search failed");
      }
    }, 300);
  };

  const addCamera = async (cameraId: string) => {
    if (!selectedId) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/api/enterprise/collections/${selectedId}/items`, {
        method: "POST",
        body: JSON.stringify({ cameraId }),
      });
      await Promise.all([loadItems(selectedId), loadCollections()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add that camera");
    } finally {
      setBusy(false);
    }
  };

  const removeCamera = async (cameraId: string) => {
    if (!selectedId) return;
    await api(`/api/enterprise/collections/${selectedId}/items?cameraId=${encodeURIComponent(cameraId)}`, {
      method: "DELETE",
    }).catch((e) => setError(e.message));
    await Promise.all([loadItems(selectedId), loadCollections()]);
  };

  const generateToken = async () => {
    if (!selectedId) return;
    setBusy(true);
    setError(null);
    try {
      const body = await api(`/api/enterprise/collections/${selectedId}/token`, { method: "POST" });
      setFreshToken(body);
      await loadCollections();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate the feed link");
    } finally {
      setBusy(false);
    }
  };

  const disableFeed = async () => {
    if (!selectedId) return;
    await api(`/api/enterprise/collections/${selectedId}/token`, { method: "DELETE" }).catch((e) =>
      setError(e.message),
    );
    setFreshToken(null);
    await loadCollections();
  };

  const createKey = async () => {
    setBusy(true);
    setError(null);
    try {
      const body = await api("/api/enterprise/keys", {
        method: "POST",
        body: JSON.stringify({ name: keyName.trim() || "API key" }),
      });
      setFreshKey(body.key);
      setKeyName("");
      await loadKeys();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the key");
    } finally {
      setBusy(false);
    }
  };

  const revokeKey = async (id: string) => {
    await api(`/api/enterprise/keys/${id}`, { method: "DELETE" }).catch((e) => setError(e.message));
    await loadKeys();
  };

  return (
    <div className="mt-10 space-y-8">
      {error && (
        <p className="rounded-xl border border-red-400/30 bg-red-400/10 text-red-200 text-sm px-4 py-3">{error}</p>
      )}

      {/* Collections */}
      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
        <h2 className="font-bold text-lg">Your collections</h2>
        <div className="flex flex-wrap gap-2 mt-4">
          {collections.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={`px-4 py-2 rounded-xl text-sm border transition ${
                c.id === selectedId
                  ? "bg-[#00E5FF] text-black font-bold border-transparent"
                  : "border-white/15 text-white/75 hover:border-white/35"
              }`}
            >
              {c.name} <span className="opacity-60">· {c.itemCount}</span>
            </button>
          ))}
          {collections.length === 0 && <p className="text-sm text-white/40">No collections yet — create your first below.</p>}
        </div>
        <div className="flex gap-2 mt-4">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New collection name — e.g. Ski resort cams"
            className="flex-1 min-w-0 rounded-xl bg-black/30 border border-white/15 px-3 py-2.5 text-sm outline-none focus:border-[#00E5FF]/60"
          />
          <button
            disabled={busy || !newName.trim()}
            onClick={async () => {
              setBusy(true);
              try {
                const body = await api("/api/enterprise/collections", {
                  method: "POST",
                  body: JSON.stringify({ name: newName.trim() }),
                });
                setNewName("");
                await loadCollections();
                setSelectedId(body.collection.id);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Could not create the collection");
              } finally {
                setBusy(false);
              }
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#00E5FF] text-black font-bold text-sm disabled:opacity-40 hover:brightness-110 transition"
          >
            <Plus className="w-4 h-4" /> Create
          </button>
        </div>

        {selected && (
          <div className="mt-6 border-t border-white/10 pt-6">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="font-semibold">{selected.name}</h3>
              <span className="text-xs text-white/40">
                {selected.itemCount} picks · feed &amp; embed hits: {selected.feedHits}
              </span>
              <button
                onClick={async () => {
                  if (!confirm(`Delete “${selected.name}”? Its feed link and embed stop working.`)) return;
                  await api(`/api/enterprise/collections/${selected.id}`, { method: "DELETE" }).catch((e) =>
                    setError(e.message),
                  );
                  setSelectedId(null);
                  await loadCollections();
                }}
                className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-red-400/30 text-red-300 hover:bg-red-400/10 transition"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete collection
              </button>
            </div>

            {/* Picks */}
            <ul className="mt-4 space-y-2">
              {items.map((item) => (
                <li
                  key={item.cameraId}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-3.5 py-2.5"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-white/40 truncate">
                      {[item.city, item.country].filter(Boolean).join(", ")}
                      {item.source ? ` · ${item.source}` : ""}
                    </p>
                    {!item.eligible && <p className="text-xs text-red-200/70 mt-1">{item.reason}</p>}
                  </div>
                  <EligibilityChip eligible={item.eligible} reason={item.reason} />
                  <button
                    onClick={() => removeCamera(item.cameraId)}
                    className="text-white/40 hover:text-red-300 transition"
                    aria-label={`Remove ${item.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
              {items.length === 0 && (
                <li className="text-sm text-white/40">No cameras yet — search the catalogue or add from your saved cameras.</li>
              )}
            </ul>
            <p className="text-xs text-white/35 mt-3">
              Picks marked <span className="text-red-300">Excluded</span> stay in your collection but never ship in a
              feed, embed or API response — their camera source isn&apos;t cleared for redistribution. The reason is
              shown on each one.
            </p>

            {/* Add cameras */}
            <div className="grid md:grid-cols-2 gap-4 mt-5">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <Search className="w-4 h-4 text-[#00E5FF]" /> Search the catalogue
                </p>
                <input
                  value={query}
                  onChange={(e) => runSearch(e.target.value)}
                  placeholder="City, place or camera name…"
                  className="w-full mt-3 rounded-xl bg-black/30 border border-white/15 px-3 py-2.5 text-sm outline-none focus:border-[#00E5FF]/60"
                />
                <ul className="mt-3 space-y-2 max-h-64 overflow-auto pr-1">
                  {results.map((r) => (
                    <li key={r.id} className="flex items-center gap-2.5 text-sm">
                      <div className="flex-1 min-w-0">
                        <p className="truncate">{r.name}</p>
                        <p className="text-xs text-white/40 truncate">
                          {[r.city, r.country].filter(Boolean).join(", ")} · {r.source}
                        </p>
                      </div>
                      <EligibilityChip eligible={r.eligible} reason={r.reason} />
                      <button
                        disabled={busy}
                        onClick={() => addCamera(r.id)}
                        className="text-xs px-2.5 py-1.5 rounded-lg bg-[#00E5FF]/15 border border-[#00E5FF]/40 text-[#00E5FF] hover:bg-[#00E5FF]/25 disabled:opacity-40 transition"
                      >
                        Add
                      </button>
                    </li>
                  ))}
                  {query.trim().length >= 2 && results.length === 0 && (
                    <li className="text-xs text-white/35">No matches in the catalogue.</li>
                  )}
                </ul>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-sm font-semibold">Your saved cameras</p>
                <ul className="mt-3 space-y-2 max-h-72 overflow-auto pr-1">
                  {saved.map((c) => (
                    <li key={c.id} className="flex items-center gap-2.5 text-sm">
                      <p className="flex-1 min-w-0 truncate">{c.name}</p>
                      <button
                        disabled={busy}
                        onClick={() => addCamera(c.id)}
                        className="text-xs px-2.5 py-1.5 rounded-lg bg-[#00E5FF]/15 border border-[#00E5FF]/40 text-[#00E5FF] hover:bg-[#00E5FF]/25 disabled:opacity-40 transition"
                      >
                        Add
                      </button>
                    </li>
                  ))}
                  {saved.length === 0 && (
                    <li className="text-xs text-white/35">
                      Nothing saved yet — save cameras from the globe and they&apos;ll appear here.
                    </li>
                  )}
                </ul>
              </div>
            </div>

            {/* Doors: feed + embed */}
            <div className="rounded-2xl border border-[#00E5FF]/25 bg-[#00E5FF]/[0.04] p-4 mt-5">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Link2 className="w-4 h-4 text-[#00E5FF]" /> Feed link &amp; embed
              </p>
              {freshToken ? (
                <div className="mt-3 space-y-3">
                  <p className="text-xs text-amber-200/90">
                    Copy these now — the link is shown once. Anyone with it can read this feed. Generating a new one
                    kills this one everywhere.
                  </p>
                  <div>
                    <p className="text-xs text-white/40 mb-1">Data feed (JSON)</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 min-w-0 truncate text-xs bg-black/40 rounded-lg px-3 py-2">{freshToken.feedUrl}</code>
                      <CopyButton text={freshToken.feedUrl} label="Copy" />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-white/40 mb-1">Embed code (paste into your site)</p>
                    <div className="flex items-start gap-2">
                      <code className="flex-1 min-w-0 break-all text-xs bg-black/40 rounded-lg px-3 py-2">{freshToken.embedSnippet}</code>
                      <CopyButton text={freshToken.embedSnippet} label="Copy" />
                    </div>
                  </div>
                  <a href={freshToken.embedUrl} target="_blank" rel="noreferrer" className="text-xs text-[#00E5FF] hover:underline">
                    Preview the embed ↗
                  </a>
                </div>
              ) : selected.feedActive ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <p className="text-xs text-white/50 flex-1 min-w-48">
                    Feed link is active (the address itself is only shown when generated — it&apos;s stored hashed).
                  </p>
                  <button
                    disabled={busy}
                    onClick={generateToken}
                    className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-white/15 text-white/75 hover:border-white/35 disabled:opacity-40 transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Regenerate (old link dies)
                  </button>
                  <button
                    onClick={disableFeed}
                    className="text-xs px-3 py-2 rounded-lg border border-red-400/30 text-red-300 hover:bg-red-400/10 transition"
                  >
                    Turn feed off
                  </button>
                </div>
              ) : (
                <div className="mt-3">
                  <button
                    disabled={busy}
                    onClick={generateToken}
                    className="px-4 py-2.5 rounded-xl bg-[#00E5FF] text-black font-bold text-sm disabled:opacity-40 hover:brightness-110 transition"
                  >
                    Generate feed link &amp; embed
                  </button>
                  <p className="text-xs text-white/40 mt-2">
                    One private link powers both the JSON feed and the embeddable player.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* API keys */}
      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
        <h2 className="flex items-center gap-2 font-bold text-lg">
          <KeyRound className="w-5 h-5 text-[#00E5FF]" /> API keys <span className="text-sm font-normal text-white/40">(optional)</span>
        </h2>
        <p className="text-sm text-white/50 mt-2 max-w-2xl">
          Prefer a key over a link? Keys read the same data through{" "}
          <code className="text-white/75">GET /api/v1/collections/&lt;id&gt;/cameras</code> with{" "}
          <code className="text-white/75">Authorization: Bearer wek_…</code> — for this collection that&apos;s{" "}
          <code className="text-white/75">{selected ? selected.id : "<collection id>"}</code>. A key only ever reads
          your own collections.
        </p>
        {freshKey && (
          <div className="mt-4 rounded-xl border border-amber-300/30 bg-amber-300/10 px-4 py-3">
            <p className="text-xs text-amber-200/90">Copy this key now — it&apos;s shown once.</p>
            <div className="flex items-center gap-2 mt-2">
              <code className="flex-1 min-w-0 truncate text-xs bg-black/40 rounded-lg px-3 py-2">{freshKey}</code>
              <CopyButton text={freshKey} label="Copy key" />
            </div>
          </div>
        )}
        <ul className="mt-4 space-y-2">
          {keys.map((k) => (
            <li key={k.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-3.5 py-2.5 text-sm">
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">
                  {k.name} <code className="text-xs text-white/40">{k.keyPrefix}…</code>
                </p>
                <p className="text-xs text-white/40">
                  {k.hits} requests{k.lastUsedAt ? ` · last used ${new Date(k.lastUsedAt).toLocaleDateString()}` : " · never used"}
                  {k.revokedAt ? " · revoked" : ""}
                </p>
              </div>
              {!k.revokedAt && (
                <button
                  onClick={() => revokeKey(k.id)}
                  className="text-xs px-2.5 py-1.5 rounded-lg border border-red-400/30 text-red-300 hover:bg-red-400/10 transition"
                >
                  Revoke
                </button>
              )}
            </li>
          ))}
          {keys.length === 0 && <li className="text-sm text-white/40">No API keys yet.</li>}
        </ul>
        <div className="flex gap-2 mt-4">
          <input
            value={keyName}
            onChange={(e) => setKeyName(e.target.value)}
            placeholder="Key name — e.g. production"
            className="flex-1 min-w-0 rounded-xl bg-black/30 border border-white/15 px-3 py-2.5 text-sm outline-none focus:border-[#00E5FF]/60"
          />
          <button
            disabled={busy}
            onClick={createKey}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#00E5FF] text-black font-bold text-sm disabled:opacity-40 hover:brightness-110 transition"
          >
            <Plus className="w-4 h-4" /> Create key
          </button>
        </div>
      </section>
    </div>
  );
}

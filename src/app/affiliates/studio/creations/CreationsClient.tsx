"use client";
// My Creations: saved designs + saved captions, with download and delete.
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CopyButton, EmptyState } from "@/components/affiliate/ui";
import { AI_KIND_META, type AiKind } from "@/lib/studio/credits-config";
import {
  categoryLabel,
  creationCaptionText,
  creationTemplateSlug,
  creationValues,
  isAiCreation,
  isCaptionCreation,
  renderUrl,
  type StudioCreationLite,
} from "../StudioHomeClient";

const btnPrimary =
  "inline-flex items-center justify-center px-5 py-2.5 rounded-xl font-mono text-sm font-bold text-[#04121f] transition-all";
const btnStyle = { background: "linear-gradient(135deg,#38bdf8,#0096FF)", boxShadow: "0 0 20px rgba(0,150,255,.45)" };

function kindIcon(kind: string | null | undefined, caption: boolean): string {
  if (kind && kind.startsWith("ai_")) return "✨";
  if (caption || kind === "caption") return "✍️";
  if (kind === "carousel") return "🎠";
  if (kind === "video" || kind === "reel") return "🎬";
  return "🖼️";
}

function aiKindLabel(kind: string | null | undefined): string {
  if (kind && kind in AI_KIND_META) return AI_KIND_META[kind as AiKind].label;
  return "AI creation";
}

function paramsSummary(c: StudioCreationLite): { key: string; value: string }[] {
  const values = creationValues(c);
  return Object.entries(values)
    // AI params carry the fulfillment spec + referral link — internal
    // machinery, not card content. Caption-ish keys are shown as text.
    .filter(
      ([k]) =>
        !["caption", "captionText", "text", "spec", "referralLink", "deliverable", "resultType", "discountCode"].includes(k),
    )
    .slice(0, 4)
    .map(([key, v]) => ({
      key,
      value: typeof v === "boolean" ? (v ? "on" : "off") : String(v ?? ""),
    }))
    .filter((row) => row.value.trim().length > 0);
}

export default function CreationsClient() {
  const [creations, setCreations] = useState<StudioCreationLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/affiliate/studio/creations", { cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) setError(typeof j.error === "string" ? j.error : "Couldn't load your creations.");
      else setCreations(Array.isArray(j.creations) ? (j.creations as StudioCreationLite[]) : []);
    } catch {
      setError("Couldn't load your creations.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const remove = async (id: string) => {
    setDeletingId(id);
    setNotice("");
    try {
      const r = await fetch(`/api/affiliate/studio/creations/${encodeURIComponent(id)}`, { method: "DELETE" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setNotice(typeof j.error === "string" ? j.error : "Couldn't delete that creation.");
      } else {
        setCreations((prev) => prev.filter((c) => c.id !== id));
        setNotice("Creation deleted.");
      }
    } catch {
      setNotice("Couldn't delete that creation.");
    }
    setDeletingId(null);
    setConfirmingId(null);
  };

  if (loading) return <div className="text-slate-400 font-mono text-sm">Loading your creations…</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-mono tracking-[0.25em] text-cyan-400 uppercase mb-1">Marketing Studio</div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">My Creations</h1>
          <p className="text-sm text-slate-400 mt-1">
            Everything you&apos;ve saved in the studio — designs re-render from their saved values, captions stay copy-ready.
          </p>
        </div>
        <Link href="/affiliates/studio/library" className={btnPrimary} style={btnStyle}>
          + New creation
        </Link>
      </div>

      {notice && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300" role="status">
          {notice}
        </div>
      )}

      {error ? (
        <EmptyState title="Creations unavailable" body={error} />
      ) : creations.length === 0 ? (
        <EmptyState
          title="No creations yet"
          body="Personalize a template or generate a caption, hit Save, and it will live here."
          cta={
            <Link href="/affiliates/studio/library" className={btnPrimary} style={btnStyle}>
              Browse the template library
            </Link>
          }
        />
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {creations.map((c) => {
            const caption = isCaptionCreation(c);
            const captionText = caption ? creationCaptionText(c) : null;
            const ai = isAiCreation(c);
            const slug = creationTemplateSlug(c);
            const summary = paramsSummary(c);
            const title =
              c.title ??
              c.template?.title ??
              (caption ? "Caption" : "Untitled creation");
            const subtitle = ai
              ? `Made by Cosmo · ${aiKindLabel(c.kind)}`
              : caption
                ? "Caption"
                : c.template
                  ? `${c.template.title} · ${categoryLabel(c.template.category)}`
                  : c.kind
                    ? c.kind
                    : "Design";
            return (
              <div key={c.id} className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden flex flex-col">
                {!caption && slug ? (
                  <div className="bg-black/40 aspect-[4/3] flex items-center justify-center overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={renderUrl(slug, creationValues(c), { scale: 0.35, format: "webp", preview: true })}
                      alt={title}
                      loading="lazy"
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : null}
                {ai && c.hasImage ? (
                  <div className="bg-black/40 flex items-center justify-center overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/affiliate/studio/creations/${encodeURIComponent(c.id)}/image`}
                      alt={title}
                      loading="lazy"
                      className="w-full max-h-80 object-contain"
                    />
                  </div>
                ) : null}
                <div className="p-4 flex flex-col gap-3 flex-1">
                  <div className="flex items-start gap-2.5">
                    <span className="text-xl leading-none mt-0.5" aria-hidden>{kindIcon(c.kind, caption)}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-white truncate">{title}</div>
                      <div className="text-xs font-mono text-slate-400 truncate">{subtitle}</div>
                      <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                        {new Date(c.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {ai && c.resultText ? (
                    <div>
                      <pre className="whitespace-pre-wrap text-sm text-slate-300 font-sans leading-relaxed rounded-xl border border-white/10 bg-black/30 p-3 max-h-64 overflow-y-auto">
                        {c.resultText}
                      </pre>
                      <div className="mt-2">
                        <CopyButton text={c.resultText} label="Copy result" />
                      </div>
                    </div>
                  ) : caption && captionText ? (
                    <div>
                      <pre className="whitespace-pre-wrap text-sm text-slate-300 font-sans leading-relaxed rounded-xl border border-white/10 bg-black/30 p-3 max-h-48 overflow-y-auto">
                        {captionText}
                      </pre>
                      <div className="mt-2">
                        <CopyButton text={captionText} label="Copy caption" />
                      </div>
                    </div>
                  ) : summary.length > 0 ? (
                    <dl className="space-y-1">
                      {summary.map((row) => (
                        <div key={row.key} className="flex gap-2 text-xs">
                          <dt className="font-mono text-slate-500 shrink-0">{row.key}:</dt>
                          <dd className="text-slate-300 truncate">{row.value}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p className="text-xs text-slate-500">Personalized with your referral link and QR code.</p>
                  )}

                  <div className="mt-auto flex flex-wrap gap-2 pt-1">
                    {ai && c.hasImage && (
                      <a
                        href={`/api/affiliate/studio/creations/${encodeURIComponent(c.id)}/image`}
                        download
                        className="px-4 py-2 rounded-xl font-mono text-sm font-bold text-[#04121f]"
                        style={btnStyle}
                      >
                        Download image
                      </a>
                    )}
                    {ai && (
                      <Link
                        href="/affiliates/studio/ai"
                        className="px-4 py-2 rounded-xl font-mono text-sm border border-white/15 text-slate-200 hover:border-cyan-400/60"
                      >
                        Order another
                      </Link>
                    )}
                    {!caption && !ai &&
                      (c.kind === "video" && slug ? (
                        <Link
                          href={`/affiliates/studio/video/${slug}`}
                          className="px-4 py-2 rounded-xl font-mono text-sm font-bold text-[#04121f]"
                          style={btnStyle}
                        >
                          Open in Video Studio
                        </Link>
                      ) : (
                        <a
                          href={`/api/affiliate/studio/creations/${encodeURIComponent(c.id)}?format=png`}
                          download
                          className="px-4 py-2 rounded-xl font-mono text-sm font-bold text-[#04121f]"
                          style={btnStyle}
                        >
                          Download PNG
                        </a>
                      ))}
                    {slug && !caption && (
                      <Link
                        href={`/affiliates/studio/create/${slug}`}
                        className="px-4 py-2 rounded-xl font-mono text-sm border border-white/15 text-slate-200 hover:border-cyan-400/60"
                      >
                        Edit template
                      </Link>
                    )}
                    {confirmingId === c.id ? (
                      <>
                        <button
                          onClick={() => void remove(c.id)}
                          disabled={deletingId === c.id}
                          className="px-4 py-2 rounded-xl font-mono text-sm font-bold border border-red-400/60 text-red-200 bg-red-400/10 disabled:opacity-50"
                        >
                          {deletingId === c.id ? "Deleting…" : "Confirm delete?"}
                        </button>
                        <button
                          onClick={() => setConfirmingId(null)}
                          className="px-4 py-2 rounded-xl font-mono text-sm border border-white/15 text-slate-300"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setConfirmingId(c.id)}
                        className="px-4 py-2 rounded-xl font-mono text-sm border border-white/15 text-slate-300 hover:border-red-400/50 hover:text-red-200"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

"use client";
// Quick Edit: personalize a template (or each slide of a carousel) with a
// live debounced preview, then download or save to My Creations.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { EmptyState, SectionTitle } from "@/components/affiliate/ui";
import { categoryLabel, renderUrl, type StudioTemplateLite } from "../../StudioHomeClient";

/* ------------------------------------------------------------------ */
/* Editable-field model                                                */
/* ------------------------------------------------------------------ */

type FieldValue = string | boolean;

interface EditableField {
  key: string;
  label: string;
  type: "text" | "textarea" | "color" | "toggle" | "select";
  defaultValue?: string;
  defaultBoolean?: boolean;
  placeholder?: string;
  options?: string[];
  maxLength?: number;
}

function normalizeFields(raw: unknown): EditableField[] {
  const out: EditableField[] = [];
  const push = (key: string, v: Record<string, unknown>) => {
    const rawType = typeof v.type === "string" ? v.type : "text";
    const type: EditableField["type"] =
      rawType === "textarea" || rawType === "color" || rawType === "toggle" || rawType === "select"
        ? rawType
        : "text";
    out.push({
      key,
      label: typeof v.label === "string" ? v.label : key,
      type,
      defaultValue:
        typeof v.default === "string" ? v.default : typeof v.value === "string" ? v.value : undefined,
      defaultBoolean: typeof v.default === "boolean" ? v.default : undefined,
      placeholder: typeof v.placeholder === "string" ? v.placeholder : undefined,
      options: Array.isArray(v.options) ? (v.options as string[]) : undefined,
      maxLength: typeof v.maxLength === "number" ? v.maxLength : undefined,
    });
  };
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (item && typeof item === "object" && typeof (item as Record<string, unknown>).key === "string") {
        push((item as Record<string, unknown>).key as string, item as Record<string, unknown>);
      }
    }
  } else if (raw && typeof raw === "object") {
    for (const [key, v] of Object.entries(raw as Record<string, unknown>)) {
      if (v && typeof v === "object") push(key, v as Record<string, unknown>);
      else push(key, { default: v });
    }
  }
  return out;
}

/**
 * Format the 402 insufficient-credits payload ({ cost, balance }) from
 * the render / creations routes. The monthly allowance isn't in that
 * payload, so it's read from the credits route's public config; if that
 * lookup fails the rest of the message still renders.
 */
async function insufficientCreditsMessage(j: Record<string, unknown>): Promise<string> {
  const cost = typeof j.cost === "number" ? j.cost : "?";
  const balance = typeof j.balance === "number" ? j.balance : "?";
  let allowance: number | string = "?";
  try {
    const r = await fetch("/api/affiliate/studio/credits", { cache: "no-store" });
    if (r.ok) {
      const cj = (await r.json().catch(() => ({}))) as {
        config?: { monthlyAllowance?: unknown };
      };
      if (typeof cj.config?.monthlyAllowance === "number") allowance = cj.config.monthlyAllowance;
    }
  } catch { /* keep the "?" placeholder — the cost/balance facts still show */ }
  return `Not enough Studio credits — this download costs ${cost} credit(s); your balance is ${balance}. You receive ${allowance} credits monthly with your membership.`;
}

function defaultsFor(fields: EditableField[]): Record<string, FieldValue> {
  const values: Record<string, FieldValue> = {};
  for (const f of fields) {
    if (f.type === "toggle") values[f.key] = f.defaultBoolean ?? false;
    else if (f.type === "color") values[f.key] = f.defaultValue ?? "#0096FF";
    else values[f.key] = f.defaultValue ?? "";
  }
  return values;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

const card = "rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-4 md:p-5";
const input =
  "w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-cyan-400/60 placeholder:text-slate-500";
const btnPrimary =
  "inline-flex items-center justify-center px-5 py-2.5 rounded-xl font-mono text-sm font-bold text-[#04121f] transition-all disabled:opacity-50";
const btnStyle = { background: "linear-gradient(135deg,#38bdf8,#0096FF)", boxShadow: "0 0 20px rgba(0,150,255,.45)" };
const btnGhost =
  "inline-flex items-center justify-center px-4 py-2.5 rounded-xl font-mono text-sm border border-white/15 text-slate-200 hover:border-cyan-400/60 transition-colors disabled:opacity-50";

export default function QuickEditClient({ slug }: { slug: string }) {
  const [template, setTemplate] = useState<StudioTemplateLite | null>(null);
  const [slides, setSlides] = useState<StudioTemplateLite[]>([]);
  const [activeSlug, setActiveSlug] = useState<string>(slug);
  const [valuesBySlug, setValuesBySlug] = useState<Record<string, Record<string, FieldValue>>>({});
  const [debouncedBySlug, setDebouncedBySlug] = useState<Record<string, Record<string, FieldValue>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [referralLink, setReferralLink] = useState<string | null>(null);
  const [downloadFormat, setDownloadFormat] = useState<"png" | "jpeg" | "webp">("png");
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  /* Load template (+ carousel siblings) and the referral link. */
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/api/affiliate/studio/templates?slug=${encodeURIComponent(slug)}`, { cache: "no-store" });
        const j = await r.json().catch(() => ({}));
        const list: StudioTemplateLite[] = Array.isArray(j.templates) ? j.templates : [];
        const found = list.find((t) => t.slug === slug) ?? list[0] ?? null;
        if (!r.ok || !found) {
          setError(typeof j.error === "string" ? j.error : "That template couldn't be found.");
          setLoading(false);
          return;
        }
        setTemplate(found);

        let groupSlides: StudioTemplateLite[] = [found];
        if (found.carouselGroup) {
          const allRes = await fetch("/api/affiliate/studio/templates", { cache: "no-store" });
          const allJson = await allRes.json().catch(() => ({}));
          const all: StudioTemplateLite[] = Array.isArray(allJson.templates) ? allJson.templates : [];
          const siblings = all
            .filter((t) => t.carouselGroup === found.carouselGroup)
            .sort((a, b) => (a.slideIndex ?? 0) - (b.slideIndex ?? 0));
          if (siblings.length > 0) groupSlides = siblings;
        }
        setSlides(groupSlides);
        setActiveSlug(found.slug);
        const initial: Record<string, Record<string, FieldValue>> = {};
        for (const s of groupSlides) initial[s.slug] = defaultsFor(normalizeFields(s.editableFields));
        setValuesBySlug(initial);
        setDebouncedBySlug(initial);
      } catch {
        setError("Couldn't load that template.");
      }
      setLoading(false);
    })();
    (async () => {
      try {
        const r = await fetch("/api/affiliate/me", { cache: "no-store" });
        if (r.ok) {
          const j = await r.json();
          if (typeof j.referralLink === "string") setReferralLink(j.referralLink);
        }
      } catch { /* personalization panel degrades gracefully */ }
    })();
  }, [slug]);

  /* Debounce preview updates by 500ms. */
  useEffect(() => {
    const t = setTimeout(() => setDebouncedBySlug(valuesBySlug), 500);
    return () => clearTimeout(t);
  }, [valuesBySlug]);

  const active = useMemo(
    () => slides.find((s) => s.slug === activeSlug) ?? template,
    [slides, activeSlug, template],
  );
  const activeIndex = active ? slides.findIndex((s) => s.slug === active.slug) : 0;
  const fields = useMemo(() => (active ? normalizeFields(active.editableFields) : []), [active]);
  const activeValues: Record<string, FieldValue> = active ? valuesBySlug[active.slug] ?? {} : {};
  const debouncedValues: Record<string, FieldValue> = active ? debouncedBySlug[active.slug] ?? {} : {};

  const setValue = (key: string, value: FieldValue) => {
    if (!active) return;
    setValuesBySlug((prev) => ({ ...prev, [active.slug]: { ...(prev[active.slug] ?? {}), [key]: value } }));
  };

  const previewSrc = active
    ? renderUrl(active.slug, debouncedValues, { format: "webp", scale: 0.5, preview: true })
    : "";

  /* Button-driven download: a plain anchor can't surface the credits
   * 402, so fetch the same render URL, handle 402 explicitly, and on
   * success hand the blob to a programmatic anchor (same filename the
   * render route's Content-Disposition used). */
  const downloadActive = async () => {
    if (!active) return;
    setDownloading(true);
    setToast(null);
    try {
      const url = renderUrl(active.slug, activeValues, { format: downloadFormat, scale: 1 });
      const r = await fetch(url);
      if (r.status === 402) {
        const j = (await r.json().catch(() => ({}))) as Record<string, unknown>;
        setToast({ kind: "err", text: await insufficientCreditsMessage(j) });
        return;
      }
      if (!r.ok) {
        setToast({ kind: "err", text: "Download failed. Try again." });
        return;
      }
      const blob = await r.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `worldeye-${active.slug}.${downloadFormat}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch {
      setToast({ kind: "err", text: "Download failed. Try again." });
    } finally {
      setDownloading(false);
    }
  };

  const saveCreation = async (targetSlug: string, values: Record<string, FieldValue>) => {
    const target = slides.find((s) => s.slug === targetSlug);
    const r = await fetch("/api/affiliate/studio/creations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateSlug: targetSlug, title: target?.title, values }),
    });
    const j = await r.json().catch(() => ({}));
    if (r.status === 402) throw new Error(await insufficientCreditsMessage(j as Record<string, unknown>));
    if (!r.ok) throw new Error(typeof j.error === "string" ? j.error : "Save failed.");
    return j;
  };

  const saveActive = async () => {
    if (!active) return;
    setSaving(true);
    setToast(null);
    try {
      await saveCreation(active.slug, valuesBySlug[active.slug] ?? {});
      setToast({ kind: "ok", text: "Saved to My Creations." });
    } catch (e) {
      setToast({ kind: "err", text: e instanceof Error ? e.message : "Couldn't save. Try again." });
    }
    setSaving(false);
  };

  const saveAllSlides = async () => {
    setSaving(true);
    setToast(null);
    try {
      for (const s of slides) {
        await saveCreation(s.slug, valuesBySlug[s.slug] ?? {});
      }
      setToast({ kind: "ok", text: `Saved all ${slides.length} slides to My Creations.` });
    } catch (e) {
      setToast({ kind: "err", text: e instanceof Error ? e.message : "Couldn't save every slide. Try again." });
    }
    setSaving(false);
  };

  if (loading) return <div className="text-slate-400 font-mono text-sm">Loading template…</div>;
  if (error || !active || !template) {
    return (
      <EmptyState
        title="Template not available"
        body={error || "That template couldn't be found."}
        cta={<Link href="/affiliates/studio/library" className={btnPrimary} style={btnStyle}>Back to the library</Link>}
      />
    );
  }

  const isCarousel = slides.length > 1;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-mono tracking-[0.25em] text-cyan-400 uppercase mb-1">
            Marketing Studio · {categoryLabel(active.category)}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">{template.title}</h1>
          <p className="text-sm text-slate-400 mt-1 font-mono">
            {active.width} × {active.height}
            {isCarousel ? ` · Slide ${activeIndex + 1} of ${slides.length}` : ""}
          </p>
        </div>
        <Link href="/affiliates/studio/library" className="text-sm font-mono text-cyan-300 hover:text-cyan-200">
          ← Library
        </Link>
      </div>

      {toast && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            toast.kind === "ok"
              ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
              : "border-red-400/40 bg-red-400/10 text-red-200"
          }`}
          role="status"
        >
          {toast.text}
          {toast.kind === "ok" && (
            <>
              {" "}
              <Link href="/affiliates/studio/creations" className="underline font-bold">View My Creations</Link>
            </>
          )}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        {/* Preview — first on mobile, right column on desktop */}
        <div className="order-1 lg:order-2 lg:sticky lg:top-24 space-y-4">
          <div className={card}>
            {isCarousel && (
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setActiveSlug(slides[Math.max(0, activeIndex - 1)].slug)}
                  disabled={activeIndex === 0}
                  className="px-3 py-1.5 rounded-lg text-sm font-mono border border-white/15 text-slate-200 disabled:opacity-40 hover:border-cyan-400/60"
                  aria-label="Previous slide"
                >
                  ‹
                </button>
                <span className="text-sm font-mono text-slate-300">
                  Slide {activeIndex + 1} / {slides.length}
                </span>
                <button
                  onClick={() => setActiveSlug(slides[Math.min(slides.length - 1, activeIndex + 1)].slug)}
                  disabled={activeIndex === slides.length - 1}
                  className="px-3 py-1.5 rounded-lg text-sm font-mono border border-white/15 text-slate-200 disabled:opacity-40 hover:border-cyan-400/60"
                  aria-label="Next slide"
                >
                  ›
                </button>
              </div>
            )}
            <div
              className="bg-black/40 rounded-xl overflow-hidden flex items-center justify-center"
              style={{ aspectRatio: active.width && active.height ? `${active.width} / ${active.height}` : undefined }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewSrc} alt={active.title} className="w-full h-full object-contain" />
            </div>
            <div className="text-[11px] text-slate-500 mt-3 font-mono">
              Live preview — updates as you type. Downloads render at full resolution.
            </div>
          </div>

          {/* Personalization panel */}
          <div className={card}>
            <SectionTitle kicker="Personalization" title="Your link, baked in" />
            <div className="text-[11px] font-mono tracking-[0.2em] text-slate-400 uppercase mb-1.5">Link embedded in this design</div>
            {referralLink ? (
              <code className="block truncate rounded-lg bg-black/40 border border-white/10 px-3 py-2.5 font-mono text-sm text-cyan-300">
                {referralLink}
              </code>
            ) : (
              <div className="h-10 rounded-lg bg-white/[0.05] animate-pulse" />
            )}
            <p className="text-xs text-slate-500 mt-3 leading-relaxed">
              QR code is generated from your link and verified by decode before every download.
            </p>
          </div>

          {/* Actions */}
          <div className={card}>
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-mono outline-none focus:border-cyan-400/60"
                value={downloadFormat}
                onChange={(e) => setDownloadFormat(e.target.value as "png" | "jpeg" | "webp")}
                aria-label="Download format"
              >
                <option value="png">PNG</option>
                <option value="jpeg">JPEG</option>
                <option value="webp">WebP</option>
              </select>
              <button onClick={downloadActive} disabled={downloading} className={btnPrimary + " flex-1"} style={btnStyle}>
                {downloading ? "Downloading…" : `Download${isCarousel ? ` slide ${activeIndex + 1}` : ""}`}
              </button>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 mt-2">
              <button onClick={saveActive} disabled={saving} className={btnGhost + " flex-1"}>
                {saving ? "Saving…" : "Save to My Creations"}
              </button>
              {isCarousel && (
                <button onClick={saveAllSlides} disabled={saving} className={btnGhost + " flex-1"}>
                  {saving ? "Saving…" : `Save all ${slides.length} slides`}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Form */}
        <div className={`order-2 lg:order-1 ${card}`}>
          <SectionTitle
            kicker="Quick edit"
            title={isCarousel ? `Edit slide ${activeIndex + 1}` : "Edit this template"}
            right={
              isCarousel ? (
                <span className="text-xs font-mono text-slate-500">each slide keeps its own edits</span>
              ) : undefined
            }
          />
          {fields.length === 0 ? (
            <p className="text-sm text-slate-400 leading-relaxed">
              This template has no editable text fields — it renders fully personalized with your referral link
              and QR code. Use Download or Save to My Creations on the preview side.
            </p>
          ) : (
            <div className="space-y-4">
              {fields.map((f) => {
                const value = activeValues[f.key];
                return (
                  <div key={f.key}>
                    <label htmlFor={`field-${f.key}`} className="block text-[11px] font-mono tracking-[0.18em] text-slate-400 uppercase mb-1.5">
                      {f.label}
                    </label>
                    {f.type === "textarea" ? (
                      <textarea
                        id={`field-${f.key}`}
                        className={input + " min-h-24 resize-y"}
                        value={typeof value === "string" ? value : ""}
                        placeholder={f.placeholder}
                        maxLength={f.maxLength}
                        onChange={(e) => setValue(f.key, e.target.value)}
                      />
                    ) : f.type === "color" ? (
                      <div className="flex gap-2 items-center">
                        <input
                          id={`field-${f.key}`}
                          type="color"
                          className="w-12 h-10 rounded-lg bg-white/5 border border-white/10 cursor-pointer shrink-0"
                          value={typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#0096FF"}
                          onChange={(e) => setValue(f.key, e.target.value)}
                        />
                        <input
                          className={input + " font-mono"}
                          value={typeof value === "string" ? value : ""}
                          placeholder="#0096FF"
                          onChange={(e) => setValue(f.key, e.target.value)}
                          aria-label={`${f.label} hex value`}
                        />
                      </div>
                    ) : f.type === "toggle" ? (
                      <button
                        id={`field-${f.key}`}
                        type="button"
                        role="switch"
                        aria-checked={value === true}
                        onClick={() => setValue(f.key, value !== true)}
                        className={`relative w-12 h-7 rounded-full border transition-colors ${
                          value === true ? "bg-cyan-500/80 border-cyan-300/60" : "bg-white/10 border-white/20"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 w-[22px] h-[22px] rounded-full bg-white transition-all ${
                            value === true ? "left-[24px]" : "left-0.5"
                          }`}
                        />
                      </button>
                    ) : f.type === "select" && f.options && f.options.length > 0 ? (
                      <select
                        id={`field-${f.key}`}
                        className={input}
                        value={typeof value === "string" ? value : ""}
                        onChange={(e) => setValue(f.key, e.target.value)}
                      >
                        {f.options.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        id={`field-${f.key}`}
                        className={input}
                        value={typeof value === "string" ? value : ""}
                        placeholder={f.placeholder}
                        maxLength={f.maxLength}
                        onChange={(e) => setValue(f.key, e.target.value)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <p className="text-[11px] text-slate-500 mt-5 leading-relaxed">
            Only use claims you can back up: 36,000+ live cameras, a free globe with no signup, and Pro features
            as shown on worldeye.app. Always disclose your affiliate link with #ad wherever you post.
          </p>
        </div>
      </div>
    </div>
  );
}

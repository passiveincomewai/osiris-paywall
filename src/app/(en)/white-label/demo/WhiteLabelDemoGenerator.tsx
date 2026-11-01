"use client";

// The White Label demo generator form: organisation name, an optional
// logo upload, and a location picked from real search results (places
// with redistribution-cleared cameras — the API only offers those).
// Generating creates the preview server-side and navigates to its
// shareable page. Every failure state is the server's own message —
// nothing here pretends a preview exists before the server confirms it.
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, ImagePlus, MapPin, Search, X } from "lucide-react";
import {
  WHITE_LABEL_PREVIEW_ORG_MAX as PREVIEW_ORG_NAME_MAX,
  WHITE_LABEL_PREVIEW_ORG_MIN as PREVIEW_ORG_NAME_MIN,
} from "@/lib/white-label";

interface LocationResult {
  id: string;
  kind: "city" | "resort";
  label: string;
  detail: string;
  cameraCount: number;
}

type LogoState =
  | { phase: "none" }
  | { phase: "uploading" }
  | { phase: "done"; url: string }
  | { phase: "error"; message: string };

const inputCls =
  "w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[15px] text-white placeholder:text-white/30 outline-none focus:border-[#D4AF37]/50 focus:bg-white/[0.05] transition";
const labelCls = "block text-sm font-medium text-white/70 mb-1.5";

export default function WhiteLabelDemoGenerator() {
  const router = useRouter();
  const [orgName, setOrgName] = useState("");
  const [logo, setLogo] = useState<LogoState>({ phase: "none" });
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LocationResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState<LocationResult | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const searchSeq = useRef(0);

  useEffect(() => {
    if (selected || query.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    const seq = ++searchSeq.current;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/white-label-demo/locations?q=${encodeURIComponent(query.trim())}`,
        );
        const j = await res.json().catch(() => ({}));
        if (searchSeq.current !== seq) return;
        if (!res.ok) throw new Error(j.error ?? "Location search failed.");
        setResults(Array.isArray(j.results) ? j.results : []);
      } catch {
        if (searchSeq.current === seq) setResults([]);
      } finally {
        if (searchSeq.current === seq) {
          setSearching(false);
          setSearched(true);
        }
      }
    }, 350);
    return () => clearTimeout(t);
  }, [query, selected]);

  async function onLogoFile(file: File) {
    setLogo({ phase: "uploading" });
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/white-label-demo/logo", { method: "POST", body: fd });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.url) {
        throw new Error(j.error ?? "That upload didn't work — you can continue without a logo.");
      }
      setLogo({ phase: "done", url: j.url });
    } catch (err) {
      setLogo({
        phase: "error",
        message:
          err instanceof Error && err.message
            ? err.message
            : "That upload didn't work — you can continue without a logo.",
      });
    }
  }

  const orgOk =
    orgName.trim().length >= PREVIEW_ORG_NAME_MIN &&
    orgName.trim().length <= PREVIEW_ORG_NAME_MAX;
  const canGenerate = orgOk && !!selected && !creating && logo.phase !== "uploading";

  async function generate() {
    if (!canGenerate || !selected) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/white-label-demo/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgName: orgName.trim(),
          logoUrl: logo.phase === "done" ? logo.url : "",
          locationId: selected.id,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.url) throw new Error(j.error ?? "Could not create the preview.");
      router.push(j.url);
    } catch (err) {
      setCreating(false);
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Could not create the preview just now — try again.",
      );
    }
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 md:p-8 text-left">
      <div>
        <label htmlFor="wld-org" className={labelCls}>
          <span className="inline-flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#D4AF37]" /> Your organisation&apos;s name
          </span>
        </label>
        <input
          id="wld-org"
          type="text"
          autoComplete="organization"
          maxLength={PREVIEW_ORG_NAME_MAX}
          value={orgName}
          onChange={(e) => setOrgName(e.target.value)}
          placeholder="Example Resorts Group"
          className={inputCls}
        />
      </div>

      <div className="mt-6">
        <span className={labelCls}>
          <span className="inline-flex items-center gap-2">
            <ImagePlus className="w-4 h-4 text-[#D4AF37]" /> Logo{" "}
            <span className="text-white/35 font-normal">(optional — PNG, JPEG, WebP or GIF, up to 2 MB)</span>
          </span>
        </span>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onLogoFile(f);
            e.target.value = "";
          }}
        />
        {logo.phase === "done" ? (
          <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logo.url}
              alt="Your uploaded logo"
              className="h-10 max-w-[160px] object-contain bg-white/90 rounded-md px-2 py-1"
            />
            <span className="text-sm text-white/60">Logo ready — it will sit in your preview&apos;s header.</span>
            <button
              type="button"
              onClick={() => setLogo({ phase: "none" })}
              className="ml-auto inline-flex items-center gap-1 text-sm text-white/50 hover:text-white transition"
            >
              <X className="w-4 h-4" /> Remove
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={logo.phase === "uploading"}
            className="w-full rounded-xl border border-dashed border-white/15 px-4 py-4 text-sm text-white/60 hover:text-white hover:border-[#D4AF37]/40 transition disabled:opacity-60"
          >
            {logo.phase === "uploading" ? "Uploading…" : "Upload a logo — or skip and your name becomes a text wordmark"}
          </button>
        )}
        {logo.phase === "error" && (
          <p role="alert" className="mt-2 text-sm text-red-300">
            {logo.message}
          </p>
        )}
        <p className="text-xs text-white/35 mt-2">
          Your logo is only ever shown inside your own preview — uploading it implies no
          partnership or endorsement, on either side.
        </p>
      </div>

      <div className="mt-6 relative">
        <label htmlFor="wld-location" className={labelCls}>
          <span className="inline-flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#D4AF37]" /> Location for your cameras
          </span>
        </label>
        {selected ? (
          <div className="flex items-center gap-3 rounded-xl border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-4 py-3">
            <MapPin className="w-4 h-4 text-[#D4AF37] shrink-0" />
            <span className="text-[15px] text-white">
              {selected.label}
              <span className="text-white/50"> — {selected.detail}</span>
            </span>
            <span className="text-xs text-white/45 shrink-0">
              {selected.cameraCount} cleared camera{selected.cameraCount === 1 ? "" : "s"} nearby
            </span>
            <button
              type="button"
              onClick={() => {
                setSelected(null);
                setQuery("");
              }}
              className="ml-auto inline-flex items-center gap-1 text-sm text-white/60 hover:text-white transition shrink-0"
            >
              <X className="w-4 h-4" /> Change
            </button>
          </div>
        ) : (
          <>
            <div className="relative">
              <Search className="w-4 h-4 text-white/30 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                id="wld-location"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search a town, city or ski area — e.g. Park City"
                className={`${inputCls} pl-11`}
              />
            </div>
            {searching && <p className="text-xs text-white/35 mt-2">Searching places with cleared cameras…</p>}
            {results.length > 0 && (
              <ul className="mt-2 rounded-xl border border-white/10 bg-[#0b0e18] overflow-hidden">
                {results.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(r)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.04] transition"
                    >
                      <MapPin className="w-4 h-4 text-[#D4AF37] shrink-0" />
                      <span className="text-[15px] text-white">
                        {r.label}
                        <span className="text-white/50"> — {r.detail}</span>
                      </span>
                      <span className="ml-auto text-xs text-white/40 shrink-0">
                        {r.kind === "resort" ? "Ski area · " : ""}
                        {r.cameraCount} cleared camera{r.cameraCount === 1 ? "" : "s"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {searched && !searching && results.length === 0 && query.trim().length >= 2 && (
              <p className="text-sm text-white/45 mt-2">
                No redistribution-cleared cameras near that search yet. Try a nearby town, a
                larger city, or a ski area — the preview can only show cameras whose source
                terms clear them for redistribution.
              </p>
            )}
          </>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-5 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={generate}
        disabled={!canGenerate}
        className="mt-7 w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black font-bold text-[15px] tracking-wide hover:brightness-110 active:scale-[0.99] transition shadow-[0_8px_32px_rgba(212,175,55,0.35)] disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
      >
        {creating ? "Building your preview…" : "Generate my preview"} <ArrowRight className="w-4 h-4" />
      </button>
      <p className="text-xs text-white/35 mt-4">
        Free, no account, no obligation. The preview is an illustrative concept of the
        White Label pilot — not a live product, and nothing is published under your name.
      </p>
    </div>
  );
}

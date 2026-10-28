"use client";

/**
 * Photo Geolocation (Beta) — the interactive tool.
 *
 * Upload a photo, POST it to /api/tools/photo-geolocation, render the
 * evidence. The preview below is a local object URL (the file never
 * leaves the browser until the visitor presses Analyse, and the
 * server keeps no copy — see the privacy copy on the page).
 *
 * Results are shown exactly as the API returns them: candidates with
 * confidence tiers, uncertainty radii and the evidence for/against,
 * an honest "couldn't determine" panel when there is nothing solid,
 * the clues that were established either way, nearby live cameras from
 * the real catalogue, and the EXPLORE IN 3D handoff (/?geo= deep link)
 * for point results.
 *
 * Detail layer: a step-by-step evidence trail (file check → EXIF →
 * clue pass → per-clue OpenStreetMap lookup outcomes → ranking →
 * privacy clamp), a per-candidate ranking rationale and radius
 * explanation (both computed by the pipeline, not written here), and
 * a file panel showing the uploader their own photo's format,
 * dimensions and metadata. On completion the tool fires ONE analytics
 * event with a coarse outcome token (exif / vision / none) — no photo
 * data and no coordinates ever enter analytics.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  Camera,
  CheckCircle2,
  ChevronDown,
  Crosshair,
  FileSearch,
  Globe2,
  HelpCircle,
  ImagePlus,
  ListOrdered,
  Loader2,
  MapPin,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import type { AnalysisResult, ClueLookup } from "@/lib/geolocation/analyze";
import type { PublicCandidate } from "@/lib/geolocation/candidates";
import { geolocationOutcomeDetail } from "@/lib/geolocation/outcome";
import { trackAnalyticsEvent } from "@/components/AnalyticsTracker";
import { buildGeoUrl } from "@/lib/share/links";
import {
  bboxAround,
  nearestCameras,
  radiusToPixels,
  tileGrid,
  zoomForRadius,
  type NearbyCamera,
} from "@/lib/geolocation/map-preview";

type ApiResult = AnalysisResult & { quota?: { remaining: number; limit: number } };

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

function fmtRadius(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`;
  if (m < 10_000) return `${(m / 1000).toFixed(1)} km`;
  return `${Math.round(m / 1000)} km`;
}

const KIND_LABEL: Record<PublicCandidate["kind"], string> = {
  exif: "Photo metadata (EXIF GPS)",
  landmark: "Named-landmark match",
  place: "Place-name match",
};

const CONFIDENCE_STYLE: Record<PublicCandidate["confidence"], string> = {
  high: "border-emerald-400/40 text-emerald-300",
  medium: "border-amber-400/40 text-amber-300",
  low: "border-white/20 text-white/50",
};

const CONFIDENCE_EXPLAINER: Record<PublicCandidate["confidence"], string> = {
  high: "High confidence: the evidence score sits in the top band — GPS from the file itself, or a clue match for a prominent place, reinforced where possible by an independent clue.",
  medium: "Medium confidence: a real match with moderate support. Read the evidence against it before relying on it.",
  low: "Low confidence: a possible match with thin support — a lead to check, not an answer.",
};

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

const LOOKUP_STATUS: Record<ClueLookup["status"], { label: string; style: string }> = {
  matched: { label: "Matched in OpenStreetMap", style: "border-emerald-400/40 text-emerald-300" },
  no_match: { label: "No match in OpenStreetMap", style: "border-white/20 text-white/50" },
  lookup_failed: { label: "Lookup could not be completed", style: "border-amber-400/40 text-amber-300" },
  not_queried: { label: "Recorded, not looked up", style: "border-white/20 text-white/40" },
  too_broad: { label: "Matched only a whole region — too broad to use", style: "border-amber-400/40 text-amber-300" },
};

/* ── Static Esri-tile map preview with the uncertainty circle ────── */
function GeoMapPreview({ lat, lng, radiusM }: { lat: number; lng: number; radiusM: number }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 640, h: 360 });
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const update = () => setSize({ w: el.clientWidth || 640, h: el.clientHeight || 360 });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  const zoom = zoomForRadius(radiusM, lat, Math.min(size.w, size.h));
  const grid = tileGrid(lat, lng, zoom, size.w, size.h);
  const diameter = Math.max(24, radiusToPixels(radiusM, lat, zoom));
  return (
    <div ref={boxRef} className="relative h-[320px] w-full overflow-hidden rounded-2xl border border-white/10 bg-black">
      {grid.tiles.map((t) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={`${t.x}-${t.y}`}
          src={t.url}
          alt=""
          width={256}
          height={256}
          className="absolute select-none"
          style={{ left: t.left, top: t.top }}
          loading="lazy"
          draggable={false}
        />
      ))}
      <div
        className="pointer-events-none absolute rounded-full border-2 border-[#D4AF37] bg-[#D4AF37]/10"
        style={{
          width: diameter,
          height: diameter,
          left: grid.centerPx.x - diameter / 2,
          top: grid.centerPx.y - diameter / 2,
        }}
      />
      <div
        className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#D4AF37] ring-2 ring-black/60"
        style={{ left: grid.centerPx.x, top: grid.centerPx.y }}
      />
      <p className="absolute bottom-2 right-3 rounded bg-black/55 px-2 py-0.5 text-[10px] text-white/60">
        Imagery © Esri · Places © OpenStreetMap contributors
      </p>
    </div>
  );
}

/* ── The evidence trail: what the pipeline actually did ─────────── */
function countClues(clues: NonNullable<AnalysisResult["clues"]>): number {
  return (
    clues.visibleText.length +
    clues.landmarks.length +
    clues.placeNames.length +
    clues.languages.length +
    (clues.plateStyle ? 1 : 0) +
    (clues.drivingSide ? 1 : 0) +
    (clues.vegetationClimate ? 1 : 0) +
    (clues.architecture ? 1 : 0) +
    (clues.roadMarkings ? 1 : 0)
  );
}

function EvidenceTrail({ result }: { result: ApiResult }) {
  const steps: ReactNode[] = [];

  steps.push(
    <>
      <strong className="text-white/85">The file.</strong> Analysed a{" "}
      {result.image.format.toUpperCase()} photo
      {result.image.width && result.image.height
        ? `, ${result.image.width.toLocaleString()} × ${result.image.height.toLocaleString()} px`
        : ""}{" "}
      ({fmtBytes(result.image.sizeBytes)}). It was processed in memory and discarded — nothing was
      stored.
    </>,
  );

  if (result.exif?.hasGps) {
    steps.push(
      <>
        <strong className="text-white/85">Metadata (EXIF).</strong> GPS coordinates are embedded in
        this file. That is the strongest evidence this tool has, so the metadata candidate is ranked
        by it first — and it is still labelled as metadata, because a file&apos;s GPS can be edited
        or copied from another photo.
      </>,
    );
  } else if (result.exif) {
    const bits = [
      result.exif.make || result.exif.model ? "camera" : null,
      result.exif.dateTimeOriginal ? "capture time" : null,
    ].filter(Boolean);
    steps.push(
      <>
        <strong className="text-white/85">Metadata (EXIF).</strong> The file carries metadata
        {bits.length ? ` (${bits.join(", ")})` : ""} but no GPS coordinates, so the result rests on
        the scene itself.
      </>,
    );
  } else {
    steps.push(
      <>
        <strong className="text-white/85">Metadata (EXIF).</strong> No usable EXIF metadata could
        be read from this file — common for screenshots and for copies sent through messaging or
        social apps, which strip it.
      </>,
    );
  }

  if (result.clues) {
    const n = countClues(result.clues);
    steps.push(
      <>
        <strong className="text-white/85">Visual clue pass.</strong> The scene pass recorded{" "}
        {n === 0 ? "no usable clues" : `${n} clue${n === 1 ? "" : "s"}`} (the full set is listed
        below). The model returns clues only — it is never asked for, and cannot supply, a location.
      </>,
    );
  } else {
    steps.push(
      <>
        <strong className="text-white/85">Visual clue pass.</strong> The visual pass did not run for
        this analysis, so this result rests on the file&apos;s metadata alone.
      </>,
    );
  }

  steps.push(
    <>
      <strong className="text-white/85">Map matching.</strong>{" "}
      {result.lookups.length === 0 ? (
        <>No named landmark or place name was available to look up in OpenStreetMap.</>
      ) : (
        <>
          Named clues were looked up in OpenStreetMap, in this order:
          <ul className="mt-2 space-y-2">
            {result.lookups.map((l, i) => {
              const st = LOOKUP_STATUS[l.status];
              return (
                <li key={`${l.clue}-${i}`} className="flex flex-wrap items-center gap-2">
                  <span className="text-white/80">“{l.clue}”</span>
                  <span className="text-white/40">{l.kind === "landmark" ? "landmark clue" : "place-name clue"}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${st.style}`}>
                    {st.label}
                  </span>
                  {l.status === "matched" && l.matches.length > 0 && (
                    <span className="w-full pl-1 text-white/50">→ {l.matches.join(" · ")}</span>
                  )}
                  {l.status === "not_queried" && (
                    <span className="w-full pl-1 text-white/50">
                      The trail caps map lookups at 6 named clues per photo, so this one was recorded
                      but not queried.
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </>,
  );

  steps.push(
    <>
      <strong className="text-white/85">Ranking.</strong> Candidates are ordered by a deterministic
      evidence score: GPS from the file outranks a named-landmark match, which outranks a place-name
      match, and a second, independent clue pointing at the same area raises a score. Matches
      broader than a whole region were discarded as too broad to call a location.{" "}
      {result.status === "located"
        ? `${result.candidates.length} candidate${result.candidates.length === 1 ? "" : "s"} made the list below.`
        : "No candidate had enough evidence to list."}
    </>,
  );

  const residential = result.candidates.some((c) => c.precision === "area");
  steps.push(
    <>
      <strong className="text-white/85">Privacy clamp — applied last.</strong> No displayed radius
      is ever tighter than 250 m, whatever the underlying evidence says.
      {residential &&
        " This scene looks like a private residence or private property, so its point was suppressed entirely and only a general area is shown."}
    </>,
  );

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <h3 className="flex items-center gap-2 font-semibold">
        <FileSearch className="h-4 w-4 text-[#D4AF37]" /> Evidence trail — how this result was reached
      </h3>
      <ol className="mt-3 space-y-3">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-3 text-sm leading-relaxed text-white/65">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/15 text-xs font-bold text-[#D4AF37]">
              {i + 1}
            </span>
            <div className="min-w-0 pt-0.5">{s}</div>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ── One candidate card ──────────────────────────────────────────── */
function CandidateCard({
  candidate,
  rank,
  isTop,
  onExplore,
}: {
  candidate: PublicCandidate;
  rank: number;
  isTop: boolean;
  onExplore: (c: PublicCandidate) => void;
}) {
  const [open, setOpen] = useState(isTop);
  return (
    <div className={`rounded-2xl border p-5 ${isTop ? "border-[#D4AF37]/40 bg-[#D4AF37]/[0.04]" : "border-white/10 bg-white/[0.02]"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-lg font-semibold">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/15 text-xs font-bold text-[#D4AF37]">
              {rank}
            </span>
            <MapPin className="h-5 w-5 text-[#D4AF37]" /> {candidate.label}
          </p>
          <p className="mt-1 text-sm text-white/50">{KIND_LABEL[candidate.kind]}</p>
          <p className="mt-0.5 text-sm text-white/45">
            {candidate.kind === "exif" ? (
              <>Source: the GPS coordinates embedded in the photo file itself.</>
            ) : (
              <>
                Source clue: <span className="text-white/75">“{candidate.origin}”</span> — looked up
                in OpenStreetMap, which holds this matching place.
              </>
            )}
          </p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${CONFIDENCE_STYLE[candidate.confidence]}`}>
          {candidate.confidence} confidence
        </span>
      </div>

      {candidate.precision === "point" ? (
        <p className="mt-3 text-sm text-white/70">
          Within about <strong className="text-white">{fmtRadius(candidate.radiusM)}</strong> of the marked point
          {candidate.lat !== null && candidate.lng !== null && (
            <span className="text-white/40"> · {candidate.lat.toFixed(4)}, {candidate.lng.toFixed(4)}</span>
          )}
        </p>
      ) : (
        <p className="mt-3 flex items-start gap-2 text-sm text-white/70">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#D4AF37]" />
          Shown as a general area only (about {fmtRadius(candidate.radiusM)} across). This photo looks like a
          private residence or private property, so no exact point is displayed.
        </p>
      )}
      <p className="mt-2 text-xs leading-relaxed text-white/45">
        <span className="font-semibold text-white/60">Why this radius: </span>
        {candidate.radiusReason}
      </p>

      <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3.5 text-sm">
        <p className="flex items-center gap-1.5 font-semibold text-white/85">
          <ListOrdered className="h-4 w-4 text-[#D4AF37]" /> Why it ranks here
        </p>
        <p className="mt-1 leading-relaxed text-white/65">{candidate.rankReason}</p>
        <p className="mt-1.5 text-xs leading-relaxed text-white/40">
          {CONFIDENCE_EXPLAINER[candidate.confidence]}
        </p>
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#D4AF37] hover:underline"
        aria-expanded={open}
      >
        Full evidence — for and against <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="mt-2 grid gap-3 text-sm md:grid-cols-2">
          <div>
            <p className="font-semibold text-emerald-300">For</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-white/65">
              {candidate.evidenceFor.map((e) => <li key={e}>{e}</li>)}
            </ul>
          </div>
          <div>
            <p className="font-semibold text-amber-300">Against / limits</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-white/65">
              {candidate.evidenceAgainst.map((e) => <li key={e}>{e}</li>)}
            </ul>
          </div>
        </div>
      )}

      {candidate.precision === "point" && (
        <button
          type="button"
          onClick={() => onExplore(candidate)}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] px-4 py-2 text-sm font-bold text-black transition hover:brightness-110"
        >
          <Globe2 className="h-4 w-4" /> Explore location in 3D
        </button>
      )}
    </div>
  );
}

/* ── The tool ────────────────────────────────────────────────────── */
export default function PhotoGeolocationTool() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiResult | null>(null);
  const [nearby, setNearby] = useState<NearbyCamera[] | null>(null);
  const [nearbyState, setNearbyState] = useState<"idle" | "loading" | "done" | "failed">("idle");
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = useCallback((f: File | null) => {
    setError(null);
    setResult(null);
    setNearby(null);
    setNearbyState("idle");
    if (!f) return;
    if (!ACCEPTED.includes(f.type) && !/\.(jpe?g|png|webp)$/i.test(f.name)) {
      setFile(null);
      setError("That file is not a JPEG, PNG or WebP image.");
      return;
    }
    if (f.size > MAX_BYTES) {
      setFile(null);
      setError("That photo is larger than 10 MB — please use a smaller copy.");
      return;
    }
    setFile(f);
  }, []);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const top = result?.candidates[0] ?? null;

  /* Nearby live cameras for a point result — the real catalogue. */
  useEffect(() => {
    if (!top || top.precision !== "point" || top.lat === null || top.lng === null) return;
    let cancelled = false;
    setNearbyState("loading");
    const bb = bboxAround(top.lat, top.lng, 25);
    fetch(`/api/cctv?bbox=${bb.west},${bb.south},${bb.east},${bb.north}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("catalogue"))))
      .then((data: { cameras?: Array<Record<string, unknown>> }) => {
        if (cancelled) return;
        setNearby(nearestCameras(data.cameras ?? [], top.lat!, top.lng!, 6, 25));
        setNearbyState("done");
      })
      .catch(() => {
        if (!cancelled) setNearbyState("failed");
      });
    return () => {
      cancelled = true;
    };
  }, [top]);

  const analyse = async () => {
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const form = new FormData();
      form.append("photo", file);
      const res = await fetch("/api/tools/photo-geolocation", { method: "POST", body: form });
      const data = (await res.json().catch(() => null)) as (ApiResult & { error?: string }) | null;
      if (!res.ok || !data || data.error) {
        setError(data?.error ?? "The analysis failed. Nothing was stored — please try again.");
      } else {
        setResult(data);
        /* Usage measurement: one event per completed analysis, with a
           coarse outcome token only (exif / vision / none) — no photo
           data and no coordinates are ever attached. */
        trackAnalyticsEvent("tool_geolocation_completed", geolocationOutcomeDetail(data));
      }
    } catch {
      setError("The analysis could not be reached. Nothing was stored — please try again.");
    } finally {
      setBusy(false);
    }
  };

  const explore = (c: PublicCandidate) => {
    if (c.lat === null || c.lng === null) return;
    const url = buildGeoUrl({ lat: c.lat, lng: c.lng, radiusM: c.radiusM });
    if (url) window.location.href = url;
  };

  const clues = result?.clues ?? null;

  return (
    <div className="mx-auto mt-10 max-w-3xl">
      {/* Upload */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          pick(e.dataTransfer.files?.[0] ?? null);
        }}
        className={`rounded-2xl border-2 border-dashed p-6 text-center transition ${
          dragging ? "border-[#D4AF37] bg-[#D4AF37]/5" : "border-white/15 bg-white/[0.02]"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => pick(e.target.files?.[0] ?? null)}
        />
        {preview ? (
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Your selected photo" className="mx-auto max-h-72 rounded-xl object-contain" />
            <p className="mt-3 text-sm text-white/50">
              {file?.name} · {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : ""}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={analyse}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] px-5 py-2.5 text-sm font-bold text-black transition hover:brightness-110 disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
                {busy ? "Analysing…" : "Analyse photo"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  if (inputRef.current) inputRef.current.value = "";
                }}
                disabled={busy}
                className="rounded-xl border border-white/15 px-5 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/5 disabled:opacity-60"
              >
                Choose a different photo
              </button>
            </div>
            {busy && (
              <p className="mt-3 text-xs text-white/40">
                Reading metadata, extracting clues and matching places — this can take up to a minute.
              </p>
            )}
          </div>
        ) : (
          <button type="button" onClick={() => inputRef.current?.click()} className="block w-full cursor-pointer">
            <ImagePlus className="mx-auto h-10 w-10 text-[#D4AF37]" />
            <p className="mt-3 font-semibold">Drop a photo here, or tap to choose one</p>
            <p className="mt-1 text-sm text-white/45">JPEG, PNG or WebP · up to 10 MB · free, no signup</p>
          </button>
        )}
      </div>

      {error && (
        <p className="mt-4 flex items-start gap-2 rounded-xl border border-red-400/30 bg-red-400/5 p-4 text-sm text-red-200">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </p>
      )}
      {result?.quota && (
        <p className="mt-3 text-center text-xs text-white/35">
          {result.quota.remaining} of {result.quota.limit} free analyses left today.
        </p>
      )}

      {/* Result */}
      {result && (
        <div className="mt-8 space-y-5">
          {result.degradedReasons.map((r) => (
            <p key={r} className="rounded-xl border border-amber-400/25 bg-amber-400/5 p-4 text-sm text-amber-100/80">
              {r}
            </p>
          ))}

          {result.status === "located" ? (
            <>
              <h2 className="flex items-center gap-2 text-xl font-bold">
                <CheckCircle2 className="h-5 w-5 text-emerald-300" /> Best matches
              </h2>
              {top && top.precision === "point" && top.lat !== null && top.lng !== null && (
                <GeoMapPreview lat={top.lat} lng={top.lng} radiusM={top.radiusM} />
              )}
              {result.candidates.map((c, i) => (
                <CandidateCard key={c.id} candidate={c} rank={i + 1} isTop={i === 0} onExplore={explore} />
              ))}
            </>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <h2 className="flex items-center gap-2 text-xl font-bold">
                <HelpCircle className="h-5 w-5 text-[#D4AF37]" /> We couldn&apos;t determine where this photo was taken
              </h2>
              <p className="mt-2 text-sm text-white/60">
                That is an honest result, not an error — the evidence in this photo is not strong enough to
                place, and we would rather say so than guess. What we could establish is below.
              </p>
              {result.notes.length > 0 && (
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-white/65">
                  {result.notes.map((n) => <li key={n}>{n}</li>)}
                </ul>
              )}
              <p className="mt-3 text-sm text-white/50">
                What helps: the original file from the camera or phone (copies and screenshots usually lose
                GPS), a wider shot, or any visible sign, landmark or street name.
              </p>
            </div>
          )}

          {result.status === "located" && result.notes.length > 0 && (
            <ul className="list-disc space-y-1 pl-5 text-sm text-white/55">
              {result.notes.map((n) => <li key={n}>{n}</li>)}
            </ul>
          )}

          {/* Evidence trail */}
          <EvidenceTrail result={result} />

          {/* The file itself: format, dimensions and metadata, shown
              back to the uploader from their own photo. */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-sm">
            <h3 className="flex items-center gap-2 font-semibold">
              <Camera className="h-4 w-4 text-[#D4AF37]" /> Your photo file — what it contained
            </h3>
            <dl className="mt-3 grid gap-x-6 gap-y-2 text-white/65 sm:grid-cols-2">
              <div>
                <dt className="inline font-semibold text-white/85">Format: </dt>
                <dd className="inline">
                  {result.image.format.toUpperCase()} · {fmtBytes(result.image.sizeBytes)}
                </dd>
              </div>
              <div>
                <dt className="inline font-semibold text-white/85">Dimensions: </dt>
                <dd className="inline">
                  {result.image.width && result.image.height
                    ? `${result.image.width.toLocaleString()} × ${result.image.height.toLocaleString()} px`
                    : "could not be read from this file's header"}
                </dd>
              </div>
              <div>
                <dt className="inline font-semibold text-white/85">GPS in file: </dt>
                <dd className="inline">
                  {result.exif?.hasGps
                    ? "yes — embedded coordinates decided the metadata candidate"
                    : "no coordinates embedded"}
                </dd>
              </div>
              {result.exif?.altitudeM !== null && result.exif?.altitudeM !== undefined && (
                <div>
                  <dt className="inline font-semibold text-white/85">GPS altitude: </dt>
                  <dd className="inline">{Math.round(result.exif.altitudeM)} m above sea level</dd>
                </div>
              )}
              {result.exif?.directionDeg !== null && result.exif?.directionDeg !== undefined && (
                <div>
                  <dt className="inline font-semibold text-white/85">Camera direction: </dt>
                  <dd className="inline">{Math.round(result.exif.directionDeg)}° (clockwise from north)</dd>
                </div>
              )}
              <div>
                <dt className="inline font-semibold text-white/85">Camera: </dt>
                <dd className="inline">
                  {result.exif && (result.exif.make || result.exif.model)
                    ? [result.exif.make, result.exif.model].filter(Boolean).join(" ")
                    : "not recorded in the file"}
                </dd>
              </div>
              <div>
                <dt className="inline font-semibold text-white/85">Capture time in file: </dt>
                <dd className="inline">{result.exif?.dateTimeOriginal ?? "not recorded in the file"}</dd>
              </div>
              {!result.exif && (
                <div className="sm:col-span-2">
                  <dt className="inline font-semibold text-white/85">Metadata block: </dt>
                  <dd className="inline">
                    no usable EXIF metadata could be read from this file (the metadata reader covers
                    JPEG files; PNG and WebP photos rarely carry any, and copies passed through other
                    apps usually have it stripped).
                  </dd>
                </div>
              )}
            </dl>
            <p className="mt-3 text-xs text-white/40">
              This is your own file&apos;s data, read during the analysis and shown back to you — the
              file itself was processed in memory and discarded, never stored. Metadata can be edited
              or stripped by other apps, so treat it as a clue, not proof.
            </p>
          </div>

          {/* Clues */}
          {clues && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-sm">
              <h3 className="font-semibold">Clues found in the scene — the full set</h3>
              <dl className="mt-2 space-y-1.5 text-white/65">
                {clues.visibleText.length > 0 && (
                  <div><dt className="inline font-semibold text-white/85">Text read: </dt>
                    <dd className="inline">{clues.visibleText.map((t) => `“${t}”`).join(" · ")}</dd></div>
                )}
                {clues.landmarks.length > 0 && (
                  <div><dt className="inline font-semibold text-white/85">Landmarks: </dt>
                    <dd className="inline">{clues.landmarks.join(" · ")}</dd></div>
                )}
                {clues.placeNames.length > 0 && (
                  <div><dt className="inline font-semibold text-white/85">Place names on signs: </dt>
                    <dd className="inline">{clues.placeNames.join(" · ")}</dd></div>
                )}
                {clues.languages.length > 0 && (
                  <div><dt className="inline font-semibold text-white/85">Languages: </dt>
                    <dd className="inline">{clues.languages.join(" · ")}</dd></div>
                )}
                {clues.plateStyle && (
                  <div><dt className="inline font-semibold text-white/85">Plate style: </dt>
                    <dd className="inline">{clues.plateStyle}</dd></div>
                )}
                {clues.drivingSide && (
                  <div><dt className="inline font-semibold text-white/85">Traffic drives on the: </dt>
                    <dd className="inline">{clues.drivingSide}</dd></div>
                )}
                {clues.vegetationClimate && (
                  <div><dt className="inline font-semibold text-white/85">Vegetation / climate: </dt>
                    <dd className="inline">{clues.vegetationClimate}</dd></div>
                )}
                {clues.architecture && (
                  <div><dt className="inline font-semibold text-white/85">Architecture: </dt>
                    <dd className="inline">{clues.architecture}</dd></div>
                )}
                {clues.roadMarkings && (
                  <div><dt className="inline font-semibold text-white/85">Road markings: </dt>
                    <dd className="inline">{clues.roadMarkings}</dd></div>
                )}
                <div><dt className="inline font-semibold text-white/85">Scene type: </dt>
                  <dd className="inline">
                    {clues.sceneType}
                    {clues.privateResidenceLikely &&
                      " — flagged as likely private property, which is what triggers the area-only display above"}
                  </dd></div>
              </dl>
              {!clues.visibleText.length && !clues.landmarks.length && !clues.placeNames.length && (
                <p className="mt-1 text-white/50">No readable text or named landmark could be found in this scene.</p>
              )}
              <p className="mt-3 border-t border-white/5 pt-3 text-xs leading-relaxed text-white/40">
                How these clues are used: only named landmarks and place names are looked up in
                OpenStreetMap — up to 6 per photo, and the evidence trail above shows each one&apos;s
                outcome. The other clues are recorded context: they never score a match by
                themselves, but the scene type drives the privacy decision. The clue pass returns
                this fixed set and nothing else — if the model tried to include a location of its
                own, it would be discarded before ranking.
              </p>
            </div>
          )}

          {/* Nearby cameras */}
          {top && top.precision === "point" && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <h3 className="font-semibold">Live cameras near the top match</h3>
              {nearbyState === "loading" && (
                <p className="mt-2 flex items-center gap-2 text-sm text-white/50">
                  <Loader2 className="h-4 w-4 animate-spin" /> Checking the camera index…
                </p>
              )}
              {nearbyState === "failed" && (
                <p className="mt-2 text-sm text-white/50">The camera index could not be reached just now.</p>
              )}
              {nearbyState === "done" && nearby && nearby.length === 0 && (
                <p className="mt-2 text-sm text-white/50">
                  No live cameras within 25 km of this spot in the WorldEye index.
                </p>
              )}
              {nearbyState === "done" && nearby && nearby.length > 0 && (
                <ul className="mt-2 divide-y divide-white/5">
                  {nearby.map((cam) => (
                    <li key={cam.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <a href={`/?camera=${encodeURIComponent(cam.id)}`} className="font-medium text-[#D4AF37] hover:underline">
                        {cam.name}
                        <span className="text-white/40">
                          {[cam.city, cam.country].filter(Boolean).length
                            ? ` · ${[cam.city, cam.country].filter(Boolean).join(", ")}`
                            : ""}
                        </span>
                      </a>
                      <span className="shrink-0 text-white/45">{cam.distanceKm} km</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-2 text-xs text-white/35">
                Cameras show the places they cover — a nearby camera does not necessarily show the exact spot
                in your photo.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

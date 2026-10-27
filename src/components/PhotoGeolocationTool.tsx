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
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera,
  CheckCircle2,
  ChevronDown,
  Crosshair,
  Globe2,
  HelpCircle,
  ImagePlus,
  Loader2,
  MapPin,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import type { AnalysisResult } from "@/lib/geolocation/analyze";
import type { PublicCandidate } from "@/lib/geolocation/candidates";
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

/* ── One candidate card ──────────────────────────────────────────── */
function CandidateCard({
  candidate,
  isTop,
  onExplore,
}: {
  candidate: PublicCandidate;
  isTop: boolean;
  onExplore: (c: PublicCandidate) => void;
}) {
  const [open, setOpen] = useState(isTop);
  return (
    <div className={`rounded-2xl border p-5 ${isTop ? "border-[#D4AF37]/40 bg-[#D4AF37]/[0.04]" : "border-white/10 bg-white/[0.02]"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-lg font-semibold">
            <MapPin className="h-5 w-5 text-[#D4AF37]" /> {candidate.label}
          </p>
          <p className="mt-1 text-sm text-white/50">{KIND_LABEL[candidate.kind]}</p>
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

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#D4AF37] hover:underline"
        aria-expanded={open}
      >
        Evidence <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
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
                <CandidateCard key={c.id} candidate={c} isTop={i === 0} onExplore={explore} />
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

          {/* Metadata */}
          {result.exif && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-sm">
              <h3 className="flex items-center gap-2 font-semibold">
                <Camera className="h-4 w-4 text-[#D4AF37]" /> From the photo file itself
              </h3>
              <ul className="mt-2 space-y-1 text-white/65">
                {result.exif.hasGps && <li>GPS coordinates are embedded in this file.</li>}
                {!result.exif.hasGps && <li>No GPS coordinates in this file.</li>}
                {(result.exif.make || result.exif.model) && (
                  <li>Camera: {[result.exif.make, result.exif.model].filter(Boolean).join(" ")}</li>
                )}
                {result.exif.dateTimeOriginal && <li>Capture time in file: {result.exif.dateTimeOriginal}</li>}
              </ul>
              <p className="mt-2 text-xs text-white/40">
                Metadata can be edited or stripped by other apps — treat it as a clue, not proof.
              </p>
            </div>
          )}

          {/* Clues */}
          {clues && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-sm">
              <h3 className="font-semibold">Clues found in the scene</h3>
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
              </dl>
              {!clues.visibleText.length && !clues.landmarks.length && !clues.placeNames.length && (
                <p className="mt-1 text-white/50">No readable text or named landmark could be found in this scene.</p>
              )}
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

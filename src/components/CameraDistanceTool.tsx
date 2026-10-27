"use client";

/**
 * Camera Distance Finder — the interactive tool.
 *
 * Two pickers over the real camera catalogue (searched through
 * /api/tools/camera-distance, which serves the directory dataset) —
 * or one camera plus the visitor's own location, which is read in the
 * browser and never sent anywhere. The maths is lib/camera-distance:
 * great-circle (haversine) distance, initial bearing in plain words,
 * and a "view both on the globe" /?geo= deep link centred between the
 * pair. Distances are straight-line — the UI says so wherever a number
 * appears; nothing here pretends to be a road distance.
 */
import { useRef, useState } from "react";
import {
  ArrowLeftRight,
  Compass,
  Globe2,
  Loader2,
  LocateFixed,
  MapPin,
  Ruler,
  Search,
  X,
} from "lucide-react";
import {
  bearingCompass,
  buildPairGlobeUrl,
  formatDistance,
  haversineKm,
  initialBearingDeg,
  placeLabel,
  sameCamera,
  type CameraPick,
} from "@/lib/camera-distance";
import { buildGeoUrl } from "@/lib/share/links";

type Slot = "a" | "b";

interface PickerState {
  query: string;
  results: CameraPick[];
  searching: boolean;
  searched: boolean;
  open: boolean;
}

const EMPTY_PICKER: PickerState = { query: "", results: [], searching: false, searched: false, open: false };

function Picker({
  label,
  pick,
  state,
  onState,
  onPick,
  onClear,
  onUseMyLocation,
  locating,
}: {
  label: string;
  pick: CameraPick | null;
  state: PickerState;
  onState: (next: PickerState) => void;
  onPick: (pick: CameraPick) => void;
  onClear: () => void;
  onUseMyLocation: () => void;
  locating: boolean;
}) {
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = (value: string) => {
    onState({ ...state, query: value, open: true });
    if (debounce.current) clearTimeout(debounce.current);
    const q = value.trim();
    if (q.length < 2) {
      onState({ query: value, results: [], searching: false, searched: false, open: true });
      return;
    }
    onState({ query: value, results: state.results, searching: true, searched: state.searched, open: true });
    debounce.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/tools/camera-distance?q=${encodeURIComponent(q)}`);
        const body = (await res.json()) as { results?: CameraPick[] };
        onState({ query: value, results: body.results ?? [], searching: false, searched: true, open: true });
      } catch {
        onState({ query: value, results: [], searching: false, searched: true, open: true });
      }
    }, 250);
  };

  if (pick) {
    return (
      <div className="rounded-2xl border border-[#D4AF37]/40 bg-[#D4AF37]/[0.04] p-4">
        <p className="text-[11px] font-semibold tracking-[0.2em] text-[#D4AF37]">{label}</p>
        <div className="mt-2 flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 font-semibold">
              <MapPin className="h-4 w-4 shrink-0 text-[#D4AF37]" />
              {pick.name}
            </p>
            {placeLabel(pick) && <p className="mt-0.5 pl-6 text-sm text-white/50">{placeLabel(pick)}</p>}
            <p className="mt-0.5 pl-6 text-xs text-white/35">
              {pick.lat.toFixed(4)}, {pick.lng.toFixed(4)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClear}
            aria-label={`Clear ${label}`}
            className="rounded-full border border-white/15 p-1.5 text-white/60 transition hover:border-white/40 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <p className="text-[11px] font-semibold tracking-[0.2em] text-white/50">{label}</p>
      <div className="relative mt-2">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
        <input
          type="text"
          value={state.query}
          onChange={(e) => runSearch(e.target.value)}
          onFocus={() => state.results.length > 0 && onState({ ...state, open: true })}
          placeholder="Search a camera or place — e.g. Shibuya, Main Street, Miami Beach"
          className="w-full rounded-xl border border-white/15 bg-black/30 py-2.5 pl-9 pr-9 text-sm text-white placeholder:text-white/30 focus:border-[#D4AF37]/60 focus:outline-none"
        />
        {state.searching && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-white/40" />
        )}
        {state.open && state.query.trim().length >= 2 && (
          <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-xl border border-white/15 bg-[#0b0e14] shadow-2xl">
            {state.results.length > 0 ? (
              <ul className="max-h-72 overflow-y-auto py-1">
                {state.results.map((r) => (
                  <li key={`${r.id ?? "loc"}-${r.lat}-${r.lng}-${r.name}`}>
                    <button
                      type="button"
                      onClick={() => onPick(r)}
                      className="flex w-full items-start gap-2 px-3 py-2 text-left transition hover:bg-white/[0.06]"
                    >
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#D4AF37]/80" />
                      <span>
                        <span className="block text-sm font-medium text-white">{r.name}</span>
                        {placeLabel(r) && <span className="block text-xs text-white/45">{placeLabel(r)}</span>}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : state.searched && !state.searching ? (
              <p className="px-3 py-3 text-sm text-white/50">
                No cameras match &ldquo;{state.query.trim()}&rdquo;. Try a place name, a street, or a
                landmark — every camera in the index is searchable by the name it is listed under.
              </p>
            ) : (
              <p className="px-3 py-3 text-sm text-white/40">Searching the camera index…</p>
            )}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onUseMyLocation}
        disabled={locating}
        className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/15 px-3.5 py-1.5 text-xs font-medium text-white/70 transition hover:border-[#D4AF37]/50 hover:text-white disabled:opacity-50"
      >
        {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LocateFixed className="h-3.5 w-3.5" />}
        Use my location instead
      </button>
    </div>
  );
}

export default function CameraDistanceTool() {
  const [pickA, setPickA] = useState<CameraPick | null>(null);
  const [pickB, setPickB] = useState<CameraPick | null>(null);
  const [stateA, setStateA] = useState<PickerState>(EMPTY_PICKER);
  const [stateB, setStateB] = useState<PickerState>(EMPTY_PICKER);
  const [locating, setLocating] = useState<Slot | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  const useMyLocation = (slot: Slot) => {
    setLocationError(null);
    if (!("geolocation" in navigator)) {
      setLocationError("This browser does not offer location, so a camera-to-you distance needs two camera picks instead.");
      return;
    }
    setLocating(slot);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(null);
        const pick: CameraPick = {
          id: null,
          name: "Your location",
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        if (slot === "a") setPickA(pick);
        else setPickB(pick);
      },
      () => {
        setLocating(null);
        setLocationError(
          "Location was not shared, so nothing was measured. Your position is only ever read here in your browser — it is never sent to WorldEye.",
        );
      },
      { timeout: 10_000 },
    );
  };

  const swap = () => {
    setPickA(pickB);
    setPickB(pickA);
    setStateA(stateB);
    setStateB(stateA);
  };

  const both = pickA && pickB ? { a: pickA, b: pickB } : null;
  const same = both ? sameCamera(both.a, both.b) : false;
  const km = both && !same ? haversineKm(both.a, both.b) : null;
  const dist = km !== null && Number.isFinite(km) ? formatDistance(km) : null;
  const bearing = both && !same ? initialBearingDeg(both.a, both.b) : NaN;
  const pairUrl = both && !same ? buildPairGlobeUrl(both.a, both.b) : null;
  const singleUrlA = both ? buildGeoUrl({ lat: both.a.lat, lng: both.a.lng, radiusM: 1_000 }) : null;
  const singleUrlB = both ? buildGeoUrl({ lat: both.b.lat, lng: both.b.lng, radiusM: 1_000 }) : null;

  return (
    <div className="mx-auto mt-10 max-w-3xl">
      <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-start">
        <Picker
          label="FIRST CAMERA"
          pick={pickA}
          state={stateA}
          onState={setStateA}
          onPick={(p) => {
            setPickA(p);
            setStateA(EMPTY_PICKER);
          }}
          onClear={() => setPickA(null)}
          onUseMyLocation={() => useMyLocation("a")}
          locating={locating === "a"}
        />
        <button
          type="button"
          onClick={swap}
          aria-label="Swap the two picks"
          className="mx-auto mt-2 rounded-full border border-white/15 p-2.5 text-white/60 transition hover:border-[#D4AF37]/50 hover:text-white md:mt-10"
        >
          <ArrowLeftRight className="h-4 w-4" />
        </button>
        <Picker
          label="SECOND CAMERA"
          pick={pickB}
          state={stateB}
          onState={setStateB}
          onPick={(p) => {
            setPickB(p);
            setStateB(EMPTY_PICKER);
          }}
          onClear={() => setPickB(null)}
          onUseMyLocation={() => useMyLocation("b")}
          locating={locating === "b"}
        />
      </div>

      {locationError && <p className="mt-4 text-center text-sm text-amber-200/80">{locationError}</p>}

      {both && same && (
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-center">
          <p className="font-semibold">That is the same camera twice</p>
          <p className="mt-1 text-sm text-white/55">
            The distance from a camera to itself is 0 m. Pick a different second camera — cameras that
            share a name are told apart by the place shown beside each result.
          </p>
        </div>
      )}

      {both && !same && dist && (
        <div className="mt-6 rounded-2xl border border-[#D4AF37]/40 bg-[#D4AF37]/[0.04] p-6 text-center">
          <p className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.25em] text-[#D4AF37]">
            <Ruler className="h-3.5 w-3.5" /> STRAIGHT-LINE DISTANCE
          </p>
          <p className="mt-3 text-4xl font-bold tracking-tight md:text-5xl">
            {dist.primary}
            {dist.secondary && <span className="ml-3 text-xl font-medium text-white/50">{dist.secondary}</span>}
          </p>
          <p className="mx-auto mt-3 max-w-xl text-sm text-white/60">
            From <span className="text-white">{both.a.name}</span>
            {placeLabel(both.a) ? ` (${placeLabel(both.a)})` : ""} to{" "}
            <span className="text-white">{both.b.name}</span>
            {placeLabel(both.b) ? ` (${placeLabel(both.b)})` : ""} — as the crow flies, not by road.
            {Number.isFinite(bearing) && (
              <>
                {" "}
                <span className="inline-flex translate-y-0.5 items-center gap-1">
                  <Compass className="h-3.5 w-3.5 text-[#D4AF37]" />
                </span>{" "}
                The second camera lies <span className="text-white">{bearingCompass(bearing)}</span> of
                the first (initial bearing {Math.round(bearing)}°).
              </>
            )}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            {pairUrl && (
              <a
                href={pairUrl}
                className="inline-flex items-center gap-2 rounded-full bg-[#D4AF37] px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-[#e5c65a]"
              >
                <Globe2 className="h-4 w-4" /> Open both on the globe
              </a>
            )}
            {singleUrlA && both.a.id && (
              <a
                href={singleUrlA}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2.5 text-sm text-white/75 transition hover:border-white/45 hover:text-white"
              >
                First camera on the globe
              </a>
            )}
            {singleUrlB && both.b.id && (
              <a
                href={singleUrlB}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2.5 text-sm text-white/75 transition hover:border-white/45 hover:text-white"
              >
                Second camera on the globe
              </a>
            )}
          </div>
          <p className="mt-4 text-xs text-white/35">
            The globe link centres between the two and frames as much of the gap as a single view
            allows — for very long hauls, each camera also has its own globe link above.
          </p>
        </div>
      )}

      {!both && (
        <p className="mt-6 text-center text-sm text-white/40">
          Pick any two cameras in the WorldEye index — or one camera and your own location — and the
          distance appears here.
        </p>
      )}
    </div>
  );
}

"use client";

// Public submit-a-camera form for /submit-camera. Posts to
// /api/camera-submissions, which validates, SSRF-checks the URL host,
// stores the submission as pending for the admin review queue, and
// emails a receipt. Success only shows after the server confirms the
// submission was stored. The hidden "website" field is a honeypot —
// real visitors never see it; the server silently drops filled ones.
import { useState } from "react";
import {
  CAMERA_SUBMISSION_KINDS,
  CAMERA_SUBMISSION_CATEGORIES,
  CAMERA_SUBMISSION_DECLARATIONS,
  CAMERA_NOTES_MAX,
  type CameraSubmissionKind,
} from "@/lib/camera-submissions";

type Phase = "idle" | "sending" | "sent" | "error";

const inputCls =
  "w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[15px] text-white placeholder:text-white/30 outline-none focus:border-[#D4AF37]/50 focus:bg-white/[0.05] transition";
const labelCls = "block text-sm font-medium text-white/70 mb-1.5";
const hintCls = "mt-1.5 text-xs text-white/35 leading-relaxed";

export default function SubmitCameraForm() {
  const [kind, setKind] = useState<CameraSubmissionKind>("suggest");
  const [cameraName, setCameraName] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState<string>("city");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [submitterName, setSubmitterName] = useState("");
  const [submitterEmail, setSubmitterEmail] = useState("");
  const [declaration, setDeclaration] = useState(false);
  const [notes, setNotes] = useState("");
  const [website, setWebsite] = useState(""); // honeypot — must stay empty
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (phase === "sending") return;
    setPhase("sending");
    setError(null);
    try {
      const res = await fetch("/api/camera-submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          cameraName,
          url,
          category,
          city,
          country,
          lat,
          lng,
          submitterName,
          submitterEmail,
          declaration,
          notes,
          website,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? `Something went wrong (${res.status}).`);
      setPhase("sent");
    } catch (err) {
      setPhase("error");
      setError(
        err instanceof Error && err.message
          ? err.message
          : "We couldn't send that just now. Check your connection and try again — or email us directly.",
      );
    }
  }

  if (phase === "sent") {
    return (
      <div className="rounded-3xl border border-[#D4AF37]/30 bg-gradient-to-b from-[#D4AF37]/[0.08] to-transparent p-8 md:p-10 text-center">
        <div className="text-4xl mb-4" aria-hidden>📷</div>
        <h3 className="text-xl font-bold">Submission received</h3>
        <p className="text-sm text-white/55 mt-3 leading-relaxed max-w-md mx-auto">
          Thanks — your camera is in the review queue and a receipt is on
          its way to your email. We check every submission by hand and
          we&apos;ll email you the decision. Approved cameras are cleared
          for import and join the map in batches, so approval and going
          live aren&apos;t the same moment.
        </p>
        <button
          onClick={() => {
            setKind("suggest"); setCameraName(""); setUrl(""); setCategory("city");
            setCity(""); setCountry(""); setLat(""); setLng("");
            setSubmitterName(""); setSubmitterEmail(""); setDeclaration(false);
            setNotes(""); setWebsite(""); setPhase("idle"); setError(null);
          }}
          className="mt-6 px-6 py-2.5 rounded-xl border border-white/15 text-sm text-white/75 hover:text-white hover:border-white/30 transition"
        >
          Submit another camera
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 md:p-8 text-left"
    >
      {/* Which path — operator or suggester */}
      <fieldset>
        <legend className={labelCls}>Whose camera is this?</legend>
        <div className="grid sm:grid-cols-2 gap-3">
          {CAMERA_SUBMISSION_KINDS.map((k) => (
            <label
              key={k.value}
              className={`cursor-pointer rounded-2xl border p-4 transition ${
                kind === k.value
                  ? "border-[#D4AF37]/60 bg-[#D4AF37]/[0.07]"
                  : "border-white/10 bg-white/[0.02] hover:border-white/25"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <input
                  type="radio"
                  name="camera-kind"
                  value={k.value}
                  checked={kind === k.value}
                  onChange={() => { setKind(k.value); setDeclaration(false); }}
                  className="accent-[#D4AF37]"
                />
                <span className="font-semibold text-white/90 text-[15px]">{k.label}</span>
              </span>
              <span className="block text-sm text-white/50 mt-2 leading-relaxed">{k.blurb}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-6">
        <label htmlFor="camera-name" className={labelCls}>Camera name</label>
        <input
          id="camera-name"
          type="text"
          required
          maxLength={120}
          value={cameraName}
          onChange={(e) => setCameraName(e.target.value)}
          placeholder="e.g. Pier 39 Sea Lions, or Main St & 5th Ave"
          className={inputCls}
        />
      </div>

      <div className="mt-5">
        <label htmlFor="camera-url" className={labelCls}>Stream or page address</label>
        <input
          id="camera-url"
          type="url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://… (the live stream, or the page where the camera plays)"
          className={inputCls}
        />
        <p className={hintCls}>
          The direct feed address is best (HLS, MJPEG, MP4 or a snapshot image).
          A page where the camera plays publicly works too. Never send an
          address with a username or password in it.
        </p>
      </div>

      <div className="mt-5">
        <label htmlFor="camera-category" className={labelCls}>Category</label>
        <select
          id="camera-category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={`${inputCls} appearance-none [&>option]:bg-[#0b0e18]`}
        >
          {CAMERA_SUBMISSION_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      <div className="grid sm:grid-cols-2 gap-5 mt-5">
        <div>
          <label htmlFor="camera-city" className={labelCls}>City / area</label>
          <input
            id="camera-city"
            type="text"
            required
            maxLength={100}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="San Francisco"
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="camera-country" className={labelCls}>Country</label>
          <input
            id="camera-country"
            type="text"
            required
            maxLength={100}
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="United States"
            className={inputCls}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5 mt-5">
        <div>
          <label htmlFor="camera-lat" className={labelCls}>Latitude <span className="text-white/35 font-normal">(optional)</span></label>
          <input
            id="camera-lat"
            type="text"
            inputMode="decimal"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            placeholder="37.8087"
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="camera-lng" className={labelCls}>Longitude <span className="text-white/35 font-normal">(optional)</span></label>
          <input
            id="camera-lng"
            type="text"
            inputMode="decimal"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            placeholder="-122.4098"
            className={inputCls}
          />
        </div>
      </div>
      <p className={hintCls}>
        Coordinates help us place the camera exactly. Right-clicking a spot
        in most map apps shows them. Leave both blank if you don&apos;t
        have them — the city and country are enough.
      </p>

      <div className="grid sm:grid-cols-2 gap-5 mt-5">
        <div>
          <label htmlFor="submitter-name" className={labelCls}>Your name</label>
          <input
            id="submitter-name"
            type="text"
            autoComplete="name"
            required
            maxLength={100}
            value={submitterName}
            onChange={(e) => setSubmitterName(e.target.value)}
            placeholder="Jane Smith"
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="submitter-email" className={labelCls}>Your email</label>
          <input
            id="submitter-email"
            type="email"
            autoComplete="email"
            required
            value={submitterEmail}
            onChange={(e) => setSubmitterEmail(e.target.value)}
            placeholder="you@example.com"
            className={inputCls}
          />
        </div>
      </div>

      <div className="mt-5">
        <label htmlFor="camera-notes" className={labelCls}>Notes <span className="text-white/35 font-normal">(optional)</span></label>
        <textarea
          id="camera-notes"
          rows={4}
          maxLength={CAMERA_NOTES_MAX}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything that helps us verify it — who runs the feed, when it's online, what it overlooks…"
          className={`${inputCls} resize-y min-h-[96px]`}
        />
        <div className="mt-1.5 text-right text-xs text-white/30">
          {notes.length}/{CAMERA_NOTES_MAX}
        </div>
      </div>

      <label className="mt-2 flex items-start gap-3 cursor-pointer rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        <input
          type="checkbox"
          required
          checked={declaration}
          onChange={(e) => setDeclaration(e.target.checked)}
          className="mt-0.5 accent-[#D4AF37] w-4 h-4 shrink-0"
        />
        <span className="text-sm text-white/65 leading-relaxed">
          {CAMERA_SUBMISSION_DECLARATIONS[kind]}
        </span>
      </label>

      {/* Honeypot — invisible to people, filled by bots. Leave empty. */}
      <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }}>
        <label>
          Website
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </label>
      </div>

      {phase === "error" && error && (
        <div className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200" role="alert">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={phase === "sending"}
        className="mt-6 w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-[#D4AF37] text-black font-bold hover:brightness-110 disabled:opacity-60 disabled:cursor-wait transition"
      >
        {phase === "sending" ? "Sending…" : "Submit for review"}
      </button>
      <p className="mt-4 text-xs text-white/35 leading-relaxed">
        Submissions are reviewed by a person, not auto-published. We only
        list feeds that are public or that the operator has given us
        permission to show — and we never publish your email address.
      </p>
    </form>
  );
}

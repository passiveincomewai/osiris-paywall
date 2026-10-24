"use client";

/**
 * Wave 2 F13 — Daily Spotlight Cam, a homepage section in the SEO
 * shell (below the globe, reached by scrolling — same placement family
 * as the other landing sections).
 *
 * The camera itself is chosen server-side (GET /api/spotlight): a
 * deterministic daily rotation over catalogue cameras the site's own
 * preview machinery can play — see lib/spotlight for why it is a
 * rotation and not a "most-opened" claim.
 *
 * Viewing is a free-account feature (BRIEF F13): anonymous visitors see
 * which camera is featured and the account prompt; the live preview and
 * the watch link appear only once the session proves a signed-in
 * identity (any tier — free included). An identity read that fails is
 * "unknown" and gets the anonymous treatment: never leak the feed on a
 * failed read, never lock a member out beyond this one card (the globe
 * itself stays open to everyone).
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { Eye, MapPin, Sparkles } from "lucide-react";
import AccountGatePrompt from "./AccountGatePrompt";
import { readSessionIdentity, type SessionIdentityState } from "@/lib/premium-entitlement";
import { freshen } from "@/lib/camera-preview";
import { identityIsGated } from "@/lib/account-gate";

interface SpotlightData {
  dateKey: string;
  camera: {
    id: string;
    name: string;
    city?: string | null;
    country?: string | null;
    mediaKind: string;
    mediaUrl: string;
  } | null;
}

export default function SpotlightCam() {
  const [data, setData] = useState<SpotlightData | null>(null);
  const [identity, setIdentity] = useState<SessionIdentityState>("unknown");

  useEffect(() => {
    let live = true;
    fetch("/api/spotlight", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (live && d) setData(d as SpotlightData);
      })
      .catch(() => {});
    readSessionIdentity()
      .then((id) => {
        if (live) setIdentity(id.state);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  if (!data || !data.camera) return null;
  const cam = data.camera;
  const gated = identityIsGated(identity) || identity === "unknown";
  const place = [cam.city, cam.country].filter(Boolean).join(", ");

  return (
    <section aria-label="Daily Spotlight Cam" className="relative mx-auto max-w-6xl px-6 py-14">
      <div className="mb-6 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-[#D4AF37]" />
        <h2 className="text-[11px] font-mono font-bold uppercase tracking-[0.3em] text-[#D4AF37]">
          Daily Spotlight Cam
        </h2>
      </div>
      <div className="grid items-center gap-6 md:grid-cols-2">
        <div>
          <p className="text-2xl font-bold leading-tight text-white md:text-3xl">{cam.name}</p>
          {place && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-white/55">
              <MapPin className="h-4 w-4 text-[#D4AF37]/80" /> {place}
            </p>
          )}
          <p className="mt-3 max-w-md text-sm leading-relaxed text-white/50">
            One camera from the live catalogue is featured every day. Today&apos;s pick rotates at
            midnight Denver time — come back tomorrow for a new corner of the planet.
          </p>
          {!gated && (
            <Link
              href={`/?camera=${encodeURIComponent(cam.id)}`}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] px-5 py-2.5 text-sm font-bold text-black transition hover:brightness-110"
            >
              <Eye className="h-4 w-4" /> Watch the Spotlight Cam
            </Link>
          )}
        </div>
        <div>
          {gated ? (
            <AccountGatePrompt feature="spotlight-view" />
          ) : cam.mediaKind === "jpg" ? (
            /* eslint-disable-next-line @next/next/no-img-element -- live camera still, refreshed by the same freshen() cache-buster the catalogue previews use */
            <img
              src={freshen(cam.mediaUrl)}
              alt={`Live still from ${cam.name}`}
              className="aspect-video w-full rounded-2xl border border-white/10 object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex aspect-video w-full items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-sm text-white/50">
              Live video feed — open it on the globe to watch.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

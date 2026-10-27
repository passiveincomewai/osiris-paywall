import Link from "next/link";
import {
  Activity,
  ArrowRight,
  CloudSun,
  Flame,
  Orbit,
  Plane,
  Satellite,
  Ship,
} from "lucide-react";

/**
 * "One live map" cross-link block for the tracker pages (SEO item 6,
 * 2026-10-26). Every tracker page renders this same block in its body so
 * the cluster — flights · satellites · ships · weather · quakes · fires ·
 * ISS — links to itself as a set instead of stranding each page with only
 * footer links. The host page passes its own href as `current` and is
 * left out of the grid (a page never links to itself here).
 *
 * Copy discipline: every line is a plain statement of a free layer the
 * globe actually carries — the same claims the tracker pages' own
 * metadata makes. No counts, no superlatives.
 */
export const TRACKER_CLUSTER_LINKS = [
  {
    label: "Flight tracker",
    href: "/live-flight-tracker",
    icon: Plane,
    desc: "Watch flights live — position, altitude, speed and routes from live ADS-B data.",
  },
  {
    label: "Satellite tracker",
    href: "/satellite-tracker",
    icon: Satellite,
    desc: "The ISS, Starlink and thousands of satellites, with real orbit paths.",
  },
  {
    label: "Ship tracker",
    href: "/ship-tracker",
    icon: Ship,
    desc: "Live vessel traffic via AIS — position, speed, heading and ship type.",
  },
  {
    label: "Weather tracker",
    href: "/weather-tracker",
    icon: CloudSun,
    desc: "Live weather radar and storm systems sweeping the planet.",
  },
  {
    label: "Earthquake tracker",
    href: "/earthquake-tracker",
    icon: Activity,
    desc: "Quakes as they happen — magnitude, depth and location, worldwide.",
  },
  {
    label: "Wildfire tracker",
    href: "/wildfire-tracker",
    icon: Flame,
    desc: "Active fires, heat detections and smoke drift, tracked as they evolve.",
  },
  {
    label: "Space station tracker",
    href: "/space-station-tracker",
    icon: Orbit,
    desc: "The International Space Station — live position, altitude and orbit path.",
  },
] as const;

export default function TrackerClusterLinks({ current }: { current?: string }) {
  const links = TRACKER_CLUSTER_LINKS.filter((l) => l.href !== current);
  return (
    <section aria-label="More live trackers" className="mt-16 md:mt-20">
      <h2 className="text-2xl md:text-3xl font-bold text-center">
        Every tracker, <span className="text-[#D4AF37]">one live map</span>
      </h2>
      <p className="text-white/55 mt-4 text-center max-w-2xl mx-auto leading-relaxed">
        Flights, satellites, ships, weather, earthquakes, wildfires and the
        space station are not separate tools here — they are layers of the
        same free 3D globe, live at the same moment.
      </p>
      <div className="mt-8 grid sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="group rounded-2xl border border-white/10 bg-white/[0.02] p-6 hover:border-[#D4AF37]/40 hover:bg-white/[0.04] transition"
          >
            <p className="font-semibold text-white/90 flex items-center gap-2">
              <l.icon className="w-5 h-5 text-[#00E5FF]" aria-hidden />
              {l.label}
              <ArrowRight className="w-4 h-4 text-[#D4AF37] group-hover:translate-x-0.5 transition-transform" />
            </p>
            <p className="text-sm text-white/45 mt-1.5 leading-relaxed">{l.desc}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

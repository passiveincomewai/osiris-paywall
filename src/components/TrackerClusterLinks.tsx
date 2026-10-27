import Link from "next/link";
import {
  Activity,
  ArrowRight,
  CloudRainWind,
  CloudSun,
  Flame,
  Orbit,
  Plane,
  Satellite,
  Ship,
  Tornado,
} from "lucide-react";

/**
 * "One live map" cross-link block for the tracker pages (SEO item 6,
 * 2026-10-26; v2 cluster chunk C5, 2026-10-27).
 *
 * v1 rendered the identical heading + intro on all 11 host pages — a
 * sitewide-templated block in everything but name. v2 keeps the cards
 * (their labels are navigation, legitimately stable, and each card's
 * description is a per-target fact) but the intro is now a one-line
 * lead composed from the HOST page's own topic, written in three
 * rotating frames so no two host types read alike:
 *   A "{Topic} is one layer of this globe — the same free map …"
 *   B "The same free 3D globe that carries {topic} also carries …"
 *   C "On WorldEye, {topic} shares one free globe with …"
 * A host that passes no `current` (or an unknown one) gets the
 * cluster's generic lead.
 *
 * The cluster is the nine live trackers: flights · satellites · ships ·
 * weather · hurricanes · tornadoes · earthquakes · wildfires · ISS.
 * /cyber-threat-map is deliberately NOT a member and does not host the
 * block: it belongs to the intel family, not the tracking family, and
 * a link has to be one a reader on the host page would plausibly want
 * next (INTENT-AND-CLUSTERS §5.4).
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
    lead: "The same free 3D globe that carries live flights also carries the trackers below — one map, everything live at the same moment.",
  },
  {
    label: "Satellite tracker",
    href: "/satellite-tracker",
    icon: Satellite,
    desc: "The ISS, Starlink and thousands of satellites, with real orbit paths.",
    lead: "On WorldEye, thousands of satellites and their orbit paths share one free globe with every tracker below — no separate tools, no separate accounts.",
  },
  {
    label: "Ship tracker",
    href: "/ship-tracker",
    icon: Ship,
    desc: "Live vessel traffic via AIS — position, speed, heading and ship type.",
    lead: "Live vessel traffic is one layer of this globe — the same free map carries every tracker below, live at the same moment.",
  },
  {
    label: "Weather tracker",
    href: "/weather-tracker",
    icon: CloudSun,
    desc: "Live weather radar and storm systems sweeping the planet.",
    lead: "The same free 3D globe that carries live radar and storm systems also carries the trackers below — one map, everything live at the same moment.",
  },
  {
    label: "Hurricane tracker",
    href: "/hurricane-tracker",
    icon: CloudRainWind,
    desc: "Tropical storms and hurricanes plotted live as they develop and move toward land.",
    lead: "On WorldEye, hurricanes and tropical storms share one free globe with every tracker below — no separate tools, no separate accounts.",
  },
  {
    label: "Tornado tracker",
    href: "/tornado-tracker",
    icon: Tornado,
    desc: "Live tornado warnings, watches and reported tornadoes — the sharp end of severe weather.",
    lead: "Live tornado warnings are one layer of this globe — the same free map carries every tracker below, live at the same moment.",
  },
  {
    label: "Earthquake tracker",
    href: "/earthquake-tracker",
    icon: Activity,
    desc: "Quakes as they happen — magnitude, depth and location, worldwide.",
    lead: "The same free 3D globe that carries earthquakes as they are reported also carries the trackers below — one map, everything live at the same moment.",
  },
  {
    label: "Wildfire tracker",
    href: "/wildfire-tracker",
    icon: Flame,
    desc: "Active fires, heat detections and smoke drift, tracked as they evolve.",
    lead: "On WorldEye, active wildfire detections share one free globe with every tracker below — no separate tools, no separate accounts.",
  },
  {
    label: "Space station tracker",
    href: "/space-station-tracker",
    icon: Orbit,
    desc: "The International Space Station — live position, altitude and orbit path.",
    lead: "The International Space Station is one layer of this globe — the same free map carries every tracker below, live at the same moment.",
  },
] as const;

/** The lead a host page renders: its own member's line when the host
 *  is a cluster member, else null (the component falls back to the
 *  generic cluster lead). Pure — unit-tested. */
export function trackerClusterLead(current?: string): string | null {
  const host = TRACKER_CLUSTER_LINKS.find((l) => l.href === current);
  return host ? host.lead : null;
}

const GENERIC_LEAD =
  "Flights, satellites, ships, weather, earthquakes, wildfires and the space station are not separate tools here — they are layers of the same free 3D globe, live at the same moment.";

export default function TrackerClusterLinks({ current }: { current?: string }) {
  const links = TRACKER_CLUSTER_LINKS.filter((l) => l.href !== current);
  const lead = trackerClusterLead(current) ?? GENERIC_LEAD;
  return (
    <section aria-label="More live trackers" className="mt-16 md:mt-20">
      <h2 className="text-2xl md:text-3xl font-bold text-center">
        Every tracker, <span className="text-[#D4AF37]">one live map</span>
      </h2>
      <p className="text-white/55 mt-4 text-center max-w-2xl mx-auto leading-relaxed">
        {lead}
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

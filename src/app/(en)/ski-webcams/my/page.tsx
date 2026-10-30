import type { Metadata } from "next";
import Link from "next/link";
import { Car, ChevronRight, MapPin, Snowflake } from "lucide-react";
import { auth } from "@/auth";
import SiteFooter from "@/components/SiteFooter";
import PowderPassPromo from "@/components/PowderPassPromo";
import SkiCameraGrid from "@/components/SkiCameraGrid";
import SkiFollowButton from "@/components/SkiFollowButton";
import { powderPassEnabled } from "@/lib/ski/access";
import { resolveSkiAccess } from "@/lib/ski/access-server";
import { listFollowedSlugs } from "@/lib/ski/follows";
import {
  getSkiResort,
  loadCountryChunk,
  selectResortCameras,
  type SkiResort,
} from "@/lib/ski-resorts";
import type { CountryCamera } from "@/lib/country-cameras";

export const metadata: Metadata = {
  title: "My Powder — Your Followed Ski Resorts",
  description:
    "Powder Pass members: the resorts you follow, their live cameras and today's forecast, in one place.",
  robots: { index: false, follow: false },
};

/* ── Today's forecast per resort (Open-Meteo, modelled data) ───────
   Keyless forecast API at the resort's own coordinates. One day only:
   today's high/low and snowfall total. Fail-soft — a resort whose
   forecast fetch fails simply renders without the forecast line; no
   weather is ever invented or carried over from another resort. */
interface TodayForecast {
  date: string;
  tempMaxC: number | null;
  tempMinC: number | null;
  snowfallCm: number | null;
}

async function fetchTodayForecast(r: SkiResort): Promise<TodayForecast | null> {
  try {
    const qs = new URLSearchParams({
      latitude: String(r.lat),
      longitude: String(r.lng),
      daily: "temperature_2m_max,temperature_2m_min,snowfall_sum",
      forecast_days: "1",
      timezone: "auto",
    });
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${qs.toString()}`, {
      next: { revalidate: 1800 },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      daily?: {
        time?: string[];
        temperature_2m_max?: (number | null)[];
        temperature_2m_min?: (number | null)[];
        snowfall_sum?: (number | null)[];
      };
    };
    const d = json.daily;
    if (!d?.time?.[0]) return null;
    return {
      date: d.time[0],
      tempMaxC: d.temperature_2m_max?.[0] ?? null,
      tempMinC: d.temperature_2m_min?.[0] ?? null,
      snowfallCm: d.snowfall_sum?.[0] ?? null,
    };
  } catch {
    return null;
  }
}

async function loadResortCameras(r: SkiResort): Promise<CountryCamera[]> {
  try {
    const records = await loadCountryChunk(r.countrySlug);
    return selectResortCameras(records, r).resort;
  } catch {
    return [];
  }
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="docs-root min-h-screen bg-[#05070d] text-white">
      <div className="max-w-6xl mx-auto px-6 py-10 md:py-16">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-white/45 mb-10">
          <Link href="/" className="hover:text-white transition">Home</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link href="/ski-webcams" className="hover:text-white transition">Ski webcams</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-white/80">My Powder</span>
        </nav>
        <div className="text-center max-w-3xl mx-auto">
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#D4AF37] border border-[#D4AF37]/30 rounded-full px-4 py-1.5 mb-6">
            <Snowflake className="w-3.5 h-3.5" /> MY POWDER
          </p>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">Your followed resorts</h1>
        </div>
        {children}
      </div>
      <SiteFooter />
    </main>
  );
}

export default async function MyPowderPage() {
  const session = await auth().catch(() => null);
  const userId = (session?.user as { id?: string } | undefined)?.id;

  /* Anonymous → sign-in prompt (a prompt, not a redirect, so the page
     explains what following is before asking for anything). */
  if (!userId) {
    return (
      <Shell>
        <div className="mt-10 max-w-2xl mx-auto rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8 text-center">
          <p className="text-white/70 leading-relaxed">
            My Powder is your Powder Pass dashboard: follow resorts from any
            resort page and their live cameras and today&apos;s forecast collect
            here. Sign in to see yours.
          </p>
          <Link
            href="/signin"
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black text-sm font-bold hover:brightness-110 transition"
          >
            Sign in
          </Link>
        </div>
      </Shell>
    );
  }

  /* Signed in without ski access → honest explanation + the promo. */
  const hasAccess = await resolveSkiAccess(userId).catch(() => false);
  if (!hasAccess) {
    return (
      <Shell>
        <div className="mt-10 max-w-2xl mx-auto rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8 text-center">
          <p className="text-white/70 leading-relaxed">
            Following resorts is a Powder Pass feature. Powder Pass is
            WorldEye&apos;s ski-only membership, and VIP Pro annual already
            includes it — Weekly and Monthly Pro do not. With a pass, the
            resorts you follow collect here with their live cameras and
            today&apos;s forecast.
          </p>
        </div>
        {powderPassEnabled(process.env) && (
          <div className="max-w-4xl mx-auto">
            <PowderPassPromo />
          </div>
        )}
      </Shell>
    );
  }

  /* Member → the followed-resort dashboard. */
  const slugs = await listFollowedSlugs(userId);
  const resorts = slugs
    .map(s => getSkiResort(s))
    .filter((r): r is SkiResort => !!r);
  const fetchedAt = new Date();
  const cards = await Promise.all(
    resorts.map(async r => ({
      resort: r,
      cameras: await loadResortCameras(r),
      forecast: await fetchTodayForecast(r),
    })),
  );

  if (cards.length === 0) {
    return (
      <Shell>
        <div className="mt-10 max-w-2xl mx-auto rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8 text-center">
          <p className="text-white/70 leading-relaxed">
            You haven&apos;t followed any resorts yet. Open any resort page and
            tap <strong className="text-white">Follow</strong> — it will show up
            here with its live cameras and today&apos;s forecast.
          </p>
          <Link
            href="/ski-webcams"
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black text-sm font-bold hover:brightness-110 transition"
          >
            Browse the ski resort directory
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <p className="mt-4 text-center text-white/55">
        {cards.length} followed {cards.length === 1 ? "resort" : "resorts"} — live
        cameras and today&apos;s forecast for each.
      </p>
      <div className="mt-12 space-y-14">
        {cards.map(({ resort: r, cameras, forecast }) => (
          <section
            key={r.slug}
            className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 md:p-8"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">
                  <Link href={`/ski-webcams/${r.slug}`} className="hover:text-[#e8c55a] transition">
                    {r.name}
                  </Link>
                </h2>
                <p className="mt-1 text-sm text-white/55 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-[#00E5FF]" />
                  {r.town}, {r.region} · {r.country}
                </p>
                {forecast && (
                  <p className="mt-3 text-sm text-white/70">
                    Today ({forecast.date}):{" "}
                    {forecast.tempMinC != null && forecast.tempMaxC != null ? (
                      <>
                        {Math.round(forecast.tempMinC)}°C to {Math.round(forecast.tempMaxC)}°C
                      </>
                    ) : (
                      "temperature unavailable"
                    )}
                    {forecast.snowfallCm != null && forecast.snowfallCm > 0
                      ? ` · ${forecast.snowfallCm.toFixed(1)} cm snowfall forecast`
                      : " · no snowfall in today's forecast"}
                  </p>
                )}
                {forecast && (
                  <p className="mt-1 text-xs text-white/40">
                    Modelled forecast from Open-Meteo for {r.name}&apos;s coordinates,
                    fetched {fetchedAt.toISOString().slice(11, 16)} UTC — a forecast
                    model, not a snow report. The resort&apos;s own report is the
                    official word.
                  </p>
                )}
              </div>
              <SkiFollowButton resortSlug={r.slug} resortName={r.name} />
            </div>

            <div className="mt-6">
              <SkiCameraGrid
                cameras={cameras}
                initial={6}
                emptyNote={`No cameras at ${r.name} are in the live index right now — the resort page below carries its road cameras.`}
              />
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={`/ski-webcams/${r.slug}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/15 text-sm font-semibold text-white/80 hover:bg-white/5 transition"
              >
                {r.name} resort page
              </Link>
              <Link
                href={`/ski-webcams/${r.slug}#drive`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/15 text-sm font-semibold text-white/80 hover:bg-white/5 transition"
              >
                <Car className="w-4 h-4" /> Plan the drive up
              </Link>
            </div>
          </section>
        ))}
      </div>
      <p className="mt-10 text-center text-sm text-white/45">
        Looking for another mountain?{" "}
        <Link href="/ski-webcams" className="font-semibold text-[#00E5FF] hover:underline">
          Browse all ski resorts
        </Link>
      </p>
    </Shell>
  );
}

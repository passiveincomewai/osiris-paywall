import { AlertTriangle, Wind } from "lucide-react";
import type { PlaceWeather } from "@/lib/place-weather";

/**
 * Forecast strip + government weather alerts + air quality for a place
 * page. Purely presentational: the (server) page fetches via
 * lib/place-weather and passes the result in. Renders NOTHING when
 * there is no data — no key configured, provider down, or no alerts /
 * readings — so pages without the integrations are byte-identical.
 *
 * Attribution is part of the render: OpenAQ data is always credited
 * "OpenAQ" (its terms require it) and WeatherAPI data "WeatherAPI.com".
 */

const EPA_LABELS = ["", "Good", "Moderate", "USG", "Unhealthy", "Very unhealthy", "Hazardous"];

function fmtTemp(v: number | null): string {
  return v === null ? "—" : `${Math.round(v)}°C`;
}

function fmtVal(v: number | null): string {
  return v === null ? "—" : `${Math.round(v * 10) / 10}`;
}

export default function PlaceWeatherPanel({
  data,
  placeName,
}: {
  data: PlaceWeather;
  placeName: string;
}) {
  const { weather, airQuality } = data;
  if (!weather && !airQuality) return null;

  return (
    <section className="mt-12" aria-label={`Weather for ${placeName}`}>
      <h2 className="text-xl md:text-2xl font-bold mb-5">
        Weather &amp; air quality in {placeName}
      </h2>

      {weather && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="text-3xl font-bold text-[#D4AF37]">
              {fmtTemp(weather.current.tempC)}
            </span>
            {weather.current.condition && (
              <span className="text-white/80 font-semibold">{weather.current.condition.text}</span>
            )}
            {weather.current.feelsLikeC !== null && (
              <span className="text-sm text-white/45">
                Feels like {fmtTemp(weather.current.feelsLikeC)}
              </span>
            )}
            {weather.current.windKph !== null && (
              <span className="text-sm text-white/45">
                Wind {Math.round(weather.current.windKph)} km/h
              </span>
            )}
            {weather.current.humidity !== null && (
              <span className="text-sm text-white/45">Humidity {Math.round(weather.current.humidity)}%</span>
            )}
          </div>

          {weather.forecast.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-3">
              {weather.forecast.map((d) => (
                <div key={d.date} className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-center">
                  <div className="text-xs text-white/45">
                    {new Date(`${d.date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short" })}
                  </div>
                  <div className="mt-1 font-semibold text-sm">
                    {fmtTemp(d.maxTempC)} <span className="text-white/40">{fmtTemp(d.minTempC)}</span>
                  </div>
                  {d.condition && (
                    <div className="mt-1 text-xs text-white/55">{d.condition.text}</div>
                  )}
                  {d.dailyChanceOfRain !== null && (
                    <div className="mt-1 text-xs text-[#00E5FF]">{Math.round(d.dailyChanceOfRain)}% rain</div>
                  )}
                </div>
              ))}
            </div>
          )}

          <p className="mt-4 text-xs text-white/30">
            Forecast by WeatherAPI.com{weather.stale ? " — showing the last good reading" : ""}
          </p>
        </div>
      )}

      {weather && weather.alerts.length > 0 && (
        <div className="mt-4 space-y-3">
          {weather.alerts.map((a, i) => (
            <div
              key={`${a.headline}-${i}`}
              className="rounded-2xl border border-amber-400/30 bg-amber-400/[0.06] p-5"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-amber-100">{a.headline}</div>
                  <div className="mt-1 text-xs text-amber-200/60">
                    {[a.severity, a.areas, a.expires ? `Until ${a.expires}` : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                  {a.description && (
                    <p className="mt-2 text-sm text-white/65 leading-relaxed">{a.description}</p>
                  )}
                  {a.instruction && (
                    <p className="mt-2 text-sm text-white/65 leading-relaxed">{a.instruction}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
          <p className="text-xs text-white/30">Government weather alerts via WeatherAPI.com</p>
        </div>
      )}

      {airQuality && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center gap-2 mb-3">
            <Wind className="w-4 h-4 text-[#00E5FF]" />
            <h3 className="font-semibold text-sm">Air quality</h3>
            {airQuality.usEpaIndex !== null && EPA_LABELS[airQuality.usEpaIndex] && (
              <span className="text-xs font-semibold rounded-full border border-[#00E5FF]/30 text-[#00E5FF] px-2.5 py-0.5">
                US EPA {airQuality.usEpaIndex} — {EPA_LABELS[airQuality.usEpaIndex]}
              </span>
            )}
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 text-center">
            {(
              [
                ["PM2.5", airQuality.pm25],
                ["PM10", airQuality.pm10],
                ["O₃", airQuality.o3],
                ["NO₂", airQuality.no2],
                ["SO₂", airQuality.so2],
                ["CO", airQuality.co],
              ] as Array<[string, number | null]>
            )
              .filter(([, v]) => v !== null)
              .map(([label, v]) => (
                <div key={label} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                  <div className="font-semibold text-sm">{fmtVal(v)}</div>
                  <div className="text-xs text-white/45 mt-1">{label} µg/m³</div>
                </div>
              ))}
          </div>
          <p className="mt-3 text-xs text-white/30">
            Air quality data: {airQuality.attribution}
            {airQuality.locationName ? ` — ${airQuality.locationName}` : ""}
            {airQuality.measuredAt ? ` · measured ${airQuality.measuredAt}` : ""}
          </p>
        </div>
      )}
    </section>
  );
}

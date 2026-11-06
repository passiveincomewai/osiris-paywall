/**
 * Honest feed-status notice for the maritime surfaces (audit A4,
 * 2026-11-06). The AIS websocket in src/app/api/maritime/route.ts is
 * the ONLY source of vessel positions, and it never connects while
 * AIS_API_KEY is unset — so every ship reads "not reporting" and the
 * tracker shows zero vessels, which visitors reasonably misread as
 * "the ships are just quiet". This server component renders a plain
 * feed-level explanation instead, and renders NOTHING the moment a
 * key is configured (the deployment that adds the key rebuilds /
 * re-renders without the banner). Per-ship "not reporting" states
 * (ShipLiveCard) stay as they are — they are true per ship; this is
 * the missing feed-level truth next to them.
 */
export default function AisFeedNotice({
  locale = "en",
  className = "",
}: {
  locale?: string;
  className?: string;
}) {
  if (process.env.AIS_API_KEY) return null;
  const es = locale === "es";
  return (
    <div
      role="note"
      className={`rounded-2xl border border-amber-300/30 bg-amber-300/[0.06] px-5 py-4 text-left ${className}`}
    >
      <p className="text-sm font-semibold text-amber-200">
        {es
          ? "Las posiciones de buques en vivo no están disponibles ahora mismo"
          : "Live vessel positions aren't available right now"}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-white/60">
        {es
          ? "El feed AIS que WorldEye usa para las posiciones de los buques no está devolviendo posiciones en este momento. Los puertos, las rutas marítimas y el resto del globo están en vivo — las posiciones de los buques aparecerán automáticamente en cuanto el feed se reanude."
          : "The AIS feed WorldEye uses for ship positions is not currently returning vessel positions. Ports, shipping lanes and the rest of the globe are live — ship positions will appear automatically as soon as the feed resumes."}
      </p>
    </div>
  );
}

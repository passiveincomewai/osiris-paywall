"use client";

/**
 * "Get alerts for this route" email form for transit pages.
 *
 * Two placements: fixed-route (a route page — the route is the page)
 * and route-picker (the agency hub — the reader chooses a route).
 * Posts to /api/transit/alert-subscriptions, which runs the site's
 * shared instant email validation — junk never subscribes, and a
 * likely-typo domain comes back as a suggestion the reader can
 * accept or override (never a silent rewrite). Alerts are free:
 * the first 5 digest emails need no account at all; after that a
 * free WorldEye account keeps them coming (the cap + conversion
 * live in the alert runner, not here).
 */
import { useState, type FormEvent } from "react";
import { Bell, CheckCircle2, Loader2 } from "lucide-react";

export interface AlertRouteOption {
  /** Agency route id (the alert upstream's id, e.g. MBTA "Orange"). */
  id: string;
  slug: string;
  /** Display name for copy, e.g. "Orange Line". */
  name: string;
}

export default function RouteAlertSignup({
  agencyId,
  agencyName,
  routeId,
  routeSlug,
  routeName,
  routeOptions,
}: {
  agencyId: string;
  agencyName: string;
  routeId?: string;
  routeSlug?: string;
  routeName?: string;
  routeOptions?: AlertRouteOption[];
}) {
  const [picked, setPicked] = useState<string>(routeOptions?.[0]?.id ?? "");
  const route: AlertRouteOption | null =
    routeId && routeSlug && routeName
      ? { id: routeId, slug: routeSlug, name: routeName }
      : (routeOptions?.find((r) => r.id === picked) ?? null);

  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [done, setDone] = useState<{ already: boolean } | null>(null);

  async function submit(addr: string, confirmed: boolean) {
    if (!route) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/transit/alert-subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: addr,
          agency: agencyId,
          routeId: route.id,
          routeSlug: route.slug,
          routeName: route.name,
          confirmed,
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (data.code === "typo_suggestion" && typeof data.suggestion === "string") {
          setSuggestion(data.suggestion);
        } else {
          setError(data.error ?? "Couldn't subscribe that address. Try again.");
        }
        setBusy(false);
        return;
      }
      setDone({ already: !!data.alreadySubscribed });
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    }
    setBusy(false);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSuggestion(null);
    void submit(email.trim(), false);
  }

  if (!route) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <p className="font-mono text-[11px] font-medium tracking-[0.25em] text-[#0096FF] mb-2">
        ROUTE ALERTS BY EMAIL
      </p>
      {done ? (
        <p className="flex items-start gap-2 text-sm text-white/80">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          {done.already ? (
            <span>
              You&apos;re already on the list — {agencyName} {route.name} alerts go to{" "}
              {email.trim()}.
            </span>
          ) : (
            <span>
              You&apos;re in — {agencyName} {route.name} alerts will be emailed to{" "}
              {email.trim()}. Current alerts arrive within about 15 minutes, then
              new ones as they&apos;re posted.
            </span>
          )}
        </p>
      ) : (
        <>
          <p className="text-sm text-white/70 leading-relaxed">
            Get {agencyName} {route.name} service alerts by email — detours, delays
            and suspensions as {agencyName} posts them.
          </p>
          {routeOptions && routeOptions.length > 1 && (
            <div className="mt-3.5">
              <label
                className="sr-only"
                htmlFor={`alert-route-${agencyId}`}
              >
                Route for email alerts
              </label>
              <select
                id={`alert-route-${agencyId}`}
                value={picked}
                onChange={(e) => setPicked(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-[#D4AF37]/60"
              >
                {routeOptions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <form onSubmit={onSubmit} className="mt-3.5 flex flex-col sm:flex-row gap-2.5">
            <label className="sr-only" htmlFor={`alert-email-${agencyId}-${route.id}`}>
              Email address for {route.name} alerts
            </label>
            <input
              id={`alert-email-${agencyId}-${route.id}`}
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#D4AF37]/60"
            />
            <button
              type="submit"
              disabled={busy || !email.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#D4AF37] px-4 py-3 text-sm font-bold text-black hover:brightness-110 transition disabled:opacity-50 disabled:hover:brightness-100"
            >
              {busy ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Bell className="w-4 h-4" />
              )}
              Email me alerts
            </button>
          </form>
          {suggestion && !error && (
            <p className="text-sm text-white/70 mt-3">
              Did you mean <span className="text-white">{suggestion}</span>?{" "}
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setEmail(suggestion);
                  setSuggestion(null);
                  void submit(suggestion, false);
                }}
                className="text-[#D4AF37] font-semibold hover:underline"
              >
                Use it
              </button>{" "}
              ·{" "}
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setSuggestion(null);
                  void submit(email.trim(), true);
                }}
                className="text-white/80 font-semibold hover:underline"
              >
                Keep mine
              </button>
            </p>
          )}
          {error && <p className="text-sm text-red-300 mt-3">{error}</p>}
          <p className="text-xs text-white/40 mt-3 leading-relaxed">
            Free service alerts for this route by email. First 5 are on us — after
            that, a free WorldEye account keeps them coming.
          </p>
        </>
      )}
    </div>
  );
}

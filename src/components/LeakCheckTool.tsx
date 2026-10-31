"use client";

import { useState } from "react";
import { Search, ShieldAlert, ShieldCheck } from "lucide-react";

/**
 * Working free Data Leaks checker for /tools/data-leak-checker.
 *
 * Runs the exact call the in-app RECON board makes: the visitor's browser
 * queries XposedOrNot's public breach-analytics API directly. No WorldEye
 * account, no WorldEye server in the path — the page says so, and the
 * parsing mirrors OsintPanel's leaks handling (BreachesSummary.site list +
 * ExposedData data_classes; HTTP 404 = no breaches found).
 */
export default function LeakCheckTool() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    breached: boolean;
    breaches: string[];
    exposed: string[];
  } | null>(null);

  async function run() {
    const q = email.trim();
    if (!q || !q.includes("@")) {
      setError("Enter an email address to check.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(
        `https://api.xposedornot.com/v1/breach-analytics?email=${encodeURIComponent(q)}`
      );
      if (res.status === 404) {
        setResult({ breached: false, breaches: [], exposed: [] });
        return;
      }
      if (!res.ok) throw new Error(`Lookup failed (${res.status})`);
      const data = await res.json();
      let breachList: string[] = [];
      if (data.BreachesSummary && data.BreachesSummary.site) {
        breachList = String(data.BreachesSummary.site).split(";").filter(Boolean);
      }
      const exposed = new Set<string>();
      if (data.ExposedData && Array.isArray(data.ExposedData)) {
        data.ExposedData.forEach((item: any) => {
          if (item.data_classes && Array.isArray(item.data_classes)) {
            item.data_classes.forEach((dc: string) => exposed.add(dc));
          }
        });
      }
      setResult({
        breached: breachList.length > 0,
        breaches: breachList,
        exposed: Array.from(exposed).sort(),
      });
    } catch {
      setError("The lookup could not be completed. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto mt-10 max-w-3xl rounded-2xl border border-white/10 bg-white/[0.02] p-5 md:p-6">
      <label htmlFor="leak-email" className="text-xs font-semibold tracking-[0.2em] text-white/60">
        EMAIL ADDRESS
      </label>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <input
          id="leak-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run()}
          placeholder="you@example.com"
          className="flex-1 rounded-lg border border-white/15 bg-black/30 px-3.5 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-[#D4AF37]/60 focus:outline-none"
        />
        <button
          onClick={run}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#D4AF37] px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-[#e5c65a] disabled:opacity-50"
        >
          <Search className="h-4 w-4" /> {loading ? "Checking…" : "Check for leaks"}
        </button>
      </div>
      <p className="mt-3 text-xs text-white/45">
        Your browser asks XposedOrNot&apos;s public breach database directly — the address is not
        sent to or stored by WorldEye. Only check an address you own or are authorised to check.
      </p>

      {error && <p className="mt-4 text-sm text-[#FF7A7A]">{error}</p>}

      {result && (
        <div className="mt-5 border-t border-dashed border-white/15 pt-4">
          {result.breached ? (
            <>
              <p className="inline-flex items-center gap-2 font-semibold text-[#FF7A7A]">
                <ShieldAlert className="h-5 w-5" /> Found in {result.breaches.length}{" "}
                known breach{result.breaches.length === 1 ? "" : "es"}
              </p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {result.breaches.map((b) => (
                  <li
                    key={b}
                    className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/80"
                  >
                    {b}
                  </li>
                ))}
              </ul>
              {result.exposed.length > 0 && (
                <p className="mt-4 text-sm text-white/65">
                  Data types exposed across those breaches: {result.exposed.join(", ")}.
                </p>
              )}
              <p className="mt-3 text-sm text-white/65">
                What to do: change the password on any account that still uses the password from a
                breached service, turn on two-factor authentication, and treat unexpected emails
                about those accounts with suspicion.
              </p>
            </>
          ) : (
            <>
              <p className="inline-flex items-center gap-2 font-semibold text-[#4ADE80]">
                <ShieldCheck className="h-5 w-5" /> No breaches found for this address
              </p>
              <p className="mt-3 text-sm text-white/65">
                That means the address does not appear in the public breach records this check
                searches. It is not a guarantee — breaches that were never published or indexed
                cannot show up in any checker.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

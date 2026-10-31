"use client";

import { useState } from "react";
import { Search } from "lucide-react";

/**
 * Working free Shodan IoT lookup for /tools/ip-device-lookup.
 *
 * Mirrors the RECON board's shodan tab: the visitor's browser queries
 * Shodan's InternetDB (internetdb.shodan.io) directly for the IP's public
 * record — open ports, hostnames, tags and known-vulnerability flags. A 404
 * from InternetDB means Shodan holds no record for the address, and the UI
 * says exactly that.
 */
export default function IpDeviceTool() {
  const [ip, setIp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    ip: string;
    ports: number[];
    hostnames: string[];
    tags: string[];
    vulns: string[];
    cpes: string[];
  } | null>(null);
  const [noRecord, setNoRecord] = useState<string | null>(null);

  async function run() {
    const q = ip.trim();
    if (!q) {
      setError("Enter an IP address to look up.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    setNoRecord(null);
    try {
      const res = await fetch(`https://internetdb.shodan.io/${encodeURIComponent(q)}`, {
        cache: "no-store",
      });
      if (res.status === 404) {
        setNoRecord(q);
        return;
      }
      if (!res.ok) throw new Error(`Lookup failed (${res.status})`);
      const data = await res.json();
      setResult({
        ip: data.ip ?? q,
        ports: Array.isArray(data.ports) ? data.ports : [],
        hostnames: Array.isArray(data.hostnames) ? data.hostnames : [],
        tags: Array.isArray(data.tags) ? data.tags : [],
        vulns: Array.isArray(data.vulns) ? data.vulns : [],
        cpes: Array.isArray(data.cpes) ? data.cpes : [],
      });
    } catch {
      setError("The lookup could not be completed. Check the address and your connection, then try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto mt-10 max-w-3xl rounded-2xl border border-white/10 bg-white/[0.02] p-5 md:p-6">
      <label htmlFor="ipdev-ip" className="text-xs font-semibold tracking-[0.2em] text-white/60">
        IP ADDRESS
      </label>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <input
          id="ipdev-ip"
          type="text"
          inputMode="url"
          autoComplete="off"
          value={ip}
          onChange={(e) => setIp(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run()}
          placeholder="8.8.8.8"
          className="flex-1 rounded-lg border border-white/15 bg-black/30 px-3.5 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-[#D4AF37]/60 focus:outline-none"
        />
        <button
          onClick={run}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#D4AF37] px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-[#e5c65a] disabled:opacity-50"
        >
          <Search className="h-4 w-4" /> {loading ? "Looking up…" : "Look up IP"}
        </button>
      </div>
      <p className="mt-3 text-xs text-white/45">
        Data comes from Shodan&apos;s InternetDB, queried directly by your browser — a record of
        what that address exposes to the public internet, collected by Shodan&apos;s scanners.
      </p>

      {error && <p className="mt-4 text-sm text-[#FF7A7A]">{error}</p>}

      {noRecord && (
        <div className="mt-5 border-t border-dashed border-white/15 pt-4">
          <p className="font-semibold text-white/85">No InternetDB record for {noRecord}</p>
          <p className="mt-2 text-sm text-white/65">
            Shodan holds no public scan record for this address. That usually means the device is
            not reachable from the public internet, or has not been scanned — it is not proof that
            nothing is running there.
          </p>
        </div>
      )}

      {result && (
        <div className="mt-5 border-t border-dashed border-white/15 pt-4">
          <p className="font-semibold text-white/85">InternetDB record for {result.ip}</p>
          <dl className="mt-3 space-y-2 font-mono text-[13px]">
            <div className="flex flex-wrap gap-x-3">
              <dt className="min-w-32 text-white/40">open ports</dt>
              <dd className="text-white/85">
                {result.ports.length ? result.ports.join(", ") : "none recorded"}
              </dd>
            </div>
            <div className="flex flex-wrap gap-x-3">
              <dt className="min-w-32 text-white/40">hostnames</dt>
              <dd className="text-white/85">
                {result.hostnames.length ? result.hostnames.join(", ") : "none recorded"}
              </dd>
            </div>
            <div className="flex flex-wrap gap-x-3">
              <dt className="min-w-32 text-white/40">tags</dt>
              <dd className="text-white/85">
                {result.tags.length ? result.tags.join(", ") : "none recorded"}
              </dd>
            </div>
            <div className="flex flex-wrap gap-x-3">
              <dt className="min-w-32 text-white/40">known vulns</dt>
              <dd className={result.vulns.length ? "text-[#FFB020]" : "text-white/85"}>
                {result.vulns.length ? result.vulns.join(", ") : "none recorded"}
              </dd>
            </div>
            <div className="flex flex-wrap gap-x-3">
              <dt className="min-w-32 text-white/40">fingerprints</dt>
              <dd className="text-white/85">
                {result.cpes.length ? `${result.cpes.length} device/software fingerprint(s)` : "none recorded"}
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-xs leading-relaxed text-white/45">
            A “known vulns” entry means the fingerprinted software version matches a published
            CVE — it is a lead to verify on the device itself, not proof the device is exploitable.
          </p>
        </div>
      )}
    </div>
  );
}

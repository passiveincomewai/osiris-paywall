/**
 * WorldEye Fraud Radar — the launch/kill switch.
 *
 * Mirrors `powderPassEnabled` (src/lib/ski/access.ts) exactly: a pure
 * function of an env record, true only for an explicit affirmative
 * value, DEFAULT OFF. Fraud Radar is invisible until the owner enables
 * it, and independently disable-able afterwards (master spec §2,
 * Phase 0 AUDIT §9 + §13.3).
 *
 * Kill-switch semantics — with the flag off:
 *   - every page under /fraud-radar calls notFound() (404),
 *   - fraudRadarPublicPaths() returns [] so the sitemap and any nav
 *     wiring contribute nothing,
 *   - no Fraud Radar cron or job performs work (each checks first),
 *   - no session carries a Fraud Radar claim and no pricing/JSON-LD/
 *     llms.txt surface enumerates a Fraud Radar offer.
 * Phase 1 wires the route + sitemap-path consumers; later phases add
 * the claims/cron/pricing consumers behind this same function.
 */

export const FRAUD_RADAR_ENABLED_ENV = "FRAUD_RADAR_ENABLED";

export function fraudRadarEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  const v = env[FRAUD_RADAR_ENABLED_ENV]?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "on" || v === "yes";
}

/**
 * The public URL paths Fraud Radar contributes when enabled — the
 * single list the sitemap (and any future nav wiring) consumes, so
 * flag-off provably contributes nothing. Phase 1 ships only the shell;
 * later phases append their public pages here as they land.
 */
export function fraudRadarPublicPaths(
  env: Record<string, string | undefined> = process.env,
): string[] {
  if (!fraudRadarEnabled(env)) return [];
  return [
    "/fraud-radar",
    // Phase 2 healthcare surfaces (indexable landings only; provider
    // profiles and the search API stay out of the sitemap).
    "/fraud-radar/healthcare",
    "/fraud-radar/healthcare/providers",
    "/fraud-radar/healthcare/hcpcs",
    // Phase 3 care-program surfaces (landings + directories only;
    // provider profiles, HCPCS detail and the search API stay out).
    "/fraud-radar/care",
    "/fraud-radar/care/medicare",
    "/fraud-radar/care/hcpcs",
    "/fraud-radar/care/hospice",
    "/fraud-radar/care/home-health",
    // Phase 4 grants surfaces (landing, recipient search and the ALN
    // explorer only; recipient profiles, ALN detail, the FAC overview
    // and the search API stay out of the sitemap).
    "/fraud-radar/grants",
    "/fraud-radar/grants/recipients",
    "/fraud-radar/grants/aln",
  ];
}

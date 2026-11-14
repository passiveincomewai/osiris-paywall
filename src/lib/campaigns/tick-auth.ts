// Credential check for the campaign tick endpoint. Pure and separately
// testable: given the request headers and the configured secrets,
// decide whether a presented credential authorizes the tick.
//
// Accepted credentials:
//   - x-campaign-tick-secret header equal to CAMPAIGN_TICK_SECRET
//   - Authorization: Bearer <CAMPAIGN_TICK_SECRET>
//   - Authorization: Bearer <CRON_SECRET> — what Vercel's own cron
//     sends; it cannot attach custom headers, so without this path the
//     vercel.json cron could never authenticate.
// An admin session is a separate path, handled by the route.
export interface TickSecrets {
  tickSecret?: string;
  cronSecret?: string;
}

export function tickSecretsConfigured(secrets: TickSecrets): boolean {
  return Boolean(secrets.tickSecret || secrets.cronSecret);
}

// "valid"  — a presented credential matches a configured secret.
// "invalid" — a credential was presented but matches nothing.
// "none"   — the request carries no credential at all; the route then
//            falls back to the admin-session path.
export function tickCredentialStatus(
  headers: Headers,
  secrets: TickSecrets,
): "valid" | "invalid" | "none" {
  const headerSecret = headers.get("x-campaign-tick-secret");
  const authorization = headers.get("authorization");
  const bearer =
    authorization !== null && authorization.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length)
      : null;

  if (headerSecret === null && bearer === null) return "none";
  if (secrets.tickSecret) {
    if (headerSecret === secrets.tickSecret) return "valid";
    if (bearer === secrets.tickSecret) return "valid";
  }
  if (secrets.cronSecret && bearer === secrets.cronSecret) return "valid";
  return "invalid";
}

// ── WorldEye Affiliate System — centralized brand config ─────────────────
// Every user-visible brand string in the affiliate system reads from here,
// so a future rename is a one-line change.

export const AFFILIATE_BRAND = {
  name: "WorldEye",
  tagline: "Global intelligence, real-time.",
  // Base URL for referral links. Falls back to the app URL at runtime.
  // Affiliates get: {baseUrl}/ref/{code}
  domain: process.env.NEXT_PUBLIC_AFFILIATE_DOMAIN || "osiris-lime.vercel.app",
} as const;

export function referralBaseUrl(): string {
  const d = AFFILIATE_BRAND.domain;
  return d.startsWith("http") ? d : `https://${d}`;
}

export function referralLinkFor(code: string): string {
  return `${referralBaseUrl()}/ref/${code}`;
}

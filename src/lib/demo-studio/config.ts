// AI Demo Studio — worker-facing configuration.
//
// The internal endpoints (/api/internal/demo-studio/*) are how the
// isolated recording/rendering worker (Cosmo's VM) claims jobs and
// delivers finished videos. They mirror the Studio AI fulfillment
// pattern (lib/studio/ai.ts): a bearer secret guards them, and when no
// secret is configured the routes return 404 — they effectively do not
// exist until the owner wires one up.
//
// Secret resolution: DEMO_STUDIO_SECRET when set, otherwise the Studio
// AI operator secret (STUDIO_AI_SECRET). Both guard the same trust
// boundary — Cosmo-operated fulfillment workers calling internal
// endpoints — so a deployment that already runs the Studio AI worker
// can run the Demo Studio worker with no new env work.

export function demoStudioSecret(): string | undefined {
  return process.env.DEMO_STUDIO_SECRET || process.env.STUDIO_AI_SECRET || undefined;
}

export function demoStudioConfigured(): boolean {
  return !!demoStudioSecret();
}

export function verifyDemoBearer(req: Request): boolean {
  const secret = demoStudioSecret();
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

// Content Studio — engine-facing configuration.
//
// The internal endpoints (/api/internal/content-studio/*) are how the
// autonomous content engine (Cosmo's VM) reads admin control state and
// pushes status snapshots. They mirror the Demo Studio pattern
// (lib/demo-studio/config.ts): a bearer secret guards them, and when
// no secret is configured the routes return 404 — they effectively do
// not exist until the owner wires one up.
//
// Secret resolution: CONTENT_ENGINE_SECRET when set, otherwise the
// Studio AI operator secret (STUDIO_AI_SECRET). Both guard the same
// trust boundary — Cosmo-operated workers calling internal endpoints —
// so a deployment that already runs the Studio AI / Demo Studio
// workers can sync the content engine with no new env work. Setting
// CONTENT_ENGINE_SECRET in Vercel Production remains the recommended
// end state so the engine gets its own rotatable secret.

export function contentEngineSecret(): string | undefined {
  return process.env.CONTENT_ENGINE_SECRET || process.env.STUDIO_AI_SECRET || undefined;
}

export function contentEngineConfigured(): boolean {
  return !!contentEngineSecret();
}

export function verifyContentBearer(req: Request): boolean {
  const secret = contentEngineSecret();
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

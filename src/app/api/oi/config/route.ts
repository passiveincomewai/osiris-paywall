import { disabled, json } from '@/lib/oi/service';
import { SITE_AI_PROVIDER, siteAiAvailable, siteAiModel, siteAiUserId } from '@/lib/oi/server-key';

/**
 * OSIRIS OI — what the browser may know about the site's own key.
 *
 * GET /api/oi/config
 *   returns  { signedIn, available, provider, model }
 *
 * Booleans and a model name only: whether WorldEye AI is included on this
 * deployment and whether this visitor is signed in to use it. The key
 * itself never leaves the server.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  const userId = await siteAiUserId();
  return json({
    signedIn: userId !== null,
    available: !disabled() && siteAiAvailable(),
    provider: SITE_AI_PROVIDER,
    model: siteAiModel(),
  });
}

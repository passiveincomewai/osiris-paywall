import { getRun } from '@/lib/oi/runs';
import { isProviderId, type ProviderId } from '@/lib/oi/providers';
import { resolveRouteKey, siteKeyHourLimited } from '@/lib/oi/server-key';
import { askPrediction, credentials, disabled, disabledResponse, fail, json, limited, readBody, type Credentials } from '@/lib/oi/service';

/**
 * OSIRIS OI — talk to the simulation after (or during) a run.
 *
 * POST /api/oi/runs/{id}/ask
 *   headers  X-OI-Key (or Authorization: Bearer); X-OI-Provider and X-OI-Model default to the run's
 *   body     { target?: "report" | <id of an actor that played>, message }
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 75;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (disabled()) return disabledResponse();
  const run = getRun((await params).id);
  if (!run) return fail(404, 'No such run.');
  if (limited(req, 'ask', 20)) return fail(429, 'Too many questions. Wait a minute.');
  const body = await readBody(req, 8_000);
  if (!body) return fail(400, 'Send a JSON body: { "target": "report", "message": "…" }.');
  const creds = credentials(req, body);
  if ('error' in creds) return fail(400, creds.error);
  // Asking runs on the run's engine unless the caller chose another, and —
  // with no key of their own — on the site's key under the same fences as
  // starting the run.
  const withRun: Credentials = {
    ...creds,
    provider: creds.provider ?? (isProviderId(run.state.provider) ? (run.state.provider as ProviderId) : undefined),
  };
  const resolved = await resolveRouteKey(withRun);
  if (!resolved.ok) return fail(resolved.status, resolved.error, { code: resolved.code });
  if (resolved.siteUserId && siteKeyHourLimited('ask', resolved.siteUserId)) {
    return fail(429, 'You have asked a lot on the included WorldEye AI this hour. Give it a little while.');
  }

  const asked = await askPrediction(run, body.target, body.message, resolved.creds, req.signal);
  if (!asked.ok) return fail(asked.status, asked.error);
  return json({ id: run.id, target: asked.target, reply: asked.reply });
}

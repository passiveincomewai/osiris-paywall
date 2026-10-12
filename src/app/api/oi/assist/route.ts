import { assistStep } from '@/lib/oi/assist/server';
import { resolveRouteKey, siteKeyHourLimited } from '@/lib/oi/server-key';
import { credentials, disabled, disabledResponse, fail, json, limited, readBody } from '@/lib/oi/service';

/**
 * OSIRIS OI Assist — one step of the conversation.
 *
 * POST /api/oi/assist
 *   headers  X-OI-Provider, X-OI-Key (or Authorization: Bearer), X-OI-Model (optional)
 *   body     { messages: [...], context: { view, layersOn, loaded, forecast } }
 *   returns  { step: { say, actions, done }, usage }
 *
 * The page runs the actions on the map and, when the step is not done, sends
 * their results back for the next step. Nothing is stored here.
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: Request) {
  if (disabled()) return disabledResponse();
  if (limited(req, 'assist', 40)) return fail(429, 'Too many steps in a minute. Wait a moment.');
  const body = await readBody(req, 96_000);
  if (!body) return fail(400, 'Send a JSON body: { "messages": [...], "context": {...} }.');
  const creds = credentials(req, body);
  if ('error' in creds) return fail(400, creds.error);
  // No key of their own: a signed-in visitor runs on the site's key, capped
  // per user per hour; signed out, the resolution itself refuses.
  const resolved = await resolveRouteKey(creds);
  if (!resolved.ok) return fail(resolved.status, resolved.error, { code: resolved.code });
  if (resolved.siteUserId && siteKeyHourLimited('assist', resolved.siteUserId)) {
    return fail(429, 'You have used the included WorldEye AI a lot this hour. Give it a little while — or add your own key in OI settings to use your own quota.');
  }

  const out = await assistStep(body, resolved.creds, req.signal);
  if (!out.ok) return fail(out.status, out.error);
  return json({ step: { say: out.step.say, actions: out.step.calls, done: out.step.done }, usage: out.usage });
}

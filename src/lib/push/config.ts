/**
 * Browser push — VAPID configuration.
 *
 * Push is INERT until the owner sets a VAPID key pair in the
 * deployment environment:
 *   VAPID_PUBLIC_KEY   — base64url P-256 public key
 *   VAPID_PRIVATE_KEY  — base64url P-256 private key
 *   VAPID_SUBJECT      — optional; a mailto: contact for push services
 *                        (defaults to the public contact address)
 *
 * Generate a pair once with:  npx web-push generate-vapid-keys
 * (or `node -e "console.log(require('web-push').generateVAPIDKeys())"`).
 *
 * With either key missing, every push entry point quietly reports
 * "not configured": the settings UI shows an honest not-configured
 * state, /api/push/public-key answers { configured: false }, and the
 * alert checkers skip the push channel. Nothing throws, nothing fakes
 * a delivery.
 */

export interface PushConfig {
  publicKey: string;
  privateKey: string;
  subject: string;
}

const DEFAULT_SUBJECT = "mailto:contact@worldeye.app";

export function getPushConfig(env: NodeJS.ProcessEnv = process.env): PushConfig | null {
  const publicKey = env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = env.VAPID_PRIVATE_KEY?.trim();
  if (!publicKey || !privateKey) return null;
  const subject = env.VAPID_SUBJECT?.trim() || DEFAULT_SUBJECT;
  return { publicKey, privateKey, subject };
}

export function pushConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return getPushConfig(env) !== null;
}

/** The public half is safe to serve to signed-in browsers (it is the
 *  applicationServerKey a device subscribes with). */
export function getVapidPublicKey(env: NodeJS.ProcessEnv = process.env): string | null {
  return getPushConfig(env)?.publicKey ?? null;
}

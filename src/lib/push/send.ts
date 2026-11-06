/**
 * Browser push — delivery.
 *
 * sendPushToUser(userId, message) fans one notification out to every
 * device the user has subscribed. It is deliberately fail-soft: push
 * is a secondary channel next to email, so a push-service outage must
 * never break the alert checker that calls it. Dead endpoints (the
 * push service answering 404/410) are pruned so the table stays
 * honest; transient failures are counted, never retried inline.
 */

import webpush from "web-push";
import { db } from "@/lib/db";
import { getPushConfig } from "./config";
import {
  buildPushPayload,
  isDeadSubscriptionStatus,
  type PushMessage,
} from "./logic";

export interface PushSendSummary {
  /** False when no VAPID keys are configured — nothing was attempted. */
  configured: boolean;
  /** Subscriptions found for the user. */
  attempted: number;
  /** Devices whose push service accepted the notification. */
  accepted: number;
  /** Dead endpoints removed from the table during this send. */
  pruned: number;
}

const NOT_CONFIGURED: PushSendSummary = {
  configured: false,
  attempted: 0,
  accepted: 0,
  pruned: 0,
};

let vapidAppliedFor: string | null = null;

/** Apply the VAPID details to the web-push singleton (once per key). */
function ensureVapid(): boolean {
  const config = getPushConfig();
  if (!config) return false;
  if (vapidAppliedFor !== config.publicKey) {
    webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
    vapidAppliedFor = config.publicKey;
  }
  return true;
}

export async function sendPushToUser(
  userId: string,
  message: PushMessage,
): Promise<PushSendSummary> {
  if (!ensureVapid()) return NOT_CONFIGURED;

  const subs = await db.pushSubscription
    .findMany({ where: { userId } })
    .catch(() => []);
  if (subs.length === 0) {
    return { configured: true, attempted: 0, accepted: 0, pruned: 0 };
  }

  const payload = buildPushPayload(message);
  let accepted = 0;
  let pruned = 0;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload,
        );
        accepted++;
        await db.pushSubscription
          .update({ where: { id: sub.id }, data: { lastSeenAt: new Date() } })
          .catch(() => {});
      } catch (err) {
        const statusCode = (err as { statusCode?: number } | null)?.statusCode;
        if (isDeadSubscriptionStatus(statusCode)) {
          pruned++;
          await db.pushSubscription
            .delete({ where: { id: sub.id } })
            .catch(() => {});
        }
      }
    }),
  );

  return { configured: true, attempted: subs.length, accepted, pruned };
}

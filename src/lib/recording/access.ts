import { auth } from "@/auth";
import { db } from "@/lib/db";

/** Backend Pro check for recording features. Mirrors src/auth.ts logic. */
export async function recordingAccess(): Promise<
  | { ok: true; userId: string; pro: true }
  | { ok: true; userId: string; pro: false }
  | { ok: false }
> {
  const session = await auth().catch(() => null);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return { ok: false };
  const sub = await db.subscription.findUnique({ where: { userId } }).catch(() => null);
  const pro = !!(
    sub &&
    (sub.status === "active" || sub.status === "trialing") &&
    sub.currentPeriodEnd > new Date()
  );
  return { ok: true, userId, pro };
}

import { auth } from "@/auth";

/**
 * Sign-in gate for the shareable-collections API. Collections are a
 * growth feature: ANY signed-in account (free included) may create
 * and manage them — there is deliberately no plan tier here. The
 * shape mirrors lib/enterprise/access so routes and tests read the
 * same way across the codebase.
 */
export async function sharedCollectionsAccess(): Promise<
  { ok: true; userId: string } | { ok: false }
> {
  const session = await auth().catch(() => null);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return { ok: false };
  return { ok: true, userId };
}

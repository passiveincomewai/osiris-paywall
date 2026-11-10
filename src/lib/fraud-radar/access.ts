/**
 * WorldEye Fraud Radar — admin preview access (owner request,
 * 2026-11-10: test Fraud Radar from the admin accounts / admin panel
 * before it is published).
 *
 * The launch/kill switch stays exactly as flag.ts defines it:
 * fraudRadarEnabled() is the only thing that opens Fraud Radar to the
 * public, and with the flag off every public surface keeps behaving
 * as it does today (404, indistinguishable from the route not
 * existing). This module adds ONE narrow exception on top of it:
 *
 *   gate = fraudRadarEnabled() || (await fraudRadarAdminPreview())
 *
 * Every Fraud Radar page and API route composes its existing flag
 * check with this helper. While the flag is OFF, a request is still
 * admitted when — and only when — it carries a signed-in session
 * whose email is on the platform admin allowlist: the SAME
 * ADMIN_EMAILS mechanism (auth() + adminEmails() from
 * @/lib/affiliate/admin) that already gates /admin and
 * /admin/fraud-radar. No second allowlist is introduced.
 *
 * Fail-closed by construction: no session, a non-admin session, or a
 * session that cannot be read at all (thrown error, missing request
 * context) all resolve to false, i.e. the surface stays dark. While
 * the flag is ON the helper is never consulted for admission (the
 * flag leg of the gate short-circuits first); called directly with
 * the flag on it returns false — preview is moot once the feature is
 * live — and it does not touch the session machinery at all.
 *
 * The auth/admin imports are DYNAMIC, inside the function, on
 * purpose: most Fraud Radar surfaces (public pages, search APIs)
 * have no session machinery in their module graph at all, and the
 * repo's unit tests load those surfaces without mocking @/auth (the
 * real next-auth module cannot load under vitest — every suite that
 * needs it mocks it). A static import here would drag @/auth into
 * all of those graphs and break them at collection time. The try/
 * catch wraps the imports for the same reason it wraps the session
 * read: anything unreadable means "not an admin", never an error.
 */
import { fraudRadarEnabled } from "./flag";

export async function fraudRadarAdminPreview(): Promise<boolean> {
  if (fraudRadarEnabled()) return false;
  try {
    const { auth } = await import("@/auth");
    const { adminEmails } = await import("@/lib/affiliate/admin");
    const session = await auth();
    const email = session?.user?.email?.toLowerCase() ?? null;
    if (!email) return false;
    return adminEmails().includes(email);
  } catch {
    return false;
  }
}

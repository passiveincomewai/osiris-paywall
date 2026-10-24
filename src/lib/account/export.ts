// ── Download my data (item 20) ──────────────────────────────────────
// Assembles everything WorldEye holds for one account into a single
// export object. Deliberately excludes secrets: no password hashes, no
// TOTP secrets or backup-code hashes, no raw IPs (hashes only, as
// stored), no Stripe card data (Stripe holds it; we export the
// subscription facts we mirror).

import { db } from "@/lib/db";
import { getPreferences } from "./preferences";

export async function buildAccountExport(userId: string) {
  const [
    user, preferences, savedCameras, alertRules, eventRules, clips,
    shares, sessions, signins, affiliate, subscription,
  ] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: {
        id: true, name: true, email: true, emailVerified: true, phone: true,
        image: true, createdAt: true,
        deletionRequestedAt: true, deletionScheduledFor: true,
      },
    }),
    getPreferences(userId),
    db.savedCamera.findMany({ where: { userId }, select: { id: true, createdAt: true, cameraData: true } }).catch(() => []),
    db.alertRule.findMany({ where: { userId } }).catch(() => []),
    db.eventAlertRule.findMany({ where: { userId } }).catch(() => []),
    db.clipMeta.findMany({
      where: { userId },
      select: { id: true, cameraName: true, durationSec: true, sizeBytes: true, startedAt: true, createdAt: true },
    }).catch(() => []),
    db.clipShare.findMany({
      where: { userId },
      select: { slug: true, title: true, cameraName: true, visibility: true, views: true, createdAt: true, revokedAt: true },
    }).catch(() => []),
    db.userDeviceSession.findMany({
      where: { userId },
      select: { label: true, approximateLocation: true, lastSeenAt: true, createdAt: true, revokedAt: true },
    }).catch(() => []),
    db.userSignInEvent.findMany({
      where: { userId },
      select: { deviceLabel: true, approximateLocation: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    }).catch(() => []),
    db.affiliateProfile.findUnique({
      where: { userId },
      select: { referralCode: true, customCode: true, status: true, xp: true, createdAt: true },
    }).catch(() => null),
    db.subscription.findUnique({
      where: { userId },
      select: { status: true, stripePriceId: true, currentPeriodStart: true, currentPeriodEnd: true, cancelAtPeriodEnd: true },
    }).catch(() => null),
  ]);
  if (!user) return null;
  return {
    exportedAt: new Date().toISOString(),
    account: user,
    preferences,
    subscription,
    affiliateProfile: affiliate,
    savedCameras,
    cameraAlertRules: alertRules,
    eventAlertRules: eventRules,
    recordings: clips,
    sharedClips: shares,
    devices: sessions,
    signInHistory: signins,
  };
}

type ExportData = NonNullable<Awaited<ReturnType<typeof buildAccountExport>>>;

function csvEscape(v: unknown): string {
  const s = v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Flatten the export into section,key,value CSV rows. */
export function accountExportToCsv(data: ExportData): string {
  const rows: string[] = ["section,key,value"];
  const push = (section: string, key: string, value: unknown) =>
    rows.push([csvEscape(section), csvEscape(key), csvEscape(value)].join(","));
  const walk = (section: string, obj: unknown, prefix = "") => {
    if (Array.isArray(obj)) {
      obj.forEach((item, i) => walk(section, item, `${prefix}[${i}]`));
    } else if (obj && typeof obj === "object") {
      for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
        walk(section, v, prefix ? `${prefix}.${k}` : k);
      }
    } else {
      push(section, prefix, obj);
    }
  };
  for (const [section, value] of Object.entries(data)) {
    if (section === "exportedAt") continue;
    walk(section, value);
  }
  return rows.join("\n") + "\n";
}

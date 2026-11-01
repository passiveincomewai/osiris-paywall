// ── Personalised weekly digest for ACCOUNTS (2026-11 expansion, #9) ─
// The newsletter digest (digest.ts) goes to the newsletter list. This
// is its account sibling: users who turned the digest ON in Settings
// (UserPreference.digestEnabled && emailWeeklyDigest — the switches
// that exist today but gate nothing until now) get the same weekly
// content, filtered by their region picks (lib/account/digest's
// filterDigestItems — the filter written for exactly this) and led by
// a personal section: their saved cameras and followed resorts.
//
// Discipline mirrors the newsletter sender + the lifecycle engine:
// excluded inboxes never receive it, User.emailOptOut is honoured,
// the 48h marketing cap applies (any LifecycleEmailLog row in the
// window defers), sends are logged once per (user, issue), and
// UserPreference.digestLastSentAt is stamped with a 6-day minimum gap
// so a manual re-run can never double-send a week.

import { db } from "../db";
import { sendEmail } from "../email";
import { appBaseUrl } from "../app-url";
import { isExcludedEmail, MARKETING_CAP_WINDOW_MS } from "./config";
import { buildDigestContent, digestIssueKey } from "./digest";
import { hasDigestContent, weeklyDigestEmail, type DigestContent } from "./templates";
import { buildUnsubscribeUrl, unsubscribeSecret } from "./unsubscribe";
import { filterDigestItems, type DigestItem } from "../account/digest";
import type { Preferences } from "../account/preferences";
import { getSkiResort } from "../ski-resorts";

export const ACCOUNT_DIGEST_TEMPLATE = "account_weekly_digest";
const MIN_GAP_MS = 6 * 86400_000;

export interface AccountDigestSummary {
  dryRun: boolean;
  issueKey: string;
  candidates: number;
  sent: number;
  skipped: Record<string, number>;
  sampleHtml?: string;
}

/** Region-filter the shared content by the user's picks. Items carry
 * their place text as the region label; storms have no place label
 * beyond the storm name, so a picked-regions user may lose the storm
 * section — the honest outcome of the filter they chose. */
export function filterContentForRegions(content: DigestContent, regions: string[]): DigestContent {
  const picks = regions.map((r) => r.trim()).filter(Boolean);
  if (picks.length === 0) return content;
  const prefs = { digestRegions: regions } as unknown as Preferences;
  const quakes = filterDigestItems(
    prefs,
    content.quakes.map((q) => ({ ...q, regions: [q.place] }) as DigestItem & typeof q),
  );
  const topCountries = filterDigestItems(
    prefs,
    content.topCountries.map((t) => ({ ...t, regions: [t.name] }) as DigestItem & typeof t),
  );
  const fireTitles = filterDigestItems(
    prefs,
    content.fireTitles.map((t) => ({ title: t, regions: [t] })),
  ).map((x) => x.title);
  const storms = filterDigestItems(
    prefs,
    content.storms.map((s) => ({ ...s, regions: [s.name] }) as DigestItem & typeof s),
  );
  return {
    weekLabel: content.weekLabel,
    topCountries,
    quakes,
    fireCount: fireTitles.length > 0 ? fireTitles.length : 0,
    fireTitles,
    storms,
  };
}

export async function runAccountDigest(
  opts: { dryRun?: boolean; now?: Date } = {},
): Promise<AccountDigestSummary> {
  const now = opts.now ?? new Date();
  const issueKey = digestIssueKey(now);
  const summary: AccountDigestSummary = {
    dryRun: !!opts.dryRun,
    issueKey,
    candidates: 0,
    sent: 0,
    skipped: {},
  };
  const skip = (reason: string) => {
    summary.skipped[reason] = (summary.skipped[reason] ?? 0) + 1;
  };

  const content = await buildDigestContent(now);

  const prefRows = await db.userPreference.findMany({
    where: { digestEnabled: true, emailWeeklyDigest: true },
    select: { userId: true, digestRegions: true, digestLastSentAt: true },
    take: 1000,
  });
  summary.candidates = prefRows.length;
  const capSince = new Date(now.getTime() - MARKETING_CAP_WINDOW_MS);

  for (const row of prefRows) {
    const user = await db.user.findUnique({
      where: { id: row.userId },
      select: { id: true, email: true, name: true, emailOptOut: true },
    });
    if (!user?.email) {
      skip("no_email");
      continue;
    }
    if (isExcludedEmail(user.email)) {
      skip("excluded");
      continue;
    }
    if (user.emailOptOut) {
      skip("opted_out");
      continue;
    }
    if (row.digestLastSentAt && now.getTime() - row.digestLastSentAt.getTime() < MIN_GAP_MS) {
      skip("too_soon");
      continue;
    }
    const already = await db.lifecycleEmailLog.findUnique({
      where: {
        userId_template_contextKey: {
          userId: user.id,
          template: ACCOUNT_DIGEST_TEMPLATE,
          contextKey: issueKey,
        },
      },
      select: { id: true },
    });
    if (already) {
      skip("already_sent");
      continue;
    }
    const recentMarketing = await db.lifecycleEmailLog.findFirst({
      where: { userId: user.id, createdAt: { gt: capSince } },
      select: { id: true },
    });
    if (recentMarketing) {
      skip("cap_48h");
      continue;
    }

    const [savedCameras, follows] = await Promise.all([
      db.savedCamera.findMany({
        where: { userId: user.id },
        select: { name: true },
        orderBy: { sortOrder: "asc" },
        take: 100,
      }),
      db.skiResortFollow.findMany({
        where: { userId: user.id },
        select: { resortSlug: true },
        take: 20,
      }),
    ]);
    const personal = {
      savedCameraNames: savedCameras.slice(0, 5).map((c) => c.name),
      savedCameraCount: savedCameras.length,
      resortNames: follows
        .map((f) => getSkiResort(f.resortSlug)?.name ?? f.resortSlug)
        .slice(0, 6),
    };
    const hasPersonal = personal.savedCameraCount > 0 || personal.resortNames.length > 0;
    const filtered = filterContentForRegions(content, row.digestRegions);
    if (!hasDigestContent(filtered) && !hasPersonal) {
      skip("no_content");
      continue;
    }

    const secret = unsubscribeSecret();
    const unsubscribeUrl = secret
      ? buildUnsubscribeUrl(appBaseUrl(), user.id, secret)
      : null;
    const rendered = weeklyDigestEmail({
      content: filtered,
      unsubscribeUrl,
      personal,
    });
    if (summary.dryRun) {
      summary.sent++;
      summary.sampleHtml ??= rendered.html;
      continue;
    }
    const ok = await sendEmail(user.email, rendered.subject, rendered.html);
    if (!ok) {
      skip("send_failed");
      continue;
    }
    await db.lifecycleEmailLog.create({
      data: { userId: user.id, recipientEmail: user.email, template: ACCOUNT_DIGEST_TEMPLATE, contextKey: issueKey, kind: "marketing", subject: rendered.subject, status: "sent" },
    });
    await db.userPreference.update({
      where: { userId: user.id },
      data: { digestLastSentAt: now },
    });
    summary.sent++;
  }
  return summary;
}

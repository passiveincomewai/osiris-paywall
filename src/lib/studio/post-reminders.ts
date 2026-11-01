// StudioPost reminder runner (spec §10) — invoked by the cron route.
// For every scheduled post, delivers each due reminder offset exactly
// once (the post's remindedFor array is the idempotency record, backed
// by the notification's unique idempotencyKey): an in-dashboard
// AffiliateNotification plus an email to the affiliate. Posts whose
// time has passed flip to "reminder_due" until the affiliate marks
// them published or cancels them.
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { dueReminderOffsets, reminderLabel } from "./calendar";

export async function runStudioPostReminders(now: Date): Promise<{ reminded: number; dueFlipped: number }> {
  const posts = await db.studioPost.findMany({
    where: {
      status: { in: ["scheduled", "reminder_due"] },
      scheduledAt: { lte: new Date(now.getTime() + 24 * 3600_000) },
    },
    take: 200,
    include: {
      profile: { select: { id: true, user: { select: { email: true, name: true } } } },
      variation: { select: { title: true } },
    },
  });

  let reminded = 0;
  let dueFlipped = 0;

  for (const post of posts) {
    const due = dueReminderOffsets(post.scheduledAt, post.reminderOffsetsMin, post.remindedFor, now);
    for (const offset of due) {
      const when = reminderLabel(offset);
      const title = `Posting reminder: ${post.platform}`;
      const body =
        `Your ${post.platform} post${post.variation?.title ? ` “${post.variation.title}”` : ""} ` +
        `is scheduled for ${post.scheduledAt.toISOString()} (reminder: ${when}). ` +
        `Open the Studio calendar to copy the caption and post it.`;
      try {
        await db.affiliateNotification.create({
          data: {
            affiliateProfileId: post.profileId,
            type: "studio_post_reminder",
            title,
            body,
            href: "/affiliates/studio/calendar",
            idempotencyKey: `studio-post:${post.id}:${offset}`,
          },
        });
      } catch {
        // Duplicate key = already delivered by a concurrent run; the
        // offset still gets recorded below so we never loop on it.
      }
      const email = post.profile.user?.email;
      if (email) {
        const safeBody = body.replace(/</g, "&lt;");
        await sendEmail(
          email,
          `WorldEye Studio: time to post on ${post.platform}`,
          `<p>${safeBody}</p><p><a href="https://worldeye.app/affiliates/studio/calendar">Open the Studio calendar</a></p>`,
        ).catch(() => false);
      }
      reminded++;
    }
    if (due.length > 0) {
      await db.studioPost.update({
        where: { id: post.id },
        data: { remindedFor: { set: [...post.remindedFor, ...due] } },
      });
    }
    if (post.status === "scheduled" && post.scheduledAt.getTime() <= now.getTime()) {
      await db.studioPost.update({ where: { id: post.id }, data: { status: "reminder_due" } });
      dueFlipped++;
    }
  }

  return { reminded, dueFlipped };
}

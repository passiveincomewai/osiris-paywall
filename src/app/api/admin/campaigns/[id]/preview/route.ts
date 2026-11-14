// Admin: render a campaign's email exactly as it would send, against
// a real recipient (?recipientId=) or the first pending one. Uses the
// same renderCampaignEmail as the tick engine — preview == send.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/affiliate/admin";
import { renderCampaignEmail } from "@/lib/campaigns/send";
import { templateTokens } from "@/lib/campaigns/templates";

export const runtime = "nodejs";

function forbidden(e: unknown) {
  return NextResponse.json({ error: "Forbidden" }, { status: (e as { status?: number }).status ?? 403 });
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await requireAdmin();
  } catch (e) {
    return forbidden(e);
  }
  const campaign = await db.emailCampaign.findUnique({ where: { id } });
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  const url = new URL(req.url);
  const recipientId = url.searchParams.get("recipientId");
  const recipient = recipientId
    ? await db.campaignRecipient.findFirst({ where: { id: recipientId, campaignId: id } })
    : ((await db.campaignRecipient.findFirst({
        where: { campaignId: id, status: "pending" },
        orderBy: { createdAt: "asc" },
      })) ??
      (await db.campaignRecipient.findFirst({
        where: { campaignId: id },
        orderBy: { createdAt: "asc" },
      })));

  // Unsaved editor state can be previewed too: ?subject=&bodyText=
  // overrides ride along from the detail page's editors.
  const subject = url.searchParams.get("subject") ?? campaign.subject;
  const bodyText = url.searchParams.get("bodyText") ?? campaign.bodyText;
  const bodyHtmlParam = url.searchParams.get("bodyHtml");
  const bodyHtml = bodyHtmlParam !== null ? bodyHtmlParam || null : campaign.bodyHtml;

  const meta = (recipient?.meta ?? {}) as Record<string, unknown>;
  const rendered = renderCampaignEmail({ subject, bodyText, bodyHtml }, meta);
  return NextResponse.json({
    recipient: recipient ? { id: recipient.id, email: recipient.email, meta } : null,
    tokens: templateTokens(`${subject}\n${bodyText}\n${bodyHtml ?? ""}`),
    ...rendered,
  });
}

// GET/POST /api/affiliate/notifications — in-dashboard notification
// center. GET syncs (lazily, from the real ledger tables) and lists;
// POST marks read (all, or a list of ids).
import { NextResponse } from "next/server";
import { listNotifications, markNotificationsRead } from "@/lib/affiliate/notifications";
import { requireAffiliate } from "../_util";

export const runtime = "nodejs";

export async function GET() {
  const { profile, error } = await requireAffiliate();
  if (error) return error;
  const { items, unread } = await listNotifications(profile.id);
  return NextResponse.json({
    unread,
    notifications: items.map((n) => ({
      id: n.id, type: n.type, title: n.title, body: n.body, href: n.href,
      read: n.readAt !== null, createdAt: n.createdAt,
    })),
  });
}

export async function POST(req: Request) {
  const { profile, error } = await requireAffiliate();
  if (error) return error;
  const { ids } = (await req.json().catch(() => ({}))) as { ids?: string[] };
  const marked = await markNotificationsRead(profile.id, Array.isArray(ids) ? ids.slice(0, 100) : undefined);
  return NextResponse.json({ ok: true, marked });
}

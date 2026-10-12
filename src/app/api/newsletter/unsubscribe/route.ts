import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { appUrl } from "@/lib/email";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  if (token) {
    await db.newsletterSubscriber.deleteMany({ where: { unsubToken: token } }).catch(() => {});
  }
  return NextResponse.redirect(appUrl("/?newsletter=unsubscribed"));
}

// GET /api/affiliate/qr?code= — QR code PNG data URL for a referral link.
import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { referralLinkFor } from "@/lib/affiliate/brand";
import { REF_CODE_RE } from "@/lib/affiliate/attribution";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = (searchParams.get("code") ?? "").toLowerCase();
  if (!REF_CODE_RE.test(code)) return NextResponse.json({ error: "Bad code" }, { status: 400 });
  const url = referralLinkFor(code);
  const dataUrl = await QRCode.toDataURL(url, { width: 512, margin: 2, color: { dark: "#0a1628", light: "#ffffff" } });
  return NextResponse.json({ url, qr: dataUrl });
}

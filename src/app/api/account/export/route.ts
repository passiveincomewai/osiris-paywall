// GET /api/account/export?format=json|csv — download my data (item 20).
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { accountExportToCsv, buildAccountExport } from "@/lib/account/export";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const format = new URL(req.url).searchParams.get("format") === "csv" ? "csv" : "json";
  const data = await buildAccountExport(userId);
  if (!data) return NextResponse.json({ error: "Account not found" }, { status: 404 });
  const stamp = new Date().toISOString().slice(0, 10);
  if (format === "csv") {
    return new NextResponse(accountExportToCsv(data), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="worldeye-my-data-${stamp}.csv"`,
      },
    });
  }
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="worldeye-my-data-${stamp}.json"`,
    },
  });
}

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPastDueState } from "@/lib/billing/dunning";

export const runtime = "nodejs";

// GET /api/billing/past-due — the caller's past-due banner state.
// Returns { pastDue: false } unless the caller's OWN subscription row
// (looked up by session user id — the request names nothing) is
// past_due; then the open invoice's pay/update target, resolved
// server-side from Stripe. Feeds components/PastDueBanner; the email
// recovery path (webhook dunning) is independent of this route.
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const state = await getPastDueState(userId).catch(() => null);
  if (!state) return NextResponse.json({ pastDue: false });

  return NextResponse.json(
    {
      pastDue: true,
      invoiceId: state.invoiceId,
      hostedInvoiceUrl: state.hostedInvoiceUrl,
      amountLabel: state.amountLabel,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

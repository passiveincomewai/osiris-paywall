import { NextRequest, NextResponse } from "next/server";
import { gateEnterprise } from "@/lib/enterprise/http";
import { enterpriseCatalogueById } from "@/lib/enterprise/catalogue";
import { feedEligibility } from "@/lib/enterprise/rights";

export const runtime = "nodejs";
/* A cold instance may first have to build the camera catalogue in-process. */
export const maxDuration = 60;

/**
 * Catalogue search for the collection picker: name / city / country /
 * id substring match, each result carrying its live rights verdict so
 * the customer sees BEFORE adding a pick whether it can ship in a feed.
 */
export async function GET(req: NextRequest) {
  const gate = await gateEnterprise();
  if (!gate.ok) return gate.response;
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().toLowerCase();
  if (q.length < 2) {
    return NextResponse.json({ error: "q must be at least 2 characters" }, { status: 400 });
  }
  const byId = await enterpriseCatalogueById();
  if (!byId) {
    return NextResponse.json(
      { error: "catalogue-unavailable", message: "The camera catalogue is still loading. Try again in a moment." },
      { status: 503 },
    );
  }
  const results = [];
  for (const cam of byId.values()) {
    const haystack = `${cam.name ?? ""} ${cam.city ?? ""} ${cam.country ?? ""} ${cam.id}`.toLowerCase();
    if (!haystack.includes(q)) continue;
    const verdict = feedEligibility(cam);
    results.push({
      id: cam.id,
      name: cam.name ?? cam.id,
      city: cam.city ?? "",
      country: cam.country ?? "",
      source: cam.source ?? "",
      eligible: verdict.eligible,
      reason: verdict.basis,
    });
    if (results.length >= 30) break;
  }
  return NextResponse.json({ results });
}

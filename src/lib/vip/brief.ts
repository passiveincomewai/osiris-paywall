/**
 * The personal brief (VIP Pro) — Today in the Sky is generic and
 * free; this is the version built from YOUR account: your watched
 * places, your camera-alert events, your event-alert events, plus the
 * planet around your places (quakes near them, ISS passes over them)
 * and the next two days of launches.
 *
 * The page renders it on demand; the same builder feeds the optional
 * daily email digest (opt-in per user, VipBriefPref), sent by
 * /api/cron/vip-brief.
 */
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { getLaunchesPayload } from "@/lib/launches/server";
import { getUserTier } from "@/lib/vip/tier";
import { fetchIssTle, fetchQuakes } from "./events/feeds";
import {
  computePasses,
  haversineKm,
  tlePropagator,
  type IssPass,
  type QuakeInput,
} from "./events/logic";
import { briefEmail, type BriefEmailSection } from "./events/email";

export interface BriefPlace {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radiusKm: number;
}

export interface BriefQuake extends QuakeInput {
  nearPlace: string | null;
}

export interface BriefPass {
  placeName: string;
  pass: IssPass;
}

export interface PersonalBrief {
  generatedAt: string;
  places: BriefPlace[];
  cameraEvents: { id: string; cameraName: string; observation: string; createdAt: string }[];
  eventEvents: { id: string; kind: string; title: string; createdAt: string }[];
  quakesNear: BriefQuake[];
  quakesStrongest: BriefQuake[];
  launches: { id: string; name: string; netMs: number | null; providerName: string | null; padLocation: string | null }[];
  passes: BriefPass[];
  emailEnabled: boolean;
}

/** Strongest quakes worldwide + quakes near any watched place. Pure. */
export function shapeBriefQuakes(
  quakes: QuakeInput[],
  places: BriefPlace[],
  nowMs: number,
): { near: BriefQuake[]; strongest: BriefQuake[] } {
  const dayAgo = nowMs - 24 * 3_600_000;
  const recent = quakes.filter((q) => q.timeMs >= dayAgo);
  const near: BriefQuake[] = [];
  for (const q of recent) {
    for (const p of places) {
      if (haversineKm(p, q) <= p.radiusKm) {
        near.push({ ...q, nearPlace: p.name });
        break;
      }
    }
  }
  near.sort((a, b) => b.mag - a.mag);
  const strongest = [...recent]
    .sort((a, b) => b.mag - a.mag)
    .slice(0, 5)
    .map((q) => ({ ...q, nearPlace: null }));
  return { near: near.slice(0, 6), strongest };
}

/** The single best (highest-peak) pass per place. Pure. */
export function bestPassPerPlace(
  passesByPlace: { placeName: string; passes: IssPass[] }[],
): BriefPass[] {
  const out: BriefPass[] = [];
  for (const { placeName, passes } of passesByPlace) {
    let best: IssPass | null = null;
    for (const p of passes) {
      if (!best || p.peakElevationDeg > best.peakElevationDeg) best = p;
    }
    if (best) out.push({ placeName, pass: best });
  }
  return out;
}

export async function getBriefPref(userId: string): Promise<{ emailEnabled: boolean }> {
  const pref = await db.vipBriefPref
    .findUnique({ where: { userId }, select: { emailEnabled: true } })
    .catch(() => null);
  return { emailEnabled: pref?.emailEnabled ?? false };
}

export async function setBriefEmail(userId: string, enabled: boolean): Promise<void> {
  await db.vipBriefPref.upsert({
    where: { userId },
    create: { userId, emailEnabled: enabled },
    update: { emailEnabled: enabled },
  });
}

export async function buildBrief(userId: string, now: Date = new Date()): Promise<PersonalBrief> {
  const nowMs = now.getTime();
  const dayAgo = new Date(nowMs - 24 * 3_600_000);
  const [placeRows, cameraEvents, eventEvents, pref] = await Promise.all([
    db.vipPlace.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    db.alertEvent.findMany({
      where: { userId, createdAt: { gte: dayAgo } },
      include: { rule: { select: { cameraName: true } } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    db.eventAlertEvent.findMany({
      where: { userId, createdAt: { gte: dayAgo } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    getBriefPref(userId),
  ]);
  const places: BriefPlace[] = placeRows.map((p) => ({
    id: p.id,
    name: p.name,
    lat: p.lat,
    lng: p.lng,
    radiusKm: p.radiusKm,
  }));

  const [quakes, launchesPayload, issTle] = await Promise.all([
    fetchQuakes(),
    getLaunchesPayload().catch(() => null),
    places.length ? fetchIssTle(nowMs) : Promise.resolve(null),
  ]);
  const shaped = shapeBriefQuakes(quakes, places, nowMs);

  const launches = (launchesPayload?.upcoming ?? [])
    .map((l) => ({
      id: l.id,
      name: l.name,
      netMs: l.net ? Date.parse(l.net) : null,
      providerName: l.providerName,
      padLocation: l.padLocation,
    }))
    .filter((l) => l.netMs !== null && l.netMs >= nowMs - 3_600_000 && l.netMs <= nowMs + 48 * 3_600_000)
    .sort((a, b) => (a.netMs ?? 0) - (b.netMs ?? 0))
    .slice(0, 6);

  let passes: BriefPass[] = [];
  if (issTle && places.length) {
    const propagate = tlePropagator(issTle.line1, issTle.line2);
    passes = bestPassPerPlace(
      places.map((p) => ({
        placeName: p.name,
        passes: computePasses(propagate, p, nowMs, nowMs + 24 * 3_600_000, 10),
      })),
    );
  }

  return {
    generatedAt: now.toISOString(),
    places,
    cameraEvents: cameraEvents.map((e) => ({
      id: e.id,
      cameraName: e.rule.cameraName,
      observation: e.observation,
      createdAt: e.createdAt.toISOString(),
    })),
    eventEvents: eventEvents.map((e) => ({
      id: e.id,
      kind: e.kind,
      title: e.title,
      createdAt: e.createdAt.toISOString(),
    })),
    quakesNear: shaped.near,
    quakesStrongest: shaped.strongest,
    launches,
    passes,
    emailEnabled: pref.emailEnabled,
  };
}

/** Flatten a brief into email sections. Empty sections drop out. */
export function briefToEmailSections(brief: PersonalBrief): BriefEmailSection[] {
  const sections: BriefEmailSection[] = [];
  const alertLines = [
    ...brief.eventEvents.map((e) => `• ${e.title}`),
    ...brief.cameraEvents.map((e) => `• Camera alert — ${e.cameraName}: ${e.observation}`),
  ];
  if (alertLines.length) sections.push({ heading: "Your alerts (24h)", lines: alertLines });
  if (brief.quakesNear.length) {
    sections.push({
      heading: "Earthquakes near your places",
      lines: brief.quakesNear.map(
        (q) => `• M${q.mag.toFixed(1)} — ${q.place} (near ${q.nearPlace})`,
      ),
    });
  }
  if (brief.quakesStrongest.length) {
    sections.push({
      heading: "Strongest worldwide (24h)",
      lines: brief.quakesStrongest.map((q) => `• M${q.mag.toFixed(1)} — ${q.place}`),
    });
  }
  if (brief.launches.length) {
    sections.push({
      heading: "Launches (next 48h)",
      lines: brief.launches.map(
        (l) => `• ${l.name} — ${l.netMs ? new Date(l.netMs).toUTCString() : "NET to be confirmed"}`,
      ),
    });
  }
  if (brief.passes.length) {
    sections.push({
      heading: "Best ISS pass per place (24h)",
      lines: brief.passes.map(
        (p) =>
          `• ${p.placeName}: peaks ~${Math.round(p.pass.peakElevationDeg)}° at ${new Date(p.pass.peakMs).toUTCString()}`,
      ),
    });
  }
  return sections;
}

export interface BriefSendSummary {
  candidates: number;
  sent: number;
  skippedEmpty: number;
  skippedNotVip: number;
}

/** The daily digest run: opted-in, still-VIP owners, ≤1 per 20h. */
export async function sendDailyBriefs(now: Date = new Date()): Promise<BriefSendSummary> {
  const summary: BriefSendSummary = { candidates: 0, sent: 0, skippedEmpty: 0, skippedNotVip: 0 };
  const prefs = await db.vipBriefPref.findMany({
    where: { emailEnabled: true },
    include: { user: { select: { email: true, name: true } } },
    take: 500,
  });
  summary.candidates = prefs.length;
  const minGap = 20 * 3_600_000;
  for (const pref of prefs) {
    if (pref.lastSentAt && now.getTime() - pref.lastSentAt.getTime() < minGap) continue;
    if ((await getUserTier(pref.userId)) !== "vip") {
      summary.skippedNotVip++;
      continue;
    }
    const email = pref.user.email;
    if (!email) continue;
    const brief = await buildBrief(pref.userId, now);
    const sections = briefToEmailSections(brief);
    if (!sections.length) {
      summary.skippedEmpty++;
      continue;
    }
    const mail = briefEmail({ name: pref.user.name, sections });
    const sent = await sendEmail(email, mail.subject, mail.html).catch(() => false);
    if (sent) {
      summary.sent++;
      await db.vipBriefPref
        .update({ where: { userId: pref.userId }, data: { lastSentAt: now } })
        .catch(() => undefined);
    }
  }
  return summary;
}

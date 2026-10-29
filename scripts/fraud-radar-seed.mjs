/**
 * Fraud Radar registry seed (spec §5) — idempotent upsert of the
 * canonical source definitions from src/lib/fraud-radar/sources.ts
 * into FrDataSource. Run manually by an operator AFTER the
 * fraud_radar_registry migration has been applied to the target DB:
 *
 *   node --experimental-strip-types scripts/fraud-radar-seed.mjs
 *
 * Safe to re-run: rows are upserted by slug and import-run history is
 * never touched. This script is NOT part of any build or deploy.
 */
import { PrismaClient } from "@prisma/client";
import { FRAUD_RADAR_SOURCES } from "../src/lib/fraud-radar/sources.ts";

const db = new PrismaClient();
try {
  for (const s of FRAUD_RADAR_SOURCES) {
    const data = {
      name: s.name,
      engine: s.engine,
      officialUrl: s.officialUrl,
      accessUrl: s.accessUrl,
      accessType: s.accessType,
      apiKeyRequirement: s.apiKeyRequirement,
      license: s.license,
      commercialUse: s.commercialUse,
      dataFields: s.dataFields,
      coverageStart: s.coverageStart,
      coverageEnd: s.coverageEnd,
      limitations: s.limitations,
      cadence: s.cadence,
      notes: s.notes,
    };
    await db.frDataSource.upsert({
      where: { slug: s.slug },
      // Status is operator state, not seed data: only set it on create
      // so re-seeding never resets a source that has since imported.
      create: { slug: s.slug, status: s.status, ...data },
      update: data,
    });
    console.log(`seeded ${s.slug}`);
  }
  console.log(`done: ${FRAUD_RADAR_SOURCES.length} sources`);
} finally {
  await db.$disconnect();
}

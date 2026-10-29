/**
 * Fraud Radar registry seed (spec §5) — idempotent upsert of the
 * canonical source definitions from src/lib/fraud-radar/sources.ts
 * into FrDataSource. Run manually by an operator AFTER the
 * fraud_radar_registry migration has been applied to the target DB:
 *
 *   node --experimental-strip-types scripts/fraud-radar-seed.mjs
 *
 * Safe to re-run: rows are upserted by slug and import-run history is
 * never touched. The upsert writes EVERY seed field on both create and
 * update — including status and the ingest-provenance fields
 * (sourceVersion, lastPublishedAt, lastImportedAt, lastVerifiedAt,
 * completeness) — so re-seeding syncs existing rows to the canonical
 * seed in sources.ts (a source is only "ingested" in the seed once its
 * pipeline manifest verifies the import; provenance an ingested source
 * does not carry, e.g. LEIE's publish date, is written as NULL, never
 * invented). `lastError` is runtime state, not seed data, and is never
 * written here. This script is NOT part of any build or deploy.
 */
import { PrismaClient } from "@prisma/client";
import { FRAUD_RADAR_SOURCES } from "../src/lib/fraud-radar/sources.ts";

const toDate = (v) => (v == null ? null : new Date(v));

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
      status: s.status,
      sourceVersion: s.sourceVersion ?? null,
      lastPublishedAt: toDate(s.lastPublishedAt),
      lastImportedAt: toDate(s.lastImportedAt),
      lastVerifiedAt: toDate(s.lastVerifiedAt),
      completeness: s.completeness ?? null,
    };
    await db.frDataSource.upsert({
      where: { slug: s.slug },
      create: { slug: s.slug, ...data },
      update: data,
    });
    console.log(`seeded ${s.slug}`);
  }
  console.log(`done: ${FRAUD_RADAR_SOURCES.length} sources`);
} finally {
  await db.$disconnect();
}

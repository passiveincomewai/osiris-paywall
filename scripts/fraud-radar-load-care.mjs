/**
 * Fraud Radar Phase 3 — load the care programs Neon grain (AUDIT §15a).
 *
 * Reads a published care artifact directory (produced by
 * app-publish/publish_care.py) and replaces, per dataset version:
 *   - FrMedicareHcpcsSummary   (from medicare-hcpcs.json)
 *   - FrMedicareYearlySummary  (from medicare-national.json)
 *   - FrHospiceProvider        (from directories.json, Care Compare)
 *   - FrHomeHealthAgency       (from directories.json, Care Compare)
 * and appends FrImportRun rows to the registry for source
 * "cms-medicare" (one per publication, deduped by version + sha256).
 *
 * Run manually by an operator AFTER the
 * fraud_radar_care_summaries migration has been applied:
 *
 *   node scripts/fraud-radar-load-care.mjs <artifactDir>
 *
 * Idempotent: grain rows are replaced per dataset version on every
 * run; import-run history is append-only and deduped. NOT part of
 * any build or deploy. Amounts are DERIVED from published averages
 * and stay labelled derived end-to-end.
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

const artifactDir = process.argv[2];
if (!artifactDir) {
  console.error("usage: node scripts/fraud-radar-load-care.mjs <artifactDir>");
  process.exit(2);
}

const readJson = (name) => JSON.parse(readFileSync(path.join(artifactDir, name), "utf8"));
const datasetRaw = readFileSync(path.join(artifactDir, "dataset.json"));
const dataset = JSON.parse(datasetRaw);
const publishManifest = readJson("publish-manifest.json");
const hcpcs = readJson("medicare-hcpcs.json"); // positional rows
const national = readJson("medicare-national.json"); // positional rows
const directories = readJson("directories.json"); // plain objects
const version = dataset.version;
const ccVersion = dataset.directories.careCompareVersion;
const datasetSha = createHash("sha256").update(datasetRaw).digest("hex");

const toDate = (v) => (v == null ? null : new Date(`${v}T00:00:00.000Z`));
const dec = (v) => (v == null ? null : String(v));

const db = new PrismaClient();
try {
  const source = await db.frDataSource.findUnique({ where: { slug: "cms-medicare" } });
  if (!source) throw new Error("registry source cms-medicare not found — run the registry seed first");

  await db.$transaction(
    async (tx) => {
      await tx.frMedicareHcpcsSummary.deleteMany({ where: { datasetVersion: version } });
      const hcpcsRows = hcpcs.map((r) => ({
        datasetVersion: version,
        hcpcsCode: r[0],
        hcpcsDesc: r[1],
        dataYear: r[2],
        distinctProviders: r[3],
        totalServices: dec(r[4]),
        benesReported: BigInt(r[5] ?? 0),
        pymtDerivedUsd: dec(r[6]),
        allowedDerivedUsd: dec(r[7]),
        stdzdDerivedUsd: dec(r[8]),
        submittedDerivedUsd: dec(r[9]),
        sourceRows: BigInt(r[10] ?? 0),
      }));
      for (let i = 0; i < hcpcsRows.length; i += 1000) {
        await tx.frMedicareHcpcsSummary.createMany({ data: hcpcsRows.slice(i, i + 1000) });
      }

      await tx.frMedicareYearlySummary.deleteMany({ where: { datasetVersion: version } });
      const natRows = national.map((r) => ({
        datasetVersion: version,
        dataYear: r[0],
        distinctProviders: r[1],
        distinctHcpcs: r[2],
        totalServices: dec(r[3]),
        benesReported: BigInt(r[4] ?? 0),
        pymtDerivedUsd: dec(r[5]),
        allowedDerivedUsd: dec(r[6]),
        stdzdDerivedUsd: dec(r[7]),
        submittedDerivedUsd: dec(r[8]),
        sourceRows: BigInt(r[9] ?? 0),
      }));
      await tx.frMedicareYearlySummary.createMany({ data: natRows });

      await tx.frHospiceProvider.deleteMany({ where: { datasetVersion: ccVersion } });
      const hospiceRows = directories.hospice.map((h) => ({
        datasetVersion: ccVersion,
        ccn: h.ccn,
        facilityName: h.facilityName,
        addressLine1: h.addressLine1,
        addressLine2: h.addressLine2,
        city: h.city,
        state: h.state,
        zipCode: h.zipCode,
        county: h.county,
        phone: h.phone,
        cmsRegion: h.cmsRegion,
        ownershipType: h.ownershipType,
        certificationDate: toDate(h.certificationDate),
      }));
      for (let i = 0; i < hospiceRows.length; i += 1000) {
        await tx.frHospiceProvider.createMany({ data: hospiceRows.slice(i, i + 1000) });
      }

      await tx.frHomeHealthAgency.deleteMany({ where: { datasetVersion: ccVersion } });
      const hhRows = directories.homeHealth.map((h) => ({
        datasetVersion: ccVersion,
        ccn: h.ccn,
        providerName: h.providerName,
        address: h.address,
        city: h.city,
        state: h.state,
        zipCode: h.zipCode,
        phone: h.phone,
        ownershipType: h.ownershipType,
        certificationDate: toDate(h.certificationDate),
        qualityStarRating: dec(h.qualityStarRating),
        qualityStarFootnote: h.qualityStarFootnote,
        offersNursing: h.offersNursing,
        offersPhysicalTherapy: h.offersPhysicalTherapy,
        offersOccupationalTherapy: h.offersOccupationalTherapy,
        offersSpeechPathology: h.offersSpeechPathology,
        offersMedicalSocial: h.offersMedicalSocial,
        offersHomeHealthAide: h.offersHomeHealthAide,
      }));
      for (let i = 0; i < hhRows.length; i += 1000) {
        await tx.frHomeHealthAgency.createMany({ data: hhRows.slice(i, i + 1000) });
      }

      console.log(
        `loaded FrMedicareHcpcsSummary=${hcpcsRows.length} FrMedicareYearlySummary=${natRows.length} ` +
          `FrHospiceProvider=${hospiceRows.length} FrHomeHealthAgency=${hhRows.length}`,
      );
    },
    { timeout: 600_000 },
  );

  const existing = await db.frImportRun.findFirst({
    where: { sourceId: source.id, datasetVersion: version, artifactSha256: datasetSha },
  });
  if (existing) {
    console.log("import run already recorded for this publish; skipped");
  } else {
    await db.frImportRun.create({
      data: {
        sourceId: source.id,
        datasetVersion: version,
        status: "succeeded",
        finishedAt: new Date(),
        rowsProcessed: BigInt(hcpcs.length + national.length),
        rowsValid: BigInt(hcpcs.length + national.length),
        rowsQuarantined: 0n,
        artifactPath: `fraud-radar/care/${version}`,
        artifactSha256: datasetSha,
        manifest: {
          kind: "app-artifact-publish",
          dataset: dataset.dataset,
          version,
          yearsPresent: dataset.yearsPresent,
          providers: dataset.providers,
          directories: dataset.directories,
          crossChecks: publishManifest.crossChecks,
        },
      },
    });
    console.log("recorded FrImportRun for the care aggregates publication");
  }
  console.log("done");
} finally {
  await db.$disconnect();
}

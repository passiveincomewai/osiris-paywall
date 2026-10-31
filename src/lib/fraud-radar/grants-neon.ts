/**
 * Fraud Radar Phase 4 — Neon grain reads (AUDIT §15a).
 *
 * Small grains live in Neon: the grants yearly summary, the ALN ×
 * attributed-fiscal-year summary, the agency × attributed-fiscal-
 * year summary (all USAspending generation 2026-10-06), and the
 * FAC yearly summary (FAC vintage 2026-10-31_ay2026). The recipient
 * grain lives in versioned artifacts (grants-data.ts). Fail-soft
 * like care-neon.ts: absent tables/rows render an honest
 * "not loaded yet" state, never a 500.
 *
 * Money crosses the Prisma boundary as Decimal. USAspending amounts
 * are AWARD-CUMULATIVE snapshot totals (see grants-data.ts
 * MEASURE_NOTE) — the attributed fiscal year assigns each award to
 * one year without changing what the amounts mean. FAC expended is
 * auditee-reported; questioned costs are flag counts only.
 */
import { db } from "@/lib/db";
import { DEFAULT_FAC_VERSION, DEFAULT_GRANTS_VERSION } from "./grants-data";

export interface GrantsYearlyRow {
  fiscalYear: number;
  awards: number;
  distinctRecipients: number;
  obligatedAwardCumulativeUsd: number;
  outlayAwardCumulativeUsd: number;
  subawardsCount: number;
  subawardAmountUsd: number;
}

export async function listGrantsYearly(
  version: string = DEFAULT_GRANTS_VERSION,
): Promise<GrantsYearlyRow[] | null> {
  try {
    const rows = await db.frGrantsYearlySummary.findMany({
      where: { datasetVersion: version },
      orderBy: { fiscalYear: "asc" },
    });
    if (rows.length === 0) return null;
    return rows.map((r) => ({
      fiscalYear: r.fiscalYear,
      awards: Number(r.awards),
      distinctRecipients: r.distinctRecipients,
      obligatedAwardCumulativeUsd: Number(r.obligatedAwardCumulativeUsd),
      outlayAwardCumulativeUsd: Number(r.outlayAwardCumulativeUsd),
      subawardsCount: Number(r.subawardsCount),
      subawardAmountUsd: Number(r.subawardAmountUsd),
    }));
  } catch {
    return null;
  }
}

export interface GrantsAlnRow {
  aln: string;
  alnTitle: string | null;
  attributedFiscalYear: number;
  awards: number;
  distinctRecipients: number;
  obligatedAwardCumulativeUsd: number;
}

export type GrantsAlnSort = "obligated" | "awards" | "recipients" | "aln";

export async function listGrantsAln(opts: {
  version?: string;
  fiscalYear?: number;
  q?: string;
  sort?: GrantsAlnSort;
  page?: number;
  pageSize?: number;
} = {}): Promise<{ rows: GrantsAlnRow[]; total: number } | null> {
  const version = opts.version ?? DEFAULT_GRANTS_VERSION;
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 25));
  const q = opts.q?.trim();
  const orderBy =
    opts.sort === "awards"
      ? { awards: "desc" as const }
      : opts.sort === "recipients"
        ? { distinctRecipients: "desc" as const }
        : opts.sort === "aln"
          ? { aln: "asc" as const }
          : { obligatedAwardCumulativeUsd: "desc" as const };
  try {
    const where = {
      datasetVersion: version,
      ...(opts.fiscalYear ? { attributedFiscalYear: opts.fiscalYear } : {}),
      ...(q ? { aln: { startsWith: q } } : {}),
    };
    const [total, rows] = await Promise.all([
      db.frGrantsAlnSummary.count({ where }),
      db.frGrantsAlnSummary.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return {
      total,
      rows: rows.map((r) => ({
        aln: r.aln,
        alnTitle: r.alnTitle,
        attributedFiscalYear: r.attributedFiscalYear,
        awards: Number(r.awards),
        distinctRecipients: r.distinctRecipients,
        obligatedAwardCumulativeUsd: Number(r.obligatedAwardCumulativeUsd),
      })),
    };
  } catch {
    return null;
  }
}

export async function getGrantsAlnSummary(
  aln: string,
  attributedFiscalYear: number,
  version: string = DEFAULT_GRANTS_VERSION,
): Promise<GrantsAlnRow | null> {
  try {
    const r = await db.frGrantsAlnSummary.findUnique({
      where: {
        datasetVersion_aln_attributedFiscalYear: {
          datasetVersion: version,
          aln: aln.trim(),
          attributedFiscalYear,
        },
      },
    });
    if (!r) return null;
    return {
      aln: r.aln,
      alnTitle: r.alnTitle,
      attributedFiscalYear: r.attributedFiscalYear,
      awards: Number(r.awards),
      distinctRecipients: r.distinctRecipients,
      obligatedAwardCumulativeUsd: Number(r.obligatedAwardCumulativeUsd),
    };
  } catch {
    return null;
  }
}

export interface GrantsAgencyRow {
  agency: string;
  attributedFiscalYear: number;
  awards: number;
  distinctRecipients: number;
  obligatedAwardCumulativeUsd: number;
}

export type GrantsAgencySort = "obligated" | "awards" | "recipients" | "agency";

export async function listGrantsAgency(opts: {
  version?: string;
  fiscalYear?: number;
  q?: string;
  sort?: GrantsAgencySort;
  page?: number;
  pageSize?: number;
} = {}): Promise<{ rows: GrantsAgencyRow[]; total: number } | null> {
  const version = opts.version ?? DEFAULT_GRANTS_VERSION;
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 25));
  const q = opts.q?.trim();
  const orderBy =
    opts.sort === "awards"
      ? { awards: "desc" as const }
      : opts.sort === "recipients"
        ? { distinctRecipients: "desc" as const }
        : opts.sort === "agency"
          ? { agency: "asc" as const }
          : { obligatedAwardCumulativeUsd: "desc" as const };
  try {
    const where = {
      datasetVersion: version,
      ...(opts.fiscalYear ? { attributedFiscalYear: opts.fiscalYear } : {}),
      ...(q ? { agency: { contains: q, mode: "insensitive" as const } } : {}),
    };
    const [total, rows] = await Promise.all([
      db.frGrantsAgencySummary.count({ where }),
      db.frGrantsAgencySummary.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return {
      total,
      rows: rows.map((r) => ({
        agency: r.agency,
        attributedFiscalYear: r.attributedFiscalYear,
        awards: Number(r.awards),
        distinctRecipients: r.distinctRecipients,
        obligatedAwardCumulativeUsd: Number(r.obligatedAwardCumulativeUsd),
      })),
    };
  } catch {
    return null;
  }
}

export interface FacYearlyRow {
  auditYear: number;
  reports: number;
  /** Auditee-reported federal expenditures (single audits). */
  totalExpendedUsd: number;
  findingsCount: number;
  repeatFindingsCount: number;
  /** Flags only — no questioned-cost amounts exist in the source. */
  questionedCostFlagCount: number;
  distinctAuditees: number;
}

export async function listFacYearly(
  facVersion: string = DEFAULT_FAC_VERSION,
): Promise<FacYearlyRow[] | null> {
  try {
    const rows = await db.frFacYearlySummary.findMany({
      where: { datasetVersion: facVersion },
      orderBy: { auditYear: "asc" },
    });
    if (rows.length === 0) return null;
    return rows.map((r) => ({
      auditYear: r.auditYear,
      reports: Number(r.reports),
      totalExpendedUsd: Number(r.totalExpendedUsd),
      findingsCount: Number(r.findingsCount),
      repeatFindingsCount: Number(r.repeatFindingsCount),
      questionedCostFlagCount: Number(r.questionedCostFlagCount),
      distinctAuditees: r.distinctAuditees,
    }));
  } catch {
    return null;
  }
}

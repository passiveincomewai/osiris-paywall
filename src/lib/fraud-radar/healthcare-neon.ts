/**
 * Fraud Radar Phase 2 — Neon summary grain reads (AUDIT §15a).
 *
 * The HCPCS code grain (12,263 rows) and the national monthly grain
 * (84 rows) are small enough to live in Neon as published summary
 * tables; the provider grain lives in versioned artifacts and is read
 * through healthcare-data.ts. Fail-soft like registry-admin.ts: if the
 * tables are absent (migration not yet applied / loader not yet run)
 * the surfaces render an honest "not loaded yet" state, never a 500.
 *
 * Money crosses the Prisma boundary as Decimal; this layer converts to
 * plain numbers (exact to cents at these magnitudes in float64) and
 * keeps both labelled treatments side by side.
 */
import { db } from "@/lib/db";
import { DEFAULT_HEALTHCARE_VERSION } from "./healthcare-data";

export interface HcpcsSummary {
  hcpcsCode: string;
  reportedCells: number;
  totalClaimLines: number;
  totalPatientsReported: number;
  paidAllCellsUsd: number;
  outlierCells: number;
  outlierPaidUsd: number;
  paidExclOutliersUsd: number;
  distinctBillingNpis: number;
  distinctServicingNpis: number;
  firstClaimMonth: string | null;
  lastClaimMonth: string | null;
  activeMonths: number;
}

export interface MonthlyNational {
  claimMonth: string; // YYYY-MM-DD (first of month)
  ym: number; // yyyymm
  reportedCells: number;
  totalClaimLines: number;
  totalPatientsReported: number;
  paidAllCellsUsd: number;
  outlierCells: number;
  outlierPaidUsd: number;
  paidExclOutliersUsd: number;
  distinctBillingNpis: number;
  distinctServicingNpis: number;
  distinctHcpcsCodes: number;
}

function isoDate(d: Date | null): string | null {
  return d ? d.toISOString().slice(0, 10) : null;
}

export type HcpcsSort = "paid" | "lines" | "providers" | "code";

export async function listHcpcsSummaries(opts: {
  version?: string;
  q?: string;
  sort?: HcpcsSort;
  page?: number;
  pageSize?: number;
} = {}): Promise<{ rows: HcpcsSummary[]; total: number } | null> {
  const version = opts.version ?? DEFAULT_HEALTHCARE_VERSION;
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 25));
  const q = opts.q?.trim().toUpperCase();
  const orderBy =
    opts.sort === "lines"
      ? { totalClaimLines: "desc" as const }
      : opts.sort === "providers"
        ? { distinctBillingNpis: "desc" as const }
        : opts.sort === "code"
          ? { hcpcsCode: "asc" as const }
          : { totalPaidExclOutliersUsd: "desc" as const };
  try {
    const where = {
      datasetVersion: version,
      ...(q ? { hcpcsCode: { startsWith: q } } : {}),
    };
    const [total, rows] = await Promise.all([
      db.frHcpcsSummary.count({ where }),
      db.frHcpcsSummary.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return {
      total,
      rows: rows.map((r) => ({
        hcpcsCode: r.hcpcsCode,
        reportedCells: Number(r.reportedCells),
        totalClaimLines: Number(r.totalClaimLines),
        totalPatientsReported: Number(r.totalPatientsReported),
        paidAllCellsUsd: Number(r.totalPaidAllCellsUsd),
        outlierCells: Number(r.outlierCells),
        outlierPaidUsd: Number(r.outlierPaidUsd),
        paidExclOutliersUsd: Number(r.totalPaidExclOutliersUsd),
        distinctBillingNpis: r.distinctBillingNpis,
        distinctServicingNpis: r.distinctServicingNpis,
        firstClaimMonth: isoDate(r.firstClaimMonth),
        lastClaimMonth: isoDate(r.lastClaimMonth),
        activeMonths: r.activeMonths,
      })),
    };
  } catch {
    return null;
  }
}

export async function getHcpcsSummary(
  code: string,
  version: string = DEFAULT_HEALTHCARE_VERSION,
): Promise<HcpcsSummary | null> {
  try {
    const r = await db.frHcpcsSummary.findUnique({
      where: {
        datasetVersion_hcpcsCode: {
          datasetVersion: version,
          hcpcsCode: code.trim().toUpperCase(),
        },
      },
    });
    if (!r) return null;
    return {
      hcpcsCode: r.hcpcsCode,
      reportedCells: Number(r.reportedCells),
      totalClaimLines: Number(r.totalClaimLines),
      totalPatientsReported: Number(r.totalPatientsReported),
      paidAllCellsUsd: Number(r.totalPaidAllCellsUsd),
      outlierCells: Number(r.outlierCells),
      outlierPaidUsd: Number(r.outlierPaidUsd),
      paidExclOutliersUsd: Number(r.totalPaidExclOutliersUsd),
      distinctBillingNpis: r.distinctBillingNpis,
      distinctServicingNpis: r.distinctServicingNpis,
      firstClaimMonth: isoDate(r.firstClaimMonth),
      lastClaimMonth: isoDate(r.lastClaimMonth),
      activeMonths: r.activeMonths,
    };
  } catch {
    return null;
  }
}

export async function listMonthlyNational(
  version: string = DEFAULT_HEALTHCARE_VERSION,
): Promise<MonthlyNational[] | null> {
  try {
    const rows = await db.frMonthlyNationalSummary.findMany({
      where: { datasetVersion: version },
      orderBy: { claimMonth: "asc" },
    });
    if (rows.length === 0) return null;
    return rows.map((r) => {
      const iso = r.claimMonth.toISOString().slice(0, 10);
      return {
        claimMonth: iso,
        ym: Number(iso.slice(0, 4)) * 100 + Number(iso.slice(5, 7)),
        reportedCells: Number(r.reportedCells),
        totalClaimLines: Number(r.totalClaimLines),
        totalPatientsReported: Number(r.totalPatientsReported),
        paidAllCellsUsd: Number(r.totalPaidAllCellsUsd),
        outlierCells: Number(r.outlierCells),
        outlierPaidUsd: Number(r.outlierPaidUsd),
        paidExclOutliersUsd: Number(r.totalPaidExclOutliersUsd),
        distinctBillingNpis: r.distinctBillingNpis,
        distinctServicingNpis: r.distinctServicingNpis,
        distinctHcpcsCodes: r.distinctHcpcsCodes,
      };
    });
  } catch {
    return null;
  }
}

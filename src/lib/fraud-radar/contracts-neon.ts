/**
 * Fraud Radar Phase 5 — Neon grain reads (AUDIT §15a).
 *
 * Small grains live in Neon: the contracts yearly summary, the
 * NAICS × attributed-fiscal-year summary, the PSC × attributed-
 * fiscal-year summary and the agency × attributed-fiscal-year
 * summary (all USAspending generation 2026-10-06). The vendor and
 * award grains live in versioned artifacts (contracts-data.ts).
 * Fail-soft like grants-neon.ts: absent tables/rows render an
 * honest "not loaded yet" state, never a 500.
 *
 * Money crosses the Prisma boundary as Decimal. USAspending
 * amounts are AWARD-CUMULATIVE snapshot totals (see
 * contracts-data.ts MEASURE_NOTE) — the attributed fiscal year
 * assigns each award to one year without changing what the
 * amounts mean. Outlay is nullable in this grain: absence is
 * null, never zero. Ceilings are not obligations and are not
 * modelled here. FAC does not cover contracts.
 */
import { db } from "@/lib/db";
import { DEFAULT_CONTRACTS_VERSION } from "./contracts-data";

export interface ContractsYearlyRow {
  fiscalYear: number;
  awards: number;
  distinctVendors: number;
  obligatedAwardCumulativeUsd: number;
  outlayAwardCumulativeUsd: number | null;
  transactions: number;
  modifications: number;
}

export async function listContractsYearly(
  version: string = DEFAULT_CONTRACTS_VERSION,
): Promise<ContractsYearlyRow[] | null> {
  try {
    const rows = await db.frContractsYearlySummary.findMany({
      where: { datasetVersion: version },
      orderBy: { fiscalYear: "asc" },
    });
    if (rows.length === 0) return null;
    return rows.map((r) => ({
      fiscalYear: r.fiscalYear,
      awards: Number(r.awards),
      distinctVendors: r.distinctVendors,
      obligatedAwardCumulativeUsd: Number(r.obligatedAwardCumulativeUsd),
      outlayAwardCumulativeUsd:
        r.outlayAwardCumulativeUsd == null ? null : Number(r.outlayAwardCumulativeUsd),
      transactions: Number(r.transactions),
      modifications: Number(r.modifications),
    }));
  } catch {
    return null;
  }
}

export interface ContractsNaicsRow {
  naics: string;
  naicsDescription: string | null;
  attributedFiscalYear: number;
  awards: number;
  distinctVendors: number;
  distinctPscCodes: number;
  obligatedAwardCumulativeUsd: number;
  outlayAwardCumulativeUsd: number | null;
  transactionsInWindow: number;
  modificationsInWindow: number;
}

export type ContractsSort = "obligated" | "awards" | "vendors" | "code";

export async function listContractsNaics(opts: {
  version?: string;
  fiscalYear?: number;
  q?: string;
  sort?: ContractsSort;
  page?: number;
  pageSize?: number;
} = {}): Promise<{ rows: ContractsNaicsRow[]; total: number } | null> {
  const version = opts.version ?? DEFAULT_CONTRACTS_VERSION;
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 25));
  const q = opts.q?.trim();
  const orderBy =
    opts.sort === "awards"
      ? { awards: "desc" as const }
      : opts.sort === "vendors"
        ? { distinctVendors: "desc" as const }
        : opts.sort === "code"
          ? { naics: "asc" as const }
          : { obligatedAwardCumulativeUsd: "desc" as const };
  try {
    const where = {
      datasetVersion: version,
      ...(opts.fiscalYear ? { attributedFiscalYear: opts.fiscalYear } : {}),
      ...(q ? { naics: { startsWith: q } } : {}),
    };
    const [total, rows] = await Promise.all([
      db.frContractsNaicsSummary.count({ where }),
      db.frContractsNaicsSummary.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return {
      total,
      rows: rows.map((r) => ({
        naics: r.naics,
        naicsDescription: r.naicsDescription,
        attributedFiscalYear: r.attributedFiscalYear,
        awards: Number(r.awards),
        distinctVendors: r.distinctVendors,
        distinctPscCodes: r.distinctPscCodes,
        obligatedAwardCumulativeUsd: Number(r.obligatedAwardCumulativeUsd),
        outlayAwardCumulativeUsd:
          r.outlayAwardCumulativeUsd == null ? null : Number(r.outlayAwardCumulativeUsd),
        transactionsInWindow: Number(r.transactionsInWindow),
        modificationsInWindow: Number(r.modificationsInWindow),
      })),
    };
  } catch {
    return null;
  }
}

export async function listContractsNaicsYears(
  naics: string,
  version: string = DEFAULT_CONTRACTS_VERSION,
): Promise<ContractsNaicsRow[] | null> {
  try {
    const rows = await db.frContractsNaicsSummary.findMany({
      where: { datasetVersion: version, naics: naics.trim() },
      orderBy: { attributedFiscalYear: "asc" },
    });
    if (rows.length === 0) return null;
    return rows.map((r) => ({
      naics: r.naics,
      naicsDescription: r.naicsDescription,
      attributedFiscalYear: r.attributedFiscalYear,
      awards: Number(r.awards),
      distinctVendors: r.distinctVendors,
      distinctPscCodes: r.distinctPscCodes,
      obligatedAwardCumulativeUsd: Number(r.obligatedAwardCumulativeUsd),
      outlayAwardCumulativeUsd:
        r.outlayAwardCumulativeUsd == null ? null : Number(r.outlayAwardCumulativeUsd),
      transactionsInWindow: Number(r.transactionsInWindow),
      modificationsInWindow: Number(r.modificationsInWindow),
    }));
  } catch {
    return null;
  }
}

export interface ContractsPscRow {
  psc: string;
  pscDescription: string | null;
  attributedFiscalYear: number;
  awards: number;
  distinctVendors: number;
  distinctNaicsCodes: number;
  obligatedAwardCumulativeUsd: number;
  outlayAwardCumulativeUsd: number | null;
  transactionsInWindow: number;
  modificationsInWindow: number;
}

export async function listContractsPsc(opts: {
  version?: string;
  fiscalYear?: number;
  q?: string;
  sort?: ContractsSort;
  page?: number;
  pageSize?: number;
} = {}): Promise<{ rows: ContractsPscRow[]; total: number } | null> {
  const version = opts.version ?? DEFAULT_CONTRACTS_VERSION;
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 25));
  const q = opts.q?.trim();
  const orderBy =
    opts.sort === "awards"
      ? { awards: "desc" as const }
      : opts.sort === "vendors"
        ? { distinctVendors: "desc" as const }
        : opts.sort === "code"
          ? { psc: "asc" as const }
          : { obligatedAwardCumulativeUsd: "desc" as const };
  try {
    const where = {
      datasetVersion: version,
      ...(opts.fiscalYear ? { attributedFiscalYear: opts.fiscalYear } : {}),
      ...(q ? { psc: { startsWith: q.toUpperCase() } } : {}),
    };
    const [total, rows] = await Promise.all([
      db.frContractsPscSummary.count({ where }),
      db.frContractsPscSummary.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return {
      total,
      rows: rows.map((r) => ({
        psc: r.psc,
        pscDescription: r.pscDescription,
        attributedFiscalYear: r.attributedFiscalYear,
        awards: Number(r.awards),
        distinctVendors: r.distinctVendors,
        distinctNaicsCodes: r.distinctNaicsCodes,
        obligatedAwardCumulativeUsd: Number(r.obligatedAwardCumulativeUsd),
        outlayAwardCumulativeUsd:
          r.outlayAwardCumulativeUsd == null ? null : Number(r.outlayAwardCumulativeUsd),
        transactionsInWindow: Number(r.transactionsInWindow),
        modificationsInWindow: Number(r.modificationsInWindow),
      })),
    };
  } catch {
    return null;
  }
}

export async function listContractsPscYears(
  psc: string,
  version: string = DEFAULT_CONTRACTS_VERSION,
): Promise<ContractsPscRow[] | null> {
  try {
    const rows = await db.frContractsPscSummary.findMany({
      where: { datasetVersion: version, psc: psc.trim().toUpperCase() },
      orderBy: { attributedFiscalYear: "asc" },
    });
    if (rows.length === 0) return null;
    return rows.map((r) => ({
      psc: r.psc,
      pscDescription: r.pscDescription,
      attributedFiscalYear: r.attributedFiscalYear,
      awards: Number(r.awards),
      distinctVendors: r.distinctVendors,
      distinctNaicsCodes: r.distinctNaicsCodes,
      obligatedAwardCumulativeUsd: Number(r.obligatedAwardCumulativeUsd),
      outlayAwardCumulativeUsd:
        r.outlayAwardCumulativeUsd == null ? null : Number(r.outlayAwardCumulativeUsd),
      transactionsInWindow: Number(r.transactionsInWindow),
      modificationsInWindow: Number(r.modificationsInWindow),
    }));
  } catch {
    return null;
  }
}

export interface ContractsAgencyRow {
  agency: string;
  agencyCode: string | null;
  attributedFiscalYear: number;
  awards: number;
  distinctVendors: number;
  obligatedAwardCumulativeUsd: number;
  outlayAwardCumulativeUsd: number | null;
  transactionsInWindow: number;
  modificationsInWindow: number;
}

export async function listContractsAgency(opts: {
  version?: string;
  fiscalYear?: number;
  page?: number;
  pageSize?: number;
} = {}): Promise<{ rows: ContractsAgencyRow[]; total: number } | null> {
  const version = opts.version ?? DEFAULT_CONTRACTS_VERSION;
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 25));
  try {
    const where = {
      datasetVersion: version,
      ...(opts.fiscalYear ? { attributedFiscalYear: opts.fiscalYear } : {}),
    };
    const [total, rows] = await Promise.all([
      db.frContractsAgencySummary.count({ where }),
      db.frContractsAgencySummary.findMany({
        where,
        orderBy: { obligatedAwardCumulativeUsd: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return {
      total,
      rows: rows.map((r) => ({
        agency: r.agency,
        agencyCode: r.agencyCode,
        attributedFiscalYear: r.attributedFiscalYear,
        awards: Number(r.awards),
        distinctVendors: r.distinctVendors,
        obligatedAwardCumulativeUsd: Number(r.obligatedAwardCumulativeUsd),
        outlayAwardCumulativeUsd:
          r.outlayAwardCumulativeUsd == null ? null : Number(r.outlayAwardCumulativeUsd),
        transactionsInWindow: Number(r.transactionsInWindow),
        modificationsInWindow: Number(r.modificationsInWindow),
      })),
    };
  } catch {
    return null;
  }
}

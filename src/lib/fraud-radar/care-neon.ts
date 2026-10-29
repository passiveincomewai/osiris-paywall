/**
 * Fraud Radar Phase 3 — Neon grain reads (AUDIT §15a).
 *
 * Small grains live in Neon: the Medicare HCPCS × year summary, the
 * yearly national summary, and the two Care Compare directories
 * (hospice providers, home health agencies). The Medicare provider
 * grain lives in versioned artifacts (care-data.ts). Fail-soft like
 * healthcare-neon.ts: absent tables/rows render an honest
 * "not loaded yet" state, never a 500.
 *
 * Money crosses the Prisma boundary as Decimal; amounts are DERIVED
 * from published averages (services × average) and stay labelled
 * derived. The home-health quality star is CMS's own published
 * rating and is labelled as CMS's, never as a Fraud Radar score.
 */
import { db } from "@/lib/db";
import { DEFAULT_CARE_VERSION } from "./care-data";

export const CARE_COMPARE_VERSION = "2026-10-refresh";

export interface MedicareYearly {
  dataYear: number;
  distinctProviders: number;
  distinctHcpcs: number;
  totalServices: number;
  benesReported: number; // reported volume, not unique beneficiaries
  pymtDerivedUsd: number;
  allowedDerivedUsd: number;
  stdzdDerivedUsd: number;
  submittedDerivedUsd: number;
  sourceRows: number;
}

export async function listMedicareYearly(
  version: string = DEFAULT_CARE_VERSION,
): Promise<MedicareYearly[] | null> {
  try {
    const rows = await db.frMedicareYearlySummary.findMany({
      where: { datasetVersion: version },
      orderBy: { dataYear: "asc" },
    });
    if (rows.length === 0) return null;
    return rows.map((r) => ({
      dataYear: r.dataYear,
      distinctProviders: r.distinctProviders,
      distinctHcpcs: r.distinctHcpcs,
      totalServices: Number(r.totalServices),
      benesReported: Number(r.benesReported),
      pymtDerivedUsd: Number(r.pymtDerivedUsd),
      allowedDerivedUsd: Number(r.allowedDerivedUsd),
      stdzdDerivedUsd: Number(r.stdzdDerivedUsd),
      submittedDerivedUsd: Number(r.submittedDerivedUsd),
      sourceRows: Number(r.sourceRows),
    }));
  } catch {
    return null;
  }
}

export interface MedicareHcpcsRow {
  hcpcsCode: string;
  hcpcsDesc: string | null;
  dataYear: number;
  distinctProviders: number;
  totalServices: number;
  benesReported: number;
  pymtDerivedUsd: number;
  allowedDerivedUsd: number;
  stdzdDerivedUsd: number;
  submittedDerivedUsd: number;
  sourceRows: number;
}

export type MedicareHcpcsSort = "pymt" | "services" | "providers" | "code";

export async function listMedicareHcpcs(opts: {
  version?: string;
  year?: number;
  q?: string;
  sort?: MedicareHcpcsSort;
  page?: number;
  pageSize?: number;
} = {}): Promise<{ rows: MedicareHcpcsRow[]; total: number } | null> {
  const version = opts.version ?? DEFAULT_CARE_VERSION;
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 25));
  const q = opts.q?.trim().toUpperCase();
  const orderBy =
    opts.sort === "services"
      ? { totalServices: "desc" as const }
      : opts.sort === "providers"
        ? { distinctProviders: "desc" as const }
        : opts.sort === "code"
          ? { hcpcsCode: "asc" as const }
          : { pymtDerivedUsd: "desc" as const };
  try {
    const where = {
      datasetVersion: version,
      ...(opts.year ? { dataYear: opts.year } : {}),
      ...(q ? { hcpcsCode: { startsWith: q } } : {}),
    };
    const [total, rows] = await Promise.all([
      db.frMedicareHcpcsSummary.count({ where }),
      db.frMedicareHcpcsSummary.findMany({
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
        hcpcsDesc: r.hcpcsDesc,
        dataYear: r.dataYear,
        distinctProviders: r.distinctProviders,
        totalServices: Number(r.totalServices),
        benesReported: Number(r.benesReported),
        pymtDerivedUsd: Number(r.pymtDerivedUsd),
        allowedDerivedUsd: Number(r.allowedDerivedUsd),
        stdzdDerivedUsd: Number(r.stdzdDerivedUsd),
        submittedDerivedUsd: Number(r.submittedDerivedUsd),
        sourceRows: Number(r.sourceRows),
      })),
    };
  } catch {
    return null;
  }
}

function isoDate(d: Date | null): string | null {
  return d ? d.toISOString().slice(0, 10) : null;
}

export interface HospiceProviderRow {
  ccn: string;
  facilityName: string;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  county: string | null;
  phone: string | null;
  cmsRegion: string | null;
  ownershipType: string | null;
  certificationDate: string | null;
}

export async function listHospiceProviders(opts: {
  q?: string;
  state?: string;
  page?: number;
  pageSize?: number;
  version?: string;
} = {}): Promise<{ rows: HospiceProviderRow[]; total: number } | null> {
  const version = opts.version ?? CARE_COMPARE_VERSION;
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 50));
  const q = opts.q?.trim();
  const state = opts.state?.trim().toUpperCase();
  try {
    const where = {
      datasetVersion: version,
      ...(q ? { facilityName: { contains: q, mode: "insensitive" as const } } : {}),
      ...(state ? { state } : {}),
    };
    const [total, rows] = await Promise.all([
      db.frHospiceProvider.count({ where }),
      db.frHospiceProvider.findMany({
        where,
        orderBy: [{ state: "asc" }, { facilityName: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return {
      total,
      rows: rows.map((r) => ({
        ccn: r.ccn,
        facilityName: r.facilityName,
        addressLine1: r.addressLine1,
        addressLine2: r.addressLine2,
        city: r.city,
        state: r.state,
        zipCode: r.zipCode,
        county: r.county,
        phone: r.phone,
        cmsRegion: r.cmsRegion,
        ownershipType: r.ownershipType,
        certificationDate: isoDate(r.certificationDate),
      })),
    };
  } catch {
    return null;
  }
}

export interface HomeHealthAgencyRow {
  ccn: string;
  providerName: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  phone: string | null;
  ownershipType: string | null;
  certificationDate: string | null;
  /** CMS's own published quality star rating (1–5), not a Fraud
   *  Radar score. Null when CMS publishes none for the agency. */
  qualityStarRating: number | null;
  qualityStarFootnote: string | null;
  offersNursing: boolean | null;
  offersPhysicalTherapy: boolean | null;
  offersOccupationalTherapy: boolean | null;
  offersSpeechPathology: boolean | null;
  offersMedicalSocial: boolean | null;
  offersHomeHealthAide: boolean | null;
}

export async function listHomeHealthAgencies(opts: {
  q?: string;
  state?: string;
  page?: number;
  pageSize?: number;
  version?: string;
} = {}): Promise<{ rows: HomeHealthAgencyRow[]; total: number } | null> {
  const version = opts.version ?? CARE_COMPARE_VERSION;
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 50));
  const q = opts.q?.trim();
  const state = opts.state?.trim().toUpperCase();
  try {
    const where = {
      datasetVersion: version,
      ...(q ? { providerName: { contains: q, mode: "insensitive" as const } } : {}),
      ...(state ? { state } : {}),
    };
    const [total, rows] = await Promise.all([
      db.frHomeHealthAgency.count({ where }),
      db.frHomeHealthAgency.findMany({
        where,
        orderBy: [{ state: "asc" }, { providerName: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return {
      total,
      rows: rows.map((r) => ({
        ccn: r.ccn,
        providerName: r.providerName,
        address: r.address,
        city: r.city,
        state: r.state,
        zipCode: r.zipCode,
        phone: r.phone,
        ownershipType: r.ownershipType,
        certificationDate: isoDate(r.certificationDate),
        qualityStarRating:
          r.qualityStarRating === null ? null : Number(r.qualityStarRating),
        qualityStarFootnote: r.qualityStarFootnote,
        offersNursing: r.offersNursing,
        offersPhysicalTherapy: r.offersPhysicalTherapy,
        offersOccupationalTherapy: r.offersOccupationalTherapy,
        offersSpeechPathology: r.offersSpeechPathology,
        offersMedicalSocial: r.offersMedicalSocial,
        offersHomeHealthAide: r.offersHomeHealthAide,
      })),
    };
  } catch {
    return null;
  }
}

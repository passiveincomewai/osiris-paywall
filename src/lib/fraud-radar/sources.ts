/**
 * Fraud Radar Data Source Registry — canonical seed definitions
 * (master spec §5). One entry per source in the Phase 0 audit's §16
 * feasibility table; every fact here is the audit's verified one.
 * The Prisma model `FrDataSource` mirrors this shape; the idempotent
 * seed script (scripts/fraud-radar-seed.mjs) upserts these rows.
 *
 * Honesty rules baked into the data:
 *  - status starts at "not_started" (or "pending_credentials" for FAC):
 *    a seed row never claims an import that has not happened. A source
 *    is marked "ingested" only with provenance fields that cite the
 *    pipeline manifest for the actual import.
 *  - limitations carry the analytical warnings (suppression, vintage
 *    labeling, measure incompatibilities) the UI must surface.
 *  - SAM.gov appears ONLY as public file extracts — no API (§17
 *    locked decision); USAspending is the contract/grants spine.
 */

export type FrEngine = "healthcare" | "grants" | "contracts" | "cross-cutting";

export type FrAccessType =
  | "public_download"
  | "public_api"
  | "public_extract"
  | "api_key_required";

export type FrSourceStatus = "not_started" | "pending_credentials" | "ingested";

export interface FrDataSourceSeed {
  slug: string;
  name: string;
  engine: FrEngine;
  officialUrl: string;
  accessUrl: string;
  accessType: FrAccessType;
  /** "none", or a plain-language statement of the key required. */
  apiKeyRequirement: string;
  license: string;
  commercialUse: string;
  dataFields: string[];
  /** "YYYY-MM" or null when the source is continuously current. */
  coverageStart: string | null;
  coverageEnd: string | null;
  limitations: string;
  cadence: string;
  status: FrSourceStatus;
  notes: string;
  /** Ingest provenance — populated only when status is "ingested";
   *  every value cites the pipeline manifest for that import. */
  sourceVersion?: string | null;
  /** "YYYY-MM-DD" the ingested version was published by the publisher. */
  lastPublishedAt?: string | null;
  /** ISO timestamp of the pipeline import that produced sourceVersion. */
  lastImportedAt?: string | null;
  /** "YYYY-MM-DD" the import was last verified against its manifest. */
  lastVerifiedAt?: string | null;
  completeness?: string | null;
}

export const FRAUD_RADAR_SOURCES: FrDataSourceSeed[] = [
  {
    slug: "medicaid-hcpcs",
    name: "HHS Medicaid Provider Spending by HCPCS",
    engine: "healthcare",
    officialUrl: "https://opendata.hhs.gov/datasets/medicaid-provider-spending",
    accessUrl: "https://opendata.hhs.gov/datasets/medicaid-provider-spending",
    accessType: "public_download",
    apiKeyRequirement: "none",
    license: "U.S. Government open data (HHS)",
    commercialUse: "Permitted under HHS open-data terms; attribution to HHS/CMS required in product copy.",
    dataFields: [
      "billing_provider_npi_num",
      "servicing_provider_npi_num",
      "hcpcs_code",
      "claim_from_month",
      "total_patients",
      "total_claim_lines",
      "total_paid",
    ],
    coverageStart: "2018-01",
    coverageEnd: "2024-12",
    limitations:
      "Cells with fewer than 12 claim lines/patients are suppressed by the source — a missing row does NOT mean zero spending. Unique beneficiary counts must not be summed across rows. Claim lines are not necessarily unique claims. Billing and servicing NPIs are distinct roles. 2024 data is preliminary; managed-care encounter amounts understate true cost in some states. Aggregated payments cannot by themselves establish that services were not delivered.",
    cadence: "Irregular versioned releases (current version published 2026-02-09)",
    status: "ingested",
    notes: "Ingested 2026-10-29 from the official Parquet (dataset version 2026-02-09; SHA-256 matched the checksum HHS itself publishes) and published as 7 claim-year Parquet parts, 2,246,737,360 bytes total; pipeline manifest medicaid-provider-spending-2026-02-09. TOTAL_PAID data-quality flag: 62 source cells exceed $1B each — the naive sum ($21.80T) is a source artifact; excluding those cells the sum is $1.46T. Any downstream aggregate must state which treatment it uses.",
    sourceVersion: "2026-02-09",
    lastPublishedAt: "2026-02-09",
    lastImportedAt: "2026-10-29T06:01:11Z",
    lastVerifiedAt: "2026-10-29",
    completeness:
      "Complete as published by HHS: 238,015,729 rows covering 2018-01 through 2024-12 (84 months) in 7 claim-year Parquet parts; row count and integer sums (claim lines, patients) reconcile exactly with the checksum-verified source file, and the billing × servicing × HCPCS × month grain is unique. Cells HHS suppressed (fewer than 12 claim lines) are absent from the source itself, so completeness is relative to the published file, never to all Medicaid activity.",
  },
  {
    slug: "cms-medicare",
    name: "CMS Medicare Public Datasets",
    engine: "healthcare",
    officialUrl: "https://data.cms.gov/",
    accessUrl: "https://data.cms.gov/data-api/v1/dataset",
    accessType: "public_api",
    apiKeyRequirement: "none",
    license: "U.S. Government open data (CMS)",
    commercialUse: "Permitted under CMS open-data terms with attribution.",
    dataFields: [
      "provider_ccn",
      "provider_name",
      "dataset_specific_measures",
      "reporting_period",
    ],
    coverageStart: null,
    coverageEnd: null,
    limitations:
      "Dataset-specific endpoints and measures vary (hospice, home health, provider utilization, practitioner services). Medicare fee-for-service data must be distinguished from Medicare Advantage data, and incompatible financial measures must never be combined.",
    cadence: "Varies by dataset (metadata-driven discovery)",
    status: "not_started",
    notes: "Phase 3 integrates the care-program datasets; endpoints discovered from official data.cms.gov metadata at build time.",
  },
  {
    slug: "nppes",
    name: "NPPES NPI Registry (bulk dissemination)",
    engine: "healthcare",
    officialUrl: "https://npiregistry.cms.hhs.gov/",
    accessUrl: "https://download.cms.gov/nppes/NPI_Files.html",
    accessType: "public_download",
    apiKeyRequirement: "none",
    license: "U.S. Government public data (FOIA-disclosable fields)",
    commercialUse: "Permitted; FOIA-disclosable fields only.",
    dataFields: [
      "npi",
      "entity_type",
      "legal_name",
      "taxonomy_codes",
      "practice_address",
      "mailing_address",
      "enumeration_date",
      "last_update_date",
    ],
    coverageStart: null,
    coverageEnd: null,
    limitations:
      "NPI registration is not proof of current licensing or program eligibility. Bulk file exceeds 4 GB compressed; the pipeline uses the bulk file, not per-record API polling.",
    cadence: "Monthly full replacement + weekly incrementals",
    status: "not_started",
    notes: "Identity layer for provider profiles (Phase 2).",
  },
  {
    slug: "leie",
    name: "HHS-OIG List of Excluded Individuals/Entities (LEIE)",
    engine: "healthcare",
    officialUrl: "https://oig.hhs.gov/exclusions/",
    accessUrl: "https://oig.hhs.gov/exclusions/downloadables.asp",
    accessType: "public_download",
    apiKeyRequirement: "none",
    license: "U.S. Government public data (HHS-OIG)",
    commercialUse: "Permitted with attribution.",
    dataFields: [
      "last_name",
      "first_name",
      "business_name",
      "address",
      "exclusion_type",
      "exclusion_date",
      "waiver_date",
    ],
    coverageStart: null,
    coverageEnd: null,
    limitations:
      "No public API exists — downloads only. The downloadable file contains no SSN/EIN, so a name match is a POSSIBLE match until identity is verified through OIG's online searchable database. Never present an unverified match as a confirmed exclusion.",
    cadence: "Monthly full file + monthly exclusion/reinstatement supplements",
    status: "ingested",
    notes: "Ingested 2026-10-29 from the OIG full file (UPDATED.csv), version 2026-10; pipeline manifest leie-2026-10. Name matches are possible matches only — the file contains no SSN/EIN (AUDIT §16).",
    sourceVersion: "2026-10",
    lastImportedAt: "2026-10-29T03:44:09Z",
    lastVerifiedAt: "2026-10-29",
    completeness:
      "Full current file ingested: 84,093 rows, validation-clean (frictionless). The downloadable LEIE is the full database of exclusions currently in effect; reinstated parties are removed by OIG.",
  },
  {
    slug: "usaspending",
    name: "USAspending API v2",
    engine: "cross-cutting",
    officialUrl: "https://www.usaspending.gov/",
    accessUrl: "https://api.usaspending.gov/",
    accessType: "public_api",
    apiKeyRequirement: "none",
    license: "U.S. Government public data",
    commercialUse: "Permitted; data is public domain.",
    dataFields: [
      "award_id",
      "recipient_uei",
      "recipient_name",
      "awarding_agency",
      "obligated_amount",
      "outlay_amount",
      "transactions",
      "subawards",
      "naics_psc",
      "place_of_performance",
    ],
    coverageStart: null,
    coverageEnd: null,
    limitations:
      "Search pagination is capped at 100 records per call — population-scale pulls use the bulk download endpoints. Obligations, outlays, and expenditures are different measures and must be distinguished; contract modifications must not be double-counted as new awards, and ceilings are not obligations.",
    cadence: "Near-real-time upstream of FPDS / federal assistance data",
    status: "not_started",
    notes: "The grants + contracts spine (Phases 4–5). No auth, no key.",
  },
  {
    slug: "fac",
    name: "Federal Audit Clearinghouse (Single Audit)",
    engine: "grants",
    officialUrl: "https://www.fac.gov/",
    accessUrl: "https://api.fac.gov/",
    accessType: "api_key_required",
    apiKeyRequirement:
      "Data.gov API key (free, email signup at fac.gov/api/signup). Development runs on the shared DEMO_KEY (30 req/hr, 50/day); production key pending owner action.",
    license: "U.S. Government public data (public domain)",
    commercialUse: "Permitted.",
    dataFields: [
      "auditee_name",
      "auditee_ein",
      "audit_year",
      "total_federal_expended",
      "findings",
      "questioned_costs",
      "corrective_action",
      "audit_opinion",
    ],
    coverageStart: null,
    coverageEnd: null,
    limitations:
      "Suppressed Tribal audits are not accessible without separate federal authorization — the platform uses public records only. An audit finding or deficiency is not a fraud determination and must never be presented as one.",
    cadence: "Continuous submissions (~40k audits/year)",
    status: "pending_credentials",
    notes: "Phase 4. Dev unblocked via DEMO_KEY; production Data.gov key is owner action #1 in AUDIT §19.",
  },
  {
    slug: "irs-990",
    name: "IRS Form 990 Bulk Filings",
    engine: "grants",
    officialUrl: "https://www.irs.gov/charities-non-profits/form-990-series-downloads",
    accessUrl: "https://www.irs.gov/charities-non-profits/form-990-series-downloads",
    accessType: "public_download",
    apiKeyRequirement: "none",
    license: "Public disclosure data (IRC §6104)",
    commercialUse: "Permitted; filings are public by statute.",
    dataFields: [
      "ein",
      "organization_name",
      "tax_period",
      "total_revenue",
      "total_expenses",
      "program_service_accomplishments",
    ],
    coverageStart: null,
    coverageEnd: null,
    limitations:
      "Accounting periods differ across organizations — comparisons must surface fiscal-period differences and avoid unsupported cross-period claims.",
    cadence: "Annual filings, posted on a rolling basis",
    status: "not_started",
    notes: "Phase 4 nonprofit financial layer (bulk e-file XML + index files).",
  },
  {
    slug: "sam-entities",
    name: "SAM.gov Public Entity Registration Extract (monthly)",
    engine: "contracts",
    officialUrl: "https://sam.gov/data-access",
    accessUrl: "https://sam.gov/data-services/Entity%20Registration/Public%20V2?privacy=Public",
    accessType: "public_extract",
    apiKeyRequirement: "none",
    license: "GSA public extract",
    commercialUse: "Permitted; extract is published for public use.",
    dataFields: [
      "uei",
      "legal_business_name",
      "cage_code",
      "registration_status",
      "registration_expiration",
      "physical_address",
      "point_of_contact_names",
    ],
    coverageStart: null,
    coverageEnd: null,
    limitations:
      "Monthly vintage: registration status reflects the extract date, and every display of an extract-derived status MUST carry its extract date label. The file contains active registrations plus entities expired within the last 6 months; older expired entities appear only in Fraud Radar's retained historical snapshots.",
    cadence: "Monthly (produced the first Sunday of each month)",
    status: "ingested",
    notes: "SAM.gov API is NOT used (locked decision, AUDIT §17). Ingested 2026-10-29 from SAM_PUBLIC_MONTHLY_V2_20261005.zip via browser download from SAM.gov Data Services (Terms-of-Use accepted; no SAM API key); pipeline manifest sam-entities-2026-10-05. Registration status is a property of the 2026-10-05 extract and must always be labelled with that extract date — never presented as live.",
    sourceVersion: "2026-10-05",
    lastPublishedAt: "2026-10-05",
    lastImportedAt: "2026-10-29T04:49:08Z",
    lastVerifiedAt: "2026-10-29",
    completeness:
      "Complete monthly extract: 905,712 records, matching the record count declared in the file's own header — 820,322 active and 85,389 expired by SAM extract code, plus 1 anomalous dual-value record (UEI VLNHKZKSFEF3) preserved verbatim. The monthly file carries active registrations plus registrations expired in the prior 6 months.",
  },
  {
    slug: "sam-exclusions",
    name: "SAM.gov Public Exclusions Extract (daily)",
    engine: "contracts",
    officialUrl: "https://sam.gov/data-access",
    accessUrl: "https://sam.gov/data-services/Exclusions/Public%20V2?privacy=Public",
    accessType: "public_extract",
    apiKeyRequirement: "none",
    license: "GSA public extract",
    commercialUse: "Permitted; extract is published for public use.",
    dataFields: [
      "uei",
      "cage_code",
      "entity_name",
      "exclusion_type",
      "exclusion_start",
      "exclusion_end",
    ],
    coverageStart: null,
    coverageEnd: null,
    limitations:
      "The daily file lists currently active exclusions only; an entity absent from today's file may have been excluded historically — historical claims require retained snapshots. Statuses carry the extract date.",
    cadence: "Daily",
    status: "ingested",
    notes: "Ingested 2026-10-29 from SAM_Exclusions_Public_Extract_V2_26301.zip (the file suffix is a Julian YYDDD date: 2026 day 301) via browser download from SAM.gov Data Services (Terms-of-Use accepted; no SAM API key, §17); pipeline manifest sam-exclusions-2026-301. Bulk screening against this file replaces any per-record API checks. Exclusions recorded in SAM.gov are not a live status check — every display carries the extract date (2026-10-28).",
    sourceVersion: "2026-301",
    lastPublishedAt: "2026-10-28",
    lastImportedAt: "2026-10-29T04:43:47Z",
    lastVerifiedAt: "2026-10-29",
    completeness:
      "Complete daily extract: 169,034 rows, validation-clean (frictionless), stale_snapshot: false; the newest Creation_Date in the data is 2026-10-28. This supersedes the stale 2020-12-21 data.gov fallback snapshot (144,058 rows) used before the live file was reachable.",
  },
  {
    slug: "sam-opportunities",
    name: "SAM.gov Contract Opportunities Extract (daily CSV)",
    engine: "contracts",
    officialUrl: "https://sam.gov/data-access",
    accessUrl: "https://sam.gov/data-access",
    accessType: "public_extract",
    apiKeyRequirement: "none",
    license: "GSA public extract",
    commercialUse: "Permitted; extract is published for public use.",
    dataFields: [
      "notice_id",
      "notice_type",
      "title",
      "agency",
      "naics_code",
      "psc_code",
      "posted_date",
      "response_deadline",
      "place_of_performance",
    ],
    coverageStart: null,
    coverageEnd: null,
    limitations:
      "This file carries solicitation NOTICES, not award data — it is not a substitute for the USAspending award spine and must not be used to compute obligations or spending.",
    cadence: "Daily",
    status: "not_started",
    notes: "Optional opportunities view for Phase 5; pipeline shape identical to the other SAM extracts.",
  },
];

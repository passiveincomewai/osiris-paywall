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
    notes: "Ingested 2026-10-29 from the official Parquet (dataset version 2026-02-09; SHA-256 matched the checksum HHS itself publishes) and published as 7 claim-year Parquet parts, 2,246,737,360 bytes total; pipeline manifest medicaid-provider-spending-2026-02-09. TOTAL_PAID data-quality flag: 62 source cells exceed $1B each — the naive sum ($21.80T) is a source artifact; excluding those cells the sum is $1.46T. Any downstream aggregate must state which treatment it uses. Phase 10 (2026-11-01): the enriched NPI grain (99.86% NPPES-joined) is the graph's NPI entity family (1,842,123 published ego centres) and the Medicaid geo layers use NPPES practice state. The naive sum remains a source artifact and is never used in any graph or geo figure.",
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
    accessUrl: "https://data.cms.gov/data.json",
    accessType: "public_download",
    apiKeyRequirement: "none",
    license: "U.S. Government open data (CMS)",
    commercialUse: "Permitted under CMS open-data terms with attribution.",
    dataFields: [
      "rndrng_npi",
      "rndrng_prvdr_last_org_name",
      "rndrng_prvdr_type",
      "hcpcs_cd",
      "hcpcs_desc",
      "place_of_srvc",
      "tot_benes",
      "tot_srvcs",
      "avg_sbmtd_chrg",
      "avg_mdcr_alowd_amt",
      "avg_mdcr_pymt_amt",
      "avg_mdcr_stdzd_amt",
      "ccn",
      "facility_name",
      "certification_date",
      "quality_of_patient_care_star_rating",
    ],
    coverageStart: "2022-01",
    coverageEnd: "2024-12",
    limitations:
      "The Physician & Other Practitioners file publishes AVERAGE amounts only — every payment total Fraud Radar shows is derived (services x average) and labelled derived, never a claim-level figure. CMS suppresses small cells before publication (observed beneficiary floor 11 in all three years), so absence is missing data, never zero. Beneficiary figures are reported volumes summed over published rows, not unique-beneficiary counts. Medicare fee-for-service (Part B) only: Medicare Advantage is a separate program, is not in this file, and is never merged with it; incompatible measures are never combined. Care Compare carries federal certification facts (CCN, certification date, ownership); state licence status lives with state regulators and is not asserted. The home-health quality star is CMS's own published rating, shown as CMS's.",
    cadence: "Annual per calendar year (Physician PUF); Care Compare refreshes several times a year",
    status: "ingested",
    notes:
      "Phase 3 (2026-10-29): Medicare Physician & Other Practitioners — by Provider and Service, CY2022–CY2024, ingested from the official data.cms.gov DCAT catalog distributions (catalog modified 2025-03-26 / 2025-10-28 / 2026-05-21), plus CMS Care Compare hospice (Aug 2026 refresh) and home health (Oct 2026 refresh) directories from data.cms.gov/provider-data. Exact-NPI LEIE screening runs against the 2026-10 LEIE snapshot; Care Compare directories carry no NPI, so their LEIE output is normalized name+state CANDIDATE pairs for human review (3 pairs), never matches. Childcare and state licensing have no federal bulk provider-level source (verified: zero childcare datasets in the full 3,491-dataset CMS catalog; licensing is state-administered per AUDIT §6.6) — deferred to per-state connectors. Phase 10 (2026-11-01): PUF rendering-provider state is a geo layer with DERIVED payment labelling and the PUF suppression floor stated; NPIs join the graph as entity nodes carrying Medicaid/Medicare facets.",
    sourceVersion: "CY2022-CY2024 + Care Compare 2026-10-refresh",
    lastPublishedAt: "2026-05-21",
    lastImportedAt: "2026-10-29T22:04:50Z",
    lastVerifiedAt: "2026-10-29",
    completeness:
      "Complete as published by CMS: 29,197,747 Physician PUF rows (CY2022 9,755,427; CY2023 9,660,647; CY2024 9,781,673) over 1,393,382 distinct rendering NPIs; row, service and provider counts reconcile exactly with the per-year ingest manifests, and the aggregate layer's source-row total matches the ingest total with zero validation errors. LEIE screening covers all 8,922 distinct NPI-carrying LEIE records (8,743 distinct NPIs; the LEIE's 8,924 records include 2 exact duplicates on the published columns). Care Compare directories complete as published: 6,669 hospice providers (unique CCNs) and 12,409 home health agencies (unique CCNs). Completeness is relative to the published files — CMS-suppressed cells are absent from the source itself.",
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
      "entity_type_code",
      "entity_type",
      "replacement_npi",
      "organization_name",
      "last_name",
      "first_name",
      "middle_name",
      "name_prefix",
      "name_suffix",
      "credential_text",
      "display_name",
      "practice_address_1",
      "practice_address_2",
      "practice_city",
      "practice_state",
      "practice_postal_code",
      "practice_zip5",
      "practice_country",
      "enumeration_date",
      "last_update_date",
      "deactivation_reason_code",
      "deactivation_date",
      "reactivation_date",
      "primary_taxonomy_code",
      "taxonomy_codes",
      "is_sole_proprietor",
      "is_organization_subpart",
      "parent_organization_name",
    ],
    coverageStart: null,
    coverageEnd: null,
    limitations:
      "NPI registration is not proof of current licensing or program eligibility. Bulk file exceeds 4 GB compressed; the pipeline uses the bulk file, not per-record API polling. This import came from the NBER mirror of the dissemination file (the CMS dissemination site was down) via a mapping adapter — vintage August 2026; re-verify against the official CMS file when the site returns. The layout's EIN column and all telephone/fax fields are deliberately not carried (identity layer only).",
    cadence: "Monthly full replacement + weekly incrementals",
    status: "ingested",
    notes: "Ingested 2026-10-29 from the NBER mirror of the CMS NPPES dissemination (August 2026 vintage), adapted to the official 329-column V2 layout by the pipeline mapping adapter (audit gate PASS_WITH_FLAGS) after the layout gate stopped the direct ingest — see PHASE2-NPPES-EXECUTION.md. Pipeline manifest nppes-2026-08. Identity layer for provider profiles (Phase 2). NOT downloaded from CMS — label as 'NBER mirror of CMS NPPES' on every surface. Phase 10 (2026-11-01): NPPES practice addresses form graph co-location edges rendered locality-only (city/state/ZIP3, never street text), and NPPES practice state is the Medicaid geo geography — a provider-identity attribute, never claims geography.",
    sourceVersion: "2026-08",
    lastPublishedAt: "2026-08-10",
    lastImportedAt: "2026-10-29T13:36:45Z",
    lastVerifiedAt: "2026-10-29",
    completeness:
      "Full-file import of the August 2026 vintage: 9,726,865 NPI records (7,415,294 individuals, 1,959,660 organizations, 351,911 with blank entity type; 370,737 deactivated NPIs retained with deactivation dates), read-back validation clean against the adapted file, which itself reconciled exactly against the mirror source. lastPublishedAt is the NBER mirror member-file date (2026-08-10), the date the file's data runs through — not a CMS publication stamp. Identity fields only: the layout's EIN column and all telephone/fax fields are dropped by normalization.",
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
    accessUrl: "https://api.usaspending.gov/api/v2/bulk_download/list_monthly_files/",
    accessType: "public_download",
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
      "piid",
      "modification_number",
    ],
    coverageStart: "2018-01",
    coverageEnd: "2025-12",
    limitations:
      "Search pagination is capped at 100 records per call — population-scale pulls use the bulk download endpoints. Obligations, outlays, and expenditures are different measures and must be distinguished; contract modifications must not be double-counted as new awards, and ceilings are not obligations. The Award Data Archive files are transaction grain: the published award grain is DERIVED as the latest-transaction snapshot per award (latest last_modified_date), and the source-named total fields are award-cumulative snapshot amounts — never fiscal-year obligations and never expenditures. An award appears in every FY archive file in which it had a transaction, so cross-FY rows are deduped globally before any count. Reported subawards (FSRS) are incomplete by nature; a subaward whose prime has no in-window archive transaction is labelled unlinked, never dropped silently.",
    cadence: "Award Data Archive Full files, regenerated periodically (generation 2026-10-06 for this import); subawards via generated downloads",
    status: "ingested",
    notes:
      "Phase 4 (2026-10-31): ingested from the official USAspending Award Data Archive Full files — FY2018–FY2025 federal-assistance archive files (archive generation 2026-10-06) — plus the generated subawards download; pipeline manifest usaspending-assistance-2026-10-06. The published award grain is DERIVED (latest-transaction snapshot per award); cumulative fields keep their source semantics — they are award-cumulative totals, never FY obligations. No SAM.gov API is used (locked decision, AUDIT §17): SAM registration and exclusion facts are separate registry entries sourced from the SAM public extracts. The grants + contracts spine (Phases 4–5). No auth, no key. Phase 5 (2026-11-01): the contracts archive files (the same Award Data Archive Full files, FY2018–FY2025, generation 2026-10-06) are ingested under this same entry — derived award grain plus the published transaction (modification) grain; pipeline manifest usaspending-contracts-2026-10-06. Phase 10 (2026-11-01): the published award/subaward grains also feed the relationship-graph and geo derivations (graph composite 2026-10-06+2026-10-31_ay2026+2026-02-09+2022-2024; geo composite 2026-10-06+2026-02-09+2022-2024+2026-10-refresh) — graph edges are published-record relationships only, candidate parent-vehicle linkages are labelled CANDIDATE with their measured rates, and geo state layers keep recipient vs place-of-performance separate, never blended.",
    sourceVersion: "2026-10-06",
    lastPublishedAt: "2026-10-06",
    lastImportedAt: "2026-10-31T05:51:44Z",
    lastVerifiedAt: "2026-10-31",
    completeness:
      "Complete as published by USAspending: 32,821,061 archive part rows (FY2018–FY2025) dedupe to 30,375,146 distinct award keys globally — 2,445,915 cross-FY rows are the same awards re-appearing in later FY files; ALN (assistance listing) is present on 100% of rows. Subawards: 3,585,472 reported rows from the generated download. 27,020,719 awards carry no recipient UEI (direct payments to individuals) and reconcile as the unattributed bucket — recipient-level sums reconcile only with that bucket included, never by treating it as zero.",
  },
  {
    slug: "fac",
    name: "Federal Audit Clearinghouse (Single Audit)",
    engine: "grants",
    officialUrl: "https://www.fac.gov/",
    accessUrl: "https://app.fac.gov/dissemination/public-data/gsa/full",
    accessType: "public_download",
    apiKeyRequirement:
      "none for the production pull (official bulk CSV dissemination at app.fac.gov). A Data.gov API key would be required only for future api.fac.gov API use (development used the shared DEMO_KEY, 30 req/hr, 50/day); no personal key is required.",
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
    coverageStart: "2016-01",
    coverageEnd: "2026-12",
    limitations:
      "Suppressed Tribal audits are not accessible without separate federal authorization — the platform uses public records only. Public-subset rule: 4,908 records carry is_public=false (all tribal) and are withheld from every public aggregate; only their count is published. An audit finding or deficiency is not a fraud determination and must never be presented as one. Findings carry a questioned-cost FLAG only (is_questioned_costs) — the dissemination findings table has no questioned-cost dollar column, so no questioned-cost amount may ever be shown or inferred. Absence of an auditee-year usually means the auditee was below the single-audit expenditure threshold or has not yet submitted — it is labelled exactly that way, never as 'no findings'. 233,233 migrated Census rows carry the literal UEI placeholder GSA_MIGRATION and repeated-character UEIs are likewise placeholders: both are treated as missing UEI in joins.",
    cadence: "Continuous submissions (~40k audits/year); bulk CSV dissemination regenerated by GSA (vintage 2026-10-31_ay2026 for this import)",
    status: "ingested",
    notes:
      "Phase 4 (2026-10-31): ingested from the official bulk CSV dissemination at app.fac.gov, audit years 2016–2026; pipeline manifest fac-2026-10-31_ay2026. The Data.gov API / DEMO_KEY route was NOT needed for the population pull and no personal key is required for the production pull — a Data.gov API key remains an owner action only for any future API use. FAC is the bridge dataset: each report carries both auditee UEI and auditee EIN, linking the USAspending/SAM world (UEI) to the IRS 990 world (EIN) by exact identifiers. Public-subset rule: is_public=false records (4,908, all tribal) are withheld from public aggregates; the count is published only. Findings carry questioned-cost FLAGS only, never amounts. Phase 10 (2026-11-01): FAC public-subset auditee UEI/EIN pairs form the graph's identifier-bridge edges and auditee expended edges (auditee-reported expended — never summed with USAspending obligated); FAC geography is not a geo layer.",
    sourceVersion: "2026-10-31_ay2026",
    lastPublishedAt: "2026-10-31",
    lastImportedAt: "2026-10-31T02:27:00Z",
    lastVerifiedAt: "2026-10-31",
    completeness:
      "Complete as published by GSA/FAC: 417,188 general reports (audit years 2016–2026), 7,294,804 federal-award rows, 682,430 findings (91,675 carrying the questioned-cost flag), 152,992 findings-text rows and 146,224 corrective-action plans; 68,637 distinct auditee EINs and 60,175 distinct real UEIs. Awards reconcile against general total_amount_expended on 417,155 of 417,188 reports (99.9921%); the residual is fully explained in the manifest. Public aggregates use the public subset only: 417,188 − 4,908 is_public=false records (all tribal, withheld) = 412,280 public reports. Completeness is relative to the published dissemination files.",
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
    coverageStart: "2019-01",
    coverageEnd: "2026-12",
    limitations:
      "Accounting periods differ across organizations — comparisons must surface fiscal-period differences and avoid unsupported cross-period claims; amounts are as reported for the stated period, never annualised or shifted. Posting year is the calendar year the IRS received/posted the return, NOT the tax period, and the corpus is e-filed returns only (paper-filed returns are not in this service). The index carries NO financial fields. Grain is one row per return document (OBJECT_ID): amended and late returns are separate documents, never collapsed. Form 990-EZ has no government-grants line and no Schedule I — those fields are NULL for EZ, never 0. Form 990-PF is extracted at header/summary level only. Form 990-T is EXCLUDED entirely (different disclosure class). BMF amounts are master-file amounts from the organization's most recent filing as recorded on the BMF — they stay labelled BMF and are never mixed with or presented as Form 990 figures. 7 return objects in the IRS's own published XML are malformed (not well-formed, invalid token) and could not be parsed; they are counted per batch, excluded, and proven deterministic — the affected batches stand done_with_failures. The FAC-990 join key is the 9-digit auditee EIN only; FAC auditee UEI placeholders (GSA_MIGRATION, masked values) are never used as join keys.",
    cadence:
      "Annual filings, posted on a rolling basis by posting year (e-file XML + index); the Exempt Organizations BMF identity layer is a monthly snapshot (this import: IRS posting 2026-10-13)",
    status: "ingested",
    notes:
      "Phase 4 (2026-10-31): ingested in three EIN-keyed layers. (1) Identity layer: IRS Exempt Organizations Business Master File (BMF), IRS posting 2026-10-13 — 1,975,975 rows, exactly the IRS-published record count; pipeline manifest irs-bmf-2026-10-13. (2) Full e-file index, posting years 2019-2026 — 4,717,279 returns; pipeline manifest irs990-index-2026-10-31; the index carries no financial fields. (3) Streaming XML extraction of posting years 2024-2026 — 1,888,603 returns across 38 batches (990: 967,614; 990-EZ: 578,593; 990-PF: 342,396), every batch reconciling extracted + 990-T skips + parse failures == zip members; pipeline manifest irs990-returns-2024-2026 (valid: true). 61,372 Form 990-T filings were excluded as a different disclosure class. 7 IRS source-defect objects (malformed XML in the IRS's own published files, proven deterministic across repeated extractions) are counted and excluded, and their batches stand done_with_failures. Binding field semantics: Form 990-EZ has no government-grants line and no Schedule I, so those fields are NULL for EZ, never 0; Form 990-PF is header/summary only; BMF amounts stay labelled BMF, never mixed with 990 figures. FAC-990 EIN bridge validated: 32,572 of FAC's 68,637 distinct auditee EINs (47.46%) appear in the 990 corpus (763,158 distinct EINs); 33,587 (48.93%) appear in BMF — companion record irs990-fac-join-validation-2026-10-31.",
    sourceVersion: "BMF 2026-10-13 + index 2026-10-31 + returns 2024-2026",
    lastPublishedAt: "2026-10-31",
    lastImportedAt: "2026-10-31T14:05:36Z",
    lastVerifiedAt: "2026-10-31",
    completeness:
      "Complete as published by the IRS, per the validated manifests: BMF identity layer 1,975,975 rows (IRS posting 2026-10-13; row total exactly the IRS-published count, zero malformed EINs, zero duplicate EINs); full e-file index 4,717,279 returns (posting years 2019-2026); XML extraction 1,888,603 returns across 38 batches (2024: 705,437 in 12 batches; 2025: 724,366 in 16; 2026: 458,800 in 10) — 990: 967,614, 990-EZ: 578,593, 990-PF: 342,396 — with 61,372 Form 990-T filings excluded and exactly 7 IRS source-defect objects (malformed XML in the IRS's own files, proven deterministic) counted and excluded; every batch reconciles extracted + 990-T skips + parse failures == zip members, and zero malformed EINs corpus-wide. 763,158 distinct EINs in the extracted corpus. Completeness is relative to the published e-file corpus — paper-filed returns are not in this service.",
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
    notes: "SAM.gov API is NOT used (locked decision, AUDIT §17). Ingested 2026-10-29 from SAM_PUBLIC_MONTHLY_V2_20261005.zip via browser download from SAM.gov Data Services (Terms-of-Use accepted; no SAM API key); pipeline manifest sam-entities-2026-10-05. Registration status is a property of the 2026-10-05 extract and must always be labelled with that extract date — never presented as live. Phase 10 (2026-11-01): SAM registration addresses were NOT used for graph co-location — the published parquet carries physical-address columns only as unpinned positional columns (recorded as P10-G1-DEF-001); SAM supplies entity labels for UEI graph nodes, extract-dated as above.",
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

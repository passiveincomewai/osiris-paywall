/**
 * Fraud Radar Phase 10 — the closed geo layer set (§5.1), shared by
 * the geo page, explorer, and tests. Layers are separate keys
 * end-to-end: recipient state, place-of-performance state, and
 * NPPES practice state are three different record fields with
 * three different meanings, and no layer here ever blends them.
 * Measure keys are the publisher's keys verbatim (G3 artifacts).
 */

export interface GeoMeasureDef {
  key: string;
  label: string;
  format: "count" | "usd";
}

export interface GeoLayerDef {
  layer: string;
  engine: string;
  label: string;
  geographyFieldLabel: string;
  semantics: string;
  measures: GeoMeasureDef[];
}

const AWARD_MEASURES: GeoMeasureDef[] = [
  { key: "award_count", label: "Awards", format: "count" },
  { key: "distinct_entities", label: "Distinct recipients/vendors", format: "count" },
  { key: "obligated_usd", label: "Obligated (award-cumulative snapshot)", format: "usd" },
];

const SUBAWARD_MEASURES: GeoMeasureDef[] = [
  { key: "subaward_count", label: "Reported subawards", format: "count" },
  { key: "distinct_subrecipients_uei", label: "Distinct subrecipients (UEI)", format: "count" },
  { key: "subaward_amount_usd", label: "Subaward amount as reported", format: "usd" },
];

export const GEO_LAYER_DEFS: GeoLayerDef[] = [
  {
    layer: "grants_recipient_state",
    engine: "grants",
    label: "Grants — recipient state",
    geographyFieldLabel: "Recipient state (recipient_state_code)",
    semantics:
      "Where USAspending records the recipient as located. Amounts are award-cumulative snapshots for awards attributed to recipients in this state — not money spent in this state.",
    measures: AWARD_MEASURES,
  },
  {
    layer: "grants_performance_state",
    engine: "grants",
    label: "Grants — primary place of performance",
    geographyFieldLabel: "Primary place-of-performance state",
    semantics:
      "Where the award record names as the primary place of performance. A single primary place is named per award; work may occur in more places.",
    measures: AWARD_MEASURES,
  },
  {
    layer: "grants_subrecipient_state",
    engine: "grants",
    label: "Grants — subrecipient state",
    geographyFieldLabel: "Subrecipient state",
    semantics:
      "Where USAspending subaward records place the subrecipient. Subaward reporting is incomplete by nature; absence of a record is not absence of a subaward.",
    measures: SUBAWARD_MEASURES,
  },
  {
    layer: "contracts_vendor_state",
    engine: "contracts",
    label: "Contracts — vendor state",
    geographyFieldLabel: "Vendor state",
    semantics:
      "Where USAspending records the vendor as located. Amounts are award-cumulative obligated snapshots — ceilings and potential values are never mapped.",
    measures: AWARD_MEASURES,
  },
  {
    layer: "contracts_performance_state",
    engine: "contracts",
    label: "Contracts — primary place of performance",
    geographyFieldLabel: "Primary place-of-performance state",
    semantics:
      "Where the award record names as the primary place of performance. A single primary place is named per award; work may occur in more places.",
    measures: AWARD_MEASURES,
  },
  {
    layer: "contracts_subrecipient_state",
    engine: "contracts",
    label: "Contracts — subrecipient state",
    geographyFieldLabel: "Subrecipient state",
    semantics:
      "Where USAspending subaward records place the subrecipient, as reported. Subaward amounts are published exactly as reported and are never summed into obligated totals.",
    measures: SUBAWARD_MEASURES,
  },
  {
    layer: "medicare_provider_state",
    engine: "medicare",
    label: "Medicare — rendering provider state",
    geographyFieldLabel: "PUF rendering-provider state",
    semantics:
      "Medicare Physician & Other Practitioners PUF rendering-provider state. Payment is a DERIVED figure; rows below the PUF suppression floor (fewer than 11 beneficiaries) are absent from the source, so totals are totals of reported activity.",
    measures: [
      { key: "distinct_npis", label: "Distinct NPIs", format: "count" },
      { key: "services_total", label: "Services", format: "count" },
      { key: "pymt_derived_usd_total", label: "Payment (DERIVED)", format: "usd" },
    ],
  },
  {
    layer: "medicaid_billing_practice_state",
    engine: "medicaid",
    label: "Medicaid — billing providers by NPPES practice state",
    geographyFieldLabel: "NPPES practice state (NBER mirror, Aug 2026)",
    semantics:
      "Medicaid publishes no geography; this maps billing providers by the practice state on their NPPES record (NBER mirror of CMS NPPES, August 2026). It is not where claims arose.",
    measures: [
      { key: "distinct_billing_npis", label: "Distinct billing NPIs", format: "count" },
      { key: "paid_excl_outliers_usd", label: "Paid excl. outliers (primary measure)", format: "usd" },
    ],
  },
  {
    layer: "medicaid_servicing_practice_state",
    engine: "medicaid",
    label: "Medicaid — servicing providers by NPPES practice state",
    geographyFieldLabel: "NPPES practice state (NBER mirror, Aug 2026)",
    semantics:
      "Medicaid publishes no geography; this maps servicing providers by the practice state on their NPPES record (NBER mirror of CMS NPPES, August 2026). It is not where claims arose.",
    measures: [
      { key: "distinct_servicing_npis", label: "Distinct servicing NPIs", format: "count" },
      { key: "paid_excl_outliers_usd", label: "Paid excl. outliers (primary measure)", format: "usd" },
    ],
  },
  {
    layer: "care_hospice_state",
    engine: "care",
    label: "Care — hospice agencies by provider state",
    geographyFieldLabel: "Care Compare provider state (2026-10 refresh)",
    semantics: "Directory counts only, from CMS Care Compare. No quality-measure geography.",
    measures: [{ key: "distinct_agencies", label: "Distinct agencies", format: "count" }],
  },
  {
    layer: "care_home_health_state",
    engine: "care",
    label: "Care — home-health agencies by provider state",
    geographyFieldLabel: "Care Compare provider state (2026-10 refresh)",
    semantics: "Directory counts only, from CMS Care Compare. No quality-measure geography.",
    measures: [{ key: "distinct_agencies", label: "Distinct agencies", format: "count" }],
  },
];

export function layerDef(layer: string): GeoLayerDef | null {
  return GEO_LAYER_DEFS.find((d) => d.layer === layer) ?? null;
}

export function layersForEngine(engine: string): GeoLayerDef[] {
  return GEO_LAYER_DEFS.filter((d) => d.engine === engine);
}

/**
 * Fraud Radar Phase 9 — generator + validator version
 * constants (PHASE9 §3.2, §2.4). A leaf module with no
 * imports, so the registry export (registry-export.ts) can
 * carry them without bundling the data layers: the pipeline
 * generator reads them from report-templates.json and
 * refuses a version whose recorded versions it does not
 * hold.
 */

/** Bumps on any output-affecting generator change (§3.2). */
export const REPORT_GENERATOR_VERSION = "1.0.0";

/** The §3.4 validator's version, recorded in every manifest. */
export const REPORT_VALIDATOR_VERSION = "1.0.0";

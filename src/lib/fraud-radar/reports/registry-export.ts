/**
 * Fraud Radar Phase 9 — the template-registry export
 * (PHASE9 §3.2).
 *
 * The registry of record is the TS module (templates.ts).
 * The pipeline generator consumes a generated JSON export of
 * it and refuses a version whose recorded registry version
 * it does not hold. This module builds that export object —
 * the template definitions with the locked furniture copy
 * resolved to verbatim text — and scripts/
 * fraud-radar-report-templates.mjs writes it to
 * report-templates.json beside this module. The committed
 * JSON is pinned against this builder by templates.test.ts,
 * so the export can never drift from the registry silently.
 */

import {
  REPORT_TEMPLATES,
  REPORT_TEMPLATE_REGISTRY_VERSION,
  REPORT_COVER_LINE,
  RESEARCH_LEADS_DISCLAIMER,
  NO_DESIGNATION_LINE,
  WHIP_BLOCK,
  EVIDENCE_EXPORT_WARNING,
  WHIP_TEMPLATES,
  type TemplateId,
} from "./templates";
import { REPORT_GENERATOR_VERSION, REPORT_VALIDATOR_VERSION } from "./versions";

export interface RegistryExport {
  registryVersion: string;
  generatorVersion: string;
  validatorVersion: string;
  furniture: {
    coverLine: string;
    researchLeadsDisclaimer: string;
    noDesignationLine: string;
    /** Present only for the templates in whipTemplates. */
    whipBlock: string;
    whipTemplates: TemplateId[];
    evidenceExportWarning: string;
    evidenceWarningTemplates: TemplateId[];
  };
  templates: typeof REPORT_TEMPLATES;
}

export function buildRegistryExport(): RegistryExport {
  return {
    registryVersion: REPORT_TEMPLATE_REGISTRY_VERSION,
    generatorVersion: REPORT_GENERATOR_VERSION,
    validatorVersion: REPORT_VALIDATOR_VERSION,
    furniture: {
      coverLine: REPORT_COVER_LINE,
      researchLeadsDisclaimer: RESEARCH_LEADS_DISCLAIMER,
      noDesignationLine: NO_DESIGNATION_LINE,
      whipBlock: WHIP_BLOCK,
      whipTemplates: WHIP_TEMPLATES,
      evidenceExportWarning: EVIDENCE_EXPORT_WARNING,
      evidenceWarningTemplates: ["B", "F", "G"],
    },
    templates: REPORT_TEMPLATES,
  };
}

export function registryExportJson(): string {
  return `${JSON.stringify(buildRegistryExport(), null, 2)}\n`;
}

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  REPORT_TEMPLATES,
  TEMPLATE_IDS,
  UNIVERSAL_FURNITURE_KEYS,
  WHIP_TEMPLATES,
  WHIP_BLOCK,
  REPORT_COVER_LINE,
  RESEARCH_LEADS_DISCLAIMER,
  NO_DESIGNATION_LINE,
  getReportTemplate,
  validateTemplateRegistry,
  validateTemplateDef,
  checkTemplatePins,
  type ReportTemplateDef,
} from "./templates";
import { buildRegistryExport, registryExportJson } from "./registry-export";
import { scanBannedVocabulary } from "../investigator/guardrails";

/**
 * Phase 9 Payload A — template registry tests (PHASE9 §1,
 * §7.3.3(d)): all nine definitions registered as data, the
 * §1.3 honesty furniture locked on every template, the
 * registry validator rejecting a furniture-stripped
 * definition, WHIP copy confined to the reporting templates
 * in its prepare-and-route form, and no reviewed designation
 * anywhere (§0.7).
 */

const cloneDef = (def: ReportTemplateDef): ReportTemplateDef =>
  JSON.parse(JSON.stringify(def)) as ReportTemplateDef;

describe("template registry — the nine definitions (§1.2)", () => {
  it("registers exactly A–I, in order, and validates clean", () => {
    expect(REPORT_TEMPLATES.map((t) => t.id)).toEqual([...TEMPLATE_IDS]);
    expect(validateTemplateRegistry()).toEqual([]);
    for (const id of TEMPLATE_IDS) {
      expect(getReportTemplate(id)?.id).toBe(id);
    }
    expect(getReportTemplate("Z")).toBeNull();
  });

  it("marks the SHV-9 build order: A/B/G available first, the rest registered but unavailable (§7.2)", () => {
    for (const id of ["A", "B", "G"]) {
      const def = getReportTemplate(id)!;
      expect(def.buildOrder, id).toBe(1);
      expect(def.available, id).toBe(true);
    }
    for (const id of ["C", "D", "E", "F", "H", "I"]) {
      const def = getReportTemplate(id)!;
      expect(def.buildOrder, id).toBe(2);
      expect(def.available, id).toBe(false);
    }
  });

  it("every template offers the zero-dependency formats (§3.3 floor)", () => {
    for (const def of REPORT_TEMPLATES) {
      expect(def.formats, def.id).toEqual(
        expect.arrayContaining(["json", "csv", "zip"]),
      );
    }
  });

  it("required pins match §1.2 per template", () => {
    expect(getReportTemplate("A")!.requiredPins).toEqual(["entity"]);
    expect(getReportTemplate("B")!.requiredPins).toEqual(["case"]);
    expect(getReportTemplate("C")!.requiredPins).toEqual(["lead"]);
    expect(getReportTemplate("D")!.requiredPins).toEqual(["entity", "lead"]);
    expect(getReportTemplate("E")!.requiredPins).toEqual(["verification"]);
    expect(getReportTemplate("F")!.requiredPins).toEqual([
      "case",
      "evidenceSelection",
    ]);
    expect(getReportTemplate("G")!.requiredPins).toEqual(["case"]);
    expect(getReportTemplate("H")!.requiredPinAlternatives).toEqual([
      ["entity"],
      ["case"],
    ]);
    expect(getReportTemplate("I")!.requiresDatasetPins).toBe(true);
    expect(getReportTemplate("F")!.zipMayIncludeEvidence).toBe(true);
    expect(getReportTemplate("G")!.zipMayIncludeEvidence).toBe(true);
    expect(getReportTemplate("A")!.zipMayIncludeEvidence).toBe(false);
  });
});

describe("honesty furniture — locked on every template (§1.3)", () => {
  it("every template carries every universal furniture key, locked, furniture-sourced", () => {
    for (const def of REPORT_TEMPLATES) {
      for (const key of UNIVERSAL_FURNITURE_KEYS) {
        const s = def.sections.find((x) => x.key === key);
        expect(s, `${def.id}:${key}`).toBeDefined();
        expect(s!.locked, `${def.id}:${key}`).toBe(true);
        expect(s!.source, `${def.id}:${key}`).toBe("furniture");
        expect(s!.reorderable, `${def.id}:${key}`).toBe(false);
      }
    }
  });

  it("the no-designation section is required exactly on B, E, G (§1.3 item 8)", () => {
    for (const def of REPORT_TEMPLATES) {
      const s = def.sections.find((x) => x.key === "noDesignation")!;
      expect(s.required, def.id).toBe(["B", "E", "G"].includes(def.id));
      expect(def.noDesignationRequired, def.id).toBe(s.required);
    }
  });

  it("the validator rejects a furniture-stripped definition (§7.3.3(d))", () => {
    const b = getReportTemplate("B")!;
    const stripped = cloneDef(b);
    stripped.sections = stripped.sections.filter((s) => s.key !== "disclaimer");
    expect(validateTemplateDef(stripped)).toContain(
      "missing furniture section: disclaimer",
    );
  });

  it("the validator rejects unlocked or optional furniture", () => {
    const a = getReportTemplate("A")!;
    const unlocked = cloneDef(a);
    unlocked.sections = unlocked.sections.map((s) =>
      s.key === "cover" ? { ...s, locked: false } : s,
    );
    expect(validateTemplateDef(unlocked)).toContain(
      "furniture section is not locked: cover",
    );
    const optional = cloneDef(a);
    optional.sections = optional.sections.map((s) =>
      s.key === "vintages" ? { ...s, required: false } : s,
    );
    expect(validateTemplateDef(optional)).toContain(
      "furniture section is marked optional: vintages",
    );
  });

  it("the furniture copy is the §1.3 text, verbatim", () => {
    expect(REPORT_COVER_LINE).toContain("not a finding of wrongdoing");
    expect(RESEARCH_LEADS_DISCLAIMER).toContain(
      "Determinations of fraud are made by agencies and courts, not by this platform.",
    );
    expect(NO_DESIGNATION_LINE).toBe(
      "This report has not been reviewed by an attorney or other professional on behalf of the platform.",
    );
  });
});

describe("WHIP discipline (§0.6)", () => {
  it("the WHIP block exists only on B, G, H", () => {
    expect(WHIP_TEMPLATES).toEqual(["B", "G", "H"]);
    for (const def of REPORT_TEMPLATES) {
      const has = def.sections.some((s) => s.key === "whipBlock");
      expect(has, def.id).toBe(WHIP_TEMPLATES.includes(def.id));
    }
  });

  it("the block states the published framework and the portal route — and promises nothing", () => {
    expect(WHIP_BLOCK).toContain("$10,000–$30,000 per distinct tip");
    expect(WHIP_BLOCK).toContain("after charges are unsealed");
    expect(WHIP_BLOCK).toContain("DOJ's sole discretion");
    expect(WHIP_BLOCK).toContain("america.gov/fraud");
    expect(WHIP_BLOCK).toContain("never submits anything");
    expect(WHIP_BLOCK.toLowerCase()).not.toContain("guarantee");
    expect(WHIP_BLOCK.toLowerCase()).not.toContain("you will receive");
    expect(WHIP_BLOCK.toLowerCase()).not.toContain("you qualify");
  });

  it("template G offers no submission or award-estimation surface in its sections", () => {
    const g = getReportTemplate("G")!;
    const keys = g.sections.map((s) => s.key);
    expect(keys).toContain("pre-submission-checklist");
    expect(keys).toContain("filer-statement");
    const text = JSON.stringify(g).toLowerCase();
    expect(text).not.toContain("file now");
    expect(text).not.toContain("submit your tip");
    expect(text).not.toContain("estimated award");
    expect(text).not.toContain("award calculator");
  });
});

describe("registry copy hygiene (§0 rules 1 + 7)", () => {
  it("no system-generated registry string carries banned vocabulary", () => {
    const strings: string[] = [
      REPORT_COVER_LINE,
      RESEARCH_LEADS_DISCLAIMER,
      NO_DESIGNATION_LINE,
      WHIP_BLOCK,
    ];
    for (const def of REPORT_TEMPLATES) {
      strings.push(def.title, def.purpose, def.audience, def.methodNotes);
      for (const s of def.sections) strings.push(s.heading);
    }
    for (const text of strings) {
      expect(scanBannedVocabulary(text), text.slice(0, 60)).toEqual([]);
    }
  });

  it("no template offers a reviewed / attested / certified designation (§0.7)", () => {
    for (const def of REPORT_TEMPLATES) {
      const text = `${def.title} ${def.purpose} ${def.sections.map((s) => s.heading).join(" ")}`;
      expect(text, def.id).not.toMatch(/reviewed|attested|certified|verified report/i);
    }
  });
});

describe("pin-requirement checks (§1.2)", () => {
  it("template A refuses a pin set without an entity pin", () => {
    const errors = checkTemplatePins(getReportTemplate("A")!, new Set(["case"]), 0);
    expect(errors).toContain("missing required pin kind: entity");
    expect(errors).toContain("pin kind not accepted by template A: case");
  });

  it("template H accepts either alternative", () => {
    const h = getReportTemplate("H")!;
    expect(checkTemplatePins(h, new Set(["entity"]), 0)).toEqual([]);
    expect(checkTemplatePins(h, new Set(["case"]), 0)).toEqual([]);
    expect(checkTemplatePins(h, new Set(["lead"]), 0).length).toBeGreaterThan(0);
  });

  it("template I requires at least one dataset pin", () => {
    const i = getReportTemplate("I")!;
    expect(checkTemplatePins(i, new Set(), 0)).toContain(
      "at least one dataset pin is required",
    );
    expect(checkTemplatePins(i, new Set(), 2)).toEqual([]);
  });
});

describe("registry export (§3.2)", () => {
  it("the committed report-templates.json equals the builder output (no silent drift)", () => {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const committed = readFileSync(path.join(here, "report-templates.json"), "utf8");
    expect(committed).toBe(registryExportJson());
  });

  it("the export carries all nine templates + resolved furniture", () => {
    const exp = buildRegistryExport();
    expect(exp.registryVersion).toBe("1.0.0");
    expect(exp.templates.map((t) => t.id)).toEqual([...TEMPLATE_IDS]);
    expect(exp.furniture.researchLeadsDisclaimer).toBe(RESEARCH_LEADS_DISCLAIMER);
    expect(exp.furniture.whipTemplates).toEqual(["B", "G", "H"]);
  });
});

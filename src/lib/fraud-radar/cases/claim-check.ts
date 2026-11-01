/**
 * Fraud Radar Phase 8 — the claim checker (PHASE8 §4.3).
 *
 * Code first, model last — in v1, code only: parse (code) →
 * fetch through the Phase 7 tool registry (code) → decide by
 * a decision table over tool outputs (code) → phrase with a
 * code-rendered summary whose factual segment is run through
 * the Phase 7 citations validator. No model is called, no
 * number in a verdict comes from anywhere but a tool output
 * or a code computation over one, and the verdict never
 * depends on prose. `validatorVerdict` records "pass" when
 * the factual segment traces cleanly and "fallback" when the
 * summary had to be rebuilt as the plain figure table (the
 * §2.4 fallback pattern); the standing referral / WHIP blocks
 * are code-rendered copy and, per the citations module's own
 * header, are not part of the draft a validator checks.
 *
 * The checker depends on the tool INTERFACE (name + args →
 * citation envelope), injected for tests: fixture tool outputs
 * drive the §5.4.4 suite deterministically with no model and
 * no artifact reads. Production wiring is the shared Phase 7
 * registry (`executeTool`) — that registry has landed, so no
 * bridge adapter was needed (§4.3 dependency note).
 *
 * Over-budget behaviour (§4.1 step 2): the checker takes a
 * wall-clock budget; a run that exceeds it — or exhausts its
 * tool-call ceiling — completes as insufficient-data with the
 * reason "check did not complete" rather than hanging.
 */

import {
  executeTool,
  isValidEin,
  isValidNpi,
  isValidUei,
  ToolError,
  type ToolDeps,
} from "../investigator/tools";
import {
  extractNumericTokens,
  validateAnswer,
  type CitationEnvelope,
  type ToolResult,
} from "../investigator/citations";
import {
  REFERRAL_BLOCK,
  RESEARCH_LEAD_STANDING_SENTENCE,
  WHIP_FRAMEWORK_TEXT,
} from "../investigator/guardrails";
import {
  CHECK_DID_NOT_COMPLETE_REASON,
  NO_CHECKABLE_CONTENT_REASON,
  accusationOpening,
  type ClaimVerdict,
} from "./claim-verdicts";
import { splitEntityKey } from "./leads";

export const CLAIM_CHECKER_VERSION = "1.0.0";

/** Default synchronous budget for a verify run (§4.1 step 2). */
export const DEFAULT_CHECK_BUDGET_MS = 8_000;
const MAX_TOOL_CALLS = 6;

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export type ClaimToolExecutor = (
  name: string,
  args: Record<string, unknown>,
) => Promise<ToolResult>;

export interface ClaimCheckDeps {
  /** Injectable tool executor (tests pass fixture outputs). */
  execute?: ClaimToolExecutor;
  /** Passed to the real registry executor in production. */
  toolDeps?: ToolDeps;
  /** Wall-clock budget; exceeding it ends the run honestly. */
  budgetMs?: number;
  now?: () => number;
}

export interface ClaimInput {
  statement: string;
  subjectEngine?: string | null;
  subjectEntityKey?: string | null;
}

export interface FigureComparison {
  label: string;
  claimValue: number | null;
  corpusValue: number | null;
  outcome: "match" | "conflict" | "unavailable" | "not-compared";
}

export interface ClaimEvidence {
  citations: CitationEnvelope[];
  figures: FigureComparison[];
  /** Why the verdict is what it is, in the checker's own terms. */
  reason: string | null;
  subject: { engine: string | null; entityKey: string | null } | null;
}

export interface ClaimCheckResult {
  verdict: ClaimVerdict;
  summary: string;
  evidence: ClaimEvidence;
  corpusVersions: Record<string, string>;
  checkerVersion: string;
  validatorVerdict: "pass" | "fallback";
  model: string | null;
  promptVersion: string | null;
}

// ---------------------------------------------------------------------------
// Parse (code, §4.3 step 1)
// ---------------------------------------------------------------------------

export interface ParsedMoney {
  value: number;
  raw: string;
  tolerance: number;
}

export interface ParsedClaim {
  engine: string | null;
  entityKey: string | null;
  bareKey: string | null;
  keyType: string | null;
  money: ParsedMoney[];
  counts: { value: number; unit: string }[];
  years: number[];
  aln: string | null;
  accusation: boolean;
  whipOnePercent: boolean;
  expenditureMeasure: boolean;
  outlayMeasure: boolean;
  screeningClaim: { register: "leie" | "sam"; claimedListed: boolean } | null;
}

const MONEY_RE =
  /\$\s*([\d,]+(?:\.\d+)?)\s*(billion|million|thousand|bn|m|k)?\b/gi;
const COUNT_RE =
  /([\d,]+)\s+(awards|award|claim lines|services|audits|findings)\b/gi;
const YEAR_RE = /\b(?:19|20)\d{2}\b/g;
const ALN_RE = /\b\d{2}\.\d{3}\b/;

function parseMoney(statement: string): ParsedMoney[] {
  const out: ParsedMoney[] = [];
  for (const m of statement.matchAll(MONEY_RE)) {
    const base = Number(m[1].replace(/,/g, ""));
    if (!Number.isFinite(base)) continue;
    const suffix = (m[2] ?? "").toLowerCase();
    const unit =
      suffix === "billion" || suffix === "bn" || suffix === "b"
        ? 1_000_000_000
        : suffix === "million" || suffix === "m"
          ? 1_000_000
          : suffix === "thousand" || suffix === "k"
            ? 1_000
            : 1;
    // Abbreviated figures carry the precision of their last
    // written digit ("$2.1M" is exact to ±$50k); full figures
    // are exact to the corpus's own rounding.
    const decimals = (m[1].split(".")[1] ?? "").length;
    const tolerance =
      unit > 1 ? (unit / 10 ** (decimals + 1)) * 5 : 1;
    out.push({ value: base * unit, raw: m[0], tolerance });
  }
  return out;
}

function findIdentifiers(statement: string): {
  bare: string;
  keyType: string;
} | null {
  const einHyphen = /\b\d{2}-\d{7}\b/.exec(statement);
  if (einHyphen) return { bare: einHyphen[0].replace("-", ""), keyType: "EIN" };
  for (const token of statement.match(/\b[A-Za-z0-9]+\b/g) ?? []) {
    if (isValidNpi(token)) return { bare: token, keyType: "NPI" };
    if (isValidUei(token.toUpperCase()) && /[A-Za-z]/.test(token)) {
      return { bare: token.toUpperCase(), keyType: "UEI" };
    }
    if (isValidEin(token)) return { bare: token, keyType: "EIN" };
  }
  return null;
}

const ACCUSATION_PATTERNS: readonly RegExp[] = [
  /commit\w*\s+(?:\w+\s+){0,3}?fraud/i,
  /did\s+not\s+commit/i,
  /didn'?t\s+commit/i,
  /never\s+committed/i,
  /defraud\w*/i,
  /corrupt\w*/i,
  /engaged\s+in\s+fraud/i,
  /perpetrat\w*/i,
  /prove\s+(?:\w+\s+){0,4}?(fraud|corrupt)/i,
];

export function parseClaim(input: ClaimInput): ParsedClaim {
  const statement = input.statement;
  let engine = input.subjectEngine?.trim() ? input.subjectEngine.trim() : null;
  let bare: string | null = null;
  let keyType: string | null = null;
  let entityKey: string | null = null;
  if (input.subjectEntityKey?.trim()) {
    const split = splitEntityKey(engine ?? "cross", input.subjectEntityKey);
    bare = split.bare;
    keyType = split.keyType;
    entityKey = split.canonical;
  } else {
    const found = findIdentifiers(statement);
    if (found) {
      bare = found.bare;
      keyType = found.keyType;
      entityKey = `${found.keyType}:${found.bare}`;
    }
  }
  if (!engine && keyType === "UEI") engine = "grants";
  if (!engine && keyType === "EIN") engine = "cross";

  const counts: ParsedClaim["counts"] = [];
  for (const m of statement.matchAll(COUNT_RE)) {
    const value = Number(m[1].replace(/,/g, ""));
    if (Number.isFinite(value)) counts.push({ value, unit: m[2].toLowerCase() });
  }
  const years = [...new Set((statement.match(YEAR_RE) ?? []).map(Number))];
  const aln = ALN_RE.exec(statement)?.[0] ?? null;

  let screeningClaim: ParsedClaim["screeningClaim"] = null;
  const lower = statement.toLowerCase();
  const negated = /\b(not|never|no|isn'?t|wasn'?t)\b[^.]{0,24}\b(list|exclud)/.test(lower);
  if (/\bleie\b/.test(lower) && /(list|exclud)/.test(lower)) {
    screeningClaim = { register: "leie", claimedListed: !negated };
  } else if (/\bsam\b/.test(lower) && /(list|exclud)/.test(lower)) {
    screeningClaim = { register: "sam", claimedListed: !negated };
  }

  return {
    engine,
    entityKey,
    bareKey: bare,
    keyType,
    money: parseMoney(statement),
    counts,
    years,
    aln,
    accusation: ACCUSATION_PATTERNS.some((re) => re.test(statement)),
    whipOnePercent:
      /(1\s*%|1\s+percent|one\s+percent)/i.test(statement) &&
      /(whistleblow|tip|whip|commission|reward)/i.test(statement),
    expenditureMeasure: /\bexpend\w*\b/i.test(statement) || /\bspent\b/i.test(statement),
    outlayMeasure: /\boutlay\w*\b/i.test(statement),
    screeningClaim,
  };
}

// ---------------------------------------------------------------------------
// Corpus figure extraction (code computations over tool outputs)
// ---------------------------------------------------------------------------

type Rec = Record<string, unknown>;
function rec(value: unknown): Rec {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Rec)
    : {};
}
function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

interface CorpusFigure {
  label: string;
  value: number | null;
}

function profileFigures(engine: string, data: Rec): CorpusFigure[] {
  const figures: CorpusFigure[] = [];
  if (engine === "grants") {
    const totals = rec(data.totals);
    const stub = rec(data.stub);
    figures.push(
      {
        label: "award-cumulative obligated total",
        value: num(totals.obligatedAwardCumulativeUsd) ?? num(stub.obligatedAwardCumulativeUsd),
      },
      {
        label: "award-cumulative outlay total",
        value: num(totals.outlayAwardCumulativeUsd) ?? num(stub.outlayAwardCumulativeUsd),
      },
      { label: "awards (count)", value: num(totals.awardCount) ?? num(stub.awardCount) },
    );
    return figures;
  }
  if (engine === "care") {
    const stub = rec(data.stub);
    const years = Array.isArray(data.years) ? data.years : [];
    // Code computation (§4.3 step 2): the per-year derived
    // figures are summed by the checker, never by a model.
    const derivedSum = years.reduce<number | null>((acc, y) => {
      const v = num(rec(y).pymtDerivedUsd);
      return v === null ? acc : (acc ?? 0) + v;
    }, null);
    figures.push(
      {
        label: "derived Medicare payment total",
        value: num(stub.pymtDerivedTotalUsd) ?? derivedSum,
      },
      { label: "services (count)", value: num(stub.servicesTotal) },
    );
    return figures;
  }
  // healthcare
  const summary = rec(data.summary);
  const billing = rec(summary.billing);
  const servicing = rec(summary.servicing);
  const stub = rec(data.stub);
  figures.push(
    {
      label: "billing paid total (excluding outlier cells)",
      value: num(billing.paidExclOutliersUsd) ?? num(stub.billingPaidExclUsd),
    },
    {
      label: "servicing paid total (excluding outlier cells)",
      value: num(servicing.paidExclOutliersUsd) ?? num(stub.servicingPaidExclUsd),
    },
    {
      label: "claim lines (count)",
      value: num(billing.totalClaimLines) ?? num(stub.billingClaimLines),
    },
  );
  return figures;
}

function primaryMoneyFigure(
  engine: string,
  statement: string,
  figures: CorpusFigure[],
): CorpusFigure | null {
  if (engine === "grants") {
    return figures.find((f) => f.label.includes("outlay")) && /\boutlay/.test(statement.toLowerCase())
      ? figures.find((f) => f.label.includes("outlay"))!
      : (figures.find((f) => f.label.includes("obligated")) ?? null);
  }
  if (engine === "healthcare") {
    if (/\bservicing\b/i.test(statement)) {
      return figures.find((f) => f.label.includes("servicing")) ?? null;
    }
    const billing = figures.find((f) => f.label.includes("billing"));
    if (billing && billing.value !== null) return billing;
    return billing ?? figures.find((f) => f.label.includes("servicing")) ?? null;
  }
  return figures[0] ?? null;
}

function screeningListed(engine: string, register: "leie" | "sam", data: Rec): boolean | null {
  if (register === "sam") {
    if (engine !== "grants") return null;
    const screening = rec(data.screening);
    const count = num(screening.samExclusionListingCount);
    if (count !== null) return count > 0;
    const stub = rec(data.stub);
    return typeof stub.samExclusionListed === "boolean" ? stub.samExclusionListed : null;
  }
  // LEIE: a grants screening block carries name candidates,
  // which are not listings — the corpus cannot settle a
  // listing claim from candidates (candidates are a
  // human-review queue, never matches).
  if (engine === "grants") return null;
  const summary = rec(data.summary);
  if (typeof summary.leieListed === "boolean") return summary.leieListed;
  const stub = rec(data.stub);
  if (typeof stub.leieListed === "boolean") return stub.leieListed;
  const leie = rec(data.leie);
  if (typeof leie.recordCount === "number") return leie.recordCount > 0;
  return null;
}

// ---------------------------------------------------------------------------
// The checker
// ---------------------------------------------------------------------------

class BudgetExceeded extends Error {}

export async function runClaimCheck(
  input: ClaimInput,
  deps: ClaimCheckDeps = {},
): Promise<ClaimCheckResult> {
  const startedAt = (deps.now ?? Date.now)();
  const budgetMs = deps.budgetMs ?? DEFAULT_CHECK_BUDGET_MS;
  const execute: ClaimToolExecutor =
    deps.execute ??
    ((name, args) => executeTool(name, args, { env: deps.toolDeps?.env, loaders: deps.toolDeps?.loaders, registryHealth: deps.toolDeps?.registryHealth }));
  const parsed = parseClaim(input);
  const results: ToolResult[] = [];
  let toolCalls = 0;

  const corpusVersions = (): Record<string, string> => {
    const versions: Record<string, string> = {};
    for (const r of results) {
      versions[r.envelope.dataset] = r.envelope.datasetVersion;
      for (const v of r.envelope.sourceVintages) versions[v.source] = v.version;
    }
    return versions;
  };

  const finish = (args: {
    verdict: ClaimVerdict;
    factualSummary: string;
    figures?: FigureComparison[];
    reason?: string | null;
    extraSummary?: string;
  }): ClaimCheckResult => {
    const figures = args.figures ?? [];
    let summary = args.factualSummary;
    let validatorVerdict: "pass" | "fallback" = "pass";
    if (results.length > 0) {
      // The claim's own figures are a legitimate source for a
      // summary to quote (they are the user's stated input, not
      // an invention), so they join the trace corpus alongside
      // the tool outputs under the first envelope.
      const claimFigures: ToolResult = {
        envelope: results[0].envelope,
        data: {
          claimFigures: extractNumericTokens(input.statement).map((t) => t.value),
        },
      };
      const validation = validateAnswer(summary, [...results, claimFigures]);
      if (validation.verdict === "fail") {
        // The §2.4 fallback pattern: a plain statement of the
        // verdict and the compared figures, code-rendered.
        validatorVerdict = "fallback";
        const table = figures
          .map(
            (f) =>
              `${f.label}: claim ${f.claimValue ?? "—"}; corpus ${f.corpusValue ?? "not published"}`,
          )
          .join("; ");
        summary = `Verdict: ${args.verdict}. ${table ? `Compared figures — ${table}.` : "No figures could be compared."}`;
      }
    }
    if (args.extraSummary) summary = `${summary} ${args.extraSummary}`;
    return {
      verdict: args.verdict,
      summary,
      evidence: {
        citations: results.map((r) => r.envelope),
        figures,
        reason: args.reason ?? null,
        subject: { engine: parsed.engine, entityKey: parsed.entityKey },
      },
      corpusVersions: corpusVersions(),
      checkerVersion: CLAIM_CHECKER_VERSION,
      validatorVerdict,
      model: null,
      promptVersion: null,
    };
  };

  const incomplete = (figures: FigureComparison[] = []): ClaimCheckResult =>
    finish({
      verdict: "insufficient-data",
      factualSummary: `The check against the published corpus did not complete, so no verdict on the claim's figures is recorded.`,
      figures,
      reason: CHECK_DID_NOT_COMPLETE_REASON,
    });

  async function callTool(
    name: string,
    args: Record<string, unknown>,
    opts?: { optional?: boolean },
  ): Promise<ToolResult | null> {
    if ((deps.now ?? Date.now)() - startedAt > budgetMs || toolCalls >= MAX_TOOL_CALLS) {
      throw new BudgetExceeded();
    }
    toolCalls += 1;
    try {
      const result = await execute(name, args);
      results.push(result);
      if ((deps.now ?? Date.now)() - startedAt > budgetMs) throw new BudgetExceeded();
      return result;
    } catch (err) {
      if (err instanceof BudgetExceeded) throw err;
      if (err instanceof ToolError && opts?.optional) return null;
      if (err instanceof ToolError) return null;
      throw err;
    }
  }

  try {
    // ── WHIP 1% — the programme-terms assertion (§5.4.4) ──
    if (parsed.whipOnePercent) {
      await callTool("get_source_registry", {}, { optional: true });
      return finish({
        verdict: "contradicted",
        factualSummary:
          `The claim asserts a 1% reward for whistleblower tips. That assertion conflicts with the programme terms as published: the 1% figure is not a term of the published programme.`,
        reason:
          "what is contradicted is the programme-terms assertion, checked against DOJ's published framework as carried in the source material",
        extraSummary: WHIP_FRAMEWORK_TEXT,
      });
    }

    // ── Subject resolution ──
    const hasCheckable =
      parsed.money.length > 0 ||
      parsed.counts.length > 0 ||
      parsed.screeningClaim !== null ||
      parsed.accusation;
    if (!parsed.bareKey && !parsed.aln) {
      return finish({
        verdict: "insufficient-data",
        factualSummary: `The statement names no entity or record the published corpus can look up, so it cannot be checked against the corpus.`,
        reason: NO_CHECKABLE_CONTENT_REASON,
      });
    }
    if (!hasCheckable && !parsed.aln) {
      return finish({
        verdict: "insufficient-data",
        factualSummary: `The statement contains no figure, count, or listing fact the published corpus can compare, so it cannot be settled from the corpus.`,
        reason: NO_CHECKABLE_CONTENT_REASON,
      });
    }

    // ── ALN-only claims ──
    if (!parsed.bareKey && parsed.aln) {
      const result = await callTool("lookup_aggregates", {
        grain: "grants-aln",
        key: parsed.aln,
        limit: 25,
      });
      const data = rec(result?.data);
      if (!result || data.state === "not_available") {
        return finish({
          verdict: "insufficient-data",
          factualSummary: `The grants ALN grain is not available in this deployment, so the claim about ALN ${parsed.aln} cannot be checked.`,
          reason: "aggregate grain not available",
        });
      }
      const rows = Array.isArray(data.rows) ? data.rows : [];
      const row = rows.map(rec).find((r) => r.aln === parsed.aln);
      if (!row) {
        return finish({
          verdict: "not-in-corpus",
          factualSummary: `ALN ${parsed.aln} does not appear in the published grants corpus. Absence is stated as absence: it can mean the programme sits outside the corpus's coverage.`,
          reason: "ALN absent from the published corpus",
        });
      }
      const corpusValue = num(row.obligatedAwardCumulativeUsd);
      const claimed = parsed.money[0];
      if (!claimed) {
        return finish({
          verdict: "insufficient-data",
          factualSummary: `ALN ${parsed.aln} appears in the published grants corpus, but the statement gives no figure to compare against it.`,
          reason: NO_CHECKABLE_CONTENT_REASON,
        });
      }
      const figures: FigureComparison[] = [
        {
          label: `ALN ${parsed.aln} award-cumulative obligated total`,
          claimValue: claimed.value,
          corpusValue,
          outcome:
            corpusValue === null
              ? "unavailable"
              : Math.abs(corpusValue - claimed.value) <= claimed.tolerance
                ? "match"
                : "conflict",
        },
      ];
      if (corpusValue === null) {
        return finish({
          verdict: "insufficient-data",
          factualSummary: `The published corpus carries no obligated figure for ALN ${parsed.aln}, so the claimed figure cannot be settled.`,
          figures,
          reason: "needed figure carries no published value",
        });
      }
      const matches = figures[0].outcome === "match";
      return finish({
        verdict: matches ? "supported" : "contradicted",
        factualSummary: matches
          ? `The published grants corpus records an award-cumulative obligated total of $${corpusValue} for ALN ${parsed.aln}, which matches the claim's figure of $${claimed.value}.`
          : `The published grants corpus records an award-cumulative obligated total of $${corpusValue} for ALN ${parsed.aln}, which conflicts with the claim's figure of $${claimed.value}.`,
        figures,
      });
    }

    // ── Profile fetch (via the registry tools) ──
    const engine = parsed.engine ?? "cross";
    const fetchProfile = async (
      eng: string,
    ): Promise<{ result: ToolResult; data: Rec } | null> => {
      if (eng === "grants") {
        const r = await callTool("get_grant_recipient_profile", { uei: parsed.bareKey! });
        return r ? { result: r, data: rec(r.data) } : null;
      }
      if (eng === "care") {
        const r = await callTool("get_medicare_provider_profile", { npi: parsed.bareKey! });
        return r ? { result: r, data: rec(r.data) } : null;
      }
      const r = await callTool("get_medicaid_provider_profile", { npi: parsed.bareKey! });
      return r ? { result: r, data: rec(r.data) } : null;
    };

    let effectiveEngine =
      engine === "cross" && parsed.keyType === "EIN"
        ? "fac"
        : engine === "cross"
          ? "healthcare"
          : engine;
    let profile: { result: ToolResult; data: Rec } | null = null;

    if (effectiveEngine === "fac") {
      const r = await callTool("get_fac_auditee", { ueiOrEin: parsed.bareKey! });
      const data = r ? rec(r.data) : {};
      if (!r || data.coverage === "recipient_not_in_published_data") {
        return finish({
          verdict: "not-in-corpus",
          factualSummary: `No published record for ${parsed.entityKey} appears in the corpus. Absence is stated as absence: it can mean the entity sits below a reporting or suppression threshold.`,
          reason: "subject absent from the published corpus",
        });
      }
      return finish({
        verdict: "insufficient-data",
        factualSummary: `The published corpus carries only single-audit context for ${parsed.entityKey} at this grain, which cannot settle the claim as stated.`,
        reason: "auditee-grain detail cannot settle this claim",
      });
    }

    profile = await fetchProfile(effectiveEngine);
    if (
      profile &&
      profile.data.found === false &&
      profile.data.state === "not_in_published_data" &&
      engine === "cross" &&
      parsed.keyType === "NPI"
    ) {
      // Cross-engine NPI: try the care engine before declaring
      // absence — absence must be corpus-wide to be honest.
      const careProfile = await fetchProfile("care");
      if (careProfile && careProfile.data.found !== false) {
        profile = careProfile;
        effectiveEngine = "care";
      }
    }
    if (!profile) {
      return finish({
        verdict: "insufficient-data",
        factualSummary: `The published corpus for this subject is not available in this deployment, so the claim cannot be checked.`,
        reason: "profile dataset not published in this deployment",
      });
    }
    if (profile.data.state === "dataset_not_published") {
      return finish({
        verdict: "insufficient-data",
        factualSummary: `The published corpus for this subject is not published in this deployment, so the claim cannot be checked.`,
        reason: "profile dataset not published in this deployment",
      });
    }
    if (profile.data.found === false) {
      return finish({
        verdict: "not-in-corpus",
        factualSummary: `No published record for ${parsed.entityKey} appears in the corpus. Absence is stated as absence: it can mean the entity sits below a reporting or suppression threshold, or outside the corpus's coverage.`,
        reason: "subject absent from the published corpus",
      });
    }

    const data = profile.data;
    const corpusFigures = profileFigures(effectiveEngine, data);

    // ── Accusation-shaped claims (§4.4) ──
    if (parsed.accusation) {
      const signals = await callTool(
        "get_entity_signals",
        { entityKey: parsed.bareKey! },
        { optional: true },
      ).catch(() => null);
      void signals;
      const primary = primaryMoneyFigure(effectiveEngine, input.statement, corpusFigures);
      const shown =
        primary && primary.value !== null
          ? ` What the records do show: the published corpus records a ${primary.label} of $${primary.value} for this entity, as cited.`
          : ` The published corpus carries a profile for this entity, as cited, but no headline figure settles anything further.`;
      const label = parsed.entityKey ?? "the entity";
      return finish({
        verdict: "insufficient-data",
        factualSummary: `${accusationOpening(label)}${shown} ${RESEARCH_LEAD_STANDING_SENTENCE}`,
        reason:
          "accusation-shaped claim: the corpus contains no determinations of the kind the statement asserts, in either direction",
        extraSummary: REFERRAL_BLOCK,
      });
    }

    // ── Measure conflation (§5.4.4) ──
    if (parsed.expenditureMeasure) {
      return finish({
        verdict: "insufficient-data",
        factualSummary: `The claim is stated in expenditures, a measure the published corpus keeps distinct from the award-cumulative obligated and outlay totals it publishes for this subject. The two measures cannot be compared as stated.`,
        reason: "claim compares measures the corpus keeps distinct (obligations versus expenditures)",
      });
    }

    // ── Period the corpus does not publish ──
    if (effectiveEngine === "care" && parsed.years.length > 0) {
      const years = Array.isArray(data.years) ? data.years : [];
      const publishedYears = years
        .map((y) => num(rec(y).year))
        .filter((y): y is number => y !== null);
      const stubYears = Array.isArray(rec(data.stub).yearsPresent)
        ? (rec(data.stub).yearsPresent as number[])
        : [];
      const allYears = publishedYears.length > 0 ? publishedYears : stubYears;
      if (allYears.length > 0 && parsed.years.some((y) => !allYears.includes(y))) {
        return finish({
          verdict: "insufficient-data",
          factualSummary: `The claim is stated for a period the published corpus does not publish for this provider; the published years are ${allYears.join(", ")}.`,
          reason: "claim spans a period the corpus does not publish",
        });
      }
    }

    // ── Screening / listing claims ──
    if (parsed.screeningClaim) {
      const listed = screeningListed(
        effectiveEngine,
        parsed.screeningClaim.register,
        data,
      );
      if (listed === null) {
        return finish({
          verdict: "insufficient-data",
          factualSummary: `The published corpus cannot settle this listing claim for this subject: the relevant screening record is a name-candidate queue or is not published at this grain, and a candidate is not a listing.`,
          reason: "listing cannot be settled from the published screening record",
        });
      }
      const matches = listed === parsed.screeningClaim.claimedListed;
      return finish({
        verdict: matches ? "supported" : "contradicted",
        factualSummary: matches
          ? `The published screening record for this subject ${listed ? "does" : "does not"} carry a listing, which matches the claim as stated, with the extract vintage cited.`
          : `The published screening record for this subject ${listed ? "does" : "does not"} carry a listing, which conflicts with the claim as stated, with the extract vintage cited.`,
        reason: "listing fact compared against the published screening record",
      });
    }

    // ── Figure comparison (the decision table, §4.3 step 3) ──
    const figures: FigureComparison[] = [];
    let sawConflict = false;
    let sawUnavailable = false;

    const claimedMoney = parsed.money[0];
    if (claimedMoney) {
      const primary = primaryMoneyFigure(effectiveEngine, input.statement, corpusFigures);
      if (!primary) {
        sawUnavailable = true;
      } else if (primary.value === null) {
        figures.push({
          label: primary.label,
          claimValue: claimedMoney.value,
          corpusValue: null,
          outcome: "unavailable",
        });
        sawUnavailable = true;
      } else {
        const outcome =
          Math.abs(primary.value - claimedMoney.value) <= claimedMoney.tolerance
            ? "match"
            : "conflict";
        if (outcome === "conflict") sawConflict = true;
        figures.push({
          label: primary.label,
          claimValue: claimedMoney.value,
          corpusValue: primary.value,
          outcome,
        });
      }
    }
    for (const count of parsed.counts) {
      const corpus = corpusFigures.find((f) =>
        count.unit.startsWith("award")
          ? f.label.includes("awards (count)")
          : count.unit.startsWith("claim")
            ? f.label.includes("claim lines (count)")
            : count.unit.startsWith("service")
              ? f.label.includes("services (count)")
              : false,
      );
      if (!corpus || corpus.value === null) {
        if (corpus) {
          figures.push({
            label: corpus.label,
            claimValue: count.value,
            corpusValue: null,
            outcome: "unavailable",
          });
        }
        sawUnavailable = true;
        continue;
      }
      const outcome = corpus.value === count.value ? "match" : "conflict";
      if (outcome === "conflict") sawConflict = true;
      figures.push({
        label: corpus.label,
        claimValue: count.value,
        corpusValue: corpus.value,
        outcome,
      });
    }

    if (figures.length === 0) {
      return finish({
        verdict: "insufficient-data",
        factualSummary: `The published corpus carries a profile for this subject, but the statement's figures could not be matched to a published measure, so the claim cannot be settled as stated.`,
        figures,
        reason: "no comparable published measure for the claimed figure",
      });
    }
    if (sawConflict) {
      const conflict = figures.find((f) => f.outcome === "conflict")!;
      return finish({
        verdict: "contradicted",
        factualSummary: `The published corpus records a ${conflict.label} of ${conflict.label.includes("(count)") ? conflict.corpusValue : `$${conflict.corpusValue}`} for this subject, which conflicts with the claim's figure of ${conflict.label.includes("(count)") ? conflict.claimValue : `$${conflict.claimValue}`}.`,
        figures,
      });
    }
    if (sawUnavailable) {
      return finish({
        verdict: "insufficient-data",
        factualSummary: `A figure the claim needs carries no published value in the corpus for this subject — the relevant cells are unpublished or absent from the published record — so the claim cannot be settled as stated. Absence of a value is never read as zero.`,
        figures,
        reason: "needed cells are unpublished or carry no value",
      });
    }
    const first = figures[0];
    return finish({
      verdict: "supported",
      factualSummary: `The published corpus records a ${first.label} of ${first.label.includes("(count)") ? first.corpusValue : `$${first.corpusValue}`} for this subject, which matches the claim as stated. Every compared figure matched within the corpus's own rounding.`,
      figures,
    });
  } catch (err) {
    if (err instanceof BudgetExceeded) return incomplete();
    throw err;
  }
}

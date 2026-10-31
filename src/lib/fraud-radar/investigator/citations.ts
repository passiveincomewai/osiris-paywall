/**
 * Fraud Radar Phase 7 — citation envelope + trace validator
 * (PHASE7 §2.3, §2.4). Pure functions, no model call, no I/O.
 *
 * The no-invention contract, enforced mechanically: the model
 * can only cite what a tool returned. Every tool result carries
 * the citation envelope (dataset + version + grain key + source
 * vintages + caveat codes). Before an answer is persisted or
 * streamed as final, `validateAnswer` extracts every numeric
 * token from the draft, normalises formatting, and checks each
 * against the turn's tool-output corpus (values as returned,
 * plus their standard formatted renderings). A number with no
 * match fails the turn; identifiers are checked exactly; quoted
 * entity names must appear as returned; and the banned
 * vocabulary scan (guardrails.ts) runs over the same text.
 *
 * Numbers that appear inside citations themselves — the
 * dataset version and extract dates in a rendered citation
 * such as `grants-aggregates@2026-10-06` or the SAM exclusions
 * extract date 2026-10-28 — trace to the envelope's own fields,
 * which are part of the corpus by construction (see
 * buildTraceCorpus). The standing referral / WHIP blocks are
 * code-rendered copy (guardrails.ts), not model prose, and are
 * not part of the draft this validator checks.
 */

import { scanBannedVocabulary } from "./guardrails";

// ---------------------------------------------------------------------------
// The citation envelope (PHASE7 §2.3 — every tool result, no
// exceptions). Citation = dataset + version + grain key.
// ---------------------------------------------------------------------------

export interface SourceVintage {
  /** Registry slug of the upstream source. */
  source: string;
  /** The published vintage actually read. */
  version: string;
  /** SAM/LEIE extracts carry their extract date with the data. */
  extractDate?: string;
}

export interface CitationEnvelope {
  tool: string;
  /** Registry slug family of the dataset read. */
  dataset: string;
  /** The published vintage actually read. */
  datasetVersion: string;
  /** NPI:… / UEI:… / EIN:… / award key / code / slug / query. */
  grainKey: string;
  /** Every upstream vintage inside the result. */
  sourceVintages: SourceVintage[];
  /** PHASE6 Appendix A caveat codes; text in guardrails.ts. */
  caveats: string[];
  /** True when the adapter capped a list (top-N + totals in data). */
  truncated: boolean;
}

export interface ToolResult<T = unknown> {
  envelope: CitationEnvelope;
  /** The data-layer record, nulls preserved end-to-end. */
  data: T;
}

/** A result without a complete envelope is a tool-layer bug and
 *  fails the turn's validation — it is not a citable fact. */
export function envelopeComplete(envelope: CitationEnvelope): boolean {
  if (!envelope.tool || !envelope.dataset || !envelope.datasetVersion) return false;
  if (!envelope.grainKey) return false;
  if (!Array.isArray(envelope.sourceVintages) || envelope.sourceVintages.length === 0) {
    return false;
  }
  for (const v of envelope.sourceVintages) {
    if (!v.source || !v.version) return false;
  }
  if (!Array.isArray(envelope.caveats)) return false;
  return typeof envelope.truncated === "boolean";
}

/** The rendered citation form: `dataset@version · grainKey`. */
export function formatCitation(envelope: CitationEnvelope): string {
  return `${envelope.dataset}@${envelope.datasetVersion} · ${envelope.grainKey}`;
}

// ---------------------------------------------------------------------------
// Trace corpus: everything an answer may legitimately repeat
// from one turn's tool outputs.
// ---------------------------------------------------------------------------

export interface TraceCorpus {
  /** Numeric values as returned (numeric fields, pure-digit
   *  identifier strings, dotted code strings such as ALNs, and
   *  the digit runs of date/version strings in the data). */
  numbers: number[];
  /** Identifier strings exactly as returned (NPIs, UEIs, EINs,
   *  award keys, codes) plus every envelope grain key. */
  identifiers: Set<string>;
  /** All string values as returned, lower-cased, for the
   *  quoted-name trace check. */
  texts: string[];
}

const DATE_OR_VERSION = /^\d{4}(-\d{2})?(-\d{2})?(_[a-z]{2}\d{4})?$/i;
const DOTTED_CODE = /^\d+\.\d+$/;
const PURE_DIGITS = /^\d+$/;

function collectFromValue(value: unknown, corpus: TraceCorpus): void {
  if (typeof value === "number") {
    if (Number.isFinite(value)) corpus.numbers.push(value);
    return;
  }
  if (typeof value === "string") {
    corpus.texts.push(value.toLowerCase());
    const trimmed = value.trim();
    if (PURE_DIGITS.test(trimmed)) {
      corpus.numbers.push(Number(trimmed));
      corpus.identifiers.add(trimmed);
    } else if (DOTTED_CODE.test(trimmed)) {
      corpus.numbers.push(Number(trimmed));
      corpus.identifiers.add(trimmed);
    } else if (DATE_OR_VERSION.test(trimmed)) {
      for (const run of trimmed.match(/\d+/g) ?? []) {
        corpus.numbers.push(Number(run));
      }
      corpus.identifiers.add(trimmed);
    } else if (/^[A-Z0-9][A-Z0-9_-]{2,}$/.test(trimmed) && /\d/.test(trimmed)) {
      // Identifier-shaped strings (UEIs, award keys, taxonomy
      // codes) trace as identifiers, exactly — their digit runs
      // do NOT become citable numbers.
      corpus.identifiers.add(trimmed);
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectFromValue(item, corpus);
    return;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) collectFromValue(item, corpus);
  }
}

export function buildTraceCorpus(results: ToolResult[]): TraceCorpus {
  const corpus: TraceCorpus = { numbers: [], identifiers: new Set(), texts: [] };
  for (const result of results) {
    collectFromValue(result.data, corpus);
    const { envelope } = result;
    corpus.identifiers.add(envelope.grainKey);
    const grainValue = envelope.grainKey.split(":").slice(1).join(":");
    if (grainValue) corpus.identifiers.add(grainValue);
    // Numbers inside citations themselves trace to the
    // envelope: dataset version, source versions, extract dates.
    const citationStrings = [
      envelope.datasetVersion,
      ...envelope.sourceVintages.flatMap((v) =>
        v.extractDate ? [v.version, v.extractDate] : [v.version],
      ),
    ];
    for (const s of citationStrings) {
      corpus.texts.push(s.toLowerCase());
      for (const run of s.match(/\d+/g) ?? []) corpus.numbers.push(Number(run));
    }
  }
  return corpus;
}

// ---------------------------------------------------------------------------
// Answer checks.
// ---------------------------------------------------------------------------

export interface NumericToken {
  /** The token exactly as it appeared in the answer. */
  raw: string;
  value: number;
}

/** Numeric tokens: optional $, thousands separators, decimals,
 *  optional trailing %. Formatting is normalised away — the
 *  value is what must trace. */
export function extractNumericTokens(text: string): NumericToken[] {
  const out: NumericToken[] = [];
  const re = /\$?\d[\d,]*(?:\.\d+)?%?/g;
  for (const match of text.matchAll(re)) {
    const raw = match[0];
    const value = Number(raw.replace(/[$,%]/g, ""));
    if (Number.isFinite(value)) out.push({ raw, value });
  }
  return out;
}

function tracesNumber(value: number, corpusNumbers: number[]): boolean {
  return corpusNumbers.some(
    (c) => Math.abs(c - value) <= Math.max(1e-9, Math.abs(c) * 1e-12),
  );
}

const IDENTIFIER_PATTERNS: RegExp[] = [
  /\b\d{2}-\d{7}\b/g, // EIN, hyphenated
  /\b\d{10}\b/g, // NPI
  /\b[A-Z0-9]{12}\b/g, // UEI (checked for a digit below)
  /\b\d{2}\.\d{3}\b/g, // ALN
];

export function extractIdentifiers(text: string): string[] {
  const out = new Set<string>();
  for (const re of IDENTIFIER_PATTERNS) {
    for (const match of text.matchAll(re)) {
      const token = match[0];
      if (token.length === 12 && !/\d/.test(token)) continue;
      out.add(token);
    }
  }
  return [...out];
}

/** Quoted spans (straight or curly quotes) — the form in which
 *  an answer presents an entity's name as returned. */
export function extractQuotedNames(text: string): string[] {
  const out: string[] = [];
  for (const match of text.matchAll(/"([^"]{2,})"|“([^”]{2,})”/g)) {
    out.push((match[1] ?? match[2]).trim());
  }
  return out;
}

export interface AnswerValidation {
  verdict: "pass" | "fail";
  /** Raw numeric tokens with no trace to a tool output. */
  untraceableNumbers: string[];
  /** Identifiers not present, exactly, in the corpus. */
  untraceableIdentifiers: string[];
  /** Quoted names not present in the corpus as returned. */
  untraceableNames: string[];
  /** Banned-vocabulary phrases found in the answer. */
  bannedHits: string[];
}

export const PASS_VALIDATION: AnswerValidation = {
  verdict: "pass",
  untraceableNumbers: [],
  untraceableIdentifiers: [],
  untraceableNames: [],
  bannedHits: [],
};

/**
 * Digit runs inside identifier-shaped tokens (a UEI's letter/
 * digit mix, a taxonomy code, a hyphenated EIN) are parts of
 * identifiers, not citable numbers — they are masked before
 * numeric extraction and checked by the identifier path instead.
 * Pure-digit identifiers (an NPI) stay visible to both paths:
 * as returned they are strings of digits, collected into the
 * corpus as numbers as well as identifiers.
 */
export function maskIdentifierDigitRuns(text: string): string {
  return text
    .replace(/\b\d{2}-\d{7}\b/g, " ")
    .replace(/\b(?=[A-Z0-9]*[A-Z])(?=[A-Z0-9]*\d)[A-Z0-9]{4,}\b/g, " ");
}

/**
 * The §2.4 validator. Given a draft answer and the turn's tool
 * outputs, verify every number traces verbatim to a tool
 * output, every identifier traces exactly, every quoted name
 * appears as returned, and no banned vocabulary is present.
 * Pure: same inputs, same verdict.
 */
export function validateAnswer(
  answer: string,
  results: ToolResult[],
): AnswerValidation {
  // An incomplete envelope anywhere in the turn means the
  // corpus itself cannot be trusted — fail closed.
  for (const result of results) {
    if (!envelopeComplete(result.envelope)) {
      return {
        verdict: "fail",
        untraceableNumbers: extractNumericTokens(maskIdentifierDigitRuns(answer)).map(
          (t) => t.raw,
        ),
        untraceableIdentifiers: [],
        untraceableNames: [],
        bannedHits: scanBannedVocabulary(answer),
      };
    }
  }
  const corpus = buildTraceCorpus(results);
  const untraceableNumbers = extractNumericTokens(maskIdentifierDigitRuns(answer))
    .filter((t) => !tracesNumber(t.value, corpus.numbers))
    .map((t) => t.raw);
  const untraceableIdentifiers = extractIdentifiers(answer).filter(
    (id) => !corpus.identifiers.has(id),
  );
  const joinedTexts = corpus.texts.join("\n");
  const untraceableNames = extractQuotedNames(answer).filter(
    (name) => !joinedTexts.includes(name.toLowerCase()),
  );
  const bannedHits = scanBannedVocabulary(answer);
  const fail =
    untraceableNumbers.length > 0 ||
    untraceableIdentifiers.length > 0 ||
    untraceableNames.length > 0 ||
    bannedHits.length > 0;
  return {
    verdict: fail ? "fail" : "pass",
    untraceableNumbers,
    untraceableIdentifiers,
    untraceableNames,
    bannedHits,
  };
}

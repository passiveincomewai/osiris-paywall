/**
 * Source hashing for translation maintenance (brief §11).
 *
 * A manifest entry's `sourceHash` is the SHA-256 of the page's English
 * dictionary at publish time. When the English source changes, the
 * recomputed hash stops matching and the entry reads as outdated —
 * surfaced by the dictionary completeness test today and by the admin
 * "International SEO" section once it lands. Tooling/test-only: this
 * module imports node:crypto and must never be imported by a client
 * component.
 */

import { createHash } from "node:crypto";

/** Deterministic serialization: object keys sorted at every depth. */
export function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "undefined";
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries
    .map(([k, v]) => `${JSON.stringify(k)}:${stableSerialize(v)}`)
    .join(",")}}`;
}

export function dictionarySourceHash(dictionary: unknown): string {
  return createHash("sha256").update(stableSerialize(dictionary), "utf8").digest("hex");
}

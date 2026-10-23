// ── Compliance guards ────────────────────────────────────────────────
// Every lifecycle send passes through evaluateGuards BEFORE it is
// rendered or sent. The order is deliberate: identity exclusions first
// (owner/test inboxes are never recipients, whatever the data says),
// then the once-only log, then the marketing-only rules (opt-out, 48h
// cap). Transactional mail (trial started, affiliate activity) is
// exempt from the opt-out and the cap — it is account service mail,
// the same class as the existing trial-ending reminder — but never
// from the exclusion list or the once-only rule.
//
// Pure: the engine supplies the facts (log lookups already done).

import { isExcludedEmail, MARKETING_CAP_MAX } from "./config";

export type EmailKind = "marketing" | "transactional";

export interface GuardInput {
  email: string | null | undefined;
  kind: EmailKind;
  /** User.emailOptOut — the global marketing opt-out flag. */
  emailOptOut: boolean;
  /** A "sent" LifecycleEmailLog row already exists for this (user, template, context). */
  alreadySent: boolean;
  /** Marketing sends (status "sent") to this user inside the cap window. */
  marketingSendsInWindow: number;
}

export type GuardResult =
  | { allow: true }
  | {
      allow: false;
      reason:
        | "no_email"
        | "excluded_recipient"
        | "already_sent"
        | "opted_out"
        | "marketing_cap";
    };

export function evaluateGuards(input: GuardInput): GuardResult {
  if (!input.email || input.email.trim() === "") {
    return { allow: false, reason: "no_email" };
  }
  if (isExcludedEmail(input.email)) {
    return { allow: false, reason: "excluded_recipient" };
  }
  if (input.alreadySent) {
    return { allow: false, reason: "already_sent" };
  }
  if (input.kind === "marketing") {
    if (input.emailOptOut) {
      return { allow: false, reason: "opted_out" };
    }
    if (input.marketingSendsInWindow >= MARKETING_CAP_MAX) {
      return { allow: false, reason: "marketing_cap" };
    }
  }
  return { allow: true };
}

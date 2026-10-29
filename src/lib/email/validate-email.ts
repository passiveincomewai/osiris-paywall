// ── Instant email validation (shared) ───────────────────────────────────
// Jameson's rule (2026-10-28): an address is checked the moment it is
// entered and the subscriber is on the list immediately when it passes —
// nobody is asked to verify by email any more, but junk like a@a.com
// must never get in. Generalized 2026-10-29: account signup runs the
// same check (Jameson: a fake address must never become an account
// either), so the validator lives here in lib/email, shared by
// lib/newsletter/subscribe (which imports it via the
// lib/newsletter/validate-email re-export shim) and /api/auth/signup.
// Every caller runs it BEFORE any database write.
//
// The checks, in order (first failure wins):
//   1. strict syntax           — shape, lengths, dot/hyphen rules
//   2. placeholder domains     — example.*, *.test, *.invalid, …
//   3. disposable domains      — lib/email/disposable-domains
//   4. junk patterns           — the a@a.com class (see isJunkPattern)
//   5. likely-typo suggestion  — edit distance vs known mailbox domains;
//                                a SUGGESTION, never a silent rewrite and
//                                never a block when the user confirms
//                                their address as-is (step skipped when
//                                `confirmed` is set)
//   6. domain accepts mail     — DNS MX, falling back to A/AAAA
//
// DNS failure policy (step 6): a domain that provably does not exist or
// provably publishes no way to receive mail is a hard reject. A DNS
// lookup that itself fails transiently (timeout, SERVFAIL, resolver
// unreachable, or any unrecognized resolver error) is NOT a reject —
// the result is `dns_unavailable` and the caller answers with a
// retryable response, because a DNS hiccup must never tell a real
// person their real address is "fake". Unknown DNS error codes are
// treated as transient for the same reason.
import { resolve4, resolve6, resolveMx } from "node:dns/promises";
import { isDisposableEmailDomain } from "./disposable-domains";

/** The subset of node:dns/promises the validator needs (mocked in tests). */
export interface MailDnsResolver {
  resolveMx(domain: string): Promise<{ exchange: string; priority: number }[]>;
  resolve4(domain: string): Promise<string[]>;
  resolve6(domain: string): Promise<string[]>;
}

const DNS_TIMEOUT_MS = 3000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, reject) =>
      setTimeout(() => {
        const err = new Error("dns timeout") as NodeJS.ErrnoException;
        err.code = "ETIMEOUT";
        reject(err);
      }, ms),
    ),
  ]);
}

const systemDns: MailDnsResolver = {
  resolveMx: (d) => withTimeout(resolveMx(d), DNS_TIMEOUT_MS),
  resolve4: (d) => withTimeout(resolve4(d), DNS_TIMEOUT_MS),
  resolve6: (d) => withTimeout(resolve6(d), DNS_TIMEOUT_MS),
};

export type EmailRejectionCode =
  | "syntax"
  | "placeholder_domain"
  | "disposable_domain"
  | "junk_pattern"
  | "typo_suggestion"
  | "no_mail_server"
  | "dns_unavailable";

export type EmailValidation =
  | { ok: true; email: string }
  | {
      ok: false;
      code: EmailRejectionCode;
      /** Friendly, form-ready explanation. */
      message: string;
      /** For code "typo_suggestion": the full corrected address. */
      suggestion?: string;
      /** True when retrying unchanged may succeed (DNS hiccup). */
      retryable?: boolean;
    };

export interface ValidateEmailOptions {
  /** User saw a typo suggestion and confirmed the original address. */
  confirmed?: boolean;
  /** Test seam — defaults to the system resolver. */
  dns?: MailDnsResolver;
}

// ── Step 1: strict syntax ───────────────────────────────────────────────

const LOCAL_CHARS = /^[A-Za-z0-9!#$%&'*+\-/=?^_`{|}~.]+$/;
const DOMAIN_LABEL = /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/;
const TLD_CHARS = /^[A-Za-z]{2,}$/;

function syntaxProblem(email: string): string | null {
  if (email.length === 0) return "Enter your email address.";
  if (email.length > 254) return "That address is too long — check it and try again.";
  if (/\s/.test(email)) return "Email addresses can't contain spaces — check for a typo.";
  const at = email.split("@");
  if (at.length !== 2) return "That doesn't look like an email address — it needs exactly one @.";
  const [local, domain] = at as [string, string];
  if (local.length === 0 || domain.length === 0) {
    return "That email address looks incomplete — check it and try again.";
  }
  if (local.length > 64) return "The part before @ is too long — check the address.";
  if (!LOCAL_CHARS.test(local)) return "That address has characters an email can't contain.";
  if (local.startsWith(".") || local.endsWith(".") || local.includes("..")) {
    return "Dots in that address are in the wrong place — check for a typo.";
  }
  if (domain.length > 253) return "That email domain is too long — check the address.";
  const labels = domain.split(".");
  if (labels.length < 2) return "That email domain looks incomplete — it needs a dot (like gmail.com).";
  for (const label of labels) {
    if (label.length === 0 || label.length > 63 || !DOMAIN_LABEL.test(label)) {
      return "That email domain doesn't look right — check for a typo.";
    }
  }
  const tld = labels[labels.length - 1] as string;
  if (!TLD_CHARS.test(tld)) return "That email ending doesn't look right — check for a typo.";
  return null;
}

// ── Step 2: placeholder domains ─────────────────────────────────────────
// RFC-reserved and obviously-not-real domains. No DNS lookup is needed
// or wanted for these.

// Only the RFC 2606 / RFC 6761 reserved names live here — domains that
// cannot belong to anyone. Real registered domains that merely sound
// generic (mail.com is a major freemail provider!) do NOT belong: they
// go through the DNS step like everything else, and placeholder-style
// local parts at them (test@…) are caught by the junk-pattern step.
const PLACEHOLDER_DOMAINS = new Set([
  "example.com",
  "example.org",
  "example.net",
  "example.edu",
]);
const PLACEHOLDER_SUFFIXES = [".example", ".test", ".invalid", ".localhost", ".example.com"];

function isPlaceholderDomain(domain: string): boolean {
  return (
    PLACEHOLDER_DOMAINS.has(domain) ||
    PLACEHOLDER_SUFFIXES.some((s) => domain.endsWith(s))
  );
}

// ── Step 4: junk patterns (the a@a.com class) ───────────────────────────
// Principled rules, each aimed at addresses nobody actually receives
// mail at. Deliberately NOT here: short-but-plausible names (raju@,
// sam@), numeric locals (26965604@qq.com is a normal QQ address), or
// anything that merely "looks odd" — those pass to the DNS step.

/** Local parts that are placeholder words, not identities. */
const JUNK_LOCAL_PARTS = new Set([
  "a",
  "abc",
  "abcd",
  "abcde",
  "asdf",
  "asdfg",
  "asdfgh",
  "asdfasdf",
  "demo",
  "example",
  "fake",
  "fakeemail",
  "false",
  "foo",
  "foobar",
  "junk",
  "no",
  "nobody",
  "none",
  "nope",
  "notreal",
  "null",
  "qwerty",
  "qwertyuiop",
  "sample",
  "spam",
  "test",
  "test1",
  "test123",
  "testing",
  "testtest",
  "trash",
  "xxx",
  "xxxx",
  "xxxxx",
  "xxxxxx",
  "zxcv",
  "zxcvbn",
  "zxcvbnm",
  "123",
  "1234",
  "12345",
  "123456",
  "1234567",
  "12345678",
  "123456789",
  "1234567890",
]);

/** Keyboard walks: a local part that appears inside a keyboard row. */
const KEYBOARD_ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm", "1234567890"];

function isJunkPattern(local: string, domain: string): boolean {
  if (JUNK_LOCAL_PARTS.has(local)) return true;
  // One character repeated 3+ times ("aaa", "xxxx", "1111") — but a
  // double letter is a plausible name fragment, so the floor is 3.
  if (local.length >= 3 && new Set(local).size === 1) return true;
  // Keyboard mash of 4+ chars lifted straight from a row, either way.
  if (local.length >= 4) {
    const reversed = [...local].reverse().join("");
    if (KEYBOARD_ROWS.some((row) => row.includes(local) || row.includes(reversed))) {
      return true;
    }
  }
  // The a@a.com shape: a one-character local part in front of a domain
  // whose first label is 1–2 characters — a placeholder skeleton, not a
  // mailbox. A one-character local at a real provider (j@gmail.com) has
  // a full-length first label and is NOT caught by this rule.
  const firstLabel = domain.split(".")[0] as string;
  if (local.length === 1 && firstLabel.length <= 2) return true;
  return false;
}

// ── Step 5: typo suggestion ─────────────────────────────────────────────
// Edit distance (Damerau–Levenshtein, so transpositions like gmial→gmail
// cost 1) against the mailbox domains people actually mean. A distance
// of 1 always suggests; distance 2 suggests only for domains of 8+
// characters, where two slips are still unambiguous. The suggestion is
// offered, never forced: `confirmed` callers skip this step entirely.

const KNOWN_MAIL_DOMAINS = [
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.uk",
  "ymail.com",
  "hotmail.com",
  "hotmail.co.uk",
  "outlook.com",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "gmx.com",
  "gmx.net",
  "mail.com",
  "yandex.com",
  "yandex.ru",
  "qq.com",
  "163.com",
  "126.com",
  "sina.com",
  "comcast.net",
  "att.net",
  "sbcglobal.net",
  "verizon.net",
  "cox.net",
  "charter.net",
  "earthlink.net",
  "btinternet.com",
  "sky.com",
  "orange.fr",
  "free.fr",
  "web.de",
  "t-online.de",
  "libero.it",
  "virgilio.it",
  "wp.pl",
  "o2.pl",
  "interia.pl",
  "seznam.cz",
  "naver.com",
  "daum.net",
  "rediffmail.com",
];

function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const d: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i]![j] = Math.min(
        d[i - 1]![j]! + 1,
        d[i]![j - 1]! + 1,
        d[i - 1]![j - 1]! + cost,
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i]![j] = Math.min(d[i]![j]!, d[i - 2]![j - 2]! + 1);
      }
    }
  }
  return d[m]![n]!;
}

export function suggestDomainCorrection(domain: string): string | null {
  if (KNOWN_MAIL_DOMAINS.includes(domain)) return null;
  let best: string | null = null;
  let bestDist = Infinity;
  for (const known of KNOWN_MAIL_DOMAINS) {
    // Cheap prune: edit distance can't beat the length difference.
    if (Math.abs(known.length - domain.length) > 2) continue;
    const dist = editDistance(domain, known);
    if (dist < bestDist) {
      bestDist = dist;
      best = known;
    }
  }
  if (best === null) return null;
  if (bestDist <= 1) return best;
  if (bestDist === 2 && domain.length >= 8 && best.length >= 8) return best;
  return null;
}

// ── Step 6: does the domain accept mail? ────────────────────────────────

type MailCheck = "yes" | "no" | "unknown";

function dnsErrorCode(err: unknown): string {
  return (err as NodeJS.ErrnoException)?.code ?? "";
}

async function domainAcceptsMail(domain: string, dns: MailDnsResolver): Promise<MailCheck> {
  let sawTransient = false;
  // MX first.
  try {
    const mx = await dns.resolveMx(domain);
    if (mx.length > 0) {
      // RFC 7505 null MX: the domain explicitly never accepts mail.
      if (mx.every((r) => r.exchange === "." || r.exchange === "")) return "no";
      return "yes";
    }
  } catch (err) {
    const code = dnsErrorCode(err);
    if (code === "ENOTFOUND") return "no"; // NXDOMAIN: the domain does not exist.
    if (code !== "ENODATA") sawTransient = true; // ENODATA just means: try A/AAAA.
  }
  // Implicit MX: a domain with an A or AAAA record is expected to
  // receive mail at its own host (RFC 5321 §5.1).
  for (const resolve of [dns.resolve4, dns.resolve6] as const) {
    try {
      const addrs = await resolve(domain);
      if (addrs.length > 0) return "yes";
    } catch (err) {
      const code = dnsErrorCode(err);
      if (code === "ENOTFOUND") return "no";
      if (code !== "ENODATA") sawTransient = true;
    }
  }
  // No records anywhere. If every lookup answered definitively, the
  // domain cannot receive mail; if any lookup failed transiently we
  // cannot honestly say that — report "unknown" instead.
  return sawTransient ? "unknown" : "no";
}

// ── The validator ───────────────────────────────────────────────────────

/**
 * The synchronous half (steps 1–5, everything except DNS). Exported for
 * tests and for any future client-side pre-check; the subscribe path
 * always uses validateEmailAddress so the DNS step can't be skipped.
 */
export function validateEmailFormat(
  rawEmail: unknown,
  opts: { confirmed?: boolean } = {},
): EmailValidation {
  const email = String(rawEmail ?? "").trim().toLowerCase();

  const problem = syntaxProblem(email);
  if (problem) return { ok: false, code: "syntax", message: problem };

  const [local, domain] = email.split("@") as [string, string];

  if (isPlaceholderDomain(domain)) {
    return {
      ok: false,
      code: "placeholder_domain",
      message: "That looks like a placeholder address — enter your real email.",
    };
  }
  if (isDisposableEmailDomain(domain)) {
    return {
      ok: false,
      code: "disposable_domain",
      message:
        "That provider only offers temporary inboxes — use a permanent email address so you don't miss an issue.",
    };
  }
  if (isJunkPattern(local, domain)) {
    return {
      ok: false,
      code: "junk_pattern",
      message: "That looks like a made-up address — enter a real email.",
    };
  }
  if (!opts.confirmed) {
    const corrected = suggestDomainCorrection(domain);
    if (corrected) {
      return {
        ok: false,
        code: "typo_suggestion",
        message: `Did you mean ${local}@${corrected}?`,
        suggestion: `${local}@${corrected}`,
      };
    }
  }
  return { ok: true, email };
}

/** Full validation: format checks, then the DNS mail-acceptance check. */
export async function validateEmailAddress(
  rawEmail: unknown,
  opts: ValidateEmailOptions = {},
): Promise<EmailValidation> {
  const format = validateEmailFormat(rawEmail, { confirmed: opts.confirmed });
  if (!format.ok) return format;

  const domain = format.email.split("@")[1] as string;
  const mail = await domainAcceptsMail(domain, opts.dns ?? systemDns);
  if (mail === "no") {
    return {
      ok: false,
      code: "no_mail_server",
      message: "That email domain can't receive mail — check the part after @ for a typo.",
    };
  }
  if (mail === "unknown") {
    return {
      ok: false,
      code: "dns_unavailable",
      message: "We couldn't check that address just now — give it another try in a moment.",
      retryable: true,
    };
  }
  return format;
}

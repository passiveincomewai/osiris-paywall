// Instant email validation: each check in the documented order —
// syntax → placeholder → disposable → junk pattern → typo suggestion →
// DNS mail acceptance — with DNS injected so no test touches the
// network. The DNS policy cases matter most: a domain that provably
// can't receive mail is rejected, but a DNS lookup that fails
// transiently must NEVER be reported as "your address is fake".
import { describe, it, expect, vi } from "vitest";
import {
  validateEmailAddress,
  validateEmailFormat,
  suggestDomainCorrection,
  type MailDnsResolver,
} from "./validate-email";

function dnsError(code: string): NodeJS.ErrnoException {
  const err = new Error(code) as NodeJS.ErrnoException;
  err.code = code;
  return err;
}

type Behavior = "records" | string; // "records" or an error code to throw

function stubDns(behaviors: { mx?: Behavior; a?: Behavior; aaaa?: Behavior } = {}): MailDnsResolver {
  const make = (b: Behavior | undefined, records: unknown[]) =>
    vi.fn(async () => {
      if (b === undefined || b === "records") return records;
      throw dnsError(b);
    });
  return {
    resolveMx: make(behaviors.mx, [{ exchange: "mx.example.net", priority: 10 }]) as never,
    resolve4: make(behaviors.a, ["192.0.2.1"]) as never,
    resolve6: make(behaviors.aaaa, []) as never,
  };
}

const GOOD_DNS = stubDns();

describe("validateEmailAddress — passes real addresses", () => {
  it("accepts a normal gmail address and normalizes case/space", async () => {
    const res = await validateEmailAddress("  Person.Name@Gmail.com ", { dns: GOOD_DNS });
    expect(res).toEqual({ ok: true, email: "person.name@gmail.com" });
  });

  it("accepts a numeric-local qq address (a normal QQ pattern, not junk)", async () => {
    const res = await validateEmailAddress("26965604@qq.com", { dns: GOOD_DNS });
    expect(res.ok).toBe(true);
  });

  it("accepts a one-character local part at a real provider (j@gmail.com)", async () => {
    // The a@a.com rule targets a 1-char local before a 1–2-char domain
    // label; a full-length provider label must not trip it.
    const res = await validateEmailAddress("j@gmail.com", { dns: GOOD_DNS });
    expect(res.ok).toBe(true);
  });

  it("accepts a domain with no MX but an A record (implicit MX)", async () => {
    const dns = stubDns({ mx: "ENODATA", a: "records" });
    const res = await validateEmailAddress("someone@small-business-site.com", { dns });
    expect(res.ok).toBe(true);
  });

  it("KNOWN LIMIT: a well-formed address at a real domain passes even when the mailbox doesn't exist", async () => {
    // Instant checks see DOMAINS, not mailboxes: gmail.com publishes MX
    // records, so jamesonlythgoe111-style addresses (Jameson's own
    // 2026-10-29 test accounts — the mailboxes were never created at
    // Google and the verification mail hard-bounced) pass every check
    // here. Only a confirmation round trip could catch this case, and
    // none is performed by design (owner decision pending). This test
    // pins the limit so nobody mistakes the gate for mailbox proof.
    const res = await validateEmailAddress("no-such-mailbox-xyz123@gmail.com", { dns: GOOD_DNS });
    expect(res.ok).toBe(true);
  });
});

describe("validateEmailAddress — syntax", () => {
  it.each([
    "not-an-email",
    "two@@signs.com",
    "has space@example.com",
    "a..b@example.com",
    ".lead@example.com",
    "trail.@example.com",
    "user@nodot",
    "user@domain.c",
    "user@-bad.com",
    "user@bad-.com",
    "user@.com",
    "@example.com",
    "user@",
    "",
  ])("rejects %j as a syntax failure", async (bad) => {
    const res = await validateEmailAddress(bad, { dns: GOOD_DNS });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("syntax");
  });

  it("rejects an over-long local part", async () => {
    const res = await validateEmailAddress(`${"x".repeat(65)}@example.org`, { dns: GOOD_DNS });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("syntax");
  });
});

describe("validateEmailAddress — placeholder / disposable / junk", () => {
  it("rejects RFC-reserved placeholder domains without a DNS lookup", async () => {
    const dns = stubDns();
    const res = await validateEmailAddress("someone@example.com", { dns });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("placeholder_domain");
    expect(dns.resolveMx).not.toHaveBeenCalled();
  });

  it("rejects a disposable inbox provider", async () => {
    const res = await validateEmailAddress("whoever@mailinator.com", { dns: GOOD_DNS });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("disposable_domain");
  });

  it("rejects yopmail and guerrillamail too", async () => {
    for (const domain of ["yopmail.com", "guerrillamail.com", "10minutemail.com"]) {
      const res = await validateEmailAddress(`x@${domain}`, { dns: GOOD_DNS });
      expect(res.ok, domain).toBe(false);
      if (!res.ok) expect(res.code).toBe("disposable_domain");
    }
  });

  it("rejects a@a.com — the exact junk shape Jameson banned", async () => {
    const dns = stubDns();
    const res = await validateEmailAddress("a@a.com", { dns });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("junk_pattern");
    expect(dns.resolveMx).not.toHaveBeenCalled();
  });

  it("rejects placeholder local parts at real providers (test@gmail.com)", async () => {
    const res = await validateEmailAddress("test@gmail.com", { dns: GOOD_DNS });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("junk_pattern");
  });

  it.each(["asdfgh@gmail.com", "qwerty@yahoo.com", "xxxx@hotmail.com", "aaaaaa@outlook.com"])(
    "rejects keyboard mash / repeated characters: %s",
    async (bad) => {
      const res = await validateEmailAddress(bad, { dns: GOOD_DNS });
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.code).toBe("junk_pattern");
    },
  );
});

describe("validateEmailAddress — DNS mail acceptance", () => {
  it("rejects a domain whose DNS answers but publishes no mail route", async () => {
    const dns = stubDns({ mx: "ENODATA", a: "ENODATA", aaaa: "ENODATA" });
    const res = await validateEmailAddress("someone@no-mail-here-12345.com", { dns });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("no_mail_server");
  });

  it("rejects a domain that does not exist (NXDOMAIN)", async () => {
    const dns = stubDns({ mx: "ENOTFOUND" });
    const res = await validateEmailAddress("someone@this-domain-does-not-exist-987.com", { dns });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("no_mail_server");
  });

  it("rejects a null-MX domain (RFC 7505: explicitly never accepts mail)", async () => {
    const dns: MailDnsResolver = {
      resolveMx: vi.fn(async () => [{ exchange: ".", priority: 0 }]),
      resolve4: vi.fn(async () => ["192.0.2.1"]),
      resolve6: vi.fn(async () => []),
    };
    const res = await validateEmailAddress("someone@nullmx-domain.com", { dns });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("no_mail_server");
  });

  it("a transient DNS failure is retryable, never a rejection of the address", async () => {
    const dns = stubDns({ mx: "ESERVFAIL", a: "ETIMEOUT", aaaa: "ENODATA" });
    const res = await validateEmailAddress("real.person@gmail.com", { dns });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe("dns_unavailable");
      expect(res.retryable).toBe(true);
    }
  });

  it("an unrecognized DNS error code is also treated as transient", async () => {
    const dns = stubDns({ mx: "EBADRESP", a: "EBADRESP", aaaa: "EBADRESP" });
    const res = await validateEmailAddress("real.person@gmail.com", { dns });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("dns_unavailable");
  });
});

describe("typo suggestions", () => {
  it("suggests gmail.com for gmial.com (transposition)", async () => {
    const res = await validateEmailAddress("awaigalxy@gmial.com", { dns: GOOD_DNS });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe("typo_suggestion");
      expect(res.suggestion).toBe("awaigalxy@gmail.com");
    }
  });

  it("suggests gmail.com for gmail.con — the typo already in the subscriber list", async () => {
    const res = await validateEmailAddress("awaigalxy@gmail.con", { dns: GOOD_DNS });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.suggestion).toBe("awaigalxy@gmail.com");
  });

  it.each([
    ["user@gmal.com", "user@gmail.com"],
    ["user@hotmial.com", "user@hotmail.com"],
    ["user@yaho.com", "user@yahoo.com"],
    ["user@outlok.com", "user@outlook.com"],
    ["user@icloud.cm", "user@icloud.com"],
    ["user@gmail.con", "user@gmail.com"],
  ])("suggests the obvious correction for %s", async (input, expected) => {
    const res = await validateEmailAddress(input, { dns: GOOD_DNS });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.suggestion).toBe(expected);
  });

  it("does not second-guess domains that are already correct", async () => {
    for (const domain of ["gmail.com", "googlemail.com", "yahoo.co.uk", "proton.me"]) {
      expect(suggestDomainCorrection(domain)).toBeNull();
    }
  });

  it("a confirmed address is NOT blocked by the suggestion step", async () => {
    // The user insists their gmial.com address is real and (in this
    // stubbed world) the domain answers with MX records: it must pass.
    const res = await validateEmailAddress("awaigalxy@gmial.com", {
      dns: GOOD_DNS,
      confirmed: true,
    });
    expect(res).toEqual({ ok: true, email: "awaigalxy@gmial.com" });
  });

  it("even confirmed, a typo domain with no mail route is rejected by DNS, not by the typo rule", async () => {
    const dns = stubDns({ mx: "ENODATA", a: "ENODATA", aaaa: "ENODATA" });
    const res = await validateEmailAddress("awaigalxy@gmail.con", { dns, confirmed: true });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("no_mail_server");
  });
});

describe("validateEmailFormat (sync half)", () => {
  it("runs every non-DNS check and passes a well-formed address", () => {
    expect(validateEmailFormat("someone@company-domain.co.uk")).toEqual({
      ok: true,
      email: "someone@company-domain.co.uk",
    });
    const junk = validateEmailFormat("a@a.com");
    expect(junk.ok).toBe(false);
    if (!junk.ok) expect(junk.code).toBe("junk_pattern");
  });
});

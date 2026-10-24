import { describe, expect, it } from "vitest";
import {
  base32Decode, base32Encode, decryptTotpSecret, encryptTotpSecret,
  generateBackupCodes, generateTotpSecret, hashBackupCode, matchBackupCode,
  mintTotpProof, totpCode, verifyTotp, verifyTotpProof,
} from "./totp";

describe("base32", () => {
  it("round-trips", () => {
    const buf = Buffer.from("hello world, totp!");
    expect(base32Decode(base32Encode(buf)).equals(buf)).toBe(true);
  });
});

describe("totp", () => {
  it("generates the RFC 6238 test vector (SHA-1, 8-digit source 94287082 → 6-digit 287082)", () => {
    // RFC 6238 Appendix B seed for SHA-1: ASCII "12345678901234567890".
    const secret = base32Encode(Buffer.from("12345678901234567890", "ascii"));
    expect(totpCode(secret, 59_000)).toBe("287082");
  });

  it("verifies current code and rejects wrong ones", () => {
    const secret = generateTotpSecret();
    const code = totpCode(secret);
    expect(verifyTotp(secret, code)).toBe(true);
    expect(verifyTotp(secret, "000000")).toBe(code === "000000");
    expect(verifyTotp(secret, "12345")).toBe(false);
    expect(verifyTotp(secret, "abcdef")).toBe(false);
  });

  it("accepts a code one step old (clock drift window)", () => {
    const secret = generateTotpSecret();
    const old = totpCode(secret, Date.now() - 30_000);
    expect(verifyTotp(secret, old)).toBe(true);
  });
});

describe("secret encryption", () => {
  it("encrypts and decrypts, and ciphertext differs from plaintext", () => {
    process.env.AUTH_SECRET = "test-secret-for-totp";
    const secret = generateTotpSecret();
    const stored = encryptTotpSecret(secret);
    expect(stored).not.toContain(secret);
    expect(decryptTotpSecret(stored)).toBe(secret);
  });
});

describe("backup codes", () => {
  it("hashes and matches, formats XXXX-XXXXX style codes", () => {
    const codes = generateBackupCodes(8);
    expect(codes).toHaveLength(8);
    const hashes = codes.map(hashBackupCode);
    expect(matchBackupCode(hashes, codes[3].toLowerCase())).toBe(3);
    expect(matchBackupCode(hashes, "AAAAA-AAAAA")).toBe(-1);
    expect(hashes[0]).not.toContain(codes[0]);
  });
});

describe("step-up proof", () => {
  it("mints and verifies, binding user + expiry", () => {
    process.env.AUTH_SECRET = "test-secret-for-proof";
    const proof = mintTotpProof("user_1", 1_000_000);
    expect(verifyTotpProof(proof, "user_1", 1_000_001)).toBe(true);
    expect(verifyTotpProof(proof, "user_2", 1_000_001)).toBe(false);
    expect(verifyTotpProof(proof, "user_1", 1_000_000 + 13 * 3600_000)).toBe(false);
    expect(verifyTotpProof("garbage", "user_1")).toBe(false);
    expect(verifyTotpProof(undefined, "user_1")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { buildZip, crc32 } from "./zip";

describe("crc32", () => {
  it("matches the standard check value", () => {
    // CRC-32("123456789") is the catalogue check value 0xCBF43926.
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
    expect(crc32(new Uint8Array())).toBe(0);
  });
});

describe("buildZip", () => {
  it("produces a well-formed archive: local headers, central dir, EOCD", () => {
    const zip = buildZip([
      { name: "a.txt", data: new TextEncoder().encode("hello") },
      { name: "dir/b.txt", data: new TextEncoder().encode("world!") },
    ]);
    // Local file header signature PK\x03\x04
    expect(zip.readUInt32LE(0)).toBe(0x04034b50);
    // End of central directory is the final record
    const eocd = zip.length - 22;
    expect(zip.readUInt32LE(eocd)).toBe(0x06054b50);
    expect(zip.readUInt16LE(eocd + 10)).toBe(2); // total entries
    // Stored payloads are findable verbatim (STORE method)
    expect(zip.includes(Buffer.from("hello"))).toBe(true);
    expect(zip.includes(Buffer.from("world!"))).toBe(true);
    expect(zip.includes(Buffer.from("dir/b.txt"))).toBe(true);
  });

  it("empty archive is just the EOCD record", () => {
    const zip = buildZip([]);
    expect(zip.length).toBe(22);
    expect(zip.readUInt32LE(0)).toBe(0x06054b50);
  });
});

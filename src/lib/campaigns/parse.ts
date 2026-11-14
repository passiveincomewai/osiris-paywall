// Bulk recipient input parsing — pure, unit-tested.
//
// Accepts either:
//  1. CSV with a header row containing an "email" column — every other
//     column lands in the recipient's meta under its header name.
//  2. Pasted free text — one recipient per line; the first email-shaped
//     token on the line is the address, and a "Name <email>" form also
//     captures the name into meta.name.
//
// Returns one entry per input row: { email, meta } for parseable rows,
// { invalid: rawLine } for rows with no usable email address.

export interface ParsedRecipient {
  email: string;
  meta: Record<string, string>;
}

export interface ParseResult {
  recipients: ParsedRecipient[];
  invalid: string[];
}

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email) && email.length <= 254;
}

/** Minimal RFC-4180 CSV parser: quoted fields, embedded commas,
 * quotes ("") and newlines inside quotes, CRLF or LF endings. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      pushField();
    } else if (c === "\n") {
      pushRow();
    } else if (c !== "\r") {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) pushRow();
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

export function parseRecipientInput(input: string): ParseResult {
  const text = input.replace(/^\uFEFF/, "").trim();
  if (!text) return { recipients: [], invalid: [] };

  const rows = parseCsv(text);
  const header = rows[0]?.map((h) => h.trim().toLowerCase()) ?? [];
  const emailIdx = header.indexOf("email");

  // CSV-with-header path: a header row naming an email column, and at
  // least one data row.
  if (emailIdx >= 0 && rows.length > 1) {
    const recipients: ParsedRecipient[] = [];
    const invalid: string[] = [];
    for (const row of rows.slice(1)) {
      const email = normalizeEmail(row[emailIdx] ?? "");
      if (!isValidEmail(email)) {
        invalid.push(row.join(","));
        continue;
      }
      const meta: Record<string, string> = {};
      header.forEach((h, i) => {
        if (i === emailIdx || !h) return;
        const v = (row[i] ?? "").trim();
        if (v) meta[h] = v;
      });
      recipients.push({ email, meta });
    }
    return { recipients, invalid };
  }

  // Free-text path: one recipient per line.
  const recipients: ParsedRecipient[] = [];
  const invalid: string[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const m = line.match(EMAIL_RE);
    if (!m) {
      invalid.push(line);
      continue;
    }
    const email = normalizeEmail(m[0]);
    if (!isValidEmail(email)) {
      invalid.push(line);
      continue;
    }
    const meta: Record<string, string> = {};
    const nameMatch = line.match(/^([^<,]+?)\s*<[^>]+>\s*$/);
    if (nameMatch && nameMatch[1].trim()) meta.name = nameMatch[1].trim();
    recipients.push({ email, meta });
  }
  return { recipients, invalid };
}

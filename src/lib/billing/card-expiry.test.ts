// Pure-function pins for the card-expiry window (pick 2): next
// calendar month only, across year boundaries, in UTC.
import { describe, it, expect } from "vitest";
import { cardExpiryDue } from "./card-expiry";

describe("cardExpiryDue", () => {
  it("fires for a card expiring next month", () => {
    expect(cardExpiryDue(12, 2026, new Date(Date.UTC(2026, 10, 15)))).toBe(true); // Nov → Dec
    expect(cardExpiryDue(1, 2027, new Date(Date.UTC(2026, 11, 1)))).toBe(true); // Dec → Jan
  });
  it("stays silent for this month and later months", () => {
    const now = new Date(Date.UTC(2026, 10, 15)); // Nov 2026
    expect(cardExpiryDue(11, 2026, now)).toBe(false); // this month — already dunning's edge
    expect(cardExpiryDue(1, 2027, now)).toBe(false); // two months out
    expect(cardExpiryDue(10, 2026, now)).toBe(false); // already expired
  });
});

import { describe, it, expect } from "vitest";
import {
  generateInviteToken,
  hashInviteToken,
  normalizeInviteEmail,
  occupiedSeats,
  availableSeats,
  canInvite,
  canAccept,
} from "./invitations";

describe("token hashing", () => {
  it("round-trips: the stored hash matches the emailed token's hash", () => {
    const token = generateInviteToken();
    expect(token.length).toBeGreaterThanOrEqual(32);
    expect(hashInviteToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashInviteToken(token)).toBe(hashInviteToken(token));
    expect(hashInviteToken(token)).not.toBe(hashInviteToken(generateInviteToken()));
  });
  it("normalizes emails lowercase + trimmed", () => {
    expect(normalizeInviteEmail("  Foo@Example.COM ")).toBe("foo@example.com");
  });
});

describe("capacity math (members + pending ≤ purchased)", () => {
  it("counts occupied and available seats", () => {
    expect(occupiedSeats({ members: 3, pending: 2, purchased: 10 })).toBe(5);
    expect(availableSeats({ members: 3, pending: 2, purchased: 10 })).toBe(5);
    expect(availableSeats({ members: 12, pending: 0, purchased: 10 })).toBe(0);
  });
  it("allows invites only while a seat remains", () => {
    expect(canInvite({ members: 4, pending: 1, purchased: 5 })).toBe(false);
    expect(canInvite({ members: 4, pending: 0, purchased: 5 })).toBe(true);
    expect(canInvite({ members: 0, pending: 0, purchased: 0 })).toBe(false);
  });
  it("accept succeeds while the invite's own reservation holds", () => {
    // members 4 + pending 1 (this invite) = purchased 5 → accept converts.
    expect(canAccept({ members: 4, pending: 1, purchased: 5, thisInvitePending: true })).toBe(true);
    // Invariant already broken (seats reduced below occupancy) → blocked.
    expect(canAccept({ members: 5, pending: 1, purchased: 5, thisInvitePending: true })).toBe(false);
    // A non-pending invite never accepts on capacity grounds.
    expect(canAccept({ members: 0, pending: 0, purchased: 5, thisInvitePending: false })).toBe(false);
  });
});

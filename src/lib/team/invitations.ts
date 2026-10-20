// Team invitations — pure helpers (token hashing, capacity math).
// Kept DB-free so the capacity invariant is unit-testable:
//   active members + pending invitations ≤ purchasedSeats, always.
// Pending invitations RESERVE a seat; accepting converts the
// reservation into a membership (pending −1, members +1).

import { createHash, randomBytes } from "crypto";

export function generateInviteToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function normalizeInviteEmail(email: string): string {
  return email.trim().toLowerCase();
}

export interface CapacityState {
  members: number;
  pending: number;
  purchased: number;
}

export function occupiedSeats(s: CapacityState): number {
  return s.members + s.pending;
}

export function availableSeats(s: CapacityState): number {
  return Math.max(0, s.purchased - occupiedSeats(s));
}

/** Can `additional` more pending invitations be created? */
export function canInvite(s: CapacityState, additional = 1): boolean {
  return occupiedSeats(s) + additional <= s.purchased;
}

/**
 * Can a pending invitation be accepted? The invite itself already
 * reserves its seat (it is counted in `pending`, which includes this
 * invitation), so acceptance succeeds whenever members < purchased —
 * equivalently members + pending ≤ purchased with pending ≥ 1.
 */
export function canAccept(s: CapacityState & { thisInvitePending: boolean }): boolean {
  if (!s.thisInvitePending) return false;
  return s.members < s.purchased || s.members + s.pending <= s.purchased;
}

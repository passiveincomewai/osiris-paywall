/**
 * The invite-a-friend camera bonus amount, in exactly one place:
 * the popup's promise (client), the grant ledger (server) and the
 * tests all read this constant, so the number a user is promised is
 * the number the server pays. Directive-free on purpose — client and
 * server modules both import it.
 */
export const INVITE_CAMERA_BONUS = 15;

/**
 * The invite-a-friend Pro-days reward amounts, in exactly one place:
 * the Settings panel's promise (client), the grant ledger (server)
 * and the tests all read these constants, so the numbers a user is
 * promised are the numbers the server pays. Directive-free on
 * purpose — client and server modules both import it.
 */
export const INVITE_PRO_DAYS = 7;
export const INVITE_PRO_MONTHLY_CAP = 5;

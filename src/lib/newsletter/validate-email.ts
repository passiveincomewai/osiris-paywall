// Re-export shim. The validator moved to lib/email/validate-email
// (2026-10-29) when account signup adopted the same instant check —
// one implementation, two callers. This path stays so the newsletter
// module's imports and tests keep working unchanged.
export * from "../email/validate-email";

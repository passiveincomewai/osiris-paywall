// Re-export shim. The blocklist moved to lib/email/disposable-domains
// (2026-10-29) alongside the shared validator that consumes it. This
// path stays so existing newsletter imports keep working unchanged.
export * from "../email/disposable-domains";

import type { Metadata } from "next";
import { Lock } from "lucide-react";
import ToolLanding, { toolMetadata, type ToolLandingConfig } from "@/components/ToolLanding";
import ReconExample from "@/components/ReconExample";

const cfg: ToolLandingConfig = {
  slug: "certificate-transparency-search",
  name: "Certs",
  eyebrow: "WORLDEYE PRO TOOL",
  icon: Lock,
  h1: "Certificate Transparency Search — Find a Domain's Issued Certificates",
  lede: "Search the public certificate-transparency logs for every certificate issued for a domain — and uncover the subdomains and infrastructure history those certificates reveal.",
  description:
    "WorldEye's certificate transparency search queries public CT logs for a domain's issued certificates, revealing subdomains and infrastructure history. A crt.sh alternative in the RECON board, included with WorldEye Pro.",
  freeTool: false,
  appPath: "RECON board → Domain & Web → Certs",
  honestyTitle: "What certificate transparency can and can't tell you",
  honesty: [
    "CT logs only contain certificates that were publicly issued and logged — which is nearly all publicly trusted certificates, but a service using an internal or private CA leaves no trace here.",
    "A certificate for a subdomain proves the name existed when the cert was issued. It does not prove the subdomain is still live, what it serves today, or who operates it now.",
    "Wildcard certificates deliberately hide the exact subdomains beneath them, so a domain can have more infrastructure than its CT record shows.",
    "Everything here is public by design: certificate transparency exists so the whole internet can audit what was issued. Searching it reveals nothing private — it organises what was already published.",
  ],
  intro: [
    "Every time a certificate authority issues a TLS certificate for a public website, the certificate is written into certificate-transparency (CT) logs — public, append-only records that anyone can search. The system was built to catch mis-issued certificates, but it has a famous side effect: because certificates name the domains and subdomains they cover, the logs amount to a public history of a domain's infrastructure. A certificate issued for mail, staging, vpn, or a forgotten test subdomain is recorded forever, even if the subdomain itself was never linked anywhere.",
    "WorldEye's Certs search lives in the RECON board's Domain & Web group and queries those logs for a domain you enter. It returns the certificates found — the names each one covers, the issuing authority, and the validity dates — which makes it a practical crt.sh alternative that sits next to the board's other domain tools: subdomains you discover here can go straight into a DNS lookup, an SSL check, or a technology fingerprint without re-typing anything.",
    "Investigators and administrators use the same data in opposite directions. Defensively, your own domain's CT record shows you the subdomains your organisation has ever certified — including the staging server someone set up in 2022 and never retired. Offensively-minded researchers use it to map a target's footprint, which is precisely why the logs are public: if a name is in a certificate, assume the whole internet can find it, and plan your naming accordingly.",
  ],
  steps: [
    "Open the RECON board on the WorldEye globe and choose Certs in the Domain & Web group.",
    "Enter a domain name — your own, or one you are researching.",
    "Run the search. WorldEye queries the public certificate-transparency logs for certificates covering that domain.",
    "Read the record: each certificate's covered names, issuer, and validity window, including subdomains you may not have seen listed anywhere else.",
    "Follow up on interesting names in the same board — resolve them with DNS Lookup, check a live certificate with the SSL Checker, or fingerprint what serves them with Tech Detect.",
  ],
  faqTitle: "Certificate transparency questions",
  faqs: [
    {
      q: "What is certificate transparency?",
      a: "Certificate transparency is a public logging system for TLS certificates. When a trusted certificate authority issues a certificate, it records it in append-only public logs that browsers and researchers can audit. The goal is accountability — a certificate issued for a domain without the owner's knowledge becomes visible. A side effect is that the logs form a searchable history of the names certificates were issued for.",
    },
    {
      q: "How does this compare to crt.sh?",
      a: "crt.sh is the best-known public interface to the same CT logs, and WorldEye's Certs search queries the same underlying public record. The difference is workflow: results here sit inside the RECON board, so a subdomain you find can be carried straight into DNS, SSL, subdomain, and technology checks on the same target instead of living in a separate tab.",
    },
    {
      q: "Can a certificate search reveal hidden subdomains?",
      a: "It can reveal subdomains that were never linked publicly but did receive certificates — staging, VPN, mail, and test names are classic finds. It cannot reveal subdomains that never had a public certificate, names hidden under a wildcard certificate, or anything served under an internal certificate authority. It is a powerful source, not a complete inventory.",
    },
    {
      q: "I found a certificate for a subdomain I don't recognise. Should I worry?",
      a: "Treat it as a prompt to check, not a panic. Look at the issuer and dates: a certificate your own team requested for a project you forgot is common, and an expired certificate for a retired service is usually housekeeping. What deserves real attention is a recent certificate from an issuer your organisation never uses — that can indicate a mis-issuance or a domain-validated certificate someone else obtained, and your CA and DNS records are the next stops.",
    },
    {
      q: "Does searching CT logs notify the domain owner?",
      a: "No. The logs are public records designed to be read by anyone; querying them sends nothing to the domain owner and leaves no trace in their systems. You are reading a published ledger, not touching their servers — the check does not connect to the domain itself at all.",
    },
    {
      q: "What does it cost?",
      a: "Certs is a Pro module in WorldEye's RECON board, included with WorldEye Pro. The board's free tools — the SSL Checker, DNS and WHOIS lookups and others on the Tools page — run with no account at all.",
    },
  ],
  related: [
    { label: "SSL Checker — inspect a site's live certificate (free)", href: "/tools/ssl-checker" },
    { label: "Subdomain Finder — enumerate a domain's subdomains", href: "/tools/subdomain-finder" },
    { label: "DNS Lookup — records for any domain (free)", href: "/tools/dns-lookup" },
    { label: "All WorldEye tools", href: "/tools" },
  ],
  children: null,
};

export const metadata: Metadata = toolMetadata(cfg);

export default function CertificateTransparencySearchPage() {
  return (
    <ToolLanding
      {...cfg}
    >
      <ReconExample
        targetLabel="TARGET — DOMAIN NAME"
        placeholder="e.g. example.com"
        exampleTitle="Certificate transparency record for a sample domain"
        rows={[
          { label: "example.com", value: "certificate issued — example issuer CA — current" },
          { label: "www.example.com", value: "covered on the same certificate" },
          { label: "mail.example.com", value: "certificate issued — earlier validity window" },
          { label: "staging.example.com", value: "certificate issued — expired (name existed at issue)" },
          { label: "*.example.com", value: "wildcard certificate — exact names beneath it hidden" },
        ]}
        footnote="This is the shape of a real result, shown with example.com, the reserved documentation domain. The live search runs inside WorldEye's RECON board and is included with WorldEye Pro."
      />
    </ToolLanding>
  );
}

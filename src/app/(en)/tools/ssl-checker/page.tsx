import type { Metadata } from "next";
import { Shield } from "lucide-react";
import ToolLanding, { toolMetadata, type ToolLandingConfig } from "@/components/ToolLanding";
import ReconExample from "@/components/ReconExample";

const cfg: ToolLandingConfig = {
  slug: "ssl-checker",
  name: "SSL Checker",
  eyebrow: "WORLDEYE PRO TOOL",
  icon: Shield,
  h1: "SSL Checker — Check a Site's SSL Certificate and TLS Health",
  lede: "Inspect the certificate a site actually serves: who issued it, which names it covers, when it expires, and how the TLS connection itself is configured.",
  description:
    "WorldEye's SSL checker inspects a site's SSL certificate — issuer, coverage and expiry — plus its TLS and cipher health. A RECON board tool with WorldEye Pro.",
  freeTool: false,
  appPath: "RECON board → Domain & Web → SSL/TLS",
  honestyTitle: "What this SSL check covers — and what it doesn't",
  honesty: [
    "WorldEye reports the individual checks — certificate validity, chain, protocol versions, cipher strength — rather than stamping a single A–F grade on a site. Where other checkers show a grade, it is a roll-up of checks like these; here you see the checks themselves, so you can judge which ones matter for your case.",
    "This is a check of the certificate and the TLS handshake a server offers at check time. It is not a full security audit: it says nothing about the application's code, its headers, its patching or how it handles data after the encrypted connection is established.",
    "A valid, well-configured certificate proves the connection is encrypted to whoever controls that certificate — it does not prove the site behind it is honest. Phishing sites routinely have valid certificates. Judge identity from WHOIS and the organisation, not from a padlock.",
    "Expiry is the failure this check catches best, and it is unforgiving: a certificate that expires on a Friday night takes the site down for every visitor until it is replaced, browsers first and questions later.",
  ],
  intro: [
    "The padlock in a browser tells a visitor almost nothing: that a certificate exists. It does not say when it expires, whether it actually covers the hostname being visited, whether the chain of trust is complete, or whether the server still offers protocol versions and ciphers that were retired for good reason. An SSL checker exists to answer those questions properly, by opening a TLS connection to the site and examining what the server presents and negotiates.",
    "WorldEye's SSL/TLS check lives in the RECON board's Domain & Web group and runs the panel's SSL scan: it retrieves the certificate the site serves, reads its issuer, subject and subject-alternative names, its validity window and fingerprint, and tests the connection's protocol and cipher health. It is the check you run before a renewal deadline runs you — certificate expiry remains one of the most common, and most embarrassing, causes of a healthy site suddenly warning every visitor away.",
    "It is also a due-diligence check on other people's sites. Before you trust a login page, a payment flow or a new supplier's portal, the certificate tells a factual story: a long-standing certificate from a mainstream issuer covering exactly the right names reads very differently from a fresh, free certificate covering a lookalike domain. The checker reports facts, not vibes — what was served, by whom, until when, and how the encrypted connection is configured.",
  ],
  steps: [
    "Open the RECON board on the WorldEye globe and choose SSL/TLS in the Domain & Web group.",
    "Enter a hostname — for example example.com or the exact subdomain you want to inspect.",
    "Run the check. WorldEye opens a TLS connection to the host and examines the certificate and handshake it offers.",
    "Read the certificate first: issuer, the names it covers, and its not-before / not-after dates — then the protocol and cipher results for the connection itself.",
    "Follow up in the same board: confirm the hostname's DNS points where you expect (DNS), see who registered the domain (WHOIS), or audit the site's security headers (Headers).",
  ],
  faqTitle: "SSL certificate questions",
  faqs: [
    {
      q: "What does an SSL certificate checker actually check?",
      a: "It connects to the site over TLS and examines two things: the certificate (who issued it, which hostnames it is valid for, whether the chain of trust is complete, and when it expires) and the connection configuration (which TLS protocol versions the server accepts and how strong the negotiated ciphers are). Together they answer 'is this encrypted properly, and for how much longer?'",
    },
    {
      q: "Why doesn't this checker give my site a grade?",
      a: "Because a single letter hides the detail you actually need. A site can have a perfect certificate and one legacy protocol still enabled, or a strong configuration and nine days left before expiry — those are different problems with different fixes. WorldEye shows the individual check results so the specific issue, if there is one, is visible instead of averaged away.",
    },
    {
      q: "My certificate is valid but browsers still warn — why?",
      a: "The usual causes are a hostname mismatch (the certificate covers example.com but not the subdomain being visited), an incomplete chain (the server omits an intermediate certificate, which some browsers tolerate and others do not), or mixed content on the page. A checker that shows the served names and chain helps you tell which of the three you are dealing with.",
    },
    {
      q: "How long do certificates last now, and why does expiry matter so much?",
      a: "Public certificates are short-lived by design — a maximum of about 13 months, and free automated certificates commonly last 90 days. Automation usually renews them invisibly, which is precisely the risk: when the automation silently breaks, nobody notices until the certificate expires and every browser blocks the site. Checking the not-after date is cheap insurance.",
    },
    {
      q: "Does a valid SSL certificate mean a website is safe to trust?",
      a: "No. A certificate proves you are talking, encrypted, to the holder of that certificate — it says nothing about the holder's intentions. Fraudulent sites obtain valid certificates routinely. Use the certificate check for connection health, and judge the operator separately: domain age and registration (WHOIS), reputation, and whether the domain is exactly the one you expected.",
    },
    {
      q: "What does the SSL Checker cost?",
      a: "SSL/TLS is a Pro module in WorldEye's RECON board, included with WorldEye Pro. A free account lets you explore the board and run its free tools; the Pro modules unlock with a Pro plan.",
    },
  ],
  related: [
    { label: "Security Headers Checker — audit a site's HTTP security headers", href: "/tools/security-headers-checker" },
    { label: "Certificate Transparency Search — every certificate issued for a domain", href: "/tools/certificate-transparency-search" },
    { label: "DNS Lookup — check DNS records for any domain", href: "/tools/dns-lookup" },
    { label: "All WorldEye tools", href: "/tools" },
  ],
  children: null,
};

export const metadata: Metadata = toolMetadata(cfg);

export default function SslCheckerPage() {
  return (
    <ToolLanding
      {...cfg}
    >
      <ReconExample
        targetLabel="TARGET — HOSTNAME"
        placeholder="e.g. example.com"
        exampleTitle="SSL/TLS check of a sample host (example.com)"
        rows={[
          { label: "Issuer", value: "Example CA — Domain Validated" },
          { label: "Covers", value: "example.com · www.example.com" },
          { label: "Valid", value: "2026-09-01 → 2026-11-30 (31 days left)" },
          { label: "Chain", value: "complete — leaf + intermediate verified" },
          { label: "Protocols", value: "TLS 1.3 ✓ · TLS 1.2 ✓ · TLS 1.0 ✗" },
          { label: "Cipher", value: "TLS_AES_256_GCM_SHA384 — forward secrecy ✓" },
        ]}
        footnote="This is the shape of a real result, shown with a reserved example domain. The live tool is in the RECON board with WorldEye Pro and performs the check against the host at the moment you run it — certificate details change on renewal, so a live run is the only current answer."
      />
    </ToolLanding>
  );
}

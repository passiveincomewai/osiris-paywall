import type { Metadata } from "next";
import { FileText } from "lucide-react";
import ToolLanding, { toolMetadata, type ToolLandingConfig } from "@/components/ToolLanding";
import ReconExample from "@/components/ReconExample";

const cfg: ToolLandingConfig = {
  slug: "whois-lookup",
  name: "WHOIS Lookup",
  eyebrow: "WORLDEYE PRO TOOL",
  icon: FileText,
  h1: "WHOIS Lookup — Who Owns This Domain and When It Expires",
  lede: "Look up a domain's registration record: its registrar, creation and expiry dates, status and nameservers — and, where the registry publishes it, who registered it.",
  description:
    "Run a WHOIS lookup to see who owns a domain, its registrar, registration and domain expiry dates and status. A WorldEye RECON board tool, included with Pro.",
  freeTool: false,
  appPath: "RECON board → Domain & Web → WHOIS",
  honestyTitle: "The redaction reality — read this first",
  honesty: [
    "Most WHOIS records are privacy-redacted, and that is normal. Since GDPR-era rule changes, most registrars mask the registrant's name, address, email and phone by default — the record will say 'REDACTED FOR PRIVACY' or name a privacy service instead of a person. That is the registry protecting the owner, not the tool failing.",
    "This lookup shows what the registry publishes for the domain — no more. WorldEye does not unmask redacted records, buy leaked registration data, or guess an owner from other sources. If the record is redacted, the honest answer this tool gives is: redacted.",
    "What is almost always visible is still useful: the registrar, the creation date, the expiry date, the domain status codes and the nameservers. Ownership questions those fields can answer — how old is this domain, is it about to expire, who sells it — they answer reliably.",
    "Dates and statuses come straight from the registry record. A domain can be renewed, transferred or allowed to lapse after you look, so treat an expiry date as true at lookup time, not a guarantee about tomorrow.",
  ],
  intro: [
    "Every registered domain has a public record behind it: when it was created, when it expires, which registrar holds it, what status it is in, and — historically — who registered it. A WHOIS lookup reads that record. It is one of the oldest checks on the internet, and it survives because the questions it answers have never gone away: Is this domain as old as its owner claims? Is it about to expire? Is the site emailing me from a domain registered last Tuesday?",
    "The honest starting point is what you will not see. A generation ago a WHOIS record named a person, with an address and phone number. Today most records are redacted by the registrar under privacy rules, and the registrant field names a privacy service or nothing at all. WorldEye's WHOIS Lookup, in the RECON board's Domain & Web group, shows you the record as published — redactions included, labelled as redactions — rather than pretending the missing fields are a gap it can fill.",
    "What remains is genuinely diagnostic. A creation date exposes the 'established company' whose domain is nine days old. An expiry date tells you whether a partner's site, or your own portfolio, is weeks from lapsing. A registrar and status trail — clientTransferProhibited, redemptionPeriod, pendingDelete — tells you whether a domain is locked down, in dispute, or already on its way back to the open market. Read alongside DNS and SSL in the same board, the record turns a bare domain name into a dated, attributable registration history.",
  ],
  steps: [
    "Open the RECON board on the WorldEye globe and choose WHOIS in the Domain & Web group.",
    "Enter a registered domain name — for example example.com — without www, a scheme or a path.",
    "Run the lookup. WorldEye requests the domain's registration record from the registry for its top-level domain.",
    "Read the fields that are published: registrar, created / updated / expiry dates, status codes, nameservers, and the registrant details if — and only if — the registry has not redacted them.",
    "Follow up in the same board: resolve the domain's live records (DNS), inspect its certificate (SSL/TLS), or map its subdomains (Subdomains).",
  ],
  faqTitle: "WHOIS lookup questions",
  faqs: [
    {
      q: "Why does the WHOIS record say 'REDACTED FOR PRIVACY' instead of an owner?",
      a: "Because the registrar has masked the registrant's personal details, which most registrars now do by default under privacy regulation and registry policy. The domain still has an owner — the registry simply no longer publishes who it is. No legitimate lookup tool can show you a field the registry has withdrawn, and any tool promising to 'unmask' owners should be treated with suspicion.",
    },
    {
      q: "How can I tell when a domain expires?",
      a: "The record's expiry (or 'Registry Expiry Date') field gives the date the current registration term ends. Domains are typically renewed in one-to-ten-year terms; many auto-renew, so a near expiry date means 'due for renewal', not 'certain to lapse'. A status of redemptionPeriod or pendingDelete is the stronger signal that a domain is genuinely on its way out.",
    },
    {
      q: "Can WHOIS tell me if a website is a scam?",
      a: "Not by itself — but it is a strong corroborating check. A very recent creation date on a domain presenting itself as a long-established business, a registrar known for throwaway registrations, or a mismatch between the claimed organisation and anything in the record are all warning signs. Treat them as evidence to weigh alongside the site's content, its certificate and its reputation — never as a verdict on their own.",
    },
    {
      q: "Who owns this domain if the record is redacted — how do I contact them?",
      a: "Most registrars operate a relay: a contact form or a forwarded email address (often shown in the record as a privacy-service address) that passes your message to the owner without revealing their details. If the record names a privacy service such as a registrar's protection product, that service is the route in. There is no legitimate directory that bypasses the redaction.",
    },
    {
      q: "Does WHOIS work for every domain extension?",
      a: "Most registries publish a WHOIS (or RDAP) record, but the fields vary by top-level domain. Country-code registries in particular publish different — often thinner — records than .com or .org, and a few publish almost nothing beyond status and dates. The lookup returns whatever that domain's registry makes available.",
    },
    {
      q: "What does the WHOIS Lookup cost?",
      a: "WHOIS is a Pro module in WorldEye's RECON board, included with WorldEye Pro. A free account lets you explore the board and its free tools before upgrading for the Pro modules.",
    },
  ],
  related: [
    { label: "DNS Lookup — check DNS records for any domain", href: "/tools/dns-lookup" },
    { label: "Certificate Transparency Search — every certificate issued for a domain", href: "/tools/certificate-transparency-search" },
    { label: "SSL Checker — certificate and cipher health", href: "/tools/ssl-checker" },
    { label: "All WorldEye tools", href: "/tools" },
  ],
  children: null,
};

export const metadata: Metadata = toolMetadata(cfg);

export default function WhoisLookupPage() {
  return (
    <ToolLanding
      {...cfg}
    >
      <ReconExample
        targetLabel="TARGET — DOMAIN NAME"
        placeholder="e.g. example.com"
        exampleTitle="WHOIS record for a sample domain (example.com)"
        rows={[
          { label: "Registrar", value: "Example Registrar, Inc." },
          { label: "Created", value: "1995-08-14" },
          { label: "Expires", value: "2027-08-13" },
          { label: "Status", value: "clientTransferProhibited" },
          { label: "Registrant", value: "REDACTED FOR PRIVACY" },
          { label: "Nameservers", value: "ns1.example.net · ns2.example.net" },
        ]}
        footnote="This is the shape of a real record, shown with a reserved example domain — note the redacted registrant, which is how most records genuinely look today. The live tool is in the RECON board with WorldEye Pro and shows the record exactly as the registry publishes it."
      />
    </ToolLanding>
  );
}

import type { Metadata } from "next";
import { Server } from "lucide-react";
import ToolLanding, { toolMetadata, type ToolLandingConfig } from "@/components/ToolLanding";
import ReconExample from "@/components/ReconExample";

const cfg: ToolLandingConfig = {
  slug: "dns-lookup",
  name: "DNS Lookup",
  eyebrow: "WORLDEYE PRO TOOL",
  icon: Server,
  h1: "DNS Lookup — Check DNS Records for Any Domain",
  lede: "Read a domain's live DNS in one view — A, AAAA, MX, NS, TXT, SOA and CNAME records exactly as its authoritative nameservers publish them right now.",
  description:
    "Use WorldEye's DNS lookup and DNS checker to check DNS records for any domain — A, AAAA, MX, NS, TXT, SOA and CNAME — read live. A RECON board Pro tool.",
  freeTool: false,
  appPath: "RECON board → Domain & Web → DNS",
  honestyTitle: "What a DNS lookup actually shows",
  honesty: [
    "This tool reads the records a domain's authoritative nameservers publish at the moment you check. It is a live DNS lookup, not a worldwide propagation map — WorldEye does not run a global resolver network and does not claim to show what every resolver in every country has cached.",
    "A record you just changed can still look old in other resolvers until its TTL expires. If this lookup shows the new value but a mail or web check elsewhere still fails, caching — not the record itself — is usually why.",
    "An empty result for a record type means no record of that type was returned. It does not prove a service is misconfigured: some setups deliberately publish no MX, no AAAA, or no TXT record at all.",
    "DNS is public by design. Anyone can read these records for any domain; this tool shows you nothing that is not already published for the internet to query.",
  ],
  intro: [
    "DNS is the phone book every other check depends on. Before a browser loads a site, before mail reaches an inbox, before a verification token can prove you own a domain, something has to ask: where does this name point, who handles its mail, and who is authoritative for it? A DNS lookup answers those questions directly, by querying the domain and laying out the answers record by record instead of burying them in a command-line dump.",
    "WorldEye's DNS Lookup sits in the RECON board's Domain & Web group, alongside WHOIS, SSL/TLS and Subdomains, because in real work the checks run together. You confirm a domain points at the right host (A and AAAA), that mail is routed to the right provider (MX), that the nameservers are the ones you expect (NS), and that the verification and policy strings you added months ago are still there (TXT — SPF, DKIM and domain-verification records all live there). One lookup gives you the whole set, read live, rather than seven separate queries.",
    "The cases that send people here are practical, not academic: a site that will not load after a hosting move, mail that stopped arriving after a DNS edit, a certificate that will not issue because a CNAME is in the way, or a domain you are assessing whose mail and hosting setup you need to understand before you trust it. In each case the record set is the ground truth — and when the ground truth surprises you, that surprise is the finding.",
  ],
  steps: [
    "Open the RECON board on the WorldEye globe and choose DNS in the Domain & Web group.",
    "Enter a domain name — for example example.com — without a scheme or path; the lookup queries the domain itself.",
    "Run the lookup. WorldEye queries for the domain's record set and reads the answers its nameservers return.",
    "Read the result by type: A and AAAA for where the name points, MX for mail routing, NS for the authoritative nameservers, TXT for verification and mail policy, SOA for the zone's primary record, and CNAME for aliases.",
    "Follow up in the same board: check who registered the domain (WHOIS), whether its certificate is healthy (SSL/TLS), or what subdomains exist under it (Subdomains).",
  ],
  faqTitle: "DNS lookup questions",
  faqs: [
    {
      q: "What is a DNS lookup?",
      a: "A DNS lookup queries the Domain Name System for the records published under a domain name. It returns the machine-readable answers other systems use: which IP addresses the name resolves to, which servers handle its mail, which nameservers are authoritative for it, and which text records it publishes for verification and policy.",
    },
    {
      q: "Which record types does this DNS checker show?",
      a: "The lookup covers the record types that answer almost every real question: A (IPv4 address), AAAA (IPv6 address), MX (mail exchangers, with their priorities), NS (authoritative nameservers), TXT (verification, SPF and other text records), SOA (the zone's start-of-authority record) and CNAME (aliases pointing one name at another).",
    },
    {
      q: "Does this check DNS propagation worldwide?",
      a: "No — and be wary of any page that implies a single check can prove global propagation. This tool reads the domain's live records as published by its authoritative nameservers. Resolvers around the world cache those answers for the length of each record's TTL, so a recent change can legitimately look different in different places for a while. If the authoritative answer here is correct, propagation is a matter of cache expiry, not correctness.",
    },
    {
      q: "Why does my domain show no MX record, or an A record I don't recognise?",
      a: "No MX record usually means the domain is not set up to receive mail at that name, or its mail is configured elsewhere. An A record you do not recognise after a hosting move is often a leftover — an old host, a parked-page service, or a forwarding rule nobody removed. Either way, the record set is showing you what is actually published, which is exactly what a lookup is for.",
    },
    {
      q: "Can I check DNS records for a domain I don't own?",
      a: "Yes. DNS records are public information, published precisely so any system on the internet can resolve the name. Reading them requires no permission and reveals nothing private — it is the same information every browser and mail server requests in the open, every day.",
    },
    {
      q: "What does the DNS Lookup cost?",
      a: "DNS is a Pro module in WorldEye's RECON board, included with WorldEye Pro. A free WorldEye account lets you explore the board and run its free tools; the Pro modules unlock with a Pro plan.",
    },
  ],
  related: [
    { label: "WHOIS Lookup — who registered a domain and when it expires", href: "/tools/whois-lookup" },
    { label: "SSL Checker — certificate and cipher health", href: "/tools/ssl-checker" },
    { label: "Subdomain Finder — subdomains under a domain", href: "/tools/subdomain-finder" },
    { label: "All WorldEye tools", href: "/tools" },
  ],
  children: null,
};

export const metadata: Metadata = toolMetadata(cfg);

export default function DnsLookupPage() {
  return (
    <ToolLanding
      {...cfg}
    >
      <ReconExample
        targetLabel="TARGET — DOMAIN NAME"
        placeholder="e.g. example.com"
        exampleTitle="DNS records for a sample domain (example.com)"
        rows={[
          { label: "A", value: "203.0.113.10" },
          { label: "AAAA", value: "2001:db8::10" },
          { label: "MX", value: "10 mail.example.com" },
          { label: "NS", value: "ns1.example.net · ns2.example.net" },
          { label: "TXT", value: "\"v=spf1 include:_spf.example.net -all\"" },
          { label: "SOA", value: "ns1.example.net hostmaster.example.com 2026103001" },
          { label: "CNAME", value: "www → example.com" },
        ]}
        footnote="This is the shape of a real result, shown with a reserved example domain and documentation-range addresses. The live tool runs in the RECON board with WorldEye Pro — it reads the domain's records as its nameservers publish them at the moment you run it."
      />
    </ToolLanding>
  );
}

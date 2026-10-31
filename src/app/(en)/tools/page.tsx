import type { Metadata } from "next";
import { Wrench, ArrowUpRight } from "lucide-react";
import { BASE, JsonLd, Breadcrumb, PageShell, CtaRow } from "@/components/directory-page";
import EmailCaptureCard from "@/components/EmailCaptureCard";

export const metadata: Metadata = {
  title: "WorldEye Tools — OSINT, Network & Recon Toolkit",
  description:
    "Every WorldEye tool in one place: port scanning, DNS and WHOIS lookups, breach checking, photo geolocation, WiFi sensing and the rest of the RECON board — with honest labels for what is free and what is included with WorldEye Pro.",
  alternates: { canonical: `${BASE}/tools` },
  openGraph: {
    title: "WorldEye Tools — OSINT, Network & Recon Toolkit",
    description:
      "The full WorldEye toolkit: free tools that run right on the page, and the Pro RECON board modules — each labelled honestly.",
    url: "/tools",
    type: "website",
  },
};

type Access = "FREE" | "PRO" | "AFFILIATE" | "PARTNER";
type ToolCard = {
  name: string;
  blurb: string;
  access: Access;
  href: string;
  linkNote: string;
};

const GROUPS: { title: string; tools: ToolCard[] }[] = [
  {
    title: "Network & Host",
    tools: [
      { name: "Port Scanner", blurb: "Open ports and running services on any IP or hostname.", access: "PRO", href: "/tools/port-scanner", linkNote: "About the tool" },
      { name: "Vulnerability Sweep", blurb: "Known CVEs matched to what a host is running.", access: "PRO", href: "/tools/vulnerability-scanner", linkNote: "About the tool" },
      { name: "Shodan IoT Lookup", blurb: "What an IP address exposes to the internet, from Shodan's InternetDB.", access: "FREE", href: "/tools/ip-device-lookup", linkNote: "Run it now" },
      { name: "BGP Lookup", blurb: "Autonomous system and prefixes behind an IP or ASN.", access: "PRO", href: "/tools/bgp-lookup", linkNote: "About the tool" },
      { name: "MAC Address Lookup", blurb: "The hardware vendor behind a MAC address.", access: "PRO", href: "/tools/mac-address-lookup", linkNote: "About the tool" },
      { name: "IP Sweep", blurb: "Scan the whole subnet around an address.", access: "PRO", href: "/tools/ip-sweep", linkNote: "About the tool" },
    ],
  },
  {
    title: "Domain & Web",
    tools: [
      { name: "DNS Lookup", blurb: "Every DNS record type for a domain, read live.", access: "PRO", href: "/tools/dns-lookup", linkNote: "About the tool" },
      { name: "WHOIS Lookup", blurb: "Registrar, dates and ownership record for a domain.", access: "PRO", href: "/tools/whois-lookup", linkNote: "About the tool" },
      { name: "Certificate Transparency Search", blurb: "Every certificate ever issued for a domain, from the public CT logs.", access: "PRO", href: "/tools/certificate-transparency-search", linkNote: "About the tool" },
      { name: "SSL Checker", blurb: "Certificate and cipher health for any site.", access: "PRO", href: "/tools/ssl-checker", linkNote: "About the tool" },
      { name: "Subdomain Finder", blurb: "Enumerate a domain's subdomains and attack surface.", access: "PRO", href: "/tools/subdomain-finder", linkNote: "About the tool" },
      { name: "Security Headers Checker", blurb: "Audit a site's HTTP security headers.", access: "PRO", href: "/tools/security-headers-checker", linkNote: "About the tool" },
      { name: "Website Technology Checker", blurb: "Frameworks, CMS and stack behind a website.", access: "PRO", href: "/tools/website-technology-checker", linkNote: "About the tool" },
    ],
  },
  {
    title: "Identity",
    tools: [
      { name: "Username Search", blurb: "Hunt one handle across the platforms that matter.", access: "PRO", href: "/tools/username-search", linkNote: "About the tool" },
      { name: "GitHub Profile Lookup", blurb: "Public profile, repositories and contacts for a GitHub user.", access: "PRO", href: "/tools/github-profile-lookup", linkNote: "About the tool" },
      { name: "Phone Number Lookup", blurb: "Carrier, region and line type for a phone number.", access: "PRO", href: "/tools/phone-number-lookup", linkNote: "About the tool" },
      { name: "Fingerprint — People Search", blurb: "Public profile search across username, email or phone.", access: "PRO", href: "/tools/people-search", linkNote: "About the tool" },
    ],
  },
  {
    title: "Threat & Exposure",
    tools: [
      { name: "IP Reputation Checker", blurb: "Reputation of an IP, domain or hash across threat feeds.", access: "PRO", href: "/tools/ip-reputation-checker", linkNote: "About the tool" },
      { name: "Data Leak Checker", blurb: "Has an email address appeared in a known breach? Checked live, free.", access: "FREE", href: "/tools/data-leak-checker", linkNote: "Run it now" },
    ],
  },
  {
    title: "Blockchain",
    tools: [
      { name: "Crypto Wallet Checker", blurb: "Wallet forensics for BTC, ETH and SOL addresses, plus a daily chain brief.", access: "PRO", href: "/tools/crypto-wallet-checker", linkNote: "About the tool" },
      { name: "DonBot", blurb: "Token signals and holder clusters — a partner tool by DigitalDon, inside the RECON board.", access: "PARTNER", href: "/", linkNote: "Open the globe" },
    ],
  },
  {
    title: "Sensing, Media & More",
    tools: [
      { name: "WiFi Sensing", blurb: "Sense motion in a room with the WiFi and camera you already have.", access: "FREE", href: "/sensing", linkNote: "Run it now" },
      { name: "Photo Geolocation", blurb: "Find where a photo was taken — EXIF first, then the clues in the scene.", access: "FREE", href: "/tools/photo-geolocation", linkNote: "Run it now" },
      { name: "Camera Distance Finder", blurb: "The straight-line distance between any two cameras in the index.", access: "FREE", href: "/tools/camera-distance", linkNote: "Run it now" },
      { name: "World Remote", blurb: "Probe nearby Bluetooth and local devices from your browser.", access: "FREE", href: "/tools/world-remote", linkNote: "About the tool" },
      { name: "Self Track", blurb: "Plot your own position and track on the globe.", access: "FREE", href: "/tools/self-track", linkNote: "About the tool" },
      { name: "Cinematic Director", blurb: "AI-directed cinematic camera flights — an affiliate programme perk.", access: "AFFILIATE", href: "/affiliates", linkNote: "About the programme" },
    ],
  },
];

const ALL_URLS = GROUPS.flatMap((g) =>
  g.tools.filter((t) => t.href.startsWith("/tools") || t.href === "/sensing").map((t) => `${BASE}${t.href}`)
);

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "WorldEye Tools",
  itemListElement: ALL_URLS.map((url, i) => ({ "@type": "ListItem", position: i + 1, url })),
};

const PILL: Record<Access, string> = {
  FREE: "border-emerald-400/40 text-emerald-300",
  PRO: "border-[#D4AF37]/40 text-[#D4AF37]",
  AFFILIATE: "border-white/25 text-white/60",
  PARTNER: "border-white/25 text-white/60",
};

export default function ToolsHubPage() {
  return (
    <PageShell>
      <JsonLd data={jsonLd} />
      <Breadcrumb trail={[{ label: "Home", href: "/" }, { label: "Tools" }]} />

      <div className="mt-8 text-center max-w-3xl mx-auto">
        <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#D4AF37] border border-[#D4AF37]/30 rounded-full px-4 py-1.5 mb-6">
          <Wrench className="w-3.5 h-3.5" /> THE WORLDEYE TOOLKIT
        </p>
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight">Tools</h1>
        <p className="mt-4 text-white/55">
          The whole RECON board, out in the open. Free tools run right on their page — no account,
          no install. Pro tools are labelled just as plainly, with an honest preview of what they
          return and a straight path into the app.
        </p>
      </div>

      {GROUPS.map((group) => (
        <section key={group.title} className="mx-auto mt-12 max-w-5xl">
          <h2 className="text-lg font-semibold tracking-wide">{group.title}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.tools.map((tool) => (
              <a
                key={tool.name}
                href={tool.href}
                className="group rounded-2xl border border-white/10 bg-white/[0.02] p-4 transition hover:border-[#D4AF37]/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold leading-snug">{tool.name}</h3>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-[0.12em] ${PILL[tool.access]}`}
                  >
                    {tool.access}
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-white/55">{tool.blurb}</p>
                <p className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[#D4AF37]">
                  {tool.linkNote} <ArrowUpRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </p>
              </a>
            ))}
          </div>
        </section>
      ))}

      <div className="mx-auto mt-12 max-w-3xl rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-sm text-white/65">
        <p>
          <strong className="text-white/85">How the labels work:</strong> FREE means the tool runs
          with no WorldEye plan — several run entirely in your browser. PRO means the live tool is
          included with WorldEye Pro inside the RECON board on the globe; its page shows a labelled
          example of the output, never a fake run. AFFILIATE and PARTNER tools belong to their
          programmes and are labelled as such.
        </p>
      </div>

      <div className="mt-12">
        <EmailCaptureCard placement="page" variant="inline" />
      </div>
      <CtaRow backHref="/" backLabel="Back to the globe" />
    </PageShell>
  );
}

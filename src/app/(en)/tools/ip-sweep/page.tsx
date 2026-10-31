import type { Metadata } from "next";
import { Crosshair } from "lucide-react";
import ToolLanding, { toolMetadata, type ToolLandingConfig } from "@/components/ToolLanding";
import ReconExample from "@/components/ReconExample";

const cfg: ToolLandingConfig = {
  slug: "ip-sweep",
  name: "IP Sweep",
  eyebrow: "WORLDEYE PRO TOOL",
  icon: Crosshair,
  h1: "IP Sweep — IP Range Scanner and Subnet Scanner Online",
  lede: "Find every host that answers in the subnet around an IP address — the whole block, not just one machine — so you can see a network the way it looks from the outside.",
  description:
    "WorldEye's IP Sweep is an online IP range scanner and subnet scanner: enter an IP address and it checks the surrounding subnet for live hosts and their open services. Part of the RECON board, included with WorldEye Pro.",
  freeTool: false,
  appPath: "RECON board → Network & Host → IP Sweep",
  honestyTitle: "What an IP sweep can and can't tell you",
  honesty: [
    "A sweep shows which addresses answered during the scan. A host that was asleep, powered off, or behind a firewall that drops probes will be missed — a silent address is not proof that nothing lives there.",
    "Finding a live host tells you an address is in use, not who owns the device or what it is for. Follow up with a port scan or a device lookup before drawing conclusions.",
    "Only sweep networks you own or are authorised to test. Sweeping is a routine diagnostic on your own ranges; against other people's networks it can breach their terms and, in some places, the law.",
    "Results are a snapshot. Cloud and home networks hand out addresses dynamically, so the same subnet can look different an hour later.",
  ],
  intro: [
    "A single port scan answers a question about one machine. Most real questions are bigger: what is actually on this network? Which addresses in this block are in use, and what did someone plug in that nobody documented? An IP sweep — also called an IP range scanner or subnet scanner — asks that question across a whole subnet, probing each address around the one you gave it and reporting which hosts are live and which common services they answer on.",
    "WorldEye's IP Sweep lives in the RECON board, the globe's built-in OSINT toolkit, so a sweep is never a dead end. Spot an unfamiliar live host in the result and you can open its port scan, its Shodan device record, or its reputation check in the same board, without copying addresses between sites. That flow — sweep the block, then investigate the surprises — is how forgotten servers, stray camera recorders, and test machines left running for years usually surface.",
    "The output is a plain inventory: each live address, a hostname where one resolves, and the services it appears to run. No risk score and no guesswork about who a device belongs to. Treat the list as a starting point for questions you can then verify, the way an electrician treats a breaker panel map drawn by the last person who touched it.",
  ],
  steps: [
    "Open the RECON board on the WorldEye globe and choose IP Sweep in the Network & Host group.",
    "Enter an IP address in a network you own or are authorised to test; the sweep covers the subnet around it.",
    "Run the sweep. WorldEye probes each address in the range and records which hosts respond.",
    "Read the inventory: live addresses, resolving hostnames, and the common services each host answers on.",
    "Investigate anything unexpected in the same board — port-scan the host, open its device record, or check its reputation.",
  ],
  faqTitle: "IP sweep and subnet scanning questions",
  faqs: [
    {
      q: "What is an IP sweep?",
      a: "An IP sweep probes every address in a subnet — for example all 254 usable addresses in a typical /24 home or office block — and reports which ones respond. It is the range-wide version of pinging one machine, used to inventory a network and find hosts nobody documented.",
    },
    {
      q: "How is this different from the Port Scanner?",
      a: "The Port Scanner goes deep on one address: which ports and services that single host exposes. An IP sweep goes wide across a range: which addresses are alive at all, with a light indication of their services. Most investigations run the sweep first to find the hosts, then port-scan the ones that matter.",
    },
    {
      q: "Why did the sweep miss a device I know is there?",
      a: "Several honest reasons: the device was asleep or off, its firewall drops the probe types the sweep uses, or it sits on a different subnet or VLAN than the address you entered. A sweep reports what answered from outside at scan time — absence from the list means silent, not non-existent.",
    },
    {
      q: "Can I sweep any subnet on the internet?",
      a: "Technically a public range will answer probes, but you should only sweep networks you own or have permission to test. Unauthorised scanning can violate a network owner's terms and local computer-misuse law. On your own ranges — your office, your cloud VPC, your home lab — it is a normal, healthy diagnostic.",
    },
    {
      q: "Does an IP sweep tell me who owns each device?",
      a: "No. It reports addresses, hostnames where they resolve, and responding services. A hostname like printer-3 or a service fingerprint can hint at what a device is, but ownership and purpose are conclusions you verify separately — the sweep's job is to show you what to ask about.",
    },
    {
      q: "What does it cost?",
      a: "IP Sweep is a Pro module in WorldEye's RECON board, included with WorldEye Pro. The board's free tools — the leak checker, the Shodan device lookup and others on the Tools page — run with no account at all.",
    },
  ],
  related: [
    { label: "Port Scanner — check open ports on one host", href: "/tools/port-scanner" },
    { label: "Shodan IoT Lookup — the device record for any IP (free)", href: "/tools/ip-device-lookup" },
    { label: "Vulnerability Sweep — known CVEs on a host", href: "/tools/vulnerability-scanner" },
    { label: "All WorldEye tools", href: "/tools" },
  ],
  children: null,
};

export const metadata: Metadata = toolMetadata(cfg);

export default function IpSweepPage() {
  return (
    <ToolLanding
      {...cfg}
    >
      <ReconExample
        targetLabel="TARGET — IP ADDRESS (SWEEPS THE SUBNET AROUND IT)"
        placeholder="e.g. 203.0.113.25"
        exampleTitle="Sweep of a sample /24 subnet"
        rows={[
          { label: "203.0.113.1", value: "live — gateway.example.com — 80, 443 open" },
          { label: "203.0.113.10", value: "live — server.example.com — 22, 443 open" },
          { label: "203.0.113.44", value: "live — no hostname — 554 open (camera-like)" },
          { label: "203.0.113.87", value: "live — printer.example.com — 9100 open" },
          { label: "Summary", value: "4 live hosts of 254 addresses probed" },
        ]}
        footnote="This is the shape of a real result, shown with documentation-range example addresses. The live sweep runs inside WorldEye's RECON board and is included with WorldEye Pro — and only ever sweep networks you own or are authorised to test."
      />
    </ToolLanding>
  );
}

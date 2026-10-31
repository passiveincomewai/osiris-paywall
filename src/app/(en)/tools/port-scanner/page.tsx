import type { Metadata } from "next";
import { Radar } from "lucide-react";
import ToolLanding, { toolMetadata, type ToolLandingConfig } from "@/components/ToolLanding";
import ReconExample from "@/components/ReconExample";

const cfg: ToolLandingConfig = {
  slug: "port-scanner",
  name: "Port Scanner",
  eyebrow: "WORLDEYE PRO TOOL",
  icon: Radar,
  h1: "Port Scanner — Check Open Ports Online",
  lede: "See which ports a server or IP address answers on, and which services are running behind them — scanned from outside the network, the way the open internet sees it.",
  description:
    "WorldEye's online port scanner checks an IP address or hostname for open ports and running services, from an external vantage point. Part of the RECON board, included with WorldEye Pro.",
  freeTool: false,
  appPath: "RECON board → Network & Host → Port Scan",
  honestyTitle: "What a port scan can and can't tell you",
  honesty: [
    "A scan shows what answers from the public internet at the moment of the scan. A firewall that silently drops probes makes a port look filtered whether or not a service sits behind it.",
    "An open port means a service accepted a connection — it does not mean the service is secure, up to date, or safe to expose. The Vulnerability Sweep is the next step for that question.",
    "Only scan systems you own or are authorised to test. Scanning is a normal diagnostic for your own servers; against strangers' systems it can breach their terms and, in some places, the law.",
  ],
  intro: [
    "Every service a machine offers the internet listens on a numbered port: web servers on 80 and 443, SSH on 22, mail, databases and remote desktop on their own. If you run a server, a camera system, or a home network with anything exposed, the useful question is simple — from out here, what answers? A port scan is how you ask it: probe the address from an external vantage point and record which ports accept a connection, which refuse, and which stay silent behind a firewall.",
    "WorldEye's Port Scan lives in the RECON board, the globe's built-in OSINT toolkit, where the result sits next to the rest of the picture: run a scan, then geolocate the host, check its Shodan device record, sweep its subnet, or check its reputation without re-typing the address into five different sites. The scan itself uses the common-ports quick scan — the web, mail, SSH, database and remote-access ports that account for nearly everything a host exposes by accident.",
    "The result is deliberately plain: a list of ports, their state, and the service each one usually runs. No score, no theatre. An open port you expected is configuration; an open port you didn't expect is a finding — and it is remarkable how often there is one, usually a router admin panel, an old database, or a camera recorder someone plugged in and forgot.",
  ],
  steps: [
    "Open the RECON board on the WorldEye globe and choose Port Scan in the Network & Host group.",
    "Enter an IP address or hostname you own or are authorised to test.",
    "Run the quick scan. WorldEye probes the common service ports from its side of the internet and records which accept connections.",
    "Read the result port by port: open (a service answered), closed (the host refused), or filtered (nothing answered — a firewall is likely dropping the probe).",
    "Follow up in the same board: check the host's device record (Shodan IoT), its known CVEs (Vulnerability Sweep), or its whole subnet (IP Sweep).",
  ],
  faqTitle: "Port scanning questions",
  faqs: [
    {
      q: "Is port scanning legal?",
      a: "Scanning your own systems, or systems you have permission to test, is a routine part of administering them. Scanning other people's systems without authorisation can violate their terms of service and, depending on where you are, computer-misuse law. WorldEye states the rule the way every reputable scanner does: your systems, or permission first.",
    },
    {
      q: "What is the difference between open, closed and filtered?",
      a: "Open means the probe completed a connection — a service is listening and reachable. Closed means the host itself answered and refused: the machine is up, nothing listens on that port. Filtered means no answer came back at all, which usually means a firewall silently dropped the probe; from outside, a filtered port and a dead service look the same, and an honest result says so.",
    },
    {
      q: "Why scan from an external tool instead of from my own network?",
      a: "Because the question is what the internet can reach. From inside your own network you bypass the router and firewall rules that govern outside access, so an internal scan can show ports as open that are actually blocked from outside — or miss that a forwarding rule exposes something you never meant to publish. An external scan shows the attacker's-eye view, which is the one that matters.",
    },
    {
      q: "Does an open port mean I'm hacked or insecure?",
      a: "Neither, by itself. Web servers are supposed to answer on 443. An open port is exposure, not compromise: it means a service can be talked to. Whether that is a problem depends on what the service is, whether it is patched, and whether it should be public at all. The finding that matters is the open port you cannot explain.",
    },
    {
      q: "Can this scan all 65,535 ports?",
      a: "The WorldEye quick scan covers the common service ports — the ones that account for the overwhelming majority of real-world exposure. It is a fast exposure check, not an exhaustive audit of every port; for a full audit of your own infrastructure, a dedicated local tool run with permission is the right instrument.",
    },
    {
      q: "What does it cost?",
      a: "Port Scan is a Pro module in WorldEye's RECON board, included with WorldEye Pro. The board's free tools — the leak checker, the Shodan device lookup and others on the Tools page — run with no account at all.",
    },
  ],
  related: [
    { label: "Shodan IoT Lookup — the device record for any IP (free)", href: "/tools/ip-device-lookup" },
    { label: "Vulnerability Sweep — known CVEs on a host", href: "/tools/vulnerability-scanner" },
    { label: "IP Sweep — scan a whole subnet", href: "/tools/ip-sweep" },
    { label: "All WorldEye tools", href: "/tools" },
  ],
  children: null,
};

export const metadata: Metadata = toolMetadata(cfg);

export default function PortScannerPage() {
  return (
    <ToolLanding
      {...cfg}
    >
      <ReconExample
        targetLabel="TARGET — IP OR HOSTNAME"
        placeholder="e.g. 203.0.113.10 or your server's hostname"
        exampleTitle="Quick scan of a sample host"
        rows={[
          { label: "22 / tcp", value: "open — SSH" },
          { label: "80 / tcp", value: "open — HTTP" },
          { label: "443 / tcp", value: "open — HTTPS" },
          { label: "3306 / tcp", value: "closed — MySQL" },
          { label: "3389 / tcp", value: "filtered — RDP (no answer)" },
        ]}
        footnote="This is the shape of a real result, shown with a documentation-range example address. The live scanner runs inside WorldEye's RECON board and is included with WorldEye Pro — create a free account to explore the board, and only ever scan systems you own or are authorised to test."
      />
    </ToolLanding>
  );
}

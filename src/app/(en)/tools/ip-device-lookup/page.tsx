import type { Metadata } from "next";
import { Network } from "lucide-react";
import ToolLanding, { toolMetadata, type ToolLandingConfig } from "@/components/ToolLanding";
import IpDeviceTool from "@/components/IpDeviceTool";

const cfg: ToolLandingConfig = {
  slug: "ip-device-lookup",
  name: "Shodan IoT Lookup",
  eyebrow: "FREE TOOL",
  icon: Network,
  h1: "Shodan IoT Lookup — What Does This IP Expose?",
  lede: "Look up any IP address in Shodan's InternetDB: the ports it answers on, its hostnames, and the known-vulnerability flags its software fingerprints match. Free, straight from your browser.",
  description:
    "Free IP device lookup powered by Shodan's InternetDB: open ports, hostnames, tags and CVE flags for any public IP address. No signup — your browser queries InternetDB directly.",
  freeTool: true,
  appPath: "RECON board → Network & Host → Shodan IoT",
  honestyTitle: "Reading an InternetDB record honestly",
  honesty: [
    "The data is Shodan's, collected by Shodan's internet-wide scanners and served by their free InternetDB. WorldEye presents the record; we don't scan the address ourselves on this page, and the page credits the source.",
    "A record is a snapshot from when Shodan last scanned the address. Devices change: ports opened last month may be closed now, and a newly exposed service won't appear until the next scan.",
    "A vulnerability flag means the fingerprinted software version matches a published CVE. It is a lead to verify on the device — many devices are patched in ways a banner can't show, and some flags are false alarms.",
    "No record does not mean no device. It means Shodan hasn't published scan data for that address — common for devices behind NAT or firewalls that drop unsolicited probes.",
  ],
  intro: [
    "Shodan is the search engine for the internet's plumbing: it continuously scans the public internet and records what answers — the cameras, routers, servers, industrial controllers and forgotten test boxes that respond when knocked on. Its free InternetDB is the quick-lookup layer of that data: one IP address in, and back comes the public record of what that address exposes.",
    "This page runs that lookup the same way WorldEye's RECON board does — your browser asks internetdb.shodan.io directly, so the address you enter never passes through WorldEye's servers. What you get is the working core of a device record: open ports (what can be talked to), hostnames (what the address calls itself), tags (Shodan's classification, like “iot” or “vpn”), software fingerprints, and the CVE flags those fingerprints match.",
    "It is the fastest sanity check there is for an address you operate — your office connection, a camera recorder, a home server — and the natural companion to the rest of the board: port-scan the address for today's answer, read its InternetDB record for the recent past, then check the Vulnerability Sweep's CVE matching if something looks old.",
  ],
  steps: [
    "Enter a public IP address — your own connection's, a server's, any address you're responsible for or researching.",
    "Your browser queries Shodan's InternetDB for that address; no WorldEye account or server is involved.",
    "Read the record: open ports, hostnames, tags, software fingerprints, and any vulnerability flags.",
    "No record? The result says so, and explains what that usually means — unlisted is not the same as unexposed.",
    "For a fuller picture, open the RECON board on the globe: the same lookup lives there beside the port scanner, subnet sweep and reputation checker.",
  ],
  faqTitle: "Shodan & InternetDB questions",
  faqs: [
    {
      q: "What is Shodan, and what is InternetDB?",
      a: "Shodan is a search engine that indexes the public internet's devices by scanning addresses and recording what responds. InternetDB is Shodan's free, lightweight lookup service: give it one IP address and it returns the essentials — ports, hostnames, tags and matched vulnerabilities — without needing a Shodan account or API key.",
    },
    {
      q: "Where does the data come from, and how fresh is it?",
      a: "From Shodan's own scanning, on Shodan's schedule. A record reflects the most recent scan of that address, which could be days or weeks old. Treat it as a recent-history record: excellent for spotting exposure you didn't know about, but confirm anything urgent with a live check (the RECON board's Port Scan asks the address directly, today).",
    },
    {
      q: "The lookup says my device has a vulnerability. Am I hacked?",
      a: "Almost certainly not — and the flag doesn't claim that. It means the software version Shodan fingerprinted matches a version with a published CVE. The right response is to check the device itself: confirm the actual firmware or software version, apply the vendor's update, and close the port if the service doesn't need to be public. Flags are leads, not verdicts.",
    },
    {
      q: "Why is there no record for my IP?",
      a: "Usually because nothing publicly reachable answered Shodan's probes, or the address hasn't been scanned yet. Devices behind a NAT router, and firewalls that silently drop unsolicited traffic, often leave no trace in InternetDB. That's generally a good sign — but it isn't proof of safety, just an absence of a public record.",
    },
    {
      q: "Can I look up any IP address?",
      a: "The lookup is public data about public addresses — the same record anyone can pull from InternetDB. Use it for addresses you operate, administer, or are legitimately researching.",
    },
    {
      q: "What does it cost?",
      a: "Nothing. The lookup is free, on this page and in WorldEye's RECON board, with no account — the data itself is Shodan's free InternetDB tier.",
    },
  ],
  related: [
    { label: "Port Scanner — check a host's open ports live", href: "/tools/port-scanner" },
    { label: "Vulnerability Sweep — known CVEs on a host", href: "/tools/vulnerability-scanner" },
    { label: "Data Leak Checker — has an email been breached? (free)", href: "/tools/data-leak-checker" },
    { label: "All WorldEye tools", href: "/tools" },
  ],
  children: null,
};

export const metadata: Metadata = toolMetadata(cfg);

export default function IpDeviceLookupPage() {
  return (
    <ToolLanding {...cfg}>
      <IpDeviceTool />
    </ToolLanding>
  );
}

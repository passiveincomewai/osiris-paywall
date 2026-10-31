import type { Metadata } from "next";
import { Bluetooth } from "lucide-react";
import ToolLanding, { toolMetadata, type ToolLandingConfig } from "@/components/ToolLanding";

const cfg: ToolLandingConfig = {
  slug: "world-remote",
  name: "World Remote",
  eyebrow: "FREE TOOL",
  icon: Bluetooth,
  h1: "World Remote — See the Devices Around You, From Your Browser",
  lede: "World Remote probes the Bluetooth devices and local connectors your own device can reach — live, locally, from inside the WorldEye globe. Nothing is scanned from a server; the airwaves it reads are the ones around you.",
  description:
    "World Remote finds nearby Bluetooth devices and local connectors from your own browser session in WorldEye — a free RECON board tool that runs entirely on your device.",
  freeTool: true,
  appPath: "RECON board → World Remote",
  honestyTitle: "What World Remote can and can't reach",
  honesty: [
    "Everything happens on your device. World Remote reads what your browser and hardware can reach — nearby Bluetooth radios and local connectors you point it at. WorldEye's servers cannot scan your room, and nothing here pretends otherwise.",
    "The browser will ask your permission before touching Bluetooth, and your operating system has the final word. Decline, and nothing is probed — the tool simply waits.",
    "It sees your nearby devices — yours. It is not a way to probe anyone else's network or hardware, and it cannot reach beyond your own radio range and local connections.",
    "Browser support varies: Bluetooth in the browser needs a compatible browser and device. On hardware or browsers without it, the panel says so instead of faking a result.",
  ],
  intro: [
    "Most recon tools look outward at the internet. World Remote turns around: it inventories the connected hardware in your own space — the Bluetooth speakers, wearables, beacons, smart locks and stray gadgets quietly advertising themselves around you — using nothing but the browser session you're already running WorldEye in.",
    "That makes it the odd one out on the RECON board, and usefully so. The scan is local by physics: Bluetooth range is a few metres, and the probes run from your device, so the results are a truthful census of your immediate environment — the kind of check you run when a mystery device keeps appearing in your Bluetooth list, or when you want to know what your smart home is broadcasting to the street.",
    "Because the tool needs your live browser, your hardware and your permission, it runs inside the globe app rather than on this page. Open the globe, open the RECON board, and World Remote is there — free, with no account, and with nothing about your surroundings ever leaving your device for WorldEye's servers.",
  ],
  steps: [
    "Open the WorldEye globe and then the RECON board.",
    "Choose World Remote.",
    "Grant the browser's Bluetooth permission when asked — the scan cannot start without it, by design.",
    "Read the nearby-device list: names as advertised, and the local connectors the panel can reach.",
    "Investigate anything you don't recognise — an unknown advertiser in your home is worth ten minutes with the device itself.",
  ],
  faqTitle: "World Remote questions",
  faqs: [
    {
      q: "Why does this tool run in the app instead of on this page?",
      a: "Because it needs your actual browser session, your device's Bluetooth radio, and a permission prompt tied to that session. A standalone web page can't reach your hardware — and a tool that claimed to scan your surroundings from a remote server would be making something up. World Remote is honest about where the scanning happens: on your device.",
    },
    {
      q: "Does WorldEye see or store the devices it finds?",
      a: "The probing is local to your browser session. World Remote exists to show you your own environment; it is not a collection mechanism, and the results are presented in your session for you.",
    },
    {
      q: "My browser says Bluetooth isn't available. What now?",
      a: "Web Bluetooth support depends on the browser and operating system — broadly, Chromium-based browsers on desktop and Android support it; some platforms restrict it. The panel will tell you plainly if your setup can't. Trying a Chromium browser on a laptop is the most reliable route.",
    },
    {
      q: "Is this a hacking tool?",
      a: "It's an inventory of what your own devices are broadcasting and what your own machine can reach — the same information your phone's Bluetooth settings screen shows you, organised. It doesn't break into anything, pair without consent prompts, or reach other people's hardware.",
    },
    {
      q: "How is this different from WiFi Sensing?",
      a: "Different sense, different question. WiFi Sensing watches for motion and presence using WiFi signals and your camera. World Remote enumerates connectable hardware — Bluetooth advertisers and local connectors. One asks “is something moving in this room?”, the other asks “what devices are in this room?”.",
    },
    {
      q: "What does it cost?",
      a: "Nothing. World Remote is one of the RECON board's free tools, with no account required.",
    },
  ],
  related: [
    { label: "WiFi Sensing — motion in a room, free (runs on its page)", href: "/sensing" },
    { label: "Shodan IoT Lookup — what your public IP exposes (free)", href: "/tools/ip-device-lookup" },
    { label: "Self Track — your own position on the globe (free)", href: "/tools/self-track" },
    { label: "All WorldEye tools", href: "/tools" },
  ],
  children: null,
};

export const metadata: Metadata = toolMetadata(cfg);

export default function WorldRemotePage() {
  return (
    <ToolLanding {...cfg}>
      <div className="mx-auto mt-10 max-w-3xl rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-center">
        <p className="text-sm leading-relaxed text-white/65">
          World Remote runs inside the globe app, because it works through your live browser —
          your Bluetooth radio, your permission prompt, your room. Open the globe, open the RECON
          board, and it&apos;s waiting there, free.
        </p>
        <a
          href="/"
          className="mt-5 inline-block rounded-lg bg-[#D4AF37] px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-[#e5c65a]"
        >
          Open the globe
        </a>
      </div>
    </ToolLanding>
  );
}

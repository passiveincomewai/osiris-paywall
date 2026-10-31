import type { Metadata } from "next";
import { LocateFixed } from "lucide-react";
import ToolLanding, { toolMetadata, type ToolLandingConfig } from "@/components/ToolLanding";

const cfg: ToolLandingConfig = {
  slug: "self-track",
  name: "Self Track",
  eyebrow: "FREE TOOL",
  icon: LocateFixed,
  h1: "Self Track — Your Own Position, On the Globe",
  lede: "Self Track plots your own device's position on the WorldEye globe and follows it as you move — your track, your device, started and stopped by you.",
  description:
    "Self Track shows your own location on the WorldEye 3D globe using your device's position — a free tool that only ever tracks the person using it: you.",
  freeTool: true,
  appPath: "the globe's Self Track action",
  honestyTitle: "The privacy terms, exactly",
  honesty: [
    "Self Track tracks one device: yours. It exists so you can see yourself on the globe — it cannot locate anyone else, and there is no mode that tries.",
    "It runs only when you start it, using your device's own location permission. Stop it, or revoke the permission, and your position stops updating.",
    "Your browser will ask before sharing your position with the page — that prompt is the consent, and declining it changes nothing else about WorldEye.",
    "Position accuracy is your device's accuracy: a phone with a clear sky view is precise; a laptop guessing from WiFi is approximate, and the globe shows your position as reported, not as surveyed truth.",
  ],
  intro: [
    "WorldEye's globe answers “what's happening over there?” better than almost anything — Self Track adds the missing “and where am I in it?”. Start it, and your own device's position appears on the 3D globe and updates as you move, so you can watch your train cross the transit layer, see which cameras you're passing on a drive, or simply orient yourself inside the same map you use to watch the world.",
    "It is the most deliberately narrow tool on the board. One device — the one in your hand. One direction of travel — yours. Started by an explicit action, fed by your operating system's location permission, and stopped the same way. In an industry that treats location as something to harvest quietly, Self Track treats it as something to use openly, for the person it belongs to.",
    "Travellers get the most from it: drop yourself onto the globe and the abstract layers turn personal — the storm cell two counties ahead of your route, the aurora oval over tonight's stop, the density of cameras in the city you're landing in. Your position is the one piece of data that makes a world map into your map.",
  ],
  steps: [
    "Open the WorldEye globe and start Self Track from the RECON area of the board.",
    "Approve your device's location prompt — the track cannot begin without it.",
    "Watch your position appear on the globe and update as you move.",
    "Layer the world over your track: cameras, weather, flights, transit — everything is more legible relative to you.",
    "Stop the track whenever you're done; the position stops updating the moment you do.",
  ],
  faqTitle: "Self Track questions",
  faqs: [
    {
      q: "Can Self Track locate someone else?",
      a: "No. It reads the position of the device running it, after that device's user approves the location prompt. There is no way to enter another person, number or device and get their location — that is not a feature this tool has, at any tier.",
    },
    {
      q: "Does it keep tracking me in the background?",
      a: "It tracks while it's running in your session, after you start it. Stop it — or close the session, or revoke the browser's location permission — and your position is no longer read or updated.",
    },
    {
      q: "Why is my position slightly wrong?",
      a: "Because consumer location is an estimate. Phones combine GPS, WiFi and cell signals; laptops often have only WiFi positioning, which can be off by a street or more. The globe plots what your device reports. Outdoors with a phone gives the tightest fix.",
    },
    {
      q: "Do I need an account?",
      a: "No. Self Track is one of WorldEye's free tools. An account adds saved places and the rest of the board, but your own track needs nothing but your permission.",
    },
    {
      q: "What's the point of seeing myself on a globe?",
      a: "Context. A live map becomes a navigation instrument the moment you are on it: your route against the weather layer, your city against the camera network, your flight's airport against the planes overhead. People use it for road trips, rail journeys, storm watching and simple orientation in an unfamiliar place.",
    },
    {
      q: "What does it cost?",
      a: "Nothing — Self Track is free, like the other tools labelled FREE on the Tools page.",
    },
  ],
  related: [
    { label: "WiFi Sensing — motion in a room, free (runs on its page)", href: "/sensing" },
    { label: "Camera Distance Finder — how far is that camera from you? (free)", href: "/tools/camera-distance" },
    { label: "World Remote — the devices around you (free)", href: "/tools/world-remote" },
    { label: "All WorldEye tools", href: "/tools" },
  ],
  children: null,
};

export const metadata: Metadata = toolMetadata(cfg);

export default function SelfTrackPage() {
  return (
    <ToolLanding {...cfg}>
      <div className="mx-auto mt-10 max-w-3xl rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-center">
        <p className="text-sm leading-relaxed text-white/65">
          Self Track lives on the globe itself, because it follows your device as you move. Open
          the globe, start Self Track, approve the location prompt — and there you are, on the
          same map as everything else. Free, and only ever you.
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

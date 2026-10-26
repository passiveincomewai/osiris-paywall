import type { Metadata } from "next";
import LanguageHeaderControl from "@/components/translate/LanguageHeaderControl";
import Link from "next/link";
import { ArrowLeft, MessageCircleQuestion } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/JsonLd";
import RelatedLinks from "@/components/RelatedLinks";
import FaqAccordion, { type Faq } from "./FaqClient";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description:
    "Answers about WorldEye: is the map free, do you need an account, what Pro includes, trials and billing, cameras, flight tracking, privacy and account help.",
  alternates: { canonical: "/faq" },
  openGraph: {
    title: "Frequently Asked Questions | WorldEye",
    description:
      "Is the map free? What does Pro include? How do trials work? All answered.",
    url: "/faq",
    type: "website",
  },
};

const p = (href: string, label: string) => (
  <Link href={href} className="text-[#D4AF37] hover:underline">
    {label}
  </Link>
);

const GROUPS: { title: string; faqs: Faq[] }[] = [
  {
    title: "General",
    faqs: [
      {
        q: "Is the map really free?",
        a: (
          <>
            Yes. The 3D globe, live flight tracking, live transit, 74,229
            public cameras, satellites, earthquakes, wildfires, weather and
            street-level photos are free forever — and so is basic search. No
            account, no credit card. Pro unlocks the intelligence-grade tools on
            top of it. See {p("/pricing", "pricing")} for the full breakdown.
          </>
        ),
      },
      {
        q: "Do I need an account?",
        a: "No. Just open the site and you're looking at the planet. Accounts only exist for Pro subscribers (billing) and affiliates — never as a gate in front of the map.",
      },
      {
        q: "How many cameras can I open for free?",
        a: "Every device gets 5 free camera opens — enough to look around and check the places you care about. Pro removes the limit entirely, with unlimited camera opens on top of the Pro tools. The globe, flights, satellites and every other free layer never count against your opens.",
      },
      {
        q: "Which browsers are supported?",
        a: "Any modern browser: Chrome, Edge, Firefox and Safari, on desktop and mobile. The site is fully usable on phones — just open it in your mobile browser.",
      },
      {
        q: "Is there a mobile app?",
        a: "Not yet. The website is mobile-optimized and works well in phone browsers, which is where most people use it today. A native app is on the roadmap.",
      },
      {
        q: "How is WorldEye different from Google Earth?",
        a: "Google Earth is a map of the recorded past; WorldEye is a map of right now. We don't do historical imagery or 3D buildings — we fuse live streams: aircraft, satellites, weather, earthquakes, wildfires and 74,229 public cameras, all updating in real time on one globe.",
      },
      {
        q: "Does WorldEye work in my country?",
        a: "Yes. WorldEye is a website — open it in any modern browser, anywhere in the world. Every layer is global; only camera density varies by region, since it depends on what each place publishes.",
      },
      {
        q: "What's the best website to watch live cameras around the world?",
        a: "WorldEye is built for exactly that: 74,229 live public cameras from 109 countries on one free 3D globe — no signup needed to start watching. Instead of hunting through hundreds of separate agency and resort sites, you get traffic, city, beach, ski, airport and nature cameras on a single searchable map, with flights, weather and earthquakes layered around them.",
      },
      {
        q: "Can I watch live cameras for free?",
        a: "Yes — watching live cameras on WorldEye is free, and you never need an account to browse the globe. The free plan includes 5 camera opens on the globe; paid plans remove that limit.",
      },
      {
        q: "What's the difference between WorldEye and God's Eye View?",
        a: (
          <>
            God&apos;s Eye View is free open-source software you download and
            run yourself, with roughly 4,000 cameras; WorldEye is the same idea
            as a hosted website with 74,229 cameras. The two projects are
            independent. God&apos;s Eye View starts with no API key — keys are
            only needed for its photorealistic 3D tiles and voice agent — and
            WorldEye needs no install or key at all. There&apos;s a fuller
            side-by-side on our{" "}
            {p("/alternatives/gods-eye-view", "God's Eye View alternatives page")}.
          </>
        ),
      },
      {
        q: "Does WorldEye work on my phone?",
        a: "Yes — WorldEye runs in any modern phone browser, with nothing to install, and the full globe, cameras, flights and search all work on mobile. The layout adapts to the smaller screen and camera feeds play inline. There is no separate app to download; the website is the app.",
      },
    ],
  },
  {
    title: "Pro & billing",
    faqs: [
      {
        q: "What does Pro include?",
        a: (
          <>
            The OI AI assistant (runs on your own API key), satellite imagery
            view, the live traffic layer, advanced search filters, the OSINT
            toolkit (nmap, DNS, WHOIS, SSL analysis) and the camera recording
            studio. Plus every future Pro layer at no extra cost. VIP Pro —
            the annual plan — adds the premium intel feeds and camera
            timelapse on top. Full list on the {p("/pricing", "pricing page")}.
          </>
        ),
      },
      {
        q: "What's the difference between Pro and VIP Pro?",
        a: "VIP Pro is the annual plan: everything in Pro, plus the two top-tier exclusives — the premium intel feeds (cyber threats, GDELT events, maritime tracking, conflict zones and live news) and camera timelapse. The weekly and monthly plans are Pro; only the yearly plan is VIP Pro. The recording studio, OSINT toolkit and every other Pro tool come with both.",
      },
      {
        q: "How do the free trials work?",
        a: "Weekly and monthly plans start with 10 free days, VIP Pro with 10 free days. Your card is collected at signup but never charged during the trial — cancel before it ends and you pay nothing.",
      },
      {
        q: "Can I cancel anytime?",
        a: "Anytime, in one click. Your Pro access runs until the end of the period you've paid for, then simply stops. No retention calls, no dark patterns.",
      },
      {
        q: "What payment methods do you accept?",
        a: "Major credit and debit cards through Stripe's secure checkout. Weekly is $7.99, monthly $13.99, VIP Pro $74.99.",
      },
      {
        q: "Do I need my own OpenAI key for the AI assistant?",
        a: "Yes. OI runs on your own API key (OpenAI, Anthropic, Google or OpenRouter), so usage is billed directly by the provider at cost — never marked up. Your key stays in your browser; we never see it.",
      },
      {
        q: "How do I update my payment method or get receipts?",
        a: "Everything billing-related runs through Stripe's secure customer portal: update your card, download invoices and receipts, or switch plans. For anything the portal can't do, write to us from your account email.",
      },
      {
        q: "Do you offer refunds?",
        a: "Yes — your first charge is covered by a 7-day money-back guarantee. Email us at passiveincomewai@gmail.com within 7 days of your first charge — the charge that ends your free trial, or your first charge if your plan had no trial — for a full refund to your original payment method, no questions asked. The guarantee covers your first charge only; renewal charges aren't refundable under it. We also email you before a trial's first charge, so it shouldn't come as a surprise.",
      },
      {
        q: "What is VIP Pro?",
        a: "VIP Pro is WorldEye's top plan — $74.99 a year — adding 40-camera recording, the recording dashboard and roomier camera alerts on top of everything in Pro. Pro records up to 20 cameras at once; VIP Pro records 40. Camera alerts watch up to 2 cameras on Pro and up to 10 on VIP Pro, and email you when a condition you describe shows up. VIP Pro starts with a 10-day free trial.",
      },
    ],
  },
  {
    title: "Features",
    faqs: [
      {
        q: "How do the cameras work?",
        a: (
          <>
            WorldEye aggregates publicly available camera feeds from around the
            world — traffic, city streets, landmarks, nature — into one browsable
            layer on the map. They&apos;re third-party public sources, so
            individual feeds can go offline; coverage varies by region. Free for
            everyone. See the {p("/cameras", "live cameras page")} for more.
          </>
        ),
      },
      {
        q: "How accurate is the flight tracking?",
        a: "Positions come from ADS-B broadcasts that aircraft transmit continuously, so live coverage is genuinely real-time where receiver networks have coverage. Over oceans and remote areas, updates can be sparser.",
      },
      {
        q: "Is search free?",
        a: "Yes. Basic search is free for everyone — fly to any place, address or coordinates, no account needed. Pro adds advanced search filters for narrowing down cameras, aircraft and feeds.",
      },
      {
        q: "Is the traffic layer real?",
        a: "The congestion is real: live traffic-flow data from TomTom, drawn onto the map's roads. The vehicle dots that illustrate the flow are simulated, and the app labels them as simulated. The traffic layer is a Pro feature.",
      },
      {
        q: "Can I share a camera with someone?",
        a: "Yes. Every camera has a share button — send the link and the other person lands on the globe with that exact camera open. No account needed on either end.",
      },
      {
        q: "Can I record a camera or make a timelapse?",
        a: "Yes. Pro's Camera Recording Studio records live camera feeds right in your browser and saves the clips. Timelapse — capturing snapshot cameras frame by frame and exporting the film — is a VIP Pro extra.",
      },
      {
        q: "What are the intel feeds?",
        a: (
          <>
            VIP Pro-only data layers: cyber threat activity, GDELT global event
            data, maritime vessel tracking, conflict zones and a live news feed —
            all plotted on the globe.
          </>
        ),
      },
      {
        q: "What can I track besides cameras?",
        a: "Besides cameras, WorldEye tracks live flights, satellites including the ISS, ships, weather radar, earthquakes and wildfires — all on the same globe. Flights come from ADS-B broadcasts, ships from AIS, earthquakes from the USGS and wildfires from NASA satellite detections. Pro adds live traffic, transit and intelligence layers such as cyber threats and global events.",
      },
      {
        q: "How do camera alerts work?",
        a: "Pick a camera — up to 2 on Pro, up to 10 on VIP Pro — describe a condition in plain words, and WorldEye checks a still image about every 15 minutes and emails you when it changes. For example, 'snow on the road' or 'the parking lot is empty.' An AI judges each image; if it can't tell, no alert is sent rather than a guess. Alerts arrive by email and in the app, with the photo attached. Camera alerts come with the paid plans: 2 cameras on Pro, 10 on VIP Pro.",
      },
      {
        q: "Can I record a live camera?",
        a: "Yes — paid plans record live cameras right in your browser: Pro records up to 20 cameras at once, and VIP Pro up to 40. Clips are saved to your recording library for playback, and VIP Pro adds the recording dashboard. A few feed types, such as embedded YouTube streams, can't be captured and are labeled as such in the viewer.",
      },
    ],
  },
  {
    title: "Account & privacy",
    faqs: [
      {
        q: "How do I create an account?",
        a: "Click Sign up and register with your email — we'll send you a verification link — or continue with Google. You only need an account to subscribe to Pro or join the affiliate program; the map itself never asks you to sign in.",
      },
      {
        q: "What data does WorldEye collect?",
        a: "For anonymous visitors: essentially nothing tied to you — no account, no tracking profile. If you subscribe to Pro or join the affiliate program, we store your sign-in email, subscription status, and (for affiliates) referral and payout records. Full details are in the privacy policy.",
      },
      {
        q: "Do you sell my data or show ads?",
        a: "No. No data sales, no ad network, no sponsored results anywhere on the site. Revenue comes from Pro subscriptions — that's the whole business model.",
      },
      {
        q: "How do I delete my account?",
        a: "Email us from your account address and we'll delete your account and its associated data. Payment records that Stripe must retain for legal reasons stay with Stripe, not us.",
      },
      {
        q: "I forgot my password — how do I reset it?",
        a: "Use the 'Forgot password' link on the sign-in page. We'll email you a reset link that expires after 1 hour and is burned once used. For security, sign-in never reveals whether an email is registered.",
      },
      {
        q: "How does the affiliate program work?",
        a: (
          <>
            It&apos;s free to join and open to anyone eligible — you don&apos;t
            need to be a subscriber. Share your referral link; when someone
            subscribes through it, you earn a recurring commission of 15–30%
            (your rate grows with your rank) on every billing cycle while they
            stay subscribed. Commissions clear after a 30-day holding period,
            and payouts start once your balance reaches $25. Details on the{" "}
            {p("/affiliates", "affiliate program page")}.
          </>
        ),
      },
    ],
  },
  {
    title: "Cameras & availability",
    faqs: [
      {
        q: "Where do the cameras come from, and how many are there?",
        a: "WorldEye serves 74,229 live cameras across 105 countries. Every feed is a publicly published stream from its operator — transport departments, cities, airports, ski resorts, harbours and businesses. We aggregate and map them; we don't own or operate the cameras themselves.",
      },
      {
        q: "Why is a camera offline?",
        a: "Every feed is operated by a third party — a city, a transport agency, a resort, a business — streaming from their own servers. Feeds go dark when the source goes down and come back when the source does. The catalog refreshes as sources change, so the count shifts over time.",
      },
      {
        q: "Can I request a camera be added or removed?",
        a: "If you operate a public camera feed and want it included — or you own a feed listed here and want it removed — contact us with the details and we'll take care of it.",
      },
      {
        q: "What is the free camera limit?",
        a: "The free plan lets you open 5 cameras on the globe. Browsing the map, the country and city directories and the other live layers is not capped, and paid plans remove the camera-open limit entirely. The limit exists so the free map stays fast and sustainable for everyone.",
      },
      {
        q: "Where do the cameras come from?",
        a: "The cameras are public feeds published openly by their operators — transportation departments, cities, airports, ski resorts, harbors and businesses. The United States contributes the most: 41,355 cameras, largely state DOT networks. WorldEye aggregates and maps the feeds; it doesn't operate the cameras, which is why a feed occasionally goes dark when its operator's stream does.",
      },
    ],
  },
];

// Plain-text mirror of GROUPS for the FAQPage JSON-LD schema (links stripped).
const FAQ_SCHEMA: { q: string; a: string }[] = [
  {
    q: "Is the map really free?",
    a: "Yes. The 3D globe, live flight tracking, live transit, 74,229 public cameras, satellites, earthquakes, wildfires, weather and street-level photos are free forever — and so is basic search. No account, no credit card. Pro unlocks the intelligence-grade tools on top of it.",
  },
  {
    q: "Do I need an account?",
    a: "No. Just open the site and you're looking at the planet. Accounts only exist for Pro subscribers (billing) and affiliates — never as a gate in front of the map.",
  },
  {
    q: "How many cameras can I open for free?",
    a: "Every device gets 5 free camera opens — enough to look around and check the places you care about. Pro removes the limit entirely, with unlimited camera opens on top of the Pro tools. The globe, flights, satellites and every other free layer never count against your opens.",
  },
  {
    q: "Which browsers are supported?",
    a: "Any modern browser: Chrome, Edge, Firefox and Safari, on desktop and mobile. The site is fully usable on phones — just open it in your mobile browser.",
  },
  {
    q: "Is there a mobile app?",
    a: "Not yet. The website is mobile-optimized and works well in phone browsers, which is where most people use it today. A native app is on the roadmap.",
  },
  {
    q: "How is WorldEye different from Google Earth?",
    a: "Google Earth is a map of the recorded past; WorldEye is a map of right now. We don't do historical imagery or 3D buildings — we fuse live streams: aircraft, satellites, weather, earthquakes, wildfires and 74,229 public cameras, all updating in real time on one globe.",
  },
  {
    q: "Does WorldEye work in my country?",
    a: "Yes. WorldEye is a website — open it in any modern browser, anywhere in the world. Every layer is global; only camera density varies by region, since it depends on what each place publishes.",
  },
  {
    q: "What's the best website to watch live cameras around the world?",
    a: "WorldEye is built for exactly that: 74,229 live public cameras from 109 countries on one free 3D globe — no signup needed to start watching. Instead of hunting through hundreds of separate agency and resort sites, you get traffic, city, beach, ski, airport and nature cameras on a single searchable map, with flights, weather and earthquakes layered around them.",
  },
  {
    q: "Can I watch live cameras for free?",
    a: "Yes — watching live cameras on WorldEye is free, and you never need an account to browse the globe. The free plan includes 5 camera opens on the globe; paid plans remove that limit.",
  },
  {
    q: "What's the difference between WorldEye and God's Eye View?",
    a: "God's Eye View is free open-source software you download and run yourself, with roughly 4,000 cameras; WorldEye is the same idea as a hosted website with 74,229 cameras. The two projects are independent. God's Eye View starts with no API key — keys are only needed for its photorealistic 3D tiles and voice agent — and WorldEye needs no install or key at all. There's a fuller side-by-side on our God's Eye View alternatives page.",
  },
  {
    q: "Does WorldEye work on my phone?",
    a: "Yes — WorldEye runs in any modern phone browser, with nothing to install, and the full globe, cameras, flights and search all work on mobile. The layout adapts to the smaller screen and camera feeds play inline. There is no separate app to download; the website is the app.",
  },
  {
    q: "What does Pro include?",
    a: "The OI AI assistant (runs on your own API key), satellite imagery view, the live traffic layer, advanced search filters, the OSINT toolkit (nmap, DNS, WHOIS, SSL analysis) and the camera recording studio. Plus every future Pro layer at no extra cost. VIP Pro — the annual plan — adds the premium intel feeds and camera timelapse on top.",
  },
  {
    q: "What's the difference between Pro and VIP Pro?",
    a: "VIP Pro is the annual plan: everything in Pro, plus the two top-tier exclusives — the premium intel feeds (cyber threats, GDELT events, maritime tracking, conflict zones and live news) and camera timelapse. The weekly and monthly plans are Pro; only the yearly plan is VIP Pro. The recording studio, OSINT toolkit and every other Pro tool come with both.",
  },
  {
    q: "How do the free trials work?",
    a: "Weekly and monthly plans start with 10 free days, VIP Pro with 10 free days. Your card is collected at signup but never charged during the trial — cancel before it ends and you pay nothing.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Anytime, in one click. Your Pro access runs until the end of the period you've paid for, then simply stops. No retention calls, no dark patterns.",
  },
  {
    q: "What payment methods do you accept?",
    a: "Major credit and debit cards through Stripe's secure checkout. Weekly is $7.99, monthly $13.99, VIP Pro $74.99.",
  },
  {
    q: "Do I need my own OpenAI key for the AI assistant?",
    a: "Yes. OI runs on your own API key (OpenAI, Anthropic, Google or OpenRouter), so usage is billed directly by the provider at cost — never marked up. Your key stays in your browser; we never see it.",
  },
  {
    q: "How do I update my payment method or get receipts?",
    a: "Everything billing-related runs through Stripe's secure customer portal: update your card, download invoices and receipts, or switch plans. For anything the portal can't do, write to us from your account email.",
  },
  {
    q: "Do you offer refunds?",
    a: "Yes — your first charge is covered by a 7-day money-back guarantee. Email us at passiveincomewai@gmail.com within 7 days of your first charge — the charge that ends your free trial, or your first charge if your plan had no trial — for a full refund to your original payment method, no questions asked. The guarantee covers your first charge only; renewal charges aren't refundable under it. We also email you before a trial's first charge, so it shouldn't come as a surprise.",
  },
  {
    q: "What is VIP Pro?",
    a: "VIP Pro is WorldEye's top plan — $74.99 a year — adding 40-camera recording, the recording dashboard and roomier camera alerts on top of everything in Pro. Pro records up to 20 cameras at once; VIP Pro records 40. Camera alerts watch up to 2 cameras on Pro and up to 10 on VIP Pro, and email you when a condition you describe shows up. VIP Pro starts with a 10-day free trial.",
  },
  {
    q: "How do the cameras work?",
    a: "WorldEye aggregates publicly available camera feeds from around the world — traffic, city streets, landmarks, nature — into one browsable layer on the map. They're third-party public sources, so individual feeds can go offline; coverage varies by region. Free for everyone.",
  },
  {
    q: "How accurate is the flight tracking?",
    a: "Positions come from ADS-B broadcasts that aircraft transmit continuously, so live coverage is genuinely real-time where receiver networks have coverage. Over oceans and remote areas, updates can be sparser.",
  },
  {
    q: "Is search free?",
    a: "Yes. Basic search is free for everyone — fly to any place, address or coordinates, no account needed. Pro adds advanced search filters for narrowing down cameras, aircraft and feeds.",
  },
  {
    q: "Is the traffic layer real?",
    a: "The congestion is real: live traffic-flow data from TomTom, drawn onto the map's roads. The vehicle dots that illustrate the flow are simulated, and the app labels them as simulated. The traffic layer is a Pro feature.",
  },
  {
    q: "Can I share a camera with someone?",
    a: "Yes. Every camera has a share button — send the link and the other person lands on the globe with that exact camera open. No account needed on either end.",
  },
  {
    q: "Can I record a camera or make a timelapse?",
    a: "Yes. Pro's Camera Recording Studio records live camera feeds right in your browser and saves the clips. Timelapse — capturing snapshot cameras frame by frame and exporting the film — is a VIP Pro extra.",
  },
  {
    q: "What are the intel feeds?",
    a: "VIP Pro-only data layers: cyber threat activity, GDELT global event data, maritime vessel tracking, conflict zones and a live news feed — all plotted on the globe.",
  },
  {
    q: "How do I create an account?",
    a: "Click Sign up and register with your email — we'll send you a verification link — or continue with Google. You only need an account to subscribe to Pro or join the affiliate program; the map itself never asks you to sign in.",
  },
  {
    q: "What can I track besides cameras?",
    a: "Besides cameras, WorldEye tracks live flights, satellites including the ISS, ships, weather radar, earthquakes and wildfires — all on the same globe. Flights come from ADS-B broadcasts, ships from AIS, earthquakes from the USGS and wildfires from NASA satellite detections. Pro adds live traffic, transit and intelligence layers such as cyber threats and global events.",
  },
  {
    q: "How do camera alerts work?",
    a: "Pick a camera — up to 2 on Pro, up to 10 on VIP Pro — describe a condition in plain words, and WorldEye checks a still image about every 15 minutes and emails you when it changes. For example, 'snow on the road' or 'the parking lot is empty.' An AI judges each image; if it can't tell, no alert is sent rather than a guess. Alerts arrive by email and in the app, with the photo attached. Camera alerts come with the paid plans: 2 cameras on Pro, 10 on VIP Pro.",
  },
  {
    q: "Can I record a live camera?",
    a: "Yes — paid plans record live cameras right in your browser: Pro records up to 20 cameras at once, and VIP Pro up to 40. Clips are saved to your recording library for playback, and VIP Pro adds the recording dashboard. A few feed types, such as embedded YouTube streams, can't be captured and are labeled as such in the viewer.",
  },
  {
    q: "What data does WorldEye collect?",
    a: "For anonymous visitors: essentially nothing tied to you — no account, no tracking profile. If you subscribe to Pro or join the affiliate program, we store your sign-in email, subscription status, and (for affiliates) referral and payout records. Full details are in the privacy policy.",
  },
  {
    q: "Do you sell my data or show ads?",
    a: "No. No data sales, no ad network, no sponsored results anywhere on the site. Revenue comes from Pro subscriptions — that's the whole business model.",
  },
  {
    q: "How do I delete my account?",
    a: "Email us from your account address and we'll delete your account and its associated data. Payment records that Stripe must retain for legal reasons stay with Stripe, not us.",
  },
  {
    q: "I forgot my password — how do I reset it?",
    a: "Use the 'Forgot password' link on the sign-in page. We'll email you a reset link that expires after 1 hour and is burned once used. For security, sign-in never reveals whether an email is registered.",
  },
  {
    q: "How does the affiliate program work?",
    a: "It's free to join and open to anyone eligible — you don't need to be a subscriber. Share your referral link; when someone subscribes through it, you earn a recurring commission of 15–30% (your rate grows with your rank) on every billing cycle while they stay subscribed. Commissions clear after a 30-day holding period, and payouts start once your balance reaches $25. Details on the affiliate program page.",
  },
  {
    q: "Where do the cameras come from, and how many are there?",
    a: "WorldEye serves 74,229 live cameras across 105 countries. Every feed is a publicly published stream from its operator — transport departments, cities, airports, ski resorts, harbours and businesses. We aggregate and map them; we don't own or operate the cameras themselves.",
  },
  {
    q: "Why is a camera offline?",
    a: "Every feed is operated by a third party — a city, a transport agency, a resort, a business — streaming from their own servers. Feeds go dark when the source goes down and come back when the source does. The catalog refreshes as sources change, so the count shifts over time.",
  },
  {
    q: "Can I request a camera be added or removed?",
    a: "If you operate a public camera feed and want it included — or you own a feed listed here and want it removed — contact us with the details and we'll take care of it.",
  },
  {
    q: "What is the free camera limit?",
    a: "The free plan lets you open 5 cameras on the globe. Browsing the map, the country and city directories and the other live layers is not capped, and paid plans remove the camera-open limit entirely. The limit exists so the free map stays fast and sustainable for everyone.",
  },
  {
    q: "Where do the cameras come from?",
    a: "The cameras are public feeds published openly by their operators — transportation departments, cities, airports, ski resorts, harbors and businesses. The United States contributes the most: 41,355 cameras, largely state DOT networks. WorldEye aggregates and maps the feeds; it doesn't operate the cameras, which is why a feed occasionally goes dark when its operator's stream does.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  name: "WorldEye Frequently Asked Questions",
  url: "https://worldeye.app/faq",
  isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
  mainEntity: FAQ_SCHEMA.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function FaqPage() {
  return (
    <main className="docs-root min-h-screen bg-[#050508] text-zinc-100 relative overflow-x-clip">
      <JsonLd data={jsonLd} />
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full opacity-15 blur-[120px] bg-[#D4AF37]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[300px] rounded-full opacity-10 blur-[100px] bg-[#00E5FF]" />
      </div>

      <div className="relative max-w-3xl mx-auto px-6 py-10 md:py-16">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-12">
          <Link href="/" className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition">
            <ArrowLeft className="w-4 h-4" /> Back to the map
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/" aria-label="WorldEye — back to the live globe" className="shrink-0 inline-flex items-center"><img src="/worldeye-header-logo.png" alt="WorldEye" width={1063} height={290} className="h-6 w-auto" /></Link>
            <LanguageHeaderControl variant="mobile" />
          </div>
        </div>

        {/* Hero */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#D4AF37] border border-[#D4AF37]/30 rounded-full px-4 py-1.5 mb-6">
            <MessageCircleQuestion className="w-3.5 h-3.5" /> HELP CENTER
          </p>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
            Frequently asked <span className="text-[#D4AF37]">questions</span>
          </h1>
          <p className="text-white/55 mt-4 text-base md:text-lg leading-relaxed">
            Straight answers about the free map, Pro, billing and features.
          </p>
        </div>

        <FaqAccordion groups={GROUPS} />

        {/* Contact CTA */}
        <div className="mt-16 text-center rounded-3xl border border-white/10 bg-white/[0.02] p-10">
          <h2 className="text-xl md:text-2xl font-bold">Still stuck?</h2>
          <p className="text-white/55 mt-2 mb-6 text-sm">
            Get in touch — we reply within 1–2 business days.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/contact"
              className="px-6 py-3 rounded-2xl bg-[#D4AF37] text-black text-sm font-bold hover:brightness-110 transition"
            >
              Contact us
            </Link>
          </div>
        </div>

        <RelatedLinks
          links={[
            {
              label: "Features",
              desc: "The full tour — free forever layers and the Pro intelligence toolkit.",
              href: "/features",
            },
            {
              label: "Contact",
              desc: "Still stuck? Questions, feedback or partnership ideas — write to us.",
              href: "/contact",
            },
            {
              label: "Changelog",
              desc: "What's new on WorldEye — updates and launches as they ship.",
              href: "/changelog",
            },
            {
              label: "Security",
              desc: "How WorldEye protects you — in plain language, with no inflated claims.",
              href: "/security",
            },
          ]}
        />
      </div>

      <SiteFooter />
    </main>
  );
}

/**
 * English FAQ dictionary — source of truth for the localized /faq
 * page. Extracted verbatim 2026-10-26 from src/app/faq/page.tsx: each
 * entry carries the visible answer as RichText segments (the page's
 * inline <Link>s become slug links) and `schemaA`, the plain-text
 * mirror the FAQPage JSON-LD renders — the two are separate strings in
 * the English source too, and both are preserved exactly. The page
 * body lives in src/components/pages/FaqPage.tsx.
 *
 * One factual alignment (flagged in the build REPORT): the "What does
 * Pro include?" answer no longer lists satellite imagery view among
 * Pro's inclusions — the satellite view is free for everyone; the
 * pricing page and the owner's honesty pass already present it that
 * way. Trial terms already match trials.ts (weekly 3 days, monthly
 * and VIP Pro 10 days).
 *
 * 2026-10-29 compilation: this dictionary is now the compiled union of
 * the site's product FAQs — the previous /faq set plus the support
 * FAQs from /contact, and the FAQ sets from the security, enterprise,
 * affiliates, ambient-mode and photo-geolocation pages and the
 * pricing/home/live-webcams dictionaries, deduplicated. Every answer
 * is verbatim from its source page. Place-, event-, competitor- and
 * article-specific FAQs stay on their own pages. The page also gained
 * search, a top-recommended list and a view-all affordance (see
 * FaqSearch), driven by the copy blocks below.
 */

import type { RichText } from "../types";
import { lk, tx } from "../types";

export interface FaqEntryCopy {
  q: string;
  a: RichText;
  schemaA: string;
}

export interface FaqCopy {
  meta: {
    title: string;
    description: string;
    ogTitle: string;
    ogDescription: string;
  };
  topBar: {
    backToMap: string;
    logoAria: string;
  };
  hero: {
    badge: string;
    h1Before: string;
    h1Accent: string;
    sub: string;
  };
  groups: { title: string; faqs: FaqEntryCopy[] }[];
  search: {
    placeholder: string;
    ariaLabel: string;
    resultsTemplate: string;
    noResultsHeading: string;
    noResultsBody: string;
    helpCenterLink: string;
  };
  recommended: {
    heading: string;
    questions: string[];
  };
  viewAll: {
    button: string;
    heading: string;
  };
  helpCenter: {
    heading: string;
    body: string;
    button: string;
    tutorialsLabel: string;
  };
  contactCta: {
    heading: string;
    sub: string;
    button: string;
  };
  related: { label: string; desc: string }[];
}

const plain = (q: string, a: string): FaqEntryCopy => ({
  q,
  a: [tx(a)],
  schemaA: a,
});

export const enFaq: FaqCopy = {
  meta: {
    title: "Frequently Asked Questions",
    description:
      "Answers about WorldEye: is the map free, do you need an account, what Pro includes, trials and billing, cameras, flight tracking, privacy and account help.",
    ogTitle: "Frequently Asked Questions | WorldEye",
    ogDescription:
      "Is the map free? What does Pro include? How do trials work? All answered.",
  },
  topBar: {
    backToMap: "Back to the map",
    logoAria: "WorldEye — back to the live globe",
  },
  hero: {
    badge: "HELP CENTER",
    h1Before: "Frequently asked ",
    h1Accent: "questions",
    sub: "Straight answers about the free map, Pro, billing and features.",
  },
  groups: [
    {
      title: "General",
      faqs: [
        plain(
          "What is WorldEye?",
          "WorldEye is a free website that puts a live 3D globe of Earth in your browser — 74,229 public cameras, live flights, satellites, weather, earthquakes and wildfires on one map. There is nothing to install and no account needed to look around. Paid plans add an AI analyst, camera recording, alerts and premium intelligence layers."
        ),
        {
          q: "Is the map really free?",
          a: [
            tx("Yes. The 3D globe, live flight tracking, live transit, 74,229 public cameras, satellites, earthquakes, wildfires, weather and street-level photos are free forever — and so is basic search. No account, no credit card. Pro unlocks the intelligence-grade tools on top of it. See "),
            lk("pricing", "pricing"),
            tx(" for the full breakdown."),
          ],
          schemaA:
            "Yes. The 3D globe, live flight tracking, live transit, 74,229 public cameras, satellites, earthquakes, wildfires, weather and street-level photos are free forever — and so is basic search. No account, no credit card. Pro unlocks the intelligence-grade tools on top of it.",
        },
        plain(
          "Do I need an account?",
          "No. Just open the site and you're looking at the planet. Accounts only exist for Pro subscribers (billing) and affiliates — never as a gate in front of the map."
        ),
        plain(
          "How many cameras can I open for free?",
          "Every device gets 5 free camera opens — enough to look around and check the places you care about. Pro removes the limit entirely, with unlimited camera opens on top of the Pro tools. The globe, flights, satellites and every other free layer never count against your opens."
        ),
        plain(
          "Which browsers are supported?",
          "Any modern browser: Chrome, Edge, Firefox and Safari, on desktop and mobile. The site is fully usable on phones — just open it in your mobile browser."
        ),
        plain(
          "Is there a mobile app?",
          "Not yet. The website is mobile-optimized and works well in phone browsers, which is where most people use it today. A native app is on the roadmap."
        ),
        plain(
          "How is WorldEye different from Google Earth?",
          "Google Earth is a map of the recorded past; WorldEye is a map of right now. We don't do historical imagery or 3D buildings — we fuse live streams: aircraft, satellites, weather, earthquakes, wildfires and 74,229 public cameras, all updating in real time on one globe."
        ),
        plain(
          "Does WorldEye work in my country?",
          "Yes. WorldEye is a website — open it in any modern browser, anywhere in the world. Every layer is global; only camera density varies by region, since it depends on what each place publishes."
        ),
        plain(
          "What's the best website to watch live cameras around the world?",
          "WorldEye is built for exactly that: 74,229 live public cameras from 109 countries on one free 3D globe — no signup needed to start watching. Instead of hunting through hundreds of separate agency and resort sites, you get traffic, city, beach, ski, airport and nature cameras on a single searchable map, with flights, weather and earthquakes layered around them."
        ),
        plain(
          "Can I watch live cameras for free?",
          "Yes — watching live cameras on WorldEye is free, and you never need an account to browse the globe. The free plan includes 5 camera opens on the globe; paid plans remove that limit."
        ),
        plain(
          "How does the free camera ladder work?",
          "You start with 5 free camera opens on any device — no account, no signup. Add your email and you get 5 more — 10 opens in total; a free account reaches the same 10 once its email is verified. Browsing the globe, the country and city directories and every other free layer is never capped, and paid plans remove the camera-open limit entirely."
        ),
        plain(
          "Where can I watch live webcams in New York City?",
          "The New York City webcams page gathers the city's public cameras — 279 feeds within 25 km of Midtown, most of them NYSDOT's 511NY network — into a wall for the whole city plus one for each borough: Manhattan, Brooklyn, Queens, the Bronx and Staten Island. All of them are free to watch."
        ),
        plain(
          "Can I watch the northern lights on a webcam for free?",
          "Yes. The aurora webcams page collects the public cameras of the aurora belt — 825 in Finland, 482 in Iceland, 746 in Norway, plus Fairbanks, Alaska — next to the live Kp index, so you can see both the sky's activity and the cameras under it. They are road, weather and town feeds at aurora latitudes, not dedicated aurora cameras, and every one is free."
        ),
        plain(
          "Where can I watch cruise ships and ports live?",
          "The port webcams page builds a camera wall for each great harbour in the directory — Hong Kong's Victoria Harbour, Tampa Bay, Miami, Fort Lauderdale, New York Harbor and more. Pair a wall with the live ship tracker: follow a named ship on AIS as it approaches, then watch the arrival on the harbour cameras."
        ),
        {
          q: "What's the difference between WorldEye and God's Eye View?",
          a: [
            tx("God's Eye View is free open-source software you download and run yourself, with roughly 4,000 cameras; WorldEye is the same idea as a hosted website with 74,229 cameras. The two projects are independent. God's Eye View starts with no API key — keys are only needed for its photorealistic 3D tiles and voice agent — and WorldEye needs no install or key at all. There's a fuller side-by-side on our "),
            lk("alternatives/gods-eye-view", "God's Eye View alternatives page"),
            tx("."),
          ],
          schemaA:
            "God's Eye View is free open-source software you download and run yourself, with roughly 4,000 cameras; WorldEye is the same idea as a hosted website with 74,229 cameras. The two projects are independent. God's Eye View starts with no API key — keys are only needed for its photorealistic 3D tiles and voice agent — and WorldEye needs no install or key at all. There's a fuller side-by-side on our God's Eye View alternatives page.",
        },
        plain(
          "Does WorldEye work on my phone?",
          "Yes — WorldEye runs in any modern phone browser, with nothing to install, and the full globe, cameras, flights and search all work on mobile. The layout adapts to the smaller screen and camera feeds play inline. There is no separate app to download; the website is the app."
        ),
        plain(
          "Where does WorldEye's data come from?",
          "From public sources: aircraft ADS-B broadcasts, ship AIS transponders, satellite orbital data, public webcam networks, and open earthquake, weather and wildfire feeds. WorldEye collects and visualizes public data — it doesn't hack, intercept, or buy private data."
        ),
      ],
    },
    {
      title: "Pro & billing",
      faqs: [
        {
          q: "What does Pro include?",
          a: [
            tx("The OI AI assistant (runs on WorldEye's built-in AI — no key to bring; your own key works too), the live traffic layer, advanced search filters, the OSINT toolkit (nmap, DNS, WHOIS, SSL analysis) and the camera recording studio. Plus every future Pro layer at no extra cost. VIP Pro — the annual plan — adds the premium intel feeds and camera timelapse on top. Full list on the "),
            lk("pricing", "pricing page"),
            tx("."),
          ],
          schemaA:
            "The OI AI assistant (runs on WorldEye's built-in AI — no key to bring; your own key works too), the live traffic layer, advanced search filters, the OSINT toolkit (nmap, DNS, WHOIS, SSL analysis) and the camera recording studio. Plus every future Pro layer at no extra cost. VIP Pro — the annual plan — adds the premium intel feeds and camera timelapse on top.",
        },
        plain(
          "What's the difference between Pro and VIP Pro?",
          "VIP Pro is the annual plan: everything in Pro, plus the two top-tier exclusives — the premium intel feeds (cyber threats, GDELT events, maritime tracking, conflict zones and live news) and camera timelapse. The weekly and monthly plans are Pro; only the yearly plan is VIP Pro. The recording studio, OSINT toolkit and every other Pro tool come with both."
        ),
        plain(
          "How do the free trials work?",
          "Weekly starts with 3 free days; monthly and VIP Pro plans start with 10 free days. Your card is collected at signup but never charged during the trial — cancel before it ends and you pay nothing."
        ),
        plain(
          "Can I cancel anytime?",
          "Anytime, in one click. Your Pro access runs until the end of the period you've paid for, then simply stops. No retention calls, no dark patterns."
        ),
        plain(
          "What happens if I switch plans?",
          "Upgrades apply immediately with proration handled by Stripe. Downgrades take effect at the end of your current period."
        ),
        plain(
          "What payment methods do you accept?",
          "Major credit and debit cards through Stripe's secure checkout. Weekly is $7.99, monthly $13.99, VIP Pro $74.99."
        ),
        plain(
          "Do I need my own OpenAI key for the AI assistant?",
          "No. OI is powered by WorldEye's built-in AI for signed-in members — no API key to bring, no separate provider account, nothing billed to you by a third party. If you'd rather run on your own account, add your own API key (OpenAI, Anthropic, Google or OpenRouter) in OI settings: your key stays in your browser, we never see it, and it takes over whenever it's present."
        ),
        plain(
          "How do I update my payment method or get receipts?",
          "Everything billing-related runs through Stripe's secure customer portal: update your card, download invoices and receipts, or switch plans. For anything the portal can't do, write to us from your account email."
        ),
        plain(
          "Do you offer refunds?",
          "Yes — your first charge is covered by a 7-day money-back guarantee. Email us at passiveincomewai@gmail.com within 7 days of your first charge — the charge that ends your free trial, or your first charge if your plan had no trial — for a full refund to your original payment method, no questions asked. The guarantee covers your first charge only; renewal charges aren't refundable under it. We also email you before a trial's first charge, so it shouldn't come as a surprise."
        ),
        plain(
          "What is VIP Pro?",
          "VIP Pro is WorldEye's top plan — $74.99 a year — adding 40-camera recording, the recording dashboard and roomier camera alerts on top of everything in Pro. Pro records up to 20 cameras at once; VIP Pro records 40. Camera alerts watch up to 2 cameras on Pro and up to 10 on VIP Pro, and email you when a condition you describe shows up. VIP Pro starts with a 10-day free trial."
        ),
      ],
    },
    {
      title: "Features",
      faqs: [
        {
          q: "How do the cameras work?",
          a: [
            tx("WorldEye aggregates publicly available camera feeds from around the world — traffic, city streets, landmarks, nature — into one browsable layer on the map. They're third-party public sources, so individual feeds can go offline; coverage varies by region. Free for everyone. See the "),
            lk("cameras", "live cameras page"),
            tx(" for more."),
          ],
          schemaA:
            "WorldEye aggregates publicly available camera feeds from around the world — traffic, city streets, landmarks, nature — into one browsable layer on the map. They're third-party public sources, so individual feeds can go offline; coverage varies by region. Free for everyone.",
        },
        plain(
          "How accurate is the flight tracking?",
          "Positions come from ADS-B broadcasts that aircraft transmit continuously, so live coverage is genuinely real-time where receiver networks have coverage. Over oceans and remote areas, updates can be sparser."
        ),
        plain(
          "Is search free?",
          "Yes. Basic search is free for everyone — fly to any place, address or coordinates, no account needed. Pro adds advanced search filters for narrowing down cameras, aircraft and feeds."
        ),
        plain(
          "Is the traffic layer real?",
          "The congestion is real: live traffic-flow data from TomTom, drawn onto the map's roads. The vehicle dots that illustrate the flow are simulated, and the app labels them as simulated. The traffic layer is a Pro feature."
        ),
        plain(
          "Can I share a camera with someone?",
          "Yes. Every camera has a share button — send the link and the other person lands on the globe with that exact camera open. No account needed on either end."
        ),
        plain(
          "Can I record a camera or make a timelapse?",
          "Yes. Pro's Camera Recording Studio records live camera feeds right in your browser and saves the clips. Timelapse — capturing snapshot cameras frame by frame and exporting the film — is a VIP Pro extra."
        ),
        plain(
          "What are the intel feeds?",
          "VIP Pro-only data layers: cyber threat activity, GDELT global event data, maritime vessel tracking, conflict zones and a live news feed — all plotted on the globe."
        ),
        plain(
          "What can I track besides cameras?",
          "Besides cameras, WorldEye tracks live flights, satellites including the ISS, ships, weather radar, earthquakes and wildfires — all on the same globe. Flights come from ADS-B broadcasts, ships from AIS, earthquakes from the USGS and wildfires from NASA satellite detections. Pro adds live traffic, transit and intelligence layers such as cyber threats and global events."
        ),
        plain(
          "How do camera alerts work?",
          "Pick a camera — up to 2 on Pro, up to 10 on VIP Pro — describe a condition in plain words, and WorldEye checks a still image about every 15 minutes and emails you when it changes. For example, 'snow on the road' or 'the parking lot is empty.' An AI judges each image; if it can't tell, no alert is sent rather than a guess. Alerts arrive by email and in the app, with the photo attached. Camera alerts come with the paid plans: 2 cameras on Pro, 10 on VIP Pro."
        ),
        plain(
          "Can I record a live camera?",
          "Yes — paid plans record live cameras right in your browser: Pro records up to 20 cameras at once, and VIP Pro up to 40. Clips are saved to your recording library for playback, and VIP Pro adds the recording dashboard. A few feed types, such as embedded YouTube streams, can't be captured and are labeled as such in the viewer."
        ),
      ],
    },
    {
      title: "Account & privacy",
      faqs: [
        plain(
          "How do I create an account?",
          "Click Sign up and register with your email — we'll send you a verification link — or continue with Google. You only need an account to subscribe to Pro or join the affiliate program; the map itself never asks you to sign in."
        ),
        plain(
          "What data does WorldEye collect?",
          "For anonymous visitors: essentially nothing tied to you — no account, no tracking profile. If you subscribe to Pro or join the affiliate program, we store your sign-in email, subscription status, and (for affiliates) referral and payout records. Full details are in the privacy policy."
        ),
        plain(
          "Do you sell my data or show ads?",
          "No. No data sales, no ad network, no sponsored results anywhere on the site. Revenue comes from Pro subscriptions — that's the whole business model."
        ),
        plain(
          "How do I delete my account?",
          "Email us from your account address and we'll delete your account and its associated data. Payment records that Stripe must retain for legal reasons stay with Stripe, not us."
        ),
        plain(
          "I forgot my password — how do I reset it?",
          "Use the 'Forgot password' link on the sign-in page. We'll email you a reset link that expires after 1 hour and is burned once used. For security, sign-in never reveals whether an email is registered."
        ),
      ],
    },
    {
      title: "Cameras & availability",
      faqs: [
        plain(
          "Where do the cameras come from, and how many are there?",
          "WorldEye serves 74,229 live cameras across 109 countries. Every feed is a publicly published stream from its operator — transport departments, cities, airports, ski resorts, harbours and businesses. We aggregate and map them; we don't own or operate the cameras themselves."
        ),
        plain(
          "Why is a camera offline?",
          "Every feed is operated by a third party — a city, a transport agency, a resort, a business — streaming from their own servers. Feeds go dark when the source goes down and come back when the source does. The catalog refreshes as sources change, so the count shifts over time."
        ),
        plain(
          "Can I request a camera be added or removed?",
          "If you operate a public camera feed and want it included — or you own a feed listed here and want it removed — contact us with the details and we'll take care of it."
        ),
        plain(
          "What is the free camera limit?",
          "The free plan lets you open 5 cameras on the globe. Browsing the map, the country and city directories and the other live layers is not capped, and paid plans remove the camera-open limit entirely. The limit exists so the free map stays fast and sustainable for everyone."
        ),
        plain(
          "Where do the cameras come from?",
          "The cameras are public feeds published openly by their operators — transportation departments, cities, airports, ski resorts, harbors and businesses. The United States contributes the most: 41,355 cameras, largely state DOT networks. WorldEye aggregates and maps the feeds; it doesn't operate the cameras, which is why a feed occasionally goes dark when its operator's stream does."
        ),
        plain(
          "How do I find cameras in a specific country or city?",
          "Open the live map and search any place to fly straight to its nearest cameras, or browse the directory: country pages list every camera in the live index for that country with area filters, and city pages gather a city's feeds in one place."
        ),
        plain(
          "Are there live cameras near me?",
          "Probably, if your area publishes public feeds. The fastest check is the search on this page: type your city or area and the directory lists the cameras there; the country directory and the Top 25 regions also show where the densest networks run. On the live globe you can zoom straight to your neighbourhood and tap any camera marker. Where no public feed exists nearby, the directory shows the closest covered town rather than pretending otherwise."
        ),
        plain(
          "How is the directory kept honest?",
          "Every feed is checked to make sure it actually plays before it is listed — a camera that doesn't stream doesn't get counted — and the directory re-checks and deduplicates feeds over time. The headline number is the count of cameras the globe actually serves, which is why it is exact rather than a round marketing figure."
        ),
      ],
    },
    {
      title: "Security",
      faqs: [
        plain(
          "Does WorldEye store my credit card?",
          "No. Stripe processes all payments; card numbers never touch WorldEye's systems."
        ),
        plain(
          "Is my card safe during a free trial?",
          "Yes — trials use the same Stripe-hosted checkout as paid plans. Your card goes to Stripe, never to WorldEye, and nothing is charged during the trial."
        ),
        plain(
          "How do I report a security vulnerability?",
          "Through the contact page, with as much detail as you can share. Please give us a chance to fix it before disclosing publicly."
        ),
        plain(
          "What if I think my account was compromised?",
          "Reset your password right away from the sign-in page (reset links expire after 1 hour and are burned on use), then contact us from your account email so we can check the account with you."
        ),
      ],
    },
    {
      title: "Ambient Mode",
      faqs: [
        plain(
          "What is WorldEye Ambient Mode?",
          "Ambient Mode is a Slow TV player at worldeye.app/ambient. It plays WorldEye's live public cameras one at a time, full-screen, crossfading every 30–180 seconds (90 by default), with collections called moods — Rainy Cities, Snowy Mountains, Tropical Beaches, Night Views, or the whole planet shuffled. It is designed for televisions, second monitors and study desks: the controls hide themselves, and a small caption names each camera's place."
        ),
        plain(
          "How much does Ambient cost?",
          "Ambient is $4.99/month with a 10-day free trial — start the trial from the player or this page and you will not be charged until it ends. It is a standalone product, separate from WorldEye Pro, but every Pro and VIP plan already includes unlimited Ambient at no extra cost."
        ),
        plain(
          "Can I put Ambient on my TV?",
          "Yes — open worldeye.app/ambient in your smart TV's browser, or cast/mirror from a phone, tablet or laptop, then press start: Ambient goes full-screen and its controls hide after three seconds. The Stream to YouTube feature can also put Ambient on a TV through the YouTube app, by running the show on your own channel."
        ),
        plain(
          "Can I try Ambient free without signing up?",
          "Yes. Open worldeye.app/ambient and press start: everyone gets a 3-minute streaming demo with no account and no card. The demo counts time only while a camera is actually playing — pausing or a slow feed does not burn it. When it ends, the picture blurs and you can start the 10-day free trial or sign in if you already have Ambient or Pro."
        ),
        plain(
          "Can I stream Ambient to my own YouTube channel?",
          "Yes — that is Stream to YouTube, included with Ambient and with Pro. You save your own YouTube stream key in settings and run a small relay program on an always-on computer; it cycles the cameras WorldEye is cleared to redistribute, with a WorldEye credit overlay, for as long as you leave it running. See the Stream to YouTube page for how it works and which cameras are eligible."
        ),
      ],
    },
    {
      title: "Photo geolocation",
      faqs: [
        plain(
          "How does photo geolocation work here?",
          "In layers. GPS coordinates embedded in the photo file (EXIF) come first — they are part of the file itself. Without them, the tool extracts visible clues (signage text, named landmarks, plate styles, driving side, architecture, vegetation), looks the named places up in OpenStreetMap, and ranks the matches by how much independent evidence supports each one. The ranking is deterministic: the same clues always produce the same order, and the evidence is shown so you can judge it yourself."
        ),
        plain(
          "What does it cost?",
          "Nothing — it is a free beta with no signup. To keep it sustainable there is a limit of 3 analyses per day per visitor, and the visual clue pass has a daily budget; when that budget is used up the tool keeps working in metadata-only mode and tells you so."
        ),
        plain(
          "Is my photo stored or shared?",
          "No. Your photo is processed in memory on the server and discarded when the analysis finishes. It is not saved to disk or a database, not used for training, and never sent to a reverse-image search or any third-party photo service. The only things that leave the server are text clues (for example a landmark name) sent to OpenStreetMap for place lookup, and — when visual analysis is enabled — the image itself, sent once to the AI provider that powers the clue pass. Nothing about your photo is kept afterwards."
        ),
        plain(
          "Do you keep analytics about my photo or where it was taken?",
          "No. We count completed analyses so we can tell whether the beta is used, and a completed analysis records exactly one coarse token: whether the answer came from the file's metadata, from visual-clue matching, or could not be determined. No photo, no clue text, and no coordinates — not even the result's — are attached to that count. The photo itself is processed in memory and discarded, as the privacy notes on this page describe."
        ),
        plain(
          "Does it identify people in photos?",
          "No. The tool does not perform face recognition or identify individuals, and people in a photo are never used as clues."
        ),
        plain(
          "How accurate is it?",
          "Every result carries its own uncertainty radius, and that radius is the honest answer: “within about 250 m” means exactly that, and a wide radius means the match is broad. GPS found in the file is usually the strongest result; landmark and place-name matches vary with how distinctive the place is. This is a beta and matches can be wrong — which is why the evidence for and against each candidate is always shown. Results for homes and private property are deliberately shown as a general area only."
        ),
        plain(
          "What do the confidence levels and the evidence score mean?",
          "Every candidate carries a numeric evidence score from the ranking step: file GPS sits at the top, landmark matches start above place-name matches, OpenStreetMap's prominence for the place adds to the score, and an independent second clue pointing at the same area adds more. The confidence band (high, medium, low) is just that score grouped into three bands. It is a measure of how much evidence backs the match — not a guarantee — which is why the score's reasoning and the evidence for and against are always shown beside it."
        ),
        plain(
          "Which clues actually decide the result?",
          "Only two things can create a candidate: GPS coordinates embedded in the file, and a named landmark or place name that matches a place in OpenStreetMap. The rest of the clue set — plate style, driving side, vegetation, architecture, languages — is recorded and shown for transparency, but it never scores a match by itself. The one partial exception is scene type: it does not move a candidate, but it drives the privacy decision that turns a likely home into an area-only result."
        ),
        plain(
          "Why couldn't it determine my photo?",
          "Most often because the file has been through an app that strips metadata — WhatsApp, Instagram, Facebook and screenshots all remove GPS — and the scene itself shows no readable sign, landmark or place name. A photo of a beach, a forest or a generic street can be genuinely unplaceable from one frame. The original file straight from the camera or phone gives the tool far more to work with."
        ),
        plain(
          "Why is my result an area instead of a point?",
          "Two privacy rules. No result is ever displayed tighter than a 250 m radius. And when a photo looks like a private residence or private property, the exact point is suppressed entirely and only the general area is shown. That applies even when the underlying evidence is precise — other people's homes are not a puzzle to publish."
        ),
        plain(
          "Why is the uncertainty radius different for every result?",
          "Because it is the matched place's own size, not a fixed error bar. A candidate inherits the radius of the place OpenStreetMap matched — roughly half the span of its mapped outline — so a station gets a tight circle and a city-sized match gets a wide one. Two rules then apply: the 250 m privacy floor (a smaller outline still displays as 250 m, and file GPS always displays at the floor), and residential suppression, which replaces the point with a general area. Each result explains which of these produced the radius you see."
        ),
      ],
    },
    {
      title: "Enterprise & API",
      faqs: [
        plain(
          "What is the WorldEye Enterprise camera feed?",
          "It is a licence to build on the WorldEye catalogue itself. Instead of sending your audience to worldeye.app, you build custom camera collections from the catalogue and publish them on your own site or platform: through an embeddable live player, a private JSON data feed of your collections, and — if you want it — API keys onto the same data."
        ),
        plain(
          "How much does Enterprise cost, and is there a free trial?",
          "Enterprise is $999/year, billed annually. Unlike the Pro plans it has no free trial; your first charge is covered by a 7-day money-back guarantee — email us within 7 days of the charge for a full refund, no questions asked."
        ),
        plain(
          "Which cameras can I publish on my own site?",
          "Only the cameras each source's terms allow to be redistributed. Every camera in the catalogue carries a per-source rights verdict, and the embed, feed and API enforce it: around 96% of the catalogue is eligible, and some sources — Windy webcams among them — are excluded entirely, so nothing your organisation publishes outruns the rights behind it."
        ),
        plain(
          "What does my team get besides the feed?",
          "Everything in Pro, for your whole team, plus priority customer support. The self-serve dashboard is the whole product surface: collections, the embed, the data feed and your keys."
        ),
        plain(
          "How do I get started?",
          "Subscribe to Enterprise on the pricing page, sign in, and open the enterprise dashboard on this page: build your first collection, then take the embed, the feed or an API key from the same place. Integration help is included — we help you wire the embed or feed into your platform."
        ),
      ],
    },
    {
      title: "Affiliates & creators",
      faqs: [
        {
          q: "How does the affiliate program work?",
          a: [
            tx("It's free to join and open to anyone eligible — you don't need to be a subscriber. Share your referral link; when someone subscribes through it, you earn a recurring commission of 15–30% (your rate grows with your rank) on every billing cycle while they stay subscribed. Commissions clear after a 30-day holding period, and payouts start once your balance reaches $25. Details on the "),
            lk("affiliates", "affiliate program page"),
            tx("."),
          ],
          schemaA:
            "It's free to join and open to anyone eligible — you don't need to be a subscriber. Share your referral link; when someone subscribes through it, you earn a recurring commission of 15–30% (your rate grows with your rank) on every billing cycle while they stay subscribed. Commissions clear after a 30-day holding period, and payouts start once your balance reaches $25. Details on the affiliate program page.",
        },
        plain(
          "When do I get paid?",
          "Commissions sit in a pending state for a 30-day holding period after the underlying subscription payment clears, then become available in your payout balance. Once your available balance reaches the $25 minimum, you can request a payout, which is reviewed and processed by our team."
        ),
        plain(
          "How do the discount codes work?",
          "Every rank carries a personal discount code — 5% off for your audience at Explorer, rising to 30% off at Visionary. A sale made with your code counts as your referral even if the buyer never clicked your link, so codes work in videos, podcasts and print where links don't."
        ),
        plain(
          "What happens if someone I referred cancels?",
          "You earn on every qualifying renewal while they stay subscribed — so a cancellation simply means the renewals (and the commissions on them) stop there."
        ),
        plain(
          "Can I promote WorldEye anywhere?",
          "Share your link and code wherever you have a genuine audience — social posts, videos, streams, newsletters, communities. What you can't do is manufacture activity: fake clicks, self-referrals and duplicate accounts are checked for and earn nothing, and abuse can end a comp or an account."
        ),
        plain(
          "Is income guaranteed?",
          "No. Commissions are earned only from legitimate, paid WorldEye subscriptions — never from recruitment alone. Your earnings depend entirely on real customers subscribing through your referral link."
        ),
      ],
    },
    {
      title: "Support & troubleshooting",
      faqs: [
        plain(
          "How fast will I get a reply?",
          "We typically reply within 1–2 business days. WorldEye is run by a small independent team, so complex technical issues can take a little longer — but every message gets read."
        ),
        plain(
          "I'm having a billing problem — what should I include?",
          "Write from the email address on your account and include your plan (weekly, monthly or annual) and the date of the charge. That lets us find your subscription in Stripe immediately."
        ),
        plain(
          "A camera, flight or satellite layer isn't working — what now?",
          "First try a hard refresh — most layers depend on live third-party feeds that can hiccup. If it's still down, tell us which layer, your browser, and roughly when it started; we'll check whether the feed itself is offline."
        ),
        plain(
          "A camera feed is dead, wrong or mislabeled — can I report it?",
          "Please do. Send the camera's name or location and what looks wrong (offline, wrong place, duplicated). The directory is playback-verified, and reports like yours are one of the ways dead and mislabeled feeds get found and fixed."
        ),
        plain(
          "Do you offer phone or live-chat support?",
          "No — email only for now. It keeps support personal and lets the whole team see and answer your message instead of a chatbot."
        ),
      ],
    },
  ],
  search: {
    placeholder: "Search questions…",
    ariaLabel: "Search frequently asked questions",
    resultsTemplate: "{n} matching questions",
    noResultsHeading: "No matches for that search",
    noResultsBody:
      "Try different words — or head to the help center, where a real person reads every message.",
    helpCenterLink: "Visit the help center",
  },
  recommended: {
    heading: "Top recommended questions",
    questions: [
      "Is the map really free?",
      "How do the free trials work?",
      "What does Pro include?",
      "Can I cancel anytime?",
      "Do you offer refunds?",
      "How many cameras can I open for free?",
      "Why is a camera offline?",
      "How do I create an account?",
      "I forgot my password — how do I reset it?",
      "Can I record a live camera?",
    ],
  },
  viewAll: {
    button: "View all questions",
    heading: "All questions",
  },
  helpCenter: {
    heading: "The WorldEye help center",
    body: "Step-by-step tutorials for every feature, and a support inbox that replies within 1–2 business days — if it isn't answered here, it's answered there.",
    button: "Get help & contact us",
    tutorialsLabel: "Browse the tutorials",
  },
  contactCta: {
    heading: "Still stuck?",
    sub: "Get in touch — we reply within 1–2 business days.",
    button: "Contact us",
  },
  related: [
    {
      label: "Features",
      desc: "The full tour — free forever layers and the Pro intelligence toolkit.",
    },
    {
      label: "Contact",
      desc: "Still stuck? Questions, feedback or partnership ideas — write to us.",
    },
    {
      label: "Changelog",
      desc: "What's new on WorldEye — updates and launches as they ship.",
    },
    {
      label: "Security",
      desc: "How WorldEye protects you — in plain language, with no inflated claims.",
    },
  ],
};

import Link from "next/link";
import { Camera, CloudSun, Radar, Wind } from "lucide-react";
import AlternativePage, {
  altMetadata,
  type AltData,
} from "@/components/AlternativePage";

const data: AltData = {
  name: "Windy",
  path: "/alternatives/windy",
  title: "Windy Alternative — For When You Want to See the Weather, Not Just Forecast It",
  description:
    "Windy is the master of forecast maps. WorldEye is the alternative for seeing weather happen: live radar plus 74,229 ground cameras, flights and storms on one globe. Free, no signup.",
  ogTitle: "Windy Alternative — Live Weather, Ground Truth Included | WorldEye",
  ogDescription:
    "Compare Windy vs WorldEye: ECMWF/GFS forecast depth and the famous wind animation vs live conditions, radar and 74,229 cameras showing the weather itself.",
  kicker: "WINDY ALTERNATIVES",
  heroIcon: Wind,
  heroTitle: (
    <>
      A Windy alternative for when the forecast{" "}
      <span className="text-[#0096FF]">isn&apos;t the same as the weather.</span>
    </>
  ),
  heroLede: (
    <>
      Windy renders the atmosphere&apos;s future better than anyone — the
      wind-particle map, the stacked forecast models, the radar. But a
      forecast is a prediction, and sometimes the question isn&apos;t
      &ldquo;what will it do?&rdquo; but &ldquo;what is it doing, right now,
      at that exact beach, pass road or harbour?&rdquo; WorldEye is the live
      side of that coin: weather and radar layers wrapped around 74,229 live
      cameras that show you the sky itself. Here is the honest comparison.
    </>
  ),
  updatedNote:
    "Facts checked October 20, 2026 against Windy's official community (staff posts on Premium pricing, features and the absence of a Premium free trial) and WorldEye's live site. Windy's Premium price is quoted from a staff post and varies by region.",
  aboutIcon: CloudSun,
  aboutHeading: "What Windy is — and why pilots and sailors swear by it",
  about: [
    <>
      Windy began as Windyty in 2014, built by Czech entrepreneur and
      paraglider{" "}
      <span className="text-white/85 font-semibold">Ivo Lukačovič</span>, and
      grew into the weather map professionals reach for. Its signature is the
      animated wind-particle flow — the atmosphere rendered as moving streams
      over a map — surrounded by dozens of layers: radar, satellite, rain,
      temperature, waves, air quality and more, driven by the{" "}
      <span className="text-white/85 font-semibold">
        ECMWF, GFS and ICON forecast models
      </span>{" "}
      plus regional models for finer detail. It runs on the web and in
      polished iOS/Android apps.
    </>,
    <>
      The free tier is generous;{" "}
      <span className="text-white/85 font-semibold">Premium</span> (a staff
      post on Windy&apos;s official community puts it at €18.99/year, with
      regional variation, and notes there is no free trial of Premium)
      unlocks the professional kit: 1-hour forecast steps instead of 3-hour,
      a longer forecast range, your choice of default model, an archive of
      radar and satellite imagery, and extended meteograms. If you brief a
      flight, a crossing or a launch window from forecast models, this is
      money genuinely well spent.
    </>,
    <>
      Who is it for? Pilots, sailors, paragliders, surfers, farmers,
      photographers chasing light — anyone whose decision depends on what the
      sky will do in the next hours and days. Windy is a forecast instrument,
      arguably the best consumer one ever made. This page is for the other
      half of weather curiosity: watching it happen.
    </>,
  ],
  strengths: [
    {
      title: "The wind animation is iconic",
      body: "The particle-flow map communicates the atmosphere at a glance like nothing else in the category. Imitated constantly, matched rarely.",
    },
    {
      title: "Real forecast depth",
      body: "ECMWF, GFS, ICON and regional models side by side, with 1-hour steps on Premium — the multi-model comparison forecasters actually work with.",
    },
    {
      title: "Trusted by people whose safety uses it",
      body: "Pilots, sailors and paragliders plan around Windy daily. That professional gravity keeps its data honest and its layers serious.",
    },
    {
      title: "Radar and satellite archives",
      body: "Premium's year of archived radar/satellite imagery (per Windy's community answers) serves storm post-mortems and research, not just the live moment.",
    },
  ],
  gapsIcon: Camera,
  gapsHeading: "Where a forecast map can't take you",
  gaps: [
    <>
      The defining gap is tense. Windy shows the weather&apos;s future (and
      its recent past) — it does not show you the place. When the front
      reaches the coast, Windy displays the model&apos;s version of that
      moment; it cannot show you the actual rain on the actual promenade.
      Windy does carry a webcam layer, but webcams there are a garnish on a
      forecast map — not a browsable, searchable camera network you can
      explore by country and city. Ground truth is simply a different
      product.
    </>,
    <>
      The second gap is everything that isn&apos;t weather. Windy has no
      live flight tracking as a product, no ships or satellites as tracked
      objects, no earthquake layer as an events feed, no transit. A storm
      that closes an airport, diverts a fleet and shakes a coastline is four
      stories on Windy and one connected story on a generalist globe.
    </>,
    <>
      The third is smaller but real: Premium has{" "}
      <span className="text-white/85 font-semibold">
        no free trial
      </span>{" "}
      (Windy&apos;s own staff, in its community). The price is modest, but
      you commit before you&apos;ve felt the 1-hour steps and the archive.
      WorldEye&apos;s paid tiers all open with a trial and a money-back
      guarantee, because the alternative shouldn&apos;t ask for faith either.
    </>,
  ],
  worldEyeHeading: "WorldEye: the weather, with eyes on the ground",
  worldEye: [
    <>
      WorldEye puts live weather and radar on a 3D globe — storms, fronts and
      hurricane tracks via the{" "}
      <Link href="/weather-tracker" className="text-[#0096FF] hover:underline">
        weather tracker
      </Link>{" "}
      and{" "}
      <Link href="/hurricane-tracker" className="text-[#0096FF] hover:underline">
        hurricane tracker
      </Link>{" "}
      — and then does the thing a forecast map can&apos;t: it lets you look.
      <span className="text-white/85 font-semibold">
        {" "}
        74,229 live cameras
      </span>{" "}
      cover the beaches, passes, harbours and city streets the weather is
      happening to. The model says snow on the pass; the camera shows you the
      snow on the pass. Around the weather sit the other live layers —
      flights riding out the diversion, ships, satellites, earthquakes and
      fires — free with no signup.
    </>,
    <>
      The honesty paragraph, because this page needs one: WorldEye is{" "}
      <span className="text-white/85 font-semibold">
        not a forecast-model explorer
      </span>
      . There is no ECMWF-versus-GFS comparison, no 1-hour forecast stepping,
      no meteograms. If your decision needs the models — and for aviation
      and sailing decisions it genuinely does — Windy Premium is the right
      tool and this page won&apos;t pretend otherwise. WorldEye is the
      alternative for observation: what&apos;s happening out there, live,
      seen with your own eyes.
    </>,
  ],
  worldEyePoints: [
    {
      title: "Ground truth for every forecast",
      body: "Check the model, then check the camera. 74,229 feeds turn '30% chance of rain' into a look out of the window — from anywhere.",
    },
    {
      title: "Storms as events, not just systems",
      body: "Hurricane tracks plus the cameras in the path, the flights diverting and the ships rerouting — one globe, one story.",
    },
    {
      title: "Camera alerts for conditions",
      body: "VIP Pro watches feeds for plain-language conditions — 'snow on the road', 'fog in the bay' — and emails you the photo when they occur.",
    },
    {
      title: "Trials before money",
      body: "Pro and VIP Pro open with free trials (1-day and 3-day) and a 7-day money-back guarantee on first charges. Windy Premium has no trial.",
    },
  ],
  chips: [
    { icon: CloudSun, label: "Weather tracker", href: "/weather-tracker" },
    { icon: Radar, label: "Hurricane tracker", href: "/hurricane-tracker" },
    { icon: Camera, label: "74,229 cameras", href: "/cameras" },
  ],
  tableHeading: "Windy vs WorldEye, side by side",
  tableIntro:
    "Prediction versus observation. The rows split cleanly — which is exactly why so many people end up using both.",
  rows: [
    { feature: "Primary job", competitor: "Forecast visualisation", worldEye: "Live-world observation" },
    { feature: "Forecast models", competitor: "ECMWF, GFS, ICON + regional; 1-hour steps on Premium", worldEye: "Not a forecast-model explorer" },
    { feature: "Wind visualisation", competitor: "Signature animated particle flow", worldEye: "Weather and radar layers, without the particle-flow speciality" },
    { feature: "Radar", competitor: "Live radar + archive on Premium", worldEye: "Live radar layers, free" },
    { feature: "Webcams", competitor: "A webcam layer on the forecast map", worldEye: "74,229 feeds — the product's centrepiece, browsable by country/city" },
    { feature: "Live flights, ships, satellites", competitor: "No", worldEye: "Yes — all live, all free" },
    { feature: "Quakes, fires, transit", competitor: "Not its product", worldEye: "Yes — on the same globe" },
    { feature: "Price", competitor: "Free; Premium €18.99/yr (staff post; varies by region)", worldEye: "Free; Pro $7.99/wk or $13.99/mo; VIP Pro $74.99/yr" },
    { feature: "Free trial of paid tier", competitor: "No (per Windy staff)", worldEye: "Yes — 1-day Pro trials, 3-day VIP Pro" },
    { feature: "Apps", competitor: "Native iOS/Android apps", worldEye: "Browser-based, phone and desktop" },
  ],
  pricingHeading: "Pricing: the forecaster's bargain vs the observer's",
  pricing: [
    <>
      Windy&apos;s free tier covers a remarkable amount of the forecast map.
      Premium — €18.99/year according to a staff post on its official
      community, with regional prices varying — is one of consumer
      software&apos;s genuine bargains for the depth it unlocks: 1-hour
      steps, longer range, the radar/satellite archive, meteograms. Its one
      sharp edge is the absence of a free trial: you pay first, evaluate
      after.
    </>,
    <>
      WorldEye&apos;s weather, radar and cameras are{" "}
      <span className="text-white/85 font-semibold">
        free with no signup and no ads
      </span>
      . Paid tiers buy observation power:{" "}
      <span className="text-white/85 font-semibold">
        Pro at $7.99/week or $13.99/month
      </span>{" "}
      (1-day trials) for the satellite map view, traffic, the OSINT toolkit
      and camera recording;{" "}
      <span className="text-white/85 font-semibold">
        VIP Pro at $74.99/year
      </span>{" "}
      (3-day trial) for timelapse, intel layers and camera alerts. First
      charges carry a 7-day money-back guarantee — the full grid is on the{" "}
      <Link href="/pricing" className="text-[#0096FF] hover:underline">
        pricing page
      </Link>
      , next to the dedicated{" "}
      <Link href="/compare/windy" className="text-[#0096FF] hover:underline">
        Windy comparison
      </Link>
      .
    </>,
  ],
  stepsHeading: "Trying the alternative takes a minute",
  steps: [
    {
      title: "Open the globe",
      body: "worldeye.app is live immediately — no account, no install. Turn on the weather and radar layers.",
    },
    {
      title: "Pick a place with weather coming",
      body: "Somewhere a front, storm or snowfall is due. Read it the Windy way first — then find the place on WorldEye.",
    },
    {
      title: "Look at it",
      body: "Open the nearest live camera. That's the whole pitch in one click: the sky over that place, right now, not the model's rendering of it.",
    },
    {
      title: "Keep Windy for the briefing",
      body: "Planning a flight, a crossing, a shoot? Windy remains the forecaster's tool. WorldEye is where you watch the forecast come true — or not.",
    },
  ],
  verdictHeading: "Which one should you use?",
  verdicts: [
    {
      q: "Flying, sailing or launching on the forecast?",
      a: "Windy Premium. Multi-model depth and 1-hour steps are safety-grade tools, and €18.99/yr is a bargain for them.",
    },
    {
      q: "Watching weather happen somewhere you love?",
      a: "WorldEye. Cameras show the actual sky over the actual place, with radar and alerts around them.",
    },
    {
      q: "Following a hurricane or storm landfall?",
      a: "Both, honestly — Windy for the forecast track, WorldEye for the cameras in its path and the diverted flights above it.",
    },
  ],
  faqHeading: "Windy alternative questions, answered",
  faqs: [
    {
      q: "Is Windy free?",
      a: "Yes — the core forecast map is free on web and in its apps. Premium (€18.99/year per a staff post on Windy's community; regional prices vary) adds 1-hour forecast steps, longer range, radar/satellite archives and extended meteograms. WorldEye is also free, with no ads.",
    },
    {
      q: "How much does Windy Premium cost?",
      a: "A Windy staff post on the official community states €18.99 per year, noting regional prices vary. There is no free trial of Premium, per the same staff. WorldEye's paid tiers — $7.99/week, $13.99/month, $74.99/year for VIP Pro — all start with free trials.",
    },
    {
      q: "Does Windy have webcams?",
      a: "Windy carries a webcam layer on its map, so yes, webcams exist inside Windy — but they're a layer on a forecast product, not a searchable camera network. WorldEye's 74,229 cameras are the product's centrepiece, with a browsable country-and-city directory and recording/alerts on paid tiers.",
    },
    {
      q: "What is the best Windy alternative?",
      a: "For forecast maps specifically, Ventusky is the closest rival and Zoom Earth the prettiest satellite view. For the other half of weather curiosity — seeing conditions live, on the ground — WorldEye is the alternative: radar plus 74,229 cameras plus the flights and ships the weather is disrupting.",
    },
    {
      q: "Does WorldEye do weather forecasts like Windy?",
      a: "No — and any page claiming otherwise is overselling. WorldEye shows live weather, radar and storm tracking; it does not offer ECMWF/GFS/ICON model comparison, forecast stepping or meteograms. If forecast modelling is your need, Windy is the honest recommendation.",
    },
    {
      q: "Can I watch a hurricane live somewhere?",
      a: "On WorldEye: the hurricane tracker follows active storms on the globe while live cameras in the affected area show conditions on the ground, and the flight layer shows the airspace emptying and diverting. On Windy you get the superior forecast view of the same storm. Serious watchers use both.",
    },
    {
      q: "Windy vs WorldEye — which is better for a phone?",
      a: "Windy has native apps tuned for quick forecast checks. WorldEye runs in the mobile browser with nothing to install, and its screen carries cameras, flights and events alongside the weather. For a forecast glance, Windy; for watching a place, WorldEye.",
    },
  ],
  midCta: {
    heading: "The forecast says rain at the coast. See for yourself.",
    body: "Live radar plus a camera on the promenade — WorldEye is the weather, observed. Free, no signup, no ads.",
  },
  ctaHeading: (
    <>
      Don&apos;t just forecast it. <span className="text-[#0096FF]">Watch it happen.</span>
    </>
  ),
  ctaBody: "Live weather, radar and 74,229 cameras on one free 3D globe.",
  related: [
    {
      label: "Windy vs WorldEye, head to head",
      desc: "The dedicated comparison page with the full feature matrix.",
      href: "/compare/windy",
    },
    {
      label: "Zoom Earth alternatives",
      desc: "The other great weather map, compared the same honest way.",
      href: "/alternatives/zoom-earth",
    },
    {
      label: "Weather tracker",
      desc: "WorldEye's live weather and radar globe.",
      href: "/weather-tracker",
    },
    {
      label: "Hurricane tracker",
      desc: "Active storms, tracked live — with cameras in the path.",
      href: "/hurricane-tracker",
    },
  ],
};

export const metadata = altMetadata(data);

export default function Page() {
  return <AlternativePage data={data} />;
}

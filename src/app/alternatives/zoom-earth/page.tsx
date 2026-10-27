import Link from "next/link";
import { Camera, CloudSun, Radar, Satellite } from "lucide-react";
import AlternativePage, {
  altMetadata,
  type AltData,
} from "@/components/AlternativePage";

const data: AltData = {
  name: "Zoom Earth",
  path: "/alternatives/zoom-earth",
  title: "Zoom Earth Alternative — Past the Satellite View, Down to the Street",
  description:
    "Zoom Earth shows the planet from orbit, beautifully. WorldEye is the alternative that continues the zoom: live satellite tracking plus 74,229 street-level cameras under the clouds. Free, no signup.",
  ogTitle: "Zoom Earth Alternative — From Orbit to Street Level | WorldEye",
  ogDescription:
    "Compare Zoom Earth vs WorldEye: near-live satellite imagery and storm tracking vs a 3D globe with live cameras, flights, satellites and weather.",
  kicker: "ZOOM EARTH ALTERNATIVES",
  heroIcon: Satellite,
  heroTitle: (
    <>
      A Zoom Earth alternative for when you want to keep zooming —{" "}
      <span className="text-[#0096FF]">all the way to the street.</span>
    </>
  ),
  heroLede: (
    <>
      Zoom Earth is the most beautiful way to watch the planet&apos;s weather
      from orbit: satellite imagery refreshing every few minutes, storms
      spiralling in near-real time. But its zoom stops at the clouds.
      WorldEye starts where Zoom Earth ends — a 3D globe with live tracked
      satellites overhead and 74,229 live cameras at street level underneath,
      plus the flights, weather and fires in between. Here is the honest
      comparison.
    </>
  ),
  updatedNote:
    "Facts checked October 20, 2026 against Zoom Earth's site and app-store listings (imagery cadence, storm sources, Pro features and price) and WorldEye's live pricing page.",
  aboutIcon: CloudSun,
  aboutHeading: "What Zoom Earth is — and why it's hypnotic",
  about: [
    <>
      Zoom Earth, by Neave Interactive, is a live weather-satellite map for
      the web and iOS/Android. Its core view is geostationary imagery —
      NOAA GOES and JMA Himawari updating roughly{" "}
      <span className="text-white/85 font-semibold">every 10 minutes</span>,
      EUMETSAT Meteosat every 15 — layered with twice-daily HD imagery from
      NASA&apos;s Aqua and Terra satellites. Around that core it wraps rain
      radar with nowcasting, tropical storm tracking fed by the NHC and
      JTWC, wildfire detection from NASA FIRMS, and forecast maps from the
      DWD ICON and NOAA GFS models (precipitation, wind, temperature,
      pressure and more).
    </>,
    <>
      It is free with ads.{" "}
      <span className="text-white/85 font-semibold">Zoom Earth Pro</span> —
      $1.99/month or $11.99/year in its app-store listings — extends forecast
      maps to 10 days, radar nowcasting to an hour ahead, adds tropical
      weather alerts, removes the ads and syncs your account across devices.
      It is, by any measure, a lot of sky for twelve dollars a year.
    </>,
    <>
      Who is it for? Weather watchers, storm followers, and anyone who finds
      the breathing of the atmosphere — fronts sweeping continents, hurricanes
      winding up — inherently worth watching. Its design is famously clean:
      no clutter, no accounts demanded, just the planet from very high up.
      If that high-up view is the whole of what you want, keep it. This page
      is for when you catch yourself trying to zoom one level further.
    </>,
  ],
  strengths: [
    {
      title: "The prettiest satellite loop anywhere",
      body: "Geostationary imagery at 10–15 minute cadence, blended and animated with real craft. Watching a front cross a continent on Zoom Earth is a small daily pleasure.",
    },
    {
      title: "Serious storm tracking",
      body: "NHC and JTWC feeds with forecast tracks make it a hurricane-season staple — the storm view is the product's home turf.",
    },
    {
      title: "Pro is genuinely cheap",
      body: "$11.99/year for 10-day forecasts, hour-ahead nowcasting, alerts and no ads. Few subscriptions in this category ask so little.",
    },
    {
      title: "Zero-friction design",
      body: "Web and apps, no account needed to watch, an interface that gets out of the imagery's way. A masterclass in doing one thing cleanly.",
    },
  ],
  gapsIcon: Camera,
  gapsHeading: "Where the satellite view stops",
  gaps: [
    <>
      The first limit is altitude. Zoom Earth&apos;s imagery is magnificent
      and, necessarily, abstract: cloud tops and colour-coded rain. It cannot
      show you the flooded street, the snow accumulating on the pass, the
      harbour taking the swell — because its cameras never get closer than
      orbit, and its pictures of the ground are minutes old by design.
      &ldquo;Near-live&rdquo; is the honest label its cadence earns; a live
      camera feed is a different category of now.
    </>,
    <>
      The second limit is scope. Zoom Earth is weather from space — it has no
      ground cameras, no live flight tracking, no ships or satellites as
      tracked objects with positions and identities, no transit. When a
      hurricane makes landfall, the story continues at ground level — closed
      airports, diverted flights, rising water on real streets — on other
      sites.
    </>,
    <>
      The third is the free tier&apos;s ads and horizons: the free map is
      ad-supported, and the longer forecast range, the hour-ahead nowcasting
      and the tropical alerts are Pro features. None of that is unreasonable
      at the price — it just means the full Zoom Earth is a subscription,
      like everything else, and worth comparing on those terms.
    </>,
  ],
  worldEyeHeading: "WorldEye: orbit, air and street on one globe",
  worldEye: [
    <>
      WorldEye is a 3D globe that treats the satellite view as the top layer
      of a descent rather than the destination. From the planet view you can
      drop to the{" "}
      <Link href="/satellite-tracker" className="text-[#0096FF] hover:underline">
        live satellite tracker
      </Link>{" "}
      — thousands of tracked objects with live positions, free — turn on
      weather and radar, follow a hurricane with the{" "}
      <Link href="/hurricane-tracker" className="text-[#0096FF] hover:underline">
        hurricane tracker
      </Link>
      , and keep going down to{" "}
      <span className="text-white/85 font-semibold">
        74,229 live cameras
      </span>{" "}
      at street level: the beach the storm is approaching, the airport it
      just closed, the mountain road the snow is settling on. Flights, ships,
      earthquakes and fires share the same view, free with no signup.
    </>,
    <>
      Honesty about the trade: WorldEye does not reproduce Zoom Earth&apos;s
      geostationary imagery loop — the 10-minute GOES/Himawari animation is
      Zoom Earth&apos;s signature and it does it better than anyone. WorldEye
      offers a satellite map view on Pro, which is a basemap, not that living
      weather cinema. If your ritual is watching the atmosphere breathe from
      orbit, Zoom Earth Pro at $11.99/year is money well spent. WorldEye is
      the alternative for when the question moves from &ldquo;what&apos;s the
      sky doing?&rdquo; to &ldquo;what&apos;s happening down there?&rdquo;
    </>,
  ],
  worldEyePoints: [
    {
      title: "The last zoom level: live cameras",
      body: "74,229 real-time feeds at street level — the ground truth underneath Zoom Earth's cloud tops, browsable by country and city.",
    },
    {
      title: "Satellites as objects, not just imagery",
      body: "A free live tracker follows thousands of satellites and the space station with positions and passes — the things taking the pictures, on the same globe.",
    },
    {
      title: "Storms followed to the ground",
      body: "Hurricane tracking plus cameras in the path, diverted flights above and alerts on the feeds you care about (VIP Pro).",
    },
    {
      title: "Weather in company",
      body: "Radar and storm layers share the screen with quakes, fires, ships and transit — the event, whole, instead of the weather alone.",
    },
  ],
  chips: [
    { icon: Satellite, label: "Satellite tracker", href: "/satellite-tracker" },
    { icon: Radar, label: "Hurricane tracker", href: "/hurricane-tracker" },
    { icon: Camera, label: "74,229 cameras", href: "/cameras" },
  ],
  tableHeading: "Zoom Earth vs WorldEye, side by side",
  tableIntro:
    "Orbit versus the full descent. Zoom Earth wins the imagery rows on purpose; WorldEye wins everything that happens under the clouds.",
  rows: [
    { feature: "Core view", competitor: "Live weather-satellite imagery", worldEye: "3D globe — map, satellite view and cameras" },
    { feature: "Imagery cadence", competitor: "Geostationary every 10–15 min; NASA HD twice daily", worldEye: "Live camera streams and live object layers" },
    { feature: "Ground cameras", competitor: "No", worldEye: "74,229 live public feeds" },
    { feature: "Storm tracking", competitor: "Yes — NHC/JTWC tracks, a signature strength", worldEye: "Yes — plus cameras and flights in the storm's path" },
    { feature: "Rain radar & nowcasting", competitor: "Yes; nowcasting to 1 hour on Pro", worldEye: "Live radar layers, free" },
    { feature: "Wildfires", competitor: "NASA FIRMS detections", worldEye: "Fire detections plus perimeters, on the globe" },
    { feature: "Flights, ships, satellites as objects", competitor: "No", worldEye: "Yes — all live, all free" },
    { feature: "Ads", competitor: "Yes, on the free tier", worldEye: "No ads" },
    { feature: "Price", competitor: "Free; Pro $1.99/mo or $11.99/yr (app listings)", worldEye: "Free; Pro $7.99/wk or $13.99/mo; VIP Pro $74.99/yr" },
    { feature: "Apps", competitor: "Native iOS/Android apps + web", worldEye: "Browser-based, phone and desktop" },
  ],
  pricingHeading: "Pricing: twelve dollars of sky vs a globe that goes deeper",
  pricing: [
    <>
      Zoom Earth is free with ads; Pro — $1.99/month or $11.99/year in its
      app listings — is among the cheapest subscriptions in this entire
      category, and buys real things: 10-day forecast maps, hour-ahead radar
      nowcasting, tropical alerts, cross-device sync, no ads. If the
      satellite weather view is your whole interest, it&apos;s close to a
      perfect price.
    </>,
    <>
      WorldEye&apos;s globe — cameras, flights, satellites, weather, quakes,
      fires — is{" "}
      <span className="text-white/85 font-semibold">
        free with no signup and no ads
      </span>
      . Its paid tiers buy depth below the clouds:{" "}
      <span className="text-white/85 font-semibold">
        Pro at $7.99/week or $13.99/month
      </span>{" "}
      (3-day trial on Weekly, 10 days on Monthly) for the satellite map view, OSINT toolkit, traffic and
      multi-camera recording;{" "}
      <span className="text-white/85 font-semibold">
        VIP Pro at $74.99/year
      </span>{" "}
      (10-day trial) for intel layers, timelapse and camera alerts. First
      charges carry a 7-day money-back guarantee — see{" "}
      <Link href="/pricing" className="text-[#0096FF] hover:underline">
        pricing
      </Link>{" "}
      and the dedicated{" "}
      <Link href="/compare/zoom-earth" className="text-[#0096FF] hover:underline">
        Zoom Earth comparison
      </Link>
      .
    </>,
  ],
  stepsHeading: "Trying the alternative takes a minute",
  steps: [
    {
      title: "Open the globe",
      body: "worldeye.app loads live immediately — no account, no app install, phone or desktop.",
    },
    {
      title: "Find the weather you're watching",
      body: "Turn on weather and radar; locate the same system you've been following on Zoom Earth — a front, a storm, a snow band.",
    },
    {
      title: "Keep zooming",
      body: "Drop to the satellite tracker, then to a live camera in the weather's path. That last level — the street, now — is the whole difference.",
    },
    {
      title: "Keep Zoom Earth for the cinema",
      body: "The geostationary loop stays unmatched for pure sky-watching, and Pro costs $11.99 a year. Running both is a rounding error.",
    },
  ],
  verdictHeading: "Which one should you use?",
  verdicts: [
    {
      q: "You watch the atmosphere itself?",
      a: "Zoom Earth. The satellite loop is its art form, and Pro is nearly free. Nothing here replaces it.",
    },
    {
      q: "You want to see the place, not just its sky?",
      a: "WorldEye. Live cameras put you on the street the weather is happening to.",
    },
    {
      q: "Tracking a hurricane to landfall?",
      a: "Both: Zoom Earth for the storm's portrait from orbit, WorldEye for its arrival — cameras, closures and diversions.",
    },
  ],
  faqHeading: "Zoom Earth alternative questions, answered",
  faqs: [
    {
      q: "Is Zoom Earth actually live?",
      a: "Near-live. Its geostationary imagery refreshes about every 10 minutes (GOES, Himawari) to 15 minutes (Meteosat), with NASA HD imagery twice a day — superb for weather, but a slideshow compared with a video feed. WorldEye's 74,229 cameras stream in real time.",
    },
    {
      q: "Is Zoom Earth free?",
      a: "Yes, with ads. Zoom Earth Pro ($1.99/month or $11.99/year in app-store listings) removes ads and adds 10-day forecast maps, radar nowcasting up to an hour, tropical weather alerts and cross-device sync. WorldEye is free with no ads and no signup.",
    },
    {
      q: "What is the best Zoom Earth alternative?",
      a: "It depends on the direction you want to travel. For deeper weather forecasting, Windy. For satellite imagery archives and science data, NASA Worldview. For going below the satellite view — live cameras, flights, tracked satellites, ground events — WorldEye is the alternative built for that descent.",
    },
    {
      q: "Does Zoom Earth have street-level or traffic cameras?",
      a: "No — Zoom Earth's cameras all point down from orbit. Ground cameras are WorldEye's centrepiece: 74,229 public feeds covering streets, highways, beaches, airports and landmarks, browsable by country and city.",
    },
    {
      q: "Can WorldEye show satellite imagery like Zoom Earth?",
      a: "Partly, and we'll be precise: WorldEye's Pro tier includes a satellite map view, and its free satellite tracker shows live positions of thousands of orbiting objects. What it doesn't replicate is Zoom Earth's animated geostationary weather imagery — that loop is Zoom Earth's signature, and it's better at it.",
    },
    {
      q: "Zoom Earth vs WorldEye for hurricane tracking?",
      a: "Zoom Earth gives the storm's portrait — satellite imagery and NHC/JTWC forecast tracks, beautifully presented. WorldEye follows the same storm to the ground: live cameras in the landfall zone, flights diverting around it, and alerts when a watched feed's conditions change. Hurricane season is the strongest case for using both.",
    },
    {
      q: "Does Zoom Earth track flights or ships?",
      a: "No — Zoom Earth is a weather product: satellite imagery, radar, storms and fires. Flights, AIS ships and satellites-as-objects are WorldEye layers, live and free on the same globe as its weather.",
    },
  ],
  midCta: {
    heading: "You've seen the storm from orbit. Now stand under it.",
    body: "One more zoom level exists — a live camera on the street the weather is reaching. Free, no signup.",
  },
  ctaHeading: (
    <>
      From orbit, <span className="text-[#0096FF]">to the street.</span>
    </>
  ),
  ctaBody: "Live satellites, weather and 74,229 cameras on one free 3D globe.",
  related: [
    {
      label: "Zoom Earth vs WorldEye, head to head",
      desc: "The dedicated comparison page with the full feature matrix.",
      href: "/compare/zoom-earth",
    },
    {
      label: "Windy alternatives",
      desc: "The forecast-model master, compared the same honest way.",
      href: "/alternatives/windy",
    },
    {
      label: "Satellite tracker",
      desc: "Thousands of satellites and the ISS, tracked live and free.",
      href: "/satellite-tracker",
    },
    {
      label: "Hurricane tracker",
      desc: "Active storms tracked live — with cameras in the path.",
      href: "/hurricane-tracker",
    },
  ],
};

export const metadata = altMetadata(data);

export default function Page() {
  return <AlternativePage data={data} />;
}

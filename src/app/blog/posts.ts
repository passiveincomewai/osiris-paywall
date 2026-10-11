export type PostSection = {
  heading?: string;
  body: string[];
};

export type BlogPost = {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  tags: string[];
  sections: PostSection[];
};

export const POSTS: BlogPost[] = [
  {
    slug: "what-is-osint",
    title: "What Is OSINT? A Beginner's Guide to Open-Source Intelligence",
    date: "2026-10-10",
    excerpt:
      "OSINT is intelligence gathered from public sources — no hacking, no classified access. Here's what it actually is, the techniques beginners start with, and how to practice it legally and ethically.",
    tags: ["OSINT", "guide"],
    sections: [
      {
        heading: "The definition, minus the jargon",
        body: [
          "OSINT stands for open-source intelligence: information collected from publicly available sources. Satellite imagery, flight trackers, ship transponders, public webcams, DNS records, social media posts, government data feeds — all of it counts as open source if anyone with an internet connection can access it.",
          "What makes it intelligence rather than trivia is the method: OSINT is about collecting, verifying, and combining public data points until they answer a question. Journalists use it to verify conflict footage. Security teams use it to find their company's exposed assets. Hobbyists use it to track aircraft or ships in real time.",
        ],
      },
      {
        heading: "The sources beginners actually use",
        body: [
          "Start with sources that require nothing but a browser. Public flight tracking (ADS-B data broadcast by aircraft), live webcam networks, earthquake and weather feeds, and ship AIS data are all genuinely open and legal to view.",
          "DNS and WHOIS lookups are another classic starting point: every domain has public registration data and DNS records that reveal its hosting infrastructure. Learning to read these is one of the most practical beginner skills in the field.",
        ],
      },
      {
        heading: "Beginner techniques that work today",
        body: [
          "Advanced search operators are the foundation — filtering by site, file type, and date range turns a generic search engine into a research tool. From there, try correlating sources: an aircraft's ADS-B track against its registration database entry, or a webcam's timestamp against weather data for the same location.",
          "Image verification is the skill that separates beginners from practitioners: checking a photo's metadata, reverse-searching it, and matching landmarks against satellite imagery before trusting what it claims to show.",
        ],
      },
      {
        heading: "Ethics and legality",
        body: [
          "Public does not mean consequence-free. Don't publish anyone's personal data (doxxing), don't use OSINT to harass or stalk, and respect the terms of the services you use. Scraping a site that prohibits it, or accessing data that requires authentication, crosses the line from open-source to unauthorized.",
          "The rule of thumb: if the information is published for the public to see, looking at it and analyzing it is research. The moment you have to bypass a lock, misrepresent yourself, or target a private individual, stop.",
        ],
      },
      {
        heading: "Practicing with WorldEye",
        body: [
          "WorldEye's free map is a practical OSINT sandbox: live flight tracking, 36,000+ public cameras, satellites, earthquakes, and weather are all viewable with no account. The OSINT toolkit — DNS/WHOIS lookups, nmap-style scans, and SSL analysis — runs right in your browser on the Pro tier.",
          "Start with a question, not a tool. Pick something small — where is that aircraft headed, what's the weather like at that webcam right now — and work it out from public data. That's OSINT.",
        ],
      },
    ],
  },
  {
    slug: "live-flight-tracking-guide",
    title: "How to Track Flights Live",
    date: "2026-10-10",
    excerpt:
      "Aircraft constantly broadcast their position, altitude, and speed over ADS-B. Here's how flight tracking works, what you can actually see, and how to watch the skies for free.",
    tags: ["aviation", "guide"],
    sections: [
      {
        heading: "How ADS-B makes it possible",
        body: [
          "Most aircraft carry an ADS-B transponder that broadcasts the plane's GPS position, altitude, speed, heading, and callsign roughly twice a second. These broadcasts are unencrypted and receivable by anyone with an inexpensive antenna — and networks of volunteers feed them into public tracking maps.",
          "That's why live flight tracking exists at all: the data is a byproduct of air-traffic safety, published openly by the aircraft themselves.",
        ],
      },
      {
        heading: "What you can actually see",
        body: [
          "A good tracker shows each aircraft's live position, altitude, ground speed, heading, aircraft type, registration, and origin/destination when known. You can filter by altitude or aircraft type, replay recent tracks, and click any plane for its details.",
          "Coverage is excellent over land in populated regions and thinner over oceans and remote areas, where fewer receivers (or satellite ADS-B) fill the gaps. Some military and sensitive flights don't broadcast or appear with limited data — that's normal.",
        ],
      },
      {
        heading: "Why people track flights",
        body: [
          "The most common reason is the most ordinary: waiting for someone at the airport. Live tracking beats the departure board — you can see the inbound aircraft's actual position and estimated arrival instead of a gate agent's guess.",
          "Aviation enthusiasts track interesting traffic — rare aircraft types, diversions, holding patterns during storms, and the daily rhythm of hubs. Researchers and journalists use the same data to follow logistics, from cargo routes to disaster-relief flights.",
        ],
      },
      {
        heading: "Track flights free on WorldEye",
        body: [
          "WorldEye's free map includes live flight tracking on the 3D globe: aircraft positions update in real time, and you can click any flight for its telemetry. No account, no signup — open the map and the sky is already there.",
          "Tip: zoom into a major hub and watch arrivals sequence themselves. Then cross-reference with a live airport webcam from the camera layer. Two public data sources, one picture — that's the OSINT habit in miniature.",
        ],
      },
    ],
  },
  {
    slug: "world-live-cameras",
    title: "36,000 Live Cameras: Watching the World in Real Time",
    date: "2026-10-10",
    excerpt:
      "Tens of thousands of public webcams — traffic, city squares, beaches, mountain passes — stream openly to anyone. Here's what's out there, what it's good for, and an honest note on availability.",
    tags: ["cameras"],
    sections: [
      {
        heading: "A planet-sized window",
        body: [
          "There are tens of thousands of publicly accessible live cameras worldwide: traffic cameras run by transport departments, city squares, harbors, ski resorts, beaches, and wildlife feeds. They exist to inform — about road conditions, crowds, weather — and they're open to everyone.",
          "WorldEye aggregates roughly 36,000 of these streams onto one map. Zoom anywhere and the camera layer shows you what's actually happening there right now.",
        ],
      },
      {
        heading: "What people use them for",
        body: [
          "Travel planning is the classic use: check the beach before you book, look at the mountain pass before you drive it, see the city square before your trip. Commuters check traffic cameras along their route; skiers check slope conditions at the lift.",
          "Then there's the quieter pleasure of it — watching a sunrise in another timezone, a harbor waking up, a plaza filling for an evening. The cameras turn the map from a diagram into a place.",
        ],
      },
      {
        heading: "An honest note on availability",
        body: [
          "These cameras are run by third parties — transport agencies, businesses, local governments — and they go offline. A camera that's dark today may be back tomorrow, or gone for good. Coverage also varies enormously by region: dense in North America and Europe, sparse elsewhere.",
          "When a stream won't load, it almost always means the source itself is down, not the map. The catalog refreshes as sources come and go, so the count shifts over time.",
        ],
      },
      {
        heading: "Free on WorldEye",
        body: [
          "The full camera layer is free for everyone on WorldEye — no account, no signup, no paywall. Open the map, enable cameras, and click any marker to watch.",
          "If you're curious about a place, there's no better first step than looking at it live.",
        ],
      },
    ],
  },
];

export function getPost(slug: string): BlogPost | undefined {
  return POSTS.find((p) => p.slug === slug);
}

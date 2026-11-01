// ── Partnership opportunities directory data (/partners) ───────────────
// These are openings WorldEye is ACTIVELY SEEKING — collaborations we
// want to form, described so a potential partner can recognise the fit.
// Nothing here is an existing partnership, customer or agreement, and no
// entry names a real organisation as a partner. The /partners page
// renders this array through a client-side search/filter; the category
// values match PARTNERSHIP_TYPES in src/lib/partners.ts so an interest
// click can preselect the application form's type field exactly.

export interface PartnershipOpportunity {
  title: string;
  /** A value from PARTNERSHIP_TYPES (src/lib/partners.ts). */
  category: string;
  description: string;
  /** How the collaboration could be structured — possibilities, never terms. */
  model: string;
}

export const OPPORTUNITIES: PartnershipOpportunity[] = [
  {
    title: "Live camera pages for travel and weather websites",
    category: "website-app-owners",
    description:
      "You run a travel, weather, local-guide or conditions site and want live visual content. Add pages or sections built on WorldEye's redistribution-eligible cameras — live views your readers can open, not static images.",
    model: "Embed integration; co-branded pages; revenue possibilities discussed per partnership",
  },
  {
    title: "City and local-guide camera features",
    category: "website-app-owners",
    description:
      "Local guides and city sites: feature live views of your landmarks, beaches, ski areas and neighbourhoods, with the cameras credited to their sources and linked back to the live globe.",
    model: "Co-branded features and embeds",
  },
  {
    title: "Live visual context inside your SaaS product",
    category: "saas-founders",
    description:
      "Dashboards, logistics tools, weather products, property platforms: give your users live visual context — a camera view next to the data they're already looking at — through the embed player or the public API.",
    model: "API / embed integration, terms discussed per product",
  },
  {
    title: "Bundled subscriptions and joint offers",
    category: "saas-founders",
    description:
      "Complementary products can explore bundling or joint offers for overlapping audiences. Nothing is pre-packaged — the structure, pricing treatment and promotion would be designed together.",
    model: "Bundling and cross-promotion, designed case by case",
  },
  {
    title: "Cross-linked OSINT and intelligence tools",
    category: "osint-platforms",
    description:
      "OSINT platforms and WorldEye look at the same world from different layers. Cross-linking live camera views with your analysis tools — and relevant tools from WorldEye where they genuinely help users — makes both more useful.",
    model: "Integration and reciprocal linking where it serves users",
  },
  {
    title: "List your camera network on the globe",
    category: "camera-networks",
    description:
      "Camera networks, agencies and DOT-style publishers: structured listing of your feeds on the WorldEye globe under your terms, with clear attribution and the redistribution rules you set — including no redistribution where you don't allow it.",
    model: "Data partnership under the operator's stated terms",
  },
  {
    title: "Harbour, airport, venue and resort camera operators",
    category: "camera-networks",
    description:
      "You operate public cameras people already love — a harbour, a scenic venue, a resort, a wildlife spot. A governed listing puts them in front of a global audience that comes to watch the world live.",
    model: "Listing with attribution; embed and co-branding options",
  },
  {
    title: "Weather and conditions data for camera pages",
    category: "data-providers",
    description:
      "Forecast, snow, marine, air-quality and conditions data make camera pages more useful. If your data would sit naturally next to a live view, we want to talk about an exchange or integration.",
    model: "Data exchange or licensing, scoped together",
  },
  {
    title: "Flight, marine and event data feeds",
    category: "data-providers",
    description:
      "WorldEye's trackers follow flights, ships, satellites and live events. Data providers with feeds that strengthen those layers — schedules, positions, event data — are invited to propose an integration.",
    model: "Feed integration; licensing or exchange",
  },
  {
    title: "Build on the WorldEye public API",
    category: "developers-oss",
    description:
      "The public API is live: self-serve keys, read-only access to the rights-cleared camera catalogue — metadata and snapshots/links, never restreaming other operators' video. Build an app, a tool, a research prototype — and tell us what you're making.",
    model: "API partnership and showcase possibilities",
  },
  {
    title: "Open-source components and data tooling",
    category: "developers-oss",
    description:
      "WorldEye grew out of an open-source intelligence platform. Developers and open-source projects working on maps, camera tooling, tracking or data quality can collaborate on components, formats and fixes that help the whole ecosystem.",
    model: "Open-source collaboration",
  },
  {
    title: "Live visual context for AI products",
    category: "ai-companies",
    description:
      "AI assistants and products that answer questions about places could ground those answers in what's actually visible right now — through rights-cleared camera metadata and snapshots via the API. Propose the use case; rights boundaries are explicit and non-negotiable.",
    model: "API integration within the rights registry's limits",
  },
  {
    title: "Research collaboration on live visual data",
    category: "ai-companies",
    description:
      "Computer-vision and ML teams: research questions around live public imagery — detection, quality, scene understanding — scoped strictly to what the rights registry clears and privacy law allows.",
    model: "Scoped research collaboration",
  },
  {
    title: "Live views for news and weather coverage",
    category: "media-publishers",
    description:
      "Newsrooms and weather publishers: embed live cameras in coverage of storms, eruptions, events and conditions — only where the source terms clear redistribution, always attributed.",
    model: "Embed licensing; Enterprise route for larger needs",
  },
  {
    title: "Event coverage camera walls",
    category: "media-publishers",
    description:
      "Marathons, parades, launches, festivals: a co-branded wall of live views around your event coverage, built from eligible cameras near the route or venue.",
    model: "Co-branded experience around your event",
  },
  {
    title: "Destination and resort showcases",
    category: "travel-tourism-ski",
    description:
      "Tourism boards, destinations and resorts: a branded live-view showcase of your place — your cameras and eligible nearby views — that you can embed and share, with WorldEye attribution.",
    model: "Co-branded showcase; white-label pilot route for deeper branding",
  },
  {
    title: "Ski-area conditions partnerships",
    category: "travel-tourism-ski",
    description:
      "Ski areas and mountain destinations: live mountain views next to conditions content, resort pages that visitors check before they drive up, and co-marketing to an audience that watches ski cameras all winter.",
    model: "Content, embed and co-marketing collaboration",
  },
  {
    title: "Creator features and community collaborations",
    category: "creators-communities",
    description:
      "Creators and communities who show their audiences the world — geography, weather, aviation, cameras, OSINT: collaborate on features, live sessions and content built around live views. (Paid promotion runs through the affiliate program — this route is for building things together.)",
    model: "Co-created content and features",
  },
  {
    title: "Original data studies and linkable research",
    category: "seo-publishers",
    description:
      "Publishers who build content on real data: the camera network generates genuine research material — coverage studies, event viewership of public events, network growth. Propose a study and we can explore producing it together, with methodology published.",
    model: "Content collaboration with published methodology",
  },
  {
    title: "Agency client campaigns with live visuals",
    category: "marketing-agencies",
    description:
      "Agencies: live camera content, co-branded experiences and WorldEye placements for client campaigns in travel, weather, events and place marketing — built on eligible cameras and honest claims.",
    model: "Agency partnership, scoped per client",
  },
  {
    title: "Situational-awareness and platform pilots",
    category: "enterprise-gov",
    description:
      "Enterprise and public-sector technology teams evaluating visual context for operations: start with a scoped pilot on the Enterprise feed/embed platform — rights-cleared cameras only, terms and security reviewed up front.",
    model: "Scoped pilot via the Enterprise route",
  },
  {
    title: "Classroom and research access",
    category: "education-research",
    description:
      "Educators and researchers use live views for geography, weather, earth science and media literacy. Tell us about your programme — research and education access routes already exist and this team can help you find the right one.",
    model: "Research/education access; collaboration on materials",
  },
  {
    title: "Strategic guidance and introductions",
    category: "investors-advisors",
    description:
      "Investors and advisors who know this space — live data, geospatial, OSINT, creator distribution: if you can open the right doors or sharpen the strategy, a conversation is welcome. This is an invitation to talk, not a fundraising announcement.",
    model: "Advisory conversation",
  },
  {
    title: "Your idea, if it doesn't fit a box",
    category: "startups-entrepreneurs",
    description:
      "Startups and independent builders: if a collaboration with a live global camera network makes sense and none of the other openings describe it, propose it anyway. The best partnerships usually start as an idea somebody just sent in.",
    model: "Open call — structure designed together",
  },
];

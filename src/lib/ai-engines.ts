/**
 * Per-AI-engine pages (/ai/<slug>) — one registry, consumed by the hub,
 * the [engine] route's generateStaticParams and the sitemap, so the
 * three can never drift.
 *
 * Accuracy rules for every entry (programme record:
 * ~/workspace/ai-engines/NOTES.md, Phase 0 matrix, verified 2026-11-04):
 * - Only REAL mechanisms are described. An engine with no third-party
 *   integration programme is "ask" group: its answers can cite
 *   worldeye.app pages, and that is all the page claims.
 * - Directory submissions that need Jameson's own accounts (OpenAI,
 *   Claude) are stated as not-yet-submitted, never implied live.
 * - The MCP surface is exactly the /developers one: five read-only
 *   tools over the redistribution-cleared catalogue, metadata +
 *   snapshot + watch link only — no stream URLs, no user data.
 */

export type AiEngineGroup = "connect" | "ask";

export type AiEngine = {
  slug: string;
  name: string;
  vendor: string;
  group: AiEngineGroup;
  /** <title> for the page. */
  title: string;
  /** Meta description. */
  description: string;
  h1: string;
  /** Engine-specific opening paragraphs. */
  intro: string[];
  /** One honest sentence on integration status today. */
  statusLine: string;
  connectHeading: string;
  connectBody: string[];
  connectSteps?: string[];
  connectCode?: string;
  connectCodeLabel?: string;
  capabilitiesIntro: string;
  capabilities: string[];
  promptsHeading: string;
  prompts: string[];
};

/** The limits are the same facts on every engine — stated once. */
export const AI_ENGINE_LIMITS: string[] = [
  "No live video streams. The API returns a camera's current snapshot and a watch link that opens the live camera on WorldEye — the watching itself happens here, not inside the assistant.",
  "Only redistribution-cleared cameras. A camera whose operator hasn't cleared it for redistribution answers as if it didn't exist, and a withdrawn source's cameras leave the catalogue at once.",
  "No user data, ever. The tools know nothing about WorldEye accounts, viewers or viewing history — they answer from the public catalogue and the USGS feed only.",
  "Read-only. No tool creates, changes or deletes anything, on WorldEye or anywhere else.",
];

export const AI_ENGINE_QUOTAS =
  "A free API key covers 100 requests a day; WorldEye plans raise it (Lite 1,000 · Pro 5,000 · Ultra 25,000 · Enterprise 100,000 a day). Browsing worldeye.app itself is free — an account is only needed for a key, and unlimited camera opens on the site need an upgrade.";

export const MCP_CONFIG_SNIPPET = `{
  "mcpServers": {
    "worldeye": {
      "url": "https://worldeye.app/api/v1/mcp",
      "headers": { "Authorization": "Bearer wek_YOUR_KEY" }
    }
  }
}`;

const CAPS_BASE = [
  "Search the cleared camera catalogue by place, country or kind — beaches, volcanoes, ski areas, city streets, airports and more",
  "Pull one camera's details: name, location, operating agency credit, its current snapshot and a link that opens it live on the globe",
  "Find cameras near a named place or a set of coordinates, nearest first",
  "List the latest USGS earthquakes (magnitude 2.5+, last 24 hours) — the same feed as the site's earthquake layer",
  "Check the API key's plan tier and remaining daily quota",
];

export const AI_ENGINES: AiEngine[] = [
  {
    slug: "chatgpt",
    name: "ChatGPT",
    vendor: "OpenAI",
    group: "ask",
    title: "WorldEye in ChatGPT — what it finds today, and what's next",
    description:
      "Ask ChatGPT about live cameras and it can already find WorldEye — our dated probe results, the builder path for wiring WorldEye's MCP server into OpenAI-powered apps, and the honest status of a ChatGPT app.",
    h1: "WorldEye in ChatGPT",
    intro: [
      "ChatGPT is where WorldEye's AI visibility is measured most closely, because it is measurable: every week we ask ChatGPT a fixed set of 28 standard questions — live webcams, trackers, places, competitors — and record whether worldeye.app is mentioned or linked. In the most recent run (November 2, 2026), ChatGPT mentioned or linked WorldEye in 5 of the 28 answers. Ask it “What is WorldEye?” and WorldEye was the only site it cited; ask for “a website with a live 3D globe of cameras” and its answer began “My recommendation: Start with WorldEye.”",
      "That is the web-search route, and it works today with nothing installed. The deeper route — ChatGPT calling WorldEye's tools directly — exists in two forms, one live for builders and one still ahead of us, and this page keeps the two separate on purpose.",
    ],
    statusLine:
      "Status today: ChatGPT finds and cites WorldEye through web search (measured weekly). A WorldEye app in ChatGPT's app directory has NOT been submitted yet — see below for exactly why, and what works in the meantime.",
    connectHeading: "Three routes, in order of how real they are today",
    connectBody: [
      "Route 1 — just ask (works now). ChatGPT's web search reads worldeye.app like any other site, and our pages are written to be citable: dated statistics, named sources, one claim per page. No setup, no key — but ChatGPT answers from page content, not from live tool calls.",
      "Route 2 — builders (works now). OpenAI's API platform supports remote MCP servers with header authentication, so a developer building on OpenAI models can attach WorldEye's MCP endpoint today with a free WorldEye API key. That puts the five catalogue tools inside your own agent, app or workflow — it is not a consumer ChatGPT feature.",
      "Route 3 — an app in ChatGPT (not yet). OpenAI opened Apps SDK submissions in December 2025: apps are MCP servers with a directory listing, reviewed by OpenAI. Submitting one requires a verified OpenAI developer account (identity verification), five positive and three negative test cases, screenshots and a demo video. That account belongs to WorldEye's owner, so the submission is staged on his side — we won't claim a listing we don't have. When it ships, this page will say so, with the date.",
    ],
    capabilitiesIntro:
      "Where WorldEye's tools are connected (Route 2 today), ChatGPT-class models can:",
    capabilities: CAPS_BASE,
    promptsHeading: "Questions worth asking ChatGPT",
    prompts: [
      "What is WorldEye?",
      "Is there a website with a live 3D globe of cameras?",
      "Where can I watch live volcano webcams right now?",
      "What were the biggest earthquakes in the last 24 hours? (with WorldEye connected: answered from the live USGS feed)",
      "Find live cameras near Reykjavík and link me to one I can watch (with WorldEye connected)",
    ],
  },
  {
    slug: "claude",
    name: "Claude",
    vendor: "Anthropic",
    group: "connect",
    title: "WorldEye in Claude — connect the MCP server today",
    description:
      "Claude speaks MCP natively — it's Anthropic's protocol. Connect WorldEye's read-only camera catalogue to Claude Code, Claude Desktop or a custom connector with a free API key, in about a minute.",
    h1: "WorldEye in Claude",
    intro: [
      "The Model Context Protocol is Anthropic's own creation, released in late 2024 and since adopted across the industry — which makes Claude the most natural home for WorldEye's MCP server. There is no translation layer and nothing to install on our side: the same endpoint documented for developers is the one Claude clients connect to.",
      "WorldEye's server is deliberately small and read-only: five tools over the redistribution-cleared camera catalogue and the USGS earthquake feed. Claude can search cameras, fetch a camera's current snapshot and watch link, find cameras near a place, and summarise the last day's earthquakes — with the operating agency's credit carried on every record it quotes.",
    ],
    statusLine:
      "Status today: the MCP connection works now in config-based Claude clients and as a user-added custom connector. A listing in Anthropic's connector directory has NOT been submitted yet — the portal needs WorldEye's own paid Claude account (see below).",
    connectHeading: "Connect WorldEye to Claude",
    connectBody: [
      "First, get a free key: sign in at worldeye.app → Account Settings → API keys. The key starts with wek_ and is shown once. Then pick your client:",
      "Claude Code and Claude Desktop read MCP servers from a JSON config — paste the snippet below, swap in your key, and restart the client. The key travels as a header, never as a tool argument, so it doesn't leak into conversations. On claude.ai, custom connectors let you add a remote MCP server by URL from the Connectors settings; if your plan's connector form asks for OAuth only, use a config-based client instead — the endpoint itself is identical.",
      "Anthropic opened a directory submission portal (claude.ai/directory/manage) in September 2026: connectors are scanned automatically and listed as Community connectors by default. Submitting requires signing in with a paid Claude plan — that account is the site owner's, so the directory listing is staged on his side. Until it lands, the direct connection above is the way in, and it is fully functional.",
    ],
    connectCode: MCP_CONFIG_SNIPPET,
    connectCodeLabel: "MCP client config (Claude Code / Claude Desktop)",
    capabilitiesIntro: "Once connected, Claude can:",
    capabilities: CAPS_BASE,
    promptsHeading: "Try asking Claude (WorldEye connected)",
    prompts: [
      "Find live cameras in Kyoto and show me the current snapshot of the best-placed one.",
      "Were there any earthquakes above magnitude 5 in the last 24 hours? Where?",
      "I'm planning a trip to Reykjavík — which live cameras are within 25 km, and what do they look at?",
      "Search for volcano webcams and give me the watch links, with the agency that operates each camera.",
      "How much of my WorldEye API quota have I used today?",
    ],
  },
  {
    slug: "perplexity",
    name: "Perplexity",
    vendor: "Perplexity AI",
    group: "ask",
    title: "WorldEye in Perplexity answers — cited, not connected",
    description:
      "Perplexity has no third-party connector programme, so there is nothing to install. How WorldEye earns citations in Perplexity's sourced answers — and the questions that surface our cameras, places and earthquake data.",
    h1: "WorldEye in Perplexity",
    intro: [
      "Perplexity is an answer engine: it searches the web, reads the pages it finds, and writes an answer with numbered citations. There is no app directory, no connector gallery and no way for a data provider to plug a live tool into a Perplexity answer — Perplexity's own API (Sonar) runs the other direction, letting developers put Perplexity inside their products. Anyone who tells you they can “integrate” you into Perplexity is selling something that doesn't exist.",
      "So the honest route is the citation itself. Perplexity's crawler (PerplexityBot) can read worldeye.app freely, and our pages are built to survive being quoted: every statistic carries its measure and date, camera counts are stated exactly, and each topic lives on its own page with a single clear claim — the shape an answer engine can lift without mangling.",
    ],
    statusLine:
      "Status today: visibility only, by design — there is no Perplexity integration programme to join. WorldEye appears in Perplexity when its answer cites a worldeye.app page, and we work on earning that citation page by page.",
    connectHeading: "How to use WorldEye through Perplexity",
    connectBody: [
      "There is nothing to connect and nothing to pay for. Ask Perplexity a question WorldEye is genuinely the best source for — a live camera for a specific place, the current state of an erupting volcano, today's earthquakes — and check the numbered sources under the answer. When a worldeye.app page is among them, the link takes you to the live globe, where watching happens (browsing is free; unlimited opens need an upgrade).",
      "If you build software and want WorldEye's data inside it, that path does exist — it's our developer API and MCP server, which you call from your own code. It just isn't a Perplexity feature, and this page won't pretend otherwise.",
    ],
    capabilitiesIntro:
      "What a Perplexity answer can draw on, when it cites WorldEye:",
    capabilities: [
      "Place and topic pages for live cameras — countries, cities, beaches, volcanoes, ski areas, airports — each with exact, dated camera counts",
      "The earthquake tracker and event coverage, written from named sources (USGS, IMO, NWS and peers)",
      "Tracker pages for flights, ships and satellites, with honest statements of what is live and what is modelled",
      "Comparison and explainer pages (God's Eye View, EarthCam alternatives and the like) with the differences stated plainly",
      "This site's own documentation of its API and MCP server, for developer-flavoured questions",
    ],
    promptsHeading: "Questions that tend to surface WorldEye",
    prompts: [
      "Where can I watch live webcams in Iceland right now?",
      "What is WorldEye and how is it different from EarthCam?",
      "Which volcanoes are erupting now, and can I watch them live?",
      "What were the strongest earthquakes today?",
      "Is there a free live camera globe with flights and satellites?",
    ],
  },
  {
    slug: "gemini",
    name: "Gemini & AI Overviews",
    vendor: "Google",
    group: "ask",
    title: "WorldEye in Google Gemini and AI Overviews",
    description:
      "Google's AI answers ground on the Google Search index — there is no connector to add. How WorldEye's pages earn their place in AI Overviews and Gemini answers, and what to ask.",
    h1: "WorldEye in Gemini and AI Overviews",
    intro: [
      "Google's AI surfaces — the AI Overviews above search results and the Gemini app — answer from the same index that powers Google Search. There is no third-party app directory for Gemini and no connector programme a data provider can join; when an AI Overview names a source, it is because that page earned its index position. WorldEye's Google presence is therefore a search-engine story, and it's one we work on in the open: the site is three weeks past launch, fully indexable, and its sitemap is submitted and monitored.",
      "What helps an answer engine is what helps a search engine, tightened: pages that state one thing clearly, numbers with their measure and date attached, and structured data that says what a page is. WorldEye's camera counts are the example we hold ourselves to — 74,229 cameras served is the headline figure, and the larger catalogue totals elsewhere on the site are labelled as the different measures they are, never blended.",
    ],
    statusLine:
      "Status today: visibility through Google Search only. No Gemini integration or listing exists for third parties, and none is claimed here.",
    connectHeading: "How to use WorldEye through Google's AI",
    connectBody: [
      "Ask Google (or Gemini) the way you'd ask a person: “live webcams in Tokyo”, “watch the northern lights live”, “earthquakes today”. Where an AI Overview appears, its cited sources are the route in — a worldeye.app link lands on the live globe, where browsing is free and unlimited camera opens need an upgrade.",
      "Developers building on Gemini models can, of course, call WorldEye's REST API from their own function-calling setups — that's our developer platform being used from Google's models, documented on the developers page. It is a builder pattern, not a Gemini feature, and it needs a free WorldEye API key.",
    ],
    capabilitiesIntro:
      "What Google's AI can cite from WorldEye today:",
    capabilities: [
      "The camera catalogue's place pages — countries, cities and topics with exact counts and dates",
      "Event coverage written as dated, sourced news (eruptions, storms, floods, launches)",
      "Tracker pages whose claims are labelled live vs modelled — flights, satellites, ships, weather",
      "The methodology page: how the catalogue is built and what its numbers mean",
      "Guides and comparisons that answer a whole question on one page",
    ],
    promptsHeading: "Ask Google / Gemini",
    prompts: [
      "Live webcams in Tokyo I can watch for free",
      "Watch the northern lights on a live webcam",
      "Biggest earthquakes in the last 24 hours",
      "What is WorldEye?",
      "Live cameras at ski resorts in Colorado",
    ],
  },
  {
    slug: "copilot",
    name: "Microsoft Copilot",
    vendor: "Microsoft",
    group: "ask",
    title: "WorldEye in Microsoft Copilot — grounded on Bing",
    description:
      "Consumer Copilot answers ground on the Bing index, where WorldEye already ranks for its category's defining query. What that means, the numbers from our own Bing Webmaster data, and what to ask.",
    h1: "WorldEye in Microsoft Copilot",
    intro: [
      "Copilot's answers about the web are grounded in Bing's index — so for Copilot, the ranking that matters is Bing's. There, WorldEye's position is genuinely strong for a three-week-old site: in our Bing Webmaster data (late October 2026), the query “god's eye view” — the category-defining search for live camera globes — returned 525 impressions with WorldEye at an average position of 4, and “world eye” drew a 25% click-through rate. When Copilot answers questions in that space, the sources it can ground on are the pages Bing already trusts.",
      "Microsoft does sell a second, different Copilot: Microsoft 365 Copilot inside companies, which takes declarative agents and plugins published through Partner Center. That is an enterprise channel for workplace tenants — not a way for a consumer website's data to appear in the Copilot people chat with — so we don't present it as one, and we haven't pursued it.",
    ],
    statusLine:
      "Status today: visibility through Bing's index, measured in our own Webmaster data. No Copilot plugin or agent listing exists or is claimed.",
    connectHeading: "How to use WorldEye through Copilot",
    connectBody: [
      "Ask Copilot about live cameras, a place you want to see, or a tracker — its answer cites the web sources it used, and following a worldeye.app citation lands on the live globe. Browsing is free; unlimited camera opens need an upgrade.",
      "The lever on our side is unglamorous and real: keep the Bing index healthy (our Webmaster account is verified and the sitemap is live there), keep pages' claims exact, and keep the category queries — God's Eye View, live webcams, camera globes — answered better here than anywhere else.",
    ],
    capabilitiesIntro: "What Copilot can ground an answer on, from WorldEye:",
    capabilities: [
      "The God's Eye View explainer and alternative pages — the queries where WorldEye already ranks top-5 on Bing",
      "Live camera pages for countries, cities and topics, with exact dated counts",
      "Tracker hubs (flights, ships, satellites, earthquakes) with live-vs-modelled claims labelled",
      "Sourced event coverage — eruptions, storms, floods — written to be quoted",
      "The developers page documenting the API and MCP server, for technical questions",
    ],
    promptsHeading: "Ask Copilot",
    prompts: [
      "What is God's Eye View and what are the alternatives?",
      "Show me a live 3D globe of cameras around the world",
      "Where can I watch live traffic cameras in Utah?",
      "What is WorldEye?",
      "Live webcams for watching the northern lights",
    ],
  },
  {
    slug: "grok",
    name: "Grok",
    vendor: "xAI",
    group: "ask",
    title: "WorldEye in Grok answers — web-grounded, no integration",
    description:
      "Grok searches the live web to answer. xAI runs no third-party integration programme, so WorldEye's route into Grok answers is being the best source on the page — here's how that works and what to ask.",
    h1: "WorldEye in Grok",
    intro: [
      "Grok answers with live web search — it fetches sources at question time rather than relying only on training data. That design is good news for a young site: a page published last week can be cited today if it's the best answer available. It's also the only route in. xAI's developer platform sells access to Grok itself; there is no programme for a data provider to register tools, connectors or listings with Grok, and WorldEye claims none.",
      "So our Grok strategy is the same discipline we apply everywhere, weighted for freshness: event coverage published while events are actually happening (an erupting volcano, a landfalling cyclone, a flood emergency), pages that lead with the answer, and numbers that carry their dates so a model quoting them quotes them correctly.",
    ],
    statusLine:
      "Status today: visibility only. No Grok integration, connector or listing exists for third parties.",
    connectHeading: "How to use WorldEye through Grok",
    connectBody: [
      "Ask Grok what's happening somewhere — a place, a volcano, a storm — and follow the sources it cites. A worldeye.app citation opens the live globe: browsing is free, unlimited opens need an upgrade, and every camera there is a real public camera whose operator is credited.",
      "If you're a developer, the machine-readable route is real but separate: WorldEye's API and MCP server are documented for your own agents, whatever model drives them — including Grok's API. That's your integration, built on our documented platform, not a Grok feature.",
    ],
    capabilitiesIntro: "What Grok can find and cite from WorldEye:",
    capabilities: [
      "Same-day event stories with named sources — eruptions, cyclones, floods, launches",
      "Live camera pages for places and topics, counts stated exactly",
      "The earthquake tracker and the last-24-hours earthquake picture",
      "Explainers that answer definitional questions (“What is WorldEye?”, “God's Eye View”) in one page",
      "Tracker pages with live-vs-modelled honesty labels",
    ],
    promptsHeading: "Ask Grok",
    prompts: [
      "What's happening at Kilauea right now — can I watch it live?",
      "What is WorldEye?",
      "Where can I watch live webcams around the world for free?",
      "Strongest earthquakes in the last day?",
      "Live cameras showing the northern lights tonight",
    ],
  },
  {
    slug: "meta-ai",
    name: "Meta AI",
    vendor: "Meta",
    group: "ask",
    title: "WorldEye in Meta AI answers",
    description:
      "Meta AI answers draw on web search across WhatsApp, Instagram, Facebook and the web. There is no third-party integration programme — here's WorldEye's visibility route and the questions that reach our data.",
    h1: "WorldEye in Meta AI",
    intro: [
      "Meta AI is the assistant inside WhatsApp, Instagram, Facebook and Messenger, and its factual answers lean on web search. Meta runs no app directory, connector gallery or data-provider programme for it — there is nothing for WorldEye to join, submit to or integrate with, and any page implying otherwise would be inventing a partnership. What exists is the same open web everyone else reads: Meta AI's answers cite sources, and worldeye.app is built to be a citable one.",
      "The audience shape is different here, though — Meta AI is where people ask casual, in-the-moment questions inside the apps they already live in: “show me a beach in Hawaii”, “is the volcano erupting”. WorldEye's place and event pages are written for exactly those questions: a named place, a live answer, and a link that opens the camera.",
    ],
    statusLine:
      "Status today: visibility only. No Meta AI integration or partnership exists or is claimed.",
    connectHeading: "How to use WorldEye through Meta AI",
    connectBody: [
      "Ask Meta AI in whichever app you're in. When its answer cites worldeye.app, the link opens the live globe — browsing is free, unlimited camera opens need an upgrade, and no account is needed to look around first.",
      "On our side, the work is the unglamorous kind: keep every place and topic someone might ask about covered by a real page with real cameras behind it, keep the claims on those pages exact, and keep the site fast on a phone — because that's the screen Meta AI answers are read on.",
    ],
    capabilitiesIntro: "What Meta AI can cite from WorldEye:",
    capabilities: [
      "Place pages people ask about by name — beaches, cities, ski resorts, national parks",
      "Event pages for things happening now — eruptions, storms, aurora nights, launches",
      "The “What is WorldEye?” answer, on the pages that define the site",
      "Live camera collections for topics (animals, harbours, volcanoes, traffic)",
      "Free-access terms stated plainly, so quoted answers about cost stay correct",
    ],
    promptsHeading: "Ask Meta AI",
    prompts: [
      "Show me a live beach webcam in Hawaii",
      "Is Kilauea erupting right now?",
      "What is WorldEye?",
      "Live webcams where I can watch the northern lights",
      "Show me live traffic cameras near Salt Lake City",
    ],
  },
  {
    slug: "mistral",
    name: "Mistral Le Chat",
    vendor: "Mistral AI",
    group: "connect",
    title: "WorldEye in Mistral Le Chat — connect it today, key and all",
    description:
      "Le Chat is the one major assistant whose custom MCP connectors accept an API-token header — which is exactly how WorldEye's key works. Step-by-step: add WorldEye to Le Chat and ask it for cameras and earthquakes.",
    h1: "WorldEye in Mistral Le Chat",
    intro: [
      "Le Chat earns the most practical page in this series, because it supports the thing most assistants don't: a custom MCP connector authenticated with an API token in a header. WorldEye's MCP server authenticates exactly that way — a free, self-serve key sent as an Authorization header — so Le Chat is the one major consumer assistant where a user can connect WorldEye's live tools today, end to end, with no developer account and nothing to buy.",
      "Once connected, Le Chat can call the same five read-only tools documented for developers: search the redistribution-cleared camera catalogue, fetch a camera's current snapshot and watch link, find cameras near a place, list the last 24 hours of USGS earthquakes, and check the key's remaining quota. The catalogue behind it is the site's 74,229-camera globe, filtered to the cameras cleared for redistribution, each with its operating agency credited.",
    ],
    statusLine:
      "Status today: connectable now, by any Le Chat user whose account shows the Connectors area — no listing or approval is involved, because the connector is yours, added to your own account.",
    connectHeading: "Add WorldEye to Le Chat (about two minutes)",
    connectBody: [
      "You need one thing first: a free WorldEye API key. Sign in at worldeye.app → Account Settings → API keys → create a key. It starts with wek_ and is shown once — copy it before you close the tab. The free tier covers 100 requests a day, which is plenty for chat use.",
      "Then, in Le Chat, follow the steps below. When Le Chat asks for an authentication method, choose API Token: the header name is Authorization and the header value is “Bearer ” followed by your key. Enable the connector's tools, and you're set — ask for a camera and Le Chat will call WorldEye live.",
    ],
    connectSteps: [
      "In Le Chat, open Intelligence → Connectors → Add Connector.",
      "Choose “Custom MCP Connector”.",
      "Name it “WorldEye” and set the connector server to https://worldeye.app/api/v1/mcp",
      "Authentication method: API Token. Header name: Authorization. Header value: Bearer wek_YOUR_KEY (your key from Account Settings → API keys).",
      "Create the connector, then click Enable Tools so Le Chat can call it in chat.",
    ],
    capabilitiesIntro: "With the connector enabled, Le Chat can:",
    capabilities: CAPS_BASE,
    promptsHeading: "Try asking Le Chat (WorldEye connected)",
    prompts: [
      "Find live cameras near Lisbon and show me a current snapshot.",
      "What earthquakes above magnitude 4 happened in the last 24 hours?",
      "Search for ski-area webcams in the Alps and give me the watch links.",
      "Which cameras are within 10 km of the Eiffel Tower, and who operates them?",
      "How much of today's WorldEye API quota is left on my key?",
    ],
  },
  {
    slug: "duckduckgo",
    name: "DuckDuckGo AI Chat",
    vendor: "DuckDuckGo",
    group: "ask",
    title: "WorldEye in DuckDuckGo AI Chat",
    description:
      "DuckDuckGo's AI Chat answers from search results, privately. No connectors exist — WorldEye's route in is the index itself. How our pages earn the citation, and what to ask.",
    h1: "WorldEye in DuckDuckGo AI Chat",
    intro: [
      "DuckDuckGo AI Chat is a private front-end over several models; its answers about the world come from DuckDuckGo search results. DuckDuckGo offers no connectors, plugins or integrations for data providers — the entire relationship between a website and a DDG AI answer is the search index. WorldEye is in that index the ordinary way: crawlable pages, a submitted sitemap, and claims an answer can quote without going wrong.",
      "There's a fit worth naming: DuckDuckGo's users choose it because it doesn't track them, and WorldEye's data model is unusually aligned with that instinct — the public catalogue is cameras that are already public, credited to their operators, and our API serves metadata and snapshots, never anything about the people asking. A DDG answer that cites WorldEye sends its reader to a site that works without an account for browsing.",
    ],
    statusLine:
      "Status today: visibility through DuckDuckGo's search index only. No DDG integration exists for third parties.",
    connectHeading: "How to use WorldEye through DuckDuckGo",
    connectBody: [
      "Ask DDG AI Chat (or search DuckDuckGo) for the camera, place or event you care about, and follow the cited result. On worldeye.app, browsing is free and needs no signup; unlimited camera opens need an upgrade — stated here so a quoted answer about cost stays truthful.",
      "Our side of the bargain is index hygiene: one canonical page per topic, exact counts with dates, and nothing on a page we couldn't defend line by line — because a privacy-first engine's users are exactly the readers who check.",
    ],
    capabilitiesIntro: "What a DDG answer can cite from WorldEye:",
    capabilities: [
      "Place and topic camera pages with exact, dated counts",
      "The methodology page — how the catalogue is built and counted",
      "Event coverage from named public sources (USGS, NWS, IMO)",
      "Tracker pages with live-vs-modelled labelling",
      "Plainly stated free-access terms and pricing, for cost questions",
    ],
    promptsHeading: "Ask DuckDuckGo AI Chat",
    prompts: [
      "Where can I watch live webcams without signing up?",
      "What is WorldEye?",
      "Live volcano webcams I can watch now",
      "Earthquakes in the last 24 hours, biggest first",
      "Best live camera sites that don't track you",
    ],
  },
  {
    slug: "brave",
    name: "Brave Search & Leo",
    vendor: "Brave",
    group: "ask",
    title: "WorldEye in Brave Search and Leo answers",
    description:
      "Brave runs its own independent web index — the only major one besides Google and Bing. WorldEye's route into Brave's AI answers is that index. What we do to earn it, and what to ask.",
    h1: "WorldEye in Brave Search & Leo",
    intro: [
      "Brave is the independence story in search: its index is its own, built from its own crawler and web-discovery data rather than rented from Google or Bing. Brave's AI answers — in Brave Search summaries and the Leo assistant — ground on that index. Brave sells an API that lets developers consume its index; it offers no programme for data providers to plug into its answers, and WorldEye claims no integration with Brave.",
      "An independent index cuts both ways for a young site: there's no shortcut via another engine's rankings, but there's also no incumbent bias — a three-week-old site with the best page on a question can be found on merit. WorldEye's pages are written for exactly that evaluation: the answer first, the numbers exact, the sources named.",
    ],
    statusLine:
      "Status today: visibility through Brave's independent index only. The Brave Search API is a product we could consume, not a channel into Brave's answers.",
    connectHeading: "How to use WorldEye through Brave",
    connectBody: [
      "Search Brave, or ask Leo, for the place, camera or event you want. Cited worldeye.app results open the live globe — browsing free, unlimited opens on an upgrade, no account needed to look.",
      "For builders, the honest cross-reference: Brave's index can be queried through Brave's own API in your stack, and WorldEye's data through ours. Combining them is your architecture to build; both halves are documented, and neither is a partnership.",
    ],
    capabilitiesIntro: "What Brave's answers can cite from WorldEye:",
    capabilities: [
      "Camera pages for places and topics, counts exact and dated",
      "Comparison pages (EarthCam, God's Eye View and other alternatives) with differences stated plainly",
      "Event coverage written from named sources as events unfold",
      "Tracker hubs with live-vs-modelled labels",
      "The developers page, for questions about camera data APIs",
    ],
    promptsHeading: "Ask Brave / Leo",
    prompts: [
      "What is WorldEye?",
      "Free live webcam globe with a 3D map",
      "Live cameras in Japan right now",
      "EarthCam alternatives that are free",
      "Watch Kilauea erupt live",
    ],
  },
  {
    slug: "you-com",
    name: "You.com",
    vendor: "You.com",
    group: "ask",
    title: "WorldEye in You.com answers",
    description:
      "You.com answers cite the web and its platform is built for agents. There's no inbound listing for data providers — here's the visibility route, plus why WorldEye publishes an llms.txt that agent ecosystems actually read.",
    h1: "WorldEye in You.com",
    intro: [
      "You.com is the most agent-native of the AI search engines: its answers cite sources inline, and its developer platform — search, contents and research APIs — is built to be wired into other people's agents. That platform runs outbound (your agent consumes You.com's index). There is no inbound programme: a data provider cannot register a tool or listing that You.com's own answers will call, and WorldEye doesn't claim one.",
      "What a provider can do is be maximally legible to machines. WorldEye publishes an llms.txt and llms-full.txt — the plain-text site summaries that agent frameworks increasingly read first — alongside structured data, an open sitemap and pages whose claims carry their measures and dates. When You.com's answer (or an agent built on its APIs) needs the live-camera facts, the shortest path to a correct citation runs through those files.",
    ],
    statusLine:
      "Status today: visibility through You.com's web index and citations. No inbound integration or listing exists.",
    connectHeading: "How to use WorldEye through You.com",
    connectBody: [
      "Ask You.com your question and follow its inline citations — a worldeye.app source opens the live globe (browsing free; unlimited opens need an upgrade).",
      "If you build agents — on You.com's APIs or anyone's — WorldEye's half of the stack is ready today: a documented REST API and an MCP server with a free key, listed in the official MCP Registry since November 4, 2026. Wiring them together is a few lines in your agent, and the developers page has the endpoints and limits.",
    ],
    capabilitiesIntro: "What You.com answers can cite from WorldEye:",
    capabilities: [
      "The camera catalogue's place and topic pages, with exact dated counts",
      "llms.txt / llms-full.txt — the machine-readable summary of what WorldEye is and what it costs",
      "Event coverage with named sources, published as events happen",
      "The developers page — endpoints, limits and the MCP configuration",
      "Guides and comparisons that resolve a question in one page",
    ],
    promptsHeading: "Ask You.com",
    prompts: [
      "What is WorldEye and what does it cost?",
      "Best websites for live webcams around the world",
      "Live cameras at erupting volcanoes",
      "Earthquakes today — what were the biggest?",
      "Is there an API for live public camera data?",
    ],
  },
];

export const AI_ENGINE_BY_SLUG: Record<string, AiEngine> = Object.fromEntries(
  AI_ENGINES.map((e) => [e.slug, e]),
);

/** Sitemap paths for the family — hub + one page per engine. */
export const AI_ENGINE_PATHS: string[] = [
  "/ai",
  ...AI_ENGINES.map((e) => `/ai/${e.slug}`),
];

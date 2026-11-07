export type CountryFaq = { q: string; a: string };

export type CountryContent = {
  intro: string[]; // 5 substantial paragraphs
  blurb: string; // meta description, 140-160 chars, unique per country
  faqs: CountryFaq[]; // 6-7
};

export const countryContentD: Record<string, CountryContent> = {
  taiwan: {
    intro: [
      "Taiwan packs 3,243 live cameras into a compact island, and Taichung is the standout with 219 feeds - more than Taipei's 194 or Taoyuan's 142. A further 1,518 sit under a general Taiwan listing, with Yunlin and Tainan adding regional depth.",
      "These are working street cameras, not tourist views. Feeds labeled like Taichung city roads sit at intersections - Taiyuan Road, Zhongqing Road, Minquan Road - showing live vehicle flow in both directions.",
      "For anyone navigating a Taiwanese city, that is genuinely useful: check congestion before you leave, free on WorldEye, any time of day.",
      "The 1,518 feeds under the general Taiwan listing are worth knowing about: they are the long tail of the network beyond the big three cities. If you are in Yunlin or Tainan, start there rather than assuming your area is uncovered.",
      "The bilingual labels are genuinely helpful — a feed reading Taiyuan Road and East Huanzhong Road tells you the exact junction in both Chinese and English. Match the label to your route and you are watching the right intersection, not guessing.",
    ],
    blurb:
      "Watch 3,243 live cameras across Taiwan on WorldEye - intersection and road feeds from Taichung, Taipei, and Taoyuan, streaming free around the clock.",
    faqs: [
      {
        q: "How many live cameras are there in Taiwan?",
        a: "WorldEye lists 3,243 live cameras across 6 areas in Taiwan, making it one of the densest camera networks in Asia.",
      },
      {
        q: "Which Taiwanese cities have the most cameras?",
        a: "Taichung leads with 219 feeds, ahead of Taipei (194) and Taoyuan (142). Another 1,518 feeds sit under a general Taiwan listing, with Yunlin and Tainan adding coverage.",
      },
      {
        q: "What do the Taiwanese camera names mean?",
        a: "Most are labeled as city road cameras with the intersection in both Chinese and English - for example, a Taichung feed might read Taiyuan Road and East Huanzhong Road - so you can tell exactly which junction you are watching.",
      },
      {
        q: "I am not in Taipei — will I find cameras near me?",
        a: "Probably. Beyond Taichung (219), Taipei (194) and Taoyuan (142), another 1,518 feeds sit under a general Taiwan listing, with Yunlin and Tainan adding regional depth.",
      },
      {
        q: "Are the cameras live around the clock?",
        a: "Yes — the intersection feeds stream day and night, so you can check late-evening congestion just as easily as the morning rush.",
      },
      {
        q: "Do I need an account to watch?",
        a: "No account is needed to start — all 3,243 Taiwan feeds can be watched on WorldEye. Your first 5 camera opens on a device are free; add your email for 5 more (10 in total, the same as a verified free account), and paid plans remove the limit. Browsing the directory is always free.",
      },
    ],
  },
  spain: {
    intro: [
      "Spain's 2,120 cameras split between two worlds: city streets and the seaside. Madrid dominates with 370 feeds; A Coruna follows with 170, then Valencia (129), Malaga (117), Zaragoza (84), and Pontevedra (73).",
      "The coastal entries are the ones travelers bookmark: Playa de Levante and Playa de Poniente in Benidorm, Playa Los Pocillos on Lanzarote, and San Telmo beach in Puerto de la Cruz, Tenerife.",
      "Check surf and weather before a beach day, or glance at Madrid traffic before heading out. All 2,120 feeds stream free on WorldEye.",
      "Madrid's 370 feeds make it the practical core: check traffic before crossing the city, then switch to the coast when the workday ends. A Coruna's 170 and Valencia's 129 add northern and eastern coverage, with Zaragoza (84) and Pontevedra (73) filling the gaps.",
      "For the beach cameras, mornings are the honest hour: Playa de Levante and Playa de Poniente show how busy Benidorm really is, Playa Los Pocillos shows Lanzarote's conditions, and San Telmo shows Tenerife's surf. Check before you pack the beach bag — the camera does not flatter.",
    ],
    blurb:
      "Watch 2,120 live cameras across Spain on WorldEye - Madrid traffic, Valencia streets, and live beach views from Benidorm to Tenerife, free day and night.",
    faqs: [
      {
        q: "How many live cameras are there in Spain?",
        a: "WorldEye streams 2,120 live cameras across 6 areas in Spain, from Madrid to the Canary Islands.",
      },
      {
        q: "Which Spanish areas have the most cameras?",
        a: "Madrid has the most with 370 cameras, followed by A Coruna (170), Valencia (129), Malaga (117), Zaragoza (84), and Pontevedra (73).",
      },
      {
        q: "Can I watch Spanish beaches live on WorldEye?",
        a: "Yes - the collection includes coastal feeds such as the Levante and Poniente beaches in Benidorm, Playa Los Pocillos on Lanzarote, and San Telmo beach in Tenerife.",
      },
      {
        q: "Can I check Madrid traffic live?",
        a: "Yes — with 370 feeds, Madrid has the densest coverage in Spain. Check conditions before driving across the city.",
      },
      {
        q: "Which beach cameras are best for a surf check?",
        a: "Playa de Levante and Playa de Poniente in Benidorm, Playa Los Pocillos on Lanzarote, and San Telmo beach in Puerto de la Cruz, Tenerife — all show live sea and beach conditions.",
      },
      {
        q: "Is there coverage in northern Spain?",
        a: "Yes — A Coruna has 170 cameras and Pontevedra 73, covering Galicia's cities and coast.",
      },
    ],
  },
  austria: {
    intro: [
      "Austria's 1,725 feeds arrive as one national listing, and there is a quirk worth knowing: the source data labels most of them with Slovenian place names - the A1/E57 corridor between Maribor and Ljubljana, the Rogoza section, the Slovenska Bistrica junction.",
      "Read them as motorway cameras for the wider Alpine region: junction and corridor views that track traffic through mountain passes and cross-border routes.",
      "If you are crossing the Alps by car, they are a practical live check on road flow. Every feed is free on WorldEye.",
      "The naming quirk is worth repeating because it confuses everyone once: the feeds are listed under Austria but labeled with Slovenian road names. Do not go looking for these junctions on an Austrian road map — read them as corridor cameras for the A1/E57 route between Maribor and Ljubljana and the surrounding Alpine crossings.",
      "For Alpine driving, these are a pre-trip tool: check the corridor before a cross-border run, especially in winter when passes slow down. They show traffic flow through the mountains as it is happening, free on WorldEye.",
    ],
    blurb:
      "Watch 1,725 live cameras listed for Austria on WorldEye - motorway and Alpine corridor feeds, including the A1/E57 route, streaming free and live.",
    faqs: [
      {
        q: "How many live cameras are there in Austria?",
        a: "WorldEye lists 1,725 live cameras for Austria, grouped under a single national area in the directory.",
      },
      {
        q: "Why do the Austrian camera names mention Slovenian places?",
        a: "That is how the source feeds are labeled - most carry Slovenian road names such as the A1/E57 corridor between Maribor and Ljubljana. Treat them as motorway cameras covering the wider Alpine and cross-border routes.",
      },
      {
        q: "Are Austrian cameras free to watch?",
        a: "Yes - every camera in the Austria listing can be watched on WorldEye. Your first 5 camera opens on a device are free; add your email for 5 more (10 in total, the same as a verified free account), and paid plans remove the limit. Browsing this directory page is always free.",
      },
      {
        q: "I can't find these places on an Austrian map — why?",
        a: "Because the source feeds use Slovenian road names — the A1/E57 corridor between Maribor and Ljubljana, the Rogoza section, the Slovenska Bistrica junction. Treat them as Alpine corridor cameras, not Austrian city feeds.",
      },
      {
        q: "Are these useful for winter Alpine driving?",
        a: "Yes — the corridor and pass views show live traffic flow through the mountains, which is exactly what you want to check before a winter cross-border drive.",
      },
      {
        q: "How many areas does Austria's listing cover?",
        a: "Just one — all 1,725 feeds sit under a single national listing in the directory.",
      },
    ],
  },
  canada: {
    intro: [
      "Canada's 4,685 cameras are a winter driver's best friend. Ottawa leads with 444 feeds, Toronto follows with 413, and Quebec (179) plus Montreal (146) anchor the east.",
      "The network speaks French on the autoroutes: Aut. 73 around Levis, Aut. 55 through Mauricie, Route 132 along the Gaspe coast. Each feed shows live road and weather conditions.",
      "Six areas in all, from Edmonton to the Maritimes, and every one streams free on WorldEye - check before you drive, especially from November to April.",
      "Ottawa's 444 feeds make it the densest cluster — the capital's winter is the reason. Toronto's 413 cover the country's busiest urban highways, while Quebec's 179 and Montreal's 146 watch the French-language autoroute network: Aut. 73 around Levis, Aut. 55 through Mauricie, Route 132 along the Gaspe coast.",
      "From November to April these cameras are essential equipment, not a novelty. Check your autoroute before a winter drive — the feeds show snow, ice, and plow progress live — and remember Edmonton and the Maritimes round out the six areas if you are out west or east.",
    ],
    blurb:
      "Watch 4,685 live cameras across Canada on WorldEye - Ottawa and Toronto feeds plus Quebec autoroute cameras with live winter road conditions, free.",
    faqs: [
      {
        q: "How many live cameras are there in Canada?",
        a: "WorldEye streams 4,685 live cameras across 6 areas in Canada, from Ottawa and Toronto to the Gaspe coast.",
      },
      {
        q: "Which Canadian areas have the most cameras?",
        a: "Ottawa leads with 444 cameras, followed by Toronto (413), Quebec (179), and Montreal (146).",
      },
      {
        q: "Can I check Canadian winter road conditions live?",
        a: "Yes - many feeds are highway cameras, such as those on Quebec's Autoroute 73 and Autoroute 55, showing live road and weather conditions through the winter months.",
      },
      {
        q: "Which city has the most cameras in Canada?",
        a: "Ottawa, with 444 feeds — the densest cluster in the country — followed by Toronto (413), Quebec (179), and Montreal (146).",
      },
      {
        q: "Can I check Quebec autoroutes in French?",
        a: "The feeds themselves are video, but they carry French road names: Aut. 73 around Levis, Aut. 55 through Mauricie, Route 132 along the Gaspe coast.",
      },
      {
        q: "When are Canada's cameras most useful?",
        a: "November to April, when the highway feeds show live snow, ice, and plowing on the routes you are about to drive.",
      },
    ],
  },
  italy: {
    intro: [
      "Italy is organized the way Italians drive: by autostrada. Of 1,030 cameras, the A1 Milano-Napoli carries 271 feeds, the A14 Bologna-Taranto 219, and the A56 Naples ring road another 57.",
      "Zoom out and the whole spine appears - the A4 toward Brescia, the A12 from Genoa to Rome, the A26 through the northwest - each feed pinned to a kilometer marker or interchange.",
      "Planning the drive from Milan to Naples? Watch the road live first. All feeds stream free on WorldEye.",
      "The A1 and A14 together carry nearly half the network — 271 and 220 feeds respectively — which means the Milan-Naples spine and the Adriatic corridor are the best-covered drives in the country. The A56 Naples ring road's 60 feeds handle the chaos around Naples itself.",
      "Use the kilometer markers: each feed is pinned to a marker or interchange, so match the camera to your route before a long drive. The A4 toward Brescia, the A12 from Genoa to Rome, and the A26 through the northwest fill out the rest of the map.",
    ],
    blurb:
      "Watch 1,030 live cameras across Italy on WorldEye - autostrada feeds from the A1 Milano-Napoli and A14 Bologna-Taranto, streaming free and live.",
    faqs: [
      {
        q: "How many live cameras are there in Italy?",
        a: "WorldEye streams 1,030 live cameras in Italy, organized across 6 areas that follow the autostrada network.",
      },
      {
        q: "Which Italian routes have the most cameras?",
        a: "The A1 Milano-Napoli leads with 271 cameras, followed by the A14 Bologna-Taranto (220). The A56 Naples ring road, A4, A26, and A12 add further coverage.",
      },
      {
        q: "Can I check autostrada traffic before driving in Italy?",
        a: "Yes - feeds sit at interchanges and kilometer markers along the main autostrade, so you can watch live traffic on your route before you leave.",
      },
      {
        q: "I'm driving Milan to Naples — can I check the road?",
        a: "Yes — the A1 Milano-Napoli carries 271 feeds pinned to kilometer markers and interchanges, so you can watch your route live before leaving.",
      },
      {
        q: "What about the Adriatic coast route?",
        a: "The A14 Bologna-Taranto has 220 feeds covering the Adriatic corridor, plus the A56 Naples ring road (57) if you are heading around Naples.",
      },
      {
        q: "Do the cameras show exact locations?",
        a: "Each feed is pinned to a kilometer marker or interchange along its autostrada, so you can match cameras to your planned route.",
      },
    ],
  },
  japan: {
    intro: [
      "Japan's 10,472 cameras reach from city streets to mountain rivers. Osaka has 194, Sapporo 184, and Tokyo 112 - but the network keeps going past the metros.",
      "National highway feeds, labeled with the characters for national route, watch roads like Route 20 and Route 6, while others sit on rivers and bridges - the Ogouchi River, the Mukunashi River, mountain passes in between.",
      "Part traffic tool, part quiet scenery: check a highway or just watch the water move. Free on WorldEye, day and night.",
      "Beyond the metros, the network follows the national routes — feeds labeled for Route 20, Route 6, and others watch the highways between cities. They are the practical half of the collection: check your highway before a drive, especially around Tokyo's 112 feeds where congestion builds fast.",
      "The other half is quieter: river cameras on the Ogouchi and Mukunashi, bridge views, and mountain passes. They double as weather checks — rain upstream, snow on the passes — and as simply pleasant things to watch. All 10,472 stream free, day and night.",
    ],
    blurb:
      "Explore 10,472 live cameras across Japan on WorldEye - Tokyo and Osaka streets, national highways, rivers and mountain views, streaming free day and night.",
    faqs: [
      {
        q: "How many live cameras are there in Japan?",
        a: "WorldEye lists 10,472 live cameras across 958 areas in Japan, from Tokyo and Osaka to Sapporo and Fukushima City.",
      },
      {
        q: "Which Japanese cities have the most cameras?",
        a: "Osaka has the most with 194 feeds, followed by Sapporo (184) and Tokyo (112).",
      },
      {
        q: "Are Japanese cameras only in the big cities?",
        a: "No - coverage stretches well beyond the metros, with feeds along national highways, rivers like the Ogouchi and Mukunashi, and mountain roads throughout the country.",
      },
      {
        q: "Can I check Tokyo traffic live?",
        a: "Yes — Tokyo's 112 feeds cover city streets and highways across the capital.",
      },
      {
        q: "What are the river cameras for?",
        a: "Feeds on rivers like the Ogouchi and Mukunashi, plus bridge and mountain-pass cameras, show water levels and weather — practical during heavy rain, pleasant to watch otherwise.",
      },
      {
        q: "Is there coverage in northern Japan?",
        a: "Yes — Sapporo has 184 feeds and Fukushima City is covered too, alongside the metros of Osaka, Kyoto, and Yokohama.",
      },
    ],
  },
  sweden: {
    intro: [
      "Sweden splits its 1,569 cameras between asphalt and altitude. Vastra Gotaland has 361, Stockholm 335, Skane 74, and Halland 43.",
      "Road feeds cover tunnels like Marieholmstunneln and motorway ramps - but then the network climbs: Salen's Gustavbacken slope, the Bjorkliden hotel in Lapland, even a thermal camera streaming in Skane.",
      "Check winter roads or just watch the snow fall in the north. All 1,569 are free on WorldEye.",
      "Vastra Gotaland's 317 feeds just edge out Stockholm's 335 — between them they cover the country's two big urban regions, including tunnels like Marieholmstunneln and the motorway ramps around Gothenburg and the capital. Skane's 74 and Halland's 43 handle the south.",
      "Then the network does something unexpected: it climbs. Salen's Gustavbacken slope, the Bjorkliden hotel in Lapland, even a thermal camera in Skane — check ski conditions or northern snow live, or just watch a Lapland winter from somewhere warm.",
    ],
    blurb:
      "Stream 1,569 live cameras across Sweden on WorldEye - Stockholm traffic, Gotaland highways, Salen ski slopes and Lapland views, free day and night.",
    faqs: [
      {
        q: "How many live cameras are there in Sweden?",
        a: "WorldEye lists 1,569 live cameras across 6 areas in Sweden, from Stockholm and Gothenburg's region to Lapland.",
      },
      {
        q: "Which Swedish areas have the most cameras?",
        a: "Stockholm leads with 350 cameras, just ahead of Vastra Gotaland (317). Skane (74) and Halland (39) follow.",
      },
      {
        q: "Are Swedish cameras useful for skiers?",
        a: "Yes - alongside motorway and tunnel cameras for winter road conditions, the network includes ski-area feeds such as Salen's Gustavbacken slope and the Bjorkliden hotel in Lapland.",
      },
      {
        q: "Can I check Stockholm traffic live?",
        a: "Yes — Stockholm's 350 feeds cover the capital's motorways and tunnels, including Marieholmstunneln.",
      },
      {
        q: "What is the thermal camera in Skane?",
        a: "One of the network's curiosities — a thermal-imaging feed streaming from Skane, alongside the regular road and ski cameras.",
      },
      {
        q: "Are the ski cameras useful in season?",
        a: "Yes — Salen's Gustavbacken slope and the Bjorkliden hotel feeds in Lapland show live snow conditions through the winter.",
      },
    ],
  },
  finland: {
    intro: [
      "Finland does things simply: 816 of its 825 cameras sit under one national listing. The feed names read like codes - vt12 near Lahti, vt7 at Vaalimaa, vt14 at Savonlinna - because these are highway cameras, full stop.",
      "They watch the roads Finns actually drive: past Lahti, through the Vaalimaa tunnel at the Russian border, over the Laitaatsalmi bridge.",
      "In a country with a five-month winter, live road conditions are not a novelty - they are essential. Free on WorldEye.",
      "The feed names are codes because the audience is drivers: vt12 near Lahti, vt7 at Vaalimaa, vt14 at Savonlinna. Learn the handful on your regular routes — past Lahti, through the Vaalimaa tunnel at the Russian border, over the Laitaatsalmi bridge — and you have a live road report.",
      "Five months of winter is the whole point of this network. Ice, snow, darkness, and plows: the cameras show all of it on the highways Finns actually drive. The few city feeds in Helsinki, Kuopio, Levi, and Rovaniemi are a bonus — the highways are the main event.",
    ],
    blurb:
      "Watch 825 live cameras across Finland on WorldEye - national highway feeds with live winter road conditions from Lahti to Vaalimaa, streaming free.",
    faqs: [
      {
        q: "How many live cameras are there in Finland?",
        a: "WorldEye streams 825 live cameras in Finland - 813 of them grouped under a single national listing, plus a few in Helsinki, Kuopio, Levi, and Rovaniemi.",
      },
      {
        q: "Where in Finland are the cameras?",
        a: "The network follows the highway system: feeds cover routes around Lahti, the Vaalimaa tunnel near the Russian border, and bridges and junctions across the country.",
      },
      {
        q: "Can I check Finnish winter road conditions live?",
        a: "Yes - that is what most of these cameras are for. They show live road and weather conditions on the highways, which is essential driving information through Finland's long winter.",
      },
      {
        q: "What do the vt codes in camera names mean?",
        a: "They are Finnish highway numbers — vt12 near Lahti, vt7 at Vaalimaa, vt14 at Savonlinna. The feeds are highway cameras, named for the roads they watch.",
      },
      {
        q: "Can I check the Russian border crossing area?",
        a: "The vt7 feeds at Vaalimaa cover the tunnel near the Russian border, showing live road conditions on that corridor.",
      },
      {
        q: "Are there city cameras in Finland?",
        a: "A few — Helsinki, Kuopio, Levi, and Rovaniemi carry small clusters — but 813 of the 825 feeds are the national highway listing.",
      },
    ],
  },
  iceland: {
    intro: [
      "Iceland's 482 cameras come in small clusters - four feeds here, four there - tracing the roads visitors actually drive. Strandarheidi, Skeidavegamot, Arnarneshed: the area names are a mouthful, the views are worth it.",
      "Tunnels get special attention: Hedinsfjardargong in the north and Bolungarvikurgong in the Westfjords, each watched from both ends.",
      "Before the Ring Road or a highland pass, check live weather and road surfaces. Every feed is free on WorldEye.",
      "The tunnel coverage is the standout detail: Hedinsfjardargong in the north and Bolungarvikurgong in the Westfjords are each watched from both ends. Tunnels are where Icelandic weather bites hardest — check both portals before driving through.",
      "For Ring Road trips, work outward from the clusters: Strandarheidi, Skeidavegamot, Arnarneshed and the rest trace the routes visitors actually drive. Weather moves fast here — a camera check the morning of your drive beats any forecast.",
    ],
    blurb:
      "Explore 482 live cameras across Iceland on WorldEye - Ring Road weather, mountain passes, and tunnel feeds, streaming live and free day and night.",
    faqs: [
      {
        q: "How many live cameras are there in Iceland?",
        a: "WorldEye lists 482 live cameras in Iceland - small clusters of around four feeds each, covering the country's key road corridors.",
      },
      {
        q: "What do Icelandic cameras show?",
        a: "Mostly roads and tunnels: the Hedinsfjordur tunnels in the north, the Bolungarvik tunnels in the Westfjords, highland passes like Strandarheidi, and routes around the Ring Road.",
      },
      {
        q: "Can I check Iceland road conditions before driving?",
        a: "Yes - the cameras show live weather and road surface conditions on the routes tourists and locals drive most, making them a practical pre-trip check.",
      },
      {
        q: "Can I check tunnel conditions in Iceland?",
        a: "Yes — Hedinsfjardargong in the north and Bolungarvikurgong in the Westfjords are each covered from both ends, showing live conditions at the tunnel portals.",
      },
      {
        q: "Are the cameras on the Ring Road?",
        a: "The clusters trace the key road corridors including Ring Road routes — Strandarheidi, Skeidavegamot, and Arnarneshed among them — plus highland passes.",
      },
      {
        q: "When should I check Iceland's cameras?",
        a: "The morning of any drive. Icelandic weather changes fast, and the cameras show live road surfaces and visibility on the exact routes you'll take.",
      },
    ],
  },
  lithuania: {
    intro: [
      "Lithuania's 326 cameras form a tight, practical network. The feeds cluster at highway junctions - the A5-A7 interchange near Marijampole, corridors along the A1 and A12 - with Vilnius in the mix.",
      "Do not expect city squares: these are working road cameras, named for the routes they watch, showing live traffic at the country's key interchanges.",
      "Small, focused, and free on WorldEye - a quick check before you drive the Vilnius-Kaunas corridor or head for a border crossing.",
      "The A5-A7 interchange near Marijampole is the signature junction — the kind of spot where a quick camera check saves real time. The A1 and A12 corridors carry the rest, with Vilnius feeds covering the capital's approaches.",
      "This is a network with one job: the Vilnius-Kaunas corridor, the border crossings, the key interchanges. Check before you drive, especially in winter when Baltic roads ice over. Small, focused, and free.",
    ],
    blurb:
      "Watch 326 live cameras across Lithuania on WorldEye - highway junction feeds on the A1, A5, and A7 corridors, streaming free live road views.",
    faqs: [
      {
        q: "How many live cameras are there in Lithuania?",
        a: "WorldEye streams 326 live cameras in Lithuania, concentrated on the national highway network.",
      },
      {
        q: "Where are Lithuania's cameras located?",
        a: "At highway junctions along the A1, A5, A7, and A12 corridors, with feeds around Vilnius and at interchanges like the A5-A7 junction near Marijampole.",
      },
      {
        q: "Are Lithuanian cameras all traffic cameras?",
        a: "Essentially yes - the feeds are junction and corridor cameras on the main highways, built for checking live road conditions rather than sightseeing.",
      },
      {
        q: "Can I check the Vilnius-Kaunas road live?",
        a: "Yes — the corridor cameras along the A1 and at key interchanges show live traffic on Lithuania's busiest route.",
      },
      {
        q: "Are border crossings covered?",
        a: "The highway feeds extend toward the borders — check the corridor cameras on the A1, A5, and A7 if you are heading for a crossing.",
      },
      {
        q: "Do I need an account?",
        a: "No — all 326 Lithuanian feeds stream free on WorldEye.",
      },
    ],
  },
  netherlands: {
    intro: [
      "The Netherlands points its 246 cameras at the water. Texel leads with 27 feeds, Harlingen has 13, and Ameland, Vlissingen, and Terschelling follow - the Frisian islands are the best-covered stretch.",
      "Expect surf pavilions at Scheveningen, sailing clubs at Loosdrecht and Almere, harbor views in Volendam, and the Scheldt estuary at Vlissingen. Rotterdam adds a city counterweight with 6 feeds.",
      "It is the ideal setup for watching North Sea weather roll in. All feeds stream free on WorldEye.",
      "Texel's 27 feeds make it the island to watch — beaches, harbors, and North Sea weather in one place. Harlingen's 13 face the Wadden Sea ferries, while Ameland, Terschelling, and Vlissingen split the rest of the island and estuary coverage.",
      "Rotterdam's 6 feeds are the urban counterweight, but the soul of this network is water: Scheveningen's surf pavilions, the sailing clubs at Loosdrecht and Almere, Volendam's harbor, the Scheldt at Vlissingen. Check sea state before sailing, or just watch the weather come in off the North Sea.",
    ],
    blurb:
      "Stream 246 live cameras across the Netherlands on WorldEye - Texel beaches, Frisian island harbors, and Amsterdam-area views, free to watch live.",
    faqs: [
      {
        q: "How many live cameras are there in the Netherlands?",
        a: "WorldEye lists 246 live cameras across 6 areas in the Netherlands, with the strongest coverage on the coast and Frisian islands.",
      },
      {
        q: "Which Dutch areas have the most cameras?",
        a: "Texel leads with 27 cameras, followed by Harlingen (13), then Ameland and Vlissingen (8 each), Terschelling (7), and Rotterdam (6).",
      },
      {
        q: "Can I watch the Dutch coast live?",
        a: "Yes - coastal feeds include Texel and Ameland beaches, Scheveningen's waterfront, sailing clubs at Loosdrecht and Almere, and the Scheldt estuary at Vlissingen.",
      },
      {
        q: "Can I check Texel beach weather live?",
        a: "Yes — Texel's 27 feeds are the densest island coverage in the network, showing beaches, harbors, and North Sea weather live.",
      },
      {
        q: "Are there sailing-related cameras?",
        a: "Yes — sailing clubs at Loosdrecht and Almere, harbors at Volendam and Harlingen, and the Scheldt estuary at Vlissingen all stream live.",
      },
      {
        q: "Is there any city coverage?",
        a: "A little — Rotterdam carries 6 feeds. But this network is overwhelmingly coastal: the Frisian islands are the best-covered stretch.",
      },
    ],
  },
  australia: {
    intro: [
      "Australia's 421 cameras are overwhelmingly Sydney's: SYD_MET alone holds 81 feeds, with SYD_NORTH (41), SYD_WEST (33), and SYD_SOUTH (31) close behind. Regional zones add a smaller share.",
      "These are motorway cameras with a job to do - the M4 Western Motorway, the Hume Highway through Liverpool, the Pacific Highway at Coffs Harbour - showing live traffic across the metro area.",
      "Sydney drivers get a real-time road board; everyone else gets a look at the harbor city's arteries. Free on WorldEye.",
      "The zone breakdown tells you where to look: SYD_MET’s 81 feeds cover the inner metro, while SYD_NORTH, SYD_WEST and SYD_SOUTH split the suburban arterials. Heading out of the city, the regional feeds pick up corridors like the Pacific Highway at Coffs Harbour — useful for long drives up the coast.",
      "Timing matters with motorway cameras. They earn their keep during Sydney’s weekday peak hours, when the M4 and Hume Highway slow down, and after heavy rain when low-lying sections can flood. Outside those windows they are a quiet way to watch the harbor city move.",
    ],
    blurb:
      "Watch 421 live cameras across Australia on WorldEye - Sydney motorway feeds on the M4, Hume Highway, and Pacific Highway, streaming free live.",
    faqs: [
      {
        q: "How many live cameras are there in Australia?",
        a: "WorldEye streams 421 live cameras in Australia, the great majority of them in Sydney's metro and regional zones.",
      },
      {
        q: "Is Australian camera coverage mostly Sydney?",
        a: "Yes - SYD_MET alone carries 81 cameras, with SYD_NORTH, SYD_WEST, and SYD_SOUTH adding most of the rest. A smaller regional share covers areas like Coffs Harbour.",
      },
      {
        q: "Can I check Sydney motorway traffic live?",
        a: "Yes - feeds cover the M4 Western Motorway, the M1 Pacific Motorway, and the Hume Highway, so you can check live traffic on Sydney's main routes.",
      },
      {
        q: "Which Sydney motorways can I check on camera?",
        a: "The M4 Western Motorway, the M1 Pacific Motorway, and the Hume Highway through Liverpool are all covered, along with metro arterials in the SYD_MET, SYD_NORTH, SYD_WEST and SYD_SOUTH zones.",
      },
      {
        q: "Are there cameras outside Sydney?",
        a: "Yes, a smaller regional share covers areas like Coffs Harbour on the Pacific Highway. The great majority of the 421 feeds sit in the Sydney metro zones, though.",
      },
      {
        q: "When are Sydney’s traffic cameras most useful?",
        a: "During weekday rush hours, when the M4 and Hume Highway congest, and after storms when low-lying road sections can flood. Check before you leave rather than while driving.",
      },
    ],
  },
  turkey: {
    intro: [
      "Turkey's 235 cameras lean heavily on Istanbul, which holds 143 feeds. Arnavutkoy adds 12, and the Konya area - Selcuklu, Meram, and surrounding districts - contributes a second cluster.",
      "The Konya feeds are neighborhood-level: Zafer Meydani square, the Konya Science Center, Fevzipasa street, the Buyuksehir Arena - a street-by-street look at the city.",
      "From Istanbul's avenues to Konya's districts, it is a live cross-section of Turkish city life, free on WorldEye.",
      "Istanbul's 143 feeds are the main event — avenues and busy streets across the megacity. Arnavutkoy's 12 add the northwestern districts, and the area list runs through Kahramanmaras and Balikesir too, so coverage is not only the two big clusters.",
      "The Konya feeds reward zooming in: Zafer Meydani square, the Konya Science Center, Fevzipasa street, the Buyuksehir Arena — neighborhood by neighborhood, Selcuklu and Meram district by district. It is street-level Turkey, live and free.",
    ],
    blurb:
      "Watch 235 live cameras across Turkey on WorldEye - Istanbul streets and Konya district feeds, from city squares to busy avenues, streaming free.",
    faqs: [
      {
        q: "How many live cameras are there in Turkey?",
        a: "WorldEye streams 235 live cameras in Turkey, with the heaviest coverage in Istanbul and a second cluster around Konya.",
      },
      {
        q: "Which Turkish areas have the most cameras?",
        a: "Istanbul leads with 143 cameras, followed by Arnavutkoy (12), Selcuklu (10), Kahramanmaras (5), Balikesir (4), and Meram (3).",
      },
      {
        q: "What do Turkey's cameras show?",
        a: "City streets and district views - Istanbul avenues plus neighborhood-level feeds in Konya, covering squares like Zafer Meydani, the Konya Science Center area, and busy streets.",
      },
      {
        q: "Can I watch Istanbul streets live?",
        a: "Yes — 143 feeds cover Istanbul's avenues and busy streets, the heaviest single-city coverage in Turkey.",
      },
      {
        q: "What is in the Konya cluster?",
        a: "Neighborhood-level feeds across Selcuklu, Meram, and surrounding districts: Zafer Meydani square, the Konya Science Center, Fevzipasa street, and the Buyuksehir Arena.",
      },
      {
        q: "Is there coverage outside Istanbul and Konya?",
        a: "Yes — Arnavutkoy (12), Kahramanmaras (5), and Balikesir (4) add further areas to the 235-feed network.",
      },
    ],
  },
};

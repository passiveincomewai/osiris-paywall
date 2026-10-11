export type CountryFaq = { q: string; a: string };

export type CountryContent = {
  intro: string[]; // 2-4 short paragraphs
  blurb: string; // meta description, 140-160 chars, unique per country
  faqs: CountryFaq[]; // exactly 3
};

export const countryContentD: Record<string, CountryContent> = {
  taiwan: {
    intro: [
      "Taiwan packs 2,779 live cameras into a compact island, and Taichung is the standout with 189 feeds - more than Taipei's 169 or Taoyuan's 122. A further 1,529 sit under a general Taiwan listing, with Yunlin and Tainan adding regional depth.",
      "These are working street cameras, not tourist views. Feeds labeled like Taichung city roads sit at intersections - Taiyuan Road, Zhongqing Road, Minquan Road - showing live vehicle flow in both directions.",
      "For anyone navigating a Taiwanese city, that is genuinely useful: check congestion before you leave, free on WorldEye, any time of day.",
    ],
    blurb:
      "Watch 2,779 live cameras across Taiwan on WorldEye - intersection and road feeds from Taichung, Taipei, and Taoyuan, streaming free around the clock.",
    faqs: [
      {
        q: "How many live cameras are there in Taiwan?",
        a: "WorldEye lists 2,779 live cameras across 6 areas in Taiwan, making it one of the densest camera networks in Asia.",
      },
      {
        q: "Which Taiwanese cities have the most cameras?",
        a: "Taichung leads with 189 feeds, ahead of Taipei (169) and Taoyuan (122). Another 1,529 feeds sit under a general Taiwan listing, with Yunlin and Tainan adding coverage.",
      },
      {
        q: "What do the Taiwanese camera names mean?",
        a: "Most are labeled as city road cameras with the intersection in both Chinese and English - for example, a Taichung feed might read Taiyuan Road and East Huanzhong Road - so you can tell exactly which junction you are watching.",
      },
    ],
  },
  spain: {
    intro: [
      "Spain's 1,997 cameras split between two worlds: city streets and the seaside. Madrid dominates with 370 feeds; A Coruna follows with 170, then Valencia (129), Malaga (117), Zaragoza (84), and Pontevedra (73).",
      "The coastal entries are the ones travelers bookmark: Playa de Levante and Playa de Poniente in Benidorm, Playa Los Pocillos on Lanzarote, and San Telmo beach in Puerto de la Cruz, Tenerife.",
      "Check surf and weather before a beach day, or glance at Madrid traffic before heading out. All 1,997 feeds stream free on WorldEye.",
    ],
    blurb:
      "Watch 1,997 live cameras across Spain on WorldEye - Madrid traffic, Valencia streets, and live beach views from Benidorm to Tenerife, free day and night.",
    faqs: [
      {
        q: "How many live cameras are there in Spain?",
        a: "WorldEye streams 1,997 live cameras across 6 areas in Spain, from Madrid to the Canary Islands.",
      },
      {
        q: "Which Spanish areas have the most cameras?",
        a: "Madrid has the most with 370 cameras, followed by A Coruna (170), Valencia (129), Malaga (117), Zaragoza (84), and Pontevedra (73).",
      },
      {
        q: "Can I watch Spanish beaches live on WorldEye?",
        a: "Yes - the collection includes coastal feeds such as the Levante and Poniente beaches in Benidorm, Playa Los Pocillos on Lanzarote, and San Telmo beach in Tenerife.",
      },
    ],
  },
  austria: {
    intro: [
      "Austria's 1,828 feeds arrive as one national listing, and there is a quirk worth knowing: the source data labels most of them with Slovenian place names - the A1/E57 corridor between Maribor and Ljubljana, the Rogoza section, the Slovenska Bistrica junction.",
      "Read them as motorway cameras for the wider Alpine region: junction and corridor views that track traffic through mountain passes and cross-border routes.",
      "If you are crossing the Alps by car, they are a practical live check on road flow. Every feed is free on WorldEye.",
    ],
    blurb:
      "Watch 1,828 live cameras listed for Austria on WorldEye - motorway and Alpine corridor feeds, including the A1/E57 route, streaming free and live.",
    faqs: [
      {
        q: "How many live cameras are there in Austria?",
        a: "WorldEye lists 1,828 live cameras for Austria, grouped under a single national area in the directory.",
      },
      {
        q: "Why do the Austrian camera names mention Slovenian places?",
        a: "That is how the source feeds are labeled - most carry Slovenian road names such as the A1/E57 corridor between Maribor and Ljubljana. Treat them as motorway cameras covering the wider Alpine and cross-border routes.",
      },
      {
        q: "Are Austrian cameras free to watch?",
        a: "Yes - every camera in the Austria listing streams free on WorldEye with no account needed.",
      },
    ],
  },
  canada: {
    intro: [
      "Canada's 1,509 cameras are a winter driver's best friend. Ottawa leads with 428 feeds, Toronto follows with 339, and Quebec (180) plus Montreal (148) anchor the east.",
      "The network speaks French on the autoroutes: Aut. 73 around Levis, Aut. 55 through Mauricie, Route 132 along the Gaspe coast. Each feed shows live road and weather conditions.",
      "Six areas in all, from Edmonton to the Maritimes, and every one streams free on WorldEye - check before you drive, especially from November to April.",
    ],
    blurb:
      "Watch 1,509 live cameras across Canada on WorldEye - Ottawa and Toronto feeds plus Quebec autoroute cameras with live winter road conditions, free.",
    faqs: [
      {
        q: "How many live cameras are there in Canada?",
        a: "WorldEye streams 1,509 live cameras across 6 areas in Canada, from Ottawa and Toronto to the Gaspe coast.",
      },
      {
        q: "Which Canadian areas have the most cameras?",
        a: "Ottawa leads with 428 cameras, followed by Toronto (339), Quebec (180), and Montreal (148).",
      },
      {
        q: "Can I check Canadian winter road conditions live?",
        a: "Yes - many feeds are highway cameras, such as those on Quebec's Autoroute 73 and Autoroute 55, showing live road and weather conditions through the winter months.",
      },
    ],
  },
  italy: {
    intro: [
      "Italy is organized the way Italians drive: by autostrada. Of 993 cameras, the A1 Milano-Napoli carries 268 feeds, the A14 Bologna-Taranto 219, and the A56 Naples ring road another 57.",
      "Zoom out and the whole spine appears - the A4 toward Brescia, the A12 from Genoa to Rome, the A26 through the northwest - each feed pinned to a kilometer marker or interchange.",
      "Planning the drive from Milan to Naples? Watch the road live first. All feeds stream free on WorldEye.",
    ],
    blurb:
      "Watch 993 live cameras across Italy on WorldEye - autostrada feeds from the A1 Milano-Napoli and A14 Bologna-Taranto, streaming free and live.",
    faqs: [
      {
        q: "How many live cameras are there in Italy?",
        a: "WorldEye streams 993 live cameras in Italy, organized across 6 areas that follow the autostrada network.",
      },
      {
        q: "Which Italian routes have the most cameras?",
        a: "The A1 Milano-Napoli leads with 268 cameras, followed by the A14 Bologna-Taranto (219). The A56 Naples ring road, A4, A26, and A12 add further coverage.",
      },
      {
        q: "Can I check autostrada traffic before driving in Italy?",
        a: "Yes - feeds sit at interchanges and kilometer markers along the main autostrade, so you can watch live traffic on your route before you leave.",
      },
    ],
  },
  japan: {
    intro: [
      "Japan's 928 cameras reach from city streets to mountain rivers. Tokyo has 73, Osaka 28, Sapporo 15, Kyoto 13, and Yokohama 9 - but the network keeps going past the metros.",
      "National highway feeds, labeled with the characters for national route, watch roads like Route 20 and Route 6, while others sit on rivers and bridges - the Ogouchi River, the Mukunashi River, mountain passes in between.",
      "Part traffic tool, part quiet scenery: check a highway or just watch the water move. Free on WorldEye, day and night.",
    ],
    blurb:
      "Explore 928 live cameras across Japan on WorldEye - Tokyo and Osaka streets, national highways, rivers and mountain views, streaming free day and night.",
    faqs: [
      {
        q: "How many live cameras are there in Japan?",
        a: "WorldEye lists 928 live cameras across 6 areas in Japan, from Tokyo and Osaka to Sapporo and Fukushima City.",
      },
      {
        q: "Which Japanese cities have the most cameras?",
        a: "Tokyo has the most with 73 feeds, followed by Osaka (28), Sapporo (15), Kyoto (13), and Yokohama (9).",
      },
      {
        q: "Are Japanese cameras only in the big cities?",
        a: "No - coverage stretches well beyond the metros, with feeds along national highways, rivers like the Ogouchi and Mukunashi, and mountain roads throughout the country.",
      },
    ],
  },
  sweden: {
    intro: [
      "Sweden splits its 886 cameras between asphalt and altitude. Vastra Gotaland has 361, Stockholm 335, Skane 74, and Halland 43.",
      "Road feeds cover tunnels like Marieholmstunneln and motorway ramps - but then the network climbs: Salen's Gustavbacken slope, the Bjorkliden hotel in Lapland, even a thermal camera streaming in Skane.",
      "Check winter roads or just watch the snow fall in the north. All 886 are free on WorldEye.",
    ],
    blurb:
      "Stream 886 live cameras across Sweden on WorldEye - Stockholm traffic, Gotaland highways, Salen ski slopes and Lapland views, free day and night.",
    faqs: [
      {
        q: "How many live cameras are there in Sweden?",
        a: "WorldEye lists 886 live cameras across 6 areas in Sweden, from Stockholm and Gothenburg's region to Lapland.",
      },
      {
        q: "Which Swedish areas have the most cameras?",
        a: "Vastra Gotaland leads with 361 cameras, just ahead of Stockholm (335). Skane (74) and Halland (43) follow.",
      },
      {
        q: "Are Swedish cameras useful for skiers?",
        a: "Yes - alongside motorway and tunnel cameras for winter road conditions, the network includes ski-area feeds such as Salen's Gustavbacken slope and the Bjorkliden hotel in Lapland.",
      },
    ],
  },
  finland: {
    intro: [
      "Finland does things simply: 813 of its 818 cameras sit under one national listing. The feed names read like codes - vt12 near Lahti, vt7 at Vaalimaa, vt14 at Savonlinna - because these are highway cameras, full stop.",
      "They watch the roads Finns actually drive: past Lahti, through the Vaalimaa tunnel at the Russian border, over the Laitaatsalmi bridge.",
      "In a country with a five-month winter, live road conditions are not a novelty - they are essential. Free on WorldEye.",
    ],
    blurb:
      "Watch 818 live cameras across Finland on WorldEye - national highway feeds with live winter road conditions from Lahti to Vaalimaa, streaming free.",
    faqs: [
      {
        q: "How many live cameras are there in Finland?",
        a: "WorldEye streams 818 live cameras in Finland - 813 of them grouped under a single national listing, plus a few in Helsinki, Kuopio, Levi, and Rovaniemi.",
      },
      {
        q: "Where in Finland are the cameras?",
        a: "The network follows the highway system: feeds cover routes around Lahti, the Vaalimaa tunnel near the Russian border, and bridges and junctions across the country.",
      },
      {
        q: "Can I check Finnish winter road conditions live?",
        a: "Yes - that is what most of these cameras are for. They show live road and weather conditions on the highways, which is essential driving information through Finland's long winter.",
      },
    ],
  },
  iceland: {
    intro: [
      "Iceland's 496 cameras come in small clusters - four feeds here, four there - tracing the roads visitors actually drive. Strandarheidi, Skeidavegamot, Arnarneshed: the area names are a mouthful, the views are worth it.",
      "Tunnels get special attention: Hedinsfjardargong in the north and Bolungarvikurgong in the Westfjords, each watched from both ends.",
      "Before the Ring Road or a highland pass, check live weather and road surfaces. Every feed is free on WorldEye.",
    ],
    blurb:
      "Explore 496 live cameras across Iceland on WorldEye - Ring Road weather, mountain passes, and tunnel feeds, streaming live and free day and night.",
    faqs: [
      {
        q: "How many live cameras are there in Iceland?",
        a: "WorldEye lists 496 live cameras in Iceland - small clusters of around four feeds each, covering the country's key road corridors.",
      },
      {
        q: "What do Icelandic cameras show?",
        a: "Mostly roads and tunnels: the Hedinsfjordur tunnels in the north, the Bolungarvik tunnels in the Westfjords, highland passes like Strandarheidi, and routes around the Ring Road.",
      },
      {
        q: "Can I check Iceland road conditions before driving?",
        a: "Yes - the cameras show live weather and road surface conditions on the routes tourists and locals drive most, making them a practical pre-trip check.",
      },
    ],
  },
  lithuania: {
    intro: [
      "Lithuania's 316 cameras form a tight, practical network. The feeds cluster at highway junctions - the A5-A7 interchange near Marijampole, corridors along the A1 and A12 - with Vilnius in the mix.",
      "Do not expect city squares: these are working road cameras, named for the routes they watch, showing live traffic at the country's key interchanges.",
      "Small, focused, and free on WorldEye - a quick check before you drive the Vilnius-Kaunas corridor or head for a border crossing.",
    ],
    blurb:
      "Watch 316 live cameras across Lithuania on WorldEye - highway junction feeds on the A1, A5, and A7 corridors, streaming free live road views.",
    faqs: [
      {
        q: "How many live cameras are there in Lithuania?",
        a: "WorldEye streams 316 live cameras in Lithuania, concentrated on the national highway network.",
      },
      {
        q: "Where are Lithuania's cameras located?",
        a: "At highway junctions along the A1, A5, A7, and A12 corridors, with feeds around Vilnius and at interchanges like the A5-A7 junction near Marijampole.",
      },
      {
        q: "Are Lithuanian cameras all traffic cameras?",
        a: "Essentially yes - the feeds are junction and corridor cameras on the main highways, built for checking live road conditions rather than sightseeing.",
      },
    ],
  },
  netherlands: {
    intro: [
      "The Netherlands points its 268 cameras at the water. Texel leads with 27 feeds, Harlingen has 13, and Ameland, Vlissingen, and Terschelling follow - the Frisian islands are the best-covered stretch.",
      "Expect surf pavilions at Scheveningen, sailing clubs at Loosdrecht and Almere, harbor views in Volendam, and the Scheldt estuary at Vlissingen. Rotterdam adds a city counterweight with 6 feeds.",
      "It is the ideal setup for watching North Sea weather roll in. All feeds stream free on WorldEye.",
    ],
    blurb:
      "Stream 268 live cameras across the Netherlands on WorldEye - Texel beaches, Frisian island harbors, and Amsterdam-area views, free to watch live.",
    faqs: [
      {
        q: "How many live cameras are there in the Netherlands?",
        a: "WorldEye lists 268 live cameras across 6 areas in the Netherlands, with the strongest coverage on the coast and Frisian islands.",
      },
      {
        q: "Which Dutch areas have the most cameras?",
        a: "Texel leads with 27 cameras, followed by Harlingen (13), then Ameland and Vlissingen (8 each), Terschelling (7), and Rotterdam (6).",
      },
      {
        q: "Can I watch the Dutch coast live?",
        a: "Yes - coastal feeds include Texel and Ameland beaches, Scheveningen's waterfront, sailing clubs at Loosdrecht and Almere, and the Scheldt estuary at Vlissingen.",
      },
    ],
  },
  australia: {
    intro: [
      "Australia's 250 cameras are overwhelmingly Sydney's: SYD_MET alone holds 81 feeds, with SYD_NORTH (41), SYD_WEST (33), and SYD_SOUTH (31) close behind. Regional zones add a smaller share.",
      "These are motorway cameras with a job to do - the M4 Western Motorway, the Hume Highway through Liverpool, the Pacific Highway at Coffs Harbour - showing live traffic across the metro area.",
      "Sydney drivers get a real-time road board; everyone else gets a look at the harbor city's arteries. Free on WorldEye.",
    ],
    blurb:
      "Watch 250 live cameras across Australia on WorldEye - Sydney motorway feeds on the M4, Hume Highway, and Pacific Highway, streaming free live.",
    faqs: [
      {
        q: "How many live cameras are there in Australia?",
        a: "WorldEye streams 250 live cameras in Australia, the great majority of them in Sydney's metro and regional zones.",
      },
      {
        q: "Is Australian camera coverage mostly Sydney?",
        a: "Yes - SYD_MET alone carries 81 cameras, with SYD_NORTH, SYD_WEST, and SYD_SOUTH adding most of the rest. A smaller regional share covers areas like Coffs Harbour.",
      },
      {
        q: "Can I check Sydney motorway traffic live?",
        a: "Yes - feeds cover the M4 Western Motorway, the M1 Pacific Motorway, and the Hume Highway, so you can check live traffic on Sydney's main routes.",
      },
    ],
  },
  turkey: {
    intro: [
      "Turkey's 247 cameras lean heavily on Istanbul, which holds 143 feeds. Arnavutkoy adds 16, and the Konya area - Selcuklu, Meram, and surrounding districts - contributes a second cluster.",
      "The Konya feeds are neighborhood-level: Zafer Meydani square, the Konya Science Center, Fevzipasa street, the Buyuksehir Arena - a street-by-street look at the city.",
      "From Istanbul's avenues to Konya's districts, it is a live cross-section of Turkish city life, free on WorldEye.",
    ],
    blurb:
      "Watch 247 live cameras across Turkey on WorldEye - Istanbul streets and Konya district feeds, from city squares to busy avenues, streaming free.",
    faqs: [
      {
        q: "How many live cameras are there in Turkey?",
        a: "WorldEye streams 247 live cameras in Turkey, with the heaviest coverage in Istanbul and a second cluster around Konya.",
      },
      {
        q: "Which Turkish areas have the most cameras?",
        a: "Istanbul leads with 143 cameras, followed by Arnavutkoy (16), Selcuklu (7), Kahramanmaras (6), Balikesir (5), and Meram (5).",
      },
      {
        q: "What do Turkey's cameras show?",
        a: "City streets and district views - Istanbul avenues plus neighborhood-level feeds in Konya, covering squares like Zafer Meydani, the Konya Science Center area, and busy streets.",
      },
    ],
  },
};

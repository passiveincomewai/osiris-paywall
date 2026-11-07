export type CountryFaq = { q: string; a: string };

export type CountryContent = {
  intro: string[]; // 5 substantial paragraphs
  blurb: string; // meta description, 140-160 chars, unique per country
  faqs: CountryFaq[]; // 6-7
};

export const countryContentB: Record<string, CountryContent> = {
  "united-states": {
    intro: [
      "The United States hosts the largest live camera network in our directory: 41,355 cameras across 12 coverage areas. Georgia alone accounts for 4,288 feeds, with Utah (2,082) and Houston (1,158) next in line.",
      "The vast majority are highway and traffic cameras. Expect interstate views like the I-64 corridor in Indiana, canyon roads along Utah's SR-210, and metro feeds from Dallas, Phoenix, and Miami-Dade County.",
      "That makes the US collection especially practical for drivers: you can check real road conditions live before heading out, and every feed is free to watch on WorldEye.",
      "The state-level breakdown is where the network gets practical. Georgia's 4,288 feeds, Utah's 2,082, and the Houston area's 1,158 are the big three, but Dallas, Indiana, Nevada, Phoenix, and Miami-Dade County all carry heavy coverage of their own. If you drive one corridor regularly, learn its cameras.",
      "Treat the collection as a pre-trip check, not a dashboard companion: glance at your corridor's cameras before you leave, note any crashes or closures, then drive. The feeds are free and need no account, so there is no reason not to make it part of the routine.",
    ],
    blurb:
      "Watch 41,355 live cameras across the United States on WorldEye - from Georgia and Utah highway feeds to Houston traffic cams, streaming free.",
    faqs: [
      {
        q: "How many live cameras are there in the United States?",
        a: "WorldEye currently lists 41,355 live cameras across 12 US coverage areas - the largest national network in our directory.",
      },
      {
        q: "Which US areas have the most cameras?",
        a: "Georgia tops the list with 4,288 cameras, followed by Utah (2,135) and the Houston area (1,158). Dallas, Indiana, and Nevada also carry heavy coverage.",
      },
      {
        q: "Are US cameras mostly traffic cameras?",
        a: "Yes - the bulk of the US feeds are highway and road cameras, like the I-64 corridor in Indiana and SR-210 in Utah, so they work well for checking real-time road conditions before a trip.",
      },
      {
        q: "Can I check a specific interstate before a road trip?",
        a: "Yes — pick the corridor: the I-64 in Indiana, SR-210 through Utah's canyons, or the metro feeds around Dallas, Phoenix, and Miami-Dade County. Find your route's cameras on the live map and check conditions before you set out.",
      },
      {
        q: "Do I need an account to watch US cameras?",
        a: "No account is needed to start. Every one of the 41,355 feeds can be watched on WorldEye — open the map, zoom to your route, and tap a camera marker. Your first 5 camera opens on a device are free; add your email for 5 more (10 in total, the same as a verified free account), and paid plans remove the limit. Browsing the directory is always free.",
      },
      {
        q: "Are these cameras live video or still images?",
        a: "Most highway departments publish their feeds as images refreshing every few seconds rather than smooth video. That is enough to spot congestion, crashes, or flooding on your route — which is what the network is for.",
      },
    ],
  },
  taiwan: {
    intro: [
      "Taiwan's 2,779 cameras capture one of Asia's densest urban landscapes, spread across 12 areas. Taichung carries the most named-city coverage with 189 feeds, followed by Taipei at 169 and Taoyuan at 122.",
      "Traffic is the star here. Intersection cameras on roads like Taiyuan Road and Zhongqing Road stream live vehicle flow, which locals use to gauge congestion before setting out.",
      "Coverage also reaches Kaohsiung, Tainan, Yunlin, and Hualien, so you can hop from the west-coast metros to the island's east in a few clicks - all free on WorldEye.",
    ],
    blurb:
      "Stream 2,779 live cameras across Taiwan on WorldEye - dense urban and traffic feeds from Taichung, Taipei, and Taoyuan, all free to watch live.",
    faqs: [
      {
        q: "How many live cameras are there in Taiwan?",
        a: "WorldEye lists 2,779 live cameras across 12 areas in Taiwan, making it one of the densest urban camera networks in Asia.",
      },
      {
        q: "Which Taiwanese cities have the most cameras?",
        a: "Taichung leads with 189 feeds, ahead of Taipei (169) and Taoyuan (122). Yunlin, Tainan, and Kaohsiung add further coverage across the island.",
      },
      {
        q: "Can I check traffic congestion in Taiwan on WorldEye?",
        a: "Yes - most Taiwanese feeds are intersection and road cameras, such as those on Taichung's Taiyuan Road, showing live vehicle flow you can use to judge congestion.",
      },
    ],
  },
  spain: {
    intro: [
      "Spain offers 1,997 live cameras across 12 areas, blending city streets with coastline. Madrid leads with 370 feeds, while A Coruña (170), Valencia (129), and Málaga (117) round out the top tier.",
      "The collection has a strong seaside flavor: beach views around Benidorm, Tenerife, and Lanzarote sit alongside urban squares like Sevilla's Plaza de San Francisco.",
      "It's a handy window for travelers - check the weather over a Costa Blanca beach or glance at Madrid traffic before a trip. Every feed streams free on WorldEye.",
    ],
    blurb:
      "Explore 1,997 live cameras across Spain on WorldEye - Madrid streets, Valencia views, and Mediterranean beach feeds, all streaming live and free.",
    faqs: [
      {
        q: "How many live cameras are there in Spain?",
        a: "WorldEye currently streams 1,997 live cameras across 12 areas in Spain, from major cities to the Canary Islands.",
      },
      {
        q: "Which Spanish areas have the most cameras?",
        a: "Madrid has the most with 370 cameras, followed by A Coruña (170), Valencia (129), and Málaga (117).",
      },
      {
        q: "Can I watch Spanish beaches live?",
        a: "Yes - the collection includes coastal feeds such as beach views around Benidorm, Tenerife, and Lanzarote, handy for checking weather and sea conditions before a beach day.",
      },
    ],
  },
  austria: {
    intro: [
      "Austria's 1,828 cameras are listed under a single national area, making it one of the most concentrated networks in Europe on WorldEye. The feeds focus on the country's motorways and alpine routes, with junction cameras tracking traffic through mountain corridors.",
      "If you're driving the Alps - especially in winter - these are practical feeds: check pass conditions and motorway flow live before you set off, free of charge.",
    ],
    blurb:
      "Tune into 1,828 live cameras across Austria on WorldEye - alpine roads, motorway junctions, and mountain corridors, streaming free and live.",
    faqs: [
      {
        q: "How many live cameras are there in Austria?",
        a: "WorldEye lists 1,828 live cameras in Austria, all grouped under a single national area in our directory.",
      },
      {
        q: "What do Austrian cameras usually show?",
        a: "Mostly motorway and alpine-route cameras - junction feeds and mountain corridors that are especially useful for checking winter road conditions in the Alps.",
      },
      {
        q: "Are Austrian street cameras free to watch?",
        a: "Yes - every camera in WorldEye's Austria collection, including all motorway and alpine feeds, can be watched on WorldEye. Your first 5 camera opens on a device are free; add your email for 5 more (10 in total, the same as a verified free account), and paid plans remove the limit. Browsing this directory page is always free.",
      },
    ],
  },
  canada: {
    intro: [
      "Canada's 1,509 live cameras cover 12 areas, with Ottawa (428) and Toronto (339) carrying the most feeds. Québec (180) and Montréal (148) add strong coverage in the east.",
      "Many feeds follow the autoroute network - Autoroute 73 around Lévis, Autoroute 55 in Mauricie, and Route 132 along the Gaspé coast - which makes them genuinely useful in winter.",
      "Drivers can check live road and weather conditions before a trip across Ontario, Québec, and beyond. All Canadian feeds are free to watch on WorldEye.",
    ],
    blurb:
      "Watch 1,509 live cameras across Canada on WorldEye - Ottawa, Toronto, and Québec highway feeds with live road conditions, streaming free, day and night.",
    faqs: [
      {
        q: "How many live cameras are there in Canada?",
        a: "WorldEye streams 1,509 live cameras across 12 areas in Canada, from Ottawa and Toronto to the Gaspé coast.",
      },
      {
        q: "Which Canadian areas have the most cameras?",
        a: "Ottawa leads with 428 cameras, followed by Toronto (339), Québec (180), and Montréal (148).",
      },
      {
        q: "Can I check winter road conditions in Canada on WorldEye?",
        a: "Yes - many Canadian feeds are highway cameras, like those on Québec's Autoroute 73 and Autoroute 55, showing live road and weather conditions through the winter months.",
      },
    ],
  },
  "hong-kong": {
    intro: [
      "Few territories are as densely covered as Hong Kong: 1,350 traffic cameras across 12 districts. Yuen Long leads with 195 feeds, ahead of Sha Tin (153) and Tsuen Wan (121).",
      "The feeds are district-level road cameras - Tai Po Road, Kwun Tong Road, Castle Peak Road - capturing the territory's famously busy streets in real time.",
      "For commuters and the curious alike, it's a live pulse of the city, from Kowloon to the New Territories. Every feed is free on WorldEye.",
      "The district breakdown is the practical part: Yuen Long's 195 feeds and Sha Tin's 153 cover the New Territories' busiest corridors, while Tsuen Wan (121) and Tuen Mun (96) watch the western approaches. If your commute runs Tai Po Road or Kwun Tong Road, those district feeds are your daily check.",
      "Hong Kong's traffic has a rhythm — morning and evening peaks, weekend tunnel runs, and typhoon-season downpours that flood low roads with little warning. The cameras show all of it live, so make them part of the routine before heading out, especially when a storm signal is up.",
    ],
    blurb:
      "Stream 1,350 live cameras across Hong Kong on WorldEye - district-by-district traffic feeds from Yuen Long to Sha Tin, free to watch, day and night.",
    faqs: [
      {
        q: "How many live cameras are there in Hong Kong?",
        a: "WorldEye lists 1,350 live cameras across 12 districts in Hong Kong, one of the densest traffic-camera networks we carry.",
      },
      {
        q: "Which Hong Kong districts have the most cameras?",
        a: "Yuen Long tops the list with 195 feeds, followed by Sha Tin (153), Tsuen Wan (121), and Tuen Mun (96).",
      },
      {
        q: "Are Hong Kong traffic cameras useful for commuting?",
        a: "Yes - the district-level road feeds show live congestion on major routes like Tai Po Road and Kwun Tong Road, so you can check conditions before heading out.",
      },
      {
        q: "Which roads can I check in Hong Kong?",
        a: "Major corridors like Tai Po Road, Kwun Tong Road, and Castle Peak Road are covered, with district feeds from Yuen Long to Sha Tin showing the surrounding streets.",
      },
      {
        q: "Are Hong Kong cameras useful during typhoons?",
        a: "Yes — when a storm hits, the road cameras show flooding, debris, and empty-versus-gridlocked streets in real time, which is exactly when you need to decide whether to travel.",
      },
      {
        q: "Do I need an account to watch?",
        a: "No account is needed to start — all 1,350 Hong Kong feeds can be watched on WorldEye. Your first 5 camera opens on a device are free; add your email for 5 more (10 in total, the same as a verified free account), and paid plans remove the limit. Browsing the directory is always free.",
      },
    ],
  },
  italy: {
    intro: [
      "Italy is a driver's country on WorldEye: 993 cameras across 12 areas, almost all of them pointed at the autostrade. The A1 Milano-Napoli alone carries 268 feeds, with the A14 Bologna-Taranto close behind at 219.",
      "You can follow the country's main arteries live - the A4 toward Brescia, the A13 around Padua, the A8 to Varese - and watch traffic build and clear in real time.",
      "Heading north to south? A quick glance at the feeds beats guessing at congestion. All Italian cameras stream free on WorldEye.",
    ],
    blurb:
      "Watch 993 live cameras across Italy on WorldEye - live autostrada traffic from the A1 Milano-Napoli to the A14 Bologna-Taranto, free live streams.",
    faqs: [
      {
        q: "How many live cameras are there in Italy?",
        a: "WorldEye streams 993 live cameras across 12 areas in Italy, concentrated on the country's motorway network.",
      },
      {
        q: "Which Italian routes have the most cameras?",
        a: "The A1 Milano-Napoli leads with 268 cameras, followed by the A14 Bologna-Taranto (219). The A56 Naples ring road, A4, and A26 add further coverage.",
      },
      {
        q: "Can I check autostrada traffic before driving in Italy?",
        a: "Yes - the feeds sit at interchanges and stretches along the main autostrade, so you can watch live traffic on your route before you leave.",
      },
    ],
  },
  japan: {
    intro: [
      "Japan's 10,472 cameras span 958 areas, led by Osaka with 194 feeds and Sapporo with 184. Tokyo adds 112, and Kyoto, Yokohama, and Hiroshima add to the mix.",
      "Beyond the cities, the network reaches rivers, national highways, and mountain roads - Route 20 through the hills, the Shimanto River mouth, bridges over the Mukunashi River.",
      "It's part traffic tool, part travel preview: check conditions on a highway or simply watch a quiet river scene. All free to stream on WorldEye.",
    ],
    blurb:
      "Explore 10,472 live cameras across Japan on WorldEye - Tokyo and Osaka streets plus rivers, highways, and mountain views, all streaming free, day and night.",
    faqs: [
      {
        q: "How many live cameras are there in Japan?",
        a: "WorldEye lists 10,472 live cameras across 958 areas in Japan, from Tokyo and Osaka to Sapporo and Hiroshima.",
      },
      {
        q: "Which Japanese cities have the most cameras?",
        a: "Osaka has the most with 194 feeds, followed by Sapporo (184) and Tokyo (112).",
      },
      {
        q: "Are Japanese cameras only in Tokyo?",
        a: "No - coverage stretches well beyond the capital, with feeds in Kyoto, Hiroshima, Sapporo, and along national highways and rivers throughout the country.",
      },
    ],
  },
  "united-kingdom": {
    intro: [
      "The United Kingdom's camera map is essentially London's: 887 of the country's 1,403 cameras sit in the capital, spread across 10 areas. Feeds cover major routes like the A406 North Circular, the A12 at the Blackwall Tunnel, and Clapham's A3.",
      "That density makes the UK collection a live traffic board for London - check a junction before you drive or watch the city move in real time, free on WorldEye.",
      "Outside the capital the pickings are thin but real: Manchester Airport and the Isle of Wight carry the few non-London feeds. If you are flying out of Manchester or crossing to the island, those cameras are worth a look — otherwise, this collection is London's.",
      "The London feeds cluster on the routes drivers actually use: the A406 North Circular ringing the north, the A12 feeding the Blackwall Tunnel, the A3 through Clapham. Check your junction before the school run or the evening peak — the cameras show the same congestion the traffic reports describe, live.",
      "All 1,403 feeds are free on WorldEye with no account. Open the map, zoom to London, and tap a marker near your route.",
    ],
    blurb:
      "Watch 1,403 live cameras across the United Kingdom on WorldEye - hundreds of London traffic and street feeds, streaming live and always free to watch.",
    faqs: [
      {
        q: "How many live cameras are there in the United Kingdom?",
        a: "WorldEye streams 1,403 live cameras across 10 areas in the United Kingdom.",
      },
      {
        q: "Is almost all UK camera coverage in London?",
        a: "Yes - 887 of the 1,403 UK cameras are in London. A handful of feeds elsewhere, like Manchester Airport and the Isle of Wight, round out the map.",
      },
      {
        q: "Can I check London traffic live?",
        a: "Yes - the feeds cover major London routes including the A406 North Circular, the A3 through Clapham, and the A12 at the Blackwall Tunnel, showing live traffic conditions.",
      },
      {
        q: "What can I see outside London?",
        a: "Very little — only a handful of feeds, including Manchester Airport and the Isle of Wight. The UK collection is effectively London's traffic camera network.",
      },
      {
        q: "Can I check the Blackwall Tunnel approach live?",
        a: "Yes — the A12 feeds at the Blackwall Tunnel show live conditions on one of London's busiest river crossings, handy before committing to the route.",
      },
      {
        q: "Do I need an account?",
        a: "No account is needed to start — every UK feed can be watched on WorldEye. Your first 5 camera opens on a device are free; add your email for 5 more (10 in total, the same as a verified free account), and paid plans remove the limit. Browsing the directory is always free.",
      },
    ],
  },
  sweden: {
    intro: [
      "Sweden's 886 cameras split neatly between city and mountain. Västra Götaland leads with 361 feeds and Stockholm follows with 335, while Skåne (74) and Halland (43) add regional depth.",
      "Road cameras track motorways and tunnels, but the network also climbs: live views from Sälen's ski slopes and Björkliden in Lapland show real snow conditions.",
      "Winter drivers get live road weather; everyone else gets a window into Swedish landscapes. All 886 feeds are free on WorldEye.",
    ],
    blurb:
      "Stream 886 live cameras across Sweden on WorldEye - Stockholm streets, Götaland highways, and Lapland ski views, free live feeds, day and night.",
    faqs: [
      {
        q: "How many live cameras are there in Sweden?",
        a: "WorldEye lists 886 live cameras across 12 areas in Sweden, from Stockholm and Gothenburg's region to Lapland.",
      },
      {
        q: "Which Swedish areas have the most cameras?",
        a: "Västra Götaland leads with 361 cameras, just ahead of Stockholm (335). Skåne (74) and Halland (43) follow.",
      },
      {
        q: "Are Swedish cameras useful in winter?",
        a: "Yes - motorway and tunnel cameras show live road conditions through the winter, and ski-area feeds at places like Sälen and Björkliden show real snow coverage.",
      },
    ],
  },
  finland: {
    intro: [
      "Finland keeps its network simple: 813 of its 818 cameras are grouped under a single national area, and nearly all of them watch the roads. Feeds follow highways past Lahti, through the Vaalimaa tunnel, and around Tampere.",
      "In a country where winter defines driving, these are working cameras - check live road conditions before a trip, any time of day, free on WorldEye.",
    ],
    blurb:
      "Watch 818 live cameras across Finland on WorldEye - highway feeds with live winter road conditions, streaming free day and night. Watch live, all free.",
    faqs: [
      {
        q: "How many live cameras are there in Finland?",
        a: "WorldEye streams 818 live cameras in Finland, grouped across 6 areas - 813 of them under a single national listing.",
      },
      {
        q: "Where in Finland are the cameras?",
        a: "The network follows the highway system: feeds cover routes around Lahti, the Vaalimaa tunnel near the Russian border, Tampere's Rantatunneli, and points across the country.",
      },
      {
        q: "Can I check Finnish winter road conditions live?",
        a: "Yes - that's what most of these cameras are for. They show live road and weather conditions on the highways, which is essential driving information through Finland's long winter.",
      },
    ],
  },
  iceland: {
    intro: [
      "Iceland's 496 cameras are a road-tripper's toolkit. Spread across 12 small areas, they watch the country's highways, tunnels, and highland routes - from the Héðinsfjörður tunnels in the north to roads around Strandarheiði.",
      "Each area carries just a handful of feeds, but together they trace the routes visitors actually drive, showing live weather and road surface conditions.",
      "Before tackling the Ring Road or a mountain pass, check the cameras. Every Icelandic feed streams free on WorldEye.",
    ],
    blurb:
      "Explore 496 live cameras across Iceland on WorldEye - Ring Road conditions, tunnels, and highland routes, streaming live and free. Check live, all free.",
    faqs: [
      {
        q: "How many live cameras are there in Iceland?",
        a: "WorldEye lists 496 live cameras across 12 areas in Iceland - small clusters covering the country's key road corridors.",
      },
      {
        q: "What do Icelandic cameras show?",
        a: "Mostly roads and tunnels: the Héðinsfjörður tunnels, Bolungarvík tunnels, highland passes like Strandarheiði, and routes around the Ring Road.",
      },
      {
        q: "Can I check Iceland road conditions before driving?",
        a: "Yes - the cameras show live weather and road surface conditions on the routes tourists and locals drive most, making them a practical pre-trip check.",
      },
    ],
  },
  lithuania: {
    intro: [
      "Lithuania runs a compact network of 316 cameras across 12 areas, and it's almost entirely about the roads. Feeds sit at highway junctions along the A1, A5, A7, and A12 corridors, with Vilnius among the named locations.",
      "Small but focused: drivers can check live conditions at key interchanges across the country, from Vilnius out to the border corridors, free on WorldEye.",
    ],
    blurb:
      "Watch 316 live cameras across Lithuania on WorldEye - highway junction feeds along the A1, A5, and A12 corridors, free to stream. Live road views, all free.",
    faqs: [
      {
        q: "How many live cameras are there in Lithuania?",
        a: "WorldEye streams 316 live cameras across 12 areas in Lithuania, concentrated on the national highway network.",
      },
      {
        q: "Where are Lithuania's cameras located?",
        a: "At highway junctions along the A1, A5, A7, and A12 corridors, with feeds around Vilnius and at interchanges like the A5-A7 junction near Marijampolė.",
      },
      {
        q: "Are Lithuanian cameras all traffic cameras?",
        a: "Essentially yes - the feeds are junction and corridor cameras on the main highways, built for checking live road conditions rather than sightseeing.",
      },
    ],
  },
  netherlands: {
    intro: [
      "The Netherlands' 268 cameras lean toward the water. Texel tops the areas with 27 feeds, followed by Harlingen (13), with Ameland and Vlissingen at 8 each - the Frisian islands and the coast are well covered.",
      "Expect beaches, harbors, and waterfront promenades, from Scheveningen's surf pavilion to the Scheldt estuary at Vlissingen, alongside city feeds in Amsterdam and Rotterdam.",
      "It's a network made for watching the weather roll in off the North Sea. All feeds are free on WorldEye.",
    ],
    blurb:
      "Stream 268 live cameras across the Netherlands on WorldEye - Texel shores, Amsterdam streets, and harbour views. Watch the coast live, free.",
    faqs: [
      {
        q: "How many live cameras are there in the Netherlands?",
        a: "WorldEye lists 268 live cameras across 12 areas in the Netherlands, with the strongest coverage on the coast and Frisian islands.",
      },
      {
        q: "Which Dutch areas have the most cameras?",
        a: "Texel leads with 27 cameras, followed by Harlingen (13), then Ameland and Vlissingen (8 each). Amsterdam and Rotterdam add city coverage.",
      },
      {
        q: "Can I watch the Dutch coast live?",
        a: "Yes - coastal feeds include Texel and Ameland beaches, Scheveningen's waterfront, and the Scheldt estuary at Vlissingen, great for checking sea and weather conditions.",
      },
    ],
  },
  australia: {
    intro: [
      "Australia's coverage is concentrated in one place: Sydney. Of 250 cameras across 10 areas, the bulk sit in Sydney's metro zones - SYD_MET alone has 81 feeds, with SYD_NORTH, SYD_WEST, and SYD_SOUTH close behind.",
      "These are working road cameras: the M4 Western Motorway, the M1 Pacific Motorway, and the Hume Highway all stream live, making them a practical traffic check for Sydney drivers, free on WorldEye.",
    ],
    blurb:
      "Watch 250 live cameras across Australia on WorldEye - Sydney motorways and regional highway feeds, streaming free and live. Check Sydney traffic live, all free.",
    faqs: [
      {
        q: "How many live cameras are there in Australia?",
        a: "WorldEye streams 250 live cameras across 10 areas in Australia.",
      },
      {
        q: "Is Australian camera coverage mostly Sydney?",
        a: "Yes - the great majority of feeds are in Sydney's metro and regional zones, with SYD_MET alone carrying 81 cameras.",
      },
      {
        q: "Can I check Sydney motorway traffic live?",
        a: "Yes - feeds cover the M4 Western Motorway, the M1 Pacific Motorway, and the Hume Highway, so you can check live traffic on Sydney's main routes.",
      },
    ],
  },
};

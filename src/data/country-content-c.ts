export type CountryFaq = { q: string; a: string };
export type CountryContent = {
  intro: string[]; // 2-4 short paragraphs
  blurb: string; // meta description, 140-160 chars, unique per country
  faqs: CountryFaq[]; // exactly 3
};

export const countryContentC: Record<string, CountryContent> = {
  "new-zealand": {
    intro: [
      "New Zealand's live camera network on WorldEye runs to 249 cameras, and Auckland does the heavy lifting with 98 of them — streets, harbour views, and motorway feeds around the country's biggest city.",
      "The South Island is well represented too: Canterbury has 78 cameras and Otago 13, covering everything from Christchurch traffic to southern alpine and lake country, while Wellington adds 37 feeds around the capital's harbour and hills.",
      "Smaller clusters in Waikato, the West Coast, Nelson/Marlborough, and the Bay of Plenty round out the map — handy for checking road conditions before a drive, or just watching the weather roll in.",
    ],
    blurb:
      "Watch 249 live cameras across New Zealand on WorldEye — Auckland streets, Wellington harbour, and Canterbury roads, all streaming free, day and night.",
    faqs: [
      {
        q: "How many live cameras are there in New Zealand?",
        a: "WorldEye lists 249 live cameras across New Zealand, spread over 10 regions — from Auckland's motorways to West Coast alpine passes.",
      },
      {
        q: "Which areas in New Zealand have the most cameras?",
        a: "Auckland leads with 98 cameras, followed by Canterbury with 78 and Wellington with 37. Otago, Waikato, and the West Coast make up the next tier.",
      },
      {
        q: "Can I use these cameras to check New Zealand road and weather conditions?",
        a: "Yes. Many feeds cover highways, harbour approaches, and alpine routes, so they're a practical way to eyeball conditions before a trip — all free to watch.",
      },
    ],
  },
  turkey: {
    intro: [
      "With 247 live cameras, Turkey is one of the best-covered countries on WorldEye — and more than half of them, 143, sit in Istanbul, watching over the Bosphorus bridges, the boulevards, and the old city's rooftops.",
      "Beyond Istanbul the network stretches across a dozen areas: Bursa and Balıkesir in the west, Kahramanmaraş in the southeast, and Aegean and Mediterranean coastal feeds at Kaş and Ayvalık.",
      "City traffic and street life dominate the views, while the coastal cameras double as weather windows — useful before a holiday along the Turkish coast.",
    ],
    blurb:
      "Watch 247 live cameras across Turkey on WorldEye — Istanbul's streets and Bosphorus bridges, plus Aegean and Mediterranean coastal towns, free.",
    faqs: [
      {
        q: "How many live cameras are there in Turkey?",
        a: "WorldEye carries 247 live cameras across Turkey, covering 12 areas — the second-largest country collection in this set after New Zealand.",
      },
      {
        q: "Which Turkish cities have the most cameras?",
        a: "Istanbul dominates with 143 cameras. Arnavutköy (16) and Selçuklu (7) are next, with smaller clusters in Bursa, Kahramanmaraş, and Balıkesir.",
      },
      {
        q: "Can I watch Istanbul traffic and the Bosphorus live?",
        a: "Yes — the Istanbul feeds include bridge approaches, boulevards, and waterfront views, streaming free around the clock on WorldEye.",
      },
    ],
  },
  indonesia: {
    intro: [
      "Java is the heart of Indonesia's 197-camera network on WorldEye. Bandung leads with 43 feeds, Yogyakarta follows with 30, and Sleman adds 22 — expect busy intersections, traffic corridors, and street scenes around the clock.",
      "It isn't all city life, though. Gunungkidul (13) sits on the southern coast with beach views, and the network reaches east to Gresik and Krian near Surabaya, plus Jakarta and Tangerang with 5–7 feeds each.",
      "Twelve areas in total, from dense urban junctions to quieter coastal corners — good for checking traffic before heading out, or catching a sunrise over the Indian Ocean.",
    ],
    blurb:
      "Stream 197 live cameras across Indonesia on WorldEye — Bandung and Yogyakarta streets, Java traffic, and Gunungkidul's southern beaches, all free.",
    faqs: [
      {
        q: "How many live cameras are there in Indonesia?",
        a: "WorldEye lists 197 live cameras across Indonesia, spread over 12 areas — most of them on Java, from Bandung to Surabaya's outskirts.",
      },
      {
        q: "Which areas in Indonesia have the most cameras?",
        a: "Bandung leads with 43, followed by Yogyakarta (30) and Sleman (22). Gunungkidul (13) is the top coastal area, with Jakarta and Tangerang behind it.",
      },
      {
        q: "Are there Indonesian beach or island views, not just city traffic?",
        a: "Yes. Gunungkidul's feeds look out over the southern coast, and several areas capture quieter coastal scenes alongside the busy Java city cameras.",
      },
    ],
  },
  vietnam: {
    intro: [
      "Ho Chi Minh City is the undisputed centre of Vietnam's live camera map on WorldEye: 85 of the country's 160 cameras sit there, streaming intersections, boulevards, and the famous motorbike traffic day and night.",
      "The rest of the network is thinner but widespread — Da Nang (3) on the central coast, plus a string of named wards across the south like Ben Nghe, Da Kao, Vo Thi Sau, and Tan Phong, each with a handful of street-level feeds.",
      "All 160 cameras are free to watch, so you can dip into Saigon's rush hour or a quiet Da Nang street whenever you like.",
    ],
    blurb:
      "Watch 160 live cameras across Vietnam on WorldEye — Ho Chi Minh City's motorbike-packed streets and Da Nang's coast, streaming free around the clock.",
    faqs: [
      {
        q: "How many live cameras are there in Vietnam?",
        a: "WorldEye carries 160 live cameras across Vietnam, covering 12 areas — with more than half concentrated in Ho Chi Minh City.",
      },
      {
        q: "Which areas in Vietnam have the most cameras?",
        a: "Ho Chi Minh City leads by a wide margin with 85 cameras. Da Nang, Ben Nghe Ward, and several southern wards each add a few more.",
      },
      {
        q: "Are Vietnam's street cameras free to watch?",
        a: "Yes — every camera on WorldEye's camera layer is free, including all 160 Vietnamese feeds. No account or payment needed.",
      },
    ],
  },
  russia: {
    intro: [
      "Sochi holds the largest share of Russia's 152 live cameras on WorldEye, with 46 feeds around the Black Sea resort city — promenades, beaches, and the mountain roads of the Caucasus foothills nearby.",
      "The network reaches far beyond the coast, though: Astrakhan (18) on the Volga delta, Moscow (7) plus Moskva (3), Novosibirsk (4) in Siberia, Volgograd (3), and the industrial towns of Междуреченск (19) and Мыски (7) — a dozen areas in all.",
      "Winter makes these feeds especially watchable: snow-covered streets and road conditions, with the striking contrast between Sochi's mild coast and Siberia's deep freeze.",
    ],
    blurb:
      "Watch 152 live cameras across Russia on WorldEye — Sochi's Black Sea coast, Moscow streets, and Siberian winter views, all streaming free, day and night.",
    faqs: [
      {
        q: "How many live cameras are there in Russia?",
        a: "WorldEye lists 152 live cameras across Russia, spread over 12 areas — from the Black Sea coast to Siberia.",
      },
      {
        q: "Which areas in Russia have the most cameras?",
        a: "Sochi leads with 46 cameras, followed by Междуреченск (19) and Astrakhan (18). Moscow, Adler, Khosta, and Krasnodar form the next tier.",
      },
      {
        q: "Can I check Russian winter and road conditions on these cameras?",
        a: "Yes — many feeds show snow-covered streets, mountain roads, and city conditions in real time, which is handy for a winter-weather window.",
      },
    ],
  },
  "south-korea": {
    intro: [
      "South Korea's 138 live cameras on WorldEye read like a tour of its biggest cities. Seoul leads with 35 feeds, followed by Busan (17), Incheon (11), and Daegu (9) — dense urban views, traffic corridors, and night-lit streetscapes.",
      "The network fans out across a dozen areas: Gwangju and Changwon in the south, Goyang and Gimpo near the capital, Pohang and Geoje (사등면) on the coast, and the planned city of Sejong.",
      "Coastal cameras in Busan, Pohang, and Geoje catch harbours and sea views; the Seoul and Incheon feeds are the best bet for watching the city's pulse after dark.",
    ],
    blurb:
      "Stream 138 live cameras across South Korea on WorldEye — Seoul's neon streets, Busan's harbour, and coastal views, free to watch anytime, day and night.",
    faqs: [
      {
        q: "How many live cameras are there in South Korea?",
        a: "WorldEye carries 138 live cameras across South Korea, covering 12 areas from Seoul to the southern coast.",
      },
      {
        q: "Which South Korean cities have the most cameras?",
        a: "Seoul leads with 35 cameras, followed by Busan (17), Incheon (11), and Daegu (9). Pohang, Goyang, and Changwon each add 7–8 more.",
      },
      {
        q: "Are South Korea's night city views good on these cameras?",
        a: "Very — the Seoul, Busan, and Incheon feeds stay lively after dark, with neon streetscapes and harbour lights streaming free.",
      },
    ],
  },
  poland: {
    intro: [
      "Poland's 73 live cameras on WorldEye lean heavily toward the Baltic. The top areas read like a summer-holiday itinerary: Wejherowo (8), Władysławowo (7), Reda (5), and the Hel Peninsula villages of Chałupy and Jastarnia (4 each).",
      "The Tricity is covered too — Gdańsk, Gdynia, and Sopot with 3 feeds each — plus Puck (4) on the bay and Gniew (3) inland.",
      "Beaches, piers, and promenades dominate the views, which makes these feeds a natural pre-holiday check on Baltic weather and crowds.",
    ],
    blurb:
      "Watch 73 live cameras across Poland on WorldEye — Baltic beaches, the Hel Peninsula, and Gdańsk, Gdynia, and Sopot, all streaming free, anytime you like.",
    faqs: [
      {
        q: "How many live cameras are there in Poland?",
        a: "WorldEye lists 73 live cameras across Poland, spread over 12 areas — most of them along the Baltic coast.",
      },
      {
        q: "Which areas in Poland have the most cameras?",
        a: "Wejherowo (8) and Władysławowo (7) lead, with Reda (5), Chałupy, Dębki, Jastarnia, and Puck (4 each) close behind. The Tricity adds 3 feeds per city.",
      },
      {
        q: "Can I check Baltic beach weather on the Polish cameras?",
        a: "Yes — the coastal feeds show beaches, piers, and promenades in real time, ideal for checking weather and crowds before a Baltic trip.",
      },
    ],
  },
  thailand: {
    intro: [
      "Island escapes and city streets share Thailand's 60 live cameras on WorldEye. Ko Samui tops the list with 18 feeds of beaches and bays, while Bangkok contributes 10 of traffic, transit corridors, and street life.",
      "Pattaya (3) and Phuket (2) cover the classic resort coasts, with Ko Phangan adding one more island view; inland, Chachoengsao (4), Nakhon Si Thammarat (2), and Khon Kaen (1) round out the dozen areas.",
      "Beach and sea views sit alongside the urban cameras, so you can check the surf in Samui or the rush hour in Bangkok — all free to stream.",
    ],
    blurb:
      "Watch 60 live cameras across Thailand on WorldEye — Ko Samui's beaches, Bangkok's streets, and Phuket's coast, all streaming free, around the clock.",
    faqs: [
      {
        q: "How many live cameras are there in Thailand?",
        a: "WorldEye carries 60 live cameras across Thailand, covering 12 areas — from Gulf islands to Bangkok's streets.",
      },
      {
        q: "Which areas in Thailand have the most cameras?",
        a: "Ko Samui leads with 18 cameras and Bangkok follows with 10. Chachoengsao (4), Pattaya (3), and Phuket (2) make up the next tier.",
      },
      {
        q: "Can I check Thai beach weather before a trip?",
        a: "Yes — the Ko Samui, Phuket, Pattaya, and Ko Phangan feeds show real-time beach and sea conditions, handy for planning around the weather.",
      },
    ],
  },
  norway: {
    intro: [
      "Norway's 48 live cameras on WorldEye run from the fjords to the far north. Geiranger leads with 4 feeds over the famous fjord, while Harstad (3) and Tromsø (2) look out over Arctic waters.",
      "The network covers a dozen areas in all — Lofoten and Bodø, Nordkapp at the top of Europe, Kristiansund and Sandefjord on the southern coast, Sør-Varanger by the eastern border, and Oslo with 2 feeds.",
      "Many double as road and weather windows: mountain passes, ferry routes, and snow conditions — handy before a winter drive, and free to watch.",
    ],
    blurb:
      "Watch 48 live cameras across Norway on WorldEye — Geiranger's fjords, Arctic Tromsø, and mountain road conditions, streaming free, around the clock.",
    faqs: [
      {
        q: "How many live cameras are there in Norway?",
        a: "WorldEye lists 48 live cameras across Norway, spread over 12 areas — from Oslo's streets to Nordkapp at the top of Europe.",
      },
      {
        q: "Which areas in Norway have the most cameras?",
        a: "Geiranger leads with 4 cameras over the fjord. Harstad (3) is next, with Bodø, Kristiansund, Lofoten, Nordkapp, Oslo, Sandefjord, Sør-Varanger, and Tromsø (2 each) behind it.",
      },
      {
        q: "Can I check Norwegian mountain road and snow conditions?",
        a: "Yes — several feeds cover mountain passes, ferry routes, and Arctic roads in real time, making them useful for winter travel planning.",
      },
    ],
  },
  malta: {
    intro: [
      "Malta packs 42 live cameras into one of Europe's smallest countries on WorldEye — a dozen areas across the main island and Gozo, from harbours and marinas to historic town streets.",
      "Cirkewwa (5) watches the Gozo ferry terminal, while Floriana (5) sits beside Valletta's grand harbour; Gzira, St Julian's, and Xemxija (3 each) cover the northern bays, and Marsaxlokk (2) shows the fishing harbour.",
      "With so much coastline per square kilometre, sea views are never far away — ideal for checking the weather before a swim or a crossing to Gozo.",
    ],
    blurb:
      "Watch 42 live cameras across Malta on WorldEye — Valletta's grand harbour, Gozo ferries, and Mediterranean bays, all streaming free, every day.",
    faqs: [
      {
        q: "How many live cameras are there in Malta?",
        a: "WorldEye carries 42 live cameras across Malta, covering 12 areas — a dense network for such a small island nation.",
      },
      {
        q: "Which areas in Malta have the most cameras?",
        a: "Cirkewwa and Floriana lead with 5 cameras each. Birżebbuġa, Gzira, Mellieħa, Paola, St Julian's, and Xemxija each add 3.",
      },
      {
        q: "Can I watch the Gozo ferry crossing on these cameras?",
        a: "The Cirkewwa feeds overlook the Gozo ferry terminal, so you can check sea conditions and harbour activity before a crossing — free to watch.",
      },
    ],
  },
  france: {
    intro: [
      "France's live camera collection on WorldEye is a curated 40 feeds across 12 areas. Paris and Nice lead with 2 each, joined by Marseille, La Rochelle, Sète, and Menton along the coasts.",
      "The selection leans scenic: Porto-Vecchio in Corsica, Aix-les-Bains by its lake, Le Mont-Dore in the Auvergne, and Beaune in Burgundy wine country — more postcard than motorway.",
      "Every feed is free to watch, so you can check Riviera weather, a Paris street, or the mountains before planning a trip.",
    ],
    blurb:
      "Watch 40 live cameras across France on WorldEye — Paris streets, Nice and the Riviera, Corsica, and mountain towns, streaming free any day of the year.",
    faqs: [
      {
        q: "How many live cameras are there in France?",
        a: "WorldEye currently lists 40 live cameras across France, spread over 12 areas — a compact, scenic selection rather than a dense urban grid.",
      },
      {
        q: "Which areas in France have the most cameras?",
        a: "Paris and Nice lead with 2 cameras each. Marseille, La Rochelle, Sète, Menton, Fréjus, and the mountain and wine towns each contribute one.",
      },
      {
        q: "Can I check French Riviera weather on these cameras?",
        a: "Yes — the Nice, Menton, and Fréjus feeds show real-time coastal conditions, handy for planning a Riviera trip around the weather.",
      },
    ],
  },
  romania: {
    intro: [
      "The Carpathians anchor Romania's 37 live cameras on WorldEye. Brașov (5) and Predeal (3) — the country's best-known mountain resorts — lead the count, with Bucharest adding 2 city feeds.",
      "The network spans a dozen areas, from Săcele and Târgoviște in the hills to Brăila and Galați on the Danube, Suceava in the north, and Mamaia (1) on the Black Sea coast.",
      "Winter is the best season here: ski slopes, mountain roads, and snow conditions stream free, alongside year-round city and Danube views.",
    ],
    blurb:
      "Watch 37 live cameras across Romania on WorldEye — Brașov and Predeal ski resorts, Bucharest streets, and the Danube, streaming free any time of year.",
    faqs: [
      {
        q: "How many live cameras are there in Romania?",
        a: "WorldEye lists 37 live cameras across Romania, covering 12 areas — from Carpathian ski resorts to the Danube and the Black Sea coast.",
      },
      {
        q: "Which areas in Romania have the most cameras?",
        a: "Brașov leads with 5 cameras and Predeal follows with 3. Bucharest and Săcele (2 each) are next, with the Danube towns and Mamaia behind them.",
      },
      {
        q: "Can I check Romanian ski and mountain road conditions?",
        a: "Yes — the Brașov and Predeal feeds cover slopes and mountain roads in real time, useful for checking snow conditions before heading up.",
      },
    ],
  },
  brazil: {
    intro: [
      "Brazil's 36 live cameras on WorldEye stretch from famous beaches to the Amazon. Balneário Camboriú and Rio de Janeiro top the list with 4 feeds each, while Manaus (3) brings the rainforest gateway into view.",
      "The dozen areas span the coast — Guarujá, Porto Seguro, Santos, Boqueirão — plus inland spots like Santa Fe do Sul, Sobradinho, Aparecida, and the capital Brasília.",
      "Beach and promenade views dominate, making these feeds a sunny window on Brazil — all free to stream, any time of year.",
    ],
    blurb:
      "Watch 36 live cameras across Brazil on WorldEye — Rio's beaches, Balneário Camboriú's promenade, and Manaus, all streaming free every day of the year.",
    faqs: [
      {
        q: "How many live cameras are there in Brazil?",
        a: "WorldEye carries 36 live cameras across Brazil, covering 12 areas — from Atlantic beaches to the Amazon gateway at Manaus.",
      },
      {
        q: "Which areas in Brazil have the most cameras?",
        a: "Balneário Camboriú and Rio de Janeiro lead with 4 cameras each, followed by Manaus (3). Guarujá, Porto Seguro, Santos, and Santa Fe do Sul add 2 each.",
      },
      {
        q: "Are Brazil's beach cameras free to watch?",
        a: "Yes — all 36 Brazilian feeds, from Rio's shoreline to Porto Seguro's beaches, stream free on WorldEye's camera layer.",
      },
    ],
  },
  bulgaria: {
    intro: [
      "Bulgaria's 35 live cameras on WorldEye hug the Black Sea. Primorsko, Nesebar (Несебър), Kiten, and Tsarevo — classic summer resorts — share the spotlight with Burgas, while Sofia adds 2 capital feeds.",
      "Dimitrovgrad (3) is the inland outlier in an otherwise coastal list, with Osenets, Gabarevo, and Topola filling out the dozen areas.",
      "Summer feeds show beaches and promenades; winter brings a quieter coast — all free to watch whenever you like.",
    ],
    blurb:
      "Watch 35 live cameras across Bulgaria on WorldEye — Black Sea resorts like Nesebar and Primorsko, plus Sofia, all streaming free, around the clock.",
    faqs: [
      {
        q: "How many live cameras are there in Bulgaria?",
        a: "WorldEye lists 35 live cameras across Bulgaria, covering 12 areas — most of them along the Black Sea coast.",
      },
      {
        q: "Which areas in Bulgaria have the most cameras?",
        a: "Dimitrovgrad and Primorsko lead with 3 cameras each. Sofia, Burgas, Nesebar (Несебър), Kiten, and Tsarevo each add 2.",
      },
      {
        q: "Can I check Black Sea beach weather on the Bulgarian cameras?",
        a: "Yes — the Primorsko, Nesebar, Kiten, Tsarevo, and Burgas feeds show real-time beach conditions, ideal before a summer trip.",
      },
    ],
  },
  croatia: {
    intro: [
      "Croatia's 29 live cameras on WorldEye are almost all Adriatic. The island of Krk leads with 4 feeds, Split adds 3 over the Dalmatian coast, and Mali Lošinj and Rabac (2 each) cover the northern islands.",
      "The dozen areas run from Crikvenica and Malinska on the Kvarner Gulf to Bol, Brodarica, and Barban in Istria — with Karlovac and Marija Bistrica as the inland exceptions.",
      "Harbour and sea views dominate, ideal for checking the weather before a sailing trip or simply watching the Adriatic — free to stream.",
    ],
    blurb:
      "Watch 29 live cameras across Croatia on WorldEye — Krk island, Split's coast, and Adriatic harbours, all streaming free every day, from anywhere.",
    faqs: [
      {
        q: "How many live cameras are there in Croatia?",
        a: "WorldEye carries 29 live cameras across Croatia, covering 12 areas — nearly all of them on the Adriatic coast or islands.",
      },
      {
        q: "Which areas in Croatia have the most cameras?",
        a: "Krk leads with 4 cameras, followed by Split (3). Mali Lošinj and Rabac (2 each) are next, with the Kvarner and Istrian towns behind them.",
      },
      {
        q: "Can I check Adriatic sailing weather on the Croatian cameras?",
        a: "Yes — the harbour and island feeds show real-time sea conditions around Krk, Lošinj, and the Dalmatian coast, handy before heading out on the water.",
      },
    ],
  },
};

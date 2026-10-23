/**
 * Build the ski-resort directory (src/data/ski-resorts.json) from the same
 * generated per-country camera chunks the country pages serve
 * (src/data/countries/<slug>.json).
 *
 * The candidate list below is real, named resorts with their base-area
 * coordinates (public geography). A candidate only becomes a page when the
 * served catalogue actually covers it: at least one camera within
 * RESORT_RADIUS_KM of the base and at least MIN_TOTAL cameras within
 * NEARBY_RADIUS_KM. Counts in the output are computed here, never written
 * by hand, so a resort page cannot claim cameras the catalogue lacks.
 * Candidates closer than CLOSE_PAIR_KM to each other (Alta/Snowbird,
 * Park City/Deer Valley) collapse to the better-covered one — two pages
 * over the same camera set would be one page wearing two hats.
 *
 * Usage: node tools/build-ski-resorts.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

export const RESORT_RADIUS_KM = 10;
export const NEARBY_RADIUS_KM = 40;
export const MIN_TOTAL = 4;
export const CLOSE_PAIR_KM = 6;

/* name, town, region (state/province/canton), country, country chunk slug,
   base-area latitude, longitude. */
const CANDIDATES = [
  // ── United States ──────────────────────────────────────────────────
  ['Vail', 'Vail', 'Colorado', 'United States', 'united-states', 39.6403, -106.3742],
  ['Aspen', 'Aspen', 'Colorado', 'United States', 'united-states', 39.1911, -106.8175],
  ['Breckenridge', 'Breckenridge', 'Colorado', 'United States', 'united-states', 39.4817, -106.0384],
  ['Keystone', 'Keystone', 'Colorado', 'United States', 'united-states', 39.6069, -105.9437],
  ['Arapahoe Basin', 'Arapahoe Basin', 'Colorado', 'United States', 'united-states', 39.6425, -105.8717],
  ['Copper Mountain', 'Copper Mountain', 'Colorado', 'United States', 'united-states', 39.5017, -106.1578],
  ['Winter Park', 'Winter Park', 'Colorado', 'United States', 'united-states', 39.8917, -105.7631],
  ['Steamboat', 'Steamboat Springs', 'Colorado', 'United States', 'united-states', 40.4572, -106.8045],
  ['Telluride', 'Telluride', 'Colorado', 'United States', 'united-states', 37.9375, -107.8123],
  ['Crested Butte', 'Crested Butte', 'Colorado', 'United States', 'united-states', 38.8999, -106.9658],
  ['Park City', 'Park City', 'Utah', 'United States', 'united-states', 40.6461, -111.498],
  ['Deer Valley', 'Park City', 'Utah', 'United States', 'united-states', 40.6375, -111.4783],
  ['Snowbird', 'Little Cottonwood Canyon', 'Utah', 'United States', 'united-states', 40.583, -111.654],
  ['Alta', 'Little Cottonwood Canyon', 'Utah', 'United States', 'united-states', 40.5884, -111.637],
  ['Brighton', 'Big Cottonwood Canyon', 'Utah', 'United States', 'united-states', 40.598, -111.5832],
  ['Snowbasin', 'Huntsville', 'Utah', 'United States', 'united-states', 41.2166, -111.8568],
  ['Jackson Hole', 'Teton Village', 'Wyoming', 'United States', 'united-states', 43.5875, -110.8279],
  ['Mammoth Mountain', 'Mammoth Lakes', 'California', 'United States', 'united-states', 37.6503, -118.9845],
  ['Palisades Tahoe', 'Olympic Valley', 'California', 'United States', 'united-states', 39.1966, -120.2357],
  ['Heavenly', 'South Lake Tahoe', 'California', 'United States', 'united-states', 38.9393, -119.9106],
  ['Big Sky', 'Big Sky', 'Montana', 'United States', 'united-states', 45.2856, -111.4014],
  ['Sun Valley', 'Ketchum', 'Idaho', 'United States', 'united-states', 43.697, -114.3525],
  ['Mt. Bachelor', 'Bend', 'Oregon', 'United States', 'united-states', 43.9795, -121.6856],
  ['Crystal Mountain', 'Crystal Mountain', 'Washington', 'United States', 'united-states', 46.9356, -121.4745],
  ['Stevens Pass', 'Skykomish', 'Washington', 'United States', 'united-states', 47.7448, -121.0859],
  ['Taos Ski Valley', 'Taos Ski Valley', 'New Mexico', 'United States', 'united-states', 36.5966, -105.453],
  ['Killington', 'Killington', 'Vermont', 'United States', 'united-states', 43.6045, -72.8201],
  ['Stowe', 'Stowe', 'Vermont', 'United States', 'united-states', 44.5303, -72.7814],
  ['Sugarloaf', 'Carrabassett Valley', 'Maine', 'United States', 'united-states', 45.0534, -70.3133],
  ['Whiteface', 'Lake Placid', 'New York', 'United States', 'united-states', 44.3659, -73.9026],
  // ── Canada ─────────────────────────────────────────────────────────
  ['Whistler Blackcomb', 'Whistler', 'British Columbia', 'Canada', 'canada', 50.1163, -122.9574],
  ['Sunshine Village', 'Banff', 'Alberta', 'Canada', 'canada', 51.1152, -115.7631],
  ['Lake Louise', 'Lake Louise', 'Alberta', 'Canada', 'canada', 51.4254, -116.1773],
  ['Revelstoke', 'Revelstoke', 'British Columbia', 'Canada', 'canada', 50.9584, -118.214],
  ['Mont Tremblant', 'Mont-Tremblant', 'Quebec', 'Canada', 'canada', 46.2095, -74.5852],
  // ── The Alps & Europe ──────────────────────────────────────────────
  ['Chamonix', 'Chamonix-Mont-Blanc', 'Haute-Savoie', 'France', 'france', 45.9237, 6.8694],
  ["Val d'Isère", "Val d'Isère", 'Savoie', 'France', 'france', 45.448, 6.9802],
  ['Courchevel', 'Courchevel', 'Savoie', 'France', 'france', 45.4154, 6.6347],
  ['Zermatt', 'Zermatt', 'Valais', 'Switzerland', 'switzerland', 46.0207, 7.7491],
  ['St. Moritz', 'St. Moritz', 'Graubünden', 'Switzerland', 'switzerland', 46.4908, 9.7748],
  ['Verbier', 'Verbier', 'Valais', 'Switzerland', 'switzerland', 46.0966, 7.2286],
  ['Davos', 'Davos', 'Graubünden', 'Switzerland', 'switzerland', 46.8027, 9.836],
  ['St. Anton am Arlberg', 'St. Anton am Arlberg', 'Tyrol', 'Austria', 'austria', 47.1286, 10.2646],
  ['Kitzbühel', 'Kitzbühel', 'Tyrol', 'Austria', 'austria', 47.4444, 12.3914],
  ['Sölden', 'Sölden', 'Tyrol', 'Austria', 'austria', 46.9655, 11.0068],
  ["Cortina d'Ampezzo", "Cortina d'Ampezzo", 'Belluno', 'Italy', 'italy', 46.4102, 12.1357],
  ['Val Gardena', 'Ortisei', 'South Tyrol', 'Italy', 'italy', 46.5597, 11.7598],
  ['Cervinia', 'Breuil-Cervinia', 'Aosta Valley', 'Italy', 'italy', 45.9344, 7.6313],
  ['Sierra Nevada', 'Pradollano', 'Granada', 'Spain', 'spain', 37.096, -3.3927],
  ['Geilo', 'Geilo', 'Buskerud', 'Norway', 'norway', 60.5345, 8.2077],
  ['Hemsedal', 'Hemsedal', 'Buskerud', 'Norway', 'norway', 60.8633, 8.514],
  // ── Japan ──────────────────────────────────────────────────────────
  ['Niseko', 'Kutchan', 'Hokkaido', 'Japan', 'japan', 42.8628, 140.7043],
  ['Hakuba', 'Hakuba', 'Nagano', 'Japan', 'japan', 36.698, 137.8619],
  ['Nozawa Onsen', 'Nozawa Onsen', 'Nagano', 'Japan', 'japan', 36.9236, 138.4514],
  ['Furano', 'Furano', 'Hokkaido', 'Japan', 'japan', 43.3248, 142.3934],
  // ── Southern hemisphere ────────────────────────────────────────────
  ['Queenstown', 'Queenstown', 'Otago', 'New Zealand', 'new-zealand', -45.0312, 168.6626],
  ['Mt Hutt', 'Methven', 'Canterbury', 'New Zealand', 'new-zealand', -43.4689, 171.5253],
  ['Thredbo', 'Thredbo', 'New South Wales', 'Australia', 'australia', -36.5041, 148.3056],
  ['Perisher', 'Perisher Valley', 'New South Wales', 'Australia', 'australia', -36.4053, 148.4106],
  // ── Wave 2 expansion candidates (geocoded via OSM Nominatim, Oct 2026) ──
  ['Beaver Creek', 'Beaver Creek', 'Colorado', 'United States', 'united-states', 39.5946527, -106.5254355],
  ['Snowmass', 'Snowmass Village', 'Colorado', 'United States', 'united-states', 39.1857183, -106.9448525],
  ['Monarch Mountain', 'Garfield', 'Colorado', 'United States', 'united-states', 38.5522265, -106.2945246],
  ['Wolf Creek', 'Wolf Creek Ski Area', 'Colorado', 'United States', 'united-states', 37.2768889, -106.9853627],
  ['Eldora', 'Nederland', 'Colorado', 'United States', 'united-states', 39.9569742, -105.5215208],
  ['Powderhorn', 'Mesa', 'Colorado', 'United States', 'united-states', 39.0585257, -108.1536108],
  ['Powder Mountain', 'Eden', 'Utah', 'United States', 'united-states', 41.3065399, -111.828629],
  ['Brian Head', 'Brian Head', 'Utah', 'United States', 'united-states', 37.6906696, -112.8514385],
  ['Sundance', 'Sundance', 'Utah', 'United States', 'united-states', 40.3913503, -111.5783591],
  ['Grand Targhee', 'Alta', 'Wyoming', 'United States', 'united-states', 43.7849766, -110.9469857],
  ['Whitefish Mountain', 'Whitefish', 'Montana', 'United States', 'united-states', 48.4810828, -114.3578504],
  ['Bridger Bowl', 'Bozeman', 'Montana', 'United States', 'united-states', 45.7033552, -111.0261859],
  ['Red Lodge Mountain', 'Red Lodge', 'Montana', 'United States', 'united-states', 45.2043777, -109.2576095],
  ['Schweitzer', 'Sandpoint', 'Idaho', 'United States', 'united-states', 48.3091706, -116.5548465],
  ['Brundage Mountain', 'McCall', 'Idaho', 'United States', 'united-states', 44.9297551, -116.1434561],
  ['Tamarack', 'Donnelly', 'Idaho', 'United States', 'united-states', 44.6700061, -116.1225024],
  ['Bogus Basin', 'Boise', 'Idaho', 'United States', 'united-states', 43.7706312, -116.0908882],
  ['Silver Mountain', 'Kellogg', 'Idaho', 'United States', 'united-states', 47.5208841, -116.1262426],
  ['Northstar California', 'Truckee', 'California', 'United States', 'united-states', 39.2916736, -120.1158844],
  ['Kirkwood', 'Kirkwood', 'California', 'United States', 'united-states', 38.6828457, -120.067102],
  ['Sugar Bowl', 'Norden', 'California', 'United States', 'united-states', 39.3134977, -120.3324829],
  ['June Mountain', 'June Lake', 'California', 'United States', 'united-states', 37.7548206, -119.0692464],
  ['Bear Valley', 'Bear Valley', 'California', 'United States', 'united-states', 38.469835, -120.0512919],
  ['Hoodoo', 'Sisters', 'Oregon', 'United States', 'united-states', 44.4085767, -121.871369],
  ['Mt. Baker', 'Glacier', 'Washington', 'United States', 'united-states', 48.8911856, -121.9556506],
  ['White Pass', 'White Pass', 'Washington', 'United States', 'united-states', 46.6447429, -121.3830164],
  ['Diamond Peak', 'Incline Village', 'Nevada', 'United States', 'united-states', 39.2547079, -119.9141164],
  ['Ski Santa Fe', 'Santa Fe', 'New Mexico', 'United States', 'united-states', 35.7911754, -105.7902289],
  ['Angel Fire', 'Angel Fire', 'New Mexico', 'United States', 'united-states', 36.4202441, -105.2910646],
  ['Red River', 'Red River', 'New Mexico', 'United States', 'united-states', 36.7065592, -105.4069601],
  ['Alyeska', 'Girdwood', 'Alaska', 'United States', 'united-states', 60.9608164, -149.1091216],
  ['Jay Peak', 'Jay', 'Vermont', 'United States', 'united-states', 44.9387926, -72.5067222],
  ['Sugarbush', 'Warren', 'Vermont', 'United States', 'united-states', 44.1515207, -72.9084672],
  ['Smugglers\' Notch', 'Jeffersonville', 'Vermont', 'United States', 'united-states', 44.6435046, -72.8305438],
  ['Stratton Mountain', 'Stratton', 'Vermont', 'United States', 'united-states', 43.0862628, -72.9248879],
  ['Mount Snow', 'Dover', 'Vermont', 'United States', 'united-states', 42.9264545, -72.8653203],
  ['Okemo', 'Ludlow', 'Vermont', 'United States', 'united-states', 43.3958533, -72.7534796],
  ['Cannon Mountain', 'Franconia', 'New Hampshire', 'United States', 'united-states', 44.1566923, -71.6986205],
  ['Loon Mountain', 'Lincoln', 'New Hampshire', 'United States', 'united-states', 44.034872, -71.6206874],
  ['Bretton Woods', 'Bretton Woods', 'New Hampshire', 'United States', 'united-states', 44.2496141, -71.4659572],
  ['Waterville Valley', 'Waterville Valley', 'New Hampshire', 'United States', 'united-states', 43.9592801, -71.5082639],
  ['Wildcat Mountain', 'Jackson', 'New Hampshire', 'United States', 'united-states', 44.25888889, -71.20138889],
  ['Sunday River', 'Newry', 'Maine', 'United States', 'united-states', 44.4718276, -70.8672899],
  ['Saddleback', 'Rangeley', 'Maine', 'United States', 'united-states', 44.9742181, -70.6487261],
  ['Gore Mountain', 'North Creek', 'New York', 'United States', 'united-states', 43.6817138, -74.0191763],
  ['Hunter Mountain', 'Hunter', 'New York', 'United States', 'united-states', 42.1778662, -74.2304216],
  ['Holiday Valley', 'Ellicottville', 'New York', 'United States', 'united-states', 42.2631454, -78.6636114],
  ['Snowshoe', 'Snowshoe', 'West Virginia', 'United States', 'united-states', 38.4128243, -79.9964421],
  ['Wintergreen', 'Wintergreen', 'Virginia', 'United States', 'united-states', 37.9176075, -78.9395348],
  ['Sugar Mountain', 'Banner Elk', 'North Carolina', 'United States', 'united-states', 36.1418303, -81.8717572],
  ['Crystal Mountain (Michigan)', 'Thompsonville', 'Michigan', 'United States', 'united-states', 44.5193074, -85.9906893],
  ['Lutsen Mountains', 'Lutsen', 'Minnesota', 'United States', 'united-states', 47.6559901, -90.7250636],
  ['Granite Peak', 'Wausau', 'Wisconsin', 'United States', 'united-states', 44.928725, -89.6826506],
  ['Kicking Horse', 'Golden', 'British Columbia', 'Canada', 'canada', 51.2847845, -117.0645874],
  ['Panorama Mountain', 'Panorama', 'British Columbia', 'Canada', 'canada', 50.4419511, -116.2124247],
  ['Big White', 'Kelowna', 'British Columbia', 'Canada', 'canada', 49.7379086, -118.9459084],
  ['SilverStar', 'Vernon', 'British Columbia', 'Canada', 'canada', 50.2639201, -119.2705097],
  ['Sun Peaks', 'Sun Peaks', 'British Columbia', 'Canada', 'canada', 50.8937342, -119.8926416],
  ['Red Mountain', 'Rossland', 'British Columbia', 'Canada', 'canada', 49.0914742, -117.8210956],
  ['Cypress Mountain', 'West Vancouver', 'British Columbia', 'Canada', 'canada', 49.3976802, -123.2011443],
  ['Grouse Mountain', 'North Vancouver', 'British Columbia', 'Canada', 'canada', 49.3794719, -123.0767805],
  ['Marmot Basin', 'Jasper', 'Alberta', 'Canada', 'canada', 52.795432, -118.1060908],
  ['Nakiska', 'Kananaskis', 'Alberta', 'Canada', 'canada', 50.9425033, -115.1517202],
  ['Castle Mountain', 'Pincher Creek', 'Alberta', 'Canada', 'canada', 49.2836, -114.3119],
  ['Mont Sainte-Anne', 'Beaupré', 'Quebec', 'Canada', 'canada', 47.0874373, -70.9320238],
  ['Le Massif', 'Petite-Rivière-Saint-François', 'Quebec', 'Canada', 'canada', 47.2796204, -70.5981718],
  ['Stoneham', 'Stoneham-et-Tewkesbury', 'Quebec', 'Canada', 'canada', 47.1560868, -71.2598603],
  ['Blue Mountain (Ontario)', 'The Blue Mountains', 'Ontario', 'Canada', 'canada', 44.5007563, -80.3179068],
  ['Méribel', 'Les Allues', 'Savoie', 'France', 'france', 45.3897277, 6.568471],
  ['Les Deux Alpes', 'Les Deux Alpes', 'Isère', 'France', 'france', 45.0088852, 6.1550426],
  ['Alpe d\'Huez', 'Huez', 'Isère', 'France', 'france', 45.092401, 6.0699443],
  ['Tignes', 'Tignes', 'Savoie', 'France', 'france', 45.4675077, 6.9064274],
  ['La Plagne', 'La Plagne Tarentaise', 'Savoie', 'France', 'france', 45.5042986, 6.7049123],
  ['Les Arcs', 'Bourg-Saint-Maurice', 'Savoie', 'France', 'france', 45.5665113, 6.8355725],
  ['Avoriaz', 'Morzine', 'Haute-Savoie', 'France', 'france', 46.1925439, 6.7702857],
  ['Megève', 'Megève', 'Haute-Savoie', 'France', 'france', 45.8577347, 6.6167098],
  ['La Clusaz', 'La Clusaz', 'Haute-Savoie', 'France', 'france', 45.883562, 6.4196911],
  ['Serre Chevalier', 'La Salle-les-Alpes', 'Hautes-Alpes', 'France', 'france', 44.9318019, 6.5478391],
  ['Chamrousse', 'Chamrousse', 'Isère', 'France', 'france', 45.126209, 5.8769694],
  ['Engelberg-Titlis', 'Engelberg', 'Obwalden', 'Switzerland', 'switzerland', 46.7939374, 8.3929199],
  ['Crans-Montana', 'Crans-Montana', 'Valais', 'Switzerland', 'switzerland', 46.34026, 7.5034817],
  ['Saas-Fee', 'Saas-Fee', 'Valais', 'Switzerland', 'switzerland', 46.0837126, 7.9054659],
  ['Grindelwald-Wengen', 'Grindelwald', 'Bern', 'Switzerland', 'switzerland', 46.5985827, 7.9621818],
  ['Laax', 'Laax', 'Graubünden', 'Switzerland', 'switzerland', 46.849618, 9.2171807],
  ['Andermatt-Sedrun', 'Andermatt', 'Uri', 'Switzerland', 'switzerland', 46.7030019, 8.8186489],
  ['Adelboden-Lenk', 'Adelboden', 'Bern', 'Switzerland', 'switzerland', 46.462958, 7.5161584],
  ['Gstaad', 'Gstaad', 'Bern', 'Switzerland', 'switzerland', 46.4750908, 7.2841394],
  ['Ischgl', 'Ischgl', 'Tyrol', 'Austria', 'austria', 47.0246544, 10.3078097],
  ['Mayrhofen', 'Mayrhofen', 'Tyrol', 'Austria', 'austria', 47.1650907, 11.7241105],
  ['Zell am See-Kaprun', 'Kaprun', 'Salzburg', 'Austria', 'austria', 47.2839876, 12.7533421],
  ['Saalbach-Hinterglemm', 'Saalbach', 'Salzburg', 'Austria', 'austria', 47.3845256, 12.6112898],
  ['Schladming', 'Schladming', 'Styria', 'Austria', 'austria', 47.3915547, 13.6851915],
  ['Bad Gastein', 'Bad Gastein', 'Salzburg', 'Austria', 'austria', 47.1117714, 13.1319224],
  ['Obertauern', 'Obertauern', 'Salzburg', 'Austria', 'austria', 47.2497898, 13.540725],
  ['Lech am Arlberg', 'Lech', 'Vorarlberg', 'Austria', 'austria', 47.2070289, 10.1378077],
  ['Serfaus-Fiss-Ladis', 'Serfaus', 'Tyrol', 'Austria', 'austria', 47.0495139, 10.5729763],
  ['Madonna di Campiglio', 'Madonna di Campiglio', 'Trentino', 'Italy', 'italy', 46.2319871, 10.8262567],
  ['Livigno', 'Livigno', 'Lombardy', 'Italy', 'italy', 46.5288561, 10.1320332],
  ['Bormio', 'Bormio', 'Lombardy', 'Italy', 'italy', 46.4621355, 10.3724437],
  ['Courmayeur', 'Courmayeur', 'Aosta Valley', 'Italy', 'italy', 45.7874248, 6.9730618],
  ['Sestriere', 'Sestriere', 'Piedmont', 'Italy', 'italy', 44.9641264, 6.8948969],
  ['Alta Badia', 'Corvara', 'South Tyrol', 'Italy', 'italy', 46.5646703, 11.9102193],
  ['Kronplatz', 'Brunico', 'South Tyrol', 'Italy', 'italy', 46.7418826, 11.9785592],
  ['Val di Fassa', 'Canazei', 'Trentino', 'Italy', 'italy', 46.4489728, 11.6987026],
  ['Garmisch-Partenkirchen', 'Garmisch-Partenkirchen', 'Bavaria', 'Germany', 'germany', 47.4915407, 11.0970176],
  ['Oberstdorf', 'Oberstdorf', 'Bavaria', 'Germany', 'germany', 47.4108291, 10.277638],
  ['Winterberg', 'Winterberg', 'North Rhine-Westphalia', 'Germany', 'germany', 51.1990382, 8.5323923],
  ['Feldberg', 'Feldberg', 'Baden-Württemberg', 'Germany', 'germany', 47.8739912, 8.0046735],
  ['Baqueira-Beret', 'Baqueira', 'Lleida', 'Spain', 'spain', 42.6988865, 0.9347175],
  ['Formigal', 'Formigal', 'Huesca', 'Spain', 'spain', 42.7738918, -0.3542693],
  ['Cerler', 'Cerler', 'Huesca', 'Spain', 'spain', 42.5858004, 0.5448232],
  ['La Molina', 'Alp', 'Girona', 'Spain', 'spain', 42.3445181, 1.955812],
  ['Trysil', 'Trysil', 'Innlandet', 'Norway', 'norway', 61.315145, 12.2638609],
  ['Hafjell', 'Øyer', 'Innlandet', 'Norway', 'norway', 61.2532138, 10.5107383],
  ['Kvitfjell', 'Ringebu', 'Innlandet', 'Norway', 'norway', 61.4738292, 10.1299229],
  ['Oppdal', 'Oppdal', 'Trøndelag', 'Norway', 'norway', 62.5951546, 9.6896436],
  ['Voss', 'Voss', 'Vestland', 'Norway', 'norway', 60.6286944, 6.4147445],
  ['Åre', 'Åre', 'Jämtland', 'Sweden', 'sweden', 63.4010888, 13.0822241],
  ['Sälen', 'Sälen', 'Dalarna', 'Sweden', 'sweden', 61.1716771, 12.9662206],
  ['Idre Fjäll', 'Idre', 'Dalarna', 'Sweden', 'sweden', 61.8894, 12.83152],
  ['Levi', 'Kittilä', 'Lapland', 'Finland', 'finland', 67.7856163, 24.8481636],
  ['Ruka', 'Kuusamo', 'North Ostrobothnia', 'Finland', 'finland', 66.1702656, 29.1311291],
  ['Ylläs', 'Kolari', 'Lapland', 'Finland', 'finland', 67.5512437, 24.2550084],
  ['Pyhä', 'Pelkosenniemi', 'Lapland', 'Finland', 'finland', 67.0269786, 27.2222154],
  ['Vuokatti', 'Sotkamo', 'Kainuu', 'Finland', 'finland', 64.1474856, 28.2739163],
  ['Tahko', 'Kuopio', 'North Savo', 'Finland', 'finland', 63.2914052, 28.0374578],
  ['Zakopane', 'Zakopane', 'Lesser Poland', 'Poland', 'poland', 49.3007678, 19.9630396],
  ['Szczyrk', 'Szczyrk', 'Silesia', 'Poland', 'poland', 49.6964912, 19.0109469],
  ['Białka Tatrzańska', 'Białka Tatrzańska', 'Lesser Poland', 'Poland', 'poland', 49.3837338, 20.1073232],
  ['Krynica-Zdrój', 'Krynica-Zdrój', 'Lesser Poland', 'Poland', 'poland', 49.4096311, 20.9571479],
  ['Špindlerův Mlýn', 'Špindlerův Mlýn', 'Hradec Králové', 'Czechia', 'czechia', 50.7438595, 15.6459055],
  ['Pec pod Sněžkou', 'Pec pod Sněžkou', 'Hradec Králové', 'Czechia', 'czechia', 50.7053212, 15.704471],
  ['Klínovec', 'Loučná pod Klínovcem', 'Karlovy Vary', 'Czechia', 'czechia', 50.3957681, 12.9693677],
  ['Jasná', 'Demänovská Dolina', 'Žilina', 'Slovakia', 'slovakia', 48.9681926, 19.582088],
  ['Štrbské Pleso', 'Štrba', 'Prešov', 'Slovakia', 'slovakia', 49.1191897, 20.063955],
  ['Kranjska Gora', 'Kranjska Gora', 'Upper Carniola', 'Slovenia', 'slovenia', 46.485132, 13.7843957],
  ['Krvavec', 'Cerklje na Gorenjskem', 'Upper Carniola', 'Slovenia', 'slovenia', 46.2996823, 14.5367454],
  ['Vogel', 'Ukanc', 'Upper Carniola', 'Slovenia', 'slovenia', 46.2578343, 13.8355948],
  ['Bansko', 'Bansko', 'Blagoevgrad', 'Bulgaria', 'bulgaria', 41.8344086, 23.4841698],
  ['Borovets', 'Borovets', 'Sofia', 'Bulgaria', 'bulgaria', 42.2668301, 23.6074324],
  ['Pamporovo', 'Pamporovo', 'Smolyan', 'Bulgaria', 'bulgaria', 41.6517608, 24.6948671],
  ['Poiana Brașov', 'Brașov', 'Brașov', 'Romania', 'romania', 45.5967098, 25.5561895],
  ['Sinaia', 'Sinaia', 'Prahova', 'Romania', 'romania', 45.3525713, 25.5528278],
  ['Parnassos', 'Arachova', 'Phocis', 'Greece', 'greece', 38.4831694, 22.574353],
  ['Kalavryta', 'Kalavryta', 'Achaea', 'Greece', 'greece', 38.0333853, 22.1103931],
  ['Uludağ', 'Bursa', 'Bursa', 'Turkey', 'turkey', 40.0705295, 29.2220098],
  ['Erciyes', 'Kayseri', 'Kayseri', 'Turkey', 'turkey', 38.5587245, 35.4777953],
  ['Palandöken', 'Erzurum', 'Erzurum', 'Turkey', 'turkey', 39.9318929, 41.1714826],
  ['Kartalkaya', 'Bolu', 'Bolu', 'Turkey', 'turkey', 40.5902528, 31.8080349],
  ['Gudauri', 'Gudauri', 'Mtskheta-Mtianeti', 'Georgia', 'georgia', 42.5090776, 44.49684],
  ['Bakuriani', 'Bakuriani', 'Samtskhe-Javakheti', 'Georgia', 'georgia', 41.7351238, 43.5559356],
  ['Shymbulak', 'Almaty', 'Almaty', 'Kazakhstan', 'kazakhstan', 43.1284757, 77.0813878],
  ['Kopaonik', 'Kopaonik', 'Raška', 'Serbia', 'serbia', 43.2966597, 20.8337087],
  ['Jahorina', 'Pale', 'Republika Srpska', 'Bosnia and Herzegovina', 'bosnia-and-herzegovina', 43.7570578, 18.594954],
  ['Glenshee', 'Braemar', 'Aberdeenshire', 'United Kingdom', 'united-kingdom', 57.0047468, -3.3964206],
  ['Cairngorm', 'Aviemore', 'Highland', 'United Kingdom', 'united-kingdom', 57.2009395, -3.8201963],
  ['Glencoe', 'Glencoe', 'Highland', 'United Kingdom', 'united-kingdom', 56.6871729, -5.0996811],
  ['Hlíðarfjall', 'Akureyri', 'Northeastern Region', 'Iceland', 'iceland', 65.6633423, -18.2135956],
  ['Rusutsu', 'Rusutsu', 'Hokkaido', 'Japan', 'japan', 42.7309325, 140.9196695],
  ['Tomamu', 'Shimukappu', 'Hokkaido', 'Japan', 'japan', 43.0702436, 142.6114495],
  ['Appi Kogen', 'Hachimantai', 'Iwate', 'Japan', 'japan', 39.9872412, 140.9582652],
  ['Zao Onsen', 'Yamagata', 'Yamagata', 'Japan', 'japan', 38.1613172, 140.4077354],
  ['Shiga Kogen', 'Yamanouchi', 'Nagano', 'Japan', 'japan', 36.7330511, 138.4316714],
  ['Myoko Kogen', 'Myoko', 'Niigata', 'Japan', 'japan', 36.8722009, 138.2121958],
  ['Naeba', 'Yuzawa', 'Niigata', 'Japan', 'japan', 36.7950245, 138.7787563],
  ['Coronet Peak', 'Queenstown', 'Otago', 'New Zealand', 'new-zealand', -44.9158907, 168.7395712],
  ['The Remarkables', 'Queenstown', 'Otago', 'New Zealand', 'new-zealand', -45.0820122, 168.7973254],
  ['Cardrona', 'Wanaka', 'Otago', 'New Zealand', 'new-zealand', -44.7106575, 169.1366342],
  ['Treble Cone', 'Wanaka', 'Otago', 'New Zealand', 'new-zealand', -44.634, 168.896],
  ['Falls Creek', 'Falls Creek', 'Victoria', 'Australia', 'australia', -36.8675534, 147.2742489],
  ['Mount Buller', 'Mount Buller', 'Victoria', 'Australia', 'australia', -37.1481104, 146.4384243],
  ['Mount Hotham', 'Hotham Heights', 'Victoria', 'Australia', 'australia', -36.9820855, 147.1427233],
  ['Valle Nevado', 'Santiago', 'Santiago', 'Chile', 'chile', -33.3922515, -70.5152356],
  ['Portillo', 'Los Andes', 'Valparaíso', 'Chile', 'chile', -32.8364183, -70.1290835],
  ['Nevados de Chillán', 'Chillán', 'Ñuble', 'Chile', 'chile', -36.613844, -72.0718055],
  ['Cerro Catedral', 'Bariloche', 'Río Negro', 'Argentina', 'argentina', -41.166895, -71.4642673],
  ['Cerro Chapelco', 'San Martín de los Andes', 'Neuquén', 'Argentina', 'argentina', -40.2044884, -71.2766622],
  ['Las Leñas', 'Malargüe', 'Mendoza', 'Argentina', 'argentina', -35.1467089, -70.0800761],
  ['Cerro Castor', 'Ushuaia', 'Tierra del Fuego', 'Argentina', 'argentina', -54.7237339, -68.0178212],
  ['Yongpyong Resort', 'Daegwallyeong', 'Pyeongchang', 'South Korea', 'south-korea', 37.6281511, 128.6777287],
  ['High1 Resort', 'Gohan', 'Jeongseon', 'South Korea', 'south-korea', 37.1939141, 128.8293505],
  ['Phoenix Snow Park', 'Bongpyeong', 'Pyeongchang', 'South Korea', 'south-korea', 37.5789188, 128.3178445],
  ['Jisan Forest Resort', 'Icheon', 'Gyeonggi', 'South Korea', 'south-korea', 37.2137, 127.34099],
  ['Muju Deogyusan Resort', 'Muju', 'North Jeolla', 'South Korea', 'south-korea', 35.8892975, 127.745163],
];

function slugify(name) {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function haversineKm(aLat, aLng, bLat, bLng) {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

const chunkCache = new Map();
function loadChunk(slug) {
  if (!chunkCache.has(slug)) {
    try {
      chunkCache.set(slug, JSON.parse(readFileSync(join(ROOT, 'src/data/countries', `${slug}.json`), 'utf8')));
    } catch {
      chunkCache.set(slug, []);
    }
  }
  return chunkCache.get(slug);
}

const scored = [];
for (const [name, town, region, country, countrySlug, lat, lng] of CANDIDATES) {
  const records = loadChunk(countrySlug);
  let resortCameras = 0;
  let nearbyCameras = 0;
  for (const cam of records) {
    if (typeof cam.lat !== 'number' || typeof cam.lng !== 'number') continue;
    const d = haversineKm(lat, lng, cam.lat, cam.lng);
    if (d <= RESORT_RADIUS_KM) resortCameras += 1;
    else if (d <= NEARBY_RADIUS_KM) nearbyCameras += 1;
  }
  scored.push({ name, town, region, country, countrySlug, lat, lng, resortCameras, nearbyCameras });
}

/* Coverage gate: a page exists only where the catalogue backs it. */
const covered = scored.filter(
  (r) => r.resortCameras >= 1 && r.resortCameras + r.nearbyCameras >= MIN_TOTAL,
);

/* Close pairs share one camera set; keep the better-covered page. */
covered.sort((a, b) => b.resortCameras - a.resortCameras);
const kept = [];
const dropped = [];
for (const r of covered) {
  const twin = kept.find((k) => haversineKm(k.lat, k.lng, r.lat, r.lng) < CLOSE_PAIR_KM);
  if (twin) dropped.push(`${r.name} (within ${CLOSE_PAIR_KM} km of ${twin.name}, fewer resort cameras)`);
  else kept.push(r);
}

kept.sort((a, b) => b.resortCameras + b.nearbyCameras - (a.resortCameras + a.nearbyCameras));

const out = {
  generatedAt: new Date().toISOString(),
  resortRadiusKm: RESORT_RADIUS_KM,
  nearbyRadiusKm: NEARBY_RADIUS_KM,
  resorts: kept.map((r) => ({
    slug: slugify(r.name),
    name: r.name,
    town: r.town,
    region: r.region,
    country: r.country,
    countrySlug: r.countrySlug,
    lat: r.lat,
    lng: r.lng,
    resortCameraCount: r.resortCameras,
    nearbyCameraCount: r.nearbyCameras,
  })),
};

writeFileSync(join(ROOT, 'src/data/ski-resorts.json'), `${JSON.stringify(out, null, 1)}\n`);

console.log(`candidates: ${CANDIDATES.length}`);
console.log(`covered:    ${covered.length}`);
console.log(`kept:       ${kept.length}`);
for (const r of kept) {
  console.log(`  ${r.name.padEnd(22)} resort ${String(r.resortCameras).padStart(4)}  nearby ${String(r.nearbyCameras).padStart(4)}`);
}
for (const r of scored) {
  if (!covered.includes(r)) console.log(`  ✗ ${r.name}: resort ${r.resortCameras}, nearby ${r.nearbyCameras} — below the coverage gate`);
}
for (const d of dropped) console.log(`  ✗ dropped close pair: ${d}`);

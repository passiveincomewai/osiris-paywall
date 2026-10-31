/**
 * Spanish pricing dictionary — IN-HOUSE DRAFT translation of
 * dictionaries/en/pricing.ts (2026-10-26; not yet professionally
 * reviewed — see the build REPORT). Prices, per-day figures and
 * discount percentages are copied unchanged (USD); trial terms match
 * src/lib/billing/trials.ts: semanal 3 días gratis, mensual y anual
 * 10 días gratis; Enterprise no tiene prueba.
 *
 * Re-synced 2026-10-30 for the Pricing Redesign Phase C 3-tier grid
 * (Lite / Pro / Ultra × semanal / mensual / anual): same restructure
 * as the English source — `plansGrid`, `tiers`, `liteFeatures`, the
 * truthful annual savings (58.3% / 55.3% / 50.0%) and the retired
 * weekly-equivalent discount claims removed here too.
 *
 * Re-synced 2026-10-31 (site-audit Wave 2, R26): `vipFeatures` gained
 * the VIP hub trio — Alertas de eventos, Resumen personal y Vistas
 * guardadas (hasta 25) — mirroring the English source.
 */

import type { PricingCopy } from "../en/pricing";

export const esPricing: PricingCopy = {
  meta: {
    title: "Precios — Planes Free, Lite, Pro, Ultra y Enterprise",
    description:
      "Precios de WorldEye: el globo en vivo, 74.229 cámaras y el seguimiento de vuelos son gratis para siempre. Tres niveles de pago — Lite ($4.99/semana, $8.99/mes, $44.99/año), Pro ($7.99/semana, $13.99/mes, $74.99/año) y Ultra ($12.99/semana, $24.99/mes, $149.99/año) — con una prueba gratuita de 3 días en los planes semanales y de 10 días en los mensuales y anuales. Enterprise — la API de cámaras y la inserción — cuesta $999/año. Cancela cuando quieras.",
    ogTitle: "Precios — Planes Free, Lite, Pro, Ultra y Enterprise | WorldEye",
    ogDescription:
      "El globo en vivo, 74.229 cámaras y el seguimiento de vuelos son gratis para siempre. Lite desde $4.99/semana, Pro desde $7.99/semana, Ultra desde $12.99/semana: todos los planes empiezan con una prueba gratuita. Cámaras Enterprise $999/año. Cancela cuando quieras.",
  },
  schemaFreeOfferDescription:
    "Gratis para siempre: el globo en vivo, 74.229 cámaras, seguimiento de vuelos y satélites, clima, terremotos y búsqueda básica. No necesitas cuenta.",
  backToMap: "Volver al mapa",
  proBadge: "PRO",
  hero: {
    h1Before: "Descubre lo que el ",
    h1Accent: "mapa gratuito",
    h1After: " no puede mostrarte.",
    sub: "Un analista de IA que trabaja el globo por ti. Tráfico en vivo. Filtros de búsqueda avanzados. Feeds de inteligencia premium en el nivel superior. Elige tu nivel y mejóralo cuando quieras.",
  },
  toggle: {
    mostPopular: "EL MÁS POPULAR",
  },
  plans: {
    weekly: {
      name: "Semanal",
      price: "$7.99",
      per: "/semana",
      perDay: "$1.14",
      note: "3 días gratis, luego facturación semanal · cancela cuando quieras",
      cta: "Empezar prueba gratis de 3 días",
      trial: "3 días gratis",
    },
    monthly: {
      name: "Mensual",
      price: "$13.99",
      per: "/mes",
      perDay: "$0.47",
      note: "10 días gratis, luego facturación mensual · cancela cuando quieras",
      cta: "Empezar prueba gratis de 10 días",
      trial: "10 días gratis",
    },
    annual: {
      name: "VIP Pro",
      price: "$74.99",
      per: "/año",
      perDay: "$0.21",
      note: "10 días gratis, luego facturación anual · cancela cuando quieras",
      save: "Ahorra 55.3%",
      cta: "Empezar prueba gratis de 10 días",
      trial: "10 días gratis",
    },
    enterprise: {
      name: "Enterprise",
      price: "$999",
      per: "/año",
      perDay: "$2.74",
      note: "Facturación anual · cancela cuando quieras",
      cta: "Obtener Enterprise",
    },
  },
  plansGrid: {
    lite_weekly: {
      name: "Lite",
      price: "$4.99",
      per: "/semana",
      perDay: "$0.71",
      note: "3 días gratis, luego facturación semanal · cancela cuando quieras",
      cta: "Empezar prueba gratis de 3 días",
      trial: "3 días gratis",
    },
    lite_monthly: {
      name: "Lite",
      price: "$8.99",
      per: "/mes",
      perDay: "$0.30",
      note: "10 días gratis, luego facturación mensual · cancela cuando quieras",
      cta: "Empezar prueba gratis de 10 días",
      trial: "10 días gratis",
    },
    lite_annual: {
      name: "Lite",
      price: "$44.99",
      per: "/año",
      perDay: "$0.12",
      note: "10 días gratis, luego facturación anual · cancela cuando quieras",
      save: "Ahorra 58.3%",
      cta: "Empezar prueba gratis de 10 días",
      trial: "10 días gratis",
    },
    ultra_weekly: {
      name: "Ultra",
      price: "$12.99",
      per: "/semana",
      perDay: "$1.86",
      note: "3 días gratis, luego facturación semanal · cancela cuando quieras",
      cta: "Empezar prueba gratis de 3 días",
      trial: "3 días gratis",
    },
    ultra_monthly: {
      name: "Ultra",
      price: "$24.99",
      per: "/mes",
      perDay: "$0.83",
      note: "10 días gratis, luego facturación mensual · cancela cuando quieras",
      cta: "Empezar prueba gratis de 10 días",
      trial: "10 días gratis",
    },
    ultra_annual: {
      name: "Ultra",
      price: "$149.99",
      per: "/año",
      perDay: "$0.41",
      note: "10 días gratis, luego facturación anual · cancela cuando quieras",
      save: "Ahorra 50.0%",
      cta: "Empezar prueba gratis de 10 días",
      trial: "10 días gratis",
    },
  },
  tiers: {
    lite: {
      name: "Lite",
      tagline: "Lo esencial, desbloqueado: todas las cámaras, las capas premium y el asistente de IA.",
    },
    pro: {
      name: "Pro",
      tagline: "El kit completo: OSINT, alertas de cámara y espacio para grabar.",
    },
    ultra: {
      name: "Ultra",
      tagline: "Todo lo de Pro, más feeds de inteligencia, timelapse y los límites más altos.",
    },
    annualBadge: "VIP",
    periods: { weekly: "Semanal", monthly: "Mensual", annual: "Anual" },
  },
  card: {
    proLabel: "PRO",
    vipProLabel: "VIP PRO",
    justPerDayBefore: "Solo ",
    justPerDayAfter: " al día",
    trialChipSuffix: " — aún no se cobra tu tarjeta",
    vipOnlyHeading: "EXTRAS DE ULTRA",
    securedLine: "Pago seguro con Stripe · Cancela cuando quieras · Cancelación en 1 clic",
    guaranteeLine:
      "Cubierto por una garantía de devolución de 7 días en tu primer cargo: escríbenos dentro de los 7 días del cargo y te reembolsamos todo, sin preguntas.",
  },
  liteFeatures: [
    { title: "Todas las cámaras, sin límite", desc: "Mira tantas de las 74.229 cámaras en vivo como quieras: los planes de pago no tienen límite de aperturas." },
    { title: "Capas premium del mapa", desc: "Flujo de tráfico en vivo, líneas marítimas, tráfico naval y feeds de noticias en vivo sobre el globo." },
    { title: "Asistente de IA OI", desc: "Habla con el mapa. Pronósticos, análisis y reconocimiento, con la IA integrada de WorldEye y sin configurar nada." },
    { title: "Filtros de búsqueda avanzados", desc: "Reduce los resultados de cámaras por país, tipo y feeds en vivo; los lugares nunca se filtran." },
    { title: "Estudio de grabación de cámaras", desc: "Graba feeds de cámaras en vivo directamente en tu navegador — hasta 5 cámaras a la vez — y guarda los clips." },
    { title: "Modo Ambiente incluido", desc: "El reproductor ambiental de TV lenta también queda desbloqueado: no necesitas un plan Ambient aparte." },
  ],
  proFeatures: [
    { title: "Asistente de IA OI", desc: "Habla con el mapa. Pronósticos, análisis y reconocimiento, con la IA integrada de WorldEye y sin configurar nada." },
    { title: "Capa de tráfico en vivo", desc: "Flujo de congestión en vivo de TomTom sobre la red de carreteras, con los vehículos simulados claramente etiquetados como simulados." },
    { title: "Kit de herramientas OSINT", desc: "Escaneos Nmap, DNS/WHOIS, análisis SSL e inteligencia de amenazas, en el navegador." },
    { title: "Estudio de grabación de cámaras", desc: "Graba feeds de cámaras en vivo directamente en tu navegador y guarda los clips." },
    { title: "Alertas de cámara (2)", desc: "Vigila hasta 2 cámaras y recibe un correo — con la foto — cuando aparezca una condición que describas, como nieve o inundaciones." },
    { title: "Cada capa futura", desc: "Los nuevos feeds premium llegan primero a Pro, sin costo extra." },
  ],
  vipFeatures: [
    { title: "Feeds de inteligencia premium", desc: "Ciberamenazas, eventos GDELT, seguimiento marítimo, zonas de conflicto, noticias en vivo: solo Ultra." },
    { title: "Timelapse de cámaras", desc: "Captura las cámaras de instantáneas fotograma a fotograma y exporta la película: solo Ultra." },
    { title: "Alertas de cámara (10)", desc: "El límite de alertas sube a 10 cámaras vigiladas; Pro incluye 2." },
    { title: "Alertas de eventos", desc: "Terremotos cerca de tus lugares, recordatorios de lanzamientos y pasos de la ISS: por correo y en la app, comprobados cada ~15 minutos, en el centro VIP." },
    { title: "Resumen personal", desc: "Un resumen creado desde tu cuenta: tus eventos de alerta, terremotos cerca de tus lugares vigilados, el mejor paso de la ISS y las próximas 48 horas de lanzamientos, en el centro VIP o en tu correo cada mañana." },
    { title: "Vistas guardadas", desc: "Nombra y guarda hasta 25 configuraciones del globo — un conjunto de capas y una cámara opcional — y restaura cualquiera con un clic, en el centro VIP." },
  ],
  enterprise: {
    eyebrow: "ENTERPRISE",
    features: [
      "Todo lo de Pro, para todo tu equipo",
      "Colecciones de cámaras personalizadas: crea tus propios conjuntos desde el catálogo",
      "Reproductor de cámaras en vivo integrable en tu sitio web",
      "Feed de datos privado (JSON) de tus colecciones",
      "Acceso opcional por API con tus propias claves",
      "Soporte prioritario al cliente",
      "Ayuda de integración: te ayudamos a conectar el reproductor o el feed en tu plataforma",
    ],
    guaranteeLine:
      "Cubierto por una garantía de devolución de 7 días en tu primer cargo: escríbenos dentro de los 7 días del cargo y te reembolsamos todo, sin preguntas.",
    supportLine: "Preguntas o ayuda de integración: passiveincomewai@gmail.com",
    dashboardLink: "¿Ya eres Enterprise? Abre tu panel de feeds de cámaras →",
    securedByStripe: "Pago seguro con Stripe",
  },
  comparison: {
    h2Before: "Lo gratuito es generoso. ",
    h2Accent: "Ultra es la foto completa.",
    featureHeader: "FUNCIÓN",
    freeHeader: "FREE",
    liteHeader: "LITE",
    proHeader: "PRO",
    ultraHeader: "ULTRA",
    rows: [
      "Globo 3D interactivo",
      "Seguimiento de vuelos en vivo y seguimiento de aeronaves",
      "74.229 cámaras CCTV públicas",
      "Seguimiento de satélites y del espacio",
      "Búsqueda básica: vuela a cualquier lugar",
      "Vehículos de transporte en vivo (15 agencias)",
      "Seguimiento de lanzamientos espaciales y cuentas atrás",
      "Capa de fotos a nivel de calle",
      "Radar, rayos, huracanes y perímetros de incendios",
      "Medidores de ríos y sistemas de bicicletas compartidas",
      "Efectos de sensores",
      "Director cinematográfico (gratis para afiliados)",
      "Terremotos, incendios y clima",
      "Asistente de IA OI (IA integrada incluida)",
      "Vista de imágenes satelitales",
      "Capa de tráfico en vivo (congestión de TomTom)",
      "Filtros de búsqueda avanzados",
      "Kit de herramientas OSINT (nmap, DNS, WHOIS, SSL)",
      "Estudio de grabación de cámaras",
      "Alertas de cámara (2 en Pro · 10 en Ultra)",
      "Cada futura capa Pro",
      "Feeds de inteligencia premium (ciber, GDELT, marítimo, noticias en vivo)",
      "Timelapse de cámaras",
    ],
    noteBefore: "El Director cinematográfico no es una función de ningún plan: es gratis para los miembros del ",
    noteLink: "programa de afiliados",
    noteAfter: " con cualquier plan, Free o Pro.",
    choosePro: "Elegir Pro",
  },
  faqHeading: "Preguntas, respondidas.",
  faqs: [
    {
      q: "¿Cuánto cuesta WorldEye?",
      a: "El mapa en sí es gratis: el globo, 74.229 cámaras, vuelos, satélites y el clima, sin necesidad de cuenta. Los planes de pago tienen tres niveles, cada uno con facturación semanal, mensual o anual: Lite cuesta $4.99/semana, $8.99/mes o $44.99/año; Pro cuesta $7.99/semana, $13.99/mes o $74.99/año; Ultra cuesta $12.99/semana, $24.99/mes o $149.99/año. Los planes semanales empiezan con una prueba gratuita de 3 días; los mensuales y anuales, con una de 10 días. Enterprise — la API de cámaras y la inserción para tu propia plataforma — cuesta $999/año y no tiene prueba gratuita. Todos los planes de pago se pueden cancelar en cualquier momento, y los primeros cargos tienen una garantía de devolución de 7 días.",
    },
    {
      q: "¿El mapa es realmente gratis?",
      a: "Sí. El globo 3D, los vuelos en vivo, 74.229 cámaras callejeras, los satélites, el transporte, el seguimiento de lanzamientos, las fotos a nivel de calle, la búsqueda básica y las capas de riesgos naturales son gratis para siempre, sin cuenta ni tarjeta. Lite elimina los límites de apertura de cámaras y desbloquea las capas premium, el asistente de IA, la búsqueda avanzada y el estudio de grabación. Pro añade el kit OSINT y las alertas de cámara. Ultra añade los feeds de inteligencia premium y el timelapse de cámaras, con los límites de alertas y grabación más altos.",
    },
    {
      q: "¿Necesito mi propia clave API para el asistente de IA?",
      a: "No. OI funciona con la IA integrada de WorldEye, sin configurar nada: no tienes que traer una clave API, ni una cuenta de otro proveedor, ni nadie más te factura por separado. Si prefieres usar tu propia cuenta de modelos, puedes añadir tu clave API en los ajustes de OI: permanece en tu navegador y se usa siempre que esté presente.",
    },
    {
      q: "¿Puedo cancelar cuando quiera?",
      a: "Cuando quieras, con un clic. Tu acceso Pro continúa hasta el final del período que ya pagaste —semanal, mensual o anual— y después simplemente se detiene. Sin llamadas de retención ni patrones oscuros. Y en una prueba gratis nunca se te cobra durante la prueba: cancela antes de que termine y no pagas nada.",
    },
    {
      q: "¿Y si olvido cancelar? ¿Puedo pedir un reembolso?",
      a: "Te escribimos antes del primer cargo de tu prueba, así que no debería tomarte por sorpresa. Y si aun así pasa: tu primer cargo está cubierto por una garantía de devolución de 7 días — escríbenos a passiveincomewai@gmail.com dentro de los 7 días del cargo y te reembolsamos todo, sin preguntas. La garantía cubre solo tu primer cargo; los cargos de renovación no son reembolsables bajo ella.",
    },
    {
      q: "¿Qué pasa si cambio de plan?",
      a: "Las mejoras se aplican de inmediato, con el prorrateo gestionado por Stripe. Las rebajas de plan entran en vigor al final de tu período actual.",
    },
    {
      q: "¿En qué se diferencia de la versión gratuita autohospedada?",
      a: "El mismo motor de código abierto, más los niveles de pago: un analista de IA que trabaja el mapa por ti, tráfico en vivo, filtros de búsqueda avanzados y —en Ultra— los feeds de inteligencia premium que el sitio gratuito no restringe, porque allí no hay puerta. Aquí, los niveles financian la infraestructura.",
    },
  ],
  compareTeasers: {
    heading: "¿Comparando tus opciones?",
    intro:
      "La mayoría de las herramientas de este sector hace una cosa bien. Estas comparativas honestas y verificadas muestran dónde gana WorldEye — y dónde el especialista es la mejor opción.",
    links: [
      { label: "WorldEye vs Windy — modelos de pronóstico frente a cámaras terrestres en vivo", href: "/compare/windy" },
      { label: "WorldEye vs SkylineWebcams — directorio de webcams frente a globo de cámaras", href: "/compare/skylinewebcams" },
      { label: "WorldEye vs Flightradar24 — especialista en vuelos frente a globo todo en uno", href: "/compare/flightradar24" },
    ],
    allLabel: "Todas las comparaciones →",
  },
  trust: [
    "Cancelación en 1 clic",
    "Garantía de devolución de 7 días en tu primer cargo",
    "Pago seguro con Stripe",
    "Sin anuncios, sin venta de datos",
  ],
};

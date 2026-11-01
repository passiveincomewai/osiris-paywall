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
 *
 * Re-synced 2026-10-31 (site-audit Wave 3, R55): `faqs` gained the
 * promo-code, code-stacking and post-cancellation data entries,
 * mirroring the English source.
 *
 * Re-synced 2026-11-01 (Pricing Redesign v2): hero eyebrow + feature
 * strip, card trust row + detail links, why-upgrade row, `planDetails`
 * copy for /pricing/lite|pro|ultra, and the single money-back mention,
 * mirroring the English source.
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
    eyebrow: "INTELIGENCIA GLOBAL. IMPACTO REAL.",
    h1Before: "Descubre la ",
    h1Accent: "imagen completa.",
    h1After: "",
    sub: "El mapa es gratis. Un plan de pago elimina los límites: un analista de IA que trabaja el globo por ti, tráfico en vivo, búsqueda avanzada, el estudio de grabación — y, en el nivel superior, los feeds de inteligencia premium.",
  },
  heroFeatures: [
    { title: "74.229 cámaras en vivo", desc: "Todas las cámaras públicas en un solo globo" },
    { title: "Datos en tiempo real", desc: "Vuelos, satélites, barcos y clima, en vivo" },
    { title: "Análisis de IA OI", desc: "Un analista que trabaja el mapa por ti" },
    { title: "Alertas e inteligencia", desc: "Alertas de cámara y feeds de inteligencia premium" },
  ],
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
    trustRow: ["Sin cargo hoy", "Pago seguro con Stripe", "Cancelación en 1 clic"],
    detailsBefore: "Ver todo lo de ",
    detailsAfter: " →",
    guaranteeLine:
      "Cubierto por una garantía de devolución de 7 días en tu primer cargo: escríbenos dentro de los 7 días del cargo y te reembolsamos todo, sin preguntas.",
  },
  liteFeatures: [
    { title: "Todas las cámaras, sin límite", desc: "Mira tantas de las 74.229 cámaras en vivo como quieras: los planes de pago no tienen límite de aperturas." },
    { title: "Capas premium del mapa", desc: "Flujo de tráfico modelado, líneas marítimas, tráfico naval y feeds de noticias en vivo sobre el globo." },
    { title: "Asistente de IA OI", desc: "Habla con el mapa. Pronósticos, análisis y reconocimiento, con la IA integrada de WorldEye y sin configurar nada." },
    { title: "Filtros de búsqueda avanzados", desc: "Reduce los resultados de cámaras por país, tipo y feeds en vivo; los lugares nunca se filtran." },
    { title: "Estudio de grabación de cámaras", desc: "Graba feeds de cámaras en vivo directamente en tu navegador — hasta 5 cámaras a la vez — y guarda los clips." },
    { title: "Modo Ambiente incluido", desc: "El reproductor ambiental de TV lenta también queda desbloqueado: no necesitas un plan Ambient aparte." },
  ],
  proFeatures: [
    { title: "Asistente de IA OI", desc: "Habla con el mapa. Pronósticos, análisis y reconocimiento, con la IA integrada de WorldEye y sin configurar nada." },
    { title: "Capa de tráfico en vivo", desc: "Tráfico modelado sobre la red de carreteras: vehículos modelados a partir de datos de carreteras, claramente etiquetados como modelados; el flujo de tráfico en vivo no está disponible actualmente." },
    { title: "Kit de herramientas OSINT", desc: "Escaneos Nmap, DNS/WHOIS, análisis SSL e inteligencia de amenazas, en el navegador." },
    { title: "Estudio de grabación de cámaras", desc: "Graba feeds de cámaras en vivo directamente en tu navegador y guarda los clips." },
    { title: "Alertas de cámara (2)", desc: "Vigila hasta 2 cámaras y recibe un correo — con la foto — cuando aparezca una condición que describas, como nieve o inundaciones." },
    { title: "Aperturas de cámara ilimitadas", desc: "El límite de aperturas de cámara del nivel gratuito desaparece: abre tantas cámaras como quieras." },
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
    supportLine: "Preguntas o ayuda de integración: contact@worldeye.app",
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
      "Capa de tráfico en vivo (congestión modelada)",
      "Filtros de búsqueda avanzados",
      "Kit de herramientas OSINT (nmap, DNS, WHOIS, SSL)",
      "Estudio de grabación de cámaras",
      "Alertas de cámara (2 en Pro · 10 en Ultra)",
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
      a: "El mapa en sí es gratis: el globo, 74.229 cámaras, vuelos, satélites y el clima, sin necesidad de cuenta. Los planes de pago tienen tres niveles, cada uno con facturación semanal, mensual o anual: Lite cuesta $4.99/semana, $8.99/mes o $44.99/año; Pro cuesta $7.99/semana, $13.99/mes o $74.99/año; Ultra cuesta $12.99/semana, $24.99/mes o $149.99/año. Los planes semanales empiezan con una prueba gratuita de 3 días; los mensuales y anuales, con una de 10 días. Enterprise — la API de cámaras y la inserción para tu propia plataforma — cuesta $999/año y no tiene prueba gratuita. Todos los planes de pago se pueden cancelar en cualquier momento.",
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
      q: "¿Qué pasa con mis grabaciones y mis datos guardados si cancelo?",
      a: "Cancelar detiene las renovaciones futuras: no elimina tu cuenta ni tus datos. Tu acceso de pago continúa hasta el final del período que ya pagaste, y después tu cuenta simplemente vuelve al nivel gratuito. Los clips que grabas se guardan en tu navegador, en tu propio dispositivo, así que permanecen ahí pase lo que pase con tu plan. Y puedes descargar todo lo que WorldEye guarda de tu cuenta —perfil, ajustes, cámaras guardadas, reglas de alertas y tu lista de grabaciones— en JSON o CSV desde la sección Tus datos de Ajustes, antes o después de cancelar.",
    },
    {
      q: "¿Y si olvido cancelar? ¿Puedo pedir un reembolso?",
      a: "Te escribimos antes del primer cargo de tu prueba, así que no debería tomarte por sorpresa. Y si aun así pasa: escríbenos a contact@worldeye.app dentro de los 7 días de tu primer cargo y te lo reembolsamos todo, sin preguntas. El reembolso cubre solo tu primer cargo; los cargos de renovación no son reembolsables bajo él.",
    },
    {
      q: "¿Tienen un código promocional?",
      a: "Sí: WELCOME50 es nuestro código de bienvenida permanente. Introdúcelo al pagar y te descuenta el 50% de tu primer pago, en cualquier plan. Es un solo uso por cliente, solo en el primer pago, y las pruebas gratuitas siguen empezando gratis.",
    },
    {
      q: "¿Puedo combinar códigos promocionales u otras ofertas?",
      a: "No: los códigos no se acumulan. Un código de descuento no se puede combinar con otras ofertas a menos que WorldEye indique lo contrario, así que WELCOME50 y el código personal de un afiliado no se pueden usar juntos en la misma compra. Usa el que más te ahorre; en cualquier caso, el descuento se aplica solo a tu primer pago.",
    },
    {
      q: "¿Qué pasa si cambio de plan?",
      a: "Las mejoras se aplican de inmediato, con el prorrateo gestionado por Stripe. Las rebajas de plan entran en vigor al final de tu período actual.",
    },
    {
      q: "¿En qué se diferencia de la versión gratuita autohospedada?",
      a: "El mismo motor de código abierto, más los niveles de pago: un analista de IA que trabaja el mapa por ti, tráfico en vivo, filtros de búsqueda avanzados y —en Ultra— los feeds de inteligencia premium que el sitio gratuito no restringe, porque allí no hay puerta. Aquí, los niveles financian la infraestructura.",
    },
    {
      q: "¿Cuánto dura la prueba gratuita?",
      a: "Los planes semanales empiezan con una prueba gratuita de 3 días; los mensuales y anuales, con una de 10 días. Nunca se te cobra durante la prueba: cancela antes de que termine y no pagas nada.",
    },
    {
      q: "¿Cuál es la diferencia entre Lite, Pro y Ultra?",
      a: "Lite cuesta $4.99/semana, $8.99/mes o $44.99/año: graba hasta 5 cámaras a la vez, sin reglas de alertas de cámara. Pro cuesta $7.99/semana, $13.99/mes o $74.99/año: grabación de 20 cámaras y 2 reglas de alertas, además del kit OSINT. Ultra cuesta $12.99/semana, $24.99/mes o $149.99/año: grabación de 40 cámaras, 10 reglas de alertas, timelapse de cámaras y los feeds de inteligencia premium. Los tres eliminan los límites de apertura de cámaras del nivel gratuito.",
    },
    {
      q: "¿Cuántas cámaras puedo ver?",
      a: "El directorio reúne 74.229 cámaras públicas, y ninguna está bloqueada por nivel: cualquier cámara del directorio se puede abrir con cualquier plan. El nivel gratuito incluye una asignación de aperturas de cámaras; Lite, Pro y Ultra eliminan los límites de apertura, así que puedes ver sin límite. Lo que cambian los planes es la grabación y las alertas: graba 5 cámaras a la vez en Lite, 20 en Pro y 40 en Ultra, con reglas de alertas de cámara: ninguna en Lite, 2 en Pro y 10 en Ultra.",
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
    "Correo recordatorio antes de tu primer cargo",
    "Pago seguro con Stripe",
    "Sin anuncios, sin venta de datos",
  ],
  whyUpgrade: {
    h2Before: "¿Por qué mejorar a ",
    h2Accent: "Pro?",
    items: [
      { title: "Analista de IA OI", desc: "Una IA que vuela el globo, lee las capas y responde — integrada, sin configurar nada." },
      { title: "Alertas de cámara", desc: "Vigila hasta 2 cámaras en Pro, 10 en Ultra — y recibe la foto por correo cuando aparezca tu condición." },
      { title: "Estudio de grabación", desc: "Graba feeds de cámaras en vivo en tu navegador — 5 cámaras a la vez en Lite, 20 en Pro, 40 en Ultra." },
      { title: "Feeds de inteligencia premium", desc: "Ciberamenazas, eventos GDELT, marítimo y noticias en vivo — solo Ultra." },
    ],
  },
  showcase: {
    h2Before: "Cada captura aquí es ",
    h2Accent: "el sitio real.",
    sub: "Sin maquetas ni fotos de stock — son capturas del propio WorldEye, las mismas pantallas que desbloquean los planes.",
    items: [
      {
        src: "/landing/oi-assist.jpg",
        alt: "El panel del asistente OI abierto en el globo de WorldEye",
        title: "Asistente de IA OI",
        desc: "El analista integrado, abierto en el globo: pide un lugar y OI vuela hasta él, cambia las capas y marca lo que está en vivo. Sin configurar nada, sin claves tuyas.",
      },
      {
        src: "/landing/camera-viewer.jpg",
        alt: "Una cámara de autopista en vivo abierta en el visor de WorldEye, con su panel de grabación",
        title: "El visor de cámaras",
        desc: "Cada cámara se abre a pantalla completa así — un feed en vivo de una autopista de Minnesota, con análisis de IA, timelapse y el panel de grabación que guarda clips en tu dispositivo en los planes de pago.",
      },
      {
        src: "/landing/track-satellites.jpg",
        alt: "Satélites rastreados en vivo sobre la Tierra en WorldEye",
        title: "Seguimiento de satélites en vivo",
        desc: "Satélites rastreados moviéndose sobre el mismo globo — Ultra añade encima los feeds de inteligencia premium.",
      },
      {
        src: "/landing/hazard-weather.jpg",
        alt: "Alertas de peligros y desastres en el globo de WorldEye",
        title: "Peligros y clima severo",
        desc: "Terremotos, incendios, tormentas y alertas de desastres GDACS junto a las capas de clima.",
      },
      {
        src: "/landing/osint-maritime.jpg",
        alt: "La capa marítima y de conflictos en el globo de WorldEye",
        title: "Inteligencia marítima y de conflictos",
        desc: "Tráfico de barcos y etiquetas de zonas de conflicto en el globo — parte de los feeds de inteligencia premium de Ultra.",
      },
      {
        src: "/landing/osint-search.jpg",
        alt: "La búsqueda de WorldEye volando a un lugar en el globo en vivo",
        title: "Una búsqueda que vuela",
        desc: "Escribe un lugar y el globo va hasta él — los planes de pago añaden filtros por país, tipo de cámara y feeds en vivo.",
      },
      {
        src: "/landing/northern-lights.jpg",
        alt: "La página del directorio de cámaras de auroras boreales en WorldEye",
        title: "Auroras boreales, por lugar",
        desc: "El directorio de cámaras de la zona auroral: todos los feeds del norte del índice, organizados por país y región — Islandia, Noruega, Finlandia, Suecia, Alaska y Canadá.",
      },
      {
        src: "/landing/tools-hub.jpg",
        alt: "El centro de herramientas de WorldEye, con sus tarjetas de herramientas de red, hosts y dominios",
        title: "El centro de herramientas",
        desc: "Todo el panel RECON en una página: escáner de puertos, DNS, WHOIS, certificados y búsquedas de hosts, cada tarjeta etiquetada como gratuita o Pro.",
      },
    ],
  },
  planDetails: {
    backToPricing: "← Todos los planes",
    pricingHeading: "Elige tu período de facturación",
    includesBefore: "Todo en ",
    excludesHeading: "No está en este plan",
    bestForHeading: "Ideal para",
    allPlansLink: "Comparar todos los planes lado a lado →",
    lite: {
      metaTitle: "Plan Lite — $4.99/semana | Precios de WorldEye",
      metaDescription:
        "WorldEye Lite: $4.99/semana, $8.99/mes o $44.99/año. Aperturas de cámara ilimitadas, capas premium, el asistente de IA OI, búsqueda avanzada y el estudio de grabación (5 cámaras a la vez). Prueba gratuita: 3 días semanal, 10 días mensual y anual.",
      eyebrow: "WORLDEYE LITE",
      h1: "Todas las cámaras. Sin límites de apertura.",
      intro:
        "Lite es el nivel esencial: el mapa gratuito sin sus límites. Abre tantas de las 74.229 cámaras como quieras, activa las capas premium, pregunta al asistente OI, filtra la búsqueda como debe ser y graba hasta cinco cámaras a la vez.",
      heroImage: {
        src: "/landing/osint-search.jpg",
        alt: "La búsqueda de WorldEye volando a un lugar en el globo en vivo",
        caption: "Una búsqueda que te lleva a cualquier lugar — con filtros avanzados en todos los planes de pago.",
      },
      featureImages: [
        {
          src: "/landing/features-globe.jpg",
          alt: "El globo en vivo de WorldEye cubierto de puntos de cámara",
          caption: "El globo en vivo — una captura real de WorldEye, cámaras y capas en un solo lugar.",
        },
        {
          src: "/landing/track-flights.jpg",
          alt: "Seguimiento de vuelos en vivo en el globo de WorldEye",
          caption: "Vuelos en vivo sobre la red de cámaras — gratis para mirar, ilimitado en Lite.",
        },
        {
          src: "/landing/camera-viewer.jpg",
          alt: "Una cámara de autopista en vivo abierta a pantalla completa en el visor de WorldEye",
          caption: "Cada cámara se abre a pantalla completa así — en Lite, el panel de grabación bajo el feed guarda clips de hasta 5 cámaras a la vez.",
        },
      ],
      bestFor: [
        "Miras cámaras a diario y siempre llegas al límite gratuito de aperturas.",
        "Quieres el asistente de IA y las capas premium sin el kit OSINT.",
        "Grabas unas pocas cámaras, no escenas enteras.",
      ],
      includes: [
        { title: "Todas las cámaras, sin límite", desc: "Mira tantas de las 74.229 cámaras en vivo como quieras: los planes de pago no tienen límite de aperturas." },
        { title: "Capas premium del mapa", desc: "Flujo de tráfico modelado, líneas marítimas, tráfico naval y feeds de noticias en vivo sobre el globo." },
        { title: "Asistente de IA OI", desc: "Habla con el mapa. Pronósticos, análisis y reconocimiento, con la IA integrada de WorldEye y sin configurar nada." },
        { title: "Filtros de búsqueda avanzados", desc: "Reduce los resultados de cámaras por país, tipo y feeds en vivo; los lugares nunca se filtran." },
        { title: "Estudio de grabación de cámaras", desc: "Graba feeds de cámaras en vivo directamente en tu navegador — hasta 5 cámaras a la vez — y guarda los clips." },
        { title: "Modo Ambiente incluido", desc: "El reproductor ambiental de TV lenta también queda desbloqueado: no necesitas un plan Ambient aparte." },
      ],
      excludes: [
        { title: "Alertas de cámara", desc: "Las alertas empiezan en Pro — vigila 2 cámaras allí, 10 en Ultra, y recibe la foto por correo cuando aparezca tu condición." },
        { title: "Timelapse de cámaras", desc: "La exportación de timelapse fotograma a fotograma es solo de Ultra." },
        { title: "Feeds de inteligencia premium", desc: "Los feeds de inteligencia de ciber, GDELT, marítimo y noticias en vivo son solo de Ultra." },
      ],
      faqs: [
        {
          q: "¿Lite basta si sobre todo miro cámaras?",
          a: "Sí — para eso es Lite exactamente. Aperturas ilimitadas, las capas premium y el asistente, con grabación de hasta 5 cámaras a la vez. Si luego quieres alertas o el kit OSINT, mejorar a Pro se aplica de inmediato.",
        },
        {
          q: "¿Lite incluye alertas de cámara?",
          a: "No. Las alertas de cámara empiezan en Pro (2 cámaras vigiladas) y suben a 10 en Ultra. Todo lo demás de la base de pago — aperturas ilimitadas, capas premium, OI, búsqueda avanzada, el estudio de grabación y Ambiente — está en Lite.",
        },
        {
          q: "¿Cómo es la prueba gratuita en Lite?",
          a: "Lite semanal empieza con 3 días gratis; Lite mensual y anual, con 10 días gratis. Te escribimos antes del primer cargo, y cancelar durante la prueba no cuesta nada.",
        },
      ],
    },
    pro: {
      metaTitle: "Plan Pro — $7.99/semana | Precios de WorldEye",
      metaDescription:
        "WorldEye Pro: $7.99/semana, $13.99/mes o $74.99/año (VIP Pro anual). Todo lo de Lite, más el kit OSINT, tráfico en vivo, alertas de cámara (2) y el estudio de grabación con 20 cámaras a la vez. Prueba gratuita: 3 días semanal, 10 días mensual y anual.",
      eyebrow: "WORLDEYE PRO",
      h1: "El kit completo de WorldEye.",
      intro:
        "Pro es el nivel de trabajo: todo lo de Lite, más el kit de herramientas OSINT, la capa de tráfico en vivo, alertas de cámara y espacio para grabar veinte cámaras a la vez.",
      heroImage: {
        src: "/landing/track-flights.jpg",
        alt: "Un vuelo rastreado con su ruta y datos en vivo en WorldEye",
        caption: "Seguimiento de aeronaves con datos de ruta en vivo — parte del mapa gratuito, ilimitado en Pro.",
      },
      featureImages: [
        {
          src: "/landing/tools-hub.jpg",
          alt: "El centro de herramientas de WorldEye, con sus tarjetas de herramientas de red, hosts y dominios",
          caption: "La página principal del kit: todas las herramientas de reconocimiento en un solo panel, cada una etiquetada como gratuita o Pro.",
        },
        {
          src: "/landing/features-globe.jpg",
          alt: "El globo en vivo de WorldEye cubierto de puntos de cámara",
          caption: "El globo en vivo — una captura real de WorldEye, cámaras y capas en un solo lugar.",
        },
        {
          src: "/landing/oi-assist.jpg",
          alt: "El panel del asistente OI abierto en el globo de WorldEye",
          caption: "OI, el asistente integrado, trabajando el globo — la petición de ejemplo del panel está etiquetada como tal, en el propio panel.",
        },
      ],
      bestFor: [
        "Investigas — escaneos, DNS, WHOIS y comprobaciones SSL en el navegador.",
        "Necesitas un par de cámaras vigiladas por ti las 24 horas.",
        "Grabas sesiones de varias cámaras y 5 a la vez no te basta.",
      ],
      includes: [
        { title: "Todo lo de Lite", desc: "Aperturas de cámara ilimitadas, capas premium, filtros de búsqueda avanzados y Modo Ambiente — todo se mantiene." },
        { title: "Asistente de IA OI", desc: "Habla con el mapa. Pronósticos, análisis y reconocimiento, con la IA integrada de WorldEye y sin configurar nada." },
        { title: "Capa de tráfico en vivo", desc: "Tráfico modelado sobre la red de carreteras: vehículos modelados a partir de datos de carreteras, claramente etiquetados como modelados; el flujo de tráfico en vivo no está disponible actualmente." },
        { title: "Kit de herramientas OSINT", desc: "Escaneos Nmap, DNS/WHOIS, análisis SSL e inteligencia de amenazas, en el navegador." },
        { title: "Estudio de grabación de cámaras", desc: "Graba feeds de cámaras en vivo directamente en tu navegador — hasta 20 cámaras a la vez — y guarda los clips." },
        { title: "Alertas de cámara (2)", desc: "Vigila hasta 2 cámaras y recibe un correo — con la foto — cuando aparezca una condición que describas, como nieve o inundaciones." },
        { title: "Aperturas de cámara ilimitadas", desc: "El límite de aperturas de cámara del nivel gratuito desaparece: abre tantas cámaras como quieras." },
      ],
      excludes: [
        { title: "Feeds de inteligencia premium", desc: "Los feeds de ciber, GDELT, marítimo y noticias en vivo son solo de Ultra." },
        { title: "Timelapse de cámaras", desc: "La exportación de timelapse fotograma a fotograma es solo de Ultra." },
        { title: "El centro VIP", desc: "Las alertas de eventos, el resumen personal y las vistas guardadas vienen con Ultra. El Pro anual lleva el nombre VIP Pro y los límites de Pro — el centro en sí no forma parte de Pro." },
        { title: "Los límites más altos de Ultra", desc: "Grabar 40 cámaras a la vez y 10 alertas de cámara son cifras de Ultra; Pro graba 20 a la vez con 2 alertas." },
      ],
      faqs: [
        {
          q: "¿El Pro anual desbloquea el centro VIP?",
          a: "No — y preferimos decirlo aquí que después de que pagues. El centro (alertas de eventos, resumen personal, vistas guardadas) viene con Ultra. El Pro anual lleva el nombre VIP Pro y los límites de Pro: grabación de 20 cámaras y 2 alertas de cámara. Los suscriptores anuales que se unieron antes del 30 de octubre de 2026 conservan los extras VIP con los que empezaron.",
        },
        {
          q: "¿Cómo funcionan las alertas de cámara?",
          a: "Elige hasta 2 cámaras y describe la condición — nieve, inundaciones, una multitud formándose. WorldEye las vigila y te envía la foto por correo cuando la condición aparece.",
        },
        {
          q: "¿Puedo cambiar el período de facturación después?",
          a: "Sí. Las mejoras se aplican de inmediato, con el prorrateo gestionado por Stripe. Las rebajas de plan entran en vigor al final de tu período actual. Cambiar entre semanal, mensual y anual funciona igual.",
        },
      ],
    },
    ultra: {
      metaTitle: "Plan Ultra — $12.99/semana | Precios de WorldEye",
      metaDescription:
        "WorldEye Ultra: $12.99/semana, $24.99/mes o $149.99/año. Todo lo de Pro, más feeds de inteligencia premium, timelapse de cámaras, el centro VIP, grabación de 40 cámaras y 10 alertas de cámara. Prueba gratuita: 3 días semanal, 10 días mensual y anual.",
      eyebrow: "WORLDEYE ULTRA",
      h1: "Todo. Más la capa de inteligencia.",
      intro:
        "Ultra es el nivel superior: todo lo de Pro, los feeds de inteligencia premium, el timelapse de cámaras, el centro VIP y los límites más altos que vende WorldEye — 40 cámaras grabando a la vez, 10 vigiladas con alertas.",
      heroImage: {
        src: "/landing/track-satellites.jpg",
        alt: "Satélites rastreados en vivo sobre la Tierra en WorldEye",
        caption: "Seguimiento de satélites en vivo — Ultra añade los feeds de inteligencia sobre el mismo globo.",
      },
      featureImages: [
        {
          src: "/landing/osint-satellite.jpg",
          alt: "Detalle de un satélite en las herramientas OSINT de WorldEye",
          caption: "Detalle de satélites y ángulos de observación desde el kit OSINT.",
        },
        {
          src: "/landing/osint-maritime.jpg",
          alt: "La capa marítima y de conflictos en el globo de WorldEye",
          caption: "Tráfico marítimo y etiquetas de zonas de conflicto — la capa de inteligencia, en vivo en el globo.",
        },
        {
          src: "/landing/hazard-weather.jpg",
          alt: "Alertas de peligros y desastres en el globo de WorldEye",
          caption: "Alertas de peligros y desastres (GDACS) junto a las capas de clima.",
        },
        {
          src: "/landing/globe-trackers.jpg",
          alt: "El globo de WorldEye sobre Norteamérica con las capas de satélites y vuelos activadas",
          caption: "Todos los rastreadores en un solo globo: miles de satélites en órbita y rutas de vuelos en vivo sobre Norteamérica.",
        },
      ],
      bestFor: [
        "Sigues los eventos mundiales y quieres los feeds de inteligencia en el globo.",
        "Haces sesiones de grabación grandes — hasta 40 cámaras a la vez.",
        "Quieres el centro: alertas de eventos, un resumen personal y vistas guardadas.",
      ],
      includes: [
        { title: "Todo lo de Pro", desc: "El kit OSINT, las alertas de cámara, la búsqueda avanzada y el estudio de grabación — todo incluido." },
        { title: "Feeds de inteligencia premium", desc: "Ciberamenazas, eventos GDELT, seguimiento marítimo, zonas de conflicto, noticias en vivo: solo Ultra." },
        { title: "Timelapse de cámaras", desc: "Captura las cámaras de instantáneas fotograma a fotograma y exporta la película: solo Ultra." },
        { title: "Alertas de cámara (10)", desc: "El límite de alertas sube a 10 cámaras vigiladas; Pro incluye 2." },
        { title: "Estudio de grabación de cámaras", desc: "Graba feeds de cámaras en vivo directamente en tu navegador — hasta 40 cámaras a la vez — y guarda los clips." },
        { title: "Alertas de eventos", desc: "Terremotos cerca de tus lugares, recordatorios de lanzamientos y pasos de la ISS: por correo y en la app, comprobados cada ~15 minutos, en el centro VIP." },
        { title: "Resumen personal", desc: "Un resumen creado desde tu cuenta: tus eventos de alerta, terremotos cerca de tus lugares vigilados, el mejor paso de la ISS y las próximas 48 horas de lanzamientos, en el centro VIP o en tu correo cada mañana." },
        { title: "Vistas guardadas", desc: "Nombra y guarda hasta 25 configuraciones del globo — un conjunto de capas y una cámara opcional — y restaura cualquiera con un clic, en el centro VIP." },
      ],
      excludes: [
        { title: "Funciones de equipo Enterprise", desc: "La API de feeds de cámaras, el reproductor integrable para tu propio sitio y los asientos de equipo son Enterprise — $999/año." },
      ],
      faqs: [
        {
          q: "¿Qué son los feeds de inteligencia premium?",
          a: "Datos de ciberamenazas en vivo, eventos globales GDELT, seguimiento marítimo, zonas de conflicto y feeds de noticias en vivo, en capas sobre el globo. Son solo de Ultra — el sitio gratuito y los niveles inferiores no los tienen.",
        },
        {
          q: "¿Ultra incluye el centro VIP?",
          a: "Sí. Las alertas de eventos, tu resumen personal y hasta 25 vistas guardadas viven en el centro VIP, y Ultra lo incluye todo — junto a la grabación de 40 cámaras y 10 alertas de cámara.",
        },
        {
          q: "¿Ultra es demasiado para mirar por casualidad?",
          a: "Sinceramente, puede serlo. Si no necesitas los feeds de inteligencia, el timelapse ni el centro, Lite o Pro te cubrirán — cada nivel empieza con una prueba gratuita, así que puedes notar la diferencia antes de pagar.",
        },
      ],
    },
  },
};

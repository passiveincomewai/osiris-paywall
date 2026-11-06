/**
 * Spanish homepage dictionary — IN-HOUSE DRAFT translation of
 * dictionaries/en/home.ts (Phase 1 tranche, 2026-10-24; re-synced
 * 2026-10-26 to the re-extracted English source: current layout
 * metadata, the "Live cams worldwide" link, trials per
 * src/lib/billing/trials.ts — semanal 3 días, mensual/anual 10 días —
 * and satellite imagery no longer listed as a Pro feature, since the
 * satellite view is free. Not yet professionally reviewed — see the
 * build REPORT). Factual tokens (74.229 cámaras in Spanish number
 * format, prices, country counts) carry the same values as English.
 */

import type { HomeCopy } from "../en/home";

export const esHome: HomeCopy = {
  metaTitle: "WorldEye — Cámaras en vivo, vuelos y satélites en un globo 3D",
  metaDescription:
    "Mira 74.229 cámaras en vivo, sigue vuelos en directo y satélites en el globo 3D gratuito de WorldEye, sin registrarte. Pásate a Pro por el analista de IA y el tráfico en vivo; Ultra añade los feeds de inteligencia premium.",
  ogTitle:
    "WorldEye — Globo 3D en vivo | Cámaras en vivo, vuelos, satélites y herramientas OSINT",
  ogDescription:
    "Mira 74.229 cámaras en vivo y sigue aviones y satélites en directo en un globo 3D gratuito. Pásate a Pro por el analista de IA y el tráfico en vivo; Ultra añade los feeds de inteligencia premium.",
  shellLabel: "Acerca de WorldEye",
  cameras: {
    ariaLabel: "Cámaras en vivo",
    eyebrow: "WORLDEYE — INTELIGENCIA PLANETARIA EN VIVO",
    h1: "WorldEye: el mundo, en vivo en un solo globo",
    h2: "74.229 cámaras en vivo. Un solo mundo.",
    sub: "Mira cámaras en vivo de ciudades, carreteras, montañas, playas y lugares emblemáticos de todo el planeta: cada cámara tiene un enlace para compartir, para enviar a alguien directamente a la vista exacta.",
    ctaGlobe: "Explorar el globo en vivo",
    ctaSignup: "Empezar gratis",
    ctaPricing: "Ver los planes Pro",
    categoryLabels: [
      "Ciudades",
      "Estaciones de esquí",
      "Playas",
      "Carreteras",
      "Montañas",
      "Aeropuertos",
    ],
    exploreLink: "Explorar cámaras en vivo",
    webcamsLink: "Cámaras en vivo de todo el mundo",
  },
  directAnswers: {
    label: "Respuestas rápidas",
    items: [
      {
        q: "¿Qué es WorldEye?",
        a: "WorldEye es un sitio web gratuito que pone un globo terráqueo 3D en vivo en tu navegador: 74.229 cámaras públicas, vuelos en vivo, satélites, clima, terremotos e incendios en un solo mapa. No hay nada que instalar ni necesitas una cuenta para explorar. Los planes de pago añaden un analista de IA, grabación de cámaras y alertas; Ultra añade las capas de inteligencia premium.",
      },
      {
        q: "¿Cuántas cámaras en vivo puedo ver en WorldEye?",
        a: "Puedes ver 74.229 cámaras públicas en vivo en WorldEye, situadas en un solo globo desde 109 países, 74 de ellos con sus propias páginas de país. Estados Unidos aporta la mayor parte: 41.355 cámaras, en gran medida de las redes de los departamentos estatales de transporte, seguido de Japón con 10.472. La mezcla cubre carreteras, calles de ciudades, playas, estaciones de esquí, aeropuertos, puertos y reservas naturales.",
      },
      {
        q: "¿WorldEye es gratis?",
        a: "Sí: el globo, todas las cámaras, el seguimiento de vuelos y satélites, el clima, los terremotos y la búsqueda básica son gratis, y nunca necesitas una cuenta para navegar. El plan gratuito incluye 5 aperturas de cámara en el globo. Los planes de pago opcionales (semanal por $7.99, mensual por $13.99 y VIP Pro por $74.99 al año) eliminan ese límite y añaden el analista de IA y la grabación de cámaras; Ultra añade las capas de inteligencia premium.",
      },
    ],
  },
  tracking: {
    ariaLabel: "Seguimiento de vuelos, satélites y tráfico marítimo",
    eyebrow: "Seguimiento en vivo",
    title: "Sigue el planeta en movimiento.",
    sub: "Sigue aviones, satélites, actividad marítima y transporte en vivo desde una sola plataforma interactiva.",
    stageAlt: "La Tierra desde la órbita con capas de seguimiento en vivo en WorldEye",
    ctaFlight: "Rastreador de vuelos en vivo",
    satelliteLink: "Rastreador de satélites",
  },
  hazards: {
    ariaLabel: "Clima, incendios y terremotos",
    eyebrow: "Sistemas terrestres",
    title: "Mira cómo cambia el mundo.",
    sub: "Sigue tormentas, incendios, terremotos y actividad ambiental a medida que los datos están disponibles.",
    exploreLink: "Explorar el clima en vivo",
    earthquakeLink: "Rastreador de terremotos",
    wildfireLink: "Rastreador de incendios",
  },
  osint: {
    ariaLabel: "Kit de herramientas OSINT profesional",
    eyebrow: "Kit Pro",
    title: "Tu centro de mando de inteligencia global.",
    sub: "Potentes herramientas de monitoreo e investigación, juntas en un solo lugar.",
    proBadge: "PRO",
    cards: [
      {
        title: "Mapas satelitales",
        desc: "Imágenes satelitales a pantalla completa sobre el globo.",
      },
      {
        title: "Seguimiento marítimo",
        desc: "Barcos, puertos y movimientos navales, en vivo.",
      },
      {
        title: "Búsqueda avanzada",
        desc: "Filtros Pro en lugares, cámaras e inteligencia: la búsqueda básica es gratis.",
      },
      {
        title: "Inteligencia cibernética",
        desc: "Malware, botnets y caídas a medida que aparecen.",
      },
      {
        title: "Grabación de cámaras",
        desc: "Graba clips de cámaras en vivo en tu navegador.",
      },
    ],
    exploreLink: "Explorar las funciones Pro",
  },
  plans: {
    ariaLabel: "Planes Free y Pro",
    eyebrow: "Planes",
    title: "Gratis para explorar. Pro cuando quieras más.",
    compareBefore: "¿Comparando herramientas?",
    compareLink: "Mira cómo se compara WorldEye con God's Eye View",
    compareAfter: ".",
    pricingLink: "Comparar planes en la página de precios",
    freeTitle: "Free",
    freePriceLine: "$0 — sin necesidad de cuenta",
    freeRows: [
      "Globo 3D interactivo",
      "74.229 cámaras públicas",
      "Seguimiento de vuelos y satélites",
      "Búsqueda básica: vuela a cualquier lugar",
      "Transporte, lanzamientos y nivel de calle",
      "Clima, terremotos e incendios",
      "Cámaras: 5 aperturas gratis por dispositivo",
    ],
    freeCta: "Empezar gratis",
    popularBadge: "EL MÁS POPULAR",
    proTitle: "Pro",
    proPriceLine: "Semanal $7.99 · Mensual $13.99 · VIP Pro $74.99",
    proTrialsLine: "Pruebas gratis: 3 días en el semanal · 10 días en el mensual y el anual",
    proRows: [
      "Aperturas de cámara ilimitadas",
      "Capa de tráfico en vivo",
      "Filtros de búsqueda avanzados",
      "Kit de herramientas OSINT",
      "Capas de inteligencia premium y feeds en vivo (Ultra)",
      "Estudio de grabación de cámaras",
      "Timelapse de cámaras (Ultra)",
    ],
    proCta: "Ver los planes Pro",
  },
  faq: {
    ariaLabel: "Preguntas frecuentes",
    eyebrow: "FAQ",
    title: "Preguntas frecuentes",
    items: [
      {
        q: "¿WorldEye es realmente gratis?",
        a: "Sí. El globo en vivo (el mapa, 74.229 cámaras públicas, seguimiento de vuelos y satélites, transporte en vivo, radar meteorológico, terremotos, incendios y búsqueda básica) es gratis y no requiere cuenta. WorldEye Pro es una suscripción opcional que añade el analista de IA, la capa de tráfico en vivo y los filtros de búsqueda avanzados; Ultra añade los feeds de inteligencia premium.",
      },
      {
        q: "¿Necesito una cuenta para usar WorldEye?",
        a: "No. Solo abre el sitio y ya estás mirando el planeta. Las cuentas son gratis: los suscriptores las usan para la facturación, los afiliados para sus enlaces y los miembros obtienen aperturas de cámara extra; nunca como una barrera delante del mapa.",
      },
      {
        q: "¿En qué se diferencia WorldEye de Google Earth?",
        a: "Google Earth muestra el pasado grabado; WorldEye muestra el ahora. Fusiona transmisiones en vivo (aviones, satélites, clima, terremotos, incendios y 74.229 cámaras públicas) en un solo globo 3D que se actualiza en tiempo real.",
      },
      {
        q: "¿Qué incluye WorldEye Pro y cuánto cuesta?",
        a: "Pro añade el analista de IA OI, la capa de tráfico en vivo, los filtros de búsqueda avanzados y el estudio de grabación de cámaras. Ultra añade feeds de inteligencia premium como ciberamenazas, seguimiento marítimo y un feed de noticias en vivo, además del timelapse de cámaras. Los planes son semanal por $7.99, mensual por $13.99 y anual por $74.99. El plan semanal empieza con una prueba gratis de 3 días y los planes mensual y anual con una de 10 días, y puedes cancelar en cualquier momento con un clic.",
      },
      {
        q: "¿De dónde vienen las cámaras en vivo?",
        a: "WorldEye agrega feeds de cámaras disponibles públicamente de todo el mundo (tráfico, calles de ciudades, lugares emblemáticos y naturaleza) en una sola capa navegable sobre el globo. Son fuentes públicas de terceros, así que algunos feeds pueden desconectarse y la cobertura varía por región.",
      },
      {
        q: "¿Puede cualquiera ver las cámaras públicas de las calles?",
        a: "Sí, cualquiera. Cada cámara de WorldEye es un feed que su operador ya publica abiertamente en la web: departamentos de transporte, ciudades, estaciones y parques los ponen en línea para que el público los vea. WorldEye los reúne en un solo mapa; nunca desbloquea, intercepta ni accede a una cámara privada.",
      },
      {
        q: "¿Las cámaras son realmente en vivo?",
        a: "Los feeds son fuentes en vivo. Muchos transmiten video en tiempo real; otros, incluida gran parte de las redes de los departamentos de transporte, actualizan una imagen fija cada uno o dos minutos: actuales en ambos casos, y cada feed lleva su marca de tiempo. Una cámara cuya fuente deja de actualizarse se marca como no disponible, nunca se repite desde una grabación.",
      },
      {
        q: "¿WorldEye funciona en mi teléfono?",
        a: "Sí. WorldEye funciona en cualquier navegador moderno (Chrome, Edge, Firefox y Safari), en escritorio y móvil. No hay nada que instalar; solo abre worldeye.app.",
      },
    ],
    contactBefore: "¿Preguntas? Habla con una persona:",
    contactEmailLink: "escríbenos",
    contactMiddle1: ", usa la",
    contactPageLink: "página de contacto",
    contactMiddle2: ", o lee",
    contactAboutLink: "acerca de WorldEye",
    contactAfter: ".",
  },
  footerHeadline: "Mantente por delante del mundo.",
  footerSub:
    "Recibe novedades de la plataforma, nuevas capas de inteligencia y anuncios importantes.",
};

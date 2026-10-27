/**
 * Spanish live-webcams dictionary — IN-HOUSE DRAFT translation of
 * dictionaries/en/live-webcams.ts (2026-10-26; not yet professionally
 * reviewed — see the build REPORT). The {count}/{countries}/{topCount}/
 * {europeCount} placeholders are filled from the same catalogue data
 * as the English page and formatted for Spanish (74.229).
 */

import type { LiveWebcamsCopy } from "../en/live-webcams";

export const esLiveWebcams: LiveWebcamsCopy = {
  meta: {
    title: "Cámaras en vivo de todo el mundo — 74.229 webcams en vivo",
    description:
      "Mira 74.229 cámaras y webcams en vivo en {countries} países —tráfico, ciudades, naturaleza y lugares emblemáticos— en el centro de webcams en vivo de WorldEye. Gratis para siempre, sin registrarte.",
    ogTitle: "Cámaras en vivo de todo el mundo — 74.229 webcams en vivo | WorldEye",
    ogDescription:
      "74.229 cámaras y webcams en vivo en {countries} países: tráfico, ciudades, naturaleza, lugares emblemáticos. Gratis para siempre, sin registrarte.",
  },
  schema: {
    name: "Cámaras en vivo de todo el mundo — 74.229 webcams en vivo",
    description:
      "Directorio de {count} webcams públicas en vivo en {countries} países.",
  },
  topBar: {
    camerasLink: "Cámaras",
    logoAria: "WorldEye — volver al globo en vivo",
  },
  hero: {
    badge: "DIRECTORIO DE WEBCAMS EN VIVO",
    h1Before: "Cámaras en vivo de todo el mundo — {count} webcams en vivo. ",
    h1Accent: "Un solo mundo.",
    intro1:
      "Este es el centro del directorio de cámaras de WorldEye: {count} webcams públicas en vivo de {countries} países, recopiladas y mapeadas para que puedas ver el planeta en tiempo real. Cámaras en vivo de carreteras y cruces, calles y plazas, playas, estaciones de esquí, puertos y naturaleza: todo lo que el mundo apunta con una cámara pública.",
    intro2:
      "Solo Estados Unidos aporta {topCount} feeds, desde las redes estatales de transporte hasta los corredores metropolitanos más densos. Todas las cámaras aquí son gratis: sin cuenta, sin registro, nunca.",
  },
  search: {
    label: "todo el directorio",
    placeholder: "Busca donde quieras: prueba una ciudad…",
    emptyText: 'Ningún lugar del directorio coincide con "{value}".',
    scopeLabel: "todo el mundo",
    explorerPlaceholder: "Busca entre todas las cámaras: una ciudad, una playa, una carretera…",
  },
  quickAnswersLabel: "Respuestas rápidas",
  topAnswers: [
    {
      q: "¿Qué es WorldEye?",
      a: "WorldEye es un sitio web gratuito que reúne {count} cámaras públicas en vivo de {countries} países en un globo 3D interactivo. Gira el globo, busca cualquier lugar y toca un marcador de cámara para mirar: tráfico, ciudades, playas, estaciones de esquí, aeropuertos, lugares emblemáticos y naturaleza, directamente en tu navegador y sin descargar nada.",
    },
    {
      q: "¿Qué más puedo ver además de cámaras?",
      a: "El mismo globo lleva vuelos en vivo, satélites —incluida la ISS—, barcos por AIS, radar meteorológico, terremotos e incendios: un solo mapa en vivo del planeta, no solo un directorio de cámaras. Cada rastreador tiene su propia página y todas las capas se pueden explorar gratis.",
    },
    {
      q: "¿Cómo funciona ver gratis? ¿Necesito una cuenta?",
      a: "No necesitas cuenta para empezar: cada dispositivo tiene 5 aperturas de cámara gratis en el globo. Verifica tu correo y sumas 5 más, y una cuenta gratuita lleva el total a 15 aperturas. Explorar este directorio, el mapa y las demás capas en vivo nunca tiene límite, y los planes de pago eliminan por completo el límite de aperturas.",
    },
  ],
  features: [
    {
      title: "Un globo, todos los feeds",
      desc: "En lugar de buscar en cientos de sitios de agencias, cada cámara pública está situada en una Tierra 3D que puedes girar, ampliar y buscar.",
    },
    {
      title: "Hecho para la curiosidad",
      desc: "Mira un tifón en Taiwán, un remonte en Austria o la hora punta en Houston: el directorio convierte el planeta en un lugar que se puede recorrer y mirar.",
    },
    {
      title: "Honesto con las fuentes",
      desc: "Son transmisiones públicas que sus operadores ya publican abiertamente. WorldEye las recopila y las mapea: no espía y no necesita tu cuenta.",
    },
  ],
  topTable: {
    heading: "Dónde están las cámaras",
    subBefore: "Los diez países con más feeds en vivo del directorio. ",
    subLink: "Ver los {countries} países",
    subAfter: ".",
    countryHeader: "País",
    camerasHeader: "Cámaras en vivo",
  },
  explorer: {
    heading: "Mira el directorio en vivo",
    sub: "Cada cámara del índice con su feed real en vivo: filtra por lugar, busca por nombre y salta desde cualquier tarjeta al mismo punto del globo.",
  },
  exploreHeading: "Explora el directorio",
  exploreCards: [
    {
      title: "Cámaras por país",
      desc: "Los {countries} países ordenados por número de cámaras, con la región más activa de cada uno.",
    },
    {
      title: "Las 25 regiones con más cámaras",
      desc: "Las áreas metropolitanas, estados y corredores de autopistas más activos del mundo, de Georgia a Madrid.",
    },
    {
      title: "Cámaras de tráfico de EE. UU.",
      desc: "{topCount} feeds públicos y de departamentos de transporte: revisa tu ruta antes de conducir.",
    },
    {
      title: "Cámaras en vivo de Europa",
      desc: "{europeCount} países europeos, de las plazas españolas a las tierras altas de Islandia.",
    },
    {
      title: "El amanecer alrededor del mundo",
      desc: "Una página viva que sigue la línea del alba: cámaras en vivo donde el sol está saliendo ahora mismo, recalculado cada minuto, con un modo de atardecer para la línea del ocaso.",
    },
  ],
  earn: {
    heading: "Cómo se gana un feed su lugar en el directorio",
    paragraphs: [
      "El directorio no se arma raspando sitios para luego abandonarlo. Una cámara entra en la lista cuando se cumplen tres cosas: el feed es genuinamente público —lo publica abiertamente su operador para que cualquiera lo mire—; realmente reproduce, verificado cargando la transmisión en lugar de fiarse de un listado; y no está ya en el directorio con otro nombre u otra red, algo importante cuando un mismo feed de una agencia aparece en cinco portales distintos.",
      "Esa disciplina es la razón de que las cifras de esta página signifiquen algo. El número es el conjunto de cámaras que el globo sirve hoy: no todas las webcams encontradas alguna vez, ni una copia de otra copia. Los feeds mueren, se mudan y se reemplazan, y el trabajo del directorio es mantener la promesa del mapa: si está en el mapa, reproduce.",
    ],
  },
  directAnswers: [
    {
      q: "¿Puedo ver cámaras en vivo gratis?",
      a: "Sí: las cámaras en vivo de WorldEye se ven gratis en tu navegador, sin cuenta y sin registro. El plan gratuito incluye 5 aperturas de cámara en el globo; el directorio en sí se explora gratis, y los planes de pago opcionales eliminan el límite de aperturas.",
    },
    {
      q: "¿Dónde puedo ver webcams en vivo de todo el mundo?",
      a: "WorldEye muestra 74.229 webcams públicas en vivo de 109 países en un solo globo interactivo gratuito que puedes girar, buscar y ampliar. Explora por país o ciudad en el directorio, o abre el mapa y toca cualquier marcador: tráfico, playas, estaciones de esquí, aeropuertos, lugares emblemáticos y naturaleza.",
    },
    {
      q: "¿Cuántas cámaras en vivo hay en el mundo?",
      a: "Nadie publica una cifra exacta de todas las webcams de la Tierra, pero WorldEye sirve 74.229 cámaras en vivo. Solo Estados Unidos suma 41.355, en gran parte redes de los departamentos de transporte. Cada feed se comprueba antes de entrar en la lista, así que la cifra cuenta cámaras que realmente puedes ver.",
    },
  ],
  faqsHeading: "Preguntas frecuentes sobre webcams en vivo",
  faqs: [
    {
      q: "¿Cuántas webcams en vivo tiene WorldEye?",
      a: "El directorio sirve actualmente {count} cámaras públicas en vivo en {countries} países, desde los sistemas de autopistas de los departamentos de transporte de EE. UU. hasta plazas, playas y estaciones de montaña. La cifra crece a medida que se encuentran y se mapean nuevos feeds públicos.",
    },
    {
      q: "¿De verdad es gratis verlas?",
      a: "Sí. Las cámaras nunca estarán tras un muro de pago: cada feed del mapa es gratis para todos, para siempre, sin cuenta y sin registro. El plan Pro opcional financia la infraestructura que mantiene el directorio en marcha.",
    },
    {
      q: "¿Dónde encuentro cámaras de un país concreto?",
      a: "El directorio de cámaras lista cada país con su número de cámaras y su región más activa, y cada país tiene ya su propia página con el desglose completo por ciudades: empieza por la tabla de países o busca cualquier lugar en el mapa en vivo.",
    },
    {
      q: "¿Qué tipos de cámaras hay en el directorio?",
      a: "Sobre todo cámaras de tráfico y autopistas de agencias de transporte, además de cámaras de calles, playas y costas, estaciones de esquí y de montaña, vistas de puertos y webcams de plazas. Todo lo que el mundo apunta con una cámara pública, el directorio intenta indexarlo.",
    },
    {
      q: "¿Puedo revisar el estado de las carreteras antes de un viaje?",
      a: "Es el uso más práctico. Las cámaras de autopistas y tráfico muestran en vivo la congestión, los accidentes, el clima y las obras: revisa las cámaras de tu ruta antes de salir en lugar de descubrir el atasco desde dentro.",
    },
    {
      q: "¿Las cámaras funcionan en el móvil?",
      a: "Sí. El mapa en vivo y todos los feeds funcionan en navegadores móviles, sin descargar ninguna app. Abre el mapa, amplía hasta donde quieres mirar y toca un marcador de cámara.",
    },
    {
      q: "¿Por qué se desconectan algunas cámaras?",
      a: "Los operadores mantienen, mueven o retiran sus cámaras, y también hay cortes de red. El directorio vuelve a comprobar los feeds y retira los que mueren; con decenas de miles indexadas, normalmente hay alternativas cerca.",
    },
    {
      q: "¿Puedo pedir cámaras de mi zona?",
      a: "El directorio crece a medida que se encuentran y se mapean feeds públicos. Si tu ciudad o tu agencia publica cámaras abiertas, son candidatas a indexarse: las regiones que más rápido crecen son las que publican abiertamente.",
    },
    {
      q: "¿Cómo se mantiene honesto el directorio?",
      a: "Cada feed se comprueba para asegurarse de que realmente reproduce antes de entrar en la lista —una cámara que no transmite no cuenta— y el directorio vuelve a comprobar y deduplicar feeds con el tiempo. La cifra principal es el número de cámaras que el globo realmente sirve, y por eso es exacta en lugar de un número redondo de marketing.",
    },
    {
      q: "¿Qué diferencia hay entre esta página y el mapa?",
      a: "Esta página es el directorio: las cifras, los países, la estructura de la red. El mapa es el directorio vivo: cada una de estas cámaras situada donde está, con vuelos, clima y las demás capas en vivo alrededor. Explora aquí para entender la red; abre el mapa para usarla.",
    },
  ],
  cta: {
    headingBefore: "El mundo está ",
    headingAccent: "en vivo ahora mismo.",
    sub: "Gira el globo, elige un continente y empieza a mirar. Gratis para siempre: sin cuenta, sin registro.",
    primaryCta: "Ver webcams en vivo",
    secondaryCta: "Resumen de cámaras",
  },
};

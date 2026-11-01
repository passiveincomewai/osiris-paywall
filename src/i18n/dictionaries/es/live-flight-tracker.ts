/**
 * Spanish live-flight-tracker dictionary — IN-HOUSE DRAFT translation
 * of dictionaries/en/live-flight-tracker.ts (2026-10-26; not yet
 * professionally reviewed — see the build REPORT). ADS-B and other
 * glossary terms stay untranslated; facts (74.229 cámaras) match the
 * English source.
 */

import type { LiveFlightTrackerCopy } from "../en/live-flight-tracker";
import { ac, lk, st, tx } from "../types";

export const esLiveFlightTracker: LiveFlightTrackerCopy = {
  meta: {
    title: "Rastreador de vuelos en vivo — ojo en el cielo en directo",
    description:
      "Mira vuelos en vivo — tu ojo en el cielo en directo: posición, altitud, velocidad y rutas en tiempo real en un globo 3D gratuito con vista satelital. Gratis, sin registro.",
    ogTitle: "Rastreador de vuelos en vivo — ojo en el cielo en directo | WorldEye",
    ogDescription:
      "Seguimiento de vuelos en tiempo real en un globo 3D gratuito: posición, altitud, velocidad, tipo de avión y rutas con datos ADS-B en vivo — tu ojo sobre todo el cielo, además de satélites, barcos y 74.229 cámaras públicas en el mismo mapa. Gratis, sin registro.",
    keywords: [
      "ojo en el cielo",
      "rastreador de vuelos en vivo",
      "radar de vuelos",
      "seguir vuelos en vivo",
      "rastreador de aviones",
      "seguimiento de vuelos en tiempo real",
      "rastreador de vuelos gratis",
    ],
  },
  schema: {
    webPageName: "Rastreador de vuelos en vivo de WorldEye",
    webPageDescription:
      "Sigue vuelos en vivo en un mapa 3D gratuito con vista satelital — tu ojo en el cielo en directo. Este rastreador de aviones muestra la posición en tiempo real, la altitud, la velocidad, el tipo de avión y las rutas, sin registro y sin costo.",
  },
  topBar: {
    backToMap: "Volver al mapa",
    logoAria: "WorldEye — volver al globo en vivo",
  },
  breadcrumbLabel: "Rastreador de vuelos en vivo",
  hero: {
    badge: "RASTREADOR DE VUELOS EN VIVO GRATIS",
    h1: [tx("Sigue cada vuelo, "), ac("en vivo"), tx(".")],
    sub: "Este rastreador de aviones es tu ojo en el cielo en directo: sitúa las aeronaves en tiempo real sobre un globo 3D — posición, altitud, velocidad y rutas. Es un radar de vuelos que no cuesta nada y no pide nada: sin registro, sin cuenta, sin muro de pago.",
    ctaPrimary: "Abrir el rastreador en vivo",
    freeNote: "Gratis para siempre · Sin registro",
  },
  heroImage: {
    caption: "Seguimiento de vuelos en vivo en el globo",
    alt: "Vuelos en vivo rastreados en el globo de WorldEye",
  },
  oneMap: {
    heading: "Un solo mapa en vivo para los vuelos — y todo lo que los rodea",
    body: [
      tx("WorldEye es un rastreador de vuelos gratuito con vista satelital: "),
      lk("", "mira vuelos en vivo"),
      tx(" en un globo 3D, con posiciones en tiempo real de datos ADS-B en vivo. El mismo mapa también lleva "),
      lk("satellite-tracker", "satélites en vivo"),
      tx(", "),
      lk("ship-tracker", "barcos en el mar"),
      tx(" y "),
      lk("live-webcams", "74.229 cámaras públicas"),
      tx(": vuelos, satélites, barcos y cámaras en un solo mapa en vivo, todo gratis, sin registro y sin cuenta. Para ver ese mismo tráfico desde tierra, "),
      lk("airport-webcams", "las webcams de los aeropuertos"),
      tx(" muestran las plataformas y las pistas, y "),
      lk("live-plane-spotting", "el avistamiento de aviones en vivo"),
      tx(" combina esas cámaras con la propia capa de vuelos."),
    ],
  },
  satelliteView: {
    heading: "Rastreador de vuelos, vista satelital",
    paragraphs: [
      [
        tx("Es un rastreador de vuelos con vista satelital en el sentido literal: aviones en vivo dibujados sobre un globo 3D cuya capa de suelo cambia a imágenes de satélite. Activa el interruptor Satélite en el mapa y cada vuelo sigue moviéndose en tiempo real —posiciones de emisiones ADS-B en vivo, de hace segundos— pero ahora sobre el suelo real: la disposición de los aeropuertos, las costas, las ciudades y el terreno, de modo que cada vuelo queda en su geografía verdadera en lugar de sobre un mapa esquemático."),
      ],
      [
        tx("Conviene separar las dos mitades, porque envejecen distinto: los vuelos están en vivo; las imágenes, no. La capa de suelo es el mapa base World Imagery de Esri: imágenes publicadas, gratis para todo el mundo, nunca un feed en vivo desde órbita; ningún servicio público transmite fotografías en vivo desde el espacio. El control de tiempo de imágenes del mapa incluso retrocede ese mapa base por versiones fechadas hasta 2014, para ver el mismo aeropuerto en un año anterior. Y los objetos que fotografían la Tierra también están en este globo: el "),
        lk("satellite-tracker", "rastreador de satélites en vivo"),
        tx(" va una capa por encima de los vuelos."),
      ],
    ],
  },
  howItWorks: {
    heading: "Cómo funciona el seguimiento de vuelos en vivo",
    paragraphs: [
      [
        tx("Los aviones modernos emiten constantemente su identidad, posición GPS, altitud y velocidad mediante un sistema llamado "),
        st("ADS-B"),
        tx(" (Automatic Dependent Surveillance–Broadcast). Es una señal de radio que cualquier receptor en tierra puede captar: no hace falta ningún radar."),
      ],
      [
        tx("Miles de receptores voluntarios y comerciales de todo el mundo escuchan esas emisiones y comparten lo que captan. WorldEye agrega esos feeds públicos y dibuja cada avión en el mapa 3D en vivo, segundos después de su emisión."),
      ],
      [
        tx("Ese es todo el truco detrás de cualquier servicio que te permite seguir vuelos en vivo. La diferencia aquí: el mapa que lo rodea —el globo, los satélites, el clima, las cámaras— también es gratis."),
      ],
    ],
  },
  howToUse: {
    heading: "Cómo usar el rastreador de vuelos",
    paragraphs: [
      [
        st("1. Abre el mapa."),
        tx(" La capa de vuelos forma parte del globo gratuito: los aviones se dibujan en cuanto carga el mapa, más densos sobre el espacio aéreo concurrido y más dispersos sobre los océanos. Amplía cualquier región y los vuelos individuales se distinguen dentro del flujo."),
      ],
      [
        st("2. Haz clic en un avión."),
        tx(" Al seleccionar un avión verás lo que el feed público ofrece de él: número de vuelo o indicativo, tipo de avión, altitud, velocidad sobre el suelo, rumbo, y su origen y destino cuando el feed los proporciona, con la ruta recorrida dibujada sobre el mapa."),
      ],
      [
        st("3. Busca en lugar de cazar."),
        tx(" La búsqueda básica es gratis: escribe un lugar o un aeropuerto y vuela directo a su espacio aéreo para ver qué está llegando, saliendo y esperando sobre la zona. Pro añade filtros de búsqueda avanzados para profundizar en todo el conjunto de datos."),
      ],
      [
        st("4. Pon el vuelo en contexto."),
        tx(" Aquí es donde un globo gana a una lista: la misma pantalla lleva los sistemas meteorológicos que el vuelo está cruzando, las cámaras en vivo de su destino y los satélites que pasan por encima. Una sola vista, sin cambiar de pestaña."),
      ],
    ],
  },
  whatYouSee: {
    heading: "Qué puedes ver en el rastreador",
    cards: [
      {
        title: "Posición en vivo",
        body: "La ubicación actual de cada avión, actualizada en tiempo real mientras se mueve por el globo.",
      },
      {
        title: "Altitud y velocidad",
        body: "Altitud de crucero, velocidad sobre el suelo y rumbo: la telemetría que cuenta la historia del vuelo.",
      },
      {
        title: "Tipo de avión",
        body: "Descubre qué tipo de avión es, desde los grandes aviones de fuselaje ancho hasta los jets regionales y los cargueros.",
      },
      {
        title: "Ruta y número de vuelo",
        body: "Origen, destino y número de vuelo, con la ruta recorrida dibujada sobre el mapa.",
      },
    ],
  },
  useCases: {
    heading: "Quién usa un rastreador de vuelos en vivo",
    cards: [
      {
        title: "Entusiastas de la aviación",
        body: "Sigue el tráfico interesante, observa los patrones de espera sobre tu ciudad y aprende los ritmos del cielo sobre ti.",
      },
      {
        title: "Recogidas en el aeropuerto",
        body: "Comprueba si un vuelo que llega viene a tiempo, está dando vueltas o lleva retraso, antes de salir hacia el aeropuerto.",
      },
      {
        title: "Observadores de aviones",
        body: "Combina el mapa en vivo con tus ojos (o una cámara): sabe qué hay sobre ti antes de oírlo.",
      },
    ],
  },
  reading: {
    heading: "Leer un vuelo como un controlador",
    paragraphs: [
      [
        st("La altitud"),
        tx(" se expresa en pies sobre el nivel del mar; los aviones comerciales vuelan en crucero aproximadamente entre 30.000 y 42.000 pies. Una altitud estable con velocidad sobre el suelo en descenso suele significar que el avión ya empezó a bajar. "),
        st("La velocidad sobre el suelo"),
        tx(" es la velocidad respecto al suelo, no al aire: una corriente en chorro fuerte puede empujar un avión hacia el este más allá de los 1.000 km/h sobre el suelo mientras su velocidad aérea sigue siendo normal. "),
        st("El rumbo"),
        tx(" es hacia dónde apunta el morro; la ruta dibujada es por dónde ha pasado realmente, y con viento cruzado ambas difieren un poco."),
      ],
      [
        tx("Los patrones cuentan historias: una forma de circuito perfecta es un patrón de espera (clima o congestión en el destino), un descenso repentino hacia un aeropuerto cercano es un desvío, y una línea larga y recta a una hora rara suele ser un vuelo de carga: el cielo nocturno pertenece al transporte de mercancías. Y los límites honestos: la cobertura depende de la densidad de receptores, algunos vuelos se filtran o se retrasan en la fuente y las posiciones sobre océanos remotos pueden estar separadas por minutos. El rastreador muestra la imagen pública del cielo, que es sorprendentemente completa, pero no es una herramienta de navegación ni de seguridad: pilotos y controladores trabajan con feeds regulados, no con este mapa."),
      ],
    ],
  },
  faqHeading: "Preguntas frecuentes del rastreador de vuelos",
  faqs: [
    {
      q: "¿El rastreador de vuelos en vivo es gratis?",
      a: "Sí, completamente gratis, para siempre. La capa de seguimiento de vuelos forma parte del mapa gratuito de WorldEye, junto con el globo 3D, los satélites, el clima, los terremotos y 74.229 cámaras públicas. Sin cuenta, sin tarjeta, sin cuenta atrás de prueba.",
    },
    {
      q: "¿Necesito una cuenta para seguir vuelos?",
      a: "No. Abre el mapa y los aviones ya están ahí. Las cuentas existen solo para suscriptores Pro y afiliados, nunca como una puerta delante del mapa gratuito.",
    },
    {
      q: "¿Cómo funciona el seguimiento de vuelos en vivo?",
      a: "La mayoría de los aviones emiten su posición, altitud y velocidad mediante transpondedores ADS-B. Una red global de receptores capta esas emisiones y los datos agregados se dibujan en el mapa casi en tiempo real. Es el mismo principio que hay detrás de cualquier servicio de radar de vuelos.",
    },
    {
      q: "¿Qué tan preciso es el seguimiento?",
      a: "Las posiciones vienen de las propias emisiones del avión, así que suelen ser precisas con segundos de diferencia respecto al tiempo real. La cobertura depende de la densidad de receptores: el espacio aéreo concurrido es casi instantáneo y las regiones oceánicas remotas pueden actualizarse con menos frecuencia.",
    },
    {
      q: "¿El rastreador de vuelos tiene vista satelital?",
      a: "Sí. Cambia la capa de suelo del globo a Satélite y los vuelos en vivo —posiciones ADS-B en tiempo real— se dibujan sobre imágenes de satélite del suelo, gratis para todo el mundo. Los vuelos están en vivo; las imágenes son imágenes publicadas y fechadas (World Imagery de Esri), no un feed en vivo desde órbita, y un control de tiempo de imágenes en el mapa las retrocede por versiones fechadas hasta 2014.",
    },
    {
      q: "¿Puedo seguir jets militares o privados?",
      a: "Si un avión está emitiendo ADS-B y está dentro de la cobertura de los receptores, aparece en el mapa, incluidos muchos jets privados. Algunos vuelos militares y sensibles no emiten o se filtran en la fuente, así que no aparecerán. Lo que ves es lo que llevan los feeds públicos de datos.",
    },
    {
      q: "¿Por qué desapareció un avión en pleno vuelo?",
      a: "Normalmente porque salió de la cobertura de los receptores: sobre un océano, un desierto o una región polar, los huecos entre receptores terrestres son reales, y un avión puede salir de la imagen pública hasta volver a entrar en cobertura. También puede significar que el avión aterrizó, que su transpondedor dejó de emitir o que el feed lo filtró. Un hueco en el mapa es un hueco en los datos públicos, no un evento en el cielo.",
    },
    {
      q: "¿Por qué la posición de un vuelo a veces salta o se retrasa?",
      a: "Las posiciones vienen de las emisiones ADS-B del avión. Entre emisiones, el mapa mueve el avión por extrapolación desde su último rumbo y velocidad conocidos, y cuando llega una emisión más reciente tras un hueco, la posición se pone al día de golpe, en un salto visible. El espacio aéreo concurrido se actualiza casi sin pausa; los tramos remotos y oceánicos pueden pasar minutos entre emisiones, así que ahí es donde primero se notan los saltos.",
    },
    {
      q: "¿Puedo seguir un vuelo en una vista de cabina 3D?",
      a: "Sí. Selecciona un vuelo y usa el modo de seguimiento: junto a la vista de persecución hay una cámara frontal —de cabina— que vuela con el rumbo real del avión. Es una vista de telemetría construida con los datos emitidos por el vuelo, no una cámara a bordo. El modo de seguimiento es una función Pro; el rastreador en vivo en sí sigue siendo gratis.",
    },
  ],
  voiceQuestions: {
    "best-way-to-track-flights": {
      question: "¿Cuál es la mejor manera de seguir vuelos en vivo?",
      shortAnswer:
        "El rastreador de vuelos de WorldEye sitúa los aviones en vivo en el mismo globo que sus cámaras, con números de vuelo, rutas y tipos de avión, gratis en el navegador.",
      longAnswer:
        "Como los vuelos comparten mapa con las cámaras y el clima, puedes seguir un vuelo y revisar las cámaras del aeropuerto y las condiciones de su destino en una sola vista.",
    },
    "which-plane-is-flying-over-me": {
      question: "¿Qué avión está sobrevolando mi casa ahora mismo?",
      shortAnswer:
        "Abre el rastreador de vuelos en vivo de WorldEye: los aviones sobre ti aparecen en el globo con su altitud, velocidad, tipo de avión y ruta, actualizados desde señales ADS-B.",
      longAnswer:
        "Toca cualquier avión para inspeccionarlo. El rastreador es gratis y no necesita cuenta.",
    },
    "follow-a-specific-flight": {
      question: "¿Cómo sigo un vuelo concreto?",
      shortAnswer:
        "Encuentra el vuelo en el rastreador de vuelos en vivo de WorldEye y selecciónalo para ver su posición, altitud, velocidad y ruta dibujados en el globo en tiempo real.",
      longAnswer:
        "Seguir la ruta de un vuelo en el mapa es una función Pro. El rastreador gratuito sigue mostrando la posición en vivo y la telemetría de cada avión en el aire.",
    },
    "what-is-ads-b": {
      question: "¿Qué es ADS-B?",
      shortAnswer:
        "ADS-B es el sistema de emisión con el que los aviones reportan su posición GPS, altitud y velocidad; los receptores en tierra lo recogen para alimentar el seguimiento de vuelos en vivo.",
      longAnswer:
        "Casi todos los aviones comerciales emiten ADS-B continuamente. La guía de WorldEye explica cómo se reciben las señales y se convierten en la capa de vuelos en vivo del globo.",
    },
  },
  voiceTitle: "Preguntas que hace la gente",
  questionsMap: {
    heading: "Preguntas que el mapa responde en segundos",
    paragraphs: [
      [
        st("«¿Qué avión es ese que pasa sobre mí?»"),
        tx(" Apunta el globo a tu barrio, toca el avión que pasa sobre ti y lee su número de vuelo, tipo y ruta: la versión de cinco segundos de observar aviones, desde tu sofá."),
      ],
      [
        st("«¿El vuelo que voy a recoger llega a tiempo?»"),
        tx(" Encuéntralo por su ruta, mira dónde está realmente y si está en espera o descendiendo. El mapa muestra la posición en vivo del avión; para horarios de puerta y estado oficial, las actualizaciones de la propia aerolínea siguen siendo la fuente de verdad."),
      ],
      [
        st("«¿Cómo se ve el cielo sobre un gran evento?»"),
        tx(" Vuela a cualquier ciudad en un día de titulares y observa cómo reacciona el tráfico en tiempo real: desvíos alrededor de tormentas, esperas acumulándose sobre un centro de conexiones, la flota de carga despegando de noche. Las noticias te cuentan qué pasó; el rastreador te deja verlo pasar."),
      ],
    ],
  },
  proStrip: {
    eyebrow: "¿QUIERES MÁS QUE SEGUIMIENTO?",
    heading: "Pro añade un analista de IA que trabaja el mapa por ti",
    body: [
      tx("El rastreador de vuelos es gratis para siempre. "),
      lk("pricing", "WorldEye Pro"),
      tx(" añade el asistente de IA OI, el tráfico en vivo, los filtros de búsqueda avanzados y los feeds de inteligencia premium, desde $7.99/semana."),
    ],
    cta: "Ver los planes Pro",
  },
  related: [
    {
      label: "Rastreador de satélites",
      desc: "Miles de satélites sobre ti: la ISS, Starlink y más, en vivo.",
    },
    {
      label: "Rastreador de terremotos",
      desc: "Terremotos a medida que ocurren: magnitud, profundidad y ubicación en el mapa en vivo.",
    },
    {
      label: "Cámaras en vivo",
      desc: "74.229 cámaras públicas: mira las calles bajo las rutas de los vuelos.",
    },
    {
      label: "Todas las funciones",
      desc: "Todo lo que WorldEye puede hacer: capas gratis para siempre y herramientas Pro.",
    },
    {
      label: "Observación de aviones en vivo",
      desc: "Cámaras de aeropuertos combinadas con la capa de vuelos en vivo: mira las llegadas y salidas en aproximación.",
    },
    {
      label: "Rastreador de barcos",
      desc: "Tráfico de barcos en vivo en el mismo globo: puertos, rutas marítimas y océano abierto.",
    },
  ],
  trust: ["Gratis para siempre", "Sin registro", "Datos públicos ADS-B"],
};

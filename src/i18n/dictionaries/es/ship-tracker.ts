/**
 * Spanish ship-tracker dictionary — IN-HOUSE DRAFT translation of
 * dictionaries/en/ship-tracker.ts (2026-10-26; not yet professionally
 * reviewed — see the build REPORT). AIS and other glossary terms stay
 * untranslated; facts (74.229 cámaras) match the English source.
 */

import type { ShipTrackerCopy } from "../en/ship-tracker";
import { ac, lk, tx } from "../types";

export const esShipTracker: ShipTrackerCopy = {
  meta: {
    title: "Rastreador de barcos en vivo — Seguimiento marítimo de buques",
    description:
      "Sigue barcos en un globo 3D: posición, velocidad, rumbo y tipo de buque mediante AIS, con una posición en vivo siempre que un barco esté transmitiendo. El feed marítimo está incluido con Pro; el globo en sí es gratis.",
    ogTitle: "Rastreador de barcos en vivo | WorldEye",
    ogDescription:
      "Barcos en un globo 3D: posición, velocidad, rumbo y tipo de buque mediante AIS, con una posición en vivo siempre que un barco esté transmitiendo. El feed marítimo está incluido con Pro.",
  },
  schema: {
    webPageName: "Rastreador de barcos en vivo de WorldEye",
    webPageDescription:
      "Sigue barcos en un globo 3D: posición, velocidad, rumbo y tipo de buque mediante AIS, con una posición en vivo siempre que un barco esté transmitiendo. Seguimiento marítimo de buques en WorldEye.",
  },
  topBar: {
    backToMap: "Volver al mapa",
    logoAria: "WorldEye — volver al globo en vivo",
  },
  breadcrumbLabel: "Rastreador de barcos",
  hero: {
    badge: "DATOS MARÍTIMOS VÍA AIS",
    h1: [tx("Los océanos, "), ac("en vivo.")],
    sub: "Un rastreador de barcos sobre un globo 3D. Buques situados desde las emisiones de sus transpondedores AIS —posición, velocidad, rumbo y tipo— con una posición en vivo siempre que un barco esté transmitiendo; cuando un barco no transmite, la página lo dice en lugar de adivinar. Los puertos y puntos de estrangulamiento aportan el contexto.",
    cta: "Desbloquea el feed marítimo con Pro",
  },
  oneMap: {
    heading: "Un solo mapa en vivo para los barcos — y todo lo que los rodea",
    body: [
      tx("El rastreador de barcos de WorldEye sitúa los buques a partir de las emisiones de sus transpondedores AIS —posición, velocidad, rumbo y tipo de buque— mostrando una posición en vivo siempre que un barco esté transmitiendo, y diciéndolo cuando un barco (o el feed) no transmite en lugar de adivinar, en el mismo globo 3D que sus "),
      lk("live-flight-tracker", "vuelos en vivo"),
      tx(", "),
      lk("satellite-tracker", "satélites"),
      tx(" y "),
      lk("live-webcams", "74.229 cámaras públicas"),
      tx(" gratuitos. Sigue un buque hasta su destino y podrás "),
      lk("port-webcams", "ver cómo esos mismos barcos llegan en las cámaras de los puertos"),
      tx(". El globo en sí es gratis y no requiere registro; el seguimiento marítimo es uno de los feeds de inteligencia premium incluidos con "),
      lk("pricing", "una suscripción Pro"),
      tx("."),
    ],
  },
  dataPoints: {
    heading: [tx("Lo que ves de "), ac("cada buque")],
    cards: [
      {
        title: "Posición",
        desc: "Cada buque que transmite situado en su ubicación reportada: mira cómo el tráfico se concentra en estrechos, canales y aproximaciones a puertos a medida que llegan los reportes AIS.",
      },
      {
        title: "Velocidad",
        desc: "Velocidad reportada sobre el suelo, para distinguir un portacontenedores a toda máquina de un petrolero esperando al ancla.",
      },
      {
        title: "Rumbo",
        desc: "Dirección de viaje de cada buque que transmite, para leer con facilidad en qué sentido fluye realmente una ruta marítima.",
      },
      {
        title: "Tipo de buque",
        desc: "Portacontenedores, petroleros, graneleros, ferris de pasajeros, remolcadores y barcos de pesca, cada uno clasificado por lo que es.",
      },
      {
        title: "Destino y puerto",
        desc: "Adónde reportan dirigirse los buques, junto con los puertos y puntos de estrangulamiento marítimos situados en el globo.",
      },
      {
        title: "Actualizaciones a medida que llegan los reportes",
        desc: "Las posiciones se actualizan a medida que llegan nuevos reportes AIS. Cuando un buque —o el propio feed— no está transmitiendo, la página lo dice en lugar de adivinar una posición.",
      },
      {
        title: "Identidad del buque",
        desc: "AIS emite la identidad de cada barco —nombre, indicativo de llamada y número MMSI— para que el punto en el mapa sea un buque real y registrado, no una señal anónima.",
      },
      {
        title: "Navegando frente a fondeado",
        desc: "La velocidad y el estado cuentan la historia: un portacontenedores a 20 nudos frente a uno fondeado fuera del puerto esperando un atraque. La congestión se hace visible.",
      },
      {
        title: "Contexto de puntos de estrangulamiento",
        desc: "Los estrechos, canales y aproximaciones a puertos están marcados en el globo, para que veas por qué cincuenta barcos hacen cola en un tramo estrecho de agua.",
      },
    ],
  },
  howItWorks: {
    heading: [tx("Cómo "), ac("funciona"), tx(" el seguimiento de barcos")],
    paragraphs: [
      [
        tx("Casi todos los grandes buques en el mar llevan un transpondedor AIS —Automatic Identification System—. Emite continuamente la identidad del barco, su posición, velocidad, rumbo y destino previsto por radio VHF, sobre todo para que los barcos cercanos y las autoridades portuarias sepan qué hay a su alrededor."),
      ],
      [
        tx("Una red global de receptores en costa y satélites capta esas emisiones y las publica como feeds de datos abiertos. WorldEye toma ese flujo y sitúa cada buque que transmite en el mismo globo 3D que todo lo demás: vuelos sobre el cielo, tormentas formándose, satélites pasando y los propios puertos marcados con el contexto de sus puntos de estrangulamiento. Las posiciones se actualizan a medida que llegan nuevos reportes AIS; cuando un barco o el feed no transmiten, la página lo dice en lugar de adivinar."),
      ],
      [
        tx("El feed marítimo —tráfico completo de buques con inteligencia de puertos y puntos de estrangulamiento— forma parte del "),
        lk("pricing", "kit de inteligencia Pro"),
        tx(". El resto del globo, incluidos los vuelos en vivo y 74.229 cámaras públicas, es gratis para todos, sin cuenta."),
      ],
      [
        tx("Lo que AIS no muestra también importa. Las embarcaciones pequeñas, los barcos de pesca y los buques militares a menudo no emiten —o emiten solo de forma intermitente—, así que un tramo de agua vacío no es prueba de que esté vacío. Y el destino que reporta un buque lo introduce su tripulación: suele ser correcto y a veces es una aspiración. Lee el tráfico, no solo las etiquetas."),
      ],
    ],
  },
  useCases: {
    heading: [tx("Por qué la gente "), ac("mira los mares")],
    cards: [
      {
        title: "Observadores de puertos y costas",
        desc: "Observa barcos desde tu escritorio. Sigue a los grandes portacontenedores y petroleros hasta el puerto, o mira un estrecho concurrido en hora punta.",
      },
      {
        title: "Observadores de logística",
        desc: "Ve el comercio global en movimiento: el tráfico acumulado en los grandes puntos de estrangulamiento te dice cosas que las hojas de cálculo no dicen.",
      },
      {
        title: "Entusiastas y viajeros",
        desc: "¿Esperando un ferri? ¿Curiosidad por ese crucero? Abre el mar a tu alrededor y mira qué se mueve.",
      },
      {
        title: "Periodistas marítimos",
        desc: "Cuando un incidente marítimo llega a las noticias —una varada, una colisión, un canal bloqueado— mira el tráfico a su alrededor a medida que llegan los reportes AIS en lugar de esperar la foto satelital de la mañana.",
      },
      {
        title: "Observadores de la cadena de suministro",
        desc: "La congestión portuaria es una señal temprana. Los barcos acumulados al ancla fuera de los grandes puertos han precedido cada crisis de suministro reciente: el mapa muestra cómo se forma la cola cuando aún es solo una cola.",
      },
      {
        title: "Marineros y navegantes de recreo",
        desc: "¿Planeando una travesía? Mira qué está haciendo el tráfico comercial en las aguas que vas a cruzar. Los grandes buques siguen rutas predecibles, y conocer esas rutas hace más segura una embarcación pequeña.",
      },
    ],
  },
  cruiseShips: {
    heading: [tx("Sigue a un "), ac("crucero específico")],
    body: "Los cruceros insignia tienen cada uno su propia página: datos verificados, cámaras de su puerto base y una posición AIS en vivo siempre que el barco esté transmitiendo, identificado por su MMSI. Cuando no transmite, la página lo dice en lugar de adivinar.",
    whereIs: "¿Dónde está",
    browseAll: "Ver todos los cruceros rastreados →",
  },
  faqHeading: [tx("Preguntas frecuentes del "), ac("rastreador de barcos")],
  faqs: [
    {
      q: "¿El rastreador de barcos es gratis?",
      a: "El globo de WorldEye en sí es gratis: sin cuenta, sin registro. El seguimiento marítimo de buques forma parte del feed premium de inteligencia marítima de WorldEye, incluido con una suscripción Pro. Todo lo demás en el mapa —vuelos, satélites, clima, terremotos, incendios y 74.229 cámaras públicas— es gratis para siempre.",
    },
    {
      q: "¿Cómo aparecen los barcos en el mapa?",
      a: "Los grandes buques comerciales emiten su posición, velocidad y rumbo mediante transpondedores AIS: señales de radio captadas por una red mundial de receptores y satélites. La capa marítima de WorldEye dibuja esos reportes en el globo a medida que llegan.",
    },
    {
      q: "¿Qué detalles puedo ver de cada buque?",
      a: "Posición, velocidad sobre el suelo, rumbo, tipo de buque (portacontenedores, petrolero, granelero, ferri, remolcador y más) y el destino que el buque ha reportado, además de puertos y puntos de estrangulamiento marítimos como contexto.",
    },
    {
      q: "¿Se muestran todos los barcos?",
      a: "Solo los buques que están emitiendo AIS. Los grandes barcos comerciales están obligados a llevar transpondedores AIS, pero las pequeñas embarcaciones privadas por lo general no —y los buques pueden apagarse fuera de la cobertura de los receptores o desconectar su transpondedor—, así que algunas zonas son más silenciosas que otras.",
    },
    {
      q: "¿Es la misma tecnología que los sitios de tráfico marítimo?",
      a: "Sí, son los mismos datos subyacentes: emisiones AIS agregadas por redes de receptores. La diferencia de WorldEye es el contexto: barcos en el mismo globo 3D que los vuelos sobre el cielo, los sistemas meteorológicos, las cámaras en vivo de los puertos y las imágenes satelitales.",
    },
    {
      q: "¿Cada cuánto se actualizan las posiciones de los buques?",
      a: "Las posiciones se actualizan a medida que llegan nuevos reportes AIS: los buques en movimiento reportan con más frecuencia, los fondeados o lentos con menos, y un buque que deja de transmitir deja de actualizarse. Es una imagen del tráfico, no un instrumento de navegación.",
    },
    {
      q: "¿Puedo ver la carga de un barco?",
      a: "No. AIS emite identidad, posición, velocidad, rumbo y destino, no lo que hay en las bodegas. Los manifiestos de carga son datos comerciales y aduaneros, no parte de la emisión.",
    },
    {
      q: "¿Por qué desaparecen algunos barcos del mapa?",
      a: "Un buque se apaga cuando sale de la cobertura de los receptores, desconecta su transpondedor o tiene una unidad averiada. El océano abierto lejos de las rutas marítimas y las desconexiones deliberadas son las dos razones habituales: el mapa muestra lo que está emitiendo, nada más.",
    },
    {
      q: "¿Puedo seguir un barco concreto por su nombre?",
      a: "Si sabes aproximadamente por dónde opera, amplía ese tramo de agua y búscalo entre el tráfico: su nombre, tipo, velocidad y destino reportado forman parte de la emisión AIS. Si está emitiendo y dentro de la cobertura, lo verás.",
    },
  ],
  voiceQuestions: {
    "follow-a-ship-at-sea": {
      question: "¿Cómo puedo seguir un barco en el mar?",
      shortAnswer:
        "El rastreador de barcos de WorldEye sitúa las posiciones de los buques desde datos AIS en el globo: puertos, rutas marítimas y barcos individuales. El feed marítimo está incluido con Pro; el globo gratuito sigue mostrando cámaras, vuelos y satélites sin cuenta.",
      longAnswer:
        "AIS es el sistema de transpondedores con el que los barcos emiten posición, rumbo y velocidad. WorldEye muestra una posición en vivo siempre que un barco esté transmitiendo; cuando no transmite, la página lo dice en lugar de adivinar. Las cámaras de los puertos cercanos te permiten relacionar el barco dibujado con el real.",
    },
    "track-a-cruise-ship": {
      question: "¿Puedo seguir un crucero en el mar?",
      shortAnswer:
        "Sí. El rastreador de barcos de WorldEye sitúa los buques en sus posiciones AIS reportadas, con velocidad, rumbo y tipo de buque: cruceros, petroleros y cargueros incluidos.",
      longAnswer:
        "Mira cómo el tráfico se concentra en estrechos, canales y aproximaciones a puertos a medida que llegan los reportes AIS. El feed marítimo está incluido con Pro; el globo gratuito sigue mostrando cámaras, vuelos y satélites sin cuenta.",
    },
  },
  voiceTitle: "Preguntas que hace la gente",
  closingCta: {
    heading: [tx("Mira las "), ac("rutas comerciales"), tx(" del mundo")],
    sub: "El feed marítimo completo —buques, puertos y puntos de estrangulamiento— forma parte de WorldEye Pro.",
    cta: "Ver los planes Pro",
    exploreBefore: "¿Solo quieres explorar? ",
    exploreLink: "Abre el globo gratuito",
  },
  related: [
    {
      label: "Rastreador de satélites",
      desc: "Miles de satélites sobre ti: la ISS, Starlink y más, en vivo en el globo.",
    },
    {
      label: "Funciones",
      desc: "Todo lo que el globo puede hacer: capas gratis para siempre y herramientas de inteligencia Pro.",
    },
    {
      label: "Precios",
      desc: "Planes Pro semanales, mensuales y anuales: el feed marítimo está incluido.",
    },
    {
      label: "Abrir el mapa",
      desc: "El globo 3D en vivo y gratuito: vuelos, clima, cámaras y más, sin registro.",
    },
    {
      label: "Rastreador de vuelos en vivo",
      desc: "Aviones en vivo en el mismo globo: la imagen aérea que acompaña a la marítima.",
    },
    {
      label: "Mejores herramientas de seguimiento de barcos",
      desc: "Las mejores herramientas de seguimiento de barcos comparadas: rastreadores AIS, datos de puertos y globos gratuitos.",
    },
    {
      label: "¿Qué es el AIS?",
      desc: "Cómo funciona realmente el seguimiento de barcos: los transpondedores, las redes de receptores y los límites detrás de cada buque en este mapa.",
    },
  ],
};

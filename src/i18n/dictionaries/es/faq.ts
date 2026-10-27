/**
 * Spanish FAQ dictionary — IN-HOUSE DRAFT translation of
 * dictionaries/en/faq.ts (2026-10-26; not yet professionally reviewed
 * — see the build REPORT). Facts match the English source: 74.229
 * cámaras, precios en USD, pruebas (semanal 3 días; mensual y VIP Pro
 * 10 días), y la vista satelital no se presenta como función Pro
 * porque es gratuita para todos.
 */

import type { FaqCopy, FaqEntryCopy } from "../en/faq";
import { lk, tx } from "../types";

const plain = (q: string, a: string): FaqEntryCopy => ({
  q,
  a: [tx(a)],
  schemaA: a,
});

export const esFaq: FaqCopy = {
  meta: {
    title: "Preguntas frecuentes",
    description:
      "Respuestas sobre WorldEye: si el mapa es gratis, si necesitas una cuenta, qué incluye Pro, pruebas y facturación, cámaras, seguimiento de vuelos, privacidad y ayuda con tu cuenta.",
    ogTitle: "Preguntas frecuentes | WorldEye",
    ogDescription:
      "¿El mapa es gratis? ¿Qué incluye Pro? ¿Cómo funcionan las pruebas? Todo respondido.",
  },
  topBar: {
    backToMap: "Volver al mapa",
    logoAria: "WorldEye — volver al globo en vivo",
  },
  hero: {
    badge: "CENTRO DE AYUDA",
    h1Before: "Preguntas ",
    h1Accent: "frecuentes",
    sub: "Respuestas directas sobre el mapa gratuito, Pro, la facturación y las funciones.",
  },
  groups: [
    {
      title: "General",
      faqs: [
        {
          q: "¿El mapa es realmente gratis?",
          a: [
            tx("Sí. El globo 3D, el seguimiento de vuelos en vivo, el transporte en vivo, 74.229 cámaras públicas, los satélites, los terremotos, los incendios, el clima y las fotos a nivel de calle son gratis para siempre, y también la búsqueda básica. Sin cuenta, sin tarjeta. Pro desbloquea las herramientas de nivel inteligencia sobre todo eso. Mira "),
            lk("pricing", "los precios"),
            tx(" para el desglose completo."),
          ],
          schemaA:
            "Sí. El globo 3D, el seguimiento de vuelos en vivo, el transporte en vivo, 74.229 cámaras públicas, los satélites, los terremotos, los incendios, el clima y las fotos a nivel de calle son gratis para siempre, y también la búsqueda básica. Sin cuenta, sin tarjeta. Pro desbloquea las herramientas de nivel inteligencia sobre todo eso.",
        },
        plain(
          "¿Necesito una cuenta?",
          "No. Solo abre el sitio y ya estás mirando el planeta. Las cuentas existen solo para suscriptores Pro (facturación) y afiliados, nunca como una puerta delante del mapa."
        ),
        plain(
          "¿Cuántas cámaras puedo abrir gratis?",
          "Cada dispositivo tiene 5 aperturas de cámara gratis: suficiente para explorar y revisar los lugares que te importan. Pro elimina el límite por completo, con aperturas ilimitadas además de las herramientas Pro. El globo, los vuelos, los satélites y cualquier otra capa gratuita nunca cuentan contra tus aperturas."
        ),
        plain(
          "¿Qué navegadores son compatibles?",
          "Cualquier navegador moderno: Chrome, Edge, Firefox y Safari, en escritorio y en móvil. El sitio se usa perfectamente en teléfonos: solo ábrelo en tu navegador móvil."
        ),
        plain(
          "¿Hay una app móvil?",
          "Todavía no. El sitio web está optimizado para móviles y funciona bien en los navegadores del teléfono, que es donde la mayoría lo usa hoy. Una app nativa está en el plan."
        ),
        plain(
          "¿En qué se diferencia WorldEye de Google Earth?",
          "Google Earth es un mapa del pasado grabado; WorldEye es un mapa del ahora. No hacemos imágenes históricas ni edificios 3D: fusionamos transmisiones en vivo —aeronaves, satélites, clima, terremotos, incendios y 74.229 cámaras públicas— que se actualizan en tiempo real en un solo globo."
        ),
        plain(
          "¿WorldEye funciona en mi país?",
          "Sí. WorldEye es un sitio web: ábrelo en cualquier navegador moderno, en cualquier parte del mundo. Todas las capas son globales; solo la densidad de cámaras varía por región, porque depende de lo que publica cada lugar."
        ),
        plain(
          "¿Cuál es el mejor sitio para ver cámaras en vivo de todo el mundo?",
          "WorldEye está hecho exactamente para eso: 74.229 cámaras públicas en vivo de 109 países en un solo globo 3D gratuito, sin registro para empezar a mirar. En lugar de buscar en cientos de sitios de agencias y estaciones, tienes cámaras de tráfico, ciudades, playas, esquí, aeropuertos y naturaleza en un solo mapa con buscador, con vuelos, clima y terremotos en capas a su alrededor."
        ),
        plain(
          "¿Puedo ver cámaras en vivo gratis?",
          "Sí: ver cámaras en vivo en WorldEye es gratis, y nunca necesitas una cuenta para explorar el globo. El plan gratuito incluye 5 aperturas de cámara en el globo; los planes de pago eliminan ese límite."
        ),
        plain(
          "¿Cómo funciona la escalera gratuita de cámaras?",
          "Empiezas con 5 aperturas de cámara gratis en cualquier dispositivo, sin cuenta y sin registro. Verifica tu correo y sumas 5 más; crea una cuenta gratuita y el total sube a 15 aperturas. Explorar el globo, los directorios de países y ciudades y cualquier otra capa gratuita nunca tiene límite, y los planes de pago eliminan por completo el límite de aperturas."
        ),
        plain(
          "¿Dónde puedo ver webcams en vivo de Nueva York?",
          "La página de webcams de Nueva York reúne las cámaras públicas de la ciudad —279 feeds en un radio de 25 km de Midtown, la mayoría de la red 511NY del NYSDOT— en un muro para toda la ciudad y otro para cada distrito: Manhattan, Brooklyn, Queens, el Bronx y Staten Island. Todas son gratis."
        ),
        plain(
          "¿Puedo ver las auroras boreales en una webcam gratis?",
          "Sí. La página de webcams de auroras reúne las cámaras públicas del cinturón auroral —825 en Finlandia, 482 en Islandia, 746 en Noruega, más Fairbanks, Alaska— junto al índice Kp en vivo, para que veas tanto la actividad del cielo como las cámaras bajo él. Son feeds de carreteras, clima y poblaciones en latitudes aurorales, no cámaras dedicadas a las auroras, y todas son gratis."
        ),
        plain(
          "¿Dónde puedo ver cruceros y puertos en vivo?",
          "La página de webcams de puertos crea un muro de cámaras para cada gran puerto del directorio: el puerto Victoria de Hong Kong, Tampa Bay, Miami, Fort Lauderdale, el puerto de Nueva York y más. Combina un muro con el rastreador de barcos en vivo: sigue un barco por su nombre en AIS mientras se acerca y luego mira su llegada en las cámaras del puerto."
        ),
        {
          q: "¿Qué diferencia hay entre WorldEye y God's Eye View?",
          a: [
            tx("God's Eye View es un software gratuito de código abierto que descargas y ejecutas tú mismo, con unas 4.000 cámaras; WorldEye es la misma idea como sitio web alojado, con 74.229 cámaras. Los dos proyectos son independientes. God's Eye View empieza sin ninguna clave API —las claves solo hacen falta para sus mosaicos 3D fotorrealistas y su agente de voz— y WorldEye no necesita instalación ni clave alguna. Hay una comparativa más completa en nuestra "),
            lk("alternatives/gods-eye-view", "página de alternativas a God's Eye View"),
            tx("."),
          ],
          schemaA:
            "God's Eye View es un software gratuito de código abierto que descargas y ejecutas tú mismo, con unas 4.000 cámaras; WorldEye es la misma idea como sitio web alojado, con 74.229 cámaras. Los dos proyectos son independientes. God's Eye View empieza sin ninguna clave API —las claves solo hacen falta para sus mosaicos 3D fotorrealistas y su agente de voz— y WorldEye no necesita instalación ni clave alguna. Hay una comparativa más completa en nuestra página de alternativas a God's Eye View.",
        },
        plain(
          "¿WorldEye funciona en mi teléfono?",
          "Sí: WorldEye funciona en cualquier navegador móvil moderno, sin nada que instalar, y el globo completo, las cámaras, los vuelos y la búsqueda funcionan en el móvil. El diseño se adapta a la pantalla más pequeña y los feeds se reproducen en línea. No hay una app separada que descargar: el sitio web es la app."
        ),
      ],
    },
    {
      title: "Pro y facturación",
      faqs: [
        {
          q: "¿Qué incluye Pro?",
          a: [
            tx("El asistente de IA OI (funciona con tu propia clave API), la capa de tráfico en vivo, los filtros de búsqueda avanzados, el kit de herramientas OSINT (nmap, DNS, WHOIS, análisis SSL) y el estudio de grabación de cámaras. Además, cada futura capa Pro sin costo extra. VIP Pro —el plan anual— añade encima los feeds de inteligencia premium y el timelapse de cámaras. La lista completa está en la "),
            lk("pricing", "página de precios"),
            tx("."),
          ],
          schemaA:
            "El asistente de IA OI (funciona con tu propia clave API), la capa de tráfico en vivo, los filtros de búsqueda avanzados, el kit de herramientas OSINT (nmap, DNS, WHOIS, análisis SSL) y el estudio de grabación de cámaras. Además, cada futura capa Pro sin costo extra. VIP Pro —el plan anual— añade encima los feeds de inteligencia premium y el timelapse de cámaras.",
        },
        plain(
          "¿Qué diferencia hay entre Pro y VIP Pro?",
          "VIP Pro es el plan anual: todo lo de Pro, más las dos exclusivas del nivel superior —los feeds de inteligencia premium (ciberamenazas, eventos GDELT, seguimiento marítimo, zonas de conflicto y noticias en vivo) y el timelapse de cámaras—. Los planes semanal y mensual son Pro; solo el plan anual es VIP Pro. El estudio de grabación, el kit OSINT y todas las demás herramientas Pro vienen con ambos."
        ),
        plain(
          "¿Cómo funcionan las pruebas gratis?",
          "El semanal empieza con 3 días gratis; los planes mensual y VIP Pro empiezan con 10 días gratis. Tu tarjeta se recoge al registrarte, pero nunca se cobra durante la prueba: cancela antes de que termine y no pagas nada."
        ),
        plain(
          "¿Puedo cancelar cuando quiera?",
          "Cuando quieras, con un clic. Tu acceso Pro continúa hasta el final del período que ya pagaste y después simplemente se detiene. Sin llamadas de retención ni patrones oscuros."
        ),
        plain(
          "¿Qué métodos de pago aceptan?",
          "Las principales tarjetas de crédito y débito mediante el pago seguro de Stripe. El semanal cuesta $7.99, el mensual $13.99 y VIP Pro $74.99."
        ),
        plain(
          "¿Necesito mi propia clave de OpenAI para el asistente de IA?",
          "Sí. OI funciona con tu propia clave API (OpenAI, Anthropic, Google u OpenRouter), así que el uso lo factura directamente el proveedor, a costo, sin recargos. Tu clave permanece en tu navegador; nosotros nunca la vemos."
        ),
        plain(
          "¿Cómo actualizo mi método de pago o consigo recibos?",
          "Todo lo relacionado con la facturación pasa por el portal seguro de clientes de Stripe: actualiza tu tarjeta, descarga facturas y recibos o cambia de plan. Para cualquier cosa que el portal no pueda hacer, escríbenos desde el correo de tu cuenta."
        ),
        plain(
          "¿Ofrecen reembolsos?",
          "Sí: tu primer cargo está cubierto por una garantía de devolución de 7 días. Escríbenos a passiveincomewai@gmail.com dentro de los 7 días de tu primer cargo —el cargo que termina tu prueba gratis, o tu primer cargo si tu plan no tuvo prueba— y te reembolsaremos todo a tu método de pago original, sin preguntas. La garantía cubre solo tu primer cargo; los cargos de renovación no son reembolsables bajo ella. También te escribimos antes del primer cargo de una prueba, así que no debería tomarte por sorpresa."
        ),
        plain(
          "¿Qué es VIP Pro?",
          "VIP Pro es el plan superior de WorldEye —$74.99 al año— y añade la grabación de 40 cámaras, el panel de grabación y alertas de cámara más holgadas sobre todo lo de Pro. Pro graba hasta 20 cámaras a la vez; VIP Pro graba 40. Las alertas de cámara vigilan hasta 2 cámaras en Pro y hasta 10 en VIP Pro, y te avisan por correo cuando aparece una condición que describes. VIP Pro empieza con una prueba gratis de 10 días."
        ),
      ],
    },
    {
      title: "Funciones",
      faqs: [
        {
          q: "¿Cómo funcionan las cámaras?",
          a: [
            tx("WorldEye agrega feeds de cámaras disponibles públicamente de todo el mundo —tráfico, calles de ciudades, lugares emblemáticos, naturaleza— en una sola capa explorable sobre el mapa. Son fuentes públicas de terceros, así que algunos feeds pueden desconectarse; la cobertura varía por región. Gratis para todos. Mira la "),
            lk("cameras", "página de cámaras en vivo"),
            tx(" para saber más."),
          ],
          schemaA:
            "WorldEye agrega feeds de cámaras disponibles públicamente de todo el mundo —tráfico, calles de ciudades, lugares emblemáticos, naturaleza— en una sola capa explorable sobre el mapa. Son fuentes públicas de terceros, así que algunos feeds pueden desconectarse; la cobertura varía por región. Gratis para todos.",
        },
        plain(
          "¿Qué tan preciso es el seguimiento de vuelos?",
          "Las posiciones vienen de las emisiones ADS-B que los aviones transmiten continuamente, así que la cobertura en vivo es realmente en tiempo real donde las redes de receptores tienen cobertura. Sobre océanos y zonas remotas, las actualizaciones pueden ser más espaciadas."
        ),
        plain(
          "¿La búsqueda es gratis?",
          "Sí. La búsqueda básica es gratis para todos: vuela a cualquier lugar, dirección o coordenadas, sin necesidad de cuenta. Pro añade filtros de búsqueda avanzados para afinar entre cámaras, aeronaves y feeds."
        ),
        plain(
          "¿La capa de tráfico es real?",
          "La congestión es real: datos de flujo de tráfico en vivo de TomTom, dibujados sobre las carreteras del mapa. Los puntos de vehículos que ilustran el flujo son simulados, y la app los etiqueta como simulados. La capa de tráfico es una función Pro."
        ),
        plain(
          "¿Puedo compartir una cámara con alguien?",
          "Sí. Cada cámara tiene un botón para compartir: envía el enlace y la otra persona llega al globo con esa cámara exacta abierta. No hace falta cuenta en ninguno de los dos lados."
        ),
        plain(
          "¿Puedo grabar una cámara o hacer un timelapse?",
          "Sí. El Estudio de grabación de cámaras de Pro graba feeds en vivo directamente en tu navegador y guarda los clips. El timelapse —capturar las cámaras de instantáneas fotograma a fotograma y exportar la película— es un extra de VIP Pro."
        ),
        plain(
          "¿Qué son los feeds de inteligencia?",
          "Capas de datos solo para VIP Pro: actividad de ciberamenazas, datos de eventos globales de GDELT, seguimiento marítimo de buques, zonas de conflicto y un feed de noticias en vivo, todo situado en el globo."
        ),
        plain(
          "¿Qué puedo seguir además de cámaras?",
          "Además de cámaras, WorldEye sigue vuelos en vivo, satélites —incluida la ISS—, barcos, radar meteorológico, terremotos e incendios, todo en el mismo globo. Los vuelos vienen de emisiones ADS-B, los barcos de AIS, los terremotos del USGS y los incendios de las detecciones satelitales de la NASA. Pro añade tráfico en vivo, transporte y capas de inteligencia como ciberamenazas y eventos globales."
        ),
        plain(
          "¿Cómo funcionan las alertas de cámara?",
          "Elige una cámara —hasta 2 en Pro, hasta 10 en VIP Pro—, describe una condición con palabras normales, y WorldEye revisa una imagen fija cada 15 minutos aproximadamente y te escribe cuando cambia. Por ejemplo, «nieve en la carretera» o «el aparcamiento está vacío». Una IA juzga cada imagen; si no puede saberlo, no se envía ninguna alerta en lugar de adivinar. Las alertas llegan por correo y en la app, con la foto adjunta. Las alertas de cámara vienen con los planes de pago: 2 cámaras en Pro, 10 en VIP Pro."
        ),
        plain(
          "¿Puedo grabar una cámara en vivo?",
          "Sí: los planes de pago graban cámaras en vivo directamente en tu navegador. Pro graba hasta 20 cámaras a la vez y VIP Pro hasta 40. Los clips se guardan en tu biblioteca de grabaciones para reproducirlos, y VIP Pro añade el panel de grabación. Algunos tipos de feed, como las transmisiones incrustadas de YouTube, no se pueden capturar y aparecen etiquetados como tales en el visor."
        ),
      ],
    },
    {
      title: "Cuenta y privacidad",
      faqs: [
        plain(
          "¿Cómo creo una cuenta?",
          "Haz clic en Registrarse y regístrate con tu correo —te enviaremos un enlace de verificación— o continúa con Google. Solo necesitas una cuenta para suscribirte a Pro o unirte al programa de afiliados; el mapa en sí nunca te pide iniciar sesión."
        ),
        plain(
          "¿Qué datos recoge WorldEye?",
          "Para los visitantes anónimos: prácticamente nada vinculado a ti, sin cuenta ni perfil de seguimiento. Si te suscribes a Pro o te unes al programa de afiliados, guardamos tu correo de acceso, el estado de tu suscripción y (para afiliados) los registros de referencias y pagos. Todos los detalles están en la política de privacidad."
        ),
        plain(
          "¿Venden mis datos o muestran anuncios?",
          "No. Sin venta de datos, sin red publicitaria, sin resultados patrocinados en ninguna parte del sitio. Los ingresos vienen de las suscripciones Pro: ese es todo el modelo de negocio."
        ),
        plain(
          "¿Cómo elimino mi cuenta?",
          "Escríbenos desde la dirección de tu cuenta y eliminaremos tu cuenta y sus datos asociados. Los registros de pago que Stripe debe conservar por motivos legales permanecen en Stripe, no con nosotros."
        ),
        plain(
          "Olvidé mi contraseña, ¿cómo la restablezco?",
          "Usa el enlace «Olvidé mi contraseña» de la página de inicio de sesión. Te enviaremos un enlace de restablecimiento que vence en 1 hora y se invalida al usarlo. Por seguridad, el inicio de sesión nunca revela si un correo está registrado."
        ),
        {
          q: "¿Cómo funciona el programa de afiliados?",
          a: [
            tx("Unirse es gratis y está abierto a cualquiera que cumpla los requisitos: no necesitas ser suscriptor. Comparte tu enlace de referencia; cuando alguien se suscribe a través de él, ganas una comisión recurrente del 15–30% (tu porcentaje crece con tu rango) en cada ciclo de facturación mientras siga suscrito. Las comisiones se liberan tras un período de retención de 30 días, y los pagos empiezan cuando tu saldo llega a $25. Los detalles están en la "),
            lk("affiliates", "página del programa de afiliados"),
            tx("."),
          ],
          schemaA:
            "Unirse es gratis y está abierto a cualquiera que cumpla los requisitos: no necesitas ser suscriptor. Comparte tu enlace de referencia; cuando alguien se suscribe a través de él, ganas una comisión recurrente del 15–30% (tu porcentaje crece con tu rango) en cada ciclo de facturación mientras siga suscrito. Las comisiones se liberan tras un período de retención de 30 días, y los pagos empiezan cuando tu saldo llega a $25. Los detalles están en la página del programa de afiliados.",
        },
      ],
    },
    {
      title: "Cámaras y disponibilidad",
      faqs: [
        plain(
          "¿De dónde vienen las cámaras y cuántas hay?",
          "WorldEye sirve 74.229 cámaras en vivo en 105 países. Cada feed es una transmisión publicada públicamente por su operador: departamentos de transporte, ciudades, aeropuertos, estaciones de esquí, puertos y negocios. Nosotros las agregamos y las mapeamos; no somos dueños de las cámaras ni las operamos."
        ),
        plain(
          "¿Por qué una cámara está fuera de línea?",
          "Cada feed lo opera un tercero —una ciudad, una agencia de transporte, una estación, un negocio— que transmite desde sus propios servidores. Los feeds se apagan cuando la fuente cae y vuelven cuando la fuente vuelve. El catálogo se actualiza a medida que las fuentes cambian, así que la cifra se mueve con el tiempo."
        ),
        plain(
          "¿Puedo pedir que se añada o retire una cámara?",
          "Si operas un feed de cámara público y quieres que se incluya —o tienes un feed listado aquí y quieres que se retire— contáctanos con los detalles y nos encargamos."
        ),
        plain(
          "¿Cuál es el límite gratuito de cámaras?",
          "El plan gratuito te permite abrir 5 cámaras en el globo. Explorar el mapa, los directorios de países y ciudades y las demás capas en vivo no tiene límite, y los planes de pago eliminan por completo el límite de aperturas. El límite existe para que el mapa gratuito siga siendo rápido y sostenible para todos."
        ),
        plain(
          "¿De dónde vienen las cámaras?",
          "Las cámaras son feeds públicos que sus operadores publican abiertamente: departamentos de transporte, ciudades, aeropuertos, estaciones de esquí, puertos y negocios. Estados Unidos aporta la mayor parte: 41.355 cámaras, en gran medida redes estatales de transporte. WorldEye agrega y mapea los feeds; no opera las cámaras, y por eso un feed se apaga de vez en cuando cuando se apaga la transmisión de su operador."
        ),
      ],
    },
  ],
  contactCta: {
    heading: "¿Sigues atascado?",
    sub: "Escríbenos: respondemos en 1–2 días laborables.",
    button: "Contáctanos",
  },
  related: [
    {
      label: "Funciones",
      desc: "El recorrido completo: capas gratis para siempre y el kit de inteligencia Pro.",
    },
    {
      label: "Contacto",
      desc: "¿Sigues atascado? Preguntas, comentarios o ideas de colaboración: escríbenos.",
    },
    {
      label: "Registro de cambios",
      desc: "Qué hay de nuevo en WorldEye: actualizaciones y lanzamientos a medida que se publican.",
    },
    {
      label: "Seguridad",
      desc: "Cómo te protege WorldEye, en lenguaje claro y sin afirmaciones infladas.",
    },
  ],
};

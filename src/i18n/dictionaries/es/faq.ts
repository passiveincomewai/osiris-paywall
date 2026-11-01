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
        plain(
          "¿Qué es WorldEye?",
          "WorldEye es un sitio web gratuito que pone un globo 3D en vivo de la Tierra en tu navegador: 74.229 cámaras públicas, vuelos en vivo, satélites, clima, terremotos e incendios en un solo mapa. No hay nada que instalar y no necesitas una cuenta para explorar. Los planes de pago añaden un analista de IA, grabación de cámaras, alertas y capas de inteligencia premium."
        ),
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
          "Empiezas con 5 aperturas de cámara gratis en cualquier dispositivo, sin cuenta y sin registro. Añade tu correo y sumas 5 más — 10 aperturas en total; una cuenta gratuita llega a las mismas 10 al verificar su correo. Explorar el globo, los directorios de países y ciudades y cualquier otra capa gratuita nunca tiene límite, y los planes de pago eliminan por completo el límite de aperturas."
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
        plain(
          "¿De dónde vienen los datos de WorldEye?",
          "De fuentes públicas: emisiones ADS-B de aeronaves, transpondedores AIS de barcos, datos orbitales de satélites, redes públicas de webcams y feeds abiertos de terremotos, clima e incendios. WorldEye recopila y visualiza datos públicos: no hackea, no intercepta ni compra datos privados."
        ),
      ],
    },
    {
      title: "Pro y facturación",
      faqs: [
        {
          q: "¿Qué incluye Pro?",
          a: [
            tx("El asistente de IA OI (funciona con la IA integrada de WorldEye — no necesitas clave; tu propia clave también funciona), la capa de tráfico en vivo, los filtros de búsqueda avanzados, el kit de herramientas OSINT (nmap, DNS, WHOIS, análisis SSL) y el estudio de grabación de cámaras. Además, cada futura capa Pro sin costo extra. VIP Pro —el plan anual— añade encima los feeds de inteligencia premium y el timelapse de cámaras. La lista completa está en la "),
            lk("pricing", "página de precios"),
            tx("."),
          ],
          schemaA:
            "El asistente de IA OI (funciona con la IA integrada de WorldEye — no necesitas clave; tu propia clave también funciona), la capa de tráfico en vivo, los filtros de búsqueda avanzados, el kit de herramientas OSINT (nmap, DNS, WHOIS, análisis SSL) y el estudio de grabación de cámaras. Además, cada futura capa Pro sin costo extra. VIP Pro —el plan anual— añade encima los feeds de inteligencia premium y el timelapse de cámaras.",
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
          "¿Qué pasa si cambio de plan?",
          "Las mejoras se aplican de inmediato, con el prorrateo gestionado por Stripe. Las rebajas de plan entran en vigor al final de tu período actual."
        ),
        plain(
          "¿Qué métodos de pago aceptan?",
          "Las principales tarjetas de crédito y débito mediante el pago seguro de Stripe. El semanal cuesta $7.99, el mensual $13.99 y VIP Pro $74.99."
        ),
        plain(
          "¿Necesito mi propia clave de OpenAI para el asistente de IA?",
          "No. OI funciona con la IA integrada de WorldEye para los miembros con sesión iniciada: no tienes que traer una clave API, ni una cuenta de otro proveedor, ni nadie más te factura por separado. Si prefieres usar tu propia cuenta, añade tu clave API (OpenAI, Anthropic, Google u OpenRouter) en los ajustes de OI: permanece en tu navegador, nunca la vemos, y pasa a usarse siempre que esté presente."
        ),
        plain(
          "¿Cómo actualizo mi método de pago o consigo recibos?",
          "Todo lo relacionado con la facturación pasa por el portal seguro de clientes de Stripe: actualiza tu tarjeta, descarga facturas y recibos o cambia de plan. Para cualquier cosa que el portal no pueda hacer, escríbenos desde el correo de tu cuenta."
        ),
        plain(
          "¿Ofrecen reembolsos?",
          "Sí: tu primer cargo está cubierto por una garantía de devolución de 7 días. Escríbenos a contact@worldeye.app dentro de los 7 días de tu primer cargo —el cargo que termina tu prueba gratis, o tu primer cargo si tu plan no tuvo prueba— y te reembolsaremos todo a tu método de pago original, sin preguntas. La garantía cubre solo tu primer cargo; los cargos de renovación no son reembolsables bajo ella. También te escribimos antes del primer cargo de una prueba, así que no debería tomarte por sorpresa."
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
      ],
    },
    {
      title: "Cámaras y disponibilidad",
      faqs: [
        plain(
          "¿De dónde vienen las cámaras y cuántas hay?",
          "WorldEye sirve 74.229 cámaras en vivo en 109 países. Cada feed es una transmisión publicada públicamente por su operador: departamentos de transporte, ciudades, aeropuertos, estaciones de esquí, puertos y negocios. Nosotros las agregamos y las mapeamos; no somos dueños de las cámaras ni las operamos."
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
        plain(
          "¿Cómo encuentro cámaras de un país o una ciudad concretos?",
          "Abre el mapa en vivo y busca cualquier lugar para volar directamente a sus cámaras más cercanas, o explora el directorio: las páginas de países listan cada cámara del índice en vivo de ese país con filtros por zona, y las páginas de ciudades reúnen los feeds de una ciudad en un solo lugar."
        ),
        plain(
          "¿Hay cámaras en vivo cerca de mí?",
          "Probablemente, si tu zona publica feeds públicos. La comprobación más rápida es el buscador de esta página: escribe tu ciudad o zona y el directorio lista las cámaras que hay allí; el directorio de países y las 25 regiones principales también muestran dónde están las redes más densas. En el globo en vivo puedes acercarte directamente a tu barrio y tocar cualquier marcador de cámara. Donde no existe ningún feed público cercano, el directorio muestra la localidad cubierta más cercana en lugar de fingir otra cosa."
        ),
        plain(
          "¿Cómo se mantiene honesto el directorio?",
          "Cada feed se comprueba para asegurarse de que realmente se reproduce antes de listarse —una cámara que no transmite no cuenta— y el directorio vuelve a comprobar y deduplicar los feeds con el tiempo. La cifra principal es el recuento de cámaras que el globo realmente sirve, y por eso es exacta en lugar de una cifra redonda de marketing."
        ),
      ],
    },
    {
      title: "Seguridad",
      faqs: [
        plain(
          "¿WorldEye guarda mi tarjeta?",
          "No. Stripe procesa todos los pagos; los números de tarjeta nunca tocan los sistemas de WorldEye."
        ),
        plain(
          "¿Mi tarjeta está segura durante una prueba gratis?",
          "Sí: las pruebas usan el mismo pago alojado por Stripe que los planes de pago. Tu tarjeta va a Stripe, nunca a WorldEye, y no se cobra nada durante la prueba."
        ),
        plain(
          "¿Cómo reporto una vulnerabilidad de seguridad?",
          "A través de la página de contacto, con todo el detalle que puedas compartir. Danos la oportunidad de corregirla antes de divulgarla públicamente, por favor."
        ),
        plain(
          "¿Qué hago si creo que mi cuenta fue comprometida?",
          "Restablece tu contraseña de inmediato desde la página de inicio de sesión (los enlaces de restablecimiento vencen en 1 hora y se invalidan al usarlos), y luego contáctanos desde el correo de tu cuenta para que podamos revisar la cuenta contigo."
        ),
      ],
    },
    {
      title: "Modo Ambiente",
      faqs: [
        plain(
          "¿Qué es el Modo Ambiente de WorldEye?",
          "El Modo Ambiente es un reproductor de Slow TV en worldeye.app/ambient. Reproduce las cámaras públicas en vivo de WorldEye de una en una, a pantalla completa, con fundidos cada 30–180 segundos (90 por defecto) y colecciones llamadas ambientes: Ciudades lluviosas, Montañas nevadas, Playas tropicales, Vistas nocturnas, o todo el planeta en orden aleatorio. Está diseñado para televisores, monitores secundarios y escritorios de estudio: los controles se ocultan solos y un pequeño rótulo nombra el lugar de cada cámara."
        ),
        plain(
          "¿Cuánto cuesta Ambiente?",
          "Ambiente cuesta $4.99/mes con una prueba gratis de 10 días: inicia la prueba desde el reproductor o desde esta página y no se te cobrará hasta que termine. Es un producto independiente, separado de WorldEye Pro, pero todos los planes Pro y VIP ya incluyen Ambiente ilimitado sin costo extra."
        ),
        plain(
          "¿Puedo poner Ambiente en mi TV?",
          "Sí: abre worldeye.app/ambient en el navegador de tu smart TV, o transmite/refleja desde un teléfono, una tableta o un portátil, y luego pulsa iniciar: Ambiente se pone a pantalla completa y sus controles se ocultan tras tres segundos. La función Transmitir a YouTube también puede poner Ambiente en un televisor mediante la app de YouTube, ejecutando el programa en tu propio canal."
        ),
        plain(
          "¿Puedo probar Ambiente gratis sin registrarme?",
          "Sí. Abre worldeye.app/ambient y pulsa iniciar: todo el mundo recibe una demo de streaming de 3 minutos, sin cuenta y sin tarjeta. La demo solo cuenta el tiempo mientras una cámara se está reproduciendo de verdad: pausar o un feed lento no lo consume. Cuando termina, la imagen se difumina y puedes iniciar la prueba gratis de 10 días o iniciar sesión si ya tienes Ambiente o Pro."
        ),
        plain(
          "¿Puedo transmitir Ambiente a mi propio canal de YouTube?",
          "Sí: eso es Transmitir a YouTube, incluido con Ambiente y con Pro. Guardas tu propia clave de transmisión de YouTube en los ajustes y ejecutas un pequeño programa de retransmisión en un ordenador siempre encendido; va rotando las cámaras que WorldEye tiene autorización para redistribuir, con una marca de crédito de WorldEye, durante todo el tiempo que lo dejes funcionando. Mira la página de Transmitir a YouTube para ver cómo funciona y qué cámaras son elegibles."
        ),
      ],
    },
    {
      title: "Geolocalización de fotos",
      faqs: [
        plain(
          "¿Cómo funciona aquí la geolocalización de fotos?",
          "Por capas. Primero van las coordenadas GPS incrustadas en el archivo de la foto (EXIF): forman parte del propio archivo. Sin ellas, la herramienta extrae pistas visibles (texto de carteles, lugares emblemáticos con nombre, estilos de matrícula, lado de conducción, arquitectura, vegetación), busca los lugares con nombre en OpenStreetMap y ordena las coincidencias según cuánta evidencia independiente respalda cada una. La ordenación es determinista: las mismas pistas siempre producen el mismo orden, y la evidencia se muestra para que puedas juzgarla por ti mismo."
        ),
        plain(
          "¿Cuánto cuesta?",
          "Nada: es una beta gratuita y sin registro. Para que sea sostenible hay un límite de 3 análisis al día por visitante, y el paso de pistas visuales tiene un presupuesto diario; cuando ese presupuesto se agota, la herramienta sigue funcionando en modo de solo metadatos y te lo dice."
        ),
        plain(
          "¿Mi foto se guarda o se comparte?",
          "No. Tu foto se procesa en memoria en el servidor y se descarta cuando el análisis termina. No se guarda en disco ni en una base de datos, no se usa para entrenamiento y nunca se envía a una búsqueda inversa de imágenes ni a ningún servicio fotográfico de terceros. Lo único que sale del servidor son pistas de texto (por ejemplo, el nombre de un lugar emblemático) enviadas a OpenStreetMap para buscar el lugar y —cuando el análisis visual está activado— la propia imagen, enviada una sola vez al proveedor de IA que impulsa el paso de pistas. Nada de tu foto se conserva después."
        ),
        plain(
          "¿Guardan analítica sobre mi foto o sobre dónde se tomó?",
          "No. Contamos los análisis completados para saber si la beta se usa, y un análisis completado registra exactamente un dato grueso: si la respuesta vino de los metadatos del archivo, de la coincidencia de pistas visuales, o no pudo determinarse. Ninguna foto, ningún texto de pista y ninguna coordenada —ni siquiera la del resultado— se adjuntan a ese recuento. La foto en sí se procesa en memoria y se descarta, como describen las notas de privacidad de esta página."
        ),
        plain(
          "¿Identifica a personas en las fotos?",
          "No. La herramienta no realiza reconocimiento facial ni identifica a individuos, y las personas de una foto nunca se usan como pistas."
        ),
        plain(
          "¿Qué tan preciso es?",
          "Cada resultado lleva su propio radio de incertidumbre, y ese radio es la respuesta honesta: «dentro de unos 250 m» significa exactamente eso, y un radio amplio significa que la coincidencia es amplia. El GPS encontrado en el archivo suele ser el resultado más fuerte; las coincidencias de lugares emblemáticos y nombres varían según lo distintivo que sea el lugar. Es una beta y las coincidencias pueden fallar, y por eso siempre se muestra la evidencia a favor y en contra de cada candidato. Los resultados de casas y propiedades privadas se muestran deliberadamente solo como una zona general."
        ),
        plain(
          "¿Qué significan los niveles de confianza y la puntuación de evidencia?",
          "Cada candidato lleva una puntuación numérica de evidencia del paso de ordenación: el GPS del archivo está arriba, las coincidencias de lugares emblemáticos parten por encima de las de nombres de lugar, la prominencia del lugar en OpenStreetMap suma a la puntuación, y una segunda pista independiente que apunta a la misma zona suma más. La banda de confianza (alta, media, baja) es solo esa puntuación agrupada en tres bandas. Es una medida de cuánta evidencia respalda la coincidencia —no una garantía— y por eso el razonamiento de la puntuación y la evidencia a favor y en contra se muestran siempre a su lado."
        ),
        plain(
          "¿Qué pistas deciden realmente el resultado?",
          "Solo dos cosas pueden crear un candidato: las coordenadas GPS incrustadas en el archivo, y un lugar emblemático o nombre de lugar que coincida con un lugar de OpenStreetMap. El resto del conjunto de pistas —estilo de matrícula, lado de conducción, vegetación, arquitectura, idiomas— se registra y se muestra por transparencia, pero nunca puntúa una coincidencia por sí solo. La única excepción parcial es el tipo de escena: no mueve a un candidato, pero impulsa la decisión de privacidad que convierte una probable casa en un resultado de solo zona."
        ),
        plain(
          "¿Por qué no pudo determinar mi foto?",
          "La mayoría de las veces porque el archivo ha pasado por una app que elimina los metadatos —WhatsApp, Instagram, Facebook y las capturas de pantalla eliminan el GPS— y la escena en sí no muestra ningún cartel, lugar emblemático o nombre legible. Una foto de una playa, un bosque o una calle genérica puede ser realmente imposible de situar desde un solo fotograma. El archivo original, directo de la cámara o el teléfono, le da a la herramienta mucho más con lo que trabajar."
        ),
        plain(
          "¿Por qué mi resultado es una zona en lugar de un punto?",
          "Dos reglas de privacidad. Ningún resultado se muestra nunca con un radio menor de 250 m. Y cuando una foto parece una residencia o propiedad privada, el punto exacto se suprime por completo y solo se muestra la zona general. Esto se aplica incluso cuando la evidencia subyacente es precisa: las casas de otras personas no son un rompecabezas para publicar."
        ),
        plain(
          "¿Por qué el radio de incertidumbre es distinto en cada resultado?",
          "Porque es el tamaño propio del lugar coincidente, no un margen de error fijo. Un candidato hereda el radio del lugar que OpenStreetMap emparejó —aproximadamente la mitad de la extensión de su contorno mapeado—, así que una estación recibe un círculo ajustado y una coincidencia del tamaño de una ciudad recibe uno amplio. Después se aplican dos reglas: el suelo de privacidad de 250 m (un contorno menor se muestra igualmente como 250 m, y el GPS del archivo siempre se muestra en el suelo), y la supresión residencial, que sustituye el punto por una zona general. Cada resultado explica cuál de estas produjo el radio que ves."
        ),
      ],
    },
    {
      title: "Empresa y API",
      faqs: [
        plain(
          "¿Qué es el feed de cámaras Enterprise de WorldEye?",
          "Es una licencia para construir sobre el propio catálogo de WorldEye. En lugar de enviar a tu audiencia a worldeye.app, construyes colecciones de cámaras personalizadas desde el catálogo y las publicas en tu propio sitio o plataforma: mediante un reproductor en vivo incrustable, un feed de datos JSON privado de tus colecciones y —si lo quieres— claves API sobre los mismos datos."
        ),
        plain(
          "¿Cuánto cuesta Enterprise y hay prueba gratis?",
          "Enterprise cuesta $999/año, con facturación anual. A diferencia de los planes Pro, no tiene prueba gratis; tu primer cargo está cubierto por una garantía de devolución de 7 días: escríbenos dentro de los 7 días del cargo y te reembolsaremos todo, sin preguntas."
        ),
        plain(
          "¿Qué cámaras puedo publicar en mi propio sitio?",
          "Solo las cámaras que los términos de cada fuente permiten redistribuir. Cada cámara del catálogo lleva un veredicto de derechos por fuente, y el embed, el feed y la API lo hacen cumplir: alrededor del 96% del catálogo es elegible, y algunas fuentes —entre ellas las webcams de Windy— están excluidas por completo, así que nada de lo que tu organización publique sobrepasa los derechos que lo respaldan."
        ),
        plain(
          "¿Qué recibe mi equipo además del feed?",
          "Todo lo de Pro, para todo tu equipo, además de soporte prioritario al cliente. El panel de autoservicio es toda la superficie del producto: colecciones, el embed, el feed de datos y tus claves."
        ),
        plain(
          "¿Cómo empiezo?",
          "Suscríbete a Enterprise en la página de precios, inicia sesión y abre el panel de empresa en esta página: crea tu primera colección y luego toma el embed, el feed o una clave API desde el mismo lugar. La ayuda de integración está incluida: te ayudamos a conectar el embed o el feed con tu plataforma."
        ),
      ],
    },
    {
      title: "Afiliados y creadores",
      faqs: [
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
        plain(
          "¿Cuándo me pagan?",
          "Las comisiones permanecen en estado pendiente durante un período de retención de 30 días después de que se liquida el pago de la suscripción subyacente, y luego quedan disponibles en tu saldo de pagos. Cuando tu saldo disponible alcanza el mínimo de $25, puedes solicitar un pago, que nuestro equipo revisa y procesa."
        ),
        plain(
          "¿Cómo funcionan los códigos de descuento?",
          "Cada rango lleva un código de descuento personal: 5% de descuento para tu audiencia en Explorer, hasta un 30% en Visionary. Una venta hecha con tu código cuenta como tu referencia aunque el comprador nunca haya hecho clic en tu enlace, así que los códigos funcionan en vídeos, pódcasts y papel, donde los enlaces no."
        ),
        plain(
          "¿Qué pasa si alguien a quien referí cancela?",
          "Ganas en cada renovación válida mientras siga suscrito, así que una cancelación simplemente significa que las renovaciones (y las comisiones sobre ellas) se detienen ahí."
        ),
        plain(
          "¿Puedo promocionar WorldEye en cualquier sitio?",
          "Comparte tu enlace y tu código donde tengas una audiencia genuina: publicaciones sociales, vídeos, transmisiones, boletines, comunidades. Lo que no puedes hacer es fabricar actividad: los clics falsos, las autorreferencias y las cuentas duplicadas se detectan y no ganan nada, y el abuso puede terminar una compensación o una cuenta."
        ),
        plain(
          "¿Los ingresos están garantizados?",
          "No. Las comisiones se ganan solo de suscripciones a WorldEye legítimas y pagadas, nunca solo por reclutar. Tus ganancias dependen por completo de que clientes reales se suscriban a través de tu enlace de referencia."
        ),
      ],
    },
    {
      title: "Soporte y solución de problemas",
      faqs: [
        plain(
          "¿En cuánto tiempo recibiré respuesta?",
          "Normalmente respondemos en 1–2 días laborables. WorldEye lo lleva un equipo independiente pequeño, así que los problemas técnicos complejos pueden tardar un poco más, pero cada mensaje se lee."
        ),
        plain(
          "Tengo un problema de facturación, ¿qué debo incluir?",
          "Escribe desde la dirección de correo de tu cuenta e incluye tu plan (semanal, mensual o anual) y la fecha del cargo. Eso nos permite encontrar tu suscripción en Stripe de inmediato."
        ),
        plain(
          "Una capa de cámaras, vuelos o satélites no funciona, ¿qué hago?",
          "Primero prueba una recarga forzada: la mayoría de las capas dependen de feeds en vivo de terceros que pueden fallar momentáneamente. Si sigue caída, dinos qué capa, tu navegador y aproximadamente cuándo empezó; comprobaremos si el propio feed está fuera de línea."
        ),
        plain(
          "Un feed de cámara está caído, equivocado o mal etiquetado, ¿puedo reportarlo?",
          "Por favor. Envía el nombre o la ubicación de la cámara y qué parece estar mal (fuera de línea, lugar equivocado, duplicada). El directorio está verificado por reproducción, y reportes como el tuyo son una de las vías por las que se encuentran y corrigen los feeds caídos y mal etiquetados."
        ),
        plain(
          "¿Ofrecen soporte por teléfono o chat en vivo?",
          "No: solo por correo por ahora. Mantiene el soporte personal y permite que todo el equipo vea y responda tu mensaje en lugar de un chatbot."
        ),
      ],
    },
  ],
  search: {
    placeholder: "Buscar preguntas…",
    ariaLabel: "Buscar en las preguntas frecuentes",
    resultsTemplate: "{n} preguntas coinciden",
    noResultsHeading: "Sin resultados para esa búsqueda",
    noResultsBody:
      "Prueba con otras palabras, o ve al centro de ayuda, donde una persona real lee cada mensaje.",
    helpCenterLink: "Visita el centro de ayuda",
  },
  recommended: {
    heading: "Preguntas más recomendadas",
    questions: [
      "¿El mapa es realmente gratis?",
      "¿Cómo funcionan las pruebas gratis?",
      "¿Qué incluye Pro?",
      "¿Puedo cancelar cuando quiera?",
      "¿Ofrecen reembolsos?",
      "¿Cuántas cámaras puedo abrir gratis?",
      "¿Por qué una cámara está fuera de línea?",
      "¿Cómo creo una cuenta?",
      "Olvidé mi contraseña, ¿cómo la restablezco?",
      "¿Puedo grabar una cámara en vivo?",
    ],
  },
  viewAll: {
    button: "Ver todas las preguntas",
    heading: "Todas las preguntas",
  },
  helpCenter: {
    heading: "El centro de ayuda de WorldEye",
    body: "Tutoriales paso a paso para cada función, y una bandeja de soporte que responde en 1–2 días laborables: si no está respondido aquí, está respondido allí.",
    button: "Ayuda y contacto",
    tutorialsLabel: "Explorar los tutoriales",
  },
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

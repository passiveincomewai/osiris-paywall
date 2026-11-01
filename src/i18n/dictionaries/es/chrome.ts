/**
 * Spanish chrome dictionary — IN-HOUSE DRAFT translation of
 * dictionaries/en/chrome.ts (Phase 1 tranche, 2026-10-24; ported
 * 2026-10-26 with the Ambient Mode + Live Events footer links the
 * English source gained since; not yet professionally reviewed — see
 * the build REPORT). Hrefs are routing, never translated; brand and
 * product names follow the glossary.
 */

import type { ChromeCopy } from "../en/chrome";

export const esChrome: ChromeCopy = {
  signIn: "Iniciar sesión",
  signUp: "Registrarse",
  upgradeToPro: "Pasar a PRO",
  newsletterEyebrow: "BOLETÍN",
  newsletterHeadline: "Novedades de inteligencia, nuevas capas, lanzamientos.",
  newsletterSub: "Un correo cuando importa. Sin spam, cancela cuando quieras.",
  brandTagline:
    "Inteligencia planetaria en vivo. El mapa es gratis para todos: Pro financia la infraestructura.",
  footerColumns: [
    {
      title: "Producto",
      links: [
        { label: "Mapa en vivo", href: "/" },
        { label: "Funciones", href: "/features" },
        { label: "Modo ambiente", href: "/ambient-mode" },
        { label: "Precios", href: "/pricing" },
        { label: "VIP Pro", href: "/vip" },
        { label: "Enterprise", href: "/enterprise" },
        { label: "Cámaras en vivo", href: "/cameras" },
        { label: "Cámaras por país", href: "/cameras/countries" },
        {
          label: "Afiliados",
          href: "/affiliates",
          sublabel: "Gana un 15–30% recurrente",
        },
      ],
    },
    {
      title: "Cámaras",
      links: [
        { label: "Webcams en vivo", href: "/live-webcams" },
        { label: "Cámaras de tráfico", href: "/live-traffic-cameras" },
        { label: "Webcams de ciudades", href: "/world-city-webcams" },
        { label: "Cámaras de Europa", href: "/europe-live-cameras" },
        { label: "Webcams de playas", href: "/beach-webcams" },
        { label: "Webcams de esquí", href: "/ski-webcams" },
        { label: "Eventos en vivo", href: "/live-events" },
        { label: "Webcams de aeropuertos", href: "/airport-webcams" },
        { label: "Webcams de Asia", href: "/asia-webcams" },
        { label: "Índice de cámaras en vivo", href: "/live-camera-index" },
      ],
    },
    {
      title: "Recursos",
      links: [
        { label: "Blog", href: "/blog" },
        { label: "Casos de uso", href: "/use-cases" },
        { label: "Preguntas frecuentes", href: "/faq" },
        { label: "Ayuda y tutoriales", href: "/tutorials" },
        { label: "Registro de cambios", href: "/changelog" },
        { label: "¿Qué es ADS-B?", href: "/what-is-ads-b" },
        { label: "¿Qué es AIS?", href: "/what-is-ais" },
        { label: "Mejores herramientas OSINT", href: "/best-osint-tools" },
        { label: "Herramientas OSINT gratis", href: "/free-osint-tools" },
        { label: "Acceso para investigación y educación", href: "/research-access" },
        { label: "White Label", href: "/white-label" },
      ],
    },
    {
      title: "Empresa y legal",
      links: [
        { label: "Acerca de", href: "/about" },
        { label: "Contacto", href: "/contact" },
        { label: "Socios", href: "/partners" },
        { label: "Fuentes de cámaras", href: "/camera-sources" },
        { label: "Política de privacidad", href: "/privacy" },
        { label: "Términos del servicio", href: "/terms" },
        { label: "Seguridad", href: "/security" },
        { label: "Términos de afiliados", href: "/affiliates/terms" },
        { label: "Admin", href: "/admin" },
      ],
    },
  ],
  copyright: "© 2026 WorldEye. Todos los derechos reservados.",
  liveDataNote: "Datos en vivo de fuentes públicas de todo el mundo.",
  selectorLabel: "Idioma",
  selectorHomepageNote: "página principal",
};

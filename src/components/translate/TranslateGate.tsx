'use client';

import { useEffect } from 'react';
import { activeLocale } from '@/lib/translate/locale';
import { SOURCE_LANGUAGE_CODE } from '@/lib/translate/languages';

/**
 * Site-wide machine translation, driven by the Google Translate web element.
 *
 * Mounted once in the root layout. When the we_locale cookie names a
 * language, this gate activates translation; with no cookie (or English) it
 * renders only the chrome-hiding stylesheet below and touches nothing —
 * default behaviour is byte-for-byte the untranslated site.
 *
 * Why the DOM guards: the translate element rewrites text nodes in place
 * (wrapping them in <font> elements). React, which owns those nodes, can
 * later try to remove a child whose parent the translator changed, throwing
 * "Failed to execute 'removeChild' on 'Node'" and unmounting the app — a
 * well-known crash class on live-updating React pages like the globe. The
 * standard mitigation is installed BEFORE the translator script loads: make
 * removeChild/insertBefore tolerant of a mismatched parent. With the guards
 * in place, React skips the stale node instead of crashing, and its next
 * render reconciles normally.
 *
 * Failure discipline: activation is wrapped so that any error (script
 * blocked by an extension, translate service unreachable, CSP) leaves the
 * site running untranslated. Translation is an enhancement, never a
 * dependency. There is no UI for the failure — the page simply stays in
 * English, which is always a correct state.
 */

const SCRIPT_ID = 'worldeye-google-translate-script';
const GADGET_ID = 'google_translate_element';

let guardsInstalled = false;

function installDomGuards(): void {
  if (guardsInstalled || typeof Node === 'undefined') return;
  guardsInstalled = true;
  try {
    const originalRemoveChild = Node.prototype.removeChild;
    Node.prototype.removeChild = function <T extends Node>(child: T): T {
      if (child.parentNode !== this) {
        // The translator reparented this node; React's copy is stale.
        return child;
      }
      return originalRemoveChild.call(this, child) as T;
    } as typeof Node.prototype.removeChild;

    const originalInsertBefore = Node.prototype.insertBefore;
    Node.prototype.insertBefore = function <T extends Node>(
      node: T,
      child: Node | null,
    ): T {
      if (child && child.parentNode !== this) {
        // Reference node moved by the translator; append instead of throw.
        return originalInsertBefore.call(this, node, null) as T;
      }
      return originalInsertBefore.call(this, node, child) as T;
    } as typeof Node.prototype.insertBefore;
  } catch {
    // If the prototypes are sealed, proceed without guards rather than
    // breaking the page — the widget is still an enhancement only.
  }
}

function activate(locale: string): void {
  installDomGuards();

  if (!document.getElementById(GADGET_ID)) {
    const gadget = document.createElement('div');
    gadget.id = GADGET_ID;
    gadget.className = 'notranslate';
    gadget.setAttribute('aria-hidden', 'true');
    gadget.style.display = 'none';
    document.body.appendChild(gadget);
  }

  (window as unknown as Record<string, unknown>).googleTranslateElementInit =
    () => {
      try {
        const w = window as unknown as {
          google?: {
            translate?: {
              TranslateElement: new (
                options: Record<string, unknown>,
                id: string,
              ) => unknown;
            };
          };
        };
        if (w.google?.translate?.TranslateElement) {
          new w.google.translate.TranslateElement(
            { pageLanguage: SOURCE_LANGUAGE_CODE, autoDisplay: false },
            GADGET_ID,
          );
        }
      } catch {
        /* enhancement only — never surface */
      }
    };

  if (!document.getElementById(SCRIPT_ID)) {
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src =
      'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async = true;
    script.onerror = () => {
      /* blocked or offline: stay in English, say nothing */
    };
    document.head.appendChild(script);
  }

  // Belt and braces: if a previous session left the widget mid-translation
  // with a different cookie, the fresh init above already honours the
  // current cookie. `locale` is retained for future diagnostics.
  void locale;
}

export default function TranslateGate() {
  useEffect(() => {
    try {
      const locale = activeLocale(document.cookie);
      if (locale === SOURCE_LANGUAGE_CODE) return;
      activate(locale);
    } catch {
      /* never let translation break the app shell */
    }
  }, []);

  return (
    <style>{`
      .goog-te-banner-frame.skiptranslate,
      .goog-te-banner-frame,
      #goog-gt-tt,
      .goog-te-balloon-frame {
        display: none !important;
        visibility: hidden !important;
      }
      body {
        top: 0 !important;
        position: static !important;
      }
      .goog-te-gadget {
        display: none !important;
      }
      font[style] {
        background: transparent !important;
        box-shadow: none !important;
      }
    `}</style>
  );
}

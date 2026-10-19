'use client';

import { useEffect, useState } from 'react';
import { Languages } from 'lucide-react';
import { SOURCE_LANGUAGE, TRANSLATE_LANGUAGES } from '@/lib/translate/languages';
import { activeLocale, applyLocale } from '@/lib/translate/locale';

/**
 * The language control for the bottom of the Layers panel.
 *
 * A native <select> on purpose: 132 options need the platform's own list
 * UI (scrollable, searchable on some platforms, the OS picker on mobile),
 * and the option labels are endonyms so a reader can find their language
 * without reading English first. The whole control carries `notranslate` —
 * the translator must never rewrite the language names themselves.
 *
 * Selecting applies the cookie contract (see lib/translate/locale.ts) and
 * reloads: the translate element only honours its cookie at init, and a
 * fresh load guarantees English restores the exact original DOM.
 */

const ALL_LANGUAGES = [SOURCE_LANGUAGE, ...TRANSLATE_LANGUAGES];

function useActiveLocale(): [string, (code: string) => void] {
  const [locale, setLocale] = useState<string>(SOURCE_LANGUAGE.code);
  useEffect(() => {
    try {
      setLocale(activeLocale(document.cookie));
    } catch {
      /* cookie unreadable: stay on English, the always-correct default */
    }
  }, []);

  const choose = (code: string) => {
    setLocale(code);
    try {
      applyLocale(code);
    } catch {
      /* persistence failed (cookies disabled): reload is harmless */
    }
    window.location.reload();
  };
  return [locale, choose];
}

export function LanguageSelect({ id }: { id?: string }) {
  const [locale, choose] = useActiveLocale();
  return (
    <div className="notranslate" translate="no">
      <select
        id={id}
        aria-label="Site language"
        value={locale}
        onChange={(e) => choose(e.target.value)}
        className="w-full rounded-md border border-white/10 bg-black/60 px-2 py-1.5 text-[11px] font-mono text-white/80 outline-none focus:border-white/30 cursor-pointer"
      >
        {ALL_LANGUAGES.map((l) => (
          <option key={l.code} value={l.code} className="bg-neutral-900 text-white">
            {l.code === SOURCE_LANGUAGE.code
              ? l.nativeName
              : `${l.nativeName} — ${l.name}`}
          </option>
        ))}
      </select>
      <p className="mt-1.5 text-[9px] font-mono leading-snug text-white/30">
        Machine translation by Google Translate. Map labels and camera names
        stay in their original language.
      </p>
    </div>
  );
}

/**
 * Desktop rail variant: a globe button at the bottom of the rail (with the
 * Style Studio / Ghost Protocol controls), opening a flyout that holds the
 * same select. Mirrors the rail's flyout shell so it feels native.
 */
export function LanguageRailControl() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative flex items-center justify-center">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Language"
        title="Language"
        className="w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-300 cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
        style={{ background: open ? 'rgba(255,255,255,0.10)' : 'transparent' }}
      >
        <Languages
          className="transition-all duration-300"
          style={{
            width: 15,
            height: 15,
            color: open ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.15)',
          }}
        />
      </button>
      {open && (
        <div
          className="absolute left-[52px] bottom-0 w-[240px] rounded-xl p-3 z-[100] pointer-events-auto"
          style={{
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(40px) saturate(1.5)',
            WebkitBackdropFilter: 'blur(40px) saturate(1.5)',
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}
        >
          <div className="flex items-center gap-2 mb-2.5 pb-1.5 border-b border-white/[0.04]">
            <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-white/35 flex-1">
              Language
            </span>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="px-1.5 py-0.5 rounded text-[10px] font-mono text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            >
              ✕
            </button>
          </div>
          <LanguageSelect />
        </div>
      )}
    </div>
  );
}

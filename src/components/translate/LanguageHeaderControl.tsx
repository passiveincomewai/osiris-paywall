"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import {
  SOURCE_LANGUAGE,
  TRANSLATE_LANGUAGES,
  type TranslateLanguage,
} from "@/lib/translate/languages";
import { activeLocale, applyLocale } from "@/lib/translate/locale";

/**
 * The header language switch (owner's design): the neon pill button lives
 * in the header next to the account controls; its dropdown lists the
 * popular languages first (the owner's mock), then every other language
 * the site offers — all 130+ Google Translate targets from
 * lib/translate/languages.ts, listed by native name so a reader can find
 * their own language without reading English first.
 *
 * The pill artwork has "EN" baked in, so the live code is rendered over
 * that spot (masked with the pill's own interior colour) and always shows
 * the ACTIVE language. Selecting applies the cookie contract (see
 * lib/translate/locale.ts) and reloads, exactly like the Layers-panel
 * control this replaces. The whole control carries `notranslate` — the
 * translator must never rewrite the language names themselves.
 */

const ALL_LANGUAGES: TranslateLanguage[] = [SOURCE_LANGUAGE, ...TRANSLATE_LANGUAGES];

/** The popular block, in the owner's mock order. */
const POPULAR_CODES = ["en", "es", "fr", "de", "pt", "it", "ja", "ko", "zh-CN"];
const POPULAR: TranslateLanguage[] = POPULAR_CODES
  .map((c) => ALL_LANGUAGES.find((l) => l.code === c))
  .filter((l): l is TranslateLanguage => !!l);
const REST: TranslateLanguage[] = ALL_LANGUAGES.filter((l) => !POPULAR_CODES.includes(l.code));

/** Short display code as in the owner's mock: EN, ES, ZH… */
function displayCode(code: string): string {
  if (code === "zh-CN" || code === "zh-TW") return "ZH";
  if (code === "iw") return "HE";
  return code.split("-")[0].toUpperCase();
}

/** Flag emoji per language (primary country); 🌐 where no single flag fits. */
const FLAGS: Record<string, string> = {
  en: "🇺🇸", es: "🇪🇸", fr: "🇫🇷", de: "🇩🇪", pt: "🇵🇹", it: "🇮🇹", ja: "🇯🇵",
  ko: "🇰🇷", "zh-CN": "🇨🇳", "zh-TW": "🇹🇼", af: "🇿🇦", sq: "🇦🇱", am: "🇪🇹",
  ar: "🇸🇦", hy: "🇦🇲", az: "🇦🇿", eu: "🇪🇸", be: "🇧🇾", bn: "🇧🇩", bs: "🇧🇦",
  bg: "🇧🇬", ca: "🇪🇸", ceb: "🇵🇭", ny: "🇲🇼", co: "🇫🇷", hr: "🇭🇷", cs: "🇨🇿",
  da: "🇩🇰", nl: "🇳🇱", et: "🇪🇪", tl: "🇵🇭", fi: "🇫🇮", gl: "🇪🇸", ka: "🇬🇪",
  el: "🇬🇷", ht: "🇭🇹", ha: "🇳🇬", haw: "🇺🇸", iw: "🇮🇱", hi: "🇮🇳", hu: "🇭🇺",
  is: "🇮🇸", ig: "🇳🇬", id: "🇮🇩", ga: "🇮🇪", jw: "🇮🇩", kn: "🇮🇳", kk: "🇰🇿",
  km: "🇰🇭", ky: "🇰🇬", lo: "🇱🇦", la: "🇻🇦", lv: "🇱🇻", lt: "🇱🇹", lb: "🇱🇺",
  mk: "🇲🇰", mg: "🇲🇬", ms: "🇲🇾", ml: "🇮🇳", mt: "🇲🇹", mi: "🇳🇿", mr: "🇮🇳",
  mn: "🇲🇳", my: "🇲🇲", ne: "🇳🇵", no: "🇳🇴", fa: "🇮🇷", pl: "🇵🇱", pa: "🇮🇳",
  ps: "🇦🇫", ro: "🇷🇴", ru: "🇷🇺", sm: "🇼🇸", gd: "🇬🇧", sr: "🇷🇸", st: "🇿🇦",
  sn: "🇿🇼", sd: "🇵🇰", si: "🇱🇰", sk: "🇸🇰", sl: "🇸🇮", so: "🇸🇴", su: "🇮🇩",
  sw: "🇰🇪", sv: "🇸🇪", tg: "🇹🇯", ta: "🇮🇳", te: "🇮🇳", th: "🇹🇭", tr: "🇹🇷",
  uk: "🇺🇦", ur: "🇵🇰", uz: "🇺🇿", vi: "🇻🇳", cy: "🇬🇧", xh: "🇿🇦", yi: "🇮🇱",
  yo: "🇳🇬", zu: "🇿🇦", gu: "🇮🇳", ku: "🇮🇶",
};

export default function LanguageHeaderControl({ variant = "desktop" }: { variant?: "desktop" | "mobile" }) {
  const [open, setOpen] = useState(false);
  const [locale, setLocale] = useState<string>(SOURCE_LANGUAGE.code);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      setLocale(activeLocale(document.cookie));
    } catch {
      /* cookie unreadable: stay on English, the always-correct default */
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open ]);

  const choose = (code: string) => {
    setLocale(code);
    setOpen(false);
    try {
      applyLocale(code);
    } catch {
      /* persistence failed (cookies disabled): reload is harmless */
    }
    window.location.reload();
  };

  const row = (l: TranslateLanguage) => {
    const active = l.code === locale;
    return (
      <button
        key={l.code}
        onClick={() => choose(l.code)}
        aria-current={active || undefined}
        className={`w-full flex items-center gap-2.5 px-3 py-[7px] text-left transition ${
          active ? "bg-cyan-400/15" : "hover:bg-white/5"
        }`}
      >
        <span className="text-[15px] leading-none w-6 text-center shrink-0">{FLAGS[l.code] ?? "🌐"}</span>
        <span className={`flex-1 text-[13px] truncate ${active ? "text-white font-semibold" : "text-white/85"}`}>
          {l.nativeName} ({displayCode(l.code)})
        </span>
        {active && <Check className="w-4 h-4 text-cyan-300 shrink-0" />}
      </button>
    );
  };

  return (
    <div ref={ref} className="relative pointer-events-auto notranslate" translate="no">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Site language"
        title="Site language"
        className="relative block hover:brightness-110 transition"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/language-pill.png"
          alt=""
          className={variant === "mobile" ? "h-7 w-auto" : "h-8 w-auto"}
        />
        {/* Live language code over the artwork's baked-in "EN" (measured
            spot: x 48–83%, y 44–60% of the pill), masked with the pill's
            own interior colour so the baked letters never show through. */}
        <span
          aria-hidden
          className="absolute flex items-center justify-center bg-[#0b0f1a] text-white font-bold tracking-[0.08em]"
          style={{
            left: "45%",
            top: "38%",
            width: "42%",
            height: "28%",
            fontSize: variant === "mobile" ? 9 : 10,
          }}
        >
          {displayCode(locale)}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] w-[264px] max-w-[calc(100vw-1rem)] rounded-2xl border border-cyan-300/30 bg-[#04182b]/[0.97] backdrop-blur-xl shadow-[0_0_36px_rgba(0,150,255,0.28)] overflow-hidden z-[1300]">
          <div className="px-3 pt-2.5 pb-1.5 text-[9px] font-mono tracking-[0.25em] text-cyan-200/50 uppercase">
            Language
          </div>
          <div className="max-h-[min(62vh,470px)] overflow-y-auto overscroll-contain pb-1.5">
            {POPULAR.map(row)}
            <div className="mx-3 my-1.5 border-t border-cyan-200/10" />
            <div className="px-3 py-1 text-[9px] font-mono tracking-[0.25em] text-cyan-200/40 uppercase">
              All languages
            </div>
            {REST.map(row)}
          </div>
          <p className="px-3 py-2 border-t border-cyan-200/10 text-[9px] font-mono leading-snug text-white/30">
            Machine translation by Google Translate. Map labels and camera
            names stay in their original language.
          </p>
        </div>
      )}
    </div>
  );
}

import { describe, expect, it } from 'vitest';
import {
  GOOGTRANS_COOKIE,
  LOCALE_COOKIE,
  activeLocale,
  applyLocale,
  buildCookie,
  cookiesForLocale,
  googTransValue,
  isRtlLocale,
  isTranslateLanguage,
  parseLocale,
  readCookieValue,
} from './locale';
import { TRANSLATE_LANGUAGES } from './languages';

describe('parseLocale', () => {
  it('defaults to English when unset', () => {
    expect(parseLocale(undefined)).toBe('en');
    expect(parseLocale(null)).toBe('en');
    expect(parseLocale('')).toBe('en');
  });

  it('keeps English as English (translation off)', () => {
    expect(parseLocale('en')).toBe('en');
  });

  it('accepts codes the control actually offers', () => {
    expect(parseLocale('es')).toBe('es');
    expect(parseLocale('zh-CN')).toBe('zh-CN');
    expect(parseLocale('ar')).toBe('ar');
  });

  it('falls back to English for unknown or malformed codes', () => {
    expect(parseLocale('xx')).toBe('en');
    expect(parseLocale('english')).toBe('en');
    expect(parseLocale('../etc')).toBe('en');
  });
});

describe('language catalogue', () => {
  it('offers at least 40 translation languages', () => {
    expect(TRANSLATE_LANGUAGES.length).toBeGreaterThanOrEqual(40);
  });

  it('has unique codes and English is not a translation target', () => {
    const codes = TRANSLATE_LANGUAGES.map((l) => l.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes).not.toContain('en');
  });
});

describe('isTranslateLanguage / isRtlLocale', () => {
  it('recognises offered languages only', () => {
    expect(isTranslateLanguage('fr')).toBe(true);
    expect(isTranslateLanguage('en')).toBe(false);
    expect(isTranslateLanguage('nope')).toBe(false);
    expect(isTranslateLanguage(null)).toBe(false);
  });

  it('flags RTL languages and not LTR ones', () => {
    expect(isRtlLocale('ar')).toBe(true);
    expect(isRtlLocale('fa')).toBe(true);
    expect(isRtlLocale('iw')).toBe(true);
    expect(isRtlLocale('es')).toBe(false);
    expect(isRtlLocale('ja')).toBe(false);
    expect(isRtlLocale('en')).toBe(false);
  });
});

describe('cookie serialisation', () => {
  it('builds a persistent, root-path cookie', () => {
    const c = buildCookie(LOCALE_COOKIE, 'es');
    expect(c).toContain('we_locale=es');
    expect(c).toContain('Path=/');
    expect(c).toContain('Max-Age=31536000');
    expect(c).toContain('SameSite=Lax');
  });

  it('builds an expiring cookie for deletion', () => {
    expect(buildCookie(LOCALE_COOKIE, null)).toContain('Max-Age=0');
  });

  it('formats the googtrans value as /en/<code>', () => {
    expect(googTransValue('es')).toBe('/en/es');
    expect(googTransValue('zh-TW')).toBe('/en/zh-TW');
  });

  it('selecting a language writes we_locale and a matching googtrans', () => {
    const writes = cookiesForLocale('de');
    expect(writes).toHaveLength(2);
    expect(writes[0]).toContain('we_locale=de');
    expect(writes[1]).toContain(`${GOOGTRANS_COOKIE}=%2Fen%2Fde`);
  });

  it('selecting English deletes both cookies (exact restore)', () => {
    const writes = cookiesForLocale('en');
    expect(writes).toHaveLength(2);
    for (const w of writes) expect(w).toContain('Max-Age=0');
  });

  it('an unknown selection behaves like English (off), never a bad cookie', () => {
    const writes = cookiesForLocale('klingon');
    for (const w of writes) expect(w).toContain('Max-Age=0');
  });
});

describe('reading cookies', () => {
  it('extracts one cookie from a header string', () => {
    expect(readCookieValue('a=1; we_locale=es; b=2', 'we_locale')).toBe('es');
    expect(readCookieValue('a=1; b=2', 'we_locale')).toBeNull();
    expect(readCookieValue('', 'we_locale')).toBeNull();
    expect(readCookieValue(undefined, 'we_locale')).toBeNull();
  });

  it('decodes URI-encoded values', () => {
    expect(readCookieValue('googtrans=%2Fen%2Ffr', 'googtrans')).toBe('/en/fr');
  });

  it('activeLocale resolves the effective selection', () => {
    expect(activeLocale('we_locale=ja')).toBe('ja');
    expect(activeLocale('we_locale=en')).toBe('en');
    expect(activeLocale('other=1')).toBe('en');
    expect(activeLocale(undefined)).toBe('en');
  });
});

describe('applyLocale', () => {
  function fakeDoc(hostname = 'localhost') {
    const jar: string[] = [];
    const doc = {
      location: { hostname },
      set cookie(v: string) {
        jar.push(v);
      },
      get cookie() {
        return jar.join('; ');
      },
    } as unknown as Document;
    return { doc, jar };
  }

  it('writes both cookies for a language selection', () => {
    const { doc, jar } = fakeDoc();
    applyLocale('es', doc);
    expect(jar.some((c) => c.startsWith('we_locale=es'))).toBe(true);
    expect(jar.some((c) => c.startsWith('googtrans='))).toBe(true);
  });

  it('clears host-only and domain googtrans cookies when restoring English', () => {
    const { doc, jar } = fakeDoc('worldeye.app');
    applyLocale('en', doc);
    expect(jar.filter((c) => c.includes('Max-Age=0')).length).toBeGreaterThanOrEqual(3);
    expect(jar.some((c) => c.includes('Domain=.worldeye.app'))).toBe(true);
  });
});

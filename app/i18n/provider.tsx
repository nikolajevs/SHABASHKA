"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  locales,
  localeTags,
  languageNames,
  translate,
  translateError,
  type Locale,
} from "./shared";
const LanguageContext = createContext<{
  locale: Locale;
  t: (
    key: string | undefined,
    params?: Record<string, string | number>,
  ) => string;
  errorText: (key: string) => string;
  setLocale: (locale: Locale) => void;
} | null>(null);
export function LanguageProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: ReactNode;
}) {
  const [locale, setLanguage] = useState(initialLocale);
  const t = useCallback(
    (key: string | undefined, params?: Record<string, string | number>) =>
      translate(locale, key, params),
    [locale],
  );
  const errorText = useCallback(
    (key: string) => translateError(locale, key),
    [locale],
  );
  function setLocale(next: Locale) {
    if (!locales.includes(next)) return;
    setLanguage(next);
    document.cookie = `shabashka_locale=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  }
  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = t("SHABASHKA — услуги в Латвии");
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute(
        "content",
        t("Специалисты и задания по всей Латвии. Договаривайтесь напрямую."),
      );
  }, [locale, t]);
  return (
    <LanguageContext.Provider value={{ locale, t, errorText, setLocale }}>
      {children}
    </LanguageContext.Provider>
  );
}
export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw Error("LanguageProvider missing");
  return value;
}
export function LanguageSwitcher() {
  const { locale, t, setLocale } = useLanguage();
  return (
    <div className="language-switcher" role="group" aria-label={t("Язык")}>
      {locales.map((code) => (
        <button
          type="button"
          key={code}
          lang={code}
          aria-label={languageNames[code]}
          title={languageNames[code]}
          aria-pressed={locale === code}
          onClick={() => setLocale(code)}
        >
          {code === "uk" ? "UA" : code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
export { localeTags };

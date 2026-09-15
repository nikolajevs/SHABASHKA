import messages from "./messages.json";
export const locales = ["lv", "en", "ru", "uk"] as const;
export type Locale = (typeof locales)[number];
export const localeTags: Record<Locale, string> = {
  lv: "lv-LV",
  en: "en-GB",
  ru: "ru-RU",
  uk: "uk-UA",
};
export const languageNames: Record<Locale, string> = {
  lv: "Latviešu",
  en: "English",
  ru: "Русский",
  uk: "Українська",
};
export function parseLocale(value: unknown): Locale {
  return locales.includes(value as Locale) ? (value as Locale) : "lv";
}
const dictionary = new Map(
  messages.map(([ru, lv, en, uk]) => [ru, { ru, lv, en, uk }]),
);
export function translate(
  locale: Locale,
  key: string | undefined,
  params: Record<string, string | number> = {},
) {
  if (!key) return "";
  const normalized = key.trim();
  const entry = dictionary.get(normalized);
  const text = entry
    ? key.slice(0, key.length - key.trimStart().length) +
      entry[locale] +
      key.slice(key.trimEnd().length)
    : key;
  return text.replace(/\{(\w+)\}/g, (match, name) =>
    params[name] === undefined ? match : String(params[name]),
  );
}
const fieldLabels: Record<string, string> = {
  name: "Ваше имя",
  role: "Роль",
  title: "Название услуги",
  description: "Описание",
  category: "Категория",
  city: "Город",
  price: "Стоимость, EUR",
  skills: "Навыки",
  portfolio: "Портфолио",
  parent: "Задания",
  id: "Задания",
};
export function translateError(locale: Locale, message: string) {
  if (message.startsWith("Заполните корректно: ")) {
    const field = message.slice("Заполните корректно: ".length);
    return (
      translate(locale, "Заполните корректно:") +
      " " +
      translate(locale, fieldLabels[field] || "Проверьте значение поля.")
    );
  }
  return dictionary.has(message.trim())
    ? translate(locale, message)
    : translate(locale, "Не удалось сохранить. Попробуйте ещё раз.");
}
export function localizedJson(request: Request) {
  const locale = parseLocale(request.headers.get("X-SHABASHKA-Language"));
  return (data: Record<string, unknown>, init: ResponseInit = {}) =>
    Response.json(
      typeof data.error === "string"
        ? {
            ...data,
            errorKey: data.error,
            error: translateError(locale, data.error),
          }
        : data,
      {
        ...init,
        headers: {
          ...Object.fromEntries(new Headers(init.headers)),
          "Content-Language": locale,
          "Cache-Control": "private, no-store",
        },
      },
    );
}

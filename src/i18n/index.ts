import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import hi from "./locales/hi.json";
import mr from "./locales/mr.json";

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिंदी" },
  { code: "mr", label: "मराठी" },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

const STORAGE_KEY = "eon-language";

function getInitialLanguage(): LanguageCode {
  if (typeof localStorage === "undefined") return "en";
  const saved = localStorage.getItem(STORAGE_KEY);
  return (SUPPORTED_LANGUAGES.some((l) => l.code === saved) ? saved : "en") as LanguageCode;
}

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: { en: { translation: en }, hi: { translation: hi }, mr: { translation: mr } },
    lng: getInitialLanguage(),
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });
}

export function setLanguage(code: LanguageCode) {
  i18n.changeLanguage(code);
  try { localStorage.setItem(STORAGE_KEY, code); } catch { /* ignore */ }
}

export default i18n;

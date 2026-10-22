"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";

export type Lang = "id" | "en";

// The preference lives in localStorage so it survives reloads. It is read through
// useSyncExternalStore so the server render and hydration both use "id" first.
const STORAGE_KEY = "agentra_lang";
const listeners = new Set<() => void>();

function readLang(): Lang {
  try {
    return localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "id";
  } catch {
    return "id";
  }
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

const LanguageContext = createContext<{
  lang: Lang;
  toggle: () => void;
} | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const lang = useSyncExternalStore(subscribe, readLang, () => "id" as Lang);

  const toggle = useCallback(() => {
    const next: Lang = readLang() === "id" ? "en" : "id";
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* storage unavailable: keep in-memory only */ }
    listeners.forEach((l) => l());
  }, []);

  // Keep <html lang> in sync so screen readers switch pronunciation with the UI language.
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo(() => ({ lang, toggle }), [lang, toggle]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
};

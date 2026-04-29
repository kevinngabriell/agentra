"use client";

import { createContext, useContext, useState } from "react";

export type Lang = "id" | "en";

const LanguageContext = createContext<{
  lang: Lang;
  toggle: () => void;
}>({ lang: "id", toggle: () => {} });

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>("id");
  return (
    <LanguageContext.Provider value={{ lang, toggle: () => setLang((l) => (l === "id" ? "en" : "id")) }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);

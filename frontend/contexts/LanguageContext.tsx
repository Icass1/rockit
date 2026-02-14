// lib/LanguageContext.tsx
"use client";
import { Lang } from "@/types/lang";
import { createContext, useContext } from "react";

const LanguageContext = createContext<{
    langFile: Lang | null;
    lang: string | null;
}>({
    langFile: null,
    lang: null,
});

export const useLanguage = () => useContext(LanguageContext);

export function LanguageProvider({
    langFile,
    lang,
    children,
}: {
    langFile: Lang;
    lang: string;
    children: React.ReactNode;
}) {
    return (
        <LanguageContext.Provider value={{ langFile, lang }}>
            {children}
        </LanguageContext.Provider>
    );
}

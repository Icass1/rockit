// lib/LanguageContext.tsx
"use client";

import { createContext, useContext } from "react";
import { Lang } from "@/types/lang";

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

// lib/LanguageContext.tsx
"use client";
import { Lang } from "@/types/lang";
import { createContext, useContext } from "react";

const LanguageContext = createContext<Lang | null>(null);

export const useLanguage = () => useContext(LanguageContext);

export function LanguageProvider({
    value,
    children,
}: {
    value: Lang;
    children: React.ReactNode;
}) {
    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
}

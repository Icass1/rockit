"use client";

import type { Lang } from "@/types/lang";
import { LanguageProvider } from "@/contexts/LanguageContext";
import Footer from "@/components/Footer/Footer";
import Header from "@/components/Header/Header";
import Navigation from "@/components/Navigation/Navigation";
import PlayerUI from "@/components/PlayerUI/PlayerUI";

export default function AppClientLayout({
    children,
    lang,
    langFile,
}: {
    children: React.ReactNode;
    lang: string;
    langFile: Lang;
}) {
    return (
        <LanguageProvider langFile={langFile} lang={lang}>
            <div className="fixed inset-0 bg-[#0b0b0b] md:left-12">
                {children}
            </div>

            <div className="hidden md:block">
                <PlayerUI />
            </div>

            <div className="fixed right-0 bottom-0 left-0 z-40 hidden h-24 md:block">
                <Footer />
            </div>

            <div className="fixed top-0 right-0 left-12 z-40 hidden h-24 w-auto md:block">
                <Header />
            </div>

            <div className="fixed z-40 hidden md:top-0 md:bottom-24 md:left-0 md:block">
                <Navigation />
            </div>
        </LanguageProvider>
    );
}

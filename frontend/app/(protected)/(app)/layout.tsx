"use client";

import { LanguageProvider } from "@/contexts/LanguageContext";
import { useEffect, useState } from "react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const lang = "en";

    const [langFile, setLangFile] = useState(null);

    useEffect(() => {
        fetch(`/lang/${lang}.json`)
            .then((res) => res.json())
            .then((data) => setLangFile(data))
            .catch((err) => console.error("Error loading language file:", err));
    }, []);

    if (!langFile) return <div>Loading language...</div>;

    return (
        <Suspense fallback={<div>layout.Suspense Loading...</div>}>
            <AddSessionProvider>
                <LanguageProvider
                    langFile={language.langFile}
                    lang={language.lang}
                >
                    <div className="fixed top-0 right-0 bottom-0 left-0 bg-[#0b0b0b] md:top-0 md:right-0 md:bottom-0 md:left-12">
                        {children}
                    </div>

                    <div className="hidden md:block">
                        <PlayerUI />
                    </div>
                    {/*
                     */}
                    <div className="fixed right-0 bottom-0 left-0 z-40 hidden h-24 md:block">
                        <Footer></Footer>
                    </div>
                    {/* 
                    <div className="fixed right-0 bottom-12 left-0 z-40 block h-14 md:hidden">
                        <FooterMobile></FooterMobile>
                    </div>

                    <MobilePlayerUI />
                    */}
                    <div className="fixed top-0 right-0 left-12 z-40 hidden h-24 w-auto md:block">
                        <Header></Header>
                    </div>

                    <div className="fixed z-40 hidden md:top-0 md:bottom-24 md:left-0 md:block">
                        <Navigation></Navigation>
                    </div>
                    {/* 

                    <div className="fixed right-0 bottom-0 left-0 z-40 block h-12 md:hidden">
                        <NavigationMobile></NavigationMobile>
                    </div>

                    <div className="fixed top-0 right-0 left-0 z-40 mx-auto block h-fit items-center justify-center bg-gradient-to-b from-black to-black/0 md:hidden">
                        <Link
                            href="/"
                            className="text-2xl font-bold text-white"
                        >
                            <Image
                                src="/logo-banner.png"
                                alt="App Logo"
                                className="mx-auto my-2 aspect-[2048/614] h-14 object-contain"
                            />
                            </Link>
                            </div> */}
                </LanguageProvider>
            </AddSessionProvider>
        </Suspense>
    );
}

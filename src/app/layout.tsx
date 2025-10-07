import type { Metadata } from "next";
import "@/styles/default.css";
import Footer from "@/components/Footer/Footer";
import { headers } from "next/headers";
import Navigation from "@/components/Navigation/Navigation";
import Header from "@/components/Header/Header";
// import NavigationMobile from "@/components/Navigation/NavigationMobile";
// import Link from "next/link";
// import PlayerUI from "@/components/PlayerUI/PlayerUI";
// import MobilePlayerUI from "@/components/PlayerUI/MobilePlayerUI";
// import FooterMobile from "@/components/Footer/FooterMobile";
import AddSessionProvider from "@/contexts/SessionContext";

import { LanguageProvider } from "@/contexts/LanguageContext";
import { Suspense } from "react";
import { Lang } from "@/types/lang";

async function getLanguage(): Promise<{ lang: string; langFile: Lang }> {
    const res = await fetch("http://localhost:3000/api/lang", {
        cache: "no-store",
    });
    return res.json();
}

export const metadata: Metadata = {
    title: "RockIt",
    description: "The best music player in the world",
};

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const headerList = await headers();
    const pathname = headerList.get("x-current-path");
    const language = await getLanguage();

    if (pathname?.startsWith("/login") || pathname?.startsWith("/signup")) {
        return (
            <html lang={language.lang}>
                <head>
                    <link
                        rel="icon"
                        type="image/svg+xml"
                        href="/rockit-logo.ico"
                    />
                    <link rel="manifest" href="/manifest.json" />
                </head>
                <body className="bg-black">
                    <div className="fixed top-0 right-0 bottom-0 left-0 bg-[#0b0b0b]">
                        <AddSessionProvider>{children}</AddSessionProvider>
                    </div>
                </body>
            </html>
        );
    }

    return (
        <html lang={language.lang}>
            <head>
                <link rel="icon" type="image/svg+xml" href="/rockit-logo.ico" />
                <link rel="manifest" href="/manifest.json" />
            </head>
            <body className="bg-black">
                <Suspense fallback={<div>layout.Suspense Loading...</div>}>
                    <AddSessionProvider>
                        <LanguageProvider
                            langFile={language.langFile}
                            lang={language.lang}
                        >
                            <div className="fixed top-0 right-0 bottom-0 left-0 bg-[#0b0b0b] md:top-0 md:right-0 md:bottom-0 md:left-12">
                                {children}
                            </div>

                            {/* 
                    <div className="hidden md:block">
                        <PlayerUI />
                    </div>
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
            </body>
        </html>
    );
}

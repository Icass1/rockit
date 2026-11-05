import { getRequestTheme } from "@/lib/server/theme";
import { getRequestVocabulary } from "@/lib/server/vocabulary";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { VocabularyProvider } from "@/components/providers/VocabularyProvider";
import "@/styles/globals.css";
import { JSX } from "react";
import type { Metadata, Viewport } from "next";
import { SITE_URL } from "@/environment";
import { SerwistProvider } from "@serwist/turbopack/react";
import ToasterProvider from "@/components/ui/ToasterProvider";

const TITLE = "RockIt!";
const DESCRIPTION = "The best music player in the world";

export const metadata: Metadata = {
    metadataBase: new URL(SITE_URL),
    title: TITLE,
    description: DESCRIPTION,
    applicationName: TITLE,
    icons: {
        icon: "/rockit-logo.ico",
        apple: "/logo-192.png",
    },
    appleWebApp: {
        capable: true,
        statusBarStyle: "black-translucent",
        title: "RockIt",
    },
    openGraph: {
        type: "website",
        url: "/",
        siteName: TITLE,
        title: TITLE,
        description: DESCRIPTION,
        locale: "en_US",
        images: [
            {
                url: "/logo-512.png",
                width: 512,
                height: 512,
                type: "image/png",
                alt: TITLE,
            },
        ],
    },
    twitter: {
        card: "summary",
        title: TITLE,
        description: DESCRIPTION,
        images: ["/logo-512.png"],
    },
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
};

export default async function RootLayout({
    children,
}: Readonly<{ children: React.ReactNode }>): Promise<JSX.Element> {
    const [vocabulary, theme] = await Promise.all([
        getRequestVocabulary(),
        getRequestTheme(),
    ]);
    const isDev = process.env.NODE_ENV === "development";

    const content = (
        <>
            {children}
            <ToasterProvider />
        </>
    );

    return (
        <html lang={vocabulary.currentLang} data-theme={theme}>
            <head>
                <link rel="icon" type="image/svg+xml" href="/rockit-logo.ico" />
            </head>
            <body className="antialiased">
                <VocabularyProvider initial={vocabulary}>
                    <ThemeProvider initial={theme}>
                        {isDev ? (
                            content
                        ) : (
                            <SerwistProvider swUrl="/serwist/sw.js">
                                {content}
                            </SerwistProvider>
                        )}
                    </ThemeProvider>
                </VocabularyProvider>
            </body>
        </html>
    );
}

import "@/styles/animations.css";
import "@/styles/base.css";
import "@/styles/components.css";
import "@/styles/globals.css";
import "@/styles/tokens/colors.css";
import { JSX } from "react";
import type { Metadata, Viewport } from "next";
import { SerwistProvider } from "@serwist/turbopack/react";
import { SITE_URL } from "@/environment";
import ToasterProvider from "@/components/Toaster/ToasterProvider";

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

export default function RootLayout({
    children,
}: Readonly<{ children: React.ReactNode }>): JSX.Element {
    const isDev = process.env.NODE_ENV === "development";

    const content = (
        <>
            {children}
            <ToasterProvider />
        </>
    );

    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <link rel="icon" type="image/svg+xml" href="/rockit-logo.ico" />
            </head>
            <body className="antialiased" suppressHydrationWarning>
                {isDev ? (
                    content
                ) : (
                    <SerwistProvider swUrl="/serwist/sw.js">
                        {content}
                    </SerwistProvider>
                )}
            </body>
        </html>
    );
}

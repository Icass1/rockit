import "@/styles/animations.css";
import "@/styles/base.css";
import "@/styles/components.css";
import "@/styles/globals.css";
import "@/styles/tokens/colors.css";
import { JSX } from "react";
import type { Metadata, Viewport } from "next";
import { SerwistProvider } from "@serwist/turbopack/react";
import ToasterProvider from "@/components/Toaster/ToasterProvider";

export const metadata: Metadata = {
    title: "RockIt",
    description: "The best music player in the world",
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
                {isDev ? content : <SerwistProvider swUrl="/serwist/sw.js">{content}</SerwistProvider>}
            </body>
        </html>
    );
}

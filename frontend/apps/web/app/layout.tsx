import type { Metadata, Viewport } from "next";
import "@/styles/globals.css";
import "@/styles/base.css";
import "@/styles/animations.css";
import "@/styles/components.css";

export const metadata: Metadata = {
    title: "RockIt",
    description: "The best music player in the world",
    manifest: "/manifest.json",
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
};

export default function RootLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <link rel="icon" type="image/svg+xml" href="/rockit-logo.ico" />
                <link rel="manifest" href="/manifest.json" />
            </head>
            <body className="antialiased" suppressHydrationWarning>
                {children}
            </body>
        </html>
    );
}

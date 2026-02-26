import type { Metadata } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
    title: "RockIt",
    description: "The best music player in the world",
    manifest: "/manifest.json",
};

export default function RootLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="en">
            <head>
                <link rel="icon" type="image/svg+xml" href="/rockit-logo.ico" />
                <link rel="manifest" href="/manifest.json" />
            </head>
            <body className="antialiased">{children}</body>
        </html>
    );
}

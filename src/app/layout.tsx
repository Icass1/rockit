import type { Metadata } from "next";
import "@/styles/default.css";
import { headers } from "next/headers";
import AddSessionProvider from "@/components/AddSessionProvider";

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

    if (pathname?.startsWith("/login") || pathname?.startsWith("/signup")) {
        return (
            <html lang="en">
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
        <html lang="en">
            <head>
                <link rel="icon" type="image/svg+xml" href="/rockit-logo.ico" />
                <link rel="manifest" href="/manifest.json" />
            </head>
            <body className="bg-black">
                <AddSessionProvider>
                    <div className="fixed top-0 right-0 bottom-0 left-0 bg-[#0b0b0b] md:top-0 md:right-0 md:bottom-0 md:left-12">
                        {children}
                    </div>
                </AddSessionProvider>
            </body>
        </html>
    );
}

import type { Metadata } from "next";
import "../styles/default.css";

export const metadata: Metadata = {
    title: "Create Next App",
    description: "Generated by create next app",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className="bg-black">
                <div className="fixed top-0 left-12 right-0 bottom-0 bg-blue-400 ">
                    {children}
                </div>
                <div
                    className="bg-black/50 fixed top-0 left-0 bottom-24 w-12 hover:w-56 transition-all"
                    style={{ backdropFilter: "blur(10px)" }}
                ></div>

                <div
                    className="fixed left-0 right-0 bottom-0 h-24 bg-[#1a1a1a]/80"
                    style={{ backdropFilter: "blur(10px)" }}
                ></div>
            </body>
        </html>
    );
}

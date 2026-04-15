"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { UserVocabularyResponse } from "@/dto";
import { rockIt } from "@/lib/rockit/rockIt";
import Footer from "@/components/Footer/Footer";
import Header from "@/components/Header/Header";
import Navigation from "@/components/Navigation/Navigation";
import PlayerUI from "@/components/PlayerUI/PlayerUI";

export default function AppClientLayout({
    vocabulary,
    children,
}: {
    vocabulary: UserVocabularyResponse;
    children: React.ReactNode;
}) {
    useEffect(() => {
        rockIt.mediaManager.fetchLikedMedia();
        rockIt.vocabularyManager.setVocabulary(vocabulary);
    }, [vocabulary]);

    return (
        <>
            {/* Mobile Header - only visible on small screens */}
            <div className="fixed top-0 right-0 left-0 z-40 mx-auto block h-fit items-center justify-center bg-linear-to-b from-black to-black/0 md:hidden">
                <Link href="/" className="text-2xl font-bold text-white">
                    <Image
                        src="/logo-banner.png"
                        alt="App Logo"
                        className="mx-auto my-2 aspect-2048/614 h-14 object-contain"
                        width={2048}
                        height={614}
                    />
                </Link>
            </div>

            {/* Main content area */}
            <div className="fixed inset-0 bg-[#0b0b0b] pb-20 md:left-12 md:pb-0">
                <div className="webkit-scroll h-full w-full overflow-y-auto py-24">
                    {children}
                </div>
            </div>

            {/* Desktop Player UI - only visible on md+ screens */}
            <div className="hidden md:block">
                <PlayerUI />
            </div>

            {/* Desktop Footer - only visible on md+ screens */}
            <div className="fixed right-0 bottom-0 left-0 z-40 hidden h-24 md:block">
                <Footer />
            </div>

            {/* Desktop Header - only visible on md+ screens */}
            <div className="fixed top-0 right-0 left-12 z-40 hidden h-24 w-auto md:block">
                <Header />
            </div>

            {/* Desktop Navigation - only visible on md+ screens */}
            <div className="fixed z-40 hidden md:top-0 md:bottom-24 md:left-0 md:block">
                <Navigation />
            </div>
        </>
    );
}

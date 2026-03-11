"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UrlMatchResponseSchema, UserVocabularyResponse } from "@/dto";
import { rockIt } from "@/lib/rockit/rockIt";
import { apiFetch } from "@/lib/utils/apiFetch";
import DropOverlay from "@/components/DropOverlay";
import Footer from "@/components/Footer/Footer";
import FooterMobile from "@/components/Footer/FooterMobile";
import Header from "@/components/Header/Header";
import Navigation from "@/components/Navigation/Navigation";
import NavigationMobile from "@/components/Navigation/NavigationMobile";
import PlayerUI from "@/components/PlayerUI/PlayerUI";
import { Fullscreen } from "lucide-react";

export default function AppClientLayout({
    vocabulary,
    children,
}: {
    vocabulary: UserVocabularyResponse;
    children: React.ReactNode;
}) {
    const router = useRouter();

    useEffect(() => {
        rockIt.mediaManager.fetchLikedMedia();
        rockIt.vocabularyManager.setVocabulary(vocabulary);
    }, [vocabulary]);

    const handleLinkDrop = (url: string) => {
        apiFetch(`/media/url/match?url=${url}`, UrlMatchResponseSchema).then(
            (data) => {
                if (data.path) {
                    router.push(data.path);
                } else {
                    rockIt.notificationManager.notifyError("Unkown URL.");
                }
            }
        );
    };

    return (
        <>
            <DropOverlay onDropLink={handleLinkDrop} />

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
                {children}
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

            {/* Mobile Footer - only visible on small screens */}
            <div className="safe-area-bottom fixed right-0 bottom-15 left-0 z-40 h-20 w-full bg-[#1a1a1a] md:hidden">
                <FooterMobile />
            </div>

            {/* Mobile Navigation - only visible on small screens */}
            <div className="safe-area-bottom fixed right-0 bottom-0 left-0 z-40 h-16 w-full bg-[#1a1a1a] md:hidden">
                <NavigationMobile />
            </div>
        </>
    );
}

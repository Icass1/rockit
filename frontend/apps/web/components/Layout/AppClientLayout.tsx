"use client";

import { useEffect, type JSX } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { VocabularyResponse } from "@/dto";
import { rockIt } from "@/lib/rockit/rockIt";
import { Http } from "@/lib/http";
import { loadVocabularyOffline } from "@/lib/offline/db";
import Footer from "@/components/Footer/Footer";
import Header from "@/components/Header/Header";
import KeyboardHandler from "@/components/KeyboardHandler/KeyboardHandler";
import MobileBottomNav from "@/components/Navigation/MobileBottomNav";
import Navigation from "@/components/Navigation/Navigation";
import PlayerUI from "@/components/PlayerUI/PlayerUI";

const MobilePlayer = dynamic(
    () => import("@/components/MobilePlayer/MobilePlayer"),
    { ssr: false }
);

export default function AppClientLayout({
    vocabulary,
    children,
}: {
    vocabulary: VocabularyResponse;
    children: React.ReactNode;
}): JSX.Element {
    useEffect((): void => {
        rockIt.mediaManager.fetchLikedMedia();

        const hasVocab =
            vocabulary.vocabulary &&
            Object.keys(vocabulary.vocabulary).length > 0;

        if (hasVocab) {
            rockIt.vocabularyManager.setVocabulary(vocabulary);
        } else {
            Http.getUserVocabulary().then((res) => {
                if (res.isOk()) {
                    rockIt.vocabularyManager.setVocabulary(res.result);
                    return;
                }
                loadVocabularyOffline().then((cached) => {
                    if (cached) {
                        rockIt.vocabularyManager.setVocabulary(cached);
                    }
                });
            });
        }

        const onFirstGesture = (): void => {
            rockIt.mediaSessionManager.activateOnGesture();
        };
        document.addEventListener("pointerup", onFirstGesture, { once: true });
        document.addEventListener("keydown", onFirstGesture, { once: true });
    }, [vocabulary]);

    return (
        <>
            <KeyboardHandler />

            {/* Hidden video container — keeps <video> in the DOM for mobile playback */}
            <div id="rockit-video-root" className="hidden" aria-hidden="true" />

            {/* Mobile Header - only visible on small screens */}
            <div className="fixed top-0 right-0 left-0 z-40 mx-auto block h-fit items-center justify-center bg-linear-to-b from-black to-black/0 md:hidden">
                <Link href="/" className="text-2xl font-bold text-white">
                    <Image
                        src="/logo-banner.png"
                        alt="App Logo"
                        className="mx-auto my-2 aspect-2048/614 h-14 object-contain"
                        width={2048}
                        height={614}
                        priority
                    />
                </Link>
            </div>

            {/* Main content area */}
            <div className="fixed inset-0 bg-(--color-bg) pb-0 md:left-12">
                <div
                    id="main-scroll-container"
                    className="webkit-scroll h-full w-full overflow-x-hidden overflow-y-auto pt-24 pb-[calc(160px+env(safe-area-inset-bottom,0px))] md:overflow-x-auto md:pb-24"
                >
                    {children}
                </div>
            </div>

            {/* Desktop Player UI - only visible on md+ screens */}
            <PlayerUI />

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

            {/* Mobile Bottom Navigation - only visible on small screens */}
            <MobileBottomNav />

            {/* Mobile Player (MiniPlayerBar + MobilePlayerSheet) - después de MobileBottomNav para que el MiniPlayerBar quede encima */}
            <MobilePlayer />
        </>
    );
}

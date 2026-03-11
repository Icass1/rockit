"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { UrlMatchResponseSchema, UserVocabularyResponse } from "@/dto";
import { rockIt } from "@/lib/rockit/rockIt";
import { apiFetch } from "@/lib/utils/apiFetch";
import DropOverlay from "@/components/DropOverlay";
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
    const router = useRouter();

    useEffect(() => {
        rockIt.mediaManager.fetchLikedMedia();
        rockIt.vocabularyManager.setVocabulary(vocabulary);
    }, [vocabulary]);

    const handleLinkDrop = (url: string) => {
        console.log("Dropped URL:", url);
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

            <div className="fixed inset-0 bg-[#0b0b0b] md:left-12">
                {children}
            </div>

            <div className="hidden md:block">
                <PlayerUI />
            </div>

            <div className="fixed bottom-0 left-0 right-0 z-40 hidden h-24 md:block">
                <Footer />
            </div>

            <div className="fixed left-12 right-0 top-0 z-40 hidden h-24 w-auto md:block">
                <Header />
            </div>

            <div className="fixed z-40 hidden md:bottom-24 md:left-0 md:top-0 md:block">
                <Navigation />
            </div>
        </>
    );
}

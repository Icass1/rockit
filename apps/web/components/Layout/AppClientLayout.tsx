"use client";

import { useEffect, type JSX } from "react";
import type { QueueResponse, SessionResponse } from "@/dto";
import { rockIt } from "@/lib/rockit/rockIt";
import Footer from "@/components/Footer/Footer";
import ShareMediaDialog from "@/components/Friends/ShareMediaDialog";
import Header from "@/components/Header/Header";
import KeyboardHandler from "@/components/KeyboardHandler/KeyboardHandler";
import Navigation from "@/components/Navigation/Navigation";
import PlayerUI from "@/components/PlayerUI/PlayerUI";
import { PlaybackProvider } from "@/components/providers/PlaybackProvider";
import { QueueProvider } from "@/components/providers/QueueProvider";
import { RuntimeProvider } from "@/components/providers/RuntimeProvider";
import { SessionProvider } from "@/components/providers/SessionProvider";

export default function AppClientLayout({
    session,
    queue,
    children,
}: {
    session?: SessionResponse;
    queue?: QueueResponse;
    children: React.ReactNode;
}): JSX.Element {
    useEffect(() => {
        void rockIt.mediaManager.fetchLikedMedia();
    }, [session]);

    return (
        <RuntimeProvider initialSession={session}>
            <PlaybackProvider>
                <SessionProvider initial={session}>
                    <QueueProvider initial={{ session, queue }}>
                        <KeyboardHandler />

                        {/* Persistent video surface owned by the browser transport */}
                        <div
                            id="rockit-video-root"
                            className="pointer-events-none fixed top-0 left-0 -z-10 h-px w-px overflow-hidden opacity-0"
                            aria-hidden="true"
                        />

                        {/* Main content area */}
                        <div className="bg-background fixed inset-0 left-12">
                            <div
                                id="main-scroll-container"
                                className="webkit-scroll h-full w-full overflow-auto pt-28 pb-24"
                            >
                                {children}
                            </div>
                        </div>

                        {/* Desktop Player UI */}
                        <PlayerUI />

                        {/* Desktop Footer */}
                        <div className="fixed right-0 bottom-0 left-0 z-40 h-24">
                            <Footer />
                        </div>

                        {/* Desktop Header */}
                        <div className="fixed top-0 right-0 left-12 z-40 h-24 w-auto">
                            <Header />
                        </div>

                        {/* Desktop Navigation */}
                        <div className="fixed top-0 bottom-24 left-0 z-40">
                            <Navigation />
                        </div>

                        <ShareMediaDialog />
                    </QueueProvider>
                </SessionProvider>
            </PlaybackProvider>
        </RuntimeProvider>
    );
}

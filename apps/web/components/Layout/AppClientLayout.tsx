"use client";

import { useEffect, type JSX, type ReactNode } from "react";
import type { QueueResponse, SessionResponse } from "@/dto";
import { rockIt } from "@/lib/rockit/rockIt";
import ShareMediaDialog from "@/components/Friends/ShareMediaDialog";
import ClientShell from "@/components/Layout/ClientShell";
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
    children: ReactNode;
}): JSX.Element {
    useEffect(() => {
        void rockIt.mediaManager.fetchLikedMedia();
    }, [session]);
    return (
        <RuntimeProvider initialSession={session}>
            <PlaybackProvider>
                <SessionProvider initial={session}>
                    <QueueProvider initial={{ session, queue }}>
                        <div
                            id="rockit-video-root"
                            className="pointer-events-none fixed top-0 left-0 -z-10 h-px w-px overflow-hidden opacity-0"
                            aria-hidden="true"
                        />
                        <ClientShell>{children}</ClientShell>
                        <ShareMediaDialog />
                    </QueueProvider>
                </SessionProvider>
            </PlaybackProvider>
        </RuntimeProvider>
    );
}

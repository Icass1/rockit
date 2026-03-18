"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { useStore } from "@nanostores/react";
import { rockIt } from "@/lib/rockit/rockIt";
import useWindowSize from "@/hooks/useWindowSize";
import { PlayerUICoverColumn } from "@/components/PlayerUI/PlayerUICoverColumn";
import { PlayerUILyricsColumn } from "@/components/PlayerUI/PlayerUILyricsColumn";
import { PlayerUIQueueColumn } from "@/components/PlayerUI/PlayerUIQueueColumn";

export default function PlayerUI() {
    const $currentMedia = useStore(rockIt.queueManager.currentMediaAtom);
    const $isPlayerUIVisible = useStore(rockIt.playerUIManager.visibleAtom);
    const $queue = useStore(rockIt.queueManager.queueAtom);

    const divRef = useRef<HTMLDivElement>(null);
    const innerWidth = useWindowSize().width;
    const shouldRender = innerWidth !== undefined && innerWidth > 768;

    // Close player when clicking outside
    useEffect(() => {
        const handleDocumentClick = (e: MouseEvent) => {
            const target = e.target as Node;
            const insidePlayer = divRef.current?.contains(target);
            const insideFooter = document
                .getElementById("app-footer")
                ?.contains(target);
            if (!insidePlayer && !insideFooter) {
                rockIt.playerUIManager.hide();
            }
        };
        document.addEventListener("click", handleDocumentClick);
        return () => document.removeEventListener("click", handleDocumentClick);
    }, []);

    // Scroll queue to current song when player opens
    useEffect(() => {
        if (!$isPlayerUIVisible) return;
        const index = rockIt.queueManager.queue?.findIndex(
            (s) => s.queueMediaId === rockIt.queueManager.currentQueueMediaId
        );
        if (index == null || index === -1) return;
        const queueEl = divRef.current?.querySelector(
            "[data-queue-scroll]"
        ) as HTMLDivElement | null;
        if (queueEl) queueEl.scrollTop = index * 64;
    }, [$isPlayerUIVisible]);

    if (!shouldRender) return null;

    return (
        <div
            ref={divRef}
            className="absolute inset-0 flex items-center justify-center overflow-hidden bg-black/80 pt-20 pb-24 pl-12 transition-all duration-300"
            style={{
                top: $isPlayerUIVisible ? "0%" : "100%",
                height: "calc(100%)",
            }}
        >
            <div className="relative grid h-full w-full grid-cols-[1fr_1fr] gap-x-2 bg-black px-2 text-white lg:grid-cols-[30%_40%_30%]">
                {/* Background blurred cover */}
                <Image
                    alt={$currentMedia?.name ?? ""}
                    src={
                        $currentMedia?.imageUrl ??
                        rockIt.SONG_PLACEHOLDER_IMAGE_URL
                    }
                    width={600}
                    height={600}
                    className="absolute top-1/2 h-auto w-full -translate-y-1/2 blur-md brightness-50 select-none"
                />

                <PlayerUILyricsColumn />
                <PlayerUICoverColumn currentMedia={$currentMedia} />
                <PlayerUIQueueColumn queue={$queue} />
            </div>
        </div>
    );
}

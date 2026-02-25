"use client";

import { PlayerUICoverColumn } from "@/components/PlayerUI/PlayerUICoverColumn";
import { PlayerUILyricsColumn } from "@/components/PlayerUI/PlayerUILyricsColumn";
import { PlayerUIQueueColumn } from "@/components/PlayerUI/PlayerUIQueueColumn";
import { rockIt } from "@/lib/rockit/rockIt";
import { useLanguage } from "@/contexts/LanguageContext";
import { useStore } from "@nanostores/react";
import useWindowSize from "@/hooks/useWindowSize";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export default function PlayerUI() {
    const $currentSong = useStore(rockIt.queueManager.currentSongAtom);
    const $isPlayerUIVisible = useStore(rockIt.playerUIManager.visibleAtom);
    const $queue = useStore(rockIt.queueManager.queueAtom);

    const divRef = useRef<HTMLDivElement>(null);
    const innerWidth = useWindowSize().width;
    const [shouldRender, setShouldRender] = useState(false);

    const { langFile: lang } = useLanguage();

    // SSR guard — only render on desktop
    useEffect(() => {
        if (!innerWidth) return;
        setShouldRender(innerWidth > 768);
    }, [innerWidth]);

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
            (s) => s.queueSongId === rockIt.queueManager.currentQueueSongId
        );
        if (index == null || index === -1) return;
        const queueEl = divRef.current?.querySelector(
            "[data-queue-scroll]"
        ) as HTMLDivElement | null;
        if (queueEl) queueEl.scrollTop = index * 64;
    }, [$isPlayerUIVisible]);

    if (!lang || !$queue || !shouldRender) return null;

    return (
        <div
            ref={divRef}
            className="absolute inset-0 flex items-center justify-center overflow-hidden bg-black/80 pb-24 pl-12 pt-20 transition-all duration-300"
            style={{
                top: $isPlayerUIVisible ? "0%" : "100%",
                height: "calc(100%)",
            }}
        >
            <div className="relative grid h-full w-full grid-cols-[1fr_1fr] gap-x-2 bg-black px-2 text-white lg:grid-cols-[30%_40%_30%]">
                {/* Background blurred cover */}
                <Image
                    alt={$currentSong?.name ?? ""}
                    src={
                        $currentSong?.internalImageUrl ??
                        rockIt.SONG_PLACEHOLDER_IMAGE_URL
                    }
                    width={600}
                    height={600}
                    className="absolute top-1/2 h-auto w-full -translate-y-1/2 select-none blur-md brightness-50"
                />

                <PlayerUILyricsColumn />
                <PlayerUICoverColumn currentSong={$currentSong} />
                <PlayerUIQueueColumn queue={$queue} lang={lang} />
            </div>
        </div>
    );
}

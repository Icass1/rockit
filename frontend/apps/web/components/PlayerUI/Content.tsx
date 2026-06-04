"use client";

import { JSX, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useStore } from "@nanostores/react";
import { isVideo } from "@rockit/shared";
import useWindowSize from "@/hooks/useWindowSize";
import { rockIt } from "@/lib/rockit/rockIt";
import PlayerUILyrics from "@/components/PlayerUI/Lyrics";
import PlayerUIMain from "@/components/PlayerUI/Main";
import PlayerUIQueue from "@/components/PlayerUI/Queue";

export default function PlayerUIContent(): JSX.Element {
    const $currentMedia = useStore(rockIt.queueManager.currentMediaAtom);
    const $isPlayerUIVisible = useStore(rockIt.playerUIManager.visibleAtom);

    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);

    const divRef = useRef<HTMLDivElement>(null);

    const { height, width } = useWindowSize();

    const [selectedTab, setSelectedTab] = useState<"QUEUE" | "LYRICS">("QUEUE");

    // Close player when clicking outside
    useEffect((): (() => void) => {
        const handleDocumentClick = (e: MouseEvent): void => {
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
        return (): void =>
            document.removeEventListener("click", handleDocumentClick);
    }, []);

    // Scroll queue to current song when player opens
    useEffect((): void => {
        if (!$isPlayerUIVisible) return;
        const index = rockIt.queueManager.queue?.findIndex(
            (s): boolean =>
                s.queueMediaId === rockIt.queueManager.currentQueueMediaId
        );
        if (index === null || index === -1) return;
        const queueEl = divRef.current?.querySelector(
            "[data-queue-scroll]"
        ) as HTMLDivElement | null;
        if (queueEl) queueEl.scrollTop = index * 64;
    }, [$isPlayerUIVisible]);

    if (!$currentMedia)
        return (
            <div className="text-xl font-semibold">
                {$vocabulary.NO_MEDIA_PLAYING}
            </div>
        );

    if (!width || !height) return <div>Loading window size.</div>;

    const aspectRatio = width / height;
    const defaultStyles =
        "relative grid h-full w-full gap-4 bg-black px-2 text-white pt-24";

    const isLandscape = aspectRatio > 1.5;
    const isPortrait = aspectRatio < 1 / 1.5;

    const showLyrics = !($currentMedia && isVideo($currentMedia));

    const gridClass = isLandscape
        ? `transition-all duration-500 ease-in-out ${
              showLyrics ? "grid-cols-[2fr_4fr_2fr]" : "grid-cols-[0fr_6fr_2fr]"
          }`
        : isPortrait
          ? "grid-rows-[1fr_1fr]"
          : "grid-cols-[3fr_1fr]";

    // Keep mainComponent at the same child index across all layouts so React
    // never unmounts PlayerUIMain (which would detach and pause the video).
    // In landscape mode, CSS `order` is used to visually place queue before
    // main and lyrics after, without changing DOM order.
    return (
        <div ref={divRef} className={defaultStyles + " " + gridClass}>
            <div className="absolute inset-0 overflow-hidden">
                <Image
                    alt={$currentMedia.name}
                    src={$currentMedia.imageUrl}
                    fill
                    className="object-cover blur-3xl brightness-50 select-none"
                />
            </div>

            <div
                className={
                    "h-full max-h-full min-h-0" +
                    (isLandscape ? " order-2" : "")
                }
            >
                <PlayerUIMain key={$currentMedia?.publicId} currentMedia={$currentMedia} />
            </div>

            {isLandscape ? (
                <>
                    <div
                        className={`z-10 order-1 overflow-hidden transition-all duration-500 ease-in-out ${
                            showLyrics
                                ? "max-w-full opacity-100 translate-x-0"
                                : "max-w-0 opacity-0 -translate-x-8"
                        }`}
                    >
                        <PlayerUILyrics />
                    </div>
                    <div className="z-10 order-3 h-full max-h-full min-h-0 w-full max-w-full min-w-0">
                        <PlayerUIQueue visible={true} />
                    </div>
                </>
            ) : isPortrait ? (
                <div className="grid min-h-0 grid-cols-[1fr_1fr] gap-4">
                    <div className="z-10 h-full max-h-full min-h-0 w-full max-w-full min-w-0">
                        <PlayerUILyrics />
                    </div>
                    <div className="z-10 h-full max-h-full min-h-0 w-full max-w-full min-w-0">
                        <PlayerUIQueue visible={true} />
                    </div>
                </div>
            ) : (
                <div className="z-10 grid h-full max-h-full min-h-0 min-w-0 grid-rows-[min-content_1fr] gap-2">
                    <div className="relative flex flex-row justify-center gap-4">
                        {["QUEUE", "LYRICS"].map(
                            (tab): JSX.Element => (
                                <button
                                    key={tab}
                                    className={`text-lg font-semibold transition hover:text-white ${selectedTab === tab ? "border-b-2 border-white text-white" : "text-gray-400"}`}
                                    onClick={(): void =>
                                        setSelectedTab(
                                            tab as "LYRICS" | "QUEUE"
                                        )
                                    }
                                >
                                    {$vocabulary[tab as "LYRICS" | "QUEUE"]}
                                </button>
                            )
                        )}
                    </div>
                    <div className="relative h-full max-h-full min-h-0 w-full max-w-full min-w-0 overflow-hidden">
                        <div
                            className="absolute z-10 h-full max-h-full min-h-0 w-full max-w-full min-w-0 transition-all"
                            style={{
                                left: selectedTab === "LYRICS" ? "0%" : "100%",
                            }}
                        >
                            <PlayerUILyrics />
                        </div>
                        <div
                            className="absolute z-10 h-full max-h-full min-h-0 w-full max-w-full min-w-0 transition-all"
                            style={{
                                left: selectedTab === "LYRICS" ? "100%" : "0%",
                            }}
                        >
                            <PlayerUIQueue visible={selectedTab === "QUEUE"} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

"use client";

import { JSX, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useStore } from "@nanostores/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { isSong, isVideo } from "@rockit/shared";
import useWindowSize from "@/hooks/useWindowSize";
import { resolveOfflineCoverUrl } from "@/lib/offline/store";
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
    const [offlineBgCover, setOfflineBgCover] = useState<{
        publicId: string;
        url: string;
    } | null>(null);

    useEffect((): (() => void) | undefined => {
        if (!$currentMedia) return;
        if (!isSong($currentMedia)) return;
        let cancelled = false;
        resolveOfflineCoverUrl($currentMedia.publicId).then((url) => {
            if (!cancelled && url)
                setOfflineBgCover({
                    publicId: $currentMedia.publicId,
                    url,
                });
        });
        return (): void => {
            cancelled = true;
        };
    }, [$currentMedia]);

    const bgCoverSrc =
        offlineBgCover && offlineBgCover.publicId === $currentMedia?.publicId
            ? offlineBgCover.url
            : ($currentMedia?.imageUrl ?? "");

    // Close player when clicking outside
    useEffect((): (() => void) => {
        const handleDocumentClick = (e: MouseEvent): void => {
            const target = e.target as Node;
            if (
                target instanceof Element &&
                target.closest(".context-menu-option")
            )
                return;
            const insidePlayer = divRef.current?.contains(target);
            const insideFooter = document
                .getElementById("app-footer")
                ?.contains(target);

            const ignoreClickElements = document.getElementsByClassName(
                "ignore-click-player-ui"
            );

            const ignored = Array.from(ignoreClickElements).some((el) =>
                el.contains(target)
            );

            const isIgnored = (target as HTMLElement).classList.contains(
                "ignore-click-player-ui"
            );

            if (!insidePlayer && !insideFooter && !ignored && !isIgnored) {
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

    const isVideoMedia = $currentMedia ? isVideo($currentMedia) : false;

    const sideCol = "minmax(0,clamp(280px,22vw,26rem))";

    // The lyrics column keeps a constant track width so the center (cover)
    // never shifts; only the inner content slides. The queue column is 1fr.
    const gridStyle = isLandscape
        ? {
              gridTemplateColumns: isVideoMedia
                  ? `0fr minmax(0,1fr) ${sideCol}`
                  : `${sideCol} minmax(0,1fr) minmax(0,1fr)`,
          }
        : undefined;

    const gridClass = isLandscape
        ? "transition-all ease-in-out duration-500"
        : isPortrait
          ? "grid-rows-[1fr_1fr]"
          : "grid-cols-[3fr_1fr]";

    // Keep mainComponent at the same child index across all layouts so React
    // never unmounts PlayerUIMain (which would detach and pause the video).
    // In landscape mode, CSS `order` is used to visually place queue before
    // main and lyrics after, without changing DOM order.
    return (
        <div ref={divRef} style={gridStyle} className={defaultStyles + " " + gridClass}>
            <div className="absolute inset-0 overflow-hidden">
                <Image
                    alt={$currentMedia.name}
                    src={bgCoverSrc}
                    fill
                    className="object-cover blur-3xl brightness-50 select-none"
                />
            </div>

            <div
                className={
                    "h-full max-h-full min-h-0 min-w-0" +
                    (isLandscape ? " order-2" : "")
                }
            >
                <PlayerUIMain
                    key={$currentMedia?.publicId}
                    currentMedia={$currentMedia}
                />
            </div>

            {isLandscape ? (
                <>
                    <LyricsPanel
                        key={$currentMedia?.publicId}
                        isVideo={isVideoMedia}
                    />
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

function LyricsPanel({ isVideo }: { isVideo: boolean }): JSX.Element {
    const [lyricsOpen, setLyricsOpen] = useState<boolean>(true);

    return (
        <div className="relative z-10 order-1 h-full max-h-full min-h-0 min-w-0 overflow-hidden">
            {!isVideo && (
                <>
                    <button
                        type="button"
                        onClick={(): void => setLyricsOpen((p) => !p)}
                        className={`ignore-click-player-ui absolute top-3 z-30 flex items-center justify-center rounded-full p-2 text-white/80 transition-colors hover:text-white ${
                            lyricsOpen ? "left-3" : "right-1/2 translate-x-1/2"
                        }`}
                        title={lyricsOpen ? "Hide lyrics" : "Show lyrics"}
                        aria-label={
                            lyricsOpen ? "Hide lyrics" : "Show lyrics"
                        }
                    >
                        {lyricsOpen ? (
                            <ChevronLeft className="pointer-events-none h-5 w-5" />
                        ) : (
                            <ChevronRight className="pointer-events-none h-5 w-5" />
                        )}
                    </button>
                    <div
                        className={`h-full min-h-0 overflow-hidden transition-all ease-in-out duration-500 ${
                            lyricsOpen
                                ? "max-w-full translate-x-0 opacity-100 pointer-events-auto"
                                : "max-w-0 -translate-x-full opacity-0 pointer-events-none"
                        }`}
                    >
                        <PlayerUILyrics />
                    </div>
                </>
            )}
        </div>
    );
}


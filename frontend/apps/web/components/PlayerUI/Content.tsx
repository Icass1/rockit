"use client";

import { JSX, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useStore } from "@nanostores/react";
import { isSong, isVideo } from "@rockit/shared";
import { ChevronLeft } from "lucide-react";
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
            : $currentMedia?.imageUrl ||
              ($currentMedia?.type === "station"
                  ? "/radio-placeholder.png"
                  : "");

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
    // pt-30 / pb-6 = the header/footer padding (24) plus half of it (12),
    // so the player content never visually collides with either bar.
    const defaultStyles =
        "relative grid h-full w-full gap-4 bg-black text-white pt-30 pb-6";

    const isLandscape = aspectRatio > 1.5;
    const isPortrait = aspectRatio < 1 / 1.5;
    const isUltrawide = aspectRatio > 2;

    const isVideoMedia = $currentMedia ? isVideo($currentMedia) : false;

    // Lyrics and queue side columns share the exact same clamped width so the
    // center column (cover/video) always lands in the middle of the screen.
    // Tuning rules across screen sizes:
    // - 26vw: panels scale up with the viewport on normal/16:9 screens.
    // - 34rem cap: on ultrawide the leftover space breathes around the cover
    //   instead of inflating the panels past a readable width.
    // - minmax(0, ...): on short/narrow landscape windows the tracks shrink
    //   proportionally instead of overflowing the grid.
    const sideCol = "minmax(0,clamp(280px,26vw,34rem))";

    // Normal landscape: symmetric clamped side columns around a 1fr center.
    // Ultrawide (>2): three thirds with a slightly wider center (1.15fr); each
    // side panel is capped and centered inside its own third so the leftover
    // space distributes as symmetric gutters instead of piling up around the
    // cover. The center third stays exactly centered on screen because the
    // outer thirds are equal, and the extra width lets the cover keep a
    // perfect 1:1 square at 96% of the row height without being clamped by
    // its column. The queue panel is wider (150% of the lyrics panel) but
    // stays centered in its third.
    const gridStyle = isLandscape
        ? {
              gridTemplateColumns: isVideoMedia
                  ? `0fr minmax(0,1fr) ${sideCol}`
                  : isUltrawide
                    ? "minmax(0,1fr) minmax(0,1.15fr) minmax(0,1fr)"
                    : `${sideCol} minmax(0,1fr) ${sideCol}`,
          }
        : undefined;

    const gridClass = isLandscape
        ? "px-2 transition-all ease-in-out duration-500"
        : isPortrait
          ? "grid-rows-[minmax(0,1fr)_minmax(0,1fr)]"
          : "grid-cols-[3fr_1fr] px-2";

    // Keep mainComponent at the same child index across all layouts so React
    // never unmounts PlayerUIMain (which would detach and pause the video).
    // In landscape mode, CSS `order` is used to visually place queue before
    // main and lyrics after, without changing DOM order.
    return (
        <div
            ref={divRef}
            style={gridStyle}
            className={defaultStyles + " " + gridClass}
        >
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
                    key={isVideoMedia ? $currentMedia.publicId : "audio"}
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
                        <div className="mx-auto h-full w-[min(51rem,100%)]">
                            <PlayerUIQueue visible={true} />
                        </div>
                    </div>
                </>
            ) : isPortrait ? (
                <div className="grid min-h-0 grid-cols-[1fr_1fr] gap-4 px-2">
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
                        {["QUEUE", "LYRICS"].map((tab): JSX.Element => (
                            <button
                                key={tab}
                                className={`text-lg font-semibold transition hover:text-white ${selectedTab === tab ? "border-b-2 border-white text-white" : "text-gray-400"}`}
                                onClick={(): void =>
                                    setSelectedTab(tab as "LYRICS" | "QUEUE")
                                }
                            >
                                {$vocabulary[tab as "LYRICS" | "QUEUE"]}
                            </button>
                        ))}
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
                <div className="relative mx-auto h-full w-[min(34rem,100%)]">
                    <button
                        type="button"
                        onClick={(): void => setLyricsOpen((p) => !p)}
                        className="ignore-click-player-ui absolute top-1/2 left-2 z-30 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-white/80 transition-colors hover:text-white"
                        title={lyricsOpen ? "Hide lyrics" : "Show lyrics"}
                        aria-label={lyricsOpen ? "Hide lyrics" : "Show lyrics"}
                        aria-expanded={lyricsOpen}
                    >
                        <ChevronLeft
                            className={`pointer-events-none h-5 w-5 transition-transform duration-300 ${lyricsOpen ? "" : "rotate-180"}`}
                        />
                    </button>
                    <div
                        className={`h-full min-h-0 overflow-hidden transition-all duration-500 ease-in-out ${
                            lyricsOpen
                                ? "pointer-events-auto max-w-full translate-x-0 opacity-100"
                                : "pointer-events-none max-w-0 -translate-x-full opacity-0"
                        }`}
                    >
                        <PlayerUILyrics />
                    </div>
                </div>
            )}
        </div>
    );
}

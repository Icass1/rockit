"use client";

import { useEffect, useMemo, useRef, useState, type JSX } from "react";
import { BaseDynamicLyricsResponse, BaseLyricsResponse } from "@/dto";
import { useStore } from "@nanostores/react";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";
import ProviderTag from "@/components/ProviderTag/ProviderTag";

export default function PlayerUILyrics(): JSX.Element {
    const [lyricsTab, setLyricsTab] = useState<"STATIC" | "DYNAMIC">("DYNAMIC");
    const $currentMedia = useStore(rockIt.queueManager.currentMediaAtom);

    return (
        <div className="relative h-full w-full">
            {lyricsTab === "STATIC" ? (
                <Lyrics key={$currentMedia?.publicId}></Lyrics>
            ) : (
                <DynamicLyrics key={$currentMedia?.publicId}></DynamicLyrics>
            )}
        </div>
    );
}

function Lyrics(): JSX.Element {
    const $currentMedia = useStore(rockIt.queueManager.currentMediaAtom);

    const [lyrics, setLyrics] = useState<BaseLyricsResponse>();

    useEffect(() => {
        if (!$currentMedia) return;

        Http.getLyricsAsync($currentMedia.publicId).then((response) => {
            if (response.isOk()) {
                setLyrics(response.result);
            }
        });
    }, [$currentMedia]);

    return (
        <div className="scrollbar-none overflow-y-auto scroll-smooth pl-7">
            {lyrics?.lines.map((line, index) => (
                <p key={index} className="px-4 py-2 text-lg">
                    {line}
                </p>
            ))}
        </div>
    );
}

function smoothScrollTo(
    element: HTMLElement,
    targetY: number,
    duration: number = 600
): void {
    const startY = element.scrollTop;
    const diff = targetY - startY;
    if (Math.abs(diff) < 1) return;
    const startTime = performance.now();

    const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

    const animate = (currentTime: number): void => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        element.scrollTop = startY + diff * easeOutCubic(progress);
        if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
}

function DynamicLyrics(): JSX.Element {
    const $currentMedia = useStore(rockIt.queueManager.currentMediaAtom);
    const $currentTime = useStore(rockIt.mediaPlayerManager.currentTimeAtom);
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);

    const [lyrics, setLyrics] = useState<
        BaseDynamicLyricsResponse | undefined
    >();

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!$currentMedia) return;

        Http.getDynamicLyricsAsync($currentMedia.publicId).then((response) => {
            if (response.isOk()) {
                setLyrics(response.result);
            }
            setLoading(false);
        });
    }, [$currentMedia]);

    const currentIndex = useMemo(() => {
        if (!lyrics || !$currentTime) return null;

        const offset = lyrics.offset;

        for (let i = lyrics.lines.length - 1; i >= 0; i--) {
            if ($currentTime >= lyrics.lines[i].timestamp_s - offset) {
                return i;
            }
        }

        return null;
    }, [lyrics, $currentTime]);

    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;
        const element = containerRef.current.querySelector(
            `#dynamic-lyric-line-${currentIndex}`
        ) as HTMLElement;
        if (element) {
            const container = containerRef.current;
            const elementTop = element.offsetTop;
            const elementHeight = element.offsetHeight;
            const containerHeight = container.clientHeight;
            const targetY =
                elementTop + elementHeight / 2 - containerHeight / 2;
            smoothScrollTo(container, targetY);
        }
    }, [currentIndex]);

    const goToLine = (index: number): void => {
        const timeStamp = lyrics?.lines[index].timestamp_s;
        if (timeStamp !== undefined) {
            rockIt.mediaPlayerManager.setCurrentTime(timeStamp);
        }
    };

    if (loading) {
        return (
            <div className="flex h-full w-full animate-pulse items-center justify-center">
                <p className="text-lg text-neutral-400">Loading lyrics...</p>
            </div>
        );
    }

    if (!lyrics) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <p className="text-lg text-neutral-400">No lyrics available</p>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className="scrollbar-none h-full w-full overflow-y-auto scroll-smooth pr-20 pb-24 pl-10"
        >
            {lyrics?.lines.map((line, index) => (
                <p
                    onClick={() => goToLine(index)}
                    key={index}
                    className={`cursor-pointer py-2 pr-8 pl-4 text-lg font-semibold text-balance transition-all duration-300 ${
                        currentIndex === index
                            ? "origin-left scale-[1.25] text-white"
                            : "text-neutral-400 hover:text-neutral-300"
                    }`}
                    id={`dynamic-lyric-line-${index}`}
                >
                    {line.text}
                </p>
            ))}
            <div className="mt-24 flex flex-col items-center gap-4">
                <div className="flex flex-row items-center gap-4">
                    <label className="text-lg font-semibold">
                        {$vocabulary.LYRICS_BY}
                    </label>
                    {lyrics?.provider && (
                        <ProviderTag
                            className="h-10 w-10"
                            name={lyrics?.provider}
                        />
                    )}
                </div>
                <p className="text-xs text-neutral-400">{lyrics?.publicId}</p>
            </div>
        </div>
    );
}

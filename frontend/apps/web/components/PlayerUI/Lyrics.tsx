"use client";

import { useEffect, useMemo, useRef, useState, type JSX } from "react";
import { BaseDynamicLyricsResponse, BaseLyricsResponse } from "@/dto";
import { useStore } from "@nanostores/react";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";

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
        <div className="overflow-y-auto">
            {lyrics?.lines.map((line, index) => (
                <p key={index} className="px-4 py-2">
                    {line}
                </p>
            ))}
        </div>
    );
}

function DynamicLyrics(): JSX.Element {
    const $currentMedia = useStore(rockIt.queueManager.currentMediaAtom);
    const $currentTime = useStore(rockIt.mediaPlayerManager.currentTimeAtom);

    const [lyrics, setLyrics] = useState<
        BaseDynamicLyricsResponse | undefined
    >();

    useEffect(() => {
        if (!$currentMedia) return;

        Http.getDynamicLyricsAsync($currentMedia.publicId).then((response) => {
            if (response.isOk()) {
                setLyrics(response.result);
            }
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
            const scrollTo =
                elementTop + elementHeight / 2 - containerHeight / 2;
            container.scrollTo({ top: scrollTo, behavior: "smooth" });
        }
    }, [currentIndex]);

    const goToLine = (index: number): void => {
        const timeStamp = lyrics?.lines[index].timestamp_s;
        if (timeStamp !== undefined) {
            rockIt.mediaPlayerManager.setCurrentTime(timeStamp);
        }
    };

    return (
        <div ref={containerRef} className="h-full w-full overflow-y-auto pb-24">
            {lyrics?.lines.map((line, index) => (
                <p
                    onClick={() => goToLine(index)}
                    key={index}
                    className={`cursor-pointer px-4 py-2 font-semibold transition-all duration-300 ${
                        currentIndex === index
                            ? "text-xl text-white"
                            : "text-neutral-400 hover:text-neutral-300"
                    }`}
                    id={`dynamic-lyric-line-${index}`}
                >
                    {line.text}
                </p>
            ))}
            <p>{lyrics?.provider}</p>
            <p>{lyrics?.publicId}</p>
        </div>
    );
}

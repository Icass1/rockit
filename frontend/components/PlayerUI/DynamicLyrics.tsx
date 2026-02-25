"use client";

import { useEffect, useRef, useState } from "react";
import { rockIt } from "@/lib/rockit/rockIt";
import { useLyrics } from "@/components/PlayerUI/hooks/useLyrics";

// --------------------------------------------------------------------------
// Position lookup — eliminates the 7-case switch/case.
// Keys are the offset from the active line (index - computedIndex).
// --------------------------------------------------------------------------
type LineStyle = {
    top: string;
    scale: string;
    fontWeight: number;
    color: string;
};

const VISIBLE_OFFSETS: Record<number, LineStyle> = {
    [-2]: {
        top: "25%",
        scale: "scale-[.4]",
        fontWeight: 500,
        color: "rgb(200,200,200)",
    },
    [-1]: {
        top: "35%",
        scale: "scale-[.6]",
        fontWeight: 500,
        color: "rgb(200,200,200)",
    },
    [0]: { top: "50%", scale: "", fontWeight: 600, color: "rgb(230,230,230)" },
    [1]: {
        top: "63%",
        scale: "scale-[.6]",
        fontWeight: 500,
        color: "rgb(200,200,200)",
    },
    [2]: {
        top: "75%",
        scale: "scale-[.4]",
        fontWeight: 500,
        color: "rgb(200,200,200)",
    },
};

// --------------------------------------------------------------------------
// Component
// --------------------------------------------------------------------------
export function DynamicLyrics() {
    const { lyricsState, setManualIndex, computedIndex } = useLyrics();
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [containerHeight, setContainerHeight] = useState(0);

    useEffect(() => {
        if (scrollContainerRef.current) {
            setContainerHeight(scrollContainerRef.current.offsetHeight);
        }
    }, []);

    // Early returns for non-renderable states
    if (
        lyricsState.status === "idle" ||
        lyricsState.status === "loading" ||
        lyricsState.status === "empty"
    ) {
        return (
            <div className="relative flex h-full w-full items-center justify-center px-4">
                {lyricsState.status === "loading"
                    ? "Loading lyrics…"
                    : "No lyrics found"}
            </div>
        );
    }

    const { lines } = lyricsState;
    const timestamps =
        lyricsState.status === "dynamic" ? lyricsState.timestamps : [];
    const hasDynamicTimestamps = timestamps.length > 0;

    const commonStyles =
        "absolute text-center left-1/2 -translate-x-1/2 w-full -translate-y-1/2 transition-all duration-500 text-balance origin-center";
    const clickableClass = hasDynamicTimestamps
        ? " cursor-pointer hover:brightness-150"
        : "";

    const seekTo = (lineIndex: number) => {
        if (!hasDynamicTimestamps) return;
        rockIt.audioManager.setCurrentTime(timestamps[lineIndex].time + 0.01);
    };

    return (
        <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden px-4">
            {lines.map((line, index) => {
                const offset = index - computedIndex;
                const config = VISIBLE_OFFSETS[offset];

                // Lines outside the ±2 window collapse to invisible
                if (!config) {
                    return (
                        <div
                            key={index}
                            className={`${commonStyles} scale-[0]`}
                            aria-hidden
                            style={{
                                top: offset > 0 ? "75%" : "25%",
                                fontSize: "4vh",
                                fontWeight: 500,
                                lineHeight: "4vh",
                                maxWidth: "100%",
                                color: "rgb(200,200,200)",
                            }}
                        >
                            {line}
                        </div>
                    );
                }

                return (
                    <div
                        key={index}
                        className={`${commonStyles} ${config.scale}${clickableClass}`}
                        onClick={() => seekTo(index)}
                        style={{
                            top: config.top,
                            fontSize: "4vh",
                            fontWeight: config.fontWeight,
                            lineHeight: "4vh",
                            maxWidth: "100%",
                            color: config.color,
                        }}
                    >
                        {line}
                    </div>
                );
            })}

            {/* Invisible scroll layer for static lyrics — scroll position drives the active line */}
            {!hasDynamicTimestamps && (
                <div
                    ref={scrollContainerRef}
                    className="hide-scroll-track hide-scroll-thumb absolute block h-full w-full max-w-full min-w-0 overflow-auto"
                    onScroll={(e) =>
                        setManualIndex(
                            Math.floor(e.currentTarget.scrollTop / 100)
                        )
                    }
                >
                    <div
                        className="w-full"
                        style={{
                            // Each "line slot" is 100px; the last slot fills the container
                            height:
                                (lines.length - 1) * 100 +
                                containerHeight +
                                "px",
                        }}
                    />
                </div>
            )}
        </div>
    );
}

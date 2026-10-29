"use client";

import type { JSX } from "react";
import { useEffect, useMemo, useRef } from "react";
import { useStore } from "@nanostores/react";
import { useLyricsSnapshot } from "@/hooks/useLyricsSnapshot";
import { usePlayer } from "@/lib/PlayerContext";
import { rockIt } from "@/lib/rockit/rockIt";
import { lyricPlaybackTime, lyricSeekTime } from "@/lib/utils/lyricsTiming";

interface LyricsPanelProps {
    currentTime: number;
    onSeek: (seconds: number) => void;
}

export default function LyricsPanel({
    currentTime,
    onSeek,
}: LyricsPanelProps): JSX.Element {
    const { currentMedia } = usePlayer();
    const snapshot = useLyricsSnapshot(
        currentMedia?.type === "song" ? currentMedia.publicId : undefined
    );
    const lyrics = snapshot.data?.dynamic;
    const loading = snapshot.loading;
    const activeLineRef = useRef<HTMLParagraphElement>(null);

    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);

    const currentIndex = useMemo(() => {
        if (!lyrics || !lyrics.lines) return null;
        const offset: number = lyrics.offset ?? 0;
        for (let i = lyrics.lines.length - 1; i >= 0; i--) {
            const line = lyrics.lines[i];
            if (currentTime >= lyricPlaybackTime(line.timestamp_s, offset)) {
                return i;
            }
        }
        return null;
    }, [lyrics, currentTime]);

    useEffect(() => {
        activeLineRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "center",
        });
    }, [currentIndex]);

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <p className="text-base text-(--color-muted)">
                    Cargando letra...
                </p>
            </div>
        );
    }

    if (!lyrics) {
        return (
            <div className="h-full overflow-y-auto px-6">
                {snapshot.data?.lines.map((line, index) => (
                    <p key={index} className="py-2">
                        {line.text}
                    </p>
                ))}
                {!snapshot.data?.lines.length && (
                    <p>{$vocabulary.LYRICS_UNAVAILABLE}</p>
                )}
            </div>
        );
    }

    return (
        <div className="hide-scroll-thumb h-full overflow-y-auto px-6 pt-4 pb-24">
            {lyrics.lines.map(
                (
                    line: {
                        text: string;
                        timestamp_s: number;
                    },
                    index: number
                ): JSX.Element => {
                    const isActive = index === currentIndex;
                    const isPast =
                        currentIndex !== null && index < currentIndex;
                    return (
                        <p
                            key={index}
                            ref={isActive ? activeLineRef : undefined}
                            onClick={() =>
                                onSeek(
                                    lyricSeekTime(
                                        line.timestamp_s,
                                        lyrics.offset
                                    )
                                )
                            }
                            className={`mb-2 cursor-pointer pr-4 leading-9 font-semibold transition-colors ${
                                isActive
                                    ? "text-[26px] text-white"
                                    : isPast
                                      ? "text-[22px] text-white/20"
                                      : "text-[22px] text-white/35"
                            }`}
                        >
                            {line.text}
                        </p>
                    );
                }
            )}
        </div>
    );
}

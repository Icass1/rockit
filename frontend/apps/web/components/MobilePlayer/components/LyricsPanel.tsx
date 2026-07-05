"use client";

import type { JSX } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { HttpResult } from "@rockit/shared";
import { usePlayer } from "@/lib/PlayerContext";
import { Http } from "@/lib/http";
import type { BaseDynamicLyricsResponse } from "@/dto";

interface LyricsPanelProps {
    currentTime: number;
    onSeek: (seconds: number) => void;
}

export default function LyricsPanel({
    currentTime,
    onSeek,
}: LyricsPanelProps): JSX.Element {
    const { currentMedia } = usePlayer();
    const [lyrics, setLyrics] = useState<BaseDynamicLyricsResponse>();
    const [loading, setLoading] = useState(true);
    const activeLineRef = useRef<HTMLParagraphElement>(null);

    useEffect(() => {
        if (!currentMedia) return;

        let cancelled = false;

        Http.getDynamicLyricsAsync(
            currentMedia.publicId
        ).then((response: HttpResult<BaseDynamicLyricsResponse>) => {
            if (cancelled) return;
            if (response.isOk() && response.result) {
                setLyrics(response.result);
            }
            setLoading(false);
        });

        return (): void => {
            cancelled = true;
        };
    }, [currentMedia]);

    const currentIndex = useMemo(() => {
        if (!lyrics || !lyrics.lines) return null;
        const offset: number = lyrics.offset ?? 0;
        for (let i = lyrics.lines.length - 1; i >= 0; i--) {
            const line = lyrics.lines[i];
            if (currentTime >= (line.timestamp_s ?? 0) - offset) {
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
            <div className="flex h-full items-center justify-center">
                <p className="text-base text-(--color-muted)">
                    No hay letra disponible
                </p>
            </div>
        );
    }

    return (
        <div className="hide-scroll-thumb h-full overflow-y-auto px-6 pb-24 pt-4">
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
                            ref={
                                isActive ? activeLineRef : undefined
                            }
                            onClick={() =>
                                onSeek(line.timestamp_s)
                            }
                            className={`mb-2 cursor-pointer pr-4 font-semibold leading-9 transition-colors ${
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

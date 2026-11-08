"use client";

import { useMemo, useRef, type JSX } from "react";
import type { PiPLyricsState } from "@/models/types/pip";
import { useActiveLyricIndex } from "@/hooks/useActiveLyricIndex";
import { useLyricAutoScroll } from "@/hooks/useLyricAutoScroll";
import { usePiPText } from "@/hooks/usePiPText";
import { rockIt } from "@/lib/rockit/rockIt";
import { lyricSeekTime } from "@/lib/utils/lyricsTiming";

export function PiPLyrics({
    data: lyrics,
    loading,
    glance = false,
}: PiPLyricsState & { glance?: boolean }): JSX.Element | null {
    const text = usePiPText();
    const syncedLines = useMemo(() => {
        return lyrics?.dynamicLyrics ?? [];
    }, [lyrics]);

    const currentLineIndex = useActiveLyricIndex(
        rockIt.mediaPlayerManager.currentTimeAtom,
        syncedLines,
        lyrics?.offset
    );

    const scrollRef = useRef<HTMLDivElement>(null);

    useLyricAutoScroll(
        scrollRef,
        glance || currentLineIndex < 0
            ? null
            : `[data-lyric-index="${currentLineIndex}"]`
    );

    const goToLine = (index: number): void => {
        const ts = syncedLines[index]?.timestamp_s;
        if (ts !== undefined) {
            rockIt.mediaPlayerManager.setCurrentTime(
                lyricSeekTime(ts, lyrics?.offset)
            );
        }
    };

    if (glance) {
        const line =
            syncedLines[Math.max(0, currentLineIndex)]?.text ??
            lyrics?.lyrics?.[0]?.text;
        const message = loading
            ? text("PIP_LOADING_LYRICS")
            : (line ?? text("PIP_NO_LYRICS"));
        return (
            <p className="pip-lyric-glance" title={message}>
                {message}
            </p>
        );
    }

    if (loading) {
        return (
            <div
                className="pip-lyrics-overlay"
                data-testid="pip-lyrics-loading"
            >
                <div className="flex flex-col items-center gap-2">
                    <div className="skeleton h-3 w-3/4 rounded" />
                    <div className="skeleton h-3 w-1/2 rounded" />
                    <div className="skeleton h-3 w-2/3 rounded" />
                </div>
            </div>
        );
    }

    if (syncedLines.length === 0 && lyrics?.lyrics?.length) {
        return (
            <div className="pip-lyrics-overlay" data-testid="pip-lyrics-static">
                <div className="pip-lyrics-scroll">
                    {lyrics.lyrics.map((line, index) => (
                        <p className="pip-lyrics-line" key={index}>
                            {line.text}
                        </p>
                    ))}
                </div>
            </div>
        );
    }

    if (syncedLines.length === 0) {
        return (
            <div className="pip-lyrics-overlay" data-testid="pip-lyrics-empty">
                <p className="text-muted-foreground text-xs">
                    {text("PIP_NO_LYRICS")}
                </p>
            </div>
        );
    }

    return (
        <div className="pip-lyrics-overlay" data-testid="pip-lyrics">
            <div ref={scrollRef} className="pip-lyrics-scroll">
                {syncedLines.map((line, i) => {
                    let className = "pip-lyrics-line";
                    if (i < currentLineIndex)
                        className += " pip-lyrics-line--past";
                    else if (i === currentLineIndex)
                        className += " pip-lyrics-line--current";
                    else className += " pip-lyrics-line--future";
                    return (
                        <span
                            key={i}
                            className={className}
                            data-lyric-index={i}
                            onClick={(): void => goToLine(i)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e): void => {
                                if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    goToLine(i);
                                }
                            }}
                        >
                            {line.text}
                        </span>
                    );
                })}
            </div>
        </div>
    );
}

export default PiPLyrics;

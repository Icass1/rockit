"use client";

import { useEffect, useMemo, useRef, useState, type JSX } from "react";
import type { GetLyricsResponse } from "@/dto";
import { useStore } from "@nanostores/react";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";

export function PiPLyrics(): JSX.Element | null {
    const $currentMedia = useStore(rockIt.queueManager.currentMediaAtom);
    const $currentTime = useStore(rockIt.mediaPlayerManager.currentTimeAtom);
    const [lyrics, setLyrics] = useState<GetLyricsResponse | undefined>();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!$currentMedia) return;

        Http.getLrclibLyricsAsync($currentMedia.publicId).then((response) => {
            if (response.isOk()) {
                setLyrics(response.result);
            }
            setLoading(false);
        });
    }, [$currentMedia]);

    const syncedLines = useMemo(() => {
        return lyrics?.dynamicLyrics ?? [];
    }, [lyrics]);

    const currentLineIndex = useMemo(() => {
        if (syncedLines.length === 0) return -1;
        if ($currentTime === null || $currentTime === undefined) return -1;

        for (let i = syncedLines.length - 1; i >= 0; i--) {
            if ($currentTime >= syncedLines[i].timestamp_s) {
                return i;
            }
        }

        return -1;
    }, [syncedLines, $currentTime]);

    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!scrollRef.current || currentLineIndex < 0) return;

        const el = scrollRef.current.querySelector(
            `[data-lyric-index="${currentLineIndex}"]`
        ) as HTMLElement | null;
        if (!el) return;

        const container = scrollRef.current;
        const elTop = el.offsetTop;
        const elHeight = el.offsetHeight;
        const containerHeight = container.clientHeight;
        const targetY = elTop + elHeight / 2 - containerHeight / 2;

        const startY = container.scrollTop;
        const diff = targetY - startY;
        if (Math.abs(diff) < 1) return;

        const startTime = performance.now();
        const duration = 400;
        const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

        const animate = (now: number): void => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            container.scrollTop = startY + diff * easeOutCubic(progress);
            if (progress < 1) requestAnimationFrame(animate);
        };

        requestAnimationFrame(animate);
    }, [currentLineIndex]);

    const goToLine = (index: number): void => {
        const ts = syncedLines[index]?.timestamp_s;
        if (ts !== undefined) {
            rockIt.mediaPlayerManager.setCurrentTime(ts);
        }
    };

    if ($currentMedia?.type === "video") return null;

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

    if (syncedLines.length === 0) {
        return (
            <div className="pip-lyrics-overlay" data-testid="pip-lyrics-empty">
                <p className="text-xs text-neutral-400">No synced lyrics</p>
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
                                if (e.key === "Enter" || e.key === " ")
                                    goToLine(i);
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

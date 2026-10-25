"use client";

import { useEffect, useMemo, useRef, useState, type JSX } from "react";
import type { GetLyricsResponse } from "@/dto";
import { useStore } from "@nanostores/react";
import { usePiPText } from "@/hooks/usePiPText";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";

export function PiPLyrics(): JSX.Element | null {
    const text = usePiPText();
    const $currentMedia = useStore(rockIt.queueManager.currentMediaAtom);
    const $currentTime = useStore(rockIt.mediaPlayerManager.currentTimeAtom);
    const [lyrics, setLyrics] = useState<GetLyricsResponse | undefined>();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLyrics(undefined);
        setLoading(false);
        if ($currentMedia?.type !== "song") return;
        setLoading(true);
        let cancelled = false;

        Http.getLrclibLyricsAsync($currentMedia.publicId)
            .then((response) => {
                if (cancelled) return;
                if (response.isOk()) {
                    setLyrics(response.result);
                }
                setLoading(false);
            })
            .catch((error: unknown): void => {
                if (cancelled) return;
                console.error("PiP lyrics unavailable", error);
                setLoading(false);
            });
        return (): void => {
            cancelled = true;
        };
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

        const reducedMotion = container.ownerDocument.defaultView?.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches;
        container.scrollTo({
            top: Math.max(0, targetY),
            behavior: reducedMotion ? "auto" : "smooth",
        });
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
                <p className="text-xs text-neutral-400">
                    {text(
                        "PIP_NO_LYRICS",
                        "No synced lyrics",
                        "No hay letra sincronizada"
                    )}
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

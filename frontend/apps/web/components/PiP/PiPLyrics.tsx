"use client";

import { useEffect, useMemo, useRef, type JSX } from "react";
import { useStore } from "@nanostores/react";
import type { PiPLyricsState } from "@/models/types/pip";
import { usePiPText } from "@/hooks/usePiPText";
import { rockIt } from "@/lib/rockit/rockIt";

export function PiPLyrics({
    data: lyrics,
    loading,
    glance = false,
}: PiPLyricsState & { glance?: boolean }): JSX.Element | null {
    const text = usePiPText();
    const $currentTime = useStore(rockIt.mediaPlayerManager.currentTimeAtom);
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
        if (glance || !scrollRef.current || currentLineIndex < 0) return;

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
    }, [currentLineIndex, glance]);

    const goToLine = (index: number): void => {
        const ts = syncedLines[index]?.timestamp_s;
        if (ts !== undefined) {
            rockIt.mediaPlayerManager.setCurrentTime(ts);
        }
    };

    if (glance) {
        const line =
            syncedLines[Math.max(0, currentLineIndex)]?.text ??
            lyrics?.lyrics?.[0]?.text;
        const message = loading
            ? text("PIP_LOADING_LYRICS", "Loading lyrics…", "Cargando letra…")
            : (line ??
              text(
                  "PIP_NO_LYRICS",
                  "No synced lyrics",
                  "No hay letra sincronizada"
              ));
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

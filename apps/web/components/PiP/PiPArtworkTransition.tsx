"use client";

import { useState, type JSX, type ReactNode } from "react";
import { shouldKeepVinyl, type TPlayableMedia } from "@rockit/shared";

/** CSS animations belong to the visible PiP document, not the opener's RAF clock. */
export function PiPArtworkTransition({
    media,
    cover,
    direction,
    reducedMotion,
    children,
}: {
    media: TPlayableMedia;
    cover: string;
    direction: 1 | -1;
    reducedMotion: boolean;
    children: (media: TPlayableMedia, cover: string) => ReactNode;
}): JSX.Element {
    const [display, setDisplay] = useState<{
        media: TPlayableMedia;
        cover: string;
        key: number;
        previous: { media: TPlayableMedia; cover: string; key: number } | null;
    }>({ media, cover, key: 0, previous: null });
    let current = display;
    if (display.media !== media || display.cover !== cover) {
        const replace = !shouldKeepVinyl(display.media, media);
        current = {
            media,
            cover,
            key: display.key + (replace ? 1 : 0),
            previous: replace
                ? reducedMotion
                    ? null
                    : {
                          media: display.media,
                          cover: display.cover,
                          key: display.key,
                      }
                : display.previous,
        };
        setDisplay(current);
    }
    if (reducedMotion && current.previous) {
        current = { ...current, previous: null };
        setDisplay(current);
    }
    const outgoing = current.previous;
    const finish = (): void => {
        const key = current.key;
        setDisplay((value) =>
            value.key === key && value.previous
                ? { ...value, previous: null }
                : value
        );
    };
    const movement = direction === 1 ? "forward" : "backward";
    return (
        <div className="relative h-full w-full overflow-hidden">
            {outgoing && (
                <div
                    key={outgoing.key}
                    aria-hidden="true"
                    className={`pip-vinyl-layer pip-vinyl-exit-${movement}`}
                    data-pip-artwork="outgoing"
                >
                    {children(outgoing.media, outgoing.cover)}
                </div>
            )}
            <div
                key={current.key}
                className={`pip-vinyl-layer${outgoing ? ` pip-vinyl-enter-${movement}` : ""}`}
                data-pip-artwork="current"
                onAnimationEnd={(event) => {
                    if (event.target === event.currentTarget) finish();
                }}
            >
                {children(media, cover)}
            </div>
        </div>
    );
}

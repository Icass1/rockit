"use client";

import type { JSX } from "react";

interface PlayerCoverArtProps {
    uri: string | undefined;
    mediaType: string | undefined;
}

function aspectClass(mediaType: string | undefined): string {
    if (mediaType === "video") return "aspect-video rounded-xl";
    if (mediaType === "radio") return "aspect-square rounded-full";
    return "aspect-square rounded-2xl";
}

export default function PlayerCoverArt({
    uri,
    mediaType,
}: PlayerCoverArtProps): JSX.Element {
    return (
        <div
            className={`mx-auto w-full max-w-85 overflow-hidden bg-(--color-surface) shadow-xl ${aspectClass(mediaType)}`}
        >
            {uri ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={uri}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="eager"
                />
            ) : (
                <div className="h-full w-full bg-(--color-surface)" />
            )}
        </div>
    );
}

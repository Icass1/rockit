"use client";

import type { JSX } from "react";
import { useStore } from "@nanostores/react";
import { getMediaArtists } from "@/models/types/media";
import { usePiPText } from "@/hooks/usePiPText";
import { rockIt } from "@/lib/rockit/rockIt";

export function PiPInfo(): JSX.Element {
    const text = usePiPText();
    const media = useStore(rockIt.queueManager.currentMediaAtom);
    const artists =
        getMediaArtists(media)
            ?.map((artist) => artist.name)
            .join(", ") || "";
    return (
        <div className="pip-info">
            <p className="pip-info-song-name" title={media?.name}>
                {media?.name ??
                    text(
                        "PIP_EMPTY",
                        "No media playing",
                        "Nada en reproducción"
                    )}
            </p>
            <p className="pip-info-artist-name" title={artists}>
                {artists}
            </p>
        </div>
    );
}

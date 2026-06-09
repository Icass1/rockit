"use client";

import type { JSX } from "react";
import { useStore } from "@nanostores/react";
import { getMediaArtists } from "@/models/types/media";
import { rockIt } from "@/lib/rockit/rockIt";
import LikeButton from "@/components/LikeButton/LikeButton";
export function PiPInfo(): JSX.Element | null {
    const $currentSong = useStore(
        rockIt.queueManager.currentMediaAtom
    );

    return (
        <div className="pip-info">
            <div className="pip-info-text">
                <p className="pip-info-song-name">
                    {$currentSong?.name ?? "No media playing"}
                </p>
                <p className="pip-info-artist-name">
                    {getMediaArtists($currentSong)
                        ?.map((a: { name: string }): string => a.name)
                        .join(", ") || ""}
                </p>
            </div>
            {$currentSong && (
                <div className="pip-info-like">
                    <LikeButton
                        mediaPublicId={$currentSong.publicId}
                    />
                </div>
            )}
        </div>
    );
}

"use client";

import { useState, type JSX } from "react";
import { useStore } from "@nanostores/react";
import type { BaseSearchResultsItem } from "@rockit/shared";
import { LoaderCircle, Pause, Play } from "lucide-react";
import { rockIt } from "@/lib/rockit/rockIt";

export default function SearchSongPlayButton({
    song,
}: {
    song: BaseSearchResultsItem;
}): JSX.Element | null {
    const vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const currentMedia = useStore(rockIt.queueManager.currentMediaAtom);
    const playing = useStore(rockIt.mediaPlayerManager.playingAtom);
    const [loading, setLoading] = useState(false);
    if (song.type !== "song" || !song.downloaded || !song.publicId) return null;
    const isCurrent = currentMedia?.publicId === song.publicId;
    const isPlaying = isCurrent && playing;
    const label = (
        isPlaying ? vocabulary.PAUSE_SONG_NAME : vocabulary.PLAY_SONG_NAME
    ).replace("{name}", song.name);
    return (
        <button
            type="button"
            aria-label={label}
            title={label}
            aria-busy={loading}
            disabled={loading}
            className="search-song-play absolute inset-0 grid place-items-center rounded-lg bg-black/50 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-wait"
            onClick={async (event): Promise<void> => {
                event.stopPropagation();
                if (loading) return;
                if (isCurrent) {
                    rockIt.mediaPlayerManager.togglePlayPauseOrSetMedia();
                    return;
                }
                setLoading(true);
                try {
                    await rockIt.searchManager.playDownloadedSong(song);
                } finally {
                    setLoading(false);
                }
            }}
        >
            <span className="search-song-play-icon grid size-12 place-items-center">
                {loading ? (
                    <LoaderCircle
                        className="size-9 motion-safe:animate-spin"
                        aria-hidden="true"
                    />
                ) : isPlaying ? (
                    <Pause
                        className="size-9"
                        fill="currentColor"
                        aria-hidden="true"
                    />
                ) : (
                    <Play
                        className="size-9 translate-x-px"
                        fill="currentColor"
                        aria-hidden="true"
                    />
                )}
            </span>
        </button>
    );
}

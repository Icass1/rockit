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
            className="absolute right-2 bottom-2 grid size-11 place-items-center rounded-full bg-white text-black shadow-lg transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-60"
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
            {loading ? (
                <LoaderCircle
                    className="size-5 motion-safe:animate-spin"
                    aria-hidden="true"
                />
            ) : isPlaying ? (
                <Pause
                    className="size-5"
                    fill="currentColor"
                    aria-hidden="true"
                />
            ) : (
                <Play
                    className="size-5 translate-x-px"
                    fill="currentColor"
                    aria-hidden="true"
                />
            )}
        </button>
    );
}

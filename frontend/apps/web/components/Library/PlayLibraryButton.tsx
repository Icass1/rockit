import type { JSX } from "react";
import { useStore } from "@nanostores/react";
import { Pause, Play } from "lucide-react";
import { rockIt } from "@/lib/rockit/rockIt";

export default function PlayLibraryButton(): JSX.Element {
    const loading = useStore(rockIt.libraryPlaybackManager.loadingAtom);
    const $queue = useStore(rockIt.queueManager.queueAtom);
    const $currentQueueMediaId = useStore(
        rockIt.queueManager.currentQueueMediaIdAtom
    );
    const $playing = useStore(rockIt.mediaPlayerManager.playingAtom);

    const playingLibrary = $queue?.find(
        (queueSong): boolean =>
            queueSong.queueMediaId === $currentQueueMediaId &&
            queueSong?.listPublicId === "library"
    )
        ? true
        : false;

    const handleClick = (): void => {
        if (playingLibrary && $playing) rockIt.mediaPlayerManager.pause();
        else if (playingLibrary) rockIt.mediaPlayerManager.play();
        else void rockIt.libraryPlaybackManager.playAsync();
    };

    return (
        <button
            type="button"
            aria-busy={loading}
            onClick={handleClick}
            title="Play library"
            className="h-8 w-8 cursor-pointer rounded-full bg-linear-to-r from-(--color-rockit-pink) to-(--color-rockit-pink-light) shadow-[0px_0px_20px_3px_#0e0e0e] transition-transform md:hover:scale-105"
        >
            {playingLibrary && $playing ? (
                <Pause
                    className="relative top-1/2 left-1/2 h-1/2 w-1/2 -translate-x-1/2 -translate-y-1/2"
                    fill="white"
                />
            ) : (
                <Play
                    className="relative top-1/2 left-1/2 h-1/2 w-1/2 -translate-x-1/2 -translate-y-1/2"
                    fill="white"
                />
            )}
        </button>
    );
}

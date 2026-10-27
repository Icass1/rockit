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
            className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-full bg-linear-to-r from-(--color-rockit-pink) to-(--color-rockit-pink-light) p-0 leading-none shadow-[0px_0px_20px_3px_#0e0e0e] transition-transform md:hover:scale-105"
        >
            {playingLibrary && $playing ? (
                <Pause
                    className="pointer-events-none block h-4 w-4"
                    fill="white"
                />
            ) : (
                <Play
                    className="pointer-events-none block h-4 w-4 translate-x-px"
                    fill="white"
                />
            )}
        </button>
    );
}

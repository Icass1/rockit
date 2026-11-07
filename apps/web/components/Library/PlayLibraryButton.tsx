import type { JSX } from "react";
import { useStore } from "@nanostores/react";
import { Pause, Play } from "lucide-react";
import { rockIt } from "@/lib/rockit/rockIt";
import { useVocabulary } from "@/components/providers/VocabularyProvider";

export default function PlayLibraryButton(): JSX.Element {
    const $vocabulary = useVocabulary();
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
            title={$vocabulary.LIBRARY_PLAY_ALL}
            className="from-primary to-brand-light shadow-player-action grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-full bg-linear-to-r p-0 leading-none transition-transform md:hover:scale-105"
        >
            {playingLibrary && $playing ? (
                <Pause className="fill-on-media pointer-events-none block h-4 w-4" />
            ) : (
                <Play className="fill-on-media pointer-events-none block h-4 w-4 translate-x-px" />
            )}
        </button>
    );
}

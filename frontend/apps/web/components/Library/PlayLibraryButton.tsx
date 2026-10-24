import { useRef, useState, type JSX } from "react";
import { useStore } from "@nanostores/react";
import type { TPlayableMedia } from "@rockit/shared";
import { Pause, Play } from "lucide-react";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";
import { expandPlaylistsToPlayable } from "@/lib/services/mediaService";

export default function PlayLibraryButton(): JSX.Element {
    const busy = useRef(false);
    const [loading, setLoading] = useState(false);
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

    const handleClick = async (): Promise<void> => {
        if (playingLibrary && $playing) {
            rockIt.mediaPlayerManager.pause();
        } else if (playingLibrary) {
            rockIt.mediaPlayerManager.play();
        } else {
            if (busy.current) return;
            busy.current = true;
            setLoading(true);
            try {
                const previousQueue = rockIt.queueManager.queueIdentity;
                const res = await Http.getUserLibraryMedias();
                if (rockIt.queueManager.queueIdentity !== previousQueue) return;
                if (!res.isOk()) throw new Error(res.message);
                const initial = [
                    ...res.result.songs.map((s) => s.item),
                    ...res.result.videos.map((v) => v.item),
                ];
                let ownedQueue = rockIt.queueManager.queueIdentity;
                const start = (media: TPlayableMedia[]): void => {
                    rockIt.queueManager.setMedia(media, "library");
                    ownedQueue = rockIt.queueManager.queueIdentity;
                    // Respect the selected sorted/random playback mode.
                    rockIt.queueManager.setQueueMediaId();
                    rockIt.mediaPlayerManager.play();
                };
                let started = initial.length > 0;
                if (started) start(initial);
                const collections = [
                    ...res.result.albums.map((a) => a.item),
                    ...res.result.playlists.map((p) => p.item),
                ];
                // Resolve small batches; start even an album-only library before
                // waiting for all collections. Never replace a new user queue.
                for (let offset = 0; offset < collections.length; offset += 4) {
                    if (rockIt.queueManager.queueIdentity !== ownedQueue)
                        return;
                    const batch = collections.slice(offset, offset + 4);
                    const media = await expandPlaylistsToPlayable(batch);
                    if (rockIt.queueManager.queueIdentity !== ownedQueue)
                        return;
                    if (!started && media.length) {
                        start(media);
                        started = true;
                    } else if (started) {
                        rockIt.queueManager.appendMedias(media, "library");
                    }
                }
            } catch (error) {
                rockIt.notificationManager.notifyError(
                    error instanceof Error ? error.message : String(error)
                );
            } finally {
                busy.current = false;
                setLoading(false);
            }
        }
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

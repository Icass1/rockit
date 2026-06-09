import type { JSX } from "react";
import { useStore } from "@nanostores/react";
import { Pause, Play } from "lucide-react";
import { rockIt } from "@/lib/rockit/rockIt";
import { Http } from "@/lib/http";
import {
    expandAlbumsToPlayable,
    expandPlaylistsToPlayable,
} from "@/lib/services/mediaService";

export default function PlayLibraryButton(): JSX.Element {
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
            const res = await Http.getUserLibraryMedias();
            if (res.isOk()) {
                const songs = res.result.songs ?? [];
                const videos = res.result.videos ?? [];
                const albumSongs = await expandAlbumsToPlayable(
                    res.result.albums ?? []
                );
                const playlistSongs = await expandPlaylistsToPlayable(
                    res.result.playlists ?? []
                );
                const allMedia = [
                    ...songs,
                    ...videos,
                    ...albumSongs,
                    ...playlistSongs,
                ];
                if (allMedia.length === 0) return;
                rockIt.queueManager.setMedia(allMedia, "library");
                rockIt.queueManager.setQueueMediaId(0);
                rockIt.mediaPlayerManager.play();
            }
        }
    };

    return (
        <div
            onClick={handleClick}
            title="Play library"
            className="h-8 w-8 cursor-pointer rounded-full bg-linear-to-r from-[#ee1086] to-[#fb6467] shadow-[0px_0px_20px_3px_#0e0e0e] transition-transform md:hover:scale-105"
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
        </div>
    );
}

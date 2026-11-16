import { useEffect } from "react";
import {
    BaseSongWithAlbumResponse,
    EEvent,
    EventManager,
} from "@rockit/shared";
import { useAsyncResource } from "@rockit/ui/headless/useAsyncResource";
import { listOfflineLibrarySongs } from "@/lib/storage/offlineLibrary";

export function useOfflineLibrarySongs(
    songs: BaseSongWithAlbumResponse[],
    enabled: boolean
) {
    const resource = useAsyncResource(
        () => listOfflineLibrarySongs(songs),
        JSON.stringify(songs.map((song) => song.publicId)),
        enabled
    );
    const { refresh } = resource;
    useEffect(() => {
        if (!enabled) return;
        const refreshDownloaded = () => {
            void refresh();
        };
        const events = EventManager.getInstance();
        events.addEventListener(EEvent.MediaDownloaded, refreshDownloaded);
        return () =>
            events.removeEventListener(
                EEvent.MediaDownloaded,
                refreshDownloaded
            );
    }, [enabled, refresh]);
    return resource;
}

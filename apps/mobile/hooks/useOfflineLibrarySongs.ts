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
        const refresh = () => {
            void refresh();
        };
        const events = EventManager.getInstance();
        events.addEventListener(EEvent.MediaDownloaded, refresh);
        return () =>
            events.removeEventListener(EEvent.MediaDownloaded, refresh);
    }, [enabled, refresh]);
    return resource;
}

import { useEffect, useState } from "react";
import {
    EEvent,
    EventManager,
    type IMediaDownloadedEvent,
} from "@rockit/shared";
import { mediaStorage } from "@/lib/storage/mediaStorage";

/** Resolve the persisted cover, including after an offline save in this session. */
export function useOfflineArtwork(
    publicId?: string,
    remote?: string | null
): string | undefined {
    const [local, setLocal] = useState<{ publicId: string; uri: string }>();
    useEffect(() => {
        if (!publicId) return;
        let cancelled = false;
        const refresh = () =>
            void mediaStorage
                .getImageUri(publicId)
                .then((uri) => {
                    if (!cancelled)
                        setLocal(uri ? { publicId, uri } : undefined);
                })
                .catch(() => {});
        const onDownload = (event: IMediaDownloadedEvent) => {
            if (event.publicId === publicId) refresh();
        };
        refresh();
        const events = EventManager.getInstance();
        events.addEventListener(EEvent.MediaDownloaded, onDownload);
        return () => {
            cancelled = true;
            events.removeEventListener(EEvent.MediaDownloaded, onDownload);
        };
    }, [publicId]);
    return local?.publicId === publicId ? local.uri : (remote ?? undefined);
}

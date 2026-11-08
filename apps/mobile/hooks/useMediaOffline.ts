import { useEffect, useState } from "react";
import {
    EEvent,
    EventManager,
    type IMediaDownloadedEvent,
} from "@rockit/shared";
import { mediaStorage } from "@/lib/storage/mediaStorage";

/** Check an index/file entry, not a playable Blob URL for every visible row. */
export function useMediaOffline(publicId: string): boolean | undefined {
    const [snapshot, setSnapshot] = useState<{
        publicId: string;
        available: boolean;
    }>();
    useEffect(() => {
        let cancelled = false;
        const refresh = () => {
            void mediaStorage
                .hasMedia(publicId)
                .then((available) => {
                    if (!cancelled) setSnapshot({ publicId, available });
                })
                .catch(() => {
                    if (!cancelled) setSnapshot({ publicId, available: false });
                });
        };
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
    return snapshot?.publicId === publicId ? snapshot.available : undefined;
}

import { useEffect, useState } from "react";
import {
    EEvent,
    EventManager,
    type IMediaDownloadedEvent,
} from "@rockit/shared";
import { mediaStorage } from "@/lib/storage/mediaStorage";

export function useMediaOffline(publicId: string): boolean {
    const [isOffline, setIsOffline] = useState(false);

    useEffect(() => {
        let cancelled = false;

        mediaStorage.getSongUri(publicId).then((uri) => {
            if (!cancelled) setIsOffline(uri !== null);
        });

        return () => {
            cancelled = true;
        };
    }, [publicId]);

    useEffect(() => {
        const handler = (data: IMediaDownloadedEvent) => {
            if (data.publicId === publicId) {
                setIsOffline(true);
            }
        };

        const eventManager = EventManager.getInstance();
        eventManager.addEventListener(EEvent.MediaDownloaded, handler);

        return () => {
            eventManager.removeEventListener(EEvent.MediaDownloaded, handler);
        };
    }, [publicId]);

    return isOffline;
}

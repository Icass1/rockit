import { useEffect, useState } from "react";
import {
    EEvent,
    EventManager,
    type IMediaDownloadedEvent,
} from "@rockit/shared";
import { mediaStorage } from "@/lib/storage/mediaStorage";

export function useMediaOffline(publicId: string): boolean | undefined {
    const [isOffline, setIsOffline] = useState<boolean | undefined>(undefined);

    useEffect(() => {
        let cancelled = false;

        Promise.all([
            mediaStorage.getSongUri(publicId),
            mediaStorage.getVideoUri(publicId),
        ]).then(([songUri, videoUri]) => {
            if (!cancelled) setIsOffline(!!songUri || !!videoUri);
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

import { useEffect, useState } from "react";
import {
    EEvent,
    EventManager,
    MediaResponseSchema,
    type IMediaDownloadedEvent,
    type TMedia,
} from "@rockit/shared";
import { apiGet } from "@/lib/api";

export function useMedia<T extends TMedia>(media: T): T {
    const [_media, setMedia] = useState<T>(media);

    useEffect(() => {
        setMedia(media);
    }, [media]);

    useEffect(() => {
        const handleDownloaded = (data: IMediaDownloadedEvent) => {
            if (data.publicId !== media.publicId) return;

            apiGet(`/media/${media.publicId}`, MediaResponseSchema)
                .then((result) => {
                    if (result.type === media.type) {
                        setMedia(result as T);
                    }
                })
                .catch((err) =>
                    console.error("useMedia: error refreshing media", err)
                );
        };

        const eventManager = EventManager.getInstance();
        eventManager.addEventListener(EEvent.MediaDownloaded, handleDownloaded);
        return () => {
            eventManager.removeEventListener(
                EEvent.MediaDownloaded,
                handleDownloaded
            );
        };
    }, [media.publicId, media.type]);

    return _media;
}

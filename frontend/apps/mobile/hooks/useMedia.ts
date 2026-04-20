import { useEffect, useState } from "react";
import {
    EEvent,
    EventManager,
    MediaResponseSchema,
    type IMediaDownloadedEvent,
    type TMedia,
} from "@rockit/shared";
import { apiFetch } from "@/lib/api";

export function useMedia<T extends TMedia>(media: T): T {
    const [_media, setMedia] = useState<T>(media);

    useEffect(() => {
        setMedia(media);
    }, [media]);

    useEffect(() => {
        const handleDownloaded = (data: IMediaDownloadedEvent) => {
            if (data.publicId !== media.publicId) return;

            apiFetch(`/media/${media.publicId}`, MediaResponseSchema)
                .then((response) => {
                    if (response.isOk()) {
                        if (response.result.type === media.type) {
                            setMedia(response.result as T);
                        }
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

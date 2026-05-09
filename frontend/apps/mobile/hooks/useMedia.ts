import { useEffect, useState } from "react";
import {
    EEvent,
    EventManager,
    Http,
    type IMediaDownloadedEvent,
    type TMedia,
} from "@rockit/shared";

export function useMedia<T extends TMedia>(media: T): T {
    const [_media, setMedia] = useState<T>(media);

    useEffect(() => {
        setMedia(media);
    }, [media]);

    useEffect(() => {
        const handleDownloaded = (data: IMediaDownloadedEvent) => {
            if (data.publicId !== media.publicId) return;

            Http.getMedia(media.publicId)
                .then((response) => {
                    if (response.isOk()) {
                        const resultMedia = response.result.media;
                        if (resultMedia.type === media.type) {
                            setMedia(resultMedia as T);
                        }
                    }
                })
                .catch((err: Error) =>
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

import { useEffect, useState } from "react";
import { EEvent } from "@/models/enums/events";
import { IMediaDownloadedEvent } from "@/models/interfaces/events/mediaDownloaded";
import { isSearchResult, TMedia } from "@/models/types/media";
import { rockIt } from "@/lib/rockit/rockIt";

export default function useMedia<T extends TMedia>(media: T) {
    const [_media, setMedia] = useState<T>(media);

    useEffect(() => {
        if (isSearchResult(media)) return;

        const handleDownloaded = (data: IMediaDownloadedEvent) => {
            if (data.publicId != media.publicId) {
                return;
            }

            rockIt.mediaManager.getMedia(data.publicId).then((data) => {
                if (data.isOk()) {
                    if (data.result.type === media.type)
                        setMedia(data.result as T);
                } else {
                    console.error(
                        "Error gettting media",
                        data.message,
                        data.detail
                    );
                }
            });
        };

        rockIt.eventManager.addEventListener(
            EEvent.MediaDownloaded,
            handleDownloaded
        );
        return () => {
            rockIt.eventManager.removeEventListener(
                EEvent.MediaDownloaded,
                handleDownloaded
            );
        };
    }, [media]);

    return _media;
}

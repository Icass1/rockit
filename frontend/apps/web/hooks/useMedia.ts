import { useEffect, useState } from "react";
import { EEvent } from "@/models/enums/events";
import { IMediaDownloadedEvent } from "@/models/interfaces/events/mediaDownloaded";
import { isSearchResult, TMedia } from "@/models/types/media";
import { rockIt } from "@/lib/rockit/rockIt";

export default function useMedia<T extends TMedia>(media: T): T {
    const [_media, setMedia] = useState<T>(media);

    useEffect((): (() => void) | undefined => {
        if (isSearchResult(media)) return;

        const handleDownloaded = (data: IMediaDownloadedEvent): void => {
            if (data.publicId !== media.publicId) {
                return;
            }

            rockIt.mediaManager.getMedia(data.publicId).then((data): void => {
                if (data.isOk()) {
                    if (data.result.media.type === media.type)
                        setMedia(data.result.media as T);
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
        return (): void => {
            rockIt.eventManager.removeEventListener(
                EEvent.MediaDownloaded,
                handleDownloaded
            );
        };
    }, [media]);

    return _media;
}

import { useEffect, useState } from "react";
import { MediaResponseSchema } from "@/dto";
import { EEvent } from "@/models/enums/events";
import { IMediaDownloadedEvent } from "@/models/interfaces/events/mediaDownloaded";
import { TMedia } from "@/models/types/media";
import { rockIt } from "@/lib/rockit/rockIt";
import { apiFetch } from "@/lib/utils/apiFetch";

export default function useMedia<T extends TMedia>(media: T) {
    const [_media, setMedia] = useState<T>(media);

    useEffect(() => {
        const handleDownloaded = (data: IMediaDownloadedEvent) => {
            if (data.publicId != media.publicId) {
                return;
            }
            apiFetch(`/media/${data.publicId}`, MediaResponseSchema).then(
                (data) => {
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
                }
            );
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

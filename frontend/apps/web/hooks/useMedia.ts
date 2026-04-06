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
                console.error("This should never happen", data, media);
                return;
            }
            apiFetch(`/media/${data.publicId}`, MediaResponseSchema).then(
                (data) => {
                    if (data.type === media.type) setMedia(data as T);
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
    }, [media.publicId, media.type]);

    return _media;
}

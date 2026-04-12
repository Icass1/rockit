import { useEffect, useState } from "react";
import {
    EWebSocketMessage,
    MediaResponseSchema,
    type TMedia,
} from "@rockit/shared";
import type { DownloadProgressMessage } from "@rockit/shared";
import { apiGet } from "@/lib/api";
import { webSocketManager } from "@/lib/webSocketManager";

export function useMedia<T extends TMedia>(media: T): T {
    const [_media, setMedia] = useState<T>(media);

    useEffect(() => {
        setMedia(media);
    }, [media]);

    useEffect(() => {
        const handleDownloadProgress = (data: DownloadProgressMessage) => {
            if (data.publicId !== media.publicId) return;
            if ((data.progress ?? 0) < 100) return;

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

        webSocketManager.onMessage(
            EWebSocketMessage.DownloadProgress,
            handleDownloadProgress
        );
        return () => {
            webSocketManager.offMessage(
                EWebSocketMessage.DownloadProgress,
                handleDownloadProgress
            );
        };
    }, [media.publicId, media.type]);

    return _media;
}

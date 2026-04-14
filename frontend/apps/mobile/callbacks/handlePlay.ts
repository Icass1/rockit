import { useCallback } from "react";
import {
    isQueueable,
    TMedia,
    TPlayableMedia,
    TQueueMedia,
} from "@rockit/shared";
import { usePlayer } from "@/lib/PlayerContext";

export default function useHandlePlay(
    media: TPlayableMedia,
    allMedia: TMedia[]
) {
    const { playMedia } = usePlayer();

    const handlePlay = useCallback(() => {
        if (!allMedia || allMedia.length === 0) return;
        const queueMedia = allMedia.filter(isQueueable);
        if (queueMedia.length === 0) return;
        playMedia(media as TQueueMedia, queueMedia);
    }, [media, allMedia, playMedia]);

    return handlePlay;
}

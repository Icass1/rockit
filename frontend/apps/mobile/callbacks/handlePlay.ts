import { useCallback } from "react";
import {
    isQueueable,
    TMedia,
    TPlayableMedia,
    TQueueMedia,
} from "@rockit/shared";
import { usePlayer } from "@/lib/PlayerContext";

export default function useHandlePlay() {
    const { playMedia } = usePlayer();

    const handlePlay = useCallback(
        (media: TPlayableMedia, allMedia: TMedia[]) => {
            if (!allMedia || allMedia.length === 0) return;
            const queueMedia = allMedia.filter(isQueueable);
            if (queueMedia.length === 0) return;
            playMedia(media as TQueueMedia, queueMedia);
        },
        [playMedia]
    );

    return handlePlay;
}

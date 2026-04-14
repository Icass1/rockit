import { useCallback } from "react";
import type { TMedia, TQueueMedia } from "@rockit/shared";
import {
    LikedMediaResponseSchema,
    LikeMediaRequestSchema,
} from "@rockit/shared";
import { Share } from "react-native";
import { apiPost, BACKEND_URL } from "@/lib/api";
import { ContextMenuOption, useContextMenu } from "@/lib/ContextMenuContext";
import { usePlayer } from "@/lib/PlayerContext";

export default function useFullMediaOptions(
    media: TMedia,
    allMedia: TMedia[] = [],
    showPlayOption: boolean = true
) {
    const options: ContextMenuOption[] = [];
    const { playNext, addToQueueEnd, addToQueueNext, playMedia, shuffle } =
        usePlayer();
    const { hide } = useContextMenu();

    const queueMedia: TQueueMedia[] = allMedia.filter(
        (m): m is TQueueMedia => m.type === "song" || m.type === "video"
    );

    const isPlayable = media.type === "song" || media.type === "video";

    const playableAsQueueMedia = isPlayable ? (media as TQueueMedia) : null;

    const handlePlay = useCallback(() => {
        if (!isPlayable) return;
        if (!allMedia || allMedia.length === 0) return;
        if (!playableAsQueueMedia) return;
        const queueMediaItems = allMedia.filter(
            (m): m is TQueueMedia => m.type === "song" || m.type === "video"
        );
        if (queueMediaItems.length === 0) return;
        playMedia(playableAsQueueMedia, queueMediaItems);
    }, [isPlayable, playableAsQueueMedia, allMedia, playMedia]);

    const handlePlayNext = useCallback(async () => {
        if (!isPlayable || queueMedia.length === 0 || !playableAsQueueMedia)
            return;
        if (shuffle) {
            const randomIdx = Math.floor(Math.random() * queueMedia.length);
            const shuffled = [queueMedia[randomIdx]];
            const rest = queueMedia.filter((_, i) => i !== randomIdx);
            await playNext(playableAsQueueMedia, [...shuffled, ...rest]);
        } else {
            addToQueueNext(playableAsQueueMedia);
        }
    }, [
        isPlayable,
        queueMedia,
        shuffle,
        playNext,
        addToQueueNext,
        playableAsQueueMedia,
    ]);

    const handleAddToQueueEnd = useCallback(() => {
        if (!isPlayable || queueMedia.length === 0) return;
        addToQueueEnd(queueMedia);
    }, [isPlayable, queueMedia, addToQueueEnd]);

    const handleShufflePlay = useCallback(async () => {
        if (!isPlayable || queueMedia.length === 0 || !playableAsQueueMedia)
            return;

        const shuffled = [...queueMedia];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        const randomIdx = Math.floor(Math.random() * shuffled.length);
        const first = shuffled[randomIdx];
        const rest = shuffled.filter((_, i) => i !== randomIdx);
        await playMedia(first, [first, ...rest]);
    }, [isPlayable, queueMedia, playMedia, playableAsQueueMedia]);

    const handleToggleLike = useCallback(async () => {
        try {
            await apiPost(
                "/user/like/media",
                LikeMediaRequestSchema,
                { publicIds: [media.publicId] },
                LikedMediaResponseSchema
            );
        } catch (error) {
            console.error("Error toggling like:", error);
        }
    }, [media.publicId]);

    const handleAddToPlaylist = useCallback(async () => {
        try {
            const url =
                media.providerUrl || `${BACKEND_URL}/media/${media.publicId}`;
            await fetch(
                `${BACKEND_URL}/media/url/add?url=${encodeURIComponent(url)}`,
                {
                    method: "POST",
                    credentials: "include",
                }
            );
        } catch (error) {
            console.error("Error adding to playlist:", error);
        }
    }, [media]);

    const handleShare = useCallback(async () => {
        try {
            const url =
                media.providerUrl || `${BACKEND_URL}/media/${media.publicId}`;
            const title = media.name;
            await Share.share({
                message: `Check out "${title}" on RockIt: ${url}`,
                title: title,
                url: url,
            });
        } catch (error) {
            console.error("Error sharing:", error);
        }
    }, [media]);

    const handleShowInfo = useCallback(() => {
        hide();
    }, [hide]);

    if (showPlayOption && isPlayable) {
        options.push({
            label: "Play",
            icon: "play",
            onPress: handlePlay,
        });

        options.push({
            label: "Play next",
            icon: "plus-circle",
            onPress: handlePlayNext,
        });

        options.push({
            label: "Add to queue",
            icon: "plus-square",
            onPress: handleAddToQueueEnd,
        });

        options.push({
            label: "Shuffle play",
            icon: "shuffle",
            onPress: handleShufflePlay,
        });
    }

    if (isPlayable) {
        options.push({
            label: "Add to playlist",
            icon: "list",
            onPress: handleAddToPlaylist,
        });

        options.push({
            label: "Share",
            icon: "share-2",
            onPress: handleShare,
        });

        options.push({
            label: "More info",
            icon: "info",
            onPress: handleShowInfo,
        });

        options.push({
            label: "Remove from library",
            icon: "trash-2",
            onPress: handleToggleLike,
            destructive: true,
        });
    }

    return options;
}

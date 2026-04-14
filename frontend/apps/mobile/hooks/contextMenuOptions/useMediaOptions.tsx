import { useCallback } from "react";
import {
    LikedMediaResponseSchema,
    LikeMediaRequestSchema,
} from "@rockit/shared";
import type { TMedia } from "@rockit/shared";
import { apiPost } from "@/lib/api";
import { ContextMenuOption } from "@/lib/ContextMenuContext";
import { useVocabulary } from "@/lib/vocabulary";

export default function useBaseMediaOptions(media: TMedia) {
    const options: ContextMenuOption[] = [];
    const { vocabulary } = useVocabulary();

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

    options.push({
        label: vocabulary.REMOVE_FROM_LIBRARY,
        icon: "trash",
        onPress: handleToggleLike,
    });

    return options;
}

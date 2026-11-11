"use client";

import { useSyncExternalStore, type JSX } from "react";
import { useStore } from "@nanostores/react";
import { RockitLikeButton } from "@rockit/ui";
import { rockIt } from "@/lib/rockit/rockIt";
import { useVocabulary } from "@/components/providers/VocabularyProvider";

const subscribe = (): (() => void) => () => {};
export default function LikeButton({
    mediaPublicId,
    isLiked = false,
}: {
    mediaPublicId: string;
    isLiked?: boolean;
}): JSX.Element {
    const liked = useStore(rockIt.mediaManager.likedMediaAtom);
    const mounted = useSyncExternalStore(
        subscribe,
        () => true,
        () => false
    );
    const selected = mounted ? liked.includes(mediaPublicId) : isLiked;
    const vocabulary = useVocabulary();
    return (
        <RockitLikeButton
            key={mediaPublicId}
            liked={selected}
            label={selected ? vocabulary.PIP_UNLIKE : vocabulary.PIP_LIKE}
            onPress={() =>
                void rockIt.mediaManager.toggleLikeMedia(mediaPublicId)
            }
        />
    );
}

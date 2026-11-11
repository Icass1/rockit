import { useStore } from "@nanostores/react";
import { RockitLikeButton } from "@rockit/ui";
import { rockIt } from "@/lib/rockit/rockIt";
import { useVocabulary } from "@/lib/vocabulary";

export default function MobileLikeButton({
    mediaPublicId,
}: {
    mediaPublicId: string;
}) {
    const liked = useStore(rockIt.mediaManager.likedMediaAtom).includes(
        mediaPublicId
    );
    const { vocabulary } = useVocabulary();
    return (
        <RockitLikeButton
            key={mediaPublicId}
            liked={liked}
            label={liked ? vocabulary.PIP_UNLIKE : vocabulary.PIP_LIKE}
            onPress={() =>
                void rockIt.mediaManager.toggleLikeMedia(mediaPublicId)
            }
        />
    );
}

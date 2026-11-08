import { isList, isPlayable, type TMedia } from "@rockit/shared";
import { Text } from "react-native";
import { useMedia } from "@/hooks/useMedia";
import { useVocabulary } from "@/lib/vocabulary";
import { ListMedia } from "@/components/RenderList/ListMedia";
import { PlayableMedia } from "@/components/RenderList/PlayableMedia";

export function Media({
    index,
    media,
    allMedia,
    substractArtists = [],
    showMediaIndex,
    showMediaImage,
    listPublicId,
    expandedByMediaId,
    onToggle,
}: {
    index: number;
    media: TMedia;
    allMedia: TMedia[];
    substractArtists?: string[];
    showMediaIndex: boolean;
    showMediaImage: boolean;
    listPublicId?: string;
    expandedByMediaId?: Record<string, boolean>;
    onToggle?: () => void;
}) {
    const { vocabulary } = useVocabulary();
    const $media = useMedia(media);

    if (isPlayable($media)) {
        return (
            <PlayableMedia
                index={index}
                media={$media}
                allMedia={allMedia}
                substractArtists={substractArtists}
                showMediaIndex={showMediaIndex}
                showMediaImage={showMediaImage}
                listPublicId={listPublicId}
            />
        );
    } else if (isList($media)) {
        return (
            <ListMedia
                media={$media}
                allMedia={allMedia}
                substractArtists={substractArtists}
                listPublicId={listPublicId}
                onToggle={onToggle}
                expanded={expandedByMediaId?.[media.publicId] ?? false}
            />
        );
    }
    return <Text>{vocabulary.MOBILE_UNSUPPORTED_MEDIA}</Text>;
}

import { isPlayable, type TMedia } from "@rockit/shared";
import { Text } from "react-native";
import { useMedia } from "@/hooks/useMedia";
import { PlayableMedia } from "./PlayableMedia";

export function Media({
    index,
    media,
    allMedia,
    substractArtists = [],
    showMediaIndex,
    showMediaImage,
}: {
    index: number;
    media: TMedia;
    allMedia: TMedia[];
    substractArtists?: string[];
    showMediaIndex: boolean;
    showMediaImage: boolean;
}) {
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
            />
        );
    }

    return <Text>Unsupported media type</Text>;
}

import { isPlayable, TMedia } from "@/models/types/media";
import useMedia from "@/hooks/useMedia";
import { PlayableMedia } from "@/components/RenderList/PlayableMedia";

export function Media({
    index,
    media,
    substractArtists = [],
    showMediaIndex,
    showMediaImage,
}: {
    index: number;
    media: TMedia;
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
                substractArtists={substractArtists}
                showMediaIndex={showMediaIndex}
                showMediaImage={showMediaImage}
            ></PlayableMedia>
        );
    }
    return <div>Unsupported media type</div>;
}

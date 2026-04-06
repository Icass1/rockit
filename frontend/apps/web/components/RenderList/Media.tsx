import { isPlayable, TMedia } from "@/models/types/media";
import useMedia from "@/hooks/useMedia";
import { PlayableMedia } from "@/components/RenderList/PlayableMedia";

export function Media({
    index,
    media,
    allMedia,
    substractArtists = [],
    showMediaIndex,
    showMediaImage,
    listPublicId,
}: {
    index: number;
    media: TMedia;
    allMedia?: TMedia[];
    substractArtists?: string[];
    showMediaIndex: boolean;
    showMediaImage: boolean;
    listPublicId?: string;
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
                listPublicId={listPublicId}
            ></PlayableMedia>
        );
    }
    return <div>Unsupported media type</div>;
}

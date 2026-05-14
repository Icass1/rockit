import type { JSX } from "react";
import { isList, isPlayable, TMedia } from "@/models/types/media";
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
}: {
    index: number;
    media: TMedia;
    allMedia?: TMedia[];
    substractArtists?: string[];
    showMediaIndex: boolean;
    showMediaImage: boolean;
    listPublicId?: string;
}): JSX.Element {
    if (isPlayable(media)) {
        return (
            <PlayableMedia
                index={index}
                media={media}
                allMedia={allMedia}
                substractArtists={substractArtists}
                showMediaIndex={showMediaIndex}
                showMediaImage={showMediaImage}
                listPublicId={listPublicId}
            />
        );
    } else if (isList(media)) {
        return (
            <ListMedia
                media={media}
                allMedia={allMedia}
                substractArtists={substractArtists}
                listPublicId={listPublicId}
            />
        );
    }
    return <div>Unsupported media type</div>;
}

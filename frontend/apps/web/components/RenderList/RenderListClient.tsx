"use client";

import {
    BaseArtistResponse,
    BaseSongWithAlbumResponse,
    BaseSongWithAlbumResponseSchema,
    BaseVideoResponse,
    BaseVideoResponseSchema,
} from "@/dto";
import { rockIt } from "@/lib/rockit/rockIt";
import { apiFetch } from "@/lib/utils/apiFetch";
import DropOverlay from "@/components/DropOverlay/DropOverlay";
import RenderList from "@/components/RenderList/RenderList";

export default function RenderListClient({
    playlistPublicId,
    title,
    artists,
    image,
    media,
    showMediaIndex,
    showMediaImage,
}: {
    playlistPublicId?: string;
    title: string;
    artists: BaseArtistResponse[];
    image: string;
    media: (BaseSongWithAlbumResponse | BaseVideoResponse)[];
    showMediaIndex: boolean;
    showMediaImage: boolean;
}) {
    const handleLinkDrop = (url: string) => {
        const query = playlistPublicId
            ? `?url=${url}&playlist_public_id=${playlistPublicId}`
            : `?url=${url}`;

        apiFetch(
            `/media/url/add${query}`,
            BaseSongWithAlbumResponseSchema.or(BaseVideoResponseSchema)
        )
            .then(() => {
                rockIt.notificationManager.notifyInfo(
                    "Media added successfully!"
                );
                // window.location.reload();
            })
            .catch(() => {
                rockIt.notificationManager.notifyError("Failed to add media.");
            });
    };

    return (
        <>
            <DropOverlay onDropLink={handleLinkDrop} />
            <RenderList
                title={title}
                artists={artists}
                image={image}
                media={media}
                showMediaIndex={showMediaIndex}
                showMediaImage={showMediaImage}
            />
        </>
    );
}

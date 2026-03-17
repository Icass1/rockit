"use client";

import { z } from "zod";
import {
    BaseArtistResponse,
    BaseSongWithAlbumResponse,
    BaseSongWithAlbumResponseSchema,
    BaseVideoResponse,
    BaseVideoResponseSchema,
} from "@/packages/dto";
import { rockIt } from "@/packages/lib/rockit/rockIt";
import { apiFetch } from "@/packages/lib/utils/apiFetch";
import DropOverlay from "@/components/DropOverlay";
import RenderList from "@/components/RenderList/RenderList";

const BaseSongOrVideoResponseSchema = z.discriminatedUnion("type", [
    BaseSongWithAlbumResponseSchema,
    BaseVideoResponseSchema,
]);

export default function RenderListClient({
    playlistPublicId,
    title,
    artists,
    image,
    imageBlur,
    media,
    showMediaIndex,
    showMediaImage,
}: {
    playlistPublicId?: string;
    title: string;
    artists: BaseArtistResponse[];
    image: string;
    imageBlur?: string;
    media: (BaseSongWithAlbumResponse | BaseVideoResponse)[];
    showMediaIndex: boolean;
    showMediaImage: boolean;
}) {
    const handleLinkDrop = (url: string) => {
        const query = playlistPublicId
            ? `?url=${url}&playlist_public_id=${playlistPublicId}`
            : `?url=${url}`;

        apiFetch(`/media/url/add${query}`, BaseSongOrVideoResponseSchema)
            .then(() => {
                rockIt.notificationManager.notifyInfo(
                    "Media added successfully!"
                );
                window.location.reload();
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
                imageBlur={imageBlur}
                media={media}
                showMediaIndex={showMediaIndex}
                showMediaImage={showMediaImage}
            />
        </>
    );
}

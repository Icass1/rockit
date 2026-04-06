"use client";

import { useEffect, useState } from "react";
import { BaseArtistResponse, MediaResponseSchema } from "@/dto";
import { MediaResponse } from "@rockit/packages/dto";
import { EEvent } from "@/models/enums/events";
import { IMediaAddedToPlaylistEvent } from "@/models/interfaces/events/mediaAddedToPlaylist";
import { TMedia } from "@/models/types/media";
import { rockIt } from "@/lib/rockit/rockIt";
import { apiFetch } from "@/lib/utils/apiFetch";
import DropOverlay from "@/components/DropOverlay/DropOverlay";
import RenderList from "@/components/RenderList/RenderList";

export default function RenderListClient({
    playlistPublicId,
    title,
    artists,
    image,
    media: initialMedia,
    showMediaIndex,
    showMediaImage,
}: {
    playlistPublicId?: string;
    title: string;
    artists: BaseArtistResponse[];
    image: string;
    media: TMedia[];
    showMediaIndex: boolean;
    showMediaImage: boolean;
}) {
    const [media, setMedia] = useState(initialMedia);

    useEffect(() => {
        setMedia(initialMedia);
    }, [initialMedia]);

    useEffect(() => {
        if (!playlistPublicId) return;

        const handleMediaAdded = (data: IMediaAddedToPlaylistEvent) => {
            apiFetch(`/media/${data.publicId}`, MediaResponseSchema).then(
                (data) => {
                    setMedia((prev) => [...prev, data]);
                }
            );
        };

        rockIt.eventManager.addEventListener(
            EEvent.MediaAddedToPlaylist,
            handleMediaAdded
        );

        return () => {
            rockIt.eventManager.removeEventListener(
                EEvent.MediaAddedToPlaylist,
                handleMediaAdded
            );
        };
    }, [playlistPublicId]);

    const handleLinkDrop = (url: string) => {
        rockIt.playlistManager.addMediaToPlaylistAsync(url, playlistPublicId);
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
                listPublicId={playlistPublicId}
            />
        </>
    );
}

"use client";

import { useEffect, useState } from "react";
import { BaseArtistResponse } from "@/dto";
import { EMediaType, Http, TMedia } from "@rockit/packages/shared";
import { EEvent } from "@/models/enums/events";
import { IMediaAddedToPlaylistEvent } from "@/models/interfaces/events/mediaAddedToPlaylist";
import { rockIt } from "@/lib/rockit/rockIt";
import DropOverlay from "@/components/DropOverlay/DropOverlay";
import RenderList from "@/components/RenderList/RenderList";

export default function RenderListClient({
    publicId,
    title,
    artists,
    type,
    image,
    media: initialMedia,
    showMediaIndex,
    showMediaImage,
}: {
    publicId?: string;
    type: EMediaType;
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
        if (!publicId) return;
        if (type !== EMediaType.Playlist) return;

        const handleMediaAdded = (data: IMediaAddedToPlaylistEvent) => {
            Http.getMedia(data.publicId).then((data) => {
                if (data.isOk())
                    setMedia((prev) => [...prev, data.result.media]);
                else {
                    console.error(
                        "Failed to fetch media data for added media:",
                        data.message,
                        data.detail
                    );
                }
            });
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
    }, [publicId, type]);

    const handleLinkDrop = (url: string) => {
        if (type == EMediaType.Playlist)
            rockIt.playlistManager.addUrlToPlaylistAsync(url, publicId);
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
                listPublicId={publicId}
            />
        </>
    );
}

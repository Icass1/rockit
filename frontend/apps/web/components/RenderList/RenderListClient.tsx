"use client";

import { JSX, useEffect, useState } from "react";
import { BaseArtistResponse } from "@/dto";
import { EMediaType, TMedia } from "@rockit/packages/shared";
import { EEvent } from "@/models/enums/events";
import { IMediaAddedToPlaylistEvent } from "@/models/interfaces/events/mediaAddedToPlaylist";
import { Http } from "@/lib/http";
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
    expandedByMediaId,
}: {
    publicId?: string;
    type: EMediaType;
    title: string;
    artists: BaseArtistResponse[];
    image: string;
    media: TMedia[];
    showMediaIndex: boolean;
    showMediaImage: boolean;
    expandedByMediaId?: Record<string, boolean>;
}): JSX.Element {
    const [media, setMedia] = useState(initialMedia);

    useEffect((): void => {
        setMedia(initialMedia);
    }, [initialMedia]);

    useEffect((): (() => void) | undefined => {
        if (!publicId) return;
        if (type !== EMediaType.Playlist) return;

        const handleMediaAdded = (data: IMediaAddedToPlaylistEvent): void => {
            Http.getMedia(data.publicId).then((data): void => {
                if (data.isOk())
                    setMedia((prev): TMedia[] => [...prev, data.result.media]);
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

        return (): void => {
            rockIt.eventManager.removeEventListener(
                EEvent.MediaAddedToPlaylist,
                handleMediaAdded
            );
        };
    }, [publicId, type]);

    const handleLinkDrop = (url: string): void => {
        if (type === EMediaType.Playlist)
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
                expandedByMediaId={expandedByMediaId}
            />
        </>
    );
}

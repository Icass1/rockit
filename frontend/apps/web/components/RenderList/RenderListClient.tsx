"use client";

import { JSX, ReactNode, useEffect, useState } from "react";
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
    coverOverlay,
}: {
    publicId: string;
    type: EMediaType;
    title: string;
    artists: BaseArtistResponse[];
    image: string;
    media: TMedia[];
    showMediaIndex: boolean;
    showMediaImage: boolean;
    expandedByMediaId?: Record<string, boolean>;
    coverOverlay?: ReactNode;
}): JSX.Element {
    const [media, setMedia] = useState(initialMedia);

    useEffect((): void => {
        setMedia(initialMedia);
    }, [initialMedia]);

    useEffect((): (() => void) | undefined => {
        if (!publicId) return;
        if (type !== EMediaType.Playlist) return;

        const handleMediaAdded = (data: IMediaAddedToPlaylistEvent): void => {
            if (data.playlistPublicId !== publicId) return;

            Http.getMediaAsync(data.publicId).then((res): void => {
                if (res.isOk()) {
                    const newMedia = res.result.media;
                    setMedia((prev): TMedia[] => {
                        const idx = prev.findIndex(
                            (m) => m.publicId === data.publicId
                        );
                        if (idx !== -1) return prev;

                        const insertAt = Math.min(data.position, prev.length);
                        const copy = [...prev];
                        copy.splice(insertAt, 0, newMedia);
                        return copy;
                    });
                } else {
                    console.error(
                        "Failed to fetch media data for added media:",
                        res.message,
                        res.detail
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
                coverOverlay={coverOverlay}
            />
        </>
    );
}

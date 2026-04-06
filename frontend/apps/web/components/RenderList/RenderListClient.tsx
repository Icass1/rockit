"use client";

import { useEffect, useState } from "react";
import {
    BaseArtistResponse,
    BaseSongWithAlbumResponse,
    BaseVideoResponse,
} from "@/dto";
import { EEvent } from "@/models/enums/events";
import { IMediaAddedToPlaylistEvent } from "@/models/interfaces/events/mediaAddedToPlaylist";
import { rockIt } from "@/lib/rockit/rockIt";
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
    media: (BaseSongWithAlbumResponse | BaseVideoResponse)[];
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
            console.log("handleMediaAdded", data);
            setMedia((prev) => [...prev]);
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
            />
        </>
    );
}

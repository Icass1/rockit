"use client";

import { JSX, ReactNode, useEffect, useMemo } from "react";
import { BaseArtistResponse } from "@/dto";
import { useStore } from "@nanostores/react";
import {
    CollectionPager,
    EMediaType,
    TListMedia,
    TMedia,
} from "@rockit/shared";
import { EEvent } from "@/models/enums/events";
import { IMediaAddedToPlaylistEvent } from "@/models/interfaces/events/mediaAddedToPlaylist";
import { IMediaRemovedFromPlaylistEvent } from "@/models/interfaces/events/mediaRemovedFromPlaylist";
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
    listMedia,
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
    listMedia: TListMedia;
    showMediaIndex: boolean;
    showMediaImage: boolean;
    expandedByMediaId?: Record<string, boolean>;
    coverOverlay?: ReactNode;
}): JSX.Element {
    const pager = useMemo(
        () =>
            new CollectionPager(publicId, {
                media: initialMedia,
                expandedByMediaId: expandedByMediaId ?? {},
                total:
                    "total" in listMedia
                        ? listMedia.total
                        : initialMedia.length,
                hasMore: "hasMore" in listMedia ? listMedia.hasMore : false,
            }),
        [publicId, initialMedia, expandedByMediaId, listMedia]
    );
    const state = useStore(pager.state);

    useEffect(() => {
        const refresh = (
            data: IMediaAddedToPlaylistEvent | IMediaRemovedFromPlaylistEvent
        ): void => {
            if (data.playlistPublicId === publicId) void pager.load(0);
        };
        rockIt.eventManager.addEventListener(
            EEvent.MediaAddedToPlaylist,
            refresh
        );
        rockIt.eventManager.addEventListener(
            EEvent.MediaRemovedFromPlaylist,
            refresh
        );
        return () => {
            pager.dispose();
            rockIt.eventManager.removeEventListener(
                EEvent.MediaAddedToPlaylist,
                refresh
            );
            rockIt.eventManager.removeEventListener(
                EEvent.MediaRemovedFromPlaylist,
                refresh
            );
        };
    }, [pager, publicId]);

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
                media={state.media}
                listMedia={listMedia}
                showMediaIndex={showMediaIndex}
                showMediaImage={showMediaImage}
                listPublicId={publicId}
                expandedByMediaId={state.expandedByMediaId}
                coverOverlay={coverOverlay}
                pager={pager}
                total={state.total}
                offset={state.offset}
            />
        </>
    );
}

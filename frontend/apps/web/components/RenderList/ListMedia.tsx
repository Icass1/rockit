"use client";

import { useCallback, useEffect, useMemo, useState, type JSX } from "react";
import Image from "next/image";
import Link from "next/link";
import { useStore } from "@nanostores/react";
import { CollectionPager, EMediaContextLocation } from "@rockit/shared";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
    getMediaArtists,
    isAlbum,
    TListMedia,
    TMedia,
} from "@/models/types/media";
import useMedia from "@/hooks/useMedia";
import { rockIt } from "@/lib/rockit/rockIt";
import Artists from "@/components/Artists/Artists";
import MediaContextMenu from "@/components/MediaContextMenu/MediaContextMenu";
import CollectionControls from "@/components/RenderList/CollectionControls";
import { Media } from "@/components/RenderList/Media";

export function ListMedia({
    media: _media,
    allMedia,
    substractArtists = [],
    listPublicId,
    defaultExpanded,
}: {
    media: TListMedia;
    allMedia?: TMedia[];
    substractArtists?: string[];
    listPublicId?: string;
    defaultExpanded?: boolean;
}): JSX.Element {
    const $media = useMedia(_media);
    const [expanded, setExpanded] = useState(defaultExpanded ?? false);

    const handleToggle = useCallback((): void => {
        setExpanded((prev): boolean => {
            const newValue = !prev;
            if (listPublicId) {
                rockIt.webSocketManager.sendMediaExpanded({
                    mediaPublicId: $media.publicId,
                    playlistPublicId: listPublicId,
                    expanded: newValue,
                });
            }
            return newValue;
        });
    }, [listPublicId, $media.publicId]);

    const pager = useMemo(
        () => new CollectionPager($media.publicId),
        [$media.publicId]
    );
    const state = useStore(pager.state);
    useEffect(() => {
        if (expanded && !pager.state.get().collection) void pager.load();
    }, [expanded, pager]);
    useEffect(() => () => pager.dispose(), [pager]);
    const medias = state.media;

    return (
        <div className="flex flex-col rounded-[0.67rem]">
            <MediaContextMenu
                media={$media}
                location={EMediaContextLocation.PLAYLIST}
                listPublicId={listPublicId}
            >
                <div className="flex h-fit w-full items-center gap-2 rounded-[0.6rem] bg-neutral-900 p-1.5 text-left">
                    <Image
                        src={$media.imageUrl}
                        alt={$media.name}
                        width={100}
                        height={100}
                        className="h-12 w-12 rounded object-cover select-none"
                    />
                    <div className="flex w-full flex-col">
                        <Link
                            prefetch={false}
                            href={$media.url}
                            className="flex w-fit min-w-0 flex-1 flex-col select-none [-webkit-touch-callout:none] hover:underline"
                        >
                            <p className="w-fit truncate font-medium text-white">
                                {$media.name}
                            </p>
                        </Link>
                        <Artists
                            className="w-fit text-left"
                            artists={getMediaArtists($media)}
                        />
                    </div>
                    <button
                        type="button"
                        onClick={handleToggle}
                        className="shrink-0 cursor-pointer"
                    >
                        {expanded ? (
                            <ChevronDown
                                size={16}
                                className="mr-1 text-neutral-400"
                            />
                        ) : (
                            <ChevronRight
                                size={16}
                                className="mr-1 text-neutral-400"
                            />
                        )}
                    </button>
                </div>
            </MediaContextMenu>
            {expanded && (
                <div className="my-1 flex flex-col gap-1 pr-1 pl-9">
                    <CollectionControls pager={pager} />
                    {medias.map((media, i): JSX.Element => (
                        <Media
                            key={`${state.offset + i}:${media.publicId}`}
                            index={state.offset + i}
                            media={media}
                            allMedia={allMedia}
                            substractArtists={substractArtists}
                            showMediaIndex={isAlbum($media)}
                            showMediaImage={!isAlbum($media)}
                            listPublicId={listPublicId}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

"use client";

import { useCallback, useMemo, useState, type JSX } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
    getMediaArtists,
    isAlbum,
    isAlbumWithSongs,
    isPlaylistWithMedias,
    TListMedia,
    TMedia,
} from "@/models/types/media";
import useMedia from "@/hooks/useMedia";
import { rockIt } from "@/lib/rockit/rockIt";
import Artists from "@/components/Artists/Artists";
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

    const medias: TMedia[] = useMemo((): TMedia[] => {
        if (isAlbumWithSongs($media)) {
            return $media.songs;
        }
        if (isPlaylistWithMedias($media)) {
            return $media.medias.map((m) => m.item);
        }
        return [];
    }, [$media]);

    return (
        <div className="flex flex-col rounded-[0.67rem]">
            <div className="flex h-fit w-full items-center gap-2 rounded-[0.6rem] bg-neutral-900 p-1.5 text-left">
                <Image
                    src={$media.imageUrl}
                    alt={$media.name}
                    width={100}
                    height={100}
                    className="h-12 w-12 select-none rounded object-cover"
                />
                <div className="flex w-full flex-col">
                    <Link
                        prefetch={false}
                        href={$media.url}
                        className="flex w-fit min-w-0 flex-1 flex-col hover:underline"
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
            {expanded && medias.length > 0 && (
                <div className="my-1 flex flex-col gap-1 pr-1 pl-9">
                    {medias.map(
                        (media, i): JSX.Element => (
                            <Media
                                key={media.publicId}
                                index={i}
                                media={media}
                                allMedia={allMedia}
                                substractArtists={substractArtists}
                                showMediaIndex={isAlbum($media)}
                                showMediaImage={!isAlbum($media)}
                                listPublicId={listPublicId}
                            />
                        )
                    )}
                </div>
            )}
        </div>
    );
}

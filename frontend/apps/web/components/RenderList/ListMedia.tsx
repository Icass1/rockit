"use client";

import { useMemo, useState, type JSX } from "react";
import Image from "next/image";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
    isAlbum,
    isAlbumWithSongs,
    isPlaylist,
    isPlaylistWithMedias,
    TListMedia,
    TMedia,
} from "@/models/types/media";
import useMedia from "@/hooks/useMedia";
import Artists from "@/components/Artists/Artists";
import { Media } from "@/components/RenderList/Media";

function ListArtists({ media }: { media: TListMedia }): JSX.Element | null {
    if (isAlbum(media)) {
        return <Artists className="justify-start" artists={media.artists} />;
    } else if (isPlaylist(media)) {
        return (
            <div>
                {media.contributors.map(
                    (c): JSX.Element => (
                        <p key={c.userPublicId}>{c.username}</p>
                    )
                )}
            </div>
        );
    }
    return null;
}

export function ListMedia({
    media: _media,
    allMedia,
    substractArtists = [],
    listPublicId,
}: {
    media: TListMedia;
    allMedia?: TMedia[];
    substractArtists?: string[];
    listPublicId?: string;
}): JSX.Element {
    const $media = useMedia(_media);
    const [expanded, setExpanded] = useState(true);

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
        <div className="flex flex-col rounded-[0.67rem] border border-neutral-800">
            <button
                type="button"
                onClick={(): void => setExpanded((prev): boolean => !prev)}
                className="flex h-fit w-full cursor-pointer items-center gap-2 rounded-[0.6rem] bg-neutral-900 p-1.5 text-left"
            >
                <Image
                    src={$media.imageUrl}
                    alt={$media.name}
                    width={100}
                    height={100}
                    className="h-12 w-12 rounded object-cover"
                />
                <div className="flex min-w-0 flex-1 flex-col">
                    <p className="truncate font-medium text-white">
                        {$media.name}
                    </p>
                    <ListArtists media={$media} />
                </div>
                {expanded ? (
                    <ChevronDown
                        size={16}
                        className="mr-1 shrink-0 text-neutral-400"
                    />
                ) : (
                    <ChevronRight
                        size={16}
                        className="mr-1 shrink-0 text-neutral-400"
                    />
                )}
            </button>
            {expanded && medias.length > 0 && (
                <div className="my-1 flex flex-col gap-1 px-1">
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

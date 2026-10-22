"use client";

import { useCallback, type JSX } from "react";
import Image from "next/image";
import Link from "next/link";
import { EMediaContextLocation } from "@rockit/shared";
import { ChevronDown, ChevronRight } from "lucide-react";
import { getMediaArtists, TListMedia, TMedia } from "@/models/types/media";
import useMedia from "@/hooks/useMedia";
import { rockIt } from "@/lib/rockit/rockIt";
import Artists from "@/components/Artists/Artists";
import MediaContextMenu from "@/components/MediaContextMenu/MediaContextMenu";

export function ListMedia({
    media: _media,
    listPublicId,
    expansionPlaylistPublicId,
    expanded = false,
    onToggle,
    cycle = false,
}: {
    media: TListMedia;
    allMedia?: TMedia[];
    substractArtists?: string[];
    listPublicId?: string;
    expansionPlaylistPublicId?: string;
    expanded?: boolean;
    onToggle?: () => void;
    cycle?: boolean;
}): JSX.Element {
    const $media = useMedia(_media);
    const handleToggle = useCallback((): void => {
        if (cycle) return;
        onToggle?.();
        if (listPublicId) {
            rockIt.webSocketManager.sendMediaExpanded({
                mediaPublicId: $media.publicId,
                playlistPublicId: expansionPlaylistPublicId ?? listPublicId,
                expanded: !expanded,
            });
        }
    }, [
        cycle,
        onToggle,
        listPublicId,
        expansionPlaylistPublicId,
        $media.publicId,
        expanded,
    ]);

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
                        aria-expanded={expanded}
                        aria-label={$media.name}
                        disabled={cycle}
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
        </div>
    );
}

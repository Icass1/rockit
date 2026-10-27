"use client";

import type { JSX } from "react";
import Image from "next/image";
import Link from "next/link";
import type {
    BaseAlbumWithSongsResponse,
    BasePlaylistWithMediasResponse,
    BasePlaylistWithoutMediasResponse,
    BaseSongWithAlbumResponse,
    BaseVideoResponse,
    MediaResponse,
} from "@/dto";
import {
    getMediaSubtitle,
    isList,
    isPlayable,
    type TMedia,
} from "@rockit/shared";
import { rockIt } from "@/lib/rockit/rockIt";

type RecentlyClickedMedia =
    | BaseAlbumWithSongsResponse
    | BasePlaylistWithMediasResponse
    | BasePlaylistWithoutMediasResponse
    | BaseSongWithAlbumResponse
    | BaseVideoResponse;

export default function RecentlyClickedSection({
    items,
}: {
    items: MediaResponse["media"][];
}): JSX.Element | null {
    const mediaItems = items.filter(
        (item): item is RecentlyClickedMedia =>
            item.type === "album" ||
            item.type === "playlist" ||
            item.type === "song" ||
            item.type === "video"
    );
    if (mediaItems.length === 0) return null;

    return (
        <section className="mt-8 text-white md:pl-12">
            <h2 className="px-5 text-2xl font-bold md:text-3xl">
                Recently opened
            </h2>
            <div className="scrollbar-hide flex snap-x gap-3 overflow-x-auto px-5 py-4 md:px-2">
                {mediaItems.map((media) => {
                    const content = (
                        <>
                            <Image
                                src={media.imageUrl}
                                alt={media.name}
                                width={160}
                                height={160}
                                className="aspect-square w-full rounded-lg object-cover"
                            />
                            <p className="mt-2 truncate text-sm font-semibold">
                                {media.name}
                            </p>
                            <p className="truncate text-xs text-neutral-400">
                                {getMediaSubtitle(media)}
                            </p>
                        </>
                    );

                    if (isList(media)) {
                        return (
                            <Link
                                key={media.publicId}
                                href={media.url}
                                className="w-36 flex-none snap-start md:w-40"
                                onClick={() =>
                                    rockIt.webSocketManager.sendMediaClicked({
                                        mediaPublicId: media.publicId,
                                    })
                                }
                            >
                                {content}
                            </Link>
                        );
                    }

                    return (
                        <button
                            key={media.publicId}
                            type="button"
                            className="w-36 flex-none snap-start text-left md:w-40"
                            onClick={() => {
                                rockIt.webSocketManager.sendMediaClicked({
                                    mediaPublicId: media.publicId,
                                });
                                if (!isPlayable(media)) return;
                                rockIt.queueManager.setMedia([media], "");
                                rockIt.queueManager.moveToMedia(media.publicId);
                                rockIt.mediaPlayerManager.play();
                            }}
                        >
                            {content}
                        </button>
                    );
                })}
            </div>
        </section>
    );
}

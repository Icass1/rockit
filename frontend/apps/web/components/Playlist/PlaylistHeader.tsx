"use client";

import { useStore } from "@nanostores/react";
import { BasePlaylistResponse } from "@/dto";
import { rockIt } from "@/lib/rockit/rockIt";
import { getMinutes } from "@/lib/utils/getTime";
import { useListDownload } from "@/components/List/hooks/useListDownload";
import { ListCover } from "@/components/List/ListCover";
import ListOptions from "@/components/ListHeader/ListOptions";

export default function PlaylistHeader({
    className,
    playlist,
}: {
    className: string;
    playlist: BasePlaylistResponse;
}) {
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);

    const { isDownloading, downloadProgress, anyDownloaded, allDownloaded } =
        useListDownload({
            publicId: playlist.publicId,
            type: "playlist",
            songs: (
                playlist.medias as {
                    item: { publicId: string; downloaded?: boolean };
                }[]
            ).map((m) => ({
                publicId: m.item.publicId,
                downloaded: m.item.downloaded ?? false,
            })),
        });

    const downloadCount = (
        playlist.medias as { item: { downloaded?: boolean } }[]
    ).filter((m) => m.item.downloaded).length;
    const totalDuration = (
        playlist.medias as { item: { duration?: number } }[]
    ).reduce((acc, m) => acc + (m.item.duration || 0), 0);

    return (
        <div
            className={
                "relative top-24 flex h-104 flex-col gap-1 px-10 md:top-1/2 md:h-fit md:max-h-none md:w-full md:max-w-96 md:-translate-y-1/2 md:px-0 " +
                className
            }
        >
            <ListCover
                publicId={playlist.publicId}
                publicIds={(
                    playlist.medias as { item: { publicId: string } }[]
                ).map((m) => m.item.publicId)}
                type="playlist"
                name={playlist.name}
                imageUrl={playlist.imageUrl}
                isDownloading={isDownloading}
                downloadProgress={downloadProgress}
                anyDownloaded={anyDownloaded}
                allDownloaded={allDownloaded}
            />

            <div className="mx-auto flex w-fit flex-row items-center gap-3">
                <span className="text-2xl font-semibold text-balance">
                    {playlist.name}
                </span>
                <ListOptions
                    type="playlist"
                    publicId={playlist.publicId}
                    imageUrl={playlist.imageUrl ?? undefined}
                    allSongsInDatabase={false}
                />
            </div>

            <span className="flex flex-wrap justify-center text-xl font-semibold text-stone-400">
                {playlist.owner}
            </span>

            <span className="text-center text-sm text-stone-400">
                {playlist.medias.length} {$vocabulary.SONGS} | {downloadCount}{" "}
                songs downloaded | {getMinutes(totalDuration)}{" "}
                {$vocabulary.MINUTES}
            </span>
        </div>
    );
}

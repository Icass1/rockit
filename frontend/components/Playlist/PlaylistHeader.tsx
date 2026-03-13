"use client";

import { BasePlaylistResponse } from "@/dto";
import { useStore } from "@nanostores/react";
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
            songs: playlist.songs.map((song) => song.song),
        });

    const downloadCount = playlist.songs.filter(
        (s) => s.song.downloaded
    ).length;
    const totalDuration = playlist.songs.reduce(
        (acc, s) => acc + (s.song.duration || 0),
        0
    );

    return (
        <div
            className={
                "h-104 relative top-24 flex flex-col gap-1 px-10 md:top-1/2 md:h-fit md:max-h-none md:w-full md:max-w-96 md:-translate-y-1/2 md:px-0 " +
                className
            }
        >
            <ListCover
                publicId={playlist.publicId}
                publicIds={playlist.songs.map((song) => song.song.publicId)}
                type="playlist"
                name={playlist.name}
                imageUrl={playlist.imageUrl}
                isDownloading={isDownloading}
                downloadProgress={downloadProgress}
                anyDownloaded={anyDownloaded}
                allDownloaded={allDownloaded}
            />

            <div className="mx-auto flex w-fit flex-row items-center gap-3">
                <span className="text-balance text-2xl font-semibold">
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
                {playlist.songs.length} {$vocabulary.SONGS} | {downloadCount}{" "}
                songs downloaded | {getMinutes(totalDuration)}{" "}
                {$vocabulary.MINUTES}
            </span>
        </div>
    );
}
